import {createA5Layout,createA5Scene,A5} from '../handwriting/a5-layout';
import type {A5Layout} from '../handwriting/a5-layout';
import {studySample} from '../handwriting/study-content';
import type {CopyRecord,DeskDisplay} from './core';

// Allocate the complete lesson before hiding ink. Presentation never changes row allocation.
export function deskLayout(record:CopyRecord,display:DeskDisplay,personalEditing=false) {
 const content={...studySample,personal:record.personal|| (personalEditing?' ':''),vocabulary:studySample.vocabulary.map(v=>({...v,checked:record.checks[v.id]??false}))};
 return createA5Layout(content,display,{english:display.english,japanese:display.japanese});
}
export function confirmedLayout(layout:A5Layout,record:CopyRecord,display:DeskDisplay,personalEditing=false):A5Layout {
 const ids=new Set(record.entries.map(e=>e.sentenceId)),annotations=new Set<string>(),markers=new Set<string>();
 for(const s of layout.source.sentences)if(ids.has(s.id)){
  for(const g of s.glosses??[]){annotations.add(g.id);markers.add(g.id);}
  for(const f of s.footnotes??[])annotations.add(f.id);
 }
 const words=new Set(layout.source.vocabulary.map(v=>v.id));
 const studyVisible=record.phase==='complete';
 return {...layout,pages:layout.pages.map(p=>({...p,
  runs:p.runs.filter(r=>r.layer==='base'||ids.has(r.sourceId)||annotations.has(r.sourceId)||
   (r.layer==='personal'&&!!record.personal&&!personalEditing)||
   (r.layer==='study'&&studyVisible&&(r.id==='personal-heading'||(display.vocabulary&&(words.has(r.sourceId)||r.id.startsWith('words-heading')))||(display.grammar&&(r.sourceId===layout.source.grammar?.id||r.id==='pattern-heading'))))),
  markers:p.markers.filter(m=>[...markers].some(id=>m.id.startsWith(id+':'))),
  boxes:studyVisible&&display.vocabulary?p.boxes:[],
 }))};
}
export function inputPosition(layout:A5Layout,record:CopyRecord,personal:boolean) {
 const id=personal?'personal-user':studySample.sentences[record.index].id;
 const page=layout.pages.find(p=>p.runs.some(r=>r.sourceId===id))!;
 const runs=page.runs.filter(r=>r.sourceId===id),first=runs[0];
 const width=(personal?148-layout.right:layout.mainRight)-layout.left-1;
 const next=page.runs.filter(r=>r.layer==='study'&&r.y>first.y).sort((a,b)=>a.y-b.y)[0];
 const bottom=Math.min(A5.first+(A5.rows-1)*A5.pitch+1,next?next.y-5.2:Infinity);
 return {page:page.index,x:layout.left,y:first.y,width,rows:Math.max(1,Math.floor((bottom-first.y)/A5.pitch)+1)};
}
export function practiceScene(layout:A5Layout,animateId:string|null) {
 const scene=createA5Scene(layout,true);
 if(!animateId)return {...scene,strokes:scene.strokes.map(s=>({...s,start:0,duration:1})),duration:1,memoStart:0};
 const sentence=layout.source.sentences.find(s=>s.id===animateId);
 const ids=[animateId,...(sentence?.glosses??[]).map(g=>g.id),...(sentence?.footnotes??[]).map(f=>f.id)];
 let clock=0;
 const strokes=scene.strokes.map(s=>{
  if(!ids.some(id=>s.id.startsWith(id+':')))return {...s,start:0,duration:1};
  const result={...s,start:clock};clock+=s.duration+5;return result;
 });
 return {...scene,strokes:strokes.sort((a,b)=>a.start-b.start),duration:clock+1,memoStart:0,memoStarts:Object.fromEntries((sentence?.glosses??[]).map(g=>[g.id,clock]))};
}
