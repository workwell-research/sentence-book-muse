import { describe, expect, it } from 'vitest';
import { PENDING_DRAFTS_KEY, draftTicket, readPendingDrafts, requestFingerprint, requestLesson, savePendingDraft } from '../src/lib/generation';
import { createGenerationRequest } from '../shared/generation-request';
import type { LessonDraft } from '../shared/lesson-schema';

const draftId = '7f3e4b7e-5c1a-4d2b-9e8f-1a2b3c4d5e6f';
const request = createGenerationRequest(draftId, { topic: 'Late train', level: 'A2', nativeLanguage: 'ja' }, ['旅']);
function page(overrides: Partial<LessonDraft> = {}): LessonDraft {
  return {
    draft_id: draftId, title: 'My train was late', level: 'A2', native_language: 'ja',
    sentences: Array.from({ length: 4 }, (_, i) => ({ en: `Sentence ${i + 1}.`, native: `文${i + 1}。` })),
    questions: [{ en: 'Why?', native: 'なぜ？', sample_answer: { en: 'Because.', native: 'だから。' } }],
    review_items: [], estimated_minutes: 6, based_on_learning_state_version: null,
    filing: { kind: 'new', newBinder: { title: '通勤', description: '通勤の話' }, reason: '通勤。', sceneTags: ['通勤'] },
    ...overrides,
  };
}
function server(status: number, body: unknown) {
  return (async () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })) as typeof fetch;
}
function memory(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}

describe('requesting a lesson from the browser', () => {
  it('explains the app\'s own usage caps by scope', async () => {
    const day = await requestLesson(server(429, { error: { code: 'rate_limited', message: 'x', reason: 'day' } }), request);
    expect(day).toMatchObject({ kind: 'failed', code: 'rate_limited', retryable: true, message: expect.stringContaining('明日') });
    const minute = await requestLesson(server(429, { error: { code: 'rate_limited', message: 'x', reason: 'minute' } }), request);
    expect(minute.kind === 'failed' && minute.message).toContain('1分');
  });
  it('accepts a page only after validating it against the original request', async () => {
    const ok = await requestLesson(server(200, { contract: 'sentence_book_page_v1', draft: page(), model: 'muse-spark-1.3', usage: null }), request);
    expect(ok).toEqual({ kind: 'ready', draft: page(), model: 'muse-spark-1.3' });
    const swapped = await requestLesson(server(200, { draft: page({ level: 'B2' }), model: 'muse-spark-1.3' }), request);
    expect(swapped).toMatchObject({ kind: 'failed', code: 'invalid_output', retryable: true });
  });
  it('maps server error codes to learner-facing text and retry advice', async () => {
    const unavailable = await requestLesson(server(503, { error: { code: 'generation_unavailable', message: 'x' } }), request);
    expect(unavailable).toMatchObject({ kind: 'failed', code: 'generation_unavailable', retryable: false });
    const busy = await requestLesson(server(429, { error: { code: 'upstream_rate_limited', message: 'x' } }), request);
    expect(busy).toMatchObject({ kind: 'failed', code: 'upstream_rate_limited', retryable: true });
    const unknown = await requestLesson(server(500, { error: { code: 'something_new' } }), request);
    expect(unknown).toMatchObject({ kind: 'failed', code: 'unexpected' });
    const offline = await requestLesson((async () => { throw new TypeError('offline'); }) as typeof fetch, request);
    expect(offline).toMatchObject({ kind: 'failed', code: 'network', retryable: true });
  });
});

describe('draft identity across retries', () => {
  it('keeps the same draft ID for identical content and issues a new one after edits', () => {
    let counter = 0;
    const issue = () => `id-${++counter}`;
    const first = draftTicket(null, requestFingerprint({ topic: 'A ', level: 'A2', nativeLanguage: 'ja', interests: ['旅'], binderIds: [] }), issue);
    const retry = draftTicket(first, requestFingerprint({ topic: 'A', level: 'A2', nativeLanguage: 'ja', interests: ['旅'], binderIds: [] }), issue);
    expect(retry).toBe(first);
    const edited = draftTicket(retry, requestFingerprint({ topic: 'B', level: 'A2', nativeLanguage: 'ja', interests: ['旅'], binderIds: [] }), issue);
    expect(edited.id).toBe('id-2');
  });
});

describe('pending drafts in this browser', () => {
  it('stores validated drafts newest first without duplicating the same draft ID', () => {
    const storage = memory({ other: 'keep' });
    savePendingDraft(storage, page());
    savePendingDraft(storage, page({ title: 'Retitled' }));
    const second = page({ draft_id: '4fc15635-0393-4faa-ab2a-6ebd95dc8c42' });
    const drafts = savePendingDraft(storage, second);
    expect(drafts.map(draft => draft.title)).toEqual([second.title, 'Retitled']);
    expect(readPendingDrafts(storage)).toEqual({ kind: 'ready', drafts });
    expect(storage.values.get('other')).toBe('keep');
  });
  it('refuses to overwrite unreadable or future-version data', () => {
    const storage = memory({ [PENDING_DRAFTS_KEY]: JSON.stringify({ schemaVersion: 2, drafts: [] }) });
    expect(readPendingDrafts(storage)).toEqual({ kind: 'unreadable' });
    expect(() => savePendingDraft(storage, page())).toThrow('unreadable-storage');
    expect(storage.values.get(PENDING_DRAFTS_KEY)).toContain('"schemaVersion":2');
  });
  it('propagates storage failure so the UI cannot claim the page was kept', () => {
    const storage = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
    expect(() => savePendingDraft(storage, page())).toThrow('quota');
  });
});

describe('removing a pending draft', () => {
  it('removes only the filed or discarded draft and leaves unreadable data alone', async () => {
    const { removePendingDraft } = await import('../src/lib/generation');
    const storage = memory();
    savePendingDraft(storage, page());
    const other = page({ draft_id: '4fc15635-0393-4faa-ab2a-6ebd95dc8c42' });
    savePendingDraft(storage, other);
    expect(removePendingDraft(storage, draftId).map(draft => draft.draft_id)).toEqual([other.draft_id]);
    expect(removePendingDraft(storage, 'missing').map(draft => draft.draft_id)).toEqual([other.draft_id]);
    const locked = memory({ [PENDING_DRAFTS_KEY]: '{broken' });
    expect(() => removePendingDraft(locked, draftId)).toThrow('unreadable-storage');
    expect(locked.values.get(PENDING_DRAFTS_KEY)).toBe('{broken');
  });
});
