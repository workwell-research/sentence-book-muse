import { describe,it,expect } from 'vitest';
import { PDFDocument, PDFRawStream, PDFName, PrintScaling, decodePDFRawStream } from 'pdf-lib';
import { exportNote } from '../src/handwriting/pdf';
import { sampleNote } from '../src/handwriting/model';
import { createPrintLayout, defaultPrintOptions, sheetPlacements } from '../src/handwriting/print-layout';
import { palettes } from '../src/handwriting/palettes';
const content={...sampleNote,date:'27 Oct 2026',personal:'I make time for a quiet morning.'};
const mm=72/25.4;
function luminance(hex:string) {
 const channels=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;
}
function streams(doc:PDFDocument) {
 return doc.context.enumerateIndirectObjects().filter((entry):entry is [typeof entry[0],PDFRawStream]=>entry[1] instanceof PDFRawStream)
   .map(([,s])=>new TextDecoder().decode(decodePDFRawStream(s).decode())).join('\n');
}
describe('notebook print contract',()=>{
 it('places two true A5 pages on A4 without scaling and reserves the 1 mm trim strip',()=>{
   const layout=sheetPlacements({...defaultPrintOptions,sheet:'A4'});
   expect(layout).toMatchObject({widthMm:297,heightMm:210,placements:[{xMm:0,yMm:0},{xMm:149,yMm:0}],cutLines:[148,149]});
   expect(sheetPlacements(defaultPrintOptions).placements).toEqual([{xMm:0,yMm:0}]);
 });
 it('does not remove or move any text, labels or rules when markers are switched off',()=>{
   const marked=createPrintLayout(content,defaultPrintOptions);
   const plain=createPrintLayout(content,{...defaultPrintOptions,markers:false});
   expect(marked.strokes.some(s=>s.phase==='marking')).toBe(true);
   expect(plain.strokes).toEqual(marked.strokes.filter(s=>s.phase!=='marking'));
   expect(plain.labels).toEqual(marked.labels);expect(plain.rules).toEqual(marked.rules);
 });
 it('keeps all six inks readable on paper and with their markers behind them',()=>{
   for(const ink of Object.values(palettes)) {
     for(const foreground of [ink.body,ink.title,ink.annotation,ink.personal]) {
       for(const background of ['#ffffff','#fffdf5',...['#ffffff','#fffdf5'].map(paper=>'#'+[1,3,5].map(i=>Math.round(parseInt(ink.marker.slice(i,i+2),16)*.48+parseInt(paper.slice(i,i+2),16)*.52).toString(16).padStart(2,'0')).join(''))])
         expect((luminance(background)+.05)/(luminance(foreground)+.05)).toBeGreaterThanOrEqual(4.5);
     }
   }
 });
 it('reserves the chosen binding area and keeps long annotations/personal input on the A5 page',()=>{
   for(const binding of [12,18,24]) for(const side of ['left','right'] as const) {
     const note=createPrintLayout({...content,personal:'w'.repeat(80),annotation:'make time for = find a moment for quiet work and careful thought'}, {...defaultPrintOptions,binding,side});
     expect(note.left).toBe(side==='left'?binding:12);
     expect(note.right).toBe(side==='right'?binding:12);
     expect(note.strokes.filter(s=>s.phase!=='marking').every(s=>s.x>=note.left && s.y<190)).toBe(true);
     expect(note.labels.find(l=>l.text==='NOTES / REVIEW')!.y).toBeLessThanOrEqual(171);
   }
 });
 it('fails oversized content rather than changing print scale or silently clipping',()=>{
   expect(()=>createPrintLayout({...content,body:'A complete sentence. '.repeat(100)},defaultPrintOptions)).toThrow('収まりません');
 });
 it('records no-scale viewer preferences, physical dimensions and identical unscaled A5 forms',async()=>{
   const doc=await PDFDocument.load(await exportNote(content,{...defaultPrintOptions,sheet:'A4'}));
   expect(doc.getPageCount()).toBe(1);
   expect(doc.catalog.getOrCreateViewerPreferences().getPrintScaling()).toBe(PrintScaling.None);
   expect(doc.getPage(0).getWidth()/mm).toBeCloseTo(297,7);
   expect(doc.getPage(0).getHeight()/mm).toBeCloseTo(210,7);
   const form=doc.context.enumerateIndirectObjects().map(([,o])=>o).find(o=>o instanceof PDFRawStream&&o.dict.get(PDFName.of('Subtype'))===PDFName.of('Form')) as PDFRawStream;
   expect(form).toBeDefined();
   expect(form.dict.get(PDFName.of('BBox'))!.toString()).toBe('[ 0 0 '+148*mm+' '+210*mm+' ]');
   const data=streams(doc);
   expect((data.match(/1 0 0 1 0 0 cm/g)||[]).length).toBeGreaterThanOrEqual(2);
   expect(data).toContain('1 0 0 1 '+149*mm+' 0 cm');
 });
 it('applies the selected ink in the actual PDF and omits only marker paths on request',async()=>{
   const options={...defaultPrintOptions,palette:'pink' as const};
   const marked=await PDFDocument.load(await exportNote(content,options));
   const plain=await PDFDocument.load(await exportNote(content,{...options,markers:false}));
   const markedData=streams(marked),plainData=streams(plain);
   const paths=(s:string)=>(s.match(/\nS\n/g)||[]).length;
   const markerCount=createPrintLayout(content,options).strokes.filter(s=>s.phase==='marking').length;
   expect(paths(markedData)-paths(plainData)).toBe(markerCount);
   const ink=palettes.pink.body;
   const pdfRgb=[1,3,5].map(i=>parseInt(ink.slice(i,i+2),16)/255).join(' ')+' RG';
   expect(plainData).toContain(pdfRgb);
   expect(plainData).toContain('Tj');
 });
});
