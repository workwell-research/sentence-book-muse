import { generationRequestSchema } from '../../shared/generation-request';
import { LESSON_CONTRACT, lessonDraftJsonSchema, validateLessonDraft } from '../../shared/lesson-schema';
import type { GenerationSuccess } from '../../shared/generation-api';
import { buildMuseMessages } from '../lib/muse-prompt';
import { modelConfig, requestStructuredJson } from '../lib/model-client';
import type { ModelCallOptions, ModelEnv, ModelFailureCode } from '../lib/model-client';
import { POLICIES, checkRateLimit } from '../lib/rate-limit';
import type { RateLimitEnv } from '../lib/rate-limit';
import { fail, noStore, rateLimitFailure, readJsonBody, upstreamFailure } from '../lib/route';
import { requireAccess } from '../lib/access';
import type { AccessEnv } from '../lib/access';

// One learner request → one bounded model call → validated page or an explicit failure.
// Nothing is stored server-side; adoption and filing happen in the browser after review.
const MAX_BODY_BYTES = 32 * 1024;

// A malformed or cut-off page is retried once with the same draft ID; auth, rate-limit and
// request errors are not, so a misconfiguration never doubles the cost of every call.
const RETRYABLE_OUTPUT: ReadonlySet<ModelFailureCode> = new Set(['empty_output', 'truncated_output']);
const MAX_ATTEMPTS = 2;

export async function handleGenerate(request: Request, env: ModelEnv & RateLimitEnv & AccessEnv, options: ModelCallOptions = {}): Promise<Response> {
  if (request.method !== 'POST') return fail(405, 'method_not_allowed', 'Use POST.', undefined, { Allow: 'POST' });
  const denied = await requireAccess(request, env);
  if (denied) return denied;
  if (!modelConfig(env)) return fail(503, 'generation_unavailable', '教材づくりは準備中です。');
  const body = await readJsonBody(request, MAX_BODY_BYTES);
  if (!body.ok) return body.response;
  const parsed = generationRequestSchema.safeParse(body.json);
  if (!parsed.success) return fail(400, 'invalid_request', '依頼の内容が条件を満たしていません。関心を選ぶか、話したいことを書いてください。');
  const generation = parsed.data;
  const context = {
    draftId: generation.draft_id, level: generation.level, nativeLanguage: generation.native_language,
    learningStateVersion: generation.based_on_learning_state_version, binderIds: generation.binders.map(binder => binder.id),
  };
  const messages = buildMuseMessages(generation);
  let lastFailure: Response | null = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    // Every upstream attempt consumes a slot, including an invalid-output retry.
    const verdict = await checkRateLimit(env, request, POLICIES.generate);
    if (!verdict.ok) return rateLimitFailure(verdict, POLICIES.generate);
    const result = await requestStructuredJson(env, { messages, schemaName: LESSON_CONTRACT, schema: lessonDraftJsonSchema }, options);
    if (!result.ok) {
      lastFailure = upstreamFailure(result.code);
      if (RETRYABLE_OUTPUT.has(result.code)) continue;
      return lastFailure;
    }
    let output: unknown;
    try { output = JSON.parse(result.content); } catch {
      lastFailure = fail(502, 'invalid_output', '受け取った教材を読み取れなかったため、採用しませんでした。もう一度お試しください。', 'not_json');
      continue;
    }
    const validated = validateLessonDraft(output, context);
    if (!validated.success) {
      lastFailure = fail(502, 'invalid_output', '受け取った教材が仕様に合わなかったため、採用しませんでした。もう一度お試しください。', validated.reason);
      continue;
    }
    const body: GenerationSuccess = { contract: LESSON_CONTRACT, draft: validated.draft, model: result.model, usage: result.usage };
    return Response.json(body, { headers: noStore });
  }
  return lastFailure ?? fail(502, 'upstream_error', 'モデルから教材を受け取れませんでした。もう一度お試しください。');
}

export const onRequest: PagesFunction<ModelEnv & RateLimitEnv & AccessEnv> = ({ request, env }) => handleGenerate(request, env);
