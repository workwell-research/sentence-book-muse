import { describe, expect, it, vi } from 'vitest';
import { handleAccess } from '../functions/api/access';
import { handleGenerate } from '../functions/api/generate';
import { handleLookup } from '../functions/api/lookup';
import { accessConfig, hasSession, issueSession, SESSION_SECONDS, sessionCookie } from '../functions/lib/access';
import { readJsonBody } from '../functions/lib/route';
import { ACCESS_ENV, accessHeaders, TEST_INVITE } from './support/access';
import { memoryD1 } from './support/memory-d1';

const lookup = { expression: 'hello', sentence: 'Say hello.', level: 'A2', native_language: 'ja' };
const generation = { draft_id: '7f3e4b7e-5c1a-4d2b-9e8f-1a2b3c4d5e6f', topic: 'A train ride', interests: [], level: 'A2', native_language: 'ja', binders: [], based_on_learning_state_version: null };
function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(`https://example.test/api/${path}`, { method: 'POST', headers: { origin: ACCESS_ENV.ACCESS_ORIGIN, 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
}
const env = () => ({ ...ACCESS_ENV, RATE_LIMIT: memoryD1(), META_MODEL_API_KEY: 'fake-test-key' });
const brokenD1 = { prepare: () => { throw new Error('simulated outage'); } };

describe('invitation and sessions', () => {
  it('requires complete server-only configuration, with no implicit development bypass', () => {
    for (const config of [{}, { ...ACCESS_ENV, SESSION_SECRET: '' }, { ...ACCESS_ENV, INVITE_CODE_SHA256: 'oops' }, { ...ACCESS_ENV, ACCESS_ORIGIN: 'http://public.example' }, { ...ACCESS_ENV, ACCESS_ORIGIN: 'https://example.test/' }]) expect(accessConfig(config)).toBeNull();
    expect(accessConfig({ ...ACCESS_ENV, ACCESS_ORIGIN: 'http://localhost:8799' })?.secure).toBe(false);
  });
  it('accepts the invitation, returns only authorization state, and issues a host-only HttpOnly cookie', async () => {
    const e = env();
    const response = await handleAccess(post('access', { code: ` ${TEST_INVITE} ` }), e);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ authorized: true });
    const cookie = response.headers.get('set-cookie')!;
    for (const attribute of ['__Host-sentence-book-access=', 'HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/', 'Max-Age=604800']) expect(cookie).toContain(attribute);
    expect(cookie).not.toContain('Domain='); expect(cookie).not.toContain(TEST_INVITE);
    const status = await handleAccess(new Request('https://example.test/api/access', { headers: { cookie: cookie.split(';')[0] } }), e);
    expect(await status.json()).toEqual({ authorized: true });
    expect(status.headers.get('cache-control')).toBe('no-store');
  });
  it('rejects a wrong code and rate limits further attempts', async () => {
    const e = env();
    for (let i = 0; i < 5; i++) {
      const response = await handleAccess(post('access', { code: 'wrong' }), e);
      expect(response.status).toBe(401); expect(response.headers.has('set-cookie')).toBe(false);
    }
    expect((await handleAccess(post('access', { code: TEST_INVITE }), e)).status).toBe(429);
  });
  it('does not issue a session while D1 is unavailable', async () => {
    const response = await handleAccess(post('access', { code: TEST_INVITE }), { ...env(), RATE_LIMIT: brokenD1 });
    expect(response.status).toBe(503); expect(response.headers.has('set-cookie')).toBe(false);
  });
  it('rejects tampering, expiry, duplicate cookies, and both kinds of key rotation', async () => {
    const config = accessConfig(ACCESS_ENV)!; const now = Date.now(); const token = await issueSession(config, now);
    const request = (value: string) => new Request('https://example.test/api/access', { headers: { cookie: value } });
    const cookie = sessionCookie(config, token).split(';')[0];
    expect(await hasSession(request(cookie), config, now)).toBe(true);
    expect(await hasSession(request(cookie.slice(0, -1) + (cookie.endsWith('a') ? 'b' : 'a')), config, now)).toBe(false);
    expect(await hasSession(request(cookie), config, now + SESSION_SECONDS * 1000)).toBe(false);
    expect(await hasSession(request(cookie + '; ' + cookie), config, now)).toBe(false);
    expect(await hasSession(request(cookie), { ...config, inviteHash: '0'.repeat(64) }, now)).toBe(false);
    expect(await hasSession(request(cookie), { ...config, secret: 'different-secret-with-at-least-32-characters' }, now)).toBe(false);
    expect(await hasSession(request(cookie), { ...config, origin: 'https://different.test' }, now)).toBe(false);
  });
  it('reports anonymous status and clears only the access cookie on logout', async () => {
    const e = env();
    expect(await (await handleAccess(new Request('https://example.test/api/access'), e)).json()).toEqual({ authorized: false });
    const response = await handleAccess(post('access', { action: 'logout' }, await accessHeaders()), e);
    expect(await response.json()).toEqual({ authorized: false });
    expect(response.headers.get('set-cookie')).toContain('__Host-sentence-book-access=;');
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
    expect(e.RATE_LIMIT.counts.size).toBe(0);
  });
});

