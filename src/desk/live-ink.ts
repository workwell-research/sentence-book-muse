import {emptyPersonal,reconcilePersonal} from '../handwriting/personal';
import type {PersonalText} from '../handwriting/personal';
import type {EnglishFontId} from '../handwriting/fonts';

export interface LiveWriting extends PersonalText {
 font:EnglishFontId;
 animate:boolean;
 starts:Record<number,{start:number;duration:number}>;
 end:number;
}
export function initialWriting(text:string,font:EnglishFontId,animate:boolean):LiveWriting {
 return {...reconcilePersonal(emptyPersonal,text),font,animate,starts:{},end:0};
}
// Finish the prior keystroke before starting this edit: fast typing never builds a queue.
// Restored drafts, face changes, composition and large pastes appear immediately.
export function editWriting(previous:LiveWriting,text:string,font:EnglishFontId,animate:boolean,now:number):LiveWriting {
 const next=reconcilePersonal(previous,text),oldIds=new Set(previous.letters.map(l=>l.id));
 const added=next.letters.filter(l=>!oldIds.has(l.id));
 const starts:LiveWriting['starts']={};
 let end=0;
 if(animate&&previous.animate&&font===previous.font&&added.length<=6){
  const duration=Math.min(160,300/Math.max(1,added.length));
  added.forEach((letter,i)=>{starts[letter.id]={start:now+i*duration,duration};end=now+(i+1)*duration;});
 }
 return {...next,font,animate,starts,end};
}
