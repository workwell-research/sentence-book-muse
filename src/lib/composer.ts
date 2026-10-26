import type { Level } from '../../shared/lesson-schema';
export type { Level } from '../../shared/lesson-schema';
export interface ComposerNote { topic: string; level: Level; nativeLanguage: string }
export const COMPOSER_KEY = 'sentence-book-muse:composer:v1';
export const EMPTY_NOTE: ComposerNote = { topic: '', level: 'A2', nativeLanguage: 'ja' };
export type NoteRead = { kind: 'ready'; note: ComposerNote } | { kind: 'unreadable' };
type NoteStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function readNote(storage: NoteStorage): NoteRead {
  try {
    const raw = storage.getItem(COMPOSER_KEY);
    if (raw === null) return { kind: 'ready', note: { ...EMPTY_NOTE } };
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return { kind: 'unreadable' };
    const saved = value as Record<string, unknown>;
    if (saved.schemaVersion !== 1 || typeof saved.topic !== 'string' || saved.topic.length > 2000
      || !['A2', 'B1', 'B2'].includes(String(saved.level))
      || typeof saved.nativeLanguage !== 'string' || !['ja', 'en', 'es', 'fr', 'ko', 'zh'].includes(saved.nativeLanguage))
      return { kind: 'unreadable' };
    return { kind: 'ready', note: { topic: saved.topic, level: saved.level as Level, nativeLanguage: saved.nativeLanguage } };
  } catch { return { kind: 'unreadable' }; }
}

export function saveNote(storage: NoteStorage, note: ComposerNote): void {
  // Never silently overwrite a saved value we cannot read.
  if (readNote(storage).kind === 'unreadable') throw new Error('unreadable-storage');
  storage.setItem(COMPOSER_KEY, JSON.stringify({ schemaVersion: 1, ...note }));
}
