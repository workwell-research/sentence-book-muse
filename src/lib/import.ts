import { z } from 'zod';
import { createGenerationRequest } from '../../shared/generation-request';
import type { GenerationRequest } from '../../shared/generation-request';
import { LESSON_CONTRACT, lessonDraftJsonSchema, levelSchema, nativeLanguageSchema, validateLessonDraft } from '../../shared/lesson-schema';
import type { LessonDraft } from '../../shared/lesson-schema';
import { MUSE_PAGE_INSTRUCTIONS } from '../../shared/muse-instructions';

// "Bring your own Muse": the learner copies a request into their own Muse app and pastes the page back.
// The pasted page passes the same validation as a page from /api/generate, bound to a locally issued ticket.

export const IMPORT_TICKET_KEY = 'sentence-book-muse:import-ticket:v1';
export const MODEL_LABEL_OWN_MUSE = 'muse-app';
const ticketSchema = z.strictObject({
  version: z.literal(1),
  draftId: z.uuid(),
  level: levelSchema,
  nativeLanguage: nativeLanguageSchema,
  binderIds: z.array(z.uuid()).max(100),
  issuedAt: z.iso.datetime(),
});
export type ImportTicket = z.infer<typeof ticketSchema>;
type TicketStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function readImportTicket(storage: TicketStorage): ImportTicket | null {
  try {
    const raw = storage.getItem(IMPORT_TICKET_KEY);
    if (raw === null) return null;
    const parsed = ticketSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch { return null; }
}
// One ticket per intended page: the same ID stays until a page with it is accepted or the request changes.
export function issueImportTicket(storage: TicketStorage, input: { level: string; nativeLanguage: string; binderIds: readonly string[] },
  deps: { uuid?: () => string; now?: () => Date } = {}): ImportTicket {
  const current = readImportTicket(storage);
  const same = current && current.level === input.level && current.nativeLanguage === input.nativeLanguage
    && JSON.stringify(current.binderIds) === JSON.stringify(input.binderIds);
  if (same) return current;
  const ticket = ticketSchema.parse({
    version: 1, draftId: (deps.uuid ?? (() => crypto.randomUUID()))(), level: input.level, nativeLanguage: input.nativeLanguage,
    binderIds: [...input.binderIds], issuedAt: (deps.now ?? (() => new Date()))().toISOString(),
  });
  try { storage.setItem(IMPORT_TICKET_KEY, JSON.stringify(ticket)); } catch { /* an unsaved ticket only means a new ID next time */ }
  return ticket;
}
export function clearImportTicket(storage: TicketStorage): void {
  try { storage.removeItem(IMPORT_TICKET_KEY); } catch { /* nothing to clear */ }
}

// The text the learner pastes into their Muse: the same instructions the server uses, the schema, and the request.
export function buildMusePrompt(request: GenerationRequest): string {
  return [
    '英語の練習ページを1枚、下の JSON Schema に完全に従った JSON だけで作ってください。説明文やコードブロックの記号は不要です。',
    '',
    '# Instructions',
    ...MUSE_PAGE_INSTRUCTIONS.map(line => `- ${line}`),
    '',
    `# Output JSON Schema (${LESSON_CONTRACT})`,
    JSON.stringify(lessonDraftJsonSchema),
    '',
    '# Task data (JSON)',
    JSON.stringify(request),
  ].join('\n');
}

export function musePromptFor(ticket: ImportTicket, note: { topic: string }, interests: string[],
  binders: GenerationRequest['binders']): string | null {
  try {
    return buildMusePrompt(createGenerationRequest(ticket.draftId, { topic: note.topic, level: ticket.level, nativeLanguage: ticket.nativeLanguage }, interests, binders));
  } catch { return null; }
}

// Muse replies often wrap the object in prose or a ```json fence; take the outermost object.
export function extractJson(text: string): unknown | undefined {
  const trimmed = text.trim();
  const candidates = [trimmed, trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')];
  const first = trimmed.indexOf('{'), last = trimmed.lastIndexOf('}');
  if (first >= 0 && last > first) candidates.push(trimmed.slice(first, last + 1));
  for (const candidate of candidates) {
    try { return JSON.parse(candidate); } catch { /* try the next shape */ }
  }
  return undefined;
}

const reasonText = {
  invalid_shape: 'ページの形が仕様と合いません。Museに、JSON Schema どおりの JSON だけを返すよう頼み直してください。',
  request_mismatch: '頼んだ内容（draft_id・レベル・言語）と違うページです。いまの「Museへの頼み方」をコピーし直して、もう一度作ってもらってください。',
  unknown_binder: '一覧にない本に仕舞う提案になっています。いまの「Museへの頼み方」をコピーし直してください。',
  invalid_review_reference: '復習の語句が指す文番号がページの外です。もう一度作ってもらってください。',
} as const;

export type ImportOutcome = { kind: 'ready'; draft: LessonDraft } | { kind: 'failed'; message: string };
export function importLesson(text: string, ticket: ImportTicket | null): ImportOutcome {
  if (!ticket) return { kind: 'failed', message: '先に「Museへの頼み方」を開いてから、返ってきた JSON を貼ってください。' };
  if (!text.trim()) return { kind: 'failed', message: 'Museの返事（JSON）を貼ってください。' };
  const value = extractJson(text);
  if (value === undefined) return { kind: 'failed', message: 'JSON として読めませんでした。Museの返事のうち、{ から } までを貼ってください。' };
  const validated = validateLessonDraft(value, {
    draftId: ticket.draftId, level: ticket.level, nativeLanguage: ticket.nativeLanguage, learningStateVersion: null, binderIds: ticket.binderIds,
  });
  if (!validated.success) return { kind: 'failed', message: reasonText[validated.reason] };
  return { kind: 'ready', draft: validated.draft };
}
