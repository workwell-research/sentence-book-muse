import { z } from 'zod';

// New contract for this rebuild, not a recovered or compatible legacy v2 schema.
export const LESSON_CONTRACT = 'sentence_book_page_v1';
const text = (max: number) => z.string().min(1).max(max).regex(/\S/, 'Must contain visible text');
export const levelSchema = z.enum(['A2', 'B1', 'B2']);
export type Level = z.infer<typeof levelSchema>;
export const nativeLanguageSchema = z.enum(['ja', 'en', 'es', 'fr', 'ko', 'zh']);
const learningVersion = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).nullable();
const pair = z.strictObject({ en: text(500), native: text(500) });
const filingDetails = { reason: text(400), sceneTags: z.array(text(40)).min(1).max(5) };

export const filingProposalSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('existing'), binderId: z.uuid(), ...filingDetails }),
  z.strictObject({
    kind: z.literal('new'),
    newBinder: z.strictObject({ title: text(80), description: text(240) }),
    ...filingDetails,
  }),
]);

export const lessonDraftSchema = z.strictObject({
  draft_id: z.uuid(),
  title: text(120),
  level: levelSchema,
  native_language: nativeLanguageSchema,
  sentences: z.array(pair).min(4).max(12),
  questions: z.array(z.strictObject({
    en: text(500),
    native: text(500),
    sample_answer: pair,
  })).min(1).max(2),
  review_items: z.array(z.strictObject({
    expression: text(120),
    native: text(300),
    sentence_index: z.number().int().min(0).max(11),
  })).max(4),
  estimated_minutes: z.number().int().min(1).max(60),
  based_on_learning_state_version: learningVersion,
  filing: filingProposalSchema,
});

export type LessonDraft = z.infer<typeof lessonDraftSchema>;
export type FilingProposal = z.infer<typeof filingProposalSchema>;
export interface DraftContext {
  draftId: string;
  level: Level;
  nativeLanguage: z.infer<typeof nativeLanguageSchema>;
  learningStateVersion: number | null;
  binderIds: readonly string[];
}

// This exports structure only; request-dependent checks below are still mandatory.
// Provider support for the exported JSON Schema must be tested with the real adapter.
export const lessonDraftJsonSchema = z.toJSONSchema(lessonDraftSchema, { target: 'draft-07' });

export function validateLessonDraft(value: unknown, context: DraftContext):
  | { success: true; draft: LessonDraft }
  | { success: false; reason: 'invalid_shape' | 'request_mismatch' | 'unknown_binder' | 'invalid_review_reference' } {
  const parsed = lessonDraftSchema.safeParse(value);
  if (!parsed.success) return { success: false, reason: 'invalid_shape' };
  const draft = parsed.data;
  if (draft.draft_id !== context.draftId || draft.level !== context.level
    || draft.native_language !== context.nativeLanguage
    || draft.based_on_learning_state_version !== context.learningStateVersion)
    return { success: false, reason: 'request_mismatch' };
  if (draft.filing.kind === 'existing' && !context.binderIds.includes(draft.filing.binderId))
    return { success: false, reason: 'unknown_binder' };
  if (draft.review_items.some(item => item.sentence_index >= draft.sentences.length))
    return { success: false, reason: 'invalid_review_reference' };
  return { success: true, draft };
}
