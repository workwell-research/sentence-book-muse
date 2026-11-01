import { ACCESS_ENV, accessHeaders } from './support/access';
import { beforeEach, describe, expect, it } from 'vitest';
import { handleReview } from '../functions/api/review';
import { requestReview } from '../src/lib/review';
import { memoryD1 } from './support/memory-d1';

let env: typeof ACCESS_ENV & { META_MODEL_API_KEY: string; RATE_LIMIT: ReturnType<typeof memoryD1> };
let authorizedHeaders: Awaited<ReturnType<typeof accessHeaders>>;
beforeEach(async () => { env = { ...ACCESS_ENV, META_MODEL_API_KEY: 'test-key-not-real', RATE_LIMIT: memoryD1() }; authorizedHeaders = await accessHeaders(); });
const review = { meaning: '今日は、少しペースを落とすことにした。', model: 'Today, I decided to slow down.', own: 'I decided to go slow today.', level: 'B1', native_language: 'ja' };
function model(content: string, status = 200) {
  const calls: unknown[] = [];
  const fetchFn = (async (_url: RequestInfo | URL, init?: RequestInit) => {
    calls.push(JSON.parse(String(init?.body)));
    return new Response(JSON.stringify({ model: 'muse-spark-1.3', choices: [{ message: { content }, finish_reason: 'stop' }], usage: { prompt_tokens: 3, completion_tokens: 4 } }),
      { status, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
  return { fetchFn, calls };
}
const post = (body: unknown) => new Request('https://example.test/api/review', { method: 'POST', headers: { 'content-type': 'application/json', ...authorizedHeaders }, body: JSON.stringify(body) });

describe('/api/review', () => {
  it('returns a validated review of exactly the line the learner wrote', async () => {
    const m = model(JSON.stringify({ own: review.own, verdict: 'fine', natural: 'Today, I decided to take it slow.', note: '「go slow」より「take it slow」が自然です。' }));
    const response = await handleReview(post(review), env, { fetch: m.fetchFn });
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ contract: 'sentence_book_review_v1', result: { own: review.own, verdict: 'fine', natural: 'Today, I decided to take it slow.', note: '「go slow」より「take it slow」が自然です。' },
      model: 'muse-spark-1.3', usage: { prompt_tokens: 3, completion_tokens: 4 } });
    const sent = m.calls[0] as { messages: { content: string }[]; reasoning_effort: string; response_format: { json_schema: { name: string } } };
    expect(sent.messages[0].content).toContain('not the only correct answer');
    expect(sent.messages[1].content).toContain(review.own);
    expect(sent.reasoning_effort).toBe('low');
    expect(sent.response_format.json_schema.name).toBe('sentence_book_review_v1');
  });
  it('drops a “natural” phrasing that only repeats the learner’s line, and accepts missing fields as null', async () => {
    const m = model(JSON.stringify({ own: review.own, verdict: 'fine', natural: review.own }));
    const body = await (await handleReview(post(review), env, { fetch: m.fetchFn })).json();
    expect(body.result).toEqual({ own: review.own, verdict: 'fine', natural: null, note: null });
  });
  it('asks the model for every field as a string and turns blanks into null', async () => {
    const m = model(JSON.stringify({ own: review.own, verdict: 'unclear', natural: 'I decided to take it slow today.', note: '' }));
    const body = await (await handleReview(post(review), env, { fetch: m.fetchFn })).json();
    expect(body.result).toEqual({ own: review.own, verdict: 'unclear', natural: 'I decided to take it slow today.', note: null });
    const sent = m.calls[0] as { max_tokens: number; response_format: { json_schema: { schema: { required: string[]; properties: Record<string, { type?: unknown }> } } } };
    expect(sent.response_format.json_schema.schema.required).toEqual(['own', 'verdict', 'natural', 'note']);
    expect(sent.response_format.json_schema.schema.properties.natural).toEqual({ type: 'string', maxLength: 200 });
    expect(sent.max_tokens).toBe(8000);
  });
  it('reports a cut-off review in its own words', async () => {
    const cut = { fetchFn: (async () => new Response(JSON.stringify({ model: 'muse-spark-1.3', choices: [{ message: { content: '{"own": "x"' }, finish_reason: 'length' }] }), { status: 200, headers: { 'content-type': 'application/json' } })) as typeof fetch };
    const response = await handleReview(post(review), env, { fetch: cut.fetchFn });
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: { code: 'invalid_output', message: '添削が途中で切れたため、採用しませんでした。もう一度お試しください。', reason: 'truncated' } });
  });
  it('refuses before calling the model: wrong method, no key, bad verdict, echo mismatch', async () => {
    const m = model(JSON.stringify({ own: 'another line', verdict: 'fine' }));
    expect((await handleReview(new Request('https://example.test/api/review'), env, { fetch: m.fetchFn })).status).toBe(405);
    expect((await handleReview(post(review), { ...env, META_MODEL_API_KEY: '' }, { fetch: m.fetchFn })).status).toBe(503);
    expect((await handleReview(post({ ...review, level: 'Z9' }), env, { fetch: m.fetchFn })).status).toBe(400);
    expect(m.calls).toHaveLength(0);
    expect((await handleReview(post(review), env, { fetch: m.fetchFn })).status).toBe(502);
    const bad = model(JSON.stringify({ own: review.own, verdict: 'maybe' }));
    expect((await handleReview(post(review), env, { fetch: bad.fetchFn })).status).toBe(502);
  });
  it('is counted against its own allowance', async () => {
    const m = model(JSON.stringify({ own: review.own, verdict: 'fine' }));
    for (let i = 0; i < 10; i++) expect((await handleReview(post(review), env, { fetch: m.fetchFn })).status).toBe(200);
    expect((await handleReview(post(review), env, { fetch: m.fetchFn })).status).toBe(429);
    expect(m.calls).toHaveLength(10);
  });
});

describe('requestReview in the browser', () => {
  const server = (status: number, body: unknown) => (async () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })) as typeof fetch;
  const request = { ...review, level: 'B1' as const, native_language: 'ja' as const };
  it('re-validates the echo and maps failures to messages', async () => {
    const ok = await requestReview(server(200, { result: { own: review.own, verdict: 'unclear', natural: 'Today, I decided to slow down.', note: '動詞を足しましょう。' }, model: 'muse-spark-1.3' }), request);
    expect(ok).toEqual({ kind: 'ready', result: { own: review.own, verdict: 'unclear', natural: 'Today, I decided to slow down.', note: '動詞を足しましょう。' }, model: 'muse-spark-1.3' });
    expect((await requestReview(server(200, { result: { own: 'other', verdict: 'fine' } }), request)).kind).toBe('failed');
    const limited = await requestReview(server(429, { error: { code: 'rate_limited', reason: 'minute' } }), request);
    expect(limited.kind === 'failed' && limited.retryable).toBe(true);
    const down = await requestReview((async () => { throw new Error('offline'); }) as unknown as typeof fetch, request);
    expect(down.kind === 'failed' && down.code).toBe('network');
  });
});
