import { describe, expect, it } from 'vitest';
import { COMPOSER_KEY, readNote, saveNote } from '../src/lib/composer';

function memory(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}
const note = { topic: 'A presentation', level: 'B1' as const, nativeLanguage: 'ja' };

describe('local topic note', () => {
  it('restores the learner input without touching other storage', () => {
    const storage = memory({ existing: 'keep-me' });
    saveNote(storage, note);
    expect(readNote(storage)).toEqual({ kind: 'ready', note });
    expect(storage.values.get('existing')).toBe('keep-me');
  });
  it('preserves unreadable saved data rather than overwriting it', () => {
    const storage = memory({ [COMPOSER_KEY]: '{unfinished' });
    expect(() => saveNote(storage, note)).toThrow('unreadable-storage');
    expect(storage.values.get(COMPOSER_KEY)).toBe('{unfinished');
  });
  it('preserves data from a future schema version', () => {
    const saved = JSON.stringify({ ...note, schemaVersion: 2 });
    const storage = memory({ [COMPOSER_KEY]: saved });
    expect(() => saveNote(storage, note)).toThrow();
    expect(storage.values.get(COMPOSER_KEY)).toBe(saved);
  });
  it('propagates unavailable storage so the UI cannot claim a successful save', () => {
    const storage = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
    expect(() => saveNote(storage, note)).toThrow('quota');
  });
});
