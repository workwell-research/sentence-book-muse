import type { GenerationErrorCode, GenerationFailure } from '../../shared/generation-api';
import type { ModelFailureCode } from './model-client';
import type { RatePolicy, RateVerdict } from './rate-limit';

// Shared pieces of the model-backed routes: coded failures, upstream mapping and bounded JSON bodies.
export const noStore = { 'Cache-Control': 'no-store' };

export function fail(status: number, code: GenerationErrorCode, message: string, reason?: string, extraHeaders: Record<string, string> = {}): Response {
  const body: GenerationFailure = { error: reason ? { code, message, reason } : { code, message } };
  return Response.json(body, { status, headers: { ...noStore, ...extraHeaders } });
}

export const upstreamFailures: Record<ModelFailureCode, { status: number; code: GenerationErrorCode; message: string }> = {
  not_configured: { status: 503, code: 'generation_unavailable', message: '教材づくりは準備中です。' },
  upstream_auth: { status: 502, code: 'upstream_auth', message: 'モデルへの接続設定が受け付けられませんでした。管理者が接続キーを確認する必要があります。' },
  upstream_rate_limited: { status: 429, code: 'upstream_rate_limited', message: '今は混み合っています。少し待ってからもう一度お試しください。' },
  upstream_timeout: { status: 504, code: 'upstream_timeout', message: '教材づくりに時間がかかりすぎました。もう一度お試しください。' },
  upstream_error: { status: 502, code: 'upstream_error', message: 'モデルから教材を受け取れませんでした。もう一度お試しください。' },
  empty_output: { status: 502, code: 'upstream_error', message: 'モデルの返答が空でした。もう一度お試しください。' },
  truncated_output: { status: 502, code: 'invalid_output', message: '教材が途中で切れていたため、採用しませんでした。もう一度お試しください。' },
};

export function upstreamFailure(code: ModelFailureCode): Response {
  const mapped = upstreamFailures[code];
  return fail(mapped.status, mapped.code, mapped.message, code === 'truncated_output' ? 'truncated' : undefined,
    mapped.status === 429 ? { 'Retry-After': '20' } : {});
}

// A cap verdict as a response: 429 with Retry-After, or 503 when the counter binding is missing (deployment mistake).
export function rateLimitFailure(verdict: Exclude<RateVerdict, { ok: true }>, policy: RatePolicy): Response {
  if (verdict.scope === 'unconfigured') return fail(503, 'generation_unavailable', '利用回数の管理が設定されていないため、止めています。', 'rate_limit_unconfigured');
  if (verdict.scope === 'unavailable') return fail(503, 'generation_unavailable', '利用回数を確認できないため、いったん止めています。少し待ってから、もう一度お試しください。', 'rate_limit_unavailable', { 'Retry-After': '60' });
  const message = verdict.scope === 'minute' ? '続けて使いすぎています。1分ほど待ってから、もう一度どうぞ。'
    : verdict.scope === 'day' ? `今日の分（1日${policy.perDay}回）を使い切りました。また明日どうぞ。`
    : '今日はたくさん使われたため、いったん止めています。また明日どうぞ。';
  return fail(429, 'rate_limited', message, verdict.scope, { 'Retry-After': String(verdict.retryAfter) });
}

// Reads a JSON body no larger than maxBytes; anything else becomes a coded 4xx before any model call.
export async function readJsonBody(request: Request, maxBytes: number): Promise<{ ok: true; json: unknown } | { ok: false; response: Response }> {
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declared) && declared > maxBytes) return { ok: false, response: fail(413, 'request_too_large', '依頼が大きすぎます。') };
  let text = '', bytes = 0;
  const reader = request.body?.getReader();
  if (!reader) return { ok: false, response: fail(400, 'invalid_request', '依頼を読み取れませんでした。') };
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: false });
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel().catch(() => {});
        return { ok: false, response: fail(413, 'request_too_large', '依頼が大きすぎます。') };
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
  } catch { return { ok: false, response: fail(400, 'invalid_request', '依頼を読み取れませんでした。') }; }
  finally { reader.releaseLock(); }
  try { return { ok: true, json: JSON.parse(text) }; } catch { return { ok: false, response: fail(400, 'invalid_request', '依頼の形式が正しくありません。') }; }
}
