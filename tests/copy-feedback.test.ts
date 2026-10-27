import {describe,it,expect} from 'vitest';
import {copyMismatchMessage,confirmCopy,emptyCopy,submitCopy} from '../src/desk/core';
import {studySample} from '../src/handwriting/study-content';
const expected='Instead of checking my phone, I opened my notebook.';
describe('Copy correction feedback',()=>{
 it('names the missing-letter word without losing the draft or advancing',()=>{
  let state=emptyCopy(studySample);
  for(const sentence of studySample.sentences.slice(0,2))state=submitCopy({...state,draft:sentence.text},studySample,'fixture');
  const draft=expected.replace('opened','opend');state={...state,draft};
  expect(()=>confirmCopy(state,studySample,'now')).toThrow('「opend」→「opened」');
  expect(state.draft).toBe(draft);expect(state.entries).toHaveLength(2);expect(state.index).toBe(2);
  expect(submitCopy({...state,draft:expected},studySample,'now')).toMatchObject({index:3,phase:'editing',draft:''});
 });
 it('distinguishes word spelling, capital letters and punctuation',()=>{
  expect(copyMismatchMessage(expected.replace('Instead','instead'),expected)).toContain('「instead」→「Instead」');
  expect(copyMismatchMessage(expected.replace('phone,','phone'),expected)).toContain('空白');
  expect(copyMismatchMessage(expected.replace('notebook.','notebook!'),expected)).toContain('「notebook!」→「notebook.」');
  expect(copyMismatchMessage(expected,expected)).toBeNull();
 });
 it('explains invisible whitespace rather than showing identical-looking words',()=>{
  expect(copyMismatchMessage(' '+expected+' ',expected)).toContain('余分な空白');
  expect(copyMismatchMessage(expected.replace('my phone','my  phone'),expected)).toContain('空白');
  expect(copyMismatchMessage(expected+'\n',expected)).toContain('改行');
 });
 it('handles empty, unfinished and appended text without proposing a wrong word replacement',()=>{
  expect(copyMismatchMessage('',expected)).toContain('書いてから');
  expect(copyMismatchMessage(expected.slice(0,-3),expected)).toContain('文の続き');
  expect(copyMismatchMessage(expected+'extra',expected)).toContain('余分な文字');
 });
 it('bounds extremely long mismatch text',()=>{
  expect(copyMismatchMessage('x'.repeat(10000),expected)!.length).toBeLessThan(120);
 });
});
