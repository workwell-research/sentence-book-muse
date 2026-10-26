
import { describe,it,expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { createNote,layoutText,sampleNote,supported,penPosition,strokePoint,inkProgress } from '../src/handwriting/model';
import { emptyPersonal,reconcilePersonal } from '../src/handwriting/personal';
import { exportNote } from '../src/handwriting/pdf';
import { defaultPrintOptions } from '../src/handwriting/print-layout';
const content={...sampleNote,date:'27 Oct 2026',personal:'I make time for a quiet morning.'};
describe('handwriting document',()=>{
 it('keeps existing stroke identities when text is inserted, replaced, or deleted',()=>{
   const original=reconcilePersonal(emptyPersonal,'I like tea.');
   const inserted=reconcilePersonal(original,'I really like tea.');
   expect(inserted.letters.slice(0,2)).toEqual(original.letters.slice(0,2));
   expect(inserted.letters.slice(-9)).toEqual(original.letters.slice(-9));
   const removed=reconcilePersonal(inserted,'I like tea.');
   expect(removed.letters).toEqual(original.letters);
   const replaced=reconcilePersonal(original,'I love tea.');
   expect(replaced.letters.slice(-5)).toEqual(original.letters.slice(-5));
   expect(replaced.letters[3].id).not.toBe(original.letters[3].id);
 });

 it('covers the promised alphabet, numbers, and printable ASCII without silently discarding other scripts',()=>{
   const ascii=Array.from({length:95},(_,i)=>String.fromCharCode(32+i)).join('');
   expect(supported(ascii)).toBe(true);
   expect(supported('日本語')).toBe(false);
 });
 it('wraps words and unbroken input within the writing area',()=>{
   const text='Make time for '+ 'w'.repeat(80);
   const glyphs=layoutText(text,30,100,280,38,49);
   expect(glyphs.filter(g=>g.char!==' ').every(g=>g.x>=30&&g.x+g.advance<=310.001)).toBe(true);
   expect(new Set(glyphs.map(g=>g.y)).size).toBeGreaterThan(1);
 });
 it('finishes writing before marking, and marking before annotations',()=>{
   const note=createNote(content,670);
   const end=(phase:string)=>Math.max(...note.strokes.filter(s=>s.phase===phase).map(s=>s.start+s.duration));
   const start=(phase:string)=>Math.min(...note.strokes.filter(s=>s.phase===phase).map(s=>s.start));
   expect(start('marking')).toBeGreaterThan(end('writing'));
   expect(start('annotating')).toBeGreaterThan(end('marking'));
   expect(note.duration).toBeLessThan(45000);
 });
 it('the pen follows the exact current stroke and lifts between strokes',()=>{
   const note=createNote(content,670),stroke=note.strokes[5];
   const p=penPosition(note.strokes,stroke.start+stroke.duration*.5)!;
   expect(p.down).toBe(true);
   expect(p.x).toBeCloseTo(strokePoint(stroke,.5).x,5);
   expect(p.y).toBeCloseTo(strokePoint(stroke,.5).y,5);
   expect(penPosition(note.strokes,stroke.start-5)?.down).toBe(false);
   expect(penPosition(note.strokes,note.duration)).toBeNull();
   const steps=Array.from({length:101},(_,i)=>inkProgress(i/100));
   expect(steps.every((v,i)=>i===0||v>=steps[i-1])).toBe(true);
 });
 it('reflows highlights into separate lines instead of marking across the page boundary',()=>{
   const note=createNote({...content,phrase:'Today, I am making time for the little things.'},320);
   expect(note.strokes.filter(s=>s.phase==='marking').length).toBeGreaterThan(1);
   for(const s of note.strokes.filter(s=>s.phase==='marking')) {
     expect(s.length).toBeLessThanOrEqual(note.width-note.left-note.right+4);
   }
 });
 it('exports a complete vector page at the exact A5 portrait / A4 landscape dimensions',async()=>{
   for(const sheet of ['A5','A4'] as const){
     const bytes=await exportNote(content,{...defaultPrintOptions,sheet});
     const doc=await PDFDocument.load(bytes);
     expect(doc.getPageCount()).toBe(1);
     expect(doc.getPage(0).getWidth()).toBeCloseTo((sheet==='A5'?148:297)*72/25.4,4);
     expect(doc.getPage(0).getHeight()).toBeCloseTo(210*72/25.4,4);
   }
 });
 it('rejects unsupported handwriting rather than exporting missing characters',async()=>{
   await expect(exportNote({...content,personal:'朝のコーヒー'},defaultPrintOptions)).rejects.toThrow('対応');
 });
});
