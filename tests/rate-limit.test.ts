import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { POLICIES, checkRateLimit, d1Counters } from '../functions/lib/rate-limit';
import { memoryD1 } from './support/memory-d1';

const at = Date.UTC(2026, 9, 30, 12, 30, 15); // 2026-10-30T12:30:15Z
const from = (ip: string) => new Request('https://example.test/api/generate', { method: 'POST', headers: { 'cf-connecting-ip': ip } });
const policy = { name: 'test', perMinute: 2, perDay: 3, globalPerDay: 4 };

describe('usage caps', () => {
  // Purging and request windows must share the fixture clock.
  beforeEach(() => { vi.spyOn(Date, 'now').mockReturnValue(at); });
  afterEach(() => vi.restoreAllMocks());
  it('counts per hashed address per minute and per day, and in total per day, with expiring rows', async () => {
    const db = memoryD1();
    const env = { RATE_LIMIT: db, RATE_SALT: 'salt' };
    expect(await checkRateLimit(env, from('203.0.113.7'), policy, at)).toEqual({ ok: true });
    expect(await checkRateLimit(env, from('203.0.113.7'), policy, at + 1000)).toEqual({ ok: true });
    const blocked = await checkRateLimit(env, from('203.0.113.7'), policy, at + 2000);
    expect(blocked).toMatchObject({ ok: false, scope: 'minute' });
    if (!blocked.ok && blocked.scope !== 'unconfigured' && blocked.scope !== 'unavailable') expect(blocked.retryAfter).toBeLessThanOrEqual(60);
    // A refused burst does not touch the daily or the shared count.
    expect([...db.counts.entries()].filter(([key]) => key.includes(':d:')).map(([, n]) => n)).toEqual([2, 2]);
    // Keys hold a hash, never the address itself; expiry bounds the storage.
    for (const key of db.counts.keys()) expect(key).not.toContain('203.0.113.7');
    expect([...db.expires.values()].sort()).toEqual([Math.floor(at / 1000) + 120, Math.floor(at / 1000) + 172800, Math.floor(at / 1000) + 172800]);
    // The next minute opens again until the daily cap, then the day blocks until tomorrow.
    expect(await checkRateLimit(env, from('203.0.113.7'), policy, at + 61_000)).toEqual({ ok: true });
    const day = await checkRateLimit(env, from('203.0.113.7'), policy, at + 122_000);
    expect(day).toMatchObject({ ok: false, scope: 'day' });
    if (!day.ok && day.scope !== 'unconfigured' && day.scope !== 'unavailable') expect(day.retryAfter).toBe(Math.ceil((Date.UTC(2026, 9, 31) - (at + 122_000)) / 1000));
    // Another address is independent until the shared budget is spent.
    expect(await checkRateLimit(env, from('198.51.100.9'), policy, at + 122_000)).toEqual({ ok: true });
    expect(await checkRateLimit(env, from('198.51.100.9'), policy, at + 183_000)).toMatchObject({ ok: false, scope: 'global' });
  });
  it('fails closed without a store and when the store errors, and hashes differently per salt', async () => {
    expect(await checkRateLimit({}, from('203.0.113.7'), policy, at)).toEqual({ ok: false, scope: 'unconfigured' });
    const broken = { RATE_LIMIT: { prepare: () => ({ bind: () => ({ first: async () => { throw new Error('d1 down'); }, run: async () => { throw new Error('d1 down'); } }) }) } };
    expect(await checkRateLimit(broken, from('203.0.113.7'), policy, at)).toEqual({ ok: false, scope: 'unavailable' });
    const a = memoryD1(), b = memoryD1();
    await checkRateLimit({ RATE_LIMIT: a, RATE_SALT: 'one' }, from('203.0.113.7'), policy, at);
    await checkRateLimit({ RATE_LIMIT: b, RATE_SALT: 'two' }, from('203.0.113.7'), policy, at);
    expect([...a.counts.keys()]).not.toEqual([...b.counts.keys()]);
  });
  it('creates its table once per database, increments atomically in one statement and purges now and then', async () => {
    const db = memoryD1();
    const counters = d1Counters(db, () => 0.5);
    expect(await counters.increment('k', 10)).toBe(1);
    expect(await counters.increment('k', 10)).toBe(2);
    expect(db.statements.filter(s => s.startsWith('CREATE TABLE IF NOT EXISTS'))).toHaveLength(1);
    expect(db.statements.filter(s => s.startsWith('INSERT'))).toEqual(Array(2).fill('INSERT INTO counters (key, n, expires) VALUES (?1, 1, ?2) ON CONFLICT(key) DO UPDATE SET n = counters.n + 1 RETURNING n'));
    expect(db.statements.some(s => s.startsWith('DELETE'))).toBe(false);
    const purging = d1Counters(memoryD1(), () => 0.001);
    const other = memoryD1();
    await d1Counters(other, () => 0.001).increment('k', 10);
    expect(other.statements.some(s => s.startsWith('DELETE'))).toBe(true);
    void purging;
  });
  it('ships with bounded production policies', () => {
    expect(POLICIES.generate).toEqual({ name: 'generate', perMinute: 3, perDay: 20, globalPerDay: 300 });
    expect(POLICIES.lookup.globalPerDay).toBeGreaterThan(POLICIES.lookup.perDay);
  });
});
