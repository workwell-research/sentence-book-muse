import { z } from 'zod';
import { levelSchema, lessonDraftSchema, nativeLanguageSchema } from '../../shared/lesson-schema';
import type { LessonDraft } from '../../shared/lesson-schema';

// The learner's shelf: binders approved by the learner and pages filed into them.
// Pages are copied from reviewed drafts; the draft ID is kept only to refuse filing it twice.
export const LIBRARY_KEY = 'sentence-book-muse:library:v1';
export const MAX_BINDERS = 100;
export const MAX_PAGES = 2000;

const text = (max: number) => z.string().trim().min(1).max(max);
export const binderSchema = z.strictObject({
  id: z.uuid(),
  title: text(80),
  description: text(240),
  createdAt: z.iso.datetime(),
  origin: z.literal('approved-new'),
});
export type Binder = z.infer<typeof binderSchema>;

const pageContent = lessonDraftSchema.omit({ draft_id: true, filing: true, level: true, native_language: true });
export const pageSchema = z.strictObject({
  id: z.uuid(),
  binderId: z.uuid(),
  sourceDraftId: z.uuid(),
  filedAt: z.iso.datetime(),
  level: levelSchema,
  native_language: nativeLanguageSchema,
  sceneTags: z.array(text(40)).min(1).max(5),
  model: z.string().min(1).max(120),
  ...pageContent.shape,
});
export type LibraryPage = z.infer<typeof pageSchema>;

export const librarySchema = z.strictObject({
  schemaVersion: z.literal(1),
  binders: z.array(binderSchema).max(MAX_BINDERS),
  pages: z.array(pageSchema).max(MAX_PAGES),
}).refine(value => new Set(value.binders.map(binder => binder.id)).size === value.binders.length, 'Binder IDs must be unique')
  .refine(value => new Set(value.pages.map(page => page.id)).size === value.pages.length, 'Page IDs must be unique')
  .refine(value => new Set(value.pages.map(page => page.sourceDraftId)).size === value.pages.length, 'A draft is filed at most once')
  .refine(value => value.pages.every(page => value.binders.some(binder => binder.id === page.binderId)), 'Pages belong to existing binders');
export type Library = z.infer<typeof librarySchema>;
export const EMPTY_LIBRARY: Library = { schemaVersion: 1, binders: [], pages: [] };

export type LibraryRead = { kind: 'ready'; library: Library } | { kind: 'unreadable' };
type LibraryStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function readLibrary(storage: LibraryStorage): LibraryRead {
  try {
    const raw = storage.getItem(LIBRARY_KEY);
    if (raw === null) return { kind: 'ready', library: EMPTY_LIBRARY };
    const parsed = librarySchema.safeParse(JSON.parse(raw));
    return parsed.success ? { kind: 'ready', library: parsed.data } : { kind: 'unreadable' };
  } catch { return { kind: 'unreadable' }; }
}

// The learner's explicit choice. A new binder is created only through the 'new' decision.
export type FilingDecision =
  | { kind: 'existing'; binderId: string }
  | { kind: 'new'; title: string; description: string };

export type FilingError = 'unreadable-storage' | 'duplicate-draft' | 'unknown-binder' | 'invalid-binder' | 'library-full';
export class FilingFailure extends Error {
  readonly reason: FilingError;
  constructor(reason: FilingError) { super(reason); this.reason = reason; }
}

export interface FilingDeps { now?: () => Date; uuid?: () => string }

export function fileDraft(storage: LibraryStorage, draft: LessonDraft, model: string, decision: FilingDecision, deps: FilingDeps = {}):
  { library: Library; page: LibraryPage; binder: Binder; createdBinder: boolean } {
  const current = readLibrary(storage);
  if (current.kind === 'unreadable') throw new FilingFailure('unreadable-storage');
  const library = current.library;
  if (library.pages.some(page => page.sourceDraftId === draft.draft_id)) throw new FilingFailure('duplicate-draft');
  const now = (deps.now ?? (() => new Date()))().toISOString();
  const uuid = deps.uuid ?? (() => crypto.randomUUID());

  let binder: Binder;
  let binders = library.binders;
  let createdBinder = false;
  if (decision.kind === 'existing') {
    const found = library.binders.find(item => item.id === decision.binderId);
    if (!found) throw new FilingFailure('unknown-binder');
    binder = found;
  } else {
    const parsed = binderSchema.safeParse({ id: uuid(), title: decision.title, description: decision.description, createdAt: now, origin: 'approved-new' });
    if (!parsed.success) throw new FilingFailure('invalid-binder');
    if (library.binders.length >= MAX_BINDERS) throw new FilingFailure('library-full');
    binder = parsed.data;
    binders = [...library.binders, binder];
    createdBinder = true;
  }
  if (library.pages.length >= MAX_PAGES) throw new FilingFailure('library-full');

  const { draft_id, filing, ...content } = draft;
  const page: LibraryPage = { ...content, id: uuid(), binderId: binder.id, sourceDraftId: draft_id, filedAt: now, sceneTags: filing.sceneTags, model };
  const next: Library = librarySchema.parse({ schemaVersion: 1, binders, pages: [...library.pages, page] });
  storage.setItem(LIBRARY_KEY, JSON.stringify(next));
  return { library: next, page, binder, createdBinder };
}

export function binderSummaries(library: Library): { binder: Binder; pages: LibraryPage[]; lastFiledAt: string | null }[] {
  return library.binders.map(binder => {
    const pages = library.pages.filter(page => page.binderId === binder.id).sort((a, b) => b.filedAt.localeCompare(a.filedAt));
    return { binder, pages, lastFiledAt: pages[0]?.filedAt ?? null };
  }).sort((a, b) => (b.lastFiledAt ?? b.binder.createdAt).localeCompare(a.lastFiledAt ?? a.binder.createdAt));
}

// Catalogue handed to the model so it can propose an existing destination. IDs come from this list only.
export function binderCatalogue(library: Library): { id: string; title: string; description: string }[] {
  return library.binders.map(({ id, title, description }) => ({ id, title, description }));
}
