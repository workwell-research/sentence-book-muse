import {z} from 'zod';
import type {StudyContent} from '../handwriting/study-content';

export const themes=['pure-white','natural','walnut'] as const;
export type DeskTheme=typeof themes[number];
export const markerIds=['blue','pink','purple','gray','orange','green'] as const;
export const displayKey='sentence-book-muse:desk-display:v1';
export const practiceKey='sentence-book-muse:sample-copy:v1';
export const displaySchema=z.object({
 version:z.literal(1),theme:z.enum(themes),marker:z.enum(markerIds),timerVisible:z.boolean(),timerMinutes:z.number().int().min(1).max(120),
 voice:z.string().min(1).default('auto'),speechRate:z.union([z.literal(.85),z.literal(1),z.literal(1.1)]).default(1),
 english:z.enum(['readability','tech','print','pen']),japanese:z.enum(['klee','zen']),
 memos:z.enum(['shown','blank']),markers:z.boolean(),vocabulary:z.boolean(),grammar:z.boolean(),
 content:z.enum(['study-notes','sentences-only']),sheet:z.enum(['A5','A4']),side:z.enum(['left','right']),binding:z.union([z.literal(12),z.literal(18),z.literal(24)]),printMarkers:z.boolean().nullable(),
 // Print every sentence as written, for a sample note; the practice record itself is left as it is.
 printFilled:z.boolean().default(false),
});
export type DeskDisplay=z.infer<typeof displaySchema>;
export const defaultDisplay:DeskDisplay={version:1,theme:'pure-white',marker:'blue',timerVisible:true,timerMinutes:25,voice:'auto',speechRate:1,english:'readability',japanese:'klee',memos:'shown',markers:true,vocabulary:true,grammar:true,content:'study-notes',sheet:'A5',side:'left',binding:18,printMarkers:null,printFilled:false};
// A line the learner drew under an expression they looked up; offsets are code points in the sentence.
export const lookupEntrySchema=z.object({id:z.string().min(1),sentenceId:z.string().min(1),start:z.number().int().nonnegative(),end:z.number().int().positive(),expression:z.string().min(1).max(120),native:z.string().min(1).max(120),note:z.string().max(200).nullable(),lookedUpAt:z.string()}).refine(v=>v.end>v.start,'A line covers at least one character');
export type LookupEntry=z.infer<typeof lookupEntrySchema>;
export const practiceSchema=z.object({version:z.literal(1),lessonId:z.string(),source:z.string(),index:z.number().int().nonnegative(),phase:z.enum(['editing','confirmed','complete']),draft:z.string(),entries:z.array(z.object({sentenceId:z.string(),text:z.string(),confirmedAt:z.string()})),checks:z.record(z.string(),z.boolean()),personal:z.string(),personalDraft:z.string(),lookups:z.array(lookupEntrySchema).max(40).default([])});
export type CopyRecord=z.infer<typeof practiceSchema>;
const fingerprint=(lesson:StudyContent)=>JSON.stringify(lesson.sentences.map(s=>[s.id,s.text]));
export const emptyCopy=(lesson:StudyContent):CopyRecord=>({version:1,lessonId:lesson.id,source:fingerprint(lesson),index:0,phase:'editing',draft:'',entries:[],checks:{},personal:'',personalDraft:'',lookups:[]});
export function validCopy(record:CopyRecord,lesson:StudyContent){
 const expected=record.phase==='editing'?record.index:record.phase==='confirmed'?record.index+1:lesson.sentences.length;
 return record.personal.length<=80&&!record.personal.includes("\n")&&/^[ -~]*$/.test(record.personal)&&record.lessonId===lesson.id&&record.source===fingerprint(lesson)&&record.entries.length===expected&&record.index<lesson.sentences.length&&record.entries.every((v,i)=>v.sentenceId===lesson.sentences[i].id&&v.text===lesson.sentences[i].text)&&(!(record.phase==='confirmed')||record.draft===lesson.sentences[record.index].text)&&(!(record.phase==='complete')||record.index===lesson.sentences.length-1);
}
export function copyMismatchMessage(draft:string,expected:string):string|null {
 if(draft===expected)return null;
 if(!draft.trim())return 'お手本の英文をノートに書いてからEnterを押してください。';
 if(/[\r\n]/.test(draft))return '入力に改行が含まれています。改行を取り除いて、Enterで次の文へ進めます。';
 if(draft.trim()===expected)return '文の先頭か末尾に余分な空白があります。空白を消してEnterを押してください。';
 if(expected.startsWith(draft))return '文の続きがあります。お手本を最後まで書いてからEnterを押してください。';
 if(draft.startsWith(expected))return '文末に余分な文字があります。お手本の終わりまでに直してEnterを押してください。';
 let index=0;while(draft[index]===expected[index])index++;
 if(/\s/.test(draft[index]??'')||/\s/.test(expected[index]??''))return `${index+1}文字目付近の空白がお手本と異なります。単語の間を確認してEnterを押してください。`;
 const word=(text:string)=>{let start=index,end=index;while(start>0&&!/\s/.test(text[start-1]))start--;while(end<text.length&&!/\s/.test(text[end]))end++;const value=text.slice(start,end);return value.length>24?value.slice(0,24)+'…':value;};
 return `「${word(draft)}」→「${word(expected)}」に直してください。直したらEnterで次の文へ。`;
}
export function confirmCopy(record:CopyRecord,lesson:StudyContent,now:string):CopyRecord {
 if(record.phase!=='editing'||!validCopy(record,lesson))throw new Error('学習状態を確認してください。入力は残っています。');
 const current=lesson.sentences[record.index];
 const mismatch=copyMismatchMessage(record.draft,current.text);if(mismatch)throw new Error(mismatch);
 return {...record,phase:'confirmed',entries:[...record.entries,{sentenceId:current.id,text:record.draft,confirmedAt:now}]};
}
export function nextCopy(record:CopyRecord,lesson:StudyContent):CopyRecord {
 if(record.phase!=='confirmed')return record;
 return record.index===lesson.sentences.length-1?{...record,phase:'complete'}:{...record,index:record.index+1,phase:'editing',draft:''};
}
/** The record as it would be once every line is copied: for printing a sample without writing it. Checks, lines and the personal note stay. */
export function completedCopy(record:CopyRecord,lesson:StudyContent,now:string):CopyRecord {
 return {...record,index:lesson.sentences.length-1,phase:'complete',draft:'',entries:lesson.sentences.map(s=>({sentenceId:s.id,text:s.text,confirmedAt:now}))};
}
/** One user action checks, records and opens the next line; legacy confirmed records stay resumable. */
export function submitCopy(record:CopyRecord,lesson:StudyContent,now:string):CopyRecord {
 if(!validCopy(record,lesson))throw new Error('学習状態を確認してください。入力は残っています。');
 if(record.phase==='complete')return record;
 return nextCopy(record.phase==='confirmed'?record:confirmCopy(record,lesson,now),lesson);
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
