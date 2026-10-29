import type { LessonDraft } from './lesson-schema';

// Wire contract between the browser and /api/generate. Shared so both sides map the same codes.
export const GENERATION_ERROR_CODES = [
  'method_not_allowed', 'generation_unavailable', 'request_too_large', 'invalid_request',
  'upstream_auth', 'upstream_rate_limited', 'upstream_timeout', 'upstream_error', 'invalid_output',
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

export function isGenerationErrorCode(value: unknown): value is GenerationErrorCode {
  return typeof value === 'string' && (GENERATION_ERROR_CODES as readonly string[]).includes(value);
}
