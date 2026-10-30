import { ACCESS_ENV, accessHeaders } from './support/access';
import { beforeEach, describe, expect, it } from 'vitest';
import { handleLookup } from '../functions/api/lookup';
import { memoryD1 } from './support/memory-d1';

let env: typeof ACCESS_ENV & { META_MODEL_API_KEY: string; RATE_LIMIT: ReturnType<typeof memoryD1> };
let authorizedHeaders: Awaited<ReturnType<typeof accessHeaders>>;
beforeEach(async () => { env = { ...ACCESS_ENV, META_MODEL_API_KEY: 'test-key-not-real', RATE_LIMIT: memoryD1() }; authorizedHeaders = await accessHeaders(); });
const lookup = { expression: 'giving a talk', sentence: "Next week, I'm giving a talk in Abu Dhabi.", level: 'B1', native_language: 'ja' };
function model(content: string, status = 200) {
  const calls: unknown[] = [];
  const fetchFn = (async (_url: RequestInfo | URL, init?: RequestInit) => {
    calls.push(JSON.parse(String(init?.body)));
    return new Response(JSON.stringify({ model: 'muse-spark-1.3', choices: [{ message: { content }, finish_reason: 'stop' }], usage: { prompt_tokens: 3, completion_tokens: 4 } }),
      { status, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
  return { fetchFn, calls };
}
const post = (body: unknown) => new Request('https://example.test/api/lookup', { method: 'POST', headers: { 'content-type': 'application/json', ...authorizedHeaders }, body: JSON.stringify(body) });

describe('/api/lookup', () => {
  it('returns a validated meaning for exactly the picked expression', async () => {
    const m = model(JSON.stringify({ expression: 'giving a talk', native: '発表する', note: 'give a talk = 講演・発表をする' }));
    const response = await handleLookup(post(lookup), env, { fetch: m.fetchFn });
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ contract: 'sentence_book_lookup_v1', result: { expression: 'giving a talk', native: '発表する', note: 'give a talk = 講演・発表をする' },
      model: 'muse-spark-1.3', usage: { prompt_tokens: 3, completion_tokens: 4 } });
    const sent = m.calls[0] as { messages: { content: string }[]; reasoning_effort: string; response_format: { json_schema: { name: string } } };
    expect(sent.messages[1].content).toContain('giving a talk');
    expect(sent.reasoning_effort).toBe('minimal');
    expect(sent.response_format.json_schema.name).toBe('sentence_book_lookup_v1');
  });
  it('accepts a missing note as null', async () => {
    const m = model(JSON.stringify({ expression: 'giving a talk', native: '発表する' }));
    expect((await (await handleLookup(post(lookup), env, { fetch: m.fetchFn })).json()).result.note).toBeNull();
  });
  it('refuses before calling the model: wrong method, no key, expression outside the sentence, extra keys', async () => {
    const m = model('{}');
    expect((await handleLookup(new Request('https://example.test/api/lookup'), env, { fetch: m.fetchFn })).status).toBe(405);
    expect((await handleLookup(post(lookup), { ...ACCESS_ENV, RATE_LIMIT: memoryD1() }, { fetch: m.fetchFn })).status).toBe(503);
    expect((await (await handleLookup(post(lookup), { ...ACCESS_ENV, META_MODEL_API_KEY: 'test-key-not-real' }, { fetch: m.fetchFn })).json()).error.reason).toBe('rate_limit_unconfigured');
    expect((await handleLookup(post({ ...lookup, expression: 'take a break' }), env, { fetch: m.fetchFn })).status).toBe(400);
    expect((await handleLookup(post({ ...lookup, extra: true }), env, { fetch: m.fetchFn })).status).toBe(400);
    expect(m.calls).toHaveLength(0);
  });
  it('does not adopt a meaning for a different expression or non-JSON output, and maps upstream limits', async () => {
    const swapped = await handleLookup(post(lookup), env, { fetch: model(JSON.stringify({ expression: 'a talk', native: '講演' })).fetchFn });
    expect((await swapped.json()).error).toMatchObject({ code: 'invalid_output', reason: 'request_mismatch' });
    const prose = await handleLookup(post(lookup), env, { fetch: model('It means to present.').fetchFn });
    expect((await prose.json()).error).toMatchObject({ code: 'invalid_output', reason: 'not_json' });
    const limited = await handleLookup(post(lookup), env, { fetch: model('{}', 429).fetchFn });
    expect(limited.status).toBe(429);
    expect(limited.headers.get('retry-after')).toBe('20');
    expect(await limited.text()).not.toContain('test-key-not-real');
  });
});
