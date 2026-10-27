import {z} from 'zod';
import type {StudyContent} from '../handwriting/study-content';

export const themes=['pure-white','natural','walnut'] as const;
export type DeskTheme=typeof themes[number];
export const markerIds=['blue','pink','purple','gray','orange','green'] as const;
export const displayKey='sentence-book-muse:desk-display:v1';
export const practiceKey='sentence-book-muse:sample-copy:v1';
export const displaySchema=z.object({
 version:z.literal(1),theme:z.enum(themes),marker:z.enum(markerIds),timerVisible:z.boolean(),timerMinutes:z.number().int().min(1).max(120),
 english:z.enum(['readability','tech','print','pen']),japanese:z.enum(['klee','zen']),
 memos:z.enum(['shown','blank']),markers:z.boolean(),vocabulary:z.boolean(),grammar:z.boolean(),
 content:z.enum(['study-notes','sentences-only']),sheet:z.enum(['A5','A4']),side:z.enum(['left','right']),binding:z.union([z.literal(12),z.literal(18),z.literal(24)]),printMarkers:z.boolean().nullable(),
});
export type DeskDisplay=z.infer<typeof displaySchema>;
export const defaultDisplay:DeskDisplay={version:1,theme:'pure-white',marker:'blue',timerVisible:true,timerMinutes:25,english:'readability',japanese:'klee',memos:'shown',markers:true,vocabulary:true,grammar:true,content:'study-notes',sheet:'A5',side:'left',binding:18,printMarkers:null};
export const practiceSchema=z.object({version:z.literal(1),lessonId:z.string(),source:z.string(),index:z.number().int().nonnegative(),phase:z.enum(['editing','confirmed','complete']),draft:z.string(),entries:z.array(z.object({sentenceId:z.string(),text:z.string(),confirmedAt:z.string()})),checks:z.record(z.string(),z.boolean()),personal:z.string(),personalDraft:z.string()});
export type CopyRecord=z.infer<typeof practiceSchema>;
const fingerprint=(lesson:StudyContent)=>JSON.stringify(lesson.sentences.map(s=>[s.id,s.text]));
export const emptyCopy=(lesson:StudyContent):CopyRecord=>({version:1,lessonId:lesson.id,source:fingerprint(lesson),index:0,phase:'editing',draft:'',entries:[],checks:{},personal:'',personalDraft:''});
export function validCopy(record:CopyRecord,lesson:StudyContent){
 const expected=record.phase==='editing'?record.index:record.phase==='confirmed'?record.index+1:lesson.sentences.length;
 return record.personal.length<=80&&!record.personal.includes("\n")&&/^[ -~]*$/.test(record.personal)&&record.lessonId===lesson.id&&record.source===fingerprint(lesson)&&record.entries.length===expected&&record.index<lesson.sentences.length&&record.entries.every((v,i)=>v.sentenceId===lesson.sentences[i].id&&v.text===lesson.sentences[i].text)&&(!(record.phase==='confirmed')||record.draft===lesson.sentences[record.index].text)&&(!(record.phase==='complete')||record.index===lesson.sentences.length-1);
}
export function confirmCopy(record:CopyRecord,lesson:StudyContent,now:string):CopyRecord {
 if(record.phase!=='editing'||!validCopy(record,lesson))throw new Error('学習状態を確認してください。入力は残っています。');
 const current=lesson.sentences[record.index];
 if(record.draft!==current.text)throw new Error('お手本と異なる箇所があります。大文字・句読点・空白も確認してください。');
 return {...record,phase:'confirmed',entries:[...record.entries,{sentenceId:current.id,text:record.draft,confirmedAt:now}]};
}
export function nextCopy(record:CopyRecord,lesson:StudyContent):CopyRecord {
 if(record.phase!=='confirmed')return record;
 return record.index===lesson.sentences.length-1?{...record,phase:'complete'}:{...record,index:record.index+1,phase:'editing',draft:''};
}
export function readSaved<T>(key:string,schema:z.ZodType<T>,fallback:T,valid:(x:T)=>boolean=()=>true):{value:T;blocked:boolean;message:string}{
 try {const raw=localStorage.getItem(key);if(!raw)return{value:fallback,blocked:false,message:''};const parsed=schema.safeParse(JSON.parse(raw));if(!parsed.success||!valid(parsed.data))throw new Error();return{value:parsed.data,blocked:false,message:''};}
 catch{return{value:fallback,blocked:true,message:'保存済みデータを読み込めませんでした。元の内容を保つため、上書き保存を止めています。'};}
}
export function saveRecord(key:string,value:unknown,blocked:boolean){
 if(blocked)throw new Error('保存済みデータを保護中です。この画面の入力は残っています。');
 try{localStorage.setItem(key,JSON.stringify(value));}catch{throw new Error('保存できませんでした。入力は残っています。空き容量やブラウザの保存設定を確認してください。');}
}
export type TimerState={state:'idle'|'running'|'paused'|'finished';remaining:number;deadline:number|null};
export const idleTimer=(minutes:number):TimerState=>({state:'idle',remaining:minutes*60_000,deadline:null});
export function timerAt(timer:TimerState,now:number):TimerState {
 if(timer.state!=='running'||timer.deadline===null)return timer;
 const remaining=Math.max(0,timer.deadline-now);return remaining?{...timer,remaining}:{state:'finished',remaining:0,deadline:null};
}
export function toggleTimer(timer:TimerState,now:number,minutes:number):TimerState {
 const t=timerAt(timer,now);if(t.state==='running')return{state:'paused',remaining:t.remaining,deadline:null};
 const remaining=t.state==='finished'?minutes*60_000:t.remaining;return{state:'running',remaining,deadline:now+remaining};
}
