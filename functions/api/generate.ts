import { generationRequestSchema } from '../../shared/generation-request';
import { LESSON_CONTRACT, lessonDraftJsonSchema, validateLessonDraft } from '../../shared/lesson-schema';
import type { GenerationErrorCode, GenerationFailure, GenerationSuccess } from '../../shared/generation-api';
import { buildMuseMessages } from '../lib/muse-prompt';
import { modelConfig, requestStructuredJson } from '../lib/model-client';
import type { ModelCallOptions, ModelEnv, ModelFailureCode } from '../lib/model-client';

// One learner request → one bounded model call → validated page or an explicit failure.
// Nothing is stored server-side; adoption and filing happen in the browser after review.
const MAX_BODY_BYTES = 32 * 1024;
const noStore = { 'Cache-Control': 'no-store' };

function fail(status: number, code: GenerationErrorCode, message: string, reason?: string, extraHeaders: Record<string, string> = {}): Response {
  const body: GenerationFailure = { error: reason ? { code, message, reason } : { code, message } };
  return Response.json(body, { status, headers: { ...noStore, ...extraHeaders } });
}

const upstreamFailures: Record<ModelFailureCode, { status: number; code: GenerationErrorCode; message: string }> = {
  not_configured: { status: 503, code: 'generation_unavailable', message: '教材づくりは準備中です。' },
  upstream_auth: { status: 502, code: 'upstream_auth', message: 'モデルへの接続設定が受け付けられませんでした。管理者が接続キーを確認する必要があります。' },
  upstream_rate_limited: { status: 429, code: 'upstream_rate_limited', message: '今は混み合っています。少し待ってからもう一度お試しください。' },
  upstream_timeout: { status: 504, code: 'upstream_timeout', message: '教材づくりに時間がかかりすぎました。もう一度お試しください。' },
  upstream_error: { status: 502, code: 'upstream_error', message: 'モデルから教材を受け取れませんでした。もう一度お試しください。' },
  empty_output: { status: 502, code: 'upstream_error', message: 'モデルの返答が空でした。もう一度お試しください。' },
};

export async function handleGenerate(request: Request, env: ModelEnv, options: ModelCallOptions = {}): Promise<Response> {
  if (request.method !== 'POST') return fail(405, 'method_not_allowed', 'Use POST.', undefined, { Allow: 'POST' });
  if (!modelConfig(env)) return fail(503, 'generation_unavailable', '教材づくりは準備中です。');
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return fail(413, 'request_too_large', '依頼が大きすぎます。');
  let text: string;
  try { text = await request.text(); } catch { return fail(400, 'invalid_request', '依頼を読み取れませんでした。'); }
  if (text.length > MAX_BODY_BYTES) return fail(413, 'request_too_large', '依頼が大きすぎます。');
  let json: unknown;
  try { json = JSON.parse(text); } catch { return fail(400, 'invalid_request', '依頼の形式が正しくありません。'); }
  const parsed = generationRequestSchema.safeParse(json);
  if (!parsed.success) return fail(400, 'invalid_request', '依頼の内容が条件を満たしていません。関心を選ぶか、話したいことを書いてください。');
  const generation = parsed.data;

  const result = await requestStructuredJson(env, {
    messages: buildMuseMessages(generation),
    schemaName: LESSON_CONTRACT,
    schema: lessonDraftJsonSchema,
  }, options);
  if (!result.ok) {
    const mapped = upstreamFailures[result.code];
    return fail(mapped.status, mapped.code, mapped.message, undefined, mapped.status === 429 ? { 'Retry-After': '20' } : {});
  }

  let output: unknown;
  try { output = JSON.parse(result.content); } catch {
    return fail(502, 'invalid_output', '受け取った教材を読み取れなかったため、採用しませんでした。もう一度お試しください。', 'not_json');
  }
  const validated = validateLessonDraft(output, {
    draftId: generation.draft_id, level: generation.level, nativeLanguage: generation.native_language,
    learningStateVersion: generation.based_on_learning_state_version, binderIds: generation.binders.map(binder => binder.id),
  });
  if (!validated.success) {
    return fail(502, 'invalid_output', '受け取った教材が仕様に合わなかったため、採用しませんでした。もう一度お試しください。', validated.reason);
  }
  const body: GenerationSuccess = { contract: LESSON_CONTRACT, draft: validated.draft, model: result.model, usage: result.usage };
  return Response.json(body, { headers: noStore });
}

export const onRequest: PagesFunction<ModelEnv> = ({ request, env }) => handleGenerate(request, env);
