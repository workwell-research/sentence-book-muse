import { describe, expect, it } from 'vitest';
import { handleGenerate } from '../functions/api/generate';
import type { LessonDraft } from '../shared/lesson-schema';

const env = { META_MODEL_API_KEY: 'test-key-not-real' };
const draftId = '7f3e4b7e-5c1a-4d2b-9e8f-1a2b3c4d5e6f';
const generationRequest = {
  draft_id: draftId, topic: '今日は電車が遅れた。', interests: ['旅'], level: 'A2', native_language: 'ja',
  based_on_learning_state_version: null, binders: [],
};
function page(overrides: Partial<LessonDraft> = {}): LessonDraft {
  return {
    draft_id: draftId, title: 'My train was late', level: 'A2', native_language: 'ja',
    sentences: [
      { en: 'My train was late.', native: '電車が遅れました。' }, { en: 'I had no time.', native: '時間がありませんでした。' },
      { en: 'I ran to work.', native: '走って仕事に行きました。' }, { en: 'I was tired.', native: '疲れました。' },
    ],
    questions: [{ en: 'Was your train late?', native: '電車は遅れましたか？', sample_answer: { en: 'Yes, it was.', native: 'はい。' } }],
    review_items: [{ expression: 'was late', native: '遅れた', sentence_index: 0 }],
    estimated_minutes: 8, based_on_learning_state_version: null,
    filing: { kind: 'new', newBinder: { title: '通勤', description: '通勤の出来事' }, reason: '通勤の話です。', sceneTags: ['通勤'] },
    ...overrides,
  };
}
function modelReturning(content: string, status = 200) { return modelSequence([{ content, status }]); }
function modelSequence(replies: { content: string; status?: number; finish?: string }[]) {
  const calls: unknown[] = [];
  const fetchFn = (async (_url: RequestInfo | URL, init?: RequestInit) => {
    calls.push(JSON.parse(String(init?.body)));
    const reply = replies[Math.min(calls.length, replies.length) - 1];
    return new Response(JSON.stringify({ model: 'muse-spark-1.3', choices: [{ message: { content: reply.content }, finish_reason: reply.finish ?? 'stop' }],
      usage: { prompt_tokens: 1, completion_tokens: 2 } }), { status: reply.status ?? 200, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
  return { fetchFn, calls };
}
function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request('https://example.test/api/generate', {
    method: 'POST', headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('/api/generate', () => {
  it('returns a validated page from the model and echoes the contract name', async () => {
    const model = modelReturning(JSON.stringify(page()));
    const response = await handleGenerate(post(generationRequest), env, { fetch: model.fetchFn });
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const body = await response.json();
    expect(body).toEqual({ contract: 'sentence_book_page_v1', draft: page(), model: 'muse-spark-1.3',
      usage: { prompt_tokens: 1, completion_tokens: 2 } });
    expect(model.calls).toHaveLength(1);
    const sent = model.calls[0] as { messages: { role: string; content: string }[]; response_format: { json_schema: { name: string } } };
    expect(sent.messages[1].content).toContain(draftId);
    expect(sent.response_format.json_schema.name).toBe('sentence_book_page_v1');
  });
  it('fails closed with 503 and no model call when no key is configured', async () => {
    const model = modelReturning(JSON.stringify(page()));
    const response = await handleGenerate(post(generationRequest), {}, { fetch: model.fetchFn });
    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe('generation_unavailable');
    expect(model.calls).toHaveLength(0);
  });
  it('rejects non-POST, unreadable, oversized and invalid requests before calling the model', async () => {
    const model = modelReturning(JSON.stringify(page()));
    const get = await handleGenerate(new Request('https://example.test/api/generate'), env, { fetch: model.fetchFn });
    expect(get.status).toBe(405);
    expect(get.headers.get('allow')).toBe('POST');
    expect((await handleGenerate(post('{nope'), env, { fetch: model.fetchFn })).status).toBe(400);
    expect((await handleGenerate(post({ ...generationRequest, topic: '', interests: [] }), env, { fetch: model.fetchFn })).status).toBe(400);
    expect((await handleGenerate(post({ ...generationRequest, extra: 1 }), env, { fetch: model.fetchFn })).status).toBe(400);
    const huge = await handleGenerate(post(generationRequest, { 'content-length': String(64 * 1024) }), env, { fetch: model.fetchFn });
    expect(huge.status).toBe(413);
    expect(model.calls).toHaveLength(0);
  });
  it('does not adopt model output that is not JSON or does not match the request', async () => {
    const notJsonModel = modelReturning('Sure! Here is your page.');
    const notJson = await handleGenerate(post(generationRequest), env, { fetch: notJsonModel.fetchFn });
    expect(notJson.status).toBe(502);
    expect((await notJson.json()).error).toMatchObject({ code: 'invalid_output', reason: 'not_json' });
    expect(notJsonModel.calls).toHaveLength(2);
    const otherDraft = await handleGenerate(post(generationRequest), env,
      { fetch: modelReturning(JSON.stringify(page({ draft_id: '4fc15635-0393-4faa-ab2a-6ebd95dc8c42' }))).fetchFn });
    expect((await otherDraft.json()).error).toMatchObject({ code: 'invalid_output', reason: 'request_mismatch' });
    const unknownBinder = await handleGenerate(post(generationRequest), env, { fetch: modelReturning(JSON.stringify(page({
      filing: { kind: 'existing', binderId: 'a785f741-e09f-4657-885a-2c2bed838c2e', reason: 'x', sceneTags: ['x'] } }))).fetchFn });
    expect((await unknownBinder.json()).error).toMatchObject({ code: 'invalid_output', reason: 'unknown_binder' });
  });
  it('retries a cut-off or malformed page once with the same draft ID, then succeeds', async () => {
    const model = modelSequence([{ content: '{"title":"half', finish: 'length' }, { content: JSON.stringify(page()) }]);
    const response = await handleGenerate(post(generationRequest), env, { fetch: model.fetchFn });
    expect(response.status).toBe(200);
    expect(model.calls).toHaveLength(2);
    const [first, second] = model.calls as { messages: { content: string }[] }[];
    expect(second.messages[1].content).toBe(first.messages[1].content);
    const twice = modelSequence([{ content: '{"title":"half', finish: 'length' }]);
    const stillCut = await handleGenerate(post(generationRequest), env, { fetch: twice.fetchFn });
    expect((await stillCut.json()).error).toMatchObject({ code: 'invalid_output', reason: 'truncated' });
    expect(twice.calls).toHaveLength(2);
  });
  it('maps upstream auth, rate limit and errors to distinct statuses without leaking the key', async () => {
    const authModel = modelReturning('{}', 401);
    const auth = await handleGenerate(post(generationRequest), env, { fetch: authModel.fetchFn });
    expect(auth.status).toBe(502);
    expect(authModel.calls).toHaveLength(1);
    expect(await auth.text()).not.toContain('test-key-not-real');
    const limited = await handleGenerate(post(generationRequest), env, { fetch: modelReturning('{}', 429).fetchFn });
    expect(limited.status).toBe(429);
    expect(limited.headers.get('retry-after')).toBe('20');
    const broken = await handleGenerate(post(generationRequest), env, { fetch: modelReturning('{}', 500).fetchFn });
    expect((await broken.json()).error.code).toBe('upstream_error');
  });
});
