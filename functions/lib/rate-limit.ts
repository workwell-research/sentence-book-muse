// Usage caps for the public model-backed routes: per hashed address per minute and per day, and in total per day.
// They bound spend on the Meta key; they are not an authentication system. Counts live in D1, whose increments
// are atomic and read-after-write consistent (KV was tried first: its 60-second read cache never saw a burst).
// Missing configuration and store outages both stop paid calls (fail closed).
export interface D1Like {
  prepare(query: string): { bind(...values: unknown[]): { first<T = Record<string, unknown>>(): Promise<T | null>; run(): Promise<unknown> } };
}
export interface Counters { increment(key: string, expiresAt: number): Promise<number> }
export interface RateLimitEnv { RATE_LIMIT?: D1Like; RATE_SALT?: string }
export interface RatePolicy { name: string; perMinute: number; perDay: number; globalPerDay: number }
export const POLICIES = {
  generate: { name: 'generate', perMinute: 3, perDay: 20, globalPerDay: 300 },
  lookup: { name: 'lookup', perMinute: 20, perDay: 150, globalPerDay: 3000 },
  review: { name: 'review', perMinute: 10, perDay: 80, globalPerDay: 1500 },
} as const satisfies Record<string, RatePolicy>;

export type RateScope = 'minute' | 'day' | 'global';
export type RateVerdict =
  | { ok: true }
  | { ok: false; scope: RateScope; retryAfter: number }
  | { ok: false; scope: 'unconfigured' }
  | { ok: false; scope: 'unavailable' };

const MINUTE_TTL = 120;
const DAY_TTL = 2 * 24 * 60 * 60;

export async function checkRateLimit(env: RateLimitEnv, request: Request, policy: RatePolicy, now = Date.now(),
  counters: Counters | undefined = env.RATE_LIMIT ? d1Counters(env.RATE_LIMIT) : undefined): Promise<RateVerdict> {
  if (!counters) return { ok: false, scope: 'unconfigured' };
  const address = request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const who = await hashAddress(address, env.RATE_SALT ?? '');
  const minute = Math.floor(now / 60_000);
  const day = new Date(now).toISOString().slice(0, 10);
  const seconds = Math.floor(now / 1000);
  const untilTomorrow = secondsUntilNextUtcDay(now);
  // Narrow scope first: a refused burst never inflates the daily or the shared count.
  try {
    if (await counters.increment(`${policy.name}:ip:${who}:m:${minute}`, seconds + MINUTE_TTL) > policy.perMinute)
      return { ok: false, scope: 'minute', retryAfter: 60 - Math.floor((now % 60_000) / 1000) };
    if (await counters.increment(`${policy.name}:ip:${who}:d:${day}`, seconds + DAY_TTL) > policy.perDay)
      return { ok: false, scope: 'day', retryAfter: untilTomorrow };
    if (await counters.increment(`${policy.name}:all:d:${day}`, seconds + DAY_TTL) > policy.globalPerDay)
      return { ok: false, scope: 'global', retryAfter: untilTomorrow };
  } catch { return { ok: false, scope: 'unavailable' }; }
  return { ok: true };
}

// D1 adapter: one table of expiring counters, created on first use, purged now and then.
const SCHEMA = 'CREATE TABLE IF NOT EXISTS counters (key TEXT PRIMARY KEY, n INTEGER NOT NULL, expires INTEGER NOT NULL)';
const BUMP = 'INSERT INTO counters (key, n, expires) VALUES (?1, 1, ?2) ON CONFLICT(key) DO UPDATE SET n = counters.n + 1 RETURNING n';
const PURGE = 'DELETE FROM counters WHERE expires < ?1';
const prepared = new WeakMap<D1Like, Promise<unknown>>();
export function d1Counters(db: D1Like, random: () => number = Math.random): Counters {
  return {
    async increment(key, expiresAt) {
      if (!prepared.has(db)) prepared.set(db, db.prepare(SCHEMA).bind().run().catch(error => { prepared.delete(db); throw error; }));
      await prepared.get(db);
      const row = await db.prepare(BUMP).bind(key, expiresAt).first<{ n: number }>();
      if (random() < 0.02) await db.prepare(PURGE).bind(Math.floor(Date.now() / 1000)).run().catch(() => {});
      if (!row || typeof row.n !== 'number') throw new Error('counter did not return a count');
      return row.n;
    },
  };
}

function secondsUntilNextUtcDay(now: number): number {
  const next = new Date(now); next.setUTCHours(24, 0, 0, 0);
  return Math.max(1, Math.ceil((next.getTime() - now) / 1000));
}
// Addresses are never stored as such; the salt keeps the hashed keys from being reversible by a table.
async function hashAddress(address: string, salt: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}|${address}`));
  return [...new Uint8Array(digest)].slice(0, 16).map(byte => byte.toString(16).padStart(2, '0')).join('');
}
