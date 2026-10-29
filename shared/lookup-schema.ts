import { z } from 'zod';
import { levelSchema, nativeLanguageSchema } from './lesson-schema';

// One learner-selected expression inside one sentence → one short meaning in the learner's language.
// The learner chooses where the line goes; the model only explains that span in its context.
export const LOOKUP_CONTRACT = 'sentence_book_lookup_v1';
const text = (max: number) => z.string().min(1).max(max).regex(/\S/, 'Must contain visible text');

export const lookupRequestSchema = z.strictObject({
  expression: text(120),
  sentence: text(500),
  level: levelSchema,
  native_language: nativeLanguageSchema,
}).refine(value => value.sentence.includes(value.expression), 'The expression must occur in the sentence');
export type LookupRequest = z.infer<typeof lookupRequestSchema>;

export const lookupResultSchema = z.strictObject({
  expression: text(120),
  native: text(120),
  note: z.string().max(200).nullable().default(null),
});
export type LookupResult = z.infer<typeof lookupResultSchema>;
export const lookupResultJsonSchema = z.toJSONSchema(lookupResultSchema, { target: 'draft-07', io: 'input' });

export function validateLookup(value: unknown, request: Pick<LookupRequest, 'expression'>):
  | { success: true; result: LookupResult }
  | { success: false; reason: 'invalid_shape' | 'request_mismatch' } {
  const parsed = lookupResultSchema.safeParse(value);
  if (!parsed.success) return { success: false, reason: 'invalid_shape' };
  if (parsed.data.expression !== request.expression) return { success: false, reason: 'request_mismatch' };
  return { success: true, result: parsed.data };
}
