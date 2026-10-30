import { z } from 'zod';
import { LESSON_CONTRACT, lessonDraftJsonSchema, lessonDraftSchema, levelSchema, nativeLanguageSchema } from './lesson-schema';
import { MUSE_PAGE_INSTRUCTIONS } from './muse-instructions';

const text = (max: number) => z.string().trim().min(1).max(max);
export const learningSummarySchema = z.strictObject({
  level: levelSchema,
  native_language: nativeLanguageSchema,
  interests: z.array(text(80)).max(12),
  binders: z.array(z.strictObject({ id: z.uuid(), title: text(80), description: text(240) })).max(100),
  local_pending_count: z.number().int().min(0).max(50),
  unpractised_count: z.number().int().min(0).max(2000),
  completed_last_7_days: z.number().int().min(0).max(2000),
  review_candidates: z.array(z.strictObject({ expression: text(120), native: text(300) })).max(12),
  observed_at: z.iso.datetime(),
}).refine(s => new Set(s.binders.map(b => b.id)).size === s.binders.length, 'Duplicate binder ID');
export type LearningSummary = z.infer<typeof learningSummarySchema>;
export const deliverySchema = z.strictObject({ contract: z.literal(LESSON_CONTRACT), delivery_date: z.iso.date(), draft: lessonDraftSchema });
export type MuseDelivery = z.infer<typeof deliverySchema>;
export const permissionsSchema = z.strictObject({ read_summary: z.boolean(), deliver_drafts: z.boolean() });
export type MusePermissions = z.infer<typeof permissionsSchema>;
export interface SharedState { version: number; updated_at: string; summary: LearningSummary | null }
export interface InboxItem { draft_id: string; draft: z.infer<typeof lessonDraftSchema>; status: 'pending' | 'filed' | 'discarded'; received_at: string }
export interface Connection { client_id: string; client_name: string; read_summary: boolean; deliver_drafts: boolean; created_at: string }

// Stable per user and calendar date: retries cannot create another daily delivery.
export async function dailyDraftId(userId: string, date: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${LESSON_CONTRACT}\n${userId}\n${date}`))).slice(0, 16);
  bytes[6] = (bytes[6]! & 15) | 0x50; bytes[8] = (bytes[8]! & 63) | 0x80;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

export function lessonGuide() {
  return {
    contract: LESSON_CONTRACT,
    instructions: [...MUSE_PAGE_INSTRUCTIONS,
      'First read get_learning_state for the learner-selected delivery date. Use its draft_id, state_version, level and native_language exactly.',
      'The learner chooses the date in their own time zone. Reuse that same date and draft_id on retries. Never invent or change an ID to bypass a duplicate or inbox limit.',
      'Learning state is an explicitly shared snapshot of one browser, not complete history. Check observed_at and updated_at. Unknown accuracy, time spent and reasons for stopping must remain unknown.',
      'If pending or unpractised pages are piling up, offer a shorter review page or skip delivery and report why. Do not infer that the learner is struggling merely because they were inactive.',
      'Use review_candidates in another topic where natural. Do not change the requested level without the learner changing their preference.',
      'Use only context the learner authorized Muse to use. Deliver a draft for review; never create binders, adopt pages or alter completed work.',
      'After a validation error, correct and resend at most once. Report delivered only when a server receipt confirms accepted or duplicate. A conflict is not success.',
    ],
    schema: lessonDraftJsonSchema,
    permissions: ['Read the explicitly shared learning summary', 'Deliver a draft to the private inbox'],
    does_not_do: ['Call the app owner’s model API', 'Read full learning history', 'Adopt or delete library pages', 'Set a recurring task without the learner asking'],
  };
}

export interface ConnectionKey { id: string; label: string; read_summary: boolean; deliver_drafts: boolean; created_at: string; expires_at: string }
export interface IssuedConnectionKey { key: ConnectionKey; token: string }
