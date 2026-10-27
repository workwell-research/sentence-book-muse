import { palettes } from './palettes';
import type { InkPalette } from './palettes';
import { fontData } from './font-data';
import type { StrokeFont } from './fonts';
import { svgPathProperties } from 'svg-path-properties';

export type Phase = 'writing' | 'marking' | 'annotating';
export interface Glyph { char: string; index: number; x: number; y: number; scale: number; advance: number; }
export interface Stroke {
  d: string; length: number; x: number; y: number; scale: number;
  start: number; duration: number; phase: Phase; width: number; color: string;
}
export interface NoteContent { title: string; body: string; phrase: string; annotation: string; personal: string; date: string; }
export interface NoteLayout {
  width: number; height: number; strokes: Stroke[]; duration: number;
  body: Glyph[]; personal: Glyph[]; personalTop: number; ruleStart: number;
  left: number; right: number; lineHeight: number; content: NoteContent;
}
export const sampleNote: Omit<NoteContent, 'personal' | 'date'> = {
  title: 'Small things, slowly.',
  body: 'Today, I am making time for the little things. A quiet morning. A warm cup. One page, just for me.',
  phrase: 'making time for',
  annotation: 'make time for = find a moment for',
};
export const supported = (text: string, font:StrokeFont=fontData) => [...text].every(c => !!font[c] || c === '\n');
export const unsupported = (text: string, font:StrokeFont=fontData) => [...new Set([...text].filter(c => !font[c] && c !== '\n'))].join(' ');
const advance = (char: string, scale: number, font:StrokeFont) => (font[char]?.advance ?? 100) * scale;

export function layoutText(text: string, x: number, y: number, width: number, size: number, lineHeight: number, font:StrokeFont=fontData): Glyph[] {
  const scale = size / 200;
  const glyphs: Glyph[] = [];
  let cursor = x, baseline = y, index = 0;
  for (const word of text.split(/(\s+)/)) {
    const wordWidth = [...word].reduce((n,c) => n + advance(c,scale,font),0);
    if (!/^\s*$/.test(word) && cursor > x && cursor + wordWidth > x + width) {
      cursor = x; baseline += lineHeight;
    }
    for (const char of word) {
      if (char === '\n') { cursor = x; baseline += lineHeight; index++; continue; }
      const a = advance(char,scale,font);
      if (cursor + a > x + width && char !== ' ') { cursor = x; baseline += lineHeight; }
      glyphs.push({char,index,x:cursor,y:baseline,scale,advance:a});
      cursor += a; index++;
    }
  }
  return glyphs;
}

