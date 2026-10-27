import {describe,it,expect,vi} from 'vitest';
import {emptyCopy,confirmCopy,nextCopy,validCopy,defaultDisplay,idleTimer,timerAt,toggleTimer,readSaved,practiceSchema,saveRecord} from '../src/desk/core';
import {deskLayout,confirmedLayout,inputPosition} from '../src/desk/note';
import {studySample} from '../src/handwriting/study-content';

describe('notebook Copy record',()=>{
 it('records actual confirmed text and advances only with a separate action',()=>{
  const start=emptyCopy(studySample);expect(start.entries).toHaveLength(0);
  expect(()=>confirmCopy({...start,draft:'wrong'},studySample,'now')).toThrow();
  const saved=confirmCopy({...start,draft:studySample.sentences[0].text},studySample,'now');
  expect(saved.index).toBe(0);expect(saved.phase).toBe('confirmed');expect(validCopy(saved,studySample)).toBe(true);
  expect(()=>confirmCopy(saved,studySample,'now')).toThrow();
  expect(nextCopy(saved,studySample)).toMatchObject({index:1,phase:'editing',draft:''});
  expect(validCopy({...saved,entries:[{...saved.entries[0],sentenceId:'other'}]},studySample)).toBe(false);
 });
 it('completes only after all eight checked sentences and final advancement',()=>{
  let state=emptyCopy(studySample);
  for(const sentence of studySample.sentences){state=confirmCopy({...state,draft:sentence.text},studySample,'now');expect(state.phase).toBe('confirmed');state=nextCopy(state,studySample);}
  expect(state.phase).toBe('complete');expect(validCopy(state,studySample)).toBe(true);
 });
 it('keeps draft and other reserved coordinates out of confirmed print ink',()=>{
  let state=emptyCopy(studySample);state=nextCopy(confirmCopy({...state,draft:studySample.sentences[0].text},studySample,'now'),studySample);
  state={...state,draft:'PRIVATE UNCONFIRMED WORDS'};
  const plan=deskLayout(state,defaultDisplay),shown=confirmedLayout(plan,state,defaultDisplay);
  expect(shown.pages.flatMap(p=>p.runs).filter(r=>r.layer==='body').map(r=>r.text).join('')).toBe(studySample.sentences[0].text);
  expect(JSON.stringify(shown.pages)).not.toContain('PRIVATE');
  const pos=inputPosition(plan,state,false);expect(pos.y).toBe(plan.pages[pos.page].runs.find(r=>r.sourceId===studySample.sentences[1].id)!.y);
  for(const theme of ['pure-white','natural','walnut'] as const)expect(deskLayout(state,{...defaultDisplay,theme})).toEqual(plan);
  expect(deskLayout(state,{...defaultDisplay,memos:'blank'})).toEqual(plan);
 });
 it('edits saved personal text without duplicate screen ink or changing export',()=>{
  let state=emptyCopy(studySample);
  for(const sentence of studySample.sentences)state=nextCopy(confirmCopy({...state,draft:sentence.text},studySample,'now'),studySample);
  state={...state,personal:'My saved words.',personalDraft:'My edited draft.'};
  const plan=deskLayout(state,defaultDisplay,true);
  const screen=confirmedLayout(plan,state,defaultDisplay,true),pdf=confirmedLayout(plan,state,defaultDisplay);
  expect(screen.pages.flatMap(p=>p.runs).some(r=>r.sourceId==='personal-user')).toBe(false);
  expect(pdf.pages.flatMap(p=>p.runs).filter(r=>r.sourceId==='personal-user').map(r=>r.text).join('')).toBe('My saved words.');
  expect(JSON.stringify(pdf.pages)).not.toContain('My edited draft.');
 });
 it('protects unreadable stored data and does not claim a failed save',()=>{
  const setItem=vi.fn();vi.stubGlobal('localStorage',{getItem:()=>'{invalid',setItem});
  const loaded=readSaved('fixture',practiceSchema,emptyCopy(studySample));expect(loaded.blocked).toBe(true);
  expect(()=>saveRecord('fixture',loaded.value,loaded.blocked)).toThrow();expect(setItem).not.toHaveBeenCalled();
  vi.stubGlobal('localStorage',{setItem:()=>{throw new Error('quota');}});expect(()=>saveRecord('fixture',{},false)).toThrow('保存できません');vi.unstubAllGlobals();
 });
});
describe('deadline timer',()=>{
 it('accounts for background elapsed time and resumes exactly',()=>{
  const running=toggleTimer(idleTimer(25),1000,25);expect(timerAt(running,61000).remaining).toBe(24*60000);
  const paused=toggleTimer(running,61000,25);expect(timerAt(paused,999999).remaining).toBe(24*60000);
  const resumed=toggleTimer(paused,1_000_000,25);expect(timerAt(resumed,2_500_000).state).toBe('finished');
 });
});
