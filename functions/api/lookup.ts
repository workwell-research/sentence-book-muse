import { LOOKUP_CONTRACT, lookupRequestSchema, lookupResultJsonSchema, validateLookup } from '../../shared/lookup-schema';
import type { LookupResult } from '../../shared/lookup-schema';
import type { GenerationUsage } from '../../shared/generation-api';
import { buildLookupMessages } from '../lib/lookup-prompt';
import { modelConfig, requestStructuredJson } from '../lib/model-client';
import type { ModelCallOptions, ModelEnv } from '../lib/model-client';
import { fail, noStore, readJsonBody, upstreamFailure } from '../lib/route';

// One selected expression → one bounded model call → a validated meaning or a coded failure.
// Nothing is stored server-side; the browser keeps the line and the word.
const MAX_BODY_BYTES = 8 * 1024;
export interface LookupSuccess { contract: typeof LOOKUP_CONTRACT; result: LookupResult; model: string; usage: GenerationUsage | null }

export async function handleLookup(request: Request, env: ModelEnv, options: ModelCallOptions = {}): Promise<Response> {
  if (request.method !== 'POST') return fail(405, 'method_not_allowed', 'Use POST.', undefined, { Allow: 'POST' });
  if (!modelConfig(env)) return fail(503, 'generation_unavailable', '調べる機能は準備中です。');
  const body = await readJsonBody(request, MAX_BODY_BYTES);
  if (!body.ok) return body.response;
  const parsed = lookupRequestSchema.safeParse(body.json);
  if (!parsed.success) return fail(400, 'invalid_request', '調べる語句は、その文の中から選んでください。');
  const lookup = parsed.data;

  const result = await requestStructuredJson(env, {
    messages: buildLookupMessages(lookup), schemaName: LOOKUP_CONTRACT, schema: lookupResultJsonSchema,
    maxTokens: 3000, reasoningEffort: 'minimal',
  }, options);
  if (!result.ok) return upstreamFailure(result.code);
  let output: unknown;
  try { output = JSON.parse(result.content); } catch {
    return fail(502, 'invalid_output', '意味を読み取れませんでした。もう一度お試しください。', 'not_json');
  }
  const validated = validateLookup(output, lookup);
  if (!validated.success) return fail(502, 'invalid_output', '受け取った意味が選んだ語句と合わなかったため、採用しませんでした。', validated.reason);
  const success: LookupSuccess = { contract: LOOKUP_CONTRACT, result: validated.result, model: result.model, usage: result.usage };
  return Response.json(success, { headers: noStore });
}

export const onRequest: PagesFunction<ModelEnv> = ({ request, env }) => handleLookup(request, env);
