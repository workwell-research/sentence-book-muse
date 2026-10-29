import type { GenerationErrorCode, GenerationFailure } from '../../shared/generation-api';
import type { ModelFailureCode } from './model-client';

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

// Reads a JSON body no larger than maxBytes; anything else becomes a coded 4xx before any model call.
export async function readJsonBody(request: Request, maxBytes: number): Promise<{ ok: true; json: unknown } | { ok: false; response: Response }> {
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declared) && declared > maxBytes) return { ok: false, response: fail(413, 'request_too_large', '依頼が大きすぎます。') };
  let text: string;
  try { text = await request.text(); } catch { return { ok: false, response: fail(400, 'invalid_request', '依頼を読み取れませんでした。') }; }
  if (text.length > maxBytes) return { ok: false, response: fail(413, 'request_too_large', '依頼が大きすぎます。') };
  try { return { ok: true, json: JSON.parse(text) }; } catch { return { ok: false, response: fail(400, 'invalid_request', '依頼の形式が正しくありません。') }; }
}
