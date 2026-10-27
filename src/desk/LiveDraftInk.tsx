import {useEffect,useId,useMemo,useState} from 'react';
import {englishFonts} from '../handwriting/fonts';
import type {EnglishFontId} from '../handwriting/fonts';
import {inkProgress,layoutText,strokePoint} from '../handwriting/model';
import {Pen} from '../handwriting/A5Notebook';
import {initialWriting,editWriting} from './live-ink';

interface Props {
 text:string;font:EnglishFontId;animate:boolean;visible:boolean;
 x:number;y:number;width:number;top:number;height:number;scrollX:number;scrollY:number;
}
export function LiveDraftInk({text,font,animate,visible,x,y,width,top,height,scrollX,scrollY}:Props){
 const clip=useId();
 const [writing,setWriting]=useState(()=>initialWriting(text,font,animate));
 const [now,setNow]=useState(()=>performance.now());
 if(writing.text!==text||writing.font!==font||writing.animate!==animate){
  setWriting(editWriting(writing,text,font,animate,performance.now()));
 }
 const glyphs=useMemo(()=>layoutText(text,x,y,width,4.1,5.2,englishFonts[font].data),[text,x,y,width,font]);
 const paths=useMemo(()=>writing.letters.flatMap((letter,index)=>{
  const glyph=glyphs.find(g=>g.index===index);if(!glyph)return [];
  const parts=englishFonts[font].data[letter.char]?.strokes??[],length=parts.reduce((n,p)=>n+p.length,0);
  let offset=0;
  return parts.map((part,i)=>{
   const timing=writing.starts[letter.id],share=part.length/(length||1);
   const result={...part,x:glyph.x,y:glyph.y,scale:glyph.scale,start:timing?timing.start+offset*timing.duration:0,duration:timing?share*timing.duration:1,phase:'writing' as const,width:.2/glyph.scale,color:'#383A3D',key:font+':'+letter.id+':'+i};
   offset+=share;return result;
  });
 }),[writing,glyphs,font]);
 useEffect(()=>{
  if(!writing.end)return;
  let frame=0;
  const tick=(t:number)=>{setNow(t);if(t<writing.end)frame=requestAnimationFrame(tick);};
  frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
 },[writing.end]);
 const active=animate?paths.find(p=>now<p.start+p.duration):undefined;
 const point=active?strokePoint(active,Math.max(0,(now-active.start)/active.duration)):null;
 const pen=point&&point.y-scrollY>=top&&point.y-scrollY<=top+height?point:null;
 return <svg className="live-draft-ink" viewBox="0 0 148 210" aria-hidden="true" data-testid="live-draft-ink" data-visible={visible} data-pending={!!active} style={{visibility:visible?'visible':'hidden'}}>
  <defs><clipPath id={clip}><rect x={x} y={top} width={width} height={height}/></clipPath></defs>
  <g clipPath={'url(#'+clip+')'}><g transform={'translate('+(-scrollX)+' '+(-scrollY)+')'}>
   {paths.map(p=>{const progress=animate?inkProgress((now-p.start)/p.duration):1;return <path key={p.key} data-ink-key={p.key} d={p.d} transform={'translate('+p.x+' '+p.y+') scale('+p.scale+')'} visibility={progress===0?'hidden':'visible'} fill="none" stroke={p.color} strokeWidth={p.width} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={p.length+' '+p.length} strokeDashoffset={p.length*(1-progress)}/>;})}
  </g></g>
  {pen&&visible&&<g data-testid="live-draft-pen" transform={'translate('+(-scrollX)+' '+(-scrollY)+')'}><Pen {...pen}/></g>}
 </svg>;
}
