import { z } from 'zod';
import { interestsSchema } from './interests';
import { levelSchema, nativeLanguageSchema } from './lesson-schema';

export const generationRequestSchema = z.strictObject({
  draft_id: z.uuid(),
  topic: z.string().max(2000),
  interests: interestsSchema,
  level: levelSchema,
  native_language: nativeLanguageSchema,
  based_on_learning_state_version: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).nullable(),
  binders: z.array(z.strictObject({
    id: z.uuid(), title: z.string().trim().min(1).max(80),
    description: z.string().trim().min(1).max(240),
  })).max(100),
}).refine(value => value.topic.trim().length > 0 || value.interests.length > 0,
  'Choose an interest or write a topic')
  .refine(value => new Set(value.binders.map(binder => binder.id)).size === value.binders.length,
    'Binder IDs must be unique');
export type GenerationRequest = z.infer<typeof generationRequestSchema>;

// Call only when the learner explicitly requests generation. Keep this ID for retries
// of the same payload; edits to topic/preferences require a new request and draft ID.
export function createGenerationRequest(
  draftId: string,
  note: { topic: string; level: string; nativeLanguage: string },
  interests: string[],
  binders: GenerationRequest['binders'] = [],
  learningStateVersion: number | null = null,
): GenerationRequest {
  return generationRequestSchema.parse({
    draft_id: draftId, topic: note.topic, interests, level: note.level,
    native_language: note.nativeLanguage, binders,
    based_on_learning_state_version: learningStateVersion,
  });
}
