import type { LessonDraft } from './lesson-schema';

// Wire contract between the browser and /api/generate. Shared so both sides map the same codes.
export const GENERATION_ERROR_CODES = [
  'method_not_allowed', 'generation_unavailable', 'request_too_large', 'invalid_request',
  'upstream_auth', 'upstream_rate_limited', 'upstream_timeout', 'upstream_error', 'invalid_output', 'rate_limited',
  'invite_required', 'invalid_invite', 'access_denied',
] as const;
export type GenerationErrorCode = typeof GENERATION_ERROR_CODES[number];

export interface GenerationUsage { prompt_tokens: number; completion_tokens: number; reasoning_tokens?: number }
export interface GenerationSuccess {
  contract: 'sentence_book_page_v1';
  draft: LessonDraft;
  model: string;
  usage: GenerationUsage | null;
}
export interface GenerationFailure { error: { code: GenerationErrorCode; message: string; reason?: string } }

// The app's own usage caps (not the provider's). The reason names the scope so the browser can say what to do.
export function rateLimitMessage(reason: unknown): string {
  switch (reason) {
    case 'minute': return '続けて使いすぎています。1分ほど待ってから、もう一度どうぞ。';
    case 'day': return '今日の分を使い切りました。また明日どうぞ。';
    case 'global': return '今日はたくさん使われたため、いったん止めています。また明日どうぞ。';
    default: return '使える回数の上限に達しました。少し待ってから、もう一度どうぞ。';
  }
}

export function isGenerationErrorCode(value: unknown): value is GenerationErrorCode {
  return typeof value === 'string' && (GENERATION_ERROR_CODES as readonly string[]).includes(value);
}
