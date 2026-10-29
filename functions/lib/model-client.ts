import type { GenerationUsage } from '../../shared/generation-api';

// OpenAI-compatible Chat Completions client for Meta Model API (or any compatible host).
// The key lives only in server bindings; it is never echoed in results or errors.
export interface ModelEnv {
  META_MODEL_API_KEY?: string;
  MODEL_API_BASE_URL?: string;
  MODEL_ID?: string;
}
export const DEFAULT_MODEL_API_BASE_URL = 'https://api.meta.ai/v1';
export const DEFAULT_MODEL_ID = 'muse-spark-1.3';
export type ReasoningEffort = 'minimal' | 'low' | 'medium' | 'high';

export interface StructuredJsonRequest {
  messages: { role: 'system' | 'user'; content: string }[];
  schemaName: string;
  schema: unknown;
  maxTokens?: number;
  reasoningEffort?: ReasoningEffort;
}
export type ModelFailureCode = 'not_configured' | 'upstream_auth' | 'upstream_rate_limited'
  | 'upstream_timeout' | 'upstream_error' | 'empty_output' | 'truncated_output';
export type ModelResult =
  | { ok: true; content: string; model: string; usage: GenerationUsage | null }
  | { ok: false; code: ModelFailureCode; status?: number };
export interface ModelCallOptions { fetch?: typeof fetch; timeoutMs?: number }

export function modelConfig(env: ModelEnv): { key: string; baseUrl: string; model: string } | null {
  const key = env.META_MODEL_API_KEY?.trim();
  if (!key) return null;
  const baseUrl = (env.MODEL_API_BASE_URL?.trim() || DEFAULT_MODEL_API_BASE_URL).replace(/\/+$/, '');
  const model = env.MODEL_ID?.trim() || DEFAULT_MODEL_ID;
  return { key, baseUrl, model };
}

export async function requestStructuredJson(
  env: ModelEnv, request: StructuredJsonRequest, options: ModelCallOptions = {},
): Promise<ModelResult> {
  const config = modelConfig(env);
  if (!config) return { ok: false, code: 'not_configured' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 90_000);
  try {
    let response: Response;
    try {
      response = await (options.fetch ?? fetch)(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { authorization: `Bearer ${config.key}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          model: config.model,
          messages: request.messages,
          // Reasoning tokens share this budget; the schema-constrained page itself is ~1,000 tokens,
          // but reasoning at 'low' has been observed to spike, and a cut-off page is unusable.
          max_tokens: request.maxTokens ?? 12000,
          reasoning_effort: request.reasoningEffort ?? 'low',
          response_format: { type: 'json_schema', json_schema: { name: request.schemaName, schema: request.schema } },
        }),
        signal: controller.signal,
      });
    } catch {
      return { ok: false, code: controller.signal.aborted ? 'upstream_timeout' : 'upstream_error' };
    }
    if (!response.ok) {
      const code: ModelFailureCode = response.status === 401 || response.status === 403 ? 'upstream_auth'
        : response.status === 429 ? 'upstream_rate_limited' : 'upstream_error';
      return { ok: false, code, status: response.status };
    }
    let body: unknown;
    try { body = await response.json(); } catch { return { ok: false, code: 'upstream_error', status: response.status }; }
    if (finishReason(body) === 'length') return { ok: false, code: 'truncated_output', status: response.status };
    const content = extractContent(body);
    if (!content) return { ok: false, code: 'empty_output', status: response.status };
    const model = typeof (body as { model?: unknown }).model === 'string' ? (body as { model: string }).model : config.model;
    return { ok: true, content, model, usage: extractUsage(body) };
  } finally {
    clearTimeout(timer);
  }
}

function finishReason(body: unknown): string | null {
  const choices = (body as { choices?: unknown })?.choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const reason = (choices[0] as { finish_reason?: unknown }).finish_reason;
  return typeof reason === 'string' ? reason : null;
}

function extractContent(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const choices = (body as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;
  const message = (choices[0] as { message?: { content?: unknown } }).message;
  const content = message?.content;
  if (typeof content === 'string') return content.trim() ? content : null;
  if (Array.isArray(content)) {
    const text = content.map(part => typeof part === 'object' && part !== null && typeof (part as { text?: unknown }).text === 'string'
      ? (part as { text: string }).text : '').join('');
    return text.trim() ? text : null;
  }
  return null;
}

function extractUsage(body: unknown): GenerationUsage | null {
  const usage = (body as { usage?: unknown }).usage;
  if (typeof usage !== 'object' || usage === null) return null;
  const record = usage as Record<string, unknown>;
  if (typeof record.prompt_tokens !== 'number' || typeof record.completion_tokens !== 'number') return null;
  const details = record.completion_tokens_details as { reasoning_tokens?: unknown } | undefined;
  const result: GenerationUsage = { prompt_tokens: record.prompt_tokens, completion_tokens: record.completion_tokens };
  if (typeof details?.reasoning_tokens === 'number') result.reasoning_tokens = details.reasoning_tokens;
  return result;
}
