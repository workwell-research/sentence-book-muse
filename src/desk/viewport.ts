import {layoutText} from '../handwriting/model';
import type {StrokeFont} from '../handwriting/fonts';

/** Smallest scroll needed to reveal a caret with writing room around it. */
export function revealDelta(start:number,end:number,low:number,high:number,padding=24){
 const inset=Math.max(0,Math.min(padding,(high-low-(end-start))/2));
 if(start<low+inset)return start-low-inset;
 if(end>high-inset)return end-high+inset;
 return 0;
}
/** Same whole-word wrapping as the live English ink, including a trailing newline. */
export function caretOffset(text:string,selection:number,width:number,font:StrokeFont){
 const prefix=text.slice(0,selection),count=[...prefix].length;
 const glyphs=layoutText(text,0,0,width,4.1,5.2,font);
 const next=glyphs.find(g=>g.index===count);
 if(next)return {x:next.x,y:next.y};
 const previous=glyphs.filter(g=>g.index<count).at(-1);
 const trailing=prefix.match(/\n+$/)?.[0].length??0;
 return {x:trailing?0:previous?previous.x+previous.advance:0,y:(previous?.y??0)+trailing*5.2};
}
export function writingPaperHeight(viewportHeight:number,modelToPaper:number){
 return Math.max(96,Math.floor(viewportHeight-modelToPaper-32));
}
