import { useEffect,useMemo,useState } from 'react';
import { fontData } from './font-data';
import { emptyPersonal,reconcilePersonal } from './personal';
import { strokePoint } from './model';
import type { Glyph,Stroke } from './model';

export function usePersonalInk(text:string,glyphs:Glyph[],reduced:boolean) {
 const [model,setModel]=useState(emptyPersonal);
 const [progress,setProgress]=useState<Record<string,number>>({});
 const [paused,setPaused]=useState(false);
 if(model.text!==text) setModel(reconcilePersonal(model,text));
 const strokes=useMemo(()=>model.text!==text?[]:model.letters.flatMap((letter,index)=>{
   const glyph=glyphs[index];
   if(!glyph)return [];
   return (fontData[letter.char]?.strokes??[]).map((part,i)=>({
     ...part,x:glyph.x,y:glyph.y,scale:glyph.scale,start:0,
     duration:Math.max(32,Math.min(105,part.length*glyph.scale*2.1)),
     phase:'writing' as const,width:5.2,color:'#4f6052',key:letter.id+':'+i,
   }));
 }),[model,text,glyphs]);
 const pending=strokes.some(s=>(progress[s.key]??0)<1);
 useEffect(()=>{
   setPaused(false);
   const keys=new Set(strokes.map(s=>s.key));
   setProgress(old=>Object.fromEntries(Object.entries(old).filter(([key])=>keys.has(key))));
 },[model]);
 useEffect(()=>{
   if(reduced){setProgress(Object.fromEntries(strokes.map(s=>[s.key,1])));return;}
   if(paused||!pending||!strokes.length)return;
   let frame=0,previous=0;
   const tick=(now:number)=>{
     const delta=previous?Math.min(50,now-previous):0;previous=now;
     setProgress(old=>{
       let budget=delta;
       const next={...old};
       for(const s of strokes) {
         const value=next[s.key]??0;
         if(value>=1)continue;
         const spend=Math.min(budget,(1-value)*s.duration);
         next[s.key]=Math.min(1,value+spend/s.duration);
         budget-=spend;
         if(budget<=0)break;
       }
       return next;
     });
     frame=requestAnimationFrame(tick);
   };
   frame=requestAnimationFrame(tick);
   return ()=>cancelAnimationFrame(frame);
 },[strokes,reduced,paused,pending]);
 const active=strokes.find(s=>(progress[s.key]??0)<1);
 const pen=active&&!paused&&!reduced?strokePoint(active,progress[active.key]??0):null;
 return {
   paths:strokes.map(s=>({stroke:s as Stroke,key:s.key,time:(progress[s.key]??0)*s.duration})),
   pen,pending:pending&&!reduced,paused,
   toggle:()=>setPaused(v=>!v),
   finish:()=>setProgress(Object.fromEntries(strokes.map(s=>[s.key,1]))),
 };
}
