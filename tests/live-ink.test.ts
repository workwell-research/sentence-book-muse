import {describe,it,expect} from 'vitest';
import {initialWriting,editWriting} from '../src/desk/live-ink';
import {deskLayout,confirmedLayout,inputPosition,practiceScene} from '../src/desk/note';
import {emptyCopy,confirmCopy,nextCopy,defaultDisplay} from '../src/desk/core';
import {studySample} from '../src/handwriting/study-content';
import {englishFonts} from '../src/handwriting/fonts';
import {layoutText} from '../src/handwriting/model';

describe('live handwriting edits',()=>{
 it('restores without replay and animates only inserted letters',()=>{
  const old=initialWriting('cat','readability',true);
  expect(old.starts).toEqual({});
  const next=editWriting(old,'coat','readability',true,1000);
  expect(next.letters[0].id).toBe(old.letters[0].id);
  expect(next.letters.slice(2)).toEqual(old.letters.slice(1));
  expect(Object.keys(next.starts)).toEqual([String(next.letters[1].id)]);
  expect(next.end).toBe(1160);
  const removed=editWriting(next,'cat','readability',true,1050);
  expect(removed.letters).toEqual(old.letters);expect(removed.starts).toEqual({});
 });
 it('never queues unfinished characters behind rapid typing',()=>{
  let state=initialWriting('','readability',true);
  for(let n=1;n<=50;n++){
   state=editWriting(state,'a'.repeat(n),'readability',true,n*10);
   expect(state.end).toBeLessThanOrEqual(n*10+160);
   expect(Object.keys(state.starts)).toHaveLength(1);
  }
 });
 it('handles large paste, font changes, reduced motion and composition immediately',()=>{
  const old=initialWriting('a','readability',true);
  expect(editWriting(old,'a long pasted sentence','readability',true,100).starts).toEqual({});
  expect(editWriting(old,'ab','tech',true,100).starts).toEqual({});
  const ime=editWriting(old,'あ','readability',false,100);
  expect(ime.text).toBe('あ');expect(ime.starts).toEqual({});
  expect(editWriting(ime,'a','readability',true,200).starts).toEqual({});
  expect(editWriting(old,'ab','readability',false,100).starts).toEqual({});
 });
 it('keeps character identities around newline and selection replacement',()=>{
  const old=initialWriting('ab\ncd','print',true),next=editWriting(old,'ab\nXd','print',true,100);
  expect(next.letters.slice(0,3)).toEqual(old.letters.slice(0,3));
  expect(next.letters.at(-1)).toEqual(old.letters.at(-1));
  expect(next.letters[3].id).not.toBe(old.letters[3].id);
 });
 it('confirms completed body ink at time zero and animates only its annotations',()=>{
  const record=confirmCopy({...emptyCopy(studySample),draft:studySample.sentences[0].text},studySample,'now');
  const scene=practiceScene(confirmedLayout(deskLayout(record,defaultDisplay),record,defaultDisplay),studySample.sentences[0].id,true);
  const body=scene.strokes.filter(s=>s.layer==='body');
  expect(body.length).toBeGreaterThan(0);
  expect(body.every(s=>s.start+s.duration<=0)).toBe(true);
  expect(scene.strokes.some(s=>s.phase==='annotating'&&s.start>=0)).toBe(true);
 });
 it('matches the final A5 body position while typing every sample in all four faces',()=>{
  for(const english of ['readability','tech','print','pen'] as const){
   let record=emptyCopy(studySample);
   for(const sentence of studySample.sentences){
    const plan=deskLayout(record,{...defaultDisplay,english}),pos=inputPosition(plan,record,false);
    const typed=layoutText(sentence.text,pos.x,pos.y,pos.width,4.1,5.2,englishFonts[english].data).filter(g=>g.char!==' ');
    const final=plan.pages.flatMap(p=>p.runs.filter(r=>r.sourceId===sentence.id).flatMap(r=>r.glyphs)).filter(g=>g.char!==' ');
    expect(typed).toHaveLength(final.length);
    typed.forEach((g,i)=>{expect(g.char).toBe(final[i].char);expect(g.x).toBeCloseTo(final[i].x,8);expect(g.y).toBeCloseTo(final[i].y,8);});
    record=nextCopy(confirmCopy({...record,draft:sentence.text},studySample,'now'),studySample);
   }
  }
 });
});
