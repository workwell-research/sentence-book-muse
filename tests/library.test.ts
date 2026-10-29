import { describe, expect, it } from 'vitest';
import { EMPTY_LIBRARY, FilingFailure, LIBRARY_KEY, binderCatalogue, binderSummaries, fileDraft, readLibrary } from '../src/lib/library';
import type { LessonDraft } from '../shared/lesson-schema';

function memory(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}
function draft(overrides: Partial<LessonDraft> = {}): LessonDraft {
  return {
    draft_id: '7f3e4b7e-5c1a-4d2b-9e8f-1a2b3c4d5e6f', title: 'My train was late', level: 'A2', native_language: 'ja',
    sentences: Array.from({ length: 4 }, (_, i) => ({ en: `Sentence ${i + 1}.`, native: `文${i + 1}。` })),
    questions: [{ en: 'Why?', native: 'なぜ？', sample_answer: { en: 'Because.', native: 'だから。' } }],
    review_items: [{ expression: 'was late', native: '遅れた', sentence_index: 0 }], estimated_minutes: 6,
    based_on_learning_state_version: null,
    filing: { kind: 'new', newBinder: { title: '通勤', description: '通勤の話' }, reason: '通勤。', sceneTags: ['通勤', '朝'] },
    ...overrides,
  };
}
let counter = 0;
const deps = { now: () => new Date('2026-10-29T13:00:00.000Z'), uuid: () => `00000000-0000-4000-8000-${String(++counter).padStart(12, '0')}` };

describe('filing a reviewed page', () => {
  it('creates a binder only through the explicit new decision and copies the page content', () => {
    const storage = memory({ other: 'keep' });
    const result = fileDraft(storage, draft(), 'muse-spark-1.3', { kind: 'new', title: ' 通勤の英語 ', description: '朝の出来事' }, deps);
    expect(result.createdBinder).toBe(true);
    expect(result.binder).toMatchObject({ title: '通勤の英語', description: '朝の出来事', origin: 'approved-new', createdAt: '2026-10-29T13:00:00.000Z' });
    expect(result.page).toMatchObject({ binderId: result.binder.id, sourceDraftId: draft().draft_id, title: 'My train was late',
      level: 'A2', native_language: 'ja', sceneTags: ['通勤', '朝'], model: 'muse-spark-1.3', estimated_minutes: 6 });
    expect('filing' in result.page).toBe(false);
    expect('draft_id' in result.page).toBe(false);
    expect(readLibrary(storage)).toEqual({ kind: 'ready', library: result.library });
    expect(storage.values.get('other')).toBe('keep');
  });
  it('files into an existing binder and refuses unknown binders', () => {
    const storage = memory();
    const first = fileDraft(storage, draft(), 'm', { kind: 'new', title: '通勤', description: '通勤の話' }, deps);
    const second = fileDraft(storage, draft({ draft_id: '4fc15635-0393-4faa-ab2a-6ebd95dc8c42' }), 'm', { kind: 'existing', binderId: first.binder.id }, deps);
    expect(second.createdBinder).toBe(false);
    expect(second.library.binders).toHaveLength(1);
    expect(second.library.pages).toHaveLength(2);
    expect(() => fileDraft(storage, draft({ draft_id: 'a785f741-e09f-4657-885a-2c2bed838c2e' }), 'm',
      { kind: 'existing', binderId: '11111111-1111-4111-8111-111111111111' }, deps)).toThrow(new FilingFailure('unknown-binder'));
  });
  it('refuses to file the same draft twice', () => {
    const storage = memory();
    const first = fileDraft(storage, draft(), 'm', { kind: 'new', title: '通勤', description: '通勤の話' }, deps);
    expect(() => fileDraft(storage, draft(), 'm', { kind: 'existing', binderId: first.binder.id }, deps)).toThrow(new FilingFailure('duplicate-draft'));
    expect(() => fileDraft(storage, draft(), 'm', { kind: 'new', title: '別の本', description: 'x' }, deps)).toThrow(new FilingFailure('duplicate-draft'));
    expect(readLibrary(storage)).toEqual({ kind: 'ready', library: first.library });
  });
  it('rejects blank binder names and never writes unreadable or future-version data', () => {
    const storage = memory();
    expect(() => fileDraft(storage, draft(), 'm', { kind: 'new', title: '  ', description: 'x' }, deps)).toThrow(new FilingFailure('invalid-binder'));
    expect(storage.values.has(LIBRARY_KEY)).toBe(false);
    const future = JSON.stringify({ ...EMPTY_LIBRARY, schemaVersion: 2 });
    const locked = memory({ [LIBRARY_KEY]: future });
    expect(readLibrary(locked)).toEqual({ kind: 'unreadable' });
    expect(() => fileDraft(locked, draft(), 'm', { kind: 'new', title: '通勤', description: 'x' }, deps)).toThrow(new FilingFailure('unreadable-storage'));
    expect(locked.values.get(LIBRARY_KEY)).toBe(future);
  });
  it('propagates storage failure so the UI cannot claim the page was filed', () => {
    const storage = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
    expect(() => fileDraft(storage, draft(), 'm', { kind: 'new', title: '通勤', description: 'x' }, deps)).toThrow('quota');
  });
});

describe('shelf summaries and model catalogue', () => {
  it('orders binders by most recent page and lists only id/title/description for the model', () => {
    const storage = memory();
    let tick = 0;
    const clock = { ...deps, now: () => new Date(Date.UTC(2026, 9, 29, 13, tick++)) };
    const a = fileDraft(storage, draft(), 'm', { kind: 'new', title: 'A', description: 'a' }, clock);
    const b = fileDraft(storage, draft({ draft_id: '4fc15635-0393-4faa-ab2a-6ebd95dc8c42' }), 'm', { kind: 'new', title: 'B', description: 'b' }, clock);
    const latest = fileDraft(storage, draft({ draft_id: 'a785f741-e09f-4657-885a-2c2bed838c2e' }), 'm', { kind: 'existing', binderId: a.binder.id }, clock);
    const summaries = binderSummaries(latest.library);
    expect(summaries.map(item => [item.binder.title, item.pages.length])).toEqual([['A', 2], ['B', 1]]);
    expect(summaries[0].pages[0].id).toBe(latest.page.id);
    expect(binderCatalogue(latest.library)).toEqual([
      { id: a.binder.id, title: 'A', description: 'a' }, { id: b.binder.id, title: 'B', description: 'b' },
    ]);
  });
});
