import { PDFDocument, rgb, StandardFonts, LineCapStyle, PrintScaling } from 'pdf-lib';
import type { NoteContent } from './model';
import { createPrintLayout, sheetPlacements } from './print-layout';
import type { PrintOptions } from './print-layout';
export type { PrintOptions } from './print-layout';

const mm=72/25.4;
const color=(hex:string)=>rgb(parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255);
export async function exportNote(content:NoteContent,options:PrintOptions):Promise<Uint8Array> {
  const note=createPrintLayout(content,options),sheet=sheetPlacements(options);
  const document=await PDFDocument.create();
  document.setTitle('The Sentence Book - '+content.title);
  document.setAuthor('The Sentence Book');
  document.setSubject('A5 notebook; '+options.sheet+' print sheet; print at actual size (100%).');
  // A viewer hint, not a way to override a printer driver's own scale settings.
  document.catalog.getOrCreateViewerPreferences().setPrintScaling(PrintScaling.None);
  const font=await document.embedFont(StandardFonts.Helvetica);
  const notePage=document.addPage([note.widthMm*mm,note.heightMm*mm]);
  notePage.setTrimBox(0,0,note.widthMm*mm,note.heightMm*mm);
  for(const rule of note.rules) notePage.drawLine({
    start:{x:rule.x1*mm,y:(note.heightMm-rule.y)*mm},end:{x:rule.x2*mm,y:(note.heightMm-rule.y)*mm},
    thickness:.3,color:rgb(.82,.83,.8),
  });
  for(const stroke of note.strokes) notePage.drawSvgPath(stroke.d,{
    x:stroke.x*mm,y:(note.heightMm-stroke.y)*mm,scale:stroke.scale*mm,
    borderColor:color(stroke.color),borderWidth:stroke.width,
    borderOpacity:stroke.phase==='marking'?.48:1,borderLineCap:LineCapStyle.Round,
  });
  for(const label of note.labels) notePage.drawText(label.text,{
    x:label.x*mm,y:(note.heightMm-label.y)*mm,size:label.sizePt,font,color:rgb(.35,.38,.36),
  });
  if(options.sheet==='A4') {
    // Embed the finished A5 page once, then place two unscaled copies on landscape A4.
    const embedded=await document.embedPage(notePage);
    const sheetPage=document.addPage([sheet.widthMm*mm,sheet.heightMm*mm]);
    for(const placement of sheet.placements) sheetPage.drawPage(embedded,{
      x:placement.xMm*mm,y:placement.yMm*mm,xScale:1,yScale:1,
    });
    for(const x of sheet.cutLines) sheetPage.drawLine({
      start:{x:x*mm,y:0},end:{x:x*mm,y:sheet.heightMm*mm},
      thickness:.25,color:rgb(.63,.66,.64),dashArray:[2,3],
    });
    document.removePage(0);
  }
  return document.save();
}
