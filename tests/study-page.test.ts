import { describe, expect, it } from 'vitest';
import { createA5Layout } from '../src/handwriting/a5-layout';
import { defaultFonts } from '../src/handwriting/fonts';
import { studySample } from '../src/handwriting/study-content';
import { practiceKey } from '../src/desk/core';
import { LIBRARY_KEY } from '../src/lib/library';
import type { Binder, LibraryPage } from '../src/lib/library';
import { DESK_SELECTION_KEY, copyKey, lessonWithLookups, normalizeHandText, notebookDate, requestedPageId, readSelection, rememberSelection, resolveDeskLesson, studyContentFromPage, writableMeaning } from '../src/lib/study-page';

const paper = { binding: 18, side: 'left' as const };
const binder: Binder = { id: 'a785f741-e09f-4657-885a-2c2bed838c2e', title: '仕事の英語プレゼン', description: '発表と質疑', createdAt: '2026-10-29T09:00:00.000Z', origin: 'approved-new' };
const page: LibraryPage = {
  id: '4fc15635-0393-4faa-ab2a-6ebd95dc8c42', binderId: binder.id, sourceDraftId: '7f3e4b7e-5c1a-4d2b-9e8f-1a2b3c4d5e6f',
  filedAt: '2026-10-29T12:30:00.000Z', level: 'B1', native_language: 'ja', sceneTags: ['発表', '出張'], model: 'muse-spark-1.3',
  title: 'Presenting in Abu Dhabi', estimated_minutes: 10, based_on_learning_state_version: null,
  sentences: [
    { en: 'Next week, I’m giving a talk in Abu Dhabi.', native: '来週、アブダビで発表します。' },
    { en: 'I want to take a short walk before it starts — just to breathe.', native: '始まる前に少し歩きたい。' },
    { en: 'My slides are almost ready…', native: 'スライドはほぼできている。' },
    { en: 'I will keep my answers short and clear.', native: '答えは短く明確に。' },
  ],
  questions: [{ en: 'What will you present?', native: '何を発表しますか？', sample_answer: { en: 'Our new plan.', native: '新しい計画です。' } }],
  review_items: [
    { expression: 'giving a talk', native: '発表する', sentence_index: 0 },
    { expression: 'take a break', native: '休憩する', sentence_index: 1 },
    { expression: 'short and clear', native: '短く明確に', sentence_index: 3 },
  ],
};
function storage(seed: Record<string, string> = {}) {
  const map = new Map(Object.entries(seed));
  return { getItem: (key: string) => map.get(key) ?? null, setItem: (key: string, value: string) => { map.set(key, value); }, map };
}
const library = (pages: LibraryPage[] = [page]) => JSON.stringify({ schemaVersion: 1, binders: [binder], pages });

describe('typeable notebook text', () => {
  it('folds curly quotes, dashes, ellipses and odd spaces into keyboard characters', () => {
    expect(normalizeHandText('I’m “here” — now… ok')).toBe('I\'m "here" - now... ok');
    expect(normalizeHandText('  two   spaces 　 ')).toBe('two spaces');
  });
  it('formats the filing date the way the notebook header expects', () => {
    expect(notebookDate('2026-10-29T12:30:00.000Z')).toMatch(/^\d{1,2} OCT 2026$/);
    expect(notebookDate('nonsense')).toBeNull();
  });
});

