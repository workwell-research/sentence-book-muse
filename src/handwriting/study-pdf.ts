import { PDFDocument, rgb, LineCapStyle, PrintScaling } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { A5, printPages, visibleLayer } from './a5-layout';
import type { A5Layout, ViewSettings } from './a5-layout';
import { englishFonts, japaneseFonts } from './fonts';
import type { JapaneseFontId } from './fonts';
import { sheetPlacements } from './print-layout';
import type { PrintOptions } from './print-layout';
import { palettes, printAccents, printInk } from './palettes';
const mm=72/25.4;
const color=(hex:string)=>rgb(parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255);
const fontRequests=new Map<JapaneseFontId,Promise<ArrayBuffer>>();
async function notebookFont(id:JapaneseFontId) {
  if(!fontRequests.has(id))fontRequests.set(id,fetch('/fonts/'+japaneseFonts[id].file+'.ttf').then(r=>{
    if(!r.ok)throw new Error('日本語フォントを読み込めませんでした。通信を確認して再度お試しください。');
    return r.arrayBuffer();
  }).catch(e=>{fontRequests.delete(id);throw e;}));
  return fontRequests.get(id)!;
}
// 'front' / 'back' print one side at a time, for printers that cannot print A5 on both sides.
export type PrintSides='both'|'front'|'back';
export async function exportStudyNote(layout:A5Layout,view:ViewSettings,options:PrintOptions,fontBytes?:Uint8Array,sides:PrintSides='both') {
  const doc=await PDFDocument.create();doc.registerFontkit(fontkit);
  doc.setTitle('The Sentence Book - '+layout.source.title);
  doc.setAuthor('The Sentence Book');
  doc.setSubject('A5 notebook; '+options.sheet+' sheet; actual size 100%; '+(sides==='both'?'two-sided ('+(options.sheet==='A4'?'flip on short edge':'flip on long edge')+')':sides+' side only')+'; memos '+view.memos+'; fonts '+layout.fonts.english+'/'+layout.fonts.japanese);
  doc.catalog.getOrCreateViewerPreferences().setPrintScaling(PrintScaling.None);
  const font=await doc.embedFont(fontBytes??await notebookFont(layout.fonts.japanese),{subset:false});
  const ink=palettes[options.palette],accent=printAccents[options.palette],sheet=sheetPlacements(options);
  const notes=[];
  // A daily note is a long-edge duplex sheet: copied pages on fronts, the review behind the last one.
  // Odd pages are backs: content shifts so the binding margin is on the right. Rules and bands run edge to edge.
  for(const [order,p] of printPages(layout,view).entries()) {
    const back=order%2===1,dx=back?layout.right-layout.left:0;
    if((sides==='front'&&back)||(sides==='back'&&!back))continue;
    const fullWidth=(l:{id:string})=>l.id.startsWith('rule-')||l.id.startsWith('band-');
    const runColor=(r:{accent:boolean;faint?:boolean})=>color(r.faint?A5.faint:r.accent?accent:printInk);
    const page=doc.addPage([148*mm,210*mm]);notes.push(page);
    page.setTrimBox(0,0,148*mm,210*mm);
    for(const l of p.lines.filter(l=>visibleLayer(l.layer,view))) {
      const shift=fullWidth(l)?0:dx;
      page.drawLine({start:{x:(l.x1+shift)*mm,y:(210-l.y1)*mm},end:{x:(l.x2+shift)*mm,y:(210-l.y2)*mm},thickness:l.width*mm,color:color(l.accent?accent:A5.rule)});
    }
    if(view.content==='study-notes')for(const b of p.boxes) {
      page.drawRectangle({x:(b.x+dx)*mm,y:(210-b.y-b.height)*mm,width:b.width*mm,height:b.height*mm,borderWidth:.25*mm,borderColor:color(accent)});
      if(b.checked)page.drawSvgPath('M '+(b.x+dx+.4)+' '+(b.y+1.3)+' l .6 .7 l 1.1 -1.5',{x:0,y:210*mm,scale:mm,borderWidth:.25,borderColor:color(printInk)});
    }
    if(options.markers)for(const m of p.markers.filter(m=>visibleLayer(m.layer,view)))page.drawLine({
      start:{x:(m.x1+dx)*mm,y:(210-m.y)*mm},end:{x:(m.x2+dx)*mm,y:(210-m.y)*mm},thickness:2.25*mm,color:color(ink.marker),lineCap:LineCapStyle.Round,
    });
    for(const r of p.runs.filter(r=>visibleLayer(r.layer,view)))for(const g of r.glyphs) {
      if(r.face==='static')page.drawText(g.char,{x:(g.x+dx)*mm,y:(210-g.y)*mm,size:r.size*mm,font,color:runColor(r)});
      else for(const part of englishFonts[layout.fonts.english].data[g.char]?.strokes??[])page.drawSvgPath(part.d,{
        x:(g.x+dx)*mm,y:(210-g.y)*mm,scale:g.scale*mm,borderColor:runColor(r),
        borderWidth:(r.id==='title'?.28:.20)/g.scale,borderLineCap:LineCapStyle.Round,
      });
    }
  }
  if(options.sheet==='A4') {
    for(const note of notes) {
      const embedded=await doc.embedPage(note),page=doc.addPage([297*mm,210*mm]);
      for(const p of sheet.placements)page.drawPage(embedded,{x:p.xMm*mm,y:p.yMm*mm,xScale:1,yScale:1});
      for(const x of sheet.cutLines)page.drawLine({start:{x:x*mm,y:0},end:{x:x*mm,y:210*mm},thickness:.25,color:rgb(.63,.66,.64),dashArray:[2,3]});
    }
    for(let i=0;i<notes.length;i++)doc.removePage(0);
  }
  return doc.save();
}
