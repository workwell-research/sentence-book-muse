import { z } from 'zod';
import { levelSchema, nativeLanguageSchema } from './lesson-schema';

// Reconstruction: the learner wrote their own English from the meaning. The model sentence is one good answer,
// not the key. The model judges whether the learner's line carries the meaning with acceptable grammar, and may
// offer a more natural phrasing with one short note in the learner's language. Nothing is stored server-side.
export const REVIEW_CONTRACT = 'sentence_book_review_v1';
const text = (max: number) => z.string().min(1).max(max).regex(/\S/, 'Must contain visible text');

export const reviewRequestSchema = z.strictObject({
  meaning: text(500),
  model: text(500),
  own: text(500),
  level: levelSchema,
  native_language: nativeLanguageSchema,
});
export type ReviewRequest = z.infer<typeof reviewRequestSchema>;

// What the model must write. Every field is a required string, with an empty string for "nothing to add":
// with natural and note optional/nullable, muse-spark-1.3 left both null even for "unclear" verdicts, and
// sometimes stalled on whitespace after the verdict until the token budget ran out.
export const reviewModelOutputSchema = z.strictObject({
  own: text(500),
  verdict: z.enum(['fine', 'unclear']),
  natural: z.string().max(200),
  note: z.string().max(240),
});
export const reviewResultJsonSchema = z.toJSONSchema(reviewModelOutputSchema, { target: 'draft-07', io: 'input' });

// What the browser receives and keeps: blanks already turned into null.
export const reviewResultSchema = z.strictObject({
  own: text(500),
  verdict: z.enum(['fine', 'unclear']),
  natural: z.string().max(200).nullable().default(null),
  note: z.string().max(240).nullable().default(null),
});
export type ReviewResult = z.infer<typeof reviewResultSchema>;

export function validateReview(value: unknown, request: Pick<ReviewRequest, 'own'>):
  | { success: true; result: ReviewResult }
  | { success: false; reason: 'invalid_shape' | 'request_mismatch' } {
  const parsed = reviewResultSchema.safeParse(value);
  if (!parsed.success) return { success: false, reason: 'invalid_shape' };
  if (parsed.data.own !== request.own) return { success: false, reason: 'request_mismatch' };
  const result = parsed.data;
  // Blank strings are the model's "nothing to add"; a phrasing identical to the learner's line is no suggestion either.
  if (!result.natural?.trim() || result.natural.trim() === request.own.trim()) result.natural = null;
  if (!result.note?.trim()) result.note = null;
  return { success: true, result };
}