export function createNote(content: NoteContent, width: number, options: {left?:number;right?:number;palette?:InkPalette} = {}): NoteLayout {
  const ink = options.palette ?? palettes.green;
  const left = options.left ?? (width < 450 ? 30 : 64);
  const right = options.right ?? (width < 450 ? 26 : 46);
  const inner = width - left - right;
  const small = width < 450;
  const lineHeight = small ? 49 : 59;
  const size = small ? 38 : 47;
  const title = layoutText(content.title,left,small?115:133,inner,small?39:55,lineHeight);
  const titleBottom = title.at(-1)?.y ?? 133;
  const bodyTop = titleBottom + lineHeight * 1.55;
  const body = layoutText(content.body,left,bodyTop,inner,size,lineHeight);
  const bottom = body.at(-1)?.y ?? bodyTop;
  const annotation = layoutText(content.annotation,left+7,bottom+lineHeight*1.55,inner-7,small?27:32,38);
  const personalTop = (annotation.at(-1)?.y ?? bottom) + 90;
  const personal = layoutText(content.personal,left,personalTop,inner,small?34:41,lineHeight);
  const height = Math.max(small?770:820,(personal.at(-1)?.y ?? personalTop)+126);
  const strokes: Stroke[] = [];
  let clock = 400;
  function addGlyphs(glyphs: Glyph[],phase:Phase,color:string) {
    let prev: Glyph | undefined;
    for (const glyph of glyphs) {
      if (prev && glyph.y !== prev.y) clock += 240;
      if (glyph.char === ' ') clock += 76;
      for (const part of fontData[glyph.char]?.strokes ?? []) {
        // Distance gives the base pace; slow starts and corners come from the motion curve.
        const duration = Math.max(45,part.length*glyph.scale*3.1);
        strokes.push({...part,x:glyph.x,y:glyph.y,scale:glyph.scale,start:clock,duration,phase,width:phase==='annotating'?4.9:5.3,color});
        clock += duration + 23;
      }
      if (/[.,!?]/.test(glyph.char)) clock += 180;
      prev = glyph;
    }
  }
  addGlyphs(title,'writing',ink.title);
  clock += 300;
  addGlyphs(body,'writing',ink.body);
  clock += 420;
  const start = content.body.indexOf(content.phrase);
  if (start >= 0) {
    const selected = body.filter(g => g.index >= start && g.index < start + content.phrase.length);
    const rows = [...new Set(selected.map(g=>g.y))];
    for (const y of rows) {
      const row = selected.filter(g=>g.y===y && g.char!==' ');
      if(!row.length) continue;
      const x1 = row[0].x-2, x2 = row.at(-1)!.x+row.at(-1)!.advance;
      strokes.push({d:'M '+x1+' '+(y-6)+' L '+x2+' '+(y-7),length:x2-x1,x:0,y:0,scale:1,start:clock,duration:600,phase:'marking',width:small?14:17,color:ink.marker});
      clock += 760;
    }
  }
  clock += 270;
  addGlyphs(annotation,'annotating',ink.annotation);
  return {width,height,strokes,duration:clock+250,body,personal,personalTop,ruleStart:bodyTop+8,left,right,lineHeight,content};
}

const properties = new Map<string,InstanceType<typeof svgPathProperties>>();
function geometry(d:string) {
  let value = properties.get(d);
  if (!value) { value = new svgPathProperties(d); properties.set(d,value); }
  return value;
}
// Monotonic variable velocity: a gentle start/end with a quicker middle, no backwards ink.
export function inkProgress(progress:number) {
  const t = Math.max(0,Math.min(1,progress));
  return t - 0.105 * Math.sin(2*Math.PI*t);
}
export function strokePoint(stroke:Stroke,progress:number) {
  const p=geometry(stroke.d).getPointAtLength(stroke.length*inkProgress(progress));
  return {x:stroke.x+p.x*stroke.scale,y:stroke.y+p.y*stroke.scale};
}
export function penPosition(strokes:Stroke[],elapsed:number,lift=8) {
  const nextIndex=strokes.findIndex(s=>elapsed<s.start+s.duration);
  if (nextIndex<0) return null;
  const next=strokes[nextIndex];
  if (elapsed>=next.start) return {...strokePoint(next,(elapsed-next.start)/next.duration),down:true,marker:next.phase==='marking'};
  const prev=strokes[nextIndex-1];
  if (!prev) return {...strokePoint(next,0),down:false,marker:false};
  const from=strokePoint(prev,1),to=strokePoint(next,0);
  const t=Math.min(1,Math.max(0,(elapsed-prev.start-prev.duration)/(next.start-prev.start-prev.duration)));
  const eased=t*t*(3-2*t);
  return {x:from.x+(to.x-from.x)*eased,y:from.y+(to.y-from.y)*eased-lift*Math.sin(Math.PI*t),down:false,marker:next.phase==='marking'};
}
export function currentPhase(note:Pick<NoteLayout,'strokes'|'duration'>,time:number): Phase|'complete' {
  if(time>=note.duration) return 'complete';
  return note.strokes.find(s=>time<s.start+s.duration)?.phase ?? 'annotating';
}
export function personalStrokes(glyphs:Glyph[]): Stroke[] {
  return glyphs.flatMap(g => (fontData[g.char]?.strokes ?? []).map(p=>({...p,x:g.x,y:g.y,scale:g.scale,start:0,duration:160,phase:'writing' as const,width:5.2,color:'#4f6052'})));
}
