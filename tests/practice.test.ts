import { describe, expect, it } from 'vitest';
import { studySample } from '../src/handwriting/study-content';
import { advance, differsFromModel, emptyPractice, itemCount, missedWords, practiceKey, readPractice, restartPass, reviewRequest, savePractice, setReview, speakingPhaseOf, talkRequest } from '../src/desk/practice';
import type { PracticeRecord } from '../src/desk/practice';

const storage = () => { const map = new Map<string, string>(); return { map, getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { map.set(k, v); } }; };
const at = (record: PracticeRecord, step: number): PracticeRecord => ({ ...record, step });

describe('four passes after Copy', () => {
  it('marks only the model words a dictation left out, ignoring case and punctuation', () => {
    expect(missedWords('Today, I decided to slow down.', 'today i decided slow down')).toEqual([false, false, false, true, false, false]);
    expect(missedWords('A warm cup of tea.', 'A warm cup of tea')).toEqual([false, false, false, false, false]);
    expect(missedWords('I can’t stop.', "I can't stop")).toEqual([false, false, false]);
  });
  it('shows the model under a dictation line only when the line differs', () => {
    expect(differsFromModel('A warm cup of tea.', 'a warm cup of tea')).toBe(false);
    expect(differsFromModel('I put on my shoes.', 'I put on my shose')).toBe(true);
    expect(differsFromModel('I put on my shoes.', 'I put on my my shoes')).toBe(true);
    expect(differsFromModel('I put on my shoes.', 'I put on shoes')).toBe(true);
  });
  it('checks a written line before moving on, and finishes on the last sentence', () => {
    let record = at(emptyPractice(studySample), 2);
    expect(advance(record, studySample, '   ').moved).toBe('none');
    let step = advance(record, studySample, 'Today I decided slow down.');
    expect(step.moved).toBe('checked'); record = step.record;
    expect(record.written.dictation[0]).toBe('Today I decided slow down.');
    expect(record.phase.dictation).toBe('check');
    step = advance(record, studySample, ''); expect(step.moved).toBe('next'); record = step.record;
    expect(record.pos.dictation).toBe(1); expect(record.phase.dictation).toBe('write');
    for (let i = 1; i < studySample.sentences.length; i++) {
      record = advance(record, studySample, 'line ' + i).record;
      step = advance(record, studySample, ''); record = step.record;
    }
    expect(step.moved).toBe('finished');
    expect(record.finished.dictation).toBeTruthy();
    expect(advance(record, studySample, 'more').moved).toBe('none');
  });
  it('speaking: Enter after answering plays the sample, the next Enter moves on; two Enters per question', () => {
    let record = at(emptyPractice(studySample), 4);
    expect(itemCount('speaking', studySample)).toBe(studySample.questions!.length);
    for (let i = 0; i < studySample.questions!.length; i++) {
      expect(speakingPhaseOf(record)).toBe('answer');
      const heard = advance(record, studySample, '');
      expect(heard.moved).toBe('checked');
      expect(speakingPhaseOf(heard.record)).toBe('sample');
      expect(heard.record.done.speaking).toContain(i);
      record = advance(heard.record, studySample, '').record;
    }
    expect(record.done.speaking).toEqual([0, 1, 2]);
    expect(record.finished.speaking).toBeTruthy();
    expect(itemCount('speaking', { ...studySample, questions: undefined })).toBe(0);
    expect(advance(at(emptyPractice({ ...studySample, questions: [] }), 4), { ...studySample, questions: [] }, '').moved).toBe('none');
  });
  it('keeps the model’s review of a reconstructed line in the record and drops it on restart', () => {
    let record = at(emptyPractice(studySample), 3);
    record = advance(record, studySample, 'I decided to go slow today.').record;
    expect(record.reviews.reconstruction ?? []).toEqual([]);
    record = setReview(record, 0, { verdict: 'fine', natural: 'Today I decided to slow down.', note: '「go slow」より「slow down」が自然です。' });
    expect(record.reviews.reconstruction).toEqual([{ verdict: 'fine', natural: 'Today I decided to slow down.', note: '「go slow」より「slow down」が自然です。' }]);
    record = setReview(record, 2, { verdict: 'unclear', natural: 'Instead of checking my phone, I opened my notebook.', note: null });
    expect(record.reviews.reconstruction).toHaveLength(3);
    expect(record.reviews.reconstruction![1]).toBeNull();
    const store = storage();
    savePractice(store, record);
    expect(readPractice(store, studySample).record.reviews.reconstruction).toHaveLength(3);
    expect(restartPass(record, 'reconstruction').reviews.reconstruction).toEqual([]);
    expect(restartPass(record, 'speaking').reviews.reconstruction).toHaveLength(3);
  });
  it('restarts one pass without touching the others', () => {
    let record = at(emptyPractice(studySample), 3);
    record = advance(record, studySample, 'My own sentence.').record;
    record = { ...record, finished: { ...record.finished, shadowing: '2026-10-31T00:00:00.000Z' } };
    const again = restartPass(record, 'reconstruction');
    expect(again.written.reconstruction).toEqual([]);
    expect(again.finished.shadowing).toBe('2026-10-31T00:00:00.000Z');
  });
  it('keeps each lesson’s record apart, starts over for changed sentences, and never overwrites unreadable data', () => {
    const s = storage();
    const record = advance(at(emptyPractice(studySample), 1), studySample, '').record;
    savePractice(s, record);
    expect(s.map.has(practiceKey(studySample.id))).toBe(true);
    expect(readPractice(s, studySample)).toEqual({ record, blocked: false });
    const edited = { ...studySample, sentences: studySample.sentences.map((x, i) => i ? x : { ...x, text: 'A different first sentence.' }) };
    expect(readPractice(s, edited).record.pos).toEqual({});
    s.map.set(practiceKey(studySample.id), '{broken');
    expect(readPractice(s, studySample).blocked).toBe(true);
    expect(s.map.get(practiceKey(studySample.id))).toBe('{broken');
  });
});

describe('handing a pass to Muse', () => {
  it('asks Muse to review only the lines the learner wrote, with the Japanese and the model', () => {
    let record = at(emptyPractice(studySample), 3);
    expect(reviewRequest(record, studySample)).toBe('');
    record = advance(record, studySample, 'I chose to go slowly today.').record;
    const text = reviewRequest(record, studySample);
    expect(text).toContain(studySample.title);
    expect(text).toContain('1. 日本語：' + studySample.sentences[0].meaning);
    expect(text).toContain('自分の英語：I chose to go slowly today.');
    expect(text).toContain('お手本：' + studySample.sentences[0].text);
    expect(text).not.toContain(studySample.sentences[1].text);
  });
  it('gives Muse the questions to ask aloud, and the learner’s own sentences when there are any', () => {
    const empty = talkRequest(emptyPractice(studySample), studySample);
    studySample.questions!.forEach(q => expect(empty).toContain(q.en));
    expect(empty).not.toContain('自分で書いた英文');
    const record = advance(at(emptyPractice(studySample), 3), studySample, 'I chose to go slowly today.').record;
    expect(talkRequest(record, studySample)).toContain('- I chose to go slowly today.');
    expect(talkRequest(record, { ...studySample, questions: [] })).toBe('');
  });
});