describe('a filed page as desk material', () => {
  it('carries Muse’s questions for Speaking and each sentence’s review expression as its Reconstruction hint', () => {
    const lesson = studyContentFromPage(page, binder, paper, defaultFonts);
    if (lesson.kind !== 'ready') throw new Error('expected a ready lesson');
    expect(lesson.content.questions).toEqual([{ id: 'question-1', en: 'What will you present?', native: '何を発表しますか？', sample: { en: 'Our new plan.', native: '新しい計画です。' } }]);
    expect(lesson.content.sentences.map(s => s.hint)).toEqual(['giving a talk', 'take a break', undefined, 'short and clear']);
  });
  it('keeps every sentence with its meaning and lists review items as words without drawing lines', () => {
    const lesson = studyContentFromPage(page, binder, paper, defaultFonts);
    expect(lesson.kind).toBe('ready');
    if (lesson.kind !== 'ready') return;
    expect(lesson.trimmed).toBe(false);
    expect(lesson.content.id).toBe(page.id);
    expect(lesson.content.title).toBe('Presenting in Abu Dhabi');
    expect(lesson.content.sentences.map(s => s.text)).toEqual([
      'Next week, I\'m giving a talk in Abu Dhabi.', 'I want to take a short walk before it starts - just to breathe.',
      'My slides are almost ready...', 'I will keep my answers short and clear.',
    ]);
    expect(lesson.content.sentences[0].meaning).toBe('来週、アブダビで発表します。');
    // Muse's candidates never draw lines on the paper; the learner draws those by looking words up.
    expect(lesson.content.sentences.every(sentence => sentence.glosses === undefined)).toBe(true);
    expect(lesson.content.vocabulary.map(v => v.english)).toEqual(['giving a talk', 'take a break', 'short and clear']);
    // The Japanese binder title cannot be written in the hand face, so the header falls back to the level.
    expect(lesson.content.classification).toEqual({ id: binder.id, label: 'Level B1' });
    expect(lesson.content.date).toMatch(/OCT 2026$/);
    expect(() => createA5Layout(lesson.content, paper, defaultFonts)).not.toThrow();
  });
  it('uses an English binder title as the classification and shortens an overlong title by whole words', () => {
    const english = { ...binder, title: 'Work presentations' };
    const long = { ...page, title: 'A very long title about presenting our quarterly results to the whole regional team in person' };
    const lesson = studyContentFromPage(long, english, paper, defaultFonts);
    if (lesson.kind !== 'ready') throw new Error('expected a lesson');
    expect(lesson.content.classification?.label).toBe('Work presentations');
    expect(long.title.startsWith(lesson.content.title)).toBe(true);
    expect(lesson.content.title.length).toBeLessThan(long.title.length);
    expect(lesson.content.title.endsWith(' ')).toBe(false);
  });
  it('lays out twelve long sentences across more than one page without losing any', () => {
    const sentences = Array.from({ length: 12 }, (_, i) => ({ en: `Sentence number ${i + 1} is deliberately written to be long enough to wrap onto a second ruled line of the notebook.`, native: `文${i + 1}` }));
    const lesson = studyContentFromPage({ ...page, sentences, review_items: [] }, binder, paper, defaultFonts);
    if (lesson.kind !== 'ready') throw new Error('expected a lesson');
    const layout = createA5Layout(lesson.content, paper, defaultFonts);
    expect(layout.pages.length).toBeGreaterThan(1);
    expect(new Set(layout.pages.flatMap(p => p.runs).filter(r => r.layer === 'body').map(r => r.sourceId)).size).toBe(12);
  });
  it('drops review notes the Japanese face cannot write, and refuses sentences the hand face cannot', () => {
    const emoji = { ...page, review_items: [{ expression: 'giving a talk', native: '発表する 🙂', sentence_index: 0 }] };
    const trimmed = studyContentFromPage(emoji, binder, paper, defaultFonts);
    expect(trimmed).toMatchObject({ kind: 'ready', trimmed: true });
    if (trimmed.kind === 'ready') expect(trimmed.content.vocabulary).toEqual([]);
    const japanese = { ...page, sentences: [{ en: '今日は電車が遅れた。', native: 'x' }, ...page.sentences.slice(1)] };
    expect(studyContentFromPage(japanese, binder, paper, defaultFonts)).toEqual({ kind: 'unavailable', reason: 'unsupported-text' });
  });
});

