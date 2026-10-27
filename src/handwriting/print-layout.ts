import { fontData } from './font-data';
import { layoutText, supported } from './model';
import type { Glyph, NoteContent, Stroke } from './model';
import { palettes } from './palettes';
import type { PaletteId } from './palettes';

// Finished notebook formats and printer sheets are deliberately separate registries.
// Add future B5 / measured notebook presets here, without changing screen geometry.
export const notebookFormats = {
  a5: { label:'A5', widthMm:148, heightMm:210 },
} as const;
export type NotebookFormat = keyof typeof notebookFormats;
export const printSheets = {
  A5: { widthMm:148, heightMm:210, columns:1 },
  A4: { widthMm:297, heightMm:210, columns:2 },
} as const;
export interface PrintOptions {
  notebook:NotebookFormat; sheet:keyof typeof printSheets;
  binding:number; side:'left'|'right'; markers:boolean; palette:PaletteId;
}
export const defaultPrintOptions:PrintOptions = {
  notebook:'a5', sheet:'A5', binding:18, side:'left', markers:true, palette:'blue',
};
// All measurements below are print-only millimetres. They never use screen breakpoints.
export const printTypography = { title:7, body:5, annotation:4.3, personal:5, line:8 } as const;
export interface PrintLabel { text:string; x:number; y:number; sizePt:number; }
export interface PrintRule { x1:number; x2:number; y:number; }
export interface PrintNoteLayout {
  widthMm:number; heightMm:number; left:number; right:number;
  strokes:Stroke[]; labels:PrintLabel[]; rules:PrintRule[];
}
export function createPrintLayout(content:NoteContent,options:PrintOptions):PrintNoteLayout {
  if(Object.values(content).some(text=>!supported(text)))
    throw new Error('手書きに対応していない文字があります。英数字と基本の記号でお試しください。');
  const format=notebookFormats[options.notebook];
  if(!format || !palettes[options.palette] || !Number.isFinite(options.binding) || options.binding<12 || options.binding>24)
    throw new Error('印刷設定を確認してください。綴じ代は12〜24 mmで指定できます。');
  const {widthMm,heightMm}=format, ink=palettes[options.palette];
  const left=options.side==='left'?options.binding:12;
  const right=options.side==='right'?options.binding:12;
  // Reserve two millimetres at the outside edge for natural stroke overhangs.
  const inner=widthMm-left-right-2;
  const type=printTypography;
  const title=layoutText(content.title,left,26,inner,type.title,10);
  const body=layoutText(content.body,left,(title.at(-1)?.y??26)+16,inner,type.body,type.line);
  const expressionY=(body.at(-1)?.y??42)+12;
  const annotation=layoutText(content.annotation,left,expressionY+7,inner,type.annotation,7);
  const personalLabelY=(annotation.at(-1)?.y??expressionY+7)+13;
  const personal=layoutText(content.personal,left,personalLabelY+8,inner,type.personal,type.line);
  const reviewY=(personal.at(-1)?.y??personalLabelY+8)+14;
  if(reviewY>heightMm-39)
    throw new Error('A5の1ページに収まりません。ひとことを短くしてください。文字を縮小せずに出力します。');
  const strokes:Stroke[]=[];
  function add(glyphs:Glyph[],color:string,phase:Stroke['phase']='writing') {
    for(const glyph of glyphs) for(const part of fontData[glyph.char]?.strokes??[])
      strokes.push({...part,x:glyph.x,y:glyph.y,scale:glyph.scale,start:0,duration:1,phase,width:5.3,color});
  }
  const start=content.phrase?content.body.indexOf(content.phrase):-1;
  if(options.markers && start>=0) {
    const chosen=body.filter(g=>g.index>=start&&g.index<start+content.phrase.length&&g.char!==' ');
    for(const y of new Set(chosen.map(g=>g.y))) {
      const row=chosen.filter(g=>g.y===y),x1=row[0].x,x2=row.at(-1)!.x+row.at(-1)!.advance;
      strokes.push({d:'M '+x1+' '+(y-.8)+' L '+x2+' '+(y-.9),length:x2-x1,x:0,y:0,scale:1,start:0,duration:1,phase:'marking',width:2.8,color:ink.marker});
    }
  }
  add(title,ink.title);add(body,ink.body);add(annotation,ink.annotation,'annotating');add(personal,ink.personal);
  const labels:PrintLabel[]=[
    {text:content.date,x:left,y:12,sizePt:7.5},
    {text:'EXPRESSION',x:left,y:expressionY,sizePt:6.5},
    {text:'MY OWN WORDS',x:left,y:personalLabelY,sizePt:6.5},
    {text:'NOTES / REVIEW',x:left,y:reviewY,sizePt:6.5},
    {text:'The Sentence Book  /  A5',x:left,y:heightMm-10,sizePt:7},
    {text:'1',x:widthMm-right-2,y:heightMm-10,sizePt:7},
  ];
  const rules:PrintRule[]=[];
  const rule=(y:number)=>rules.push({x1:left,x2:widthMm-right,y});
  for(const y of new Set(body.map(g=>g.y))) rule(y+1.8);
  for(const y of new Set(personal.map(g=>g.y))) rule(y+1.8);
  for(let y=reviewY+8;y<=heightMm-20;y+=type.line) rule(y);
  return {widthMm,heightMm,left,right,strokes,labels,rules};
}

export function sheetPlacements(options:PrintOptions) {
  const note=notebookFormats[options.notebook],sheet=printSheets[options.sheet];
  if(!note||!sheet||note.heightMm>sheet.heightMm||note.widthMm*sheet.columns>sheet.widthMm)
    throw new Error('選んだ印刷用紙に原寸で配置できません。');
  const gap=sheet.columns===1?0:(sheet.widthMm-note.widthMm*sheet.columns)/(sheet.columns-1);
  return {
    ...sheet,
    placements:Array.from({length:sheet.columns},(_,i)=>({xMm:i*(note.widthMm+gap),yMm:(sheet.heightMm-note.heightMm)/2})),
    // A4 is 297 mm wide; two exact 148 mm notes leave a 1 mm cutting strip.
    cutLines:sheet.columns===2?[note.widthMm,note.widthMm+gap]:[],
  };
}
