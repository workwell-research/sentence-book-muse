import { describe,it,expect } from 'vitest';
import fs from 'node:fs';
import { PDFDocument,PrintScaling,PDFRawStream,decodePDFRawStream } from 'pdf-lib';
import { A5,createA5Layout,createA5Scene,defaultView,visibleLayer,visiblePages } from '../src/handwriting/a5-layout';
import { studySample } from '../src/handwriting/study-content';
import { exportStudyNote } from '../src/handwriting/study-pdf';
import { defaultPrintOptions } from '../src/handwriting/print-layout';
const bytes=fs.readFileSync('public/fonts/MPLUS1p-Regular.ttf');
describe('shared A5 notebook',()=>{
 it('uses the adopted paper, integer rows, columns and title band',()=>{
  const p=createA5Layout(studySample).pages[0];
  expect(p.lines.filter(l=>l.id.startsWith('rule-'))).toHaveLength(31);
  expect(p.lines.find(l=>l.id==='rule-0')).toMatchObject({x1:18,x2:136,y1:39.2,width:.1});
  expect(p.lines.find(l=>l.id==='rule-30')!.y1).toBeCloseTo(195.2);
  expect(p.lines.filter(l=>l.id.startsWith('band-')).map(l=>l.y1)).toEqual([24.64,32.96,201]);
  expect(p.lines.find(l=>l.id==='rail')).toMatchObject({x1:106,x2:106});
  const body=p.runs.filter(r=>r.layer==='body');
  expect(body).toHaveLength(9); // The widest supplied sentence wraps with real glyph widths.
  expect(body[0].y).toBeCloseTo(39.2);
  for(let i=1;i<body.length;i++) {
   const sameSentence=body[i].sourceId===body[i-1].sourceId;
   expect(body[i].y-body[i-1].y).toBeCloseTo(sameSentence?5.2:10.4);
  }
  expect(createA5Layout(studySample).pages).toHaveLength(1);
 });
 it('blank memos retain the entire measured plan and all non-memo content',()=>{
  const layout=createA5Layout({...studySample,personal:'I keep one page.',vocabulary:studySample.vocabulary.map(v=>({...v,checked:true}))});
  const blank={...defaultView,memos:'blank' as const};
  expect(visiblePages(layout,blank)).toEqual(visiblePages(layout,defaultView));
  for(const p of layout.pages) {
   expect(p.runs.filter(r=>visibleLayer(r.layer,blank))).toEqual(p.runs.filter(r=>r.layer!=='memo'));
   expect(p.lines.filter(l=>visibleLayer(l.layer,blank))).toEqual(p.lines);
   expect(p.boxes.filter(b=>b.checked)).not.toHaveLength(0);
  }
  expect(layout.source.sentences[1].glosses![0].meaning).toBe('〜のために時間をつくった');
 });
 it('keeps scene timing stable when checks or personal input change',()=>{
  const a=createA5Scene(createA5Layout(studySample));
  const b=createA5Scene(createA5Layout({...studySample,personal:'One quiet morning.',vocabulary:studySample.vocabulary.map(v=>({...v,checked:true}))}));
  expect(a.duration).toBe(b.duration);
  expect(a.strokes.filter(s=>s.layer==='body')).toEqual(b.strokes.filter(s=>s.layer==='body'));
 });
 it('reserves wrapped meanings and long footnotes even when blank, without stretching any page',()=>{
  const content={...studySample,sentences:[{id:'long',text:'A useful expression. '.repeat(45),glosses:[{id:'g',start:2,end:19,quote:'useful expression',meaning:'長い意味を一行ずつ書きます。'.repeat(4)}],footnotes:[{id:'fn',text:'This is a longer supplied explanation. '.repeat(30)}]}]};
  const layout=createA5Layout(content);
  expect(layout.pages.length).toBeGreaterThan(1);
  expect(visiblePages(layout,defaultView).length).toBe(visiblePages(layout,{...defaultView,memos:'blank'}).length);
  for(const p of layout.pages)for(const r of p.runs) {
   expect(r.y).toBeLessThanOrEqual(206);
   for(const g of r.glyphs.filter(g=>g.char!==' '))expect(g.x+g.advance).toBeLessThanOrEqual(136.01);
   if(r.layer==='body')expect((r.y-A5.first)/A5.pitch).toBeCloseTo(Math.round((r.y-A5.first)/A5.pitch));
  }
 });
 it('validates every occurrence, including a repeated expression beyond the first match',()=>{
  const content={...studySample,sentences:[{id:'repeat',text:'make time for tea; make time for books.',glosses:[{id:'first',start:0,end:13,quote:'make time for',meaning:'時間を作る'},{id:'second',start:20,end:33,quote:'make time for',meaning:'時間を作る'}]}]};
  expect(()=>createA5Layout(content)).toThrow('一致');
  content.sentences[0].glosses[1].start=19;content.sentences[0].glosses[1].end=32;
  const plan=createA5Layout(content);
  expect(plan.pages.flatMap(p=>p.markers)).toHaveLength(2);
 });
 it('retains body widths in sentence-only mode and handles notes with no memos',()=>{
  const source={...studySample,sentences:[{id:'no-memo',text:'A page with no supplied notes.'}]};
  const layout=createA5Layout(source);
  expect(layout.pages[0].lines.some(l=>l.id==='rail')).toBe(true);
  const minimal={...defaultView,content:'sentences-only' as const};
  expect(layout.pages[0].runs.filter(r=>visibleLayer(r.layer,minimal))).toEqual(layout.pages[0].runs.filter(r=>r.layer==='body'||r.layer==='base'));
 });
 it('shares explicit binding variants and rejects invalid/overlong metadata without truncation',()=>{
  for(const side of ['left','right'] as const)for(const binding of [12,18,24]) {
   const layout=createA5Layout(studySample,{side,binding});
   expect(layout.left).toBe(side==='left'?binding:12);
   expect(layout.pages[0].runs.find(r=>r.layer==='body')!.x).toBe(layout.left);
  }
  expect(()=>createA5Layout({...studySample,title:'Very long '.repeat(40)})).toThrow('収まりません');
 });
 it('exports the shared plan at physical size, with Japanese text embedded and no print scaling',async()=>{
  const layout=createA5Layout(studySample);
  for(const sheet of ['A5','A4'] as const) {
   const doc=await PDFDocument.load(await exportStudyNote(layout,defaultView,{...defaultPrintOptions,sheet},bytes));
   expect(doc.getPageCount()).toBe(layout.pages.length);
   expect(doc.getPage(0).getWidth()*25.4/72).toBeCloseTo(sheet==='A5'?148:297,6);
   expect(doc.getPage(0).getHeight()*25.4/72).toBeCloseTo(210,6);
   expect(doc.catalog.getOrCreateViewerPreferences().getPrintScaling()).toBe(PrintScaling.None);
   // Preserve complete outlines: CJK partial subsets passed text extraction but lost kana when rendered.
   const embedded=doc.context.enumerateIndirectObjects().map(([,o])=>o).filter(o=>o instanceof PDFRawStream);
   expect(embedded.some(o=>Buffer.from(decodePDFRawStream(o as PDFRawStream).decode()).equals(bytes))).toBe(true);
  }
 });
});
