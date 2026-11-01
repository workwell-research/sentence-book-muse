import { isGenerationErrorCode, rateLimitMessage } from '../../shared/generation-api';
import type { GenerationErrorCode } from '../../shared/generation-api';
import { validateReview } from '../../shared/review-schema';
import type { ReviewRequest, ReviewResult } from '../../shared/review-schema';

// Reconstruction review in the browser: one request per written line, re-validated here, kept in the practice record.
export type ReviewFailureCode = GenerationErrorCode | 'network' | 'unexpected';
export type ReviewOutcome =
  | { kind: 'ready'; result: ReviewResult; model: string }
  | { kind: 'failed'; code: ReviewFailureCode; message: string; retryable: boolean };

const failureText: Record<ReviewFailureCode, { message: string; retryable: boolean }> = {
  invite_required: { message: '招待コードを入力して、もう一度お試しください。', retryable: false },
  invalid_invite: { message: '招待コードが受け付けられませんでした。', retryable: false },
  access_denied: { message: 'この画面からは添削できません。', retryable: false },
  method_not_allowed: { message: '添削を受け取れませんでした。', retryable: false },
  generation_unavailable: { message: '添削の機能はまだ使えません。サーバー側の接続設定が済むまでお待ちください。', retryable: false },
  request_too_large: { message: '英文が長すぎて添削できません。短く書き直してください。', retryable: false },
  invalid_request: { message: '添削する英文を受け取れませんでした。', retryable: false },
  upstream_auth: { message: 'モデルへの接続設定が受け付けられませんでした。管理者が接続キーを確認する必要があります。', retryable: false },
  upstream_rate_limited: { message: '今は混み合っています。少し待ってからもう一度お試しください。', retryable: true },
  upstream_timeout: { message: '添削に時間がかかりすぎました。もう一度お試しください。', retryable: true },
  upstream_error: { message: '添削を受け取れませんでした。もう一度お試しください。', retryable: true },
  invalid_output: { message: '受け取った添削が書いた英文と合わなかったため、採用しませんでした。もう一度お試しください。', retryable: true },
  rate_limited: { message: rateLimitMessage(undefined), retryable: true },
  network: { message: '通信できませんでした。接続を確認して、もう一度お試しください。', retryable: true },
  unexpected: { message: '添削を受け取れませんでした。もう一度お試しください。', retryable: true },
};
const failed = (code: ReviewFailureCode): ReviewOutcome => ({ kind: 'failed', code, ...failureText[code] });

export async function requestReview(fetchFn: typeof fetch, request: ReviewRequest): Promise<ReviewOutcome> {
  let response: Response;
  try {
    response = await fetchFn('/api/review', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(request) });
  } catch { return failed('network'); }
  let body: unknown;
  try { body = await response.json(); } catch { return failed(response.ok ? 'unexpected' : 'upstream_error'); }
  if (!response.ok) {
    const error = (body as { error?: { code?: unknown; reason?: unknown } })?.error;
    const outcome = failed(isGenerationErrorCode(error?.code) ? error.code : 'unexpected');
    if (outcome.kind === 'failed' && error?.reason === 'rate_limit_unavailable') return { ...outcome, message: '利用回数を確認できないため、いったん止めています。少し待ってから、もう一度お試しください。' };
    if (outcome.kind === 'failed' && outcome.code === 'rate_limited') return { ...outcome, message: rateLimitMessage(error?.reason) };
    return outcome;
  }
  const validated = validateReview((body as { result?: unknown })?.result, request);
  if (!validated.success) return failed('invalid_output');
  const model = (body as { model?: unknown }).model;
  return { kind: 'ready', result: validated.result, model: typeof model === 'string' ? model : 'unknown' };
}