describe('which page the desk opens', () => {
  it('reads a page ID or the sample marker from the URL and ignores anything else', () => {
    expect(requestedPageId(`?page=${page.id}`)).toBe(page.id);
    expect(requestedPageId('?page=sample')).toBe('sample');
    expect(requestedPageId('?page=../x')).toBeNull();
    expect(requestedPageId('')).toBeNull();
  });
  it('remembers the last opened page and clears it when the sample is requested', () => {
    const store = storage();
    rememberSelection(store, page.id);
    expect(readSelection(store)).toBe(page.id);
    rememberSelection(store, null);
    expect(readSelection(store)).toBeNull();
    expect(readSelection(storage({ [DESK_SELECTION_KEY]: '{broken' }))).toBeNull();
  });
  it('opens the named page with its own progress key and falls back to the sample when it is missing or unreadable', () => {
    const store = storage({ [LIBRARY_KEY]: library() });
    const opened = resolveDeskLesson(store, `?page=${page.id}`, paper, defaultFonts);
    expect(opened.page?.id).toBe(page.id);
    expect(opened.binder?.title).toBe(binder.title);
    expect(opened.copyKey).toBe(copyKey(page.id));
    expect(opened.lesson.sentences).toHaveLength(4);
    expect(readSelection(store)).toBe(page.id);
    // The remembered page reopens without a query string.
    expect(resolveDeskLesson(store, '', paper, defaultFonts).page?.id).toBe(page.id);
    const missing = resolveDeskLesson(storage({ [LIBRARY_KEY]: library([]) }), `?page=${page.id}`, paper, defaultFonts);
    expect(missing.lesson).toBe(studySample);
    expect(missing.copyKey).toBe(practiceKey);
    expect(missing.notice).toContain('見つからなかった');
    const unreadable = resolveDeskLesson(storage({ [LIBRARY_KEY]: '{broken' }), `?page=${page.id}`, paper, defaultFonts);
    expect(unreadable.lesson).toBe(studySample);
    expect(unreadable.notice).toContain('読み込めない');
    expect(resolveDeskLesson(store, '?page=sample', paper, defaultFonts).lesson).toBe(studySample);
    expect(readSelection(store)).toBeNull();
  });
});

describe('lines the learner drew', () => {
  const base = studyContentFromPage(page, binder, paper, defaultFonts);
  const lesson = base.kind === 'ready' ? base.content : studySample;
  const line = { id: 'lookup-sentence-01-15-28', sentenceId: 'sentence-01', start: 15, end: 28, expression: 'giving a talk', native: '発表する', note: null, lookedUpAt: '2026-10-30T01:00:00.000Z' };
  it('becomes a gloss under its sentence and a word in the list, and still lays out', () => {
    const merged = lessonWithLookups(lesson, [line], defaultFonts);
    expect(merged.sentences[0].glosses).toEqual([{ id: line.id, start: 15, end: 28, quote: 'giving a talk', meaning: '発表する' }]);
    expect(merged.vocabulary.map(v => v.english)).toEqual(['giving a talk', 'take a break', 'short and clear']); // already a Muse candidate: not duplicated
    const fresh = lessonWithLookups(lesson, [{ ...line, id: 'lookup-sentence-03-3-9', sentenceId: 'sentence-03', start: 3, end: 9, expression: 'slides', native: 'スライド' }], defaultFonts);
    expect(fresh.vocabulary.at(-1)).toMatchObject({ id: 'lookup-sentence-03-3-9-word', english: 'slides', meaning: 'スライド' });
    const layout = createA5Layout(fresh, paper, defaultFonts);
    expect(layout.pages.flatMap(p => p.markers).some(m => m.id.startsWith('lookup-sentence-03-3-9:'))).toBe(true);
    expect(layout.pages.flatMap(p => p.runs).some(r => r.sourceId === 'lookup-sentence-03-3-9' && r.text === 'スライド')).toBe(true);
    expect(lessonWithLookups(lesson, [], defaultFonts)).toBe(lesson);
  });
  it('skips a stale span, an unknown sentence and a meaning the Japanese face cannot write', () => {
    expect(writableMeaning('発表する 🙂', 'klee')).toBe('発表する');
    expect(writableMeaning('🙂', 'klee')).toBe('');
    const merged = lessonWithLookups(lesson, [
      { ...line, expression: 'giving a TALK' }, { ...line, id: 'x', sentenceId: 'sentence-99' }, { ...line, id: 'y', native: '🙂' },
      { ...line, id: 'z', sentenceId: 'sentence-02', start: 0, end: 1, expression: 'I', native: '私 🙂' },
    ], defaultFonts);
    expect(merged.sentences[0].glosses).toBeUndefined();
    expect(merged.sentences[1].glosses).toEqual([{ id: 'z', start: 0, end: 1, quote: 'I', meaning: '私' }]);
    expect(merged.vocabulary.map(v => v.english)).toEqual(['giving a talk', 'take a break', 'short and clear', 'I']);
  });
});
