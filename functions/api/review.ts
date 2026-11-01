import { REVIEW_CONTRACT, reviewRequestSchema, reviewResultJsonSchema, validateReview } from '../../shared/review-schema';
import type { ReviewResult } from '../../shared/review-schema';
import type { GenerationUsage } from '../../shared/generation-api';
import { buildReviewMessages } from '../lib/review-prompt';
import { modelConfig, requestStructuredJson } from '../lib/model-client';
import type { ModelCallOptions, ModelEnv } from '../lib/model-client';
import { POLICIES, checkRateLimit } from '../lib/rate-limit';
import type { RateLimitEnv } from '../lib/rate-limit';
import { fail, noStore, rateLimitFailure, readJsonBody, upstreamFailure } from '../lib/route';
import { requirePublicBoundary } from '../lib/access';
import type { AccessEnv } from '../lib/access';

// One reconstructed line → one bounded model call → a verdict, maybe a more natural phrasing, one short note.
// Nothing is stored server-side; the browser keeps the review with the practice record.
const MAX_BODY_BYTES = 8 * 1024;
export interface ReviewSuccess { contract: typeof REVIEW_CONTRACT; result: ReviewResult; model: string; usage: GenerationUsage | null }

export async function handleReview(request: Request, env: ModelEnv & RateLimitEnv & AccessEnv, options: ModelCallOptions = {}): Promise<Response> {
  if (request.method !== 'POST') return fail(405, 'method_not_allowed', 'Use POST.', undefined, { Allow: 'POST' });
  const denied = requirePublicBoundary(request, env);
  if (denied) return denied;
  if (!modelConfig(env)) return fail(503, 'generation_unavailable', '添削の機能は準備中です。');
  const body = await readJsonBody(request, MAX_BODY_BYTES);
  if (!body.ok) return body.response;
  const parsed = reviewRequestSchema.safeParse(body.json);
  if (!parsed.success) return fail(400, 'invalid_request', '添削する英文を受け取れませんでした。');
  const review = parsed.data;
  const verdict = await checkRateLimit(env, request, POLICIES.review);
  if (!verdict.ok) return rateLimitFailure(verdict, POLICIES.review);

  const result = await requestStructuredJson(env, {
    messages: buildReviewMessages(review), schemaName: REVIEW_CONTRACT, schema: reviewResultJsonSchema,
    // Reasoning shares this budget and has been seen to exceed 2,500 tokens on a one-line verdict; the object itself is tiny.
    maxTokens: 8000, reasoningEffort: 'low',
  }, options);
  if (!result.ok) {
    if (result.code === 'truncated_output') return fail(502, 'invalid_output', '添削が途中で切れたため、採用しませんでした。もう一度お試しください。', 'truncated');
    return upstreamFailure(result.code);
  }
  let output: unknown;
  try { output = JSON.parse(result.content); } catch {
    return fail(502, 'invalid_output', '添削を読み取れませんでした。もう一度お試しください。', 'not_json');
  }
  const validated = validateReview(output, review);
  if (!validated.success) return fail(502, 'invalid_output', '受け取った添削が書いた英文と合わなかったため、採用しませんでした。', validated.reason);
  const success: ReviewSuccess = { contract: REVIEW_CONTRACT, result: validated.result, model: result.model, usage: result.usage };
  return Response.json(success, { headers: noStore });
}

export const onRequest: PagesFunction<ModelEnv & RateLimitEnv & AccessEnv> = ({ request, env }) => handleReview(request, env);
