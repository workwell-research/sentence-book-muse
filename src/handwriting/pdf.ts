import { PDFDocument, rgb, StandardFonts, LineCapStyle } from 'pdf-lib';
import { createNote, personalStrokes, supported } from './model';
import type { NoteContent } from './model';

export interface PrintOptions { size:'A5'|'A4'; binding:number; side:'left'|'right'; }
const color=(hex:string)=>rgb(parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255);
export async function exportNote(content:NoteContent,options:PrintOptions):Promise<Uint8Array> {
  if(!supported(content.personal)) throw new Error('手書きに対応していない文字があります。英数字に直してください。');
  const mm=72/25.4;
  const width=(options.size==='A5'?148:210)*mm, height=(options.size==='A5'?210:297)*mm;
  const document=await PDFDocument.create();
  document.setTitle('The Sentence Book - '+content.title);
  document.setAuthor('The Sentence Book');
  document.setSubject('Handwriting prototype; sample lesson with a personal note.');
  const page=document.addPage([width,height]);
  const font=await document.embedFont(StandardFonts.Helvetica);
  // Fixed print composition in virtual units. The screen's responsive geometry is never captured.
  const printWidth=options.size==='A5'?720:900;
  const scale=width/printWidth;
  const binding=options.binding*mm/scale;
  const outer=12*mm/scale;
  const note=createNote(content,printWidth,{left:options.side==='left'?binding:outer,right:options.side==='right'?binding:outer});
  const top=12*mm;
  const available=height-top-12*mm;
  if(note.height*scale>available) throw new Error('この用紙には収まりません。ひとことを短くするか、A4を選んでください。');
  const x1=note.left*scale,x2=width-note.right*scale;
  for(let y=note.ruleStart;y<note.height-40;y+=note.lineHeight) {
    page.drawLine({start:{x:x1,y:height-top-y*scale},end:{x:x2,y:height-top-y*scale},thickness:.35,color:rgb(.81,.82,.78)});
  }
  // Markers lie underneath the text, even though their animation is scheduled later.
  const all=[...note.strokes.filter(s=>s.phase==='marking'),...note.strokes.filter(s=>s.phase!=='marking'),...personalStrokes(note.personal)];
  for(const stroke of all) page.drawSvgPath(stroke.d,{
    x:stroke.x*scale,y:height-top-stroke.y*scale,scale:stroke.scale*scale,
    borderColor:color(stroke.color),borderWidth:stroke.width,
    borderOpacity:stroke.phase==='marking'?.48:1,borderLineCap:LineCapStyle.Round,
  });
  page.drawText(content.date,{x:x1,y:height-top+6,size:8,font,color:rgb(.35,.39,.34)});
  page.drawText('MY OWN WORDS',{x:x1,y:height-top-(note.personalTop-41)*scale,size:7,font,color:rgb(.35,.39,.34)});
  page.drawText('The Sentence Book  /  '+options.size,{x:x1,y:10*mm,size:7,font,color:rgb(.35,.39,.34)});
  page.drawText('1',{x:x2-5,y:10*mm,size:8,font,color:rgb(.35,.39,.34)});
  return document.save();
}
