import {describe,it,expect} from 'vitest';
import {caretOffset,revealDelta,writingPaperHeight} from '../src/desk/viewport';
import {englishFonts} from '../src/handwriting/fonts';
import {layoutText} from '../src/handwriting/model';

describe('notebook writing viewport',()=>{
 it('keeps an already visible caret still and reveals clipped rows with breathing room',()=>{
  expect(revealDelta(480,506,380,704,40)).toBe(0);
  const down=revealDelta(690,716,380,704,40);expect(down).toBe(52);expect(716-down).toBe(664);
  const up=revealDelta(360,386,380,704,40);expect(up).toBe(-60);expect(360-up).toBe(420);
 });
 it('pans horizontally in either direction and avoids impossible margins in a short viewport',()=>{
  expect(revealDelta(730,732,14,404)).toBe(352);
  expect(revealDelta(-10,-8,14,404)).toBe(-48);
  expect(revealDelta(180,206,180,210,40)).toBe(-2);
 });
 it('reserves room for the model and controls using actual relative geometry',()=>{
  expect(writingPaperHeight(720,364)).toBe(324);
  expect(writingPaperHeight(777,354)).toBe(391);
  expect(writingPaperHeight(800,354)).toBeGreaterThan(writingPaperHeight(600,354));
 });
 it('follows a wrapped word and selection, including explicit trailing blank lines',()=>{
  for(const {data:font} of Object.values(englishFonts)){
   const text='Instead of checking my phone, I opened my notebook.',width=40;
   const glyphs=layoutText(text,0,0,width,4.1,5.2,font);
   const wrapped=glyphs.find(g=>g.y>0)!;expect(wrapped).toBeDefined();
   expect(caretOffset(text,wrapped.index,width,font)).toEqual({x:wrapped.x,y:wrapped.y});
   const last=glyphs.at(-1)!;expect(caretOffset(text,text.length,width,font)).toEqual({x:last.x+last.advance,y:last.y});
   expect(caretOffset('a\n\n',3,width,font)).toEqual({x:0,y:10.4});
   expect(caretOffset('',0,width,font)).toEqual({x:0,y:0});
  }
 });
});
