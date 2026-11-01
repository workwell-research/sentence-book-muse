import { describe, expect, it } from 'vitest';
import { COMPOSER_KEY, EMPTY_NOTE, readNote, saveNote, saveTopic, scheduleRequest, scheduleText } from '../src/lib/composer';

function memory(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}
const note = { topic: 'A presentation', level: 'B1' as const, nativeLanguage: 'ja', source: 'conversation_and_social' as const, days: ['mon' as const, 'wed' as const], time: '06:30' };

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
  it('reads notes saved before the lesson settings existed with the defaults', () => {
    const storage = memory({ [COMPOSER_KEY]: JSON.stringify({ schemaVersion: 1, topic: '', level: 'A2', nativeLanguage: 'ja' }) });
    expect(readNote(storage)).toEqual({ kind: 'ready', note: { ...EMPTY_NOTE } });
  });
  it('treats an impossible schedule or material choice as unreadable', () => {
    for (const bad of [{ days: [], time: '07:00' }, { days: ['mon'], time: '25:00' }, { days: ['mon', 'mon'], time: '07:00' }, { source: 'everything' }])
      expect(readNote(memory({ [COMPOSER_KEY]: JSON.stringify({ schemaVersion: 1, ...note, ...bad }) })).kind).toBe('unreadable');
  });
  it('describes the schedule for Muse in plain words', () => {
    expect(scheduleText(EMPTY_NOTE)).toBe('毎日の7:00');
    expect(scheduleText({ days: ['wed', 'mon'], time: '06:30' })).toBe('毎週月・水曜日の6:30');
    expect(scheduleRequest(note)).toContain('毎週月・水曜日の6:30');
  });
  it('keeps a fallback topic without saving unsaved settings, and never overwrites unreadable data', () => {
    const storage = memory();
    saveNote(storage, note);
    saveTopic(storage, 'A late train');
    expect(readNote(storage)).toEqual({ kind: 'ready', note: { ...note, topic: 'A late train' } });
    const fresh = memory();
    saveTopic(fresh, 'Coffee');
    expect(readNote(fresh)).toEqual({ kind: 'ready', note: { ...EMPTY_NOTE, topic: 'Coffee' } });
    const broken = memory({ [COMPOSER_KEY]: '{bad' });
    expect(() => saveTopic(broken, 'x')).toThrow('unreadable-storage');
    expect(broken.values.get(COMPOSER_KEY)).toBe('{bad');
  });
});
