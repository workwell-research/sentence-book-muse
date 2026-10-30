import { describe, expect, it } from 'vitest';
import { buildMuseMessages } from '../functions/lib/muse-prompt';
import { createGenerationRequest } from '../shared/generation-request';
import type { LessonDraft } from '../shared/lesson-schema';
import { IMPORT_TICKET_KEY, buildMusePrompt, clearImportTicket, extractJson, importLesson, issueImportTicket, musePromptFor, readImportTicket } from '../src/lib/import';

const draftId = '7f3e4b7e-5c1a-4d2b-9e8f-1a2b3c4d5e6f';
const binderId = 'a785f741-e09f-4657-885a-2c2bed838c2e';
function memory(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
}
function page(overrides: Partial<LessonDraft> = {}): LessonDraft {
  return {
    draft_id: draftId, title: 'Morning coffee', level: 'B1', native_language: 'ja',
    sentences: Array.from({ length: 4 }, (_, i) => ({ en: `Sentence ${i + 1}.`, native: `文${i + 1}。` })),
    questions: [{ en: 'Why?', native: 'なぜ？', sample_answer: { en: 'Because.', native: 'だから。' } }],
    review_items: [{ expression: 'Sentence', native: '文', sentence_index: 0 }], estimated_minutes: 6, based_on_learning_state_version: null,
    filing: { kind: 'existing', binderId, reason: '朝の話。', sceneTags: ['朝'] }, ...overrides,
  };
}
const input = { level: 'B1', nativeLanguage: 'ja', binderIds: [binderId] };
const deps = { uuid: () => draftId, now: () => new Date('2026-10-30T03:00:00.000Z') };

describe('the import ticket', () => {
  it('keeps one draft ID per request and issues a new one when the request changes or after clearing', () => {
    const store = memory();
    const ticket = issueImportTicket(store, input, deps);
    expect(ticket).toMatchObject({ draftId, level: 'B1', nativeLanguage: 'ja', binderIds: [binderId] });
    expect(readImportTicket(store)).toEqual(ticket);
    expect(issueImportTicket(store, input, { uuid: () => 'ffffffff-ffff-4fff-8fff-ffffffffffff' })).toEqual(ticket);
    const changed = issueImportTicket(store, { ...input, level: 'A2' }, { uuid: () => 'ffffffff-ffff-4fff-8fff-ffffffffffff' });
    expect(changed.draftId).toBe('ffffffff-ffff-4fff-8fff-ffffffffffff');
    clearImportTicket(store);
    expect(readImportTicket(store)).toBeNull();
    expect(readImportTicket(memory({ [IMPORT_TICKET_KEY]: '{broken' }))).toBeNull();
  });
});

describe('the guide pasted into the learner\'s own Muse', () => {
  it('carries the same instructions as the server prompt, the schema and the request', () => {
    const request = createGenerationRequest(draftId, { topic: '朝のコーヒー', level: 'B1', nativeLanguage: 'ja' }, ['旅'], [{ id: binderId, title: '朝', description: '朝の出来事' }]);
    const prompt = buildMusePrompt(request);
    const server = buildMuseMessages(request);
    for (const line of server[0].content.split('\n')) expect(prompt).toContain(line);
    expect(prompt).toContain('"sentence_book_page_v1"'.replace(/"/g, '') );
    expect(prompt).toContain(draftId);
    expect(prompt).toContain('"binders"');
    expect(prompt).toContain('"additionalProperties"');
    const ticket = issueImportTicket(memory(), input, deps);
    expect(musePromptFor(ticket, { topic: '' }, ['旅'], [{ id: binderId, title: '朝', description: '朝の出来事' }])).toContain(draftId);
    expect(musePromptFor(ticket, { topic: '' }, [], [])).toBeNull(); // nothing to ask about
  });
});

describe('pasting the page back', () => {
  const ticket = issueImportTicket(memory(), input, deps);
  it('reads bare JSON, fenced JSON and JSON inside prose', () => {
    const json = JSON.stringify(page());
    expect(extractJson(json)).toEqual(page());
    expect(extractJson('```json\n' + json + '\n```')).toEqual(page());
    expect(extractJson('Here is your page:\n' + json + '\nEnjoy!')).toEqual(page());
    expect(extractJson('no json here')).toBeUndefined();
  });
  it('accepts a page that matches the ticket and names the mismatch otherwise', () => {
    expect(importLesson(JSON.stringify(page()), ticket)).toEqual({ kind: 'ready', draft: page() });
    expect(importLesson(JSON.stringify(page({ level: 'A2' })), ticket)).toMatchObject({ kind: 'failed', message: expect.stringContaining('draft_id') });
    expect(importLesson(JSON.stringify(page({ draft_id: 'ffffffff-ffff-4fff-8fff-ffffffffffff' })), ticket).kind).toBe('failed');
    expect(importLesson(JSON.stringify(page({ filing: { kind: 'existing', binderId: 'ffffffff-ffff-4fff-8fff-ffffffffffff', reason: 'x', sceneTags: ['x'] } })), ticket))
      .toMatchObject({ kind: 'failed', message: expect.stringContaining('一覧にない本') });
    expect(importLesson(JSON.stringify({ ...page(), extra: 1 }), ticket)).toMatchObject({ kind: 'failed', message: expect.stringContaining('形') });
    expect(importLesson('', ticket)).toMatchObject({ kind: 'failed' });
    expect(importLesson(JSON.stringify(page()), null)).toMatchObject({ kind: 'failed' });
  });
});
