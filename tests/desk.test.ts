import {describe,it,expect,vi} from 'vitest';
import {emptyCopy,confirmCopy,nextCopy,submitCopy,validCopy,defaultDisplay,idleTimer,timerAt,toggleTimer,readSaved,practiceSchema,saveRecord} from '../src/desk/core';
import {deskLayout,confirmedLayout,inputPosition} from '../src/desk/note';
import {studySample} from '../src/handwriting/study-content';

describe('notebook Copy record',()=>{
 it('keeps legacy checked records valid without duplicating them on resume',()=>{
  const start=emptyCopy(studySample);expect(start.entries).toHaveLength(0);
  expect(()=>confirmCopy({...start,draft:'wrong'},studySample,'now')).toThrow();
  const saved=confirmCopy({...start,draft:studySample.sentences[0].text},studySample,'now');
  expect(saved.index).toBe(0);expect(saved.phase).toBe('confirmed');expect(validCopy(saved,studySample)).toBe(true);
  expect(()=>confirmCopy(saved,studySample,'now')).toThrow();
  expect(submitCopy(saved,studySample,'later')).toMatchObject({index:1,phase:'editing',draft:'',entries:saved.entries});
  expect(validCopy({...saved,entries:[{...saved.entries[0],sentenceId:'other'}]},studySample)).toBe(false);
 });
 it('checks and advances in one action, completing only on the eighth correct submission',()=>{
  let state=emptyCopy(studySample);
  for(const sentence of studySample.sentences){const before=state;expect(()=>submitCopy({...state,draft:'wrong'},studySample,'now')).toThrow();expect(state).toEqual(before);state=submitCopy({...state,draft:sentence.text},studySample,'now');expect(validCopy(state,studySample)).toBe(true);if(state.entries.length<8)expect(state).toMatchObject({phase:'editing',draft:'',index:state.entries.length});}
  expect(state.phase).toBe('complete');expect(validCopy(state,studySample)).toBe(true);expect(submitCopy(state,studySample,'again')).toBe(state);
 });
 it('keeps draft and other reserved coordinates out of confirmed print ink',()=>{
  let state=emptyCopy(studySample);state=nextCopy(confirmCopy({...state,draft:studySample.sentences[0].text},studySample,'now'),studySample);
  state={...state,draft:'PRIVATE UNCONFIRMED WORDS'};
  const plan=deskLayout(studySample,state,defaultDisplay),shown=confirmedLayout(plan,state,defaultDisplay);
  expect(shown.pages.flatMap(p=>p.runs).filter(r=>r.layer==='body').map(r=>r.text).join('')).toBe(studySample.sentences[0].text);
  expect(JSON.stringify(shown.pages)).not.toContain('PRIVATE');
  const pos=inputPosition(plan,state,false);expect(pos.y).toBe(plan.pages[pos.page].runs.find(r=>r.sourceId===studySample.sentences[1].id)!.y);
  for(const theme of ['pure-white','natural','walnut'] as const)expect(deskLayout(studySample,state,{...defaultDisplay,theme})).toEqual(plan);
  expect(deskLayout(studySample,state,{...defaultDisplay,memos:'blank'})).toEqual(plan);
 });
 it('edits saved personal text without duplicate screen ink or changing export',()=>{
  let state=emptyCopy(studySample);
  for(const sentence of studySample.sentences)state=nextCopy(confirmCopy({...state,draft:sentence.text},studySample,'now'),studySample);
  state={...state,personal:'My saved words.',personalDraft:'My edited draft.'};
  const plan=deskLayout(studySample,state,defaultDisplay,true);
  const screen=confirmedLayout(plan,state,defaultDisplay,true),pdf=confirmedLayout(plan,state,defaultDisplay);
  expect(screen.pages.flatMap(p=>p.runs).some(r=>r.sourceId==='personal-user')).toBe(false);
  expect(pdf.pages.flatMap(p=>p.runs).filter(r=>r.sourceId==='personal-user').map(r=>r.text).join('')).toBe('My saved words.');
  expect(JSON.stringify(pdf.pages)).not.toContain('My edited draft.');
 });
 it('reads legacy records without lines and plans the learner\'s lines into the page',()=>{
  const legacy=practiceSchema.parse(JSON.parse(JSON.stringify({...emptyCopy(studySample),lookups:undefined})));
  expect(legacy.lookups).toEqual([]);
  const line={id:'lookup-example-story-05-2-12',sentenceId:'example-story-05',start:2,end:12,expression:'wrote down',native:'書き留めた',note:null,lookedUpAt:'2026-10-30T01:00:00.000Z'};
  const state={...emptyCopy(studySample),lookups:[line]};
  const plan=deskLayout(studySample,state,defaultDisplay);
  expect(plan.source.sentences[4].glosses).toEqual([{id:line.id,start:2,end:12,quote:'wrote down',meaning:'書き留めた'}]);
  expect(plan.source.vocabulary.at(-1)).toMatchObject({english:'wrote down'});
  expect(plan.pages.flatMap(p=>p.markers).some(m=>m.id.startsWith(line.id+':'))).toBe(true);
  // The line shows only once its sentence is confirmed, like the authored glosses.
  expect(JSON.stringify(confirmedLayout(plan,state,defaultDisplay).pages)).not.toContain('書き留めた');
  const stale={...state,lookups:[{...line,expression:'wrote DOWN'}]};
  expect(deskLayout(studySample,stale,defaultDisplay).source).toEqual(deskLayout(studySample,emptyCopy(studySample),defaultDisplay).source);
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