describe('paid API boundaries', () => {
  it('generate: denies anonymous calls before counters or upstream fetch', async () => {
    const e = env(), fetchFn = vi.fn();
    const response = await handleGenerate(post('generate', generation), e, { fetch: fetchFn });
    expect(response.status).toBe(401); expect((await response.json()).error.code).toBe('invite_required');
    expect(fetchFn).not.toHaveBeenCalled(); expect(e.RATE_LIMIT.counts.size).toBe(0);
  });
  it('lookup: open without an invitation, but counted before the model call', async () => {
    const e = env(), fetchFn = vi.fn(async () => Response.json({ choices: [{ message: { content: JSON.stringify({ expression: 'hello', native: 'こんにちは', note: null }) }, finish_reason: 'stop' }] }));
    const response = await handleLookup(post('lookup', lookup), e, { fetch: fetchFn });
    expect(response.status).toBe(200); expect(fetchFn).toHaveBeenCalledTimes(1); expect(e.RATE_LIMIT.counts.size).toBeGreaterThan(0);
  });
  it('lookup: stops at the shared daily cap without calling the model', async () => {
    const e = env(), fetchFn = vi.fn();
    e.RATE_LIMIT = memoryD1({ [`lookup:all:d:${new Date().toISOString().slice(0, 10)}`]: 3000 });
    const response = await handleLookup(post('lookup', lookup), e, { fetch: fetchFn });
    expect(response.status).toBe(429); expect(fetchFn).not.toHaveBeenCalled();
  });
  for (const [route, handler, body] of [['generate', handleGenerate, generation], ['lookup', handleLookup, lookup]] as const) {
    it(`${route}: fails closed on missing configuration and D1 errors`, async () => {
      const fetchFn = vi.fn(), headers = await accessHeaders();
      expect((await handler(post(route, body, headers), route === 'lookup' ? { ...env(), ACCESS_ORIGIN: '' } : { ...env(), SESSION_SECRET: '' }, { fetch: fetchFn })).status).toBe(503);
      const response = await handler(post(route, body, headers), { ...env(), RATE_LIMIT: brokenD1 }, { fetch: fetchFn });
      expect(response.status).toBe(503); expect((await response.json()).error.reason).toBe('rate_limit_unavailable');
      expect(fetchFn).not.toHaveBeenCalled();
    });
    it(`${route}: rejects other origins, missing origin, non-JSON and non-canonical hosts even with a valid cookie`, async () => {
      const fetchFn = vi.fn(), headers = await accessHeaders(), e = env();
      for (const [extra, status] of [[{ origin: 'https://other.test' }, 403], [{ origin: '' }, 403], [{ 'sec-fetch-site': 'cross-site' }, 403], [{ 'content-type': 'text/plain' }, 415]] as const) {
        expect((await handler(post(route, body, { ...headers, ...extra }), e, { fetch: fetchFn })).status).toBe(status);
      }
      const alias = new Request('https://hash.example.test/api/' + route, post(route, body, headers));
      expect((await handler(alias, e, { fetch: fetchFn })).status).toBe(403);
      expect(fetchFn).not.toHaveBeenCalled();
    });
  }
  it('counts the retry as another model attempt and stops it at the shared cap', async () => {
    const e = env(); e.RATE_LIMIT = memoryD1({ [`generate:all:d:${new Date().toISOString().slice(0, 10)}`]: 299 });
    const fetchFn = vi.fn(async () => Response.json({ choices: [{ message: { content: 'not JSON' }, finish_reason: 'stop' }] }));
    const response = await handleGenerate(post('generate', generation, await accessHeaders()), e, { fetch: fetchFn });
    expect(response.status).toBe(429); expect((await response.json()).error.reason).toBe('global');
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
  it('caps UTF-8 bytes and cancels oversized streams without trusting Content-Length', async () => {
    const multibyte = new Request('https://example.test', { method: 'POST', body: JSON.stringify({ text: 'あ'.repeat(20) }) });
    const outcome = await readJsonBody(multibyte, 50);
    expect(outcome.ok).toBe(false); if (!outcome.ok) expect(outcome.response.status).toBe(413);
    const cancel = vi.fn();
    const body = new ReadableStream({ pull(controller) { controller.enqueue(new Uint8Array(64)); }, cancel });
    const request = new Request('https://example.test', { method: 'POST', body, duplex: 'half' } as RequestInit);
    expect((await readJsonBody(request, 32)).ok).toBe(false); expect(cancel).toHaveBeenCalled();
    expect((await readJsonBody(new Request('https://example.test', { method: 'POST', body: '{"x":1}' }), 7)).ok).toBe(true);
  });
});
