import type { Level } from '../../shared/lesson-schema';
import { deliveryPlanSchema, lessonSourceSchema, weekdays } from '../../shared/muse-connection';
import type { LessonSource, Weekday } from '../../shared/muse-connection';
export type { Level } from '../../shared/lesson-schema';
// Lesson settings for Muse. `topic` is used only when copying a request to Muse by hand.
export interface ComposerNote { topic: string; level: Level; nativeLanguage: string; source: LessonSource; days: Weekday[]; time: string }
export const COMPOSER_KEY = 'sentence-book-muse:composer:v1';
export const EMPTY_NOTE: ComposerNote = { topic: '', level: 'A2', nativeLanguage: 'ja', source: 'conversation', days: [...weekdays], time: '07:00' };
export type NoteRead = { kind: 'ready'; note: ComposerNote } | { kind: 'unreadable' };
type NoteStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function readNote(storage: NoteStorage): NoteRead {
  try {
    const raw = storage.getItem(COMPOSER_KEY);
    if (raw === null) return { kind: 'ready', note: { ...EMPTY_NOTE, days: [...EMPTY_NOTE.days] } };
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return { kind: 'unreadable' };
    const saved = value as Record<string, unknown>;
    if (saved.schemaVersion !== 1 || typeof saved.topic !== 'string' || saved.topic.length > 2000
      || !['A2', 'B1', 'B2'].includes(String(saved.level))
      || typeof saved.nativeLanguage !== 'string' || !['ja', 'en', 'es', 'fr', 'ko', 'zh'].includes(saved.nativeLanguage))
      return { kind: 'unreadable' };
    // Notes saved before the lesson settings existed take the defaults.
    const source = lessonSourceSchema.safeParse(saved.source ?? EMPTY_NOTE.source);
    const plan = deliveryPlanSchema.safeParse(saved.days === undefined && saved.time === undefined
      ? { days: EMPTY_NOTE.days, time: EMPTY_NOTE.time } : { days: saved.days, time: saved.time });
    if (!source.success || !plan.success) return { kind: 'unreadable' };
    return { kind: 'ready', note: { topic: saved.topic, level: saved.level as Level, nativeLanguage: saved.nativeLanguage,
      source: source.data, days: [...plan.data.days], time: plan.data.time } };
  } catch { return { kind: 'unreadable' }; }
}

export function saveNote(storage: NoteStorage, note: ComposerNote): void {
  // Never silently overwrite a saved value we cannot read.
  if (readNote(storage).kind === 'unreadable') throw new Error('unreadable-storage');
  storage.setItem(COMPOSER_KEY, JSON.stringify({ schemaVersion: 1, ...note }));
}

// The fallback topic is kept as it is typed, without saving lesson settings the learner has not saved yet.
export function saveTopic(storage: NoteStorage, topic: string): void {
  const saved = readNote(storage);
  if (saved.kind === 'unreadable') throw new Error('unreadable-storage');
  storage.setItem(COMPOSER_KEY, JSON.stringify({ schemaVersion: 1, ...saved.note, topic }));
}

const dayNames: Record<Weekday, string> = { mon: '月', tue: '火', wed: '水', thu: '木', fri: '金', sat: '土', sun: '日' };
export const dayLabel = (day: Weekday) => dayNames[day];
export function scheduleText(note: Pick<ComposerNote, 'days' | 'time'>): string {
  const days = weekdays.filter(day => note.days.includes(day));
  return (days.length === 7 ? '毎日' : '毎週' + days.map(dayLabel).join('・') + '曜日') + 'の' + note.time.replace(/^0/, '');
}
// The schedule itself lives in Muse; this message asks Muse to match it.
export function scheduleRequest(note: Pick<ComposerNote, 'days' | 'time'>): string {
  return `The Sentence Bookのレッスンを届ける予定を、${scheduleText(note)}にしてください。今の予定と違えば、予定のほうを合わせてください。届けない曜日には、何も送らなくて大丈夫です。`;
}
