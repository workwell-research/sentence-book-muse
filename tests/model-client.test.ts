import { describe, expect, it } from 'vitest';
import { DEFAULT_MODEL_API_BASE_URL, DEFAULT_MODEL_ID, modelConfig, requestStructuredJson } from '../functions/lib/model-client';

const env = { META_MODEL_API_KEY: 'test-key-not-real' };
const request = {
  messages: [{ role: 'system' as const, content: 'Return JSON.' }, { role: 'user' as const, content: '{}' }],
  schemaName: 'page', schema: { type: 'object' },
};
function fetchReturning(status: number, body: unknown, capture?: { url?: string; init?: RequestInit }) {
  return (async (url: RequestInfo | URL, init?: RequestInit) => {
    if (capture) { capture.url = String(url); capture.init = init; }
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
}
const completion = (content: unknown) => ({
  model: 'muse-spark-1.3', choices: [{ message: { role: 'assistant', content } }],
  usage: { prompt_tokens: 10, completion_tokens: 20, completion_tokens_details: { reasoning_tokens: 5 } },
});

describe('model configuration', () => {
  it('fails closed without a key and ignores blank values', () => {
    expect(modelConfig({})).toBeNull();
    expect(modelConfig({ META_MODEL_API_KEY: '   ' })).toBeNull();
  });
  it('defaults to Meta Model API and muse-spark-1.3, and trims a trailing slash on overrides', () => {
    expect(modelConfig(env)).toEqual({ key: 'test-key-not-real', baseUrl: DEFAULT_MODEL_API_BASE_URL, model: DEFAULT_MODEL_ID });
    expect(modelConfig({ ...env, MODEL_API_BASE_URL: 'https://openrouter.ai/api/v1/', MODEL_ID: 'meta/muse-spark-1.3' }))
      .toMatchObject({ baseUrl: 'https://openrouter.ai/api/v1', model: 'meta/muse-spark-1.3' });
  });
});

describe('structured JSON request', () => {
  it('sends an OpenAI-compatible chat completion with a JSON schema and bearer key', async () => {
    const capture: { url?: string; init?: RequestInit } = {};
    const result = await requestStructuredJson(env, request, { fetch: fetchReturning(200, completion('{"ok":true}'), capture) });
    expect(result).toEqual({ ok: true, content: '{"ok":true}', model: 'muse-spark-1.3',
      usage: { prompt_tokens: 10, completion_tokens: 20, reasoning_tokens: 5 } });
    expect(capture.url).toBe('https://api.meta.ai/v1/chat/completions');
    expect((capture.init?.headers as Record<string, string>).authorization).toBe('Bearer test-key-not-real');
    const body = JSON.parse(String(capture.init?.body));
    expect(body).toMatchObject({ model: 'muse-spark-1.3', reasoning_effort: 'low', max_tokens: 12000,
      response_format: { type: 'json_schema', json_schema: { name: 'page', schema: { type: 'object' } } } });
    expect(body.messages).toEqual(request.messages);
  });
  it('reads content delivered as text parts', async () => {
    const parts = [{ type: 'text', text: '{"a":' }, { type: 'text', text: '1}' }];
    const result = await requestStructuredJson(env, request, { fetch: fetchReturning(200, completion(parts)) });
    expect(result).toMatchObject({ ok: true, content: '{"a":1}' });
  });
  it.each([[401, 'upstream_auth'], [403, 'upstream_auth'], [429, 'upstream_rate_limited'], [500, 'upstream_error']])(
    'maps upstream HTTP %s to %s without exposing the key', async (status, code) => {
      const result = await requestStructuredJson(env, request, { fetch: fetchReturning(status, { error: { message: 'x' } }) });
      expect(result).toEqual({ ok: false, code, status });
      expect(JSON.stringify(result)).not.toContain('test-key-not-real');
    });
  it('reports a cut-off completion as truncated rather than parsing a partial page', async () => {
    const cut = { ...completion('{"title":"half'), choices: [{ message: { content: '{"title":"half' }, finish_reason: 'length' }] };
    expect(await requestStructuredJson(env, request, { fetch: fetchReturning(200, cut) })).toMatchObject({ ok: false, code: 'truncated_output' });
  });
  it('treats empty or malformed completions as failures rather than pages', async () => {
    expect(await requestStructuredJson(env, request, { fetch: fetchReturning(200, completion('   ')) })).toMatchObject({ ok: false, code: 'empty_output' });
    expect(await requestStructuredJson(env, request, { fetch: fetchReturning(200, { choices: [] }) })).toMatchObject({ ok: false, code: 'empty_output' });
    expect(await requestStructuredJson(env, request, { fetch: fetchReturning(200, 'not json') })).toMatchObject({ ok: false, code: 'upstream_error' });
  });
  it('reports network failures and timeouts separately', async () => {
    const offline = (async () => { throw new TypeError('fetch failed'); }) as typeof fetch;
    expect(await requestStructuredJson(env, request, { fetch: offline })).toEqual({ ok: false, code: 'upstream_error' });
    const hanging = ((_url: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    })) as typeof fetch;
    expect(await requestStructuredJson(env, request, { fetch: hanging, timeoutMs: 5 })).toEqual({ ok: false, code: 'upstream_timeout' });
  });
  it('never calls the network without a configured key', async () => {
    let called = false;
    const spy = (async () => { called = true; return new Response('{}'); }) as typeof fetch;
    expect(await requestStructuredJson({}, request, { fetch: spy })).toEqual({ ok: false, code: 'not_configured' });
    expect(called).toBe(false);
  });
});
