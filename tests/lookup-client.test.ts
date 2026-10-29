import { describe, expect, it } from 'vitest';
import { emptyCopy, practiceSchema } from '../src/desk/core';
import { studySample } from '../src/handwriting/study-content';
import { MAX_LOOKUPS, WORDBOOK_KEY, addLookup, expressionOf, readWordbook, requestLookup, saveWordbookEntry, tokenize } from '../src/lib/lookup';

const request = { expression: 'giving a talk', sentence: "Next week, I'm giving a talk in Abu Dhabi.", level: 'B1' as const, native_language: 'ja' as const };
const server = (status: number, body: unknown) => (async () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })) as typeof fetch;
function memory(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}
const entry = { sentenceId: 'example-story-02', start: 2, end: 15, expression: 'made time for', native: '時間をつくった', note: null, lookedUpAt: '2026-10-30T01:00:00.000Z' };

describe('picking words in the model sentence', () => {
  it('splits a sentence into tappable words and kept separators with code-point offsets', () => {
    const tokens = tokenize("Next week, I'm going - year-end plans.");
    expect(tokens.filter(t => t.word).map(t => t.text)).toEqual(['Next', 'week', "I'm", 'going', 'year-end', 'plans']);
    expect(tokens.map(t => t.text).join('')).toBe("Next week, I'm going - year-end plans.");
    const dash = tokens.find(t => t.text === '-');
    expect(dash?.word).toBe(false);
    const going = tokens.find(t => t.text === 'going')!;
    expect(expressionOf("Next week, I'm going - year-end plans.", tokens[0].start, going.end)).toBe("Next week, I'm going");
  });
  it('adds a line to the Copy record, replaces the same span and stops at the limit', () => {
    const one = addLookup(emptyCopy(studySample), entry);
    expect(one.lookups).toEqual([{ ...entry, id: 'lookup-example-story-02-2-15' }]);
    const again = addLookup(one, { ...entry, native: '〜の時間を作った' });
    expect(again.lookups).toHaveLength(1);
    expect(again.lookups[0].native).toBe('〜の時間を作った');
    let full = emptyCopy(studySample);
    for (let i = 0; i < MAX_LOOKUPS; i++) full = addLookup(full, { ...entry, start: i, end: i + 1 });
    expect(() => addLookup(full, { ...entry, start: 50, end: 51 })).toThrow('40');
    expect(practiceSchema.parse(JSON.parse(JSON.stringify(again))).lookups).toEqual(again.lookups);
  });
});

describe('requesting a meaning from the browser', () => {
  it('accepts a meaning only for the picked expression and reports failures with their reason', async () => {
    const ok = await requestLookup(server(200, { contract: 'sentence_book_lookup_v1', result: { expression: 'giving a talk', native: '発表する', note: null }, model: 'muse-spark-1.3' }), request);
    expect(ok).toEqual({ kind: 'ready', result: { expression: 'giving a talk', native: '発表する', note: null }, model: 'muse-spark-1.3' });
    const swapped = await requestLookup(server(200, { result: { expression: 'talk', native: '話' } }), request);
    expect(swapped).toMatchObject({ kind: 'failed', code: 'invalid_output' });
    const limited = await requestLookup(server(429, { error: { code: 'upstream_rate_limited', message: 'x' } }), request);
    expect(limited).toMatchObject({ kind: 'failed', code: 'upstream_rate_limited', retryable: true });
    const invalid = await requestLookup(server(502, { error: { code: 'invalid_output', message: 'x', reason: 'request_mismatch' } }), request);
    expect(invalid.kind === 'failed' && invalid.message).toContain('request_mismatch');
    const offline = await requestLookup((async () => { throw new TypeError('fetch failed'); }) as typeof fetch, request);
    expect(offline).toMatchObject({ kind: 'failed', code: 'network' });
  });
});

describe('the shared word list', () => {
  it('keeps every drawn line newest first, de-duplicated per page, and protects unreadable data', () => {
    const store = memory();
    const word = { ...entry, pageId: null, pageTitle: studySample.title, sentence: studySample.sentences[1].text };
    saveWordbookEntry(store, word);
    const entries = saveWordbookEntry(store, { ...word, pageId: 'page-1', pageTitle: 'Kyoto', expression: 'Made Time For', lookedUpAt: '2026-10-30T02:00:00.000Z' });
    expect(entries.map(e => e.pageId)).toEqual(['page-1', null]);
    const replaced = saveWordbookEntry(store, { ...word, native: '新しい意味', lookedUpAt: '2026-10-30T03:00:00.000Z' });
    expect(replaced).toHaveLength(2);
    expect(replaced[0]).toMatchObject({ pageId: null, native: '新しい意味' });
    expect(readWordbook(store)).toEqual({ kind: 'ready', entries: replaced });
    expect(readWordbook(memory())).toEqual({ kind: 'ready', entries: [] });
    const broken = memory({ [WORDBOOK_KEY]: '{nope' });
    expect(readWordbook(broken)).toEqual({ kind: 'unreadable' });
    expect(() => saveWordbookEntry(broken, word)).toThrow();
    expect(broken.values.get(WORDBOOK_KEY)).toBe('{nope');
  });
});
