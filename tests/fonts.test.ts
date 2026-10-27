import { describe,it,expect } from 'vitest';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {svgPathProperties} from 'svg-path-properties';
import {PDFDocument,PDFRawStream,decodePDFRawStream} from 'pdf-lib';
import {englishFonts,japaneseFonts} from '../src/handwriting/fonts';
import type {EnglishFontId,JapaneseFontId} from '../src/handwriting/fonts';
import {createA5Layout,createA5Scene,defaultView,staticAdvance,A5} from '../src/handwriting/a5-layout';
import {studySample} from '../src/handwriting/study-content';
import {supported,strokePoint,penPosition} from '../src/handwriting/model';
import {exportStudyNote} from '../src/handwriting/study-pdf';
import {defaultPrintOptions} from '../src/handwriting/print-layout';
describe('selectable notebook fonts',()=>{
 for(const english of Object.keys(englishFonts) as EnglishFontId[]) {
  it(english+' preserves complete English coverage, actual pen motion and the A5 writing area',()=>{
   expect(supported(Array.from({length:95},(_,n)=>String.fromCharCode(n+32)).join(''),englishFonts[english].data)).toBe(true);
   for(const japanese of Object.keys(japaneseFonts) as JapaneseFontId[]) {
    const source={...studySample,personal:'I keep one page.',vocabulary:studySample.vocabulary.map(v=>({...v,checked:true}))};
    const layout=createA5Layout(source,undefined,{english,japanese}),scene=createA5Scene(layout);
    expect(layout.source).toBe(source);
    expect(layout.pages.flatMap(p=>p.boxes).filter(b=>b.checked)).toHaveLength(source.vocabulary.length);
    for(const p of layout.pages)for(const run of p.runs)for(const g of run.glyphs) {
     if(run.face==='static')continue;
     for(const part of englishFonts[english].data[g.char].strokes) {
      const path=new svgPathProperties(part.d);
      for(let i=0;i<=20;i++) {
       const pt=path.getPointAtLength(part.length*i/20),x=g.x+pt.x*g.scale,y=g.y+pt.y*g.scale;
       expect(x).toBeGreaterThanOrEqual(layout.left-.2);
       expect(x).toBeLessThanOrEqual(148-layout.right+.2);
       if(run.id==='title'){expect(y).toBeGreaterThan(A5.titleTop+.1);expect(y).toBeLessThan(A5.titleBottom-.1);}
       if(run.layer==='body'){expect(y).toBeGreaterThan(g.y-4.6);expect(y).toBeLessThan(g.y+2);}
      }
     }
    }
    const stroke=scene.strokes.find(s=>s.layer==='body')!,t=stroke.start+stroke.duration*.5;
    expect(penPosition(scene.strokes,t)!.x).toBeCloseTo(strokePoint(stroke,.5).x);
   }
  });
 }
 for(const japanese of Object.keys(japaneseFonts) as JapaneseFontId[]) {
  it(japanese+' uses advances and complete embedded outlines from the selected font file',async()=>{
   const face=japaneseFonts[japanese],bytes=fs.readFileSync('public/fonts/'+face.file+'.ttf');
   expect(createHash('sha256').update(bytes).digest('hex')).toBe(face.metrics.sha256);
   for(const c of '〜のために時間をつくる書き留める落ち着くがぱ')expect(staticAdvance(c,2.7,japanese)).toBeGreaterThan(0);
   const layout=createA5Layout(studySample,undefined,{english:japanese==='zen'?'tech':'readability',japanese});
   const doc=await PDFDocument.load(await exportStudyNote(layout,defaultView,defaultPrintOptions,bytes));
   expect(doc.getSubject()).toContain('fonts '+layout.fonts.english+'/'+japanese);
   const streams=doc.context.enumerateIndirectObjects().map(([,o])=>o).filter(o=>o instanceof PDFRawStream);
   expect(streams.some(o=>Buffer.from(decodePDFRawStream(o as PDFRawStream).decode()).equals(bytes))).toBe(true);
  });
 }
});
