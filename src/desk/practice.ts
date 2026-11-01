import {z} from 'zod';
import type {StudyContent} from '../handwriting/study-content';

// The four passes after Copy (owner-approved 10/29 prototype). Copy keeps its own record; these never touch it.
export const practiceSteps=['Copy','Shadowing','Dictation','Reconstruction','Speaking'] as const;
export type PassId='shadowing'|'dictation'|'reconstruction'|'speaking';
export const passIds:readonly PassId[]=['shadowing','dictation','reconstruction','speaking'];
export const passOf=(step:number):PassId|null=>step>0?passIds[step-1]??null:null;
export const writes=(pass:PassId)=>pass==='dictation'||pass==='reconstruction';

export const practiceKey=(lessonId:string)=>'sentence-book-muse:practice:v1:'+lessonId;
const index=z.number().int().nonnegative();
const written=z.array(z.string().max(500).nullable()).max(40);
export const practiceSchema=z.object({
 version:z.literal(1),lessonId:z.string(),source:z.string(),step:z.number().int().min(0).max(4),
 pos:z.object({shadowing:index,dictation:index,reconstruction:index,speaking:index}).partial(),
 phase:z.object({dictation:z.enum(['write','check']),reconstruction:z.enum(['write','check']),speaking:z.enum(['answer','sample'])}).partial(),
 // Reconstruction lines reviewed by the model: a verdict, maybe a more natural phrasing, one short note (null = not reviewed).
 reviews:z.object({reconstruction:z.array(z.object({verdict:z.enum(['fine','unclear']),natural:z.string().max(200).nullable(),note:z.string().max(240).nullable()}).nullable()).max(40)}).partial().default({}),
 written:z.object({dictation:written,reconstruction:written}),
 drafts:z.object({dictation:z.string().max(500),reconstruction:z.string().max(500)}).partial(),
 done:z.object({shadowing:z.array(index).max(40),speaking:z.array(index).max(40)}),
 finished:z.object({shadowing:z.string(),dictation:z.string(),reconstruction:z.string(),speaking:z.string()}).partial(),
});
export type PracticeRecord=z.infer<typeof practiceSchema>;
const fingerprint=(lesson:StudyContent)=>JSON.stringify(lesson.sentences.map(s=>[s.id,s.text]));
export const emptyPractice=(lesson:StudyContent):PracticeRecord=>({version:1,lessonId:lesson.id,source:fingerprint(lesson),step:0,pos:{},phase:{},written:{dictation:[],reconstruction:[]},drafts:{},reviews:{},done:{shadowing:[],speaking:[]},finished:{}});

// An unreadable record is left untouched (blocked) rather than overwritten; a record for other sentences starts over.
export function readPractice(storage:Pick<Storage,'getItem'>,lesson:StudyContent):{record:PracticeRecord;blocked:boolean} {
 let raw:string|null;
 try{raw=storage.getItem(practiceKey(lesson.id));}catch{return {record:emptyPractice(lesson),blocked:true};}
 if(raw===null)return {record:emptyPractice(lesson),blocked:false};
 try{
  const parsed=practiceSchema.safeParse(JSON.parse(raw));
  if(!parsed.success)return {record:emptyPractice(lesson),blocked:true};
  return {record:parsed.data.source===fingerprint(lesson)?parsed.data:emptyPractice(lesson),blocked:false};
 }catch{return {record:emptyPractice(lesson),blocked:true};}
}
export function savePractice(storage:Pick<Storage,'setItem'>,record:PracticeRecord) {
 storage.setItem(practiceKey(record.lessonId),JSON.stringify(record));
}

export const itemCount=(pass:PassId,lesson:StudyContent)=>pass==='speaking'?(lesson.questions?.length??0):lesson.sentences.length;
export const positionOf=(record:PracticeRecord,pass:PassId)=>record.pos[pass]??0;
export const phaseOf=(record:PracticeRecord,pass:PassId)=>(pass==='dictation'||pass==='reconstruction')?record.phase[pass]??'write':'write';
// Speaking: hear the question and answer aloud, then hear the sample answer; two Enters per question.
export const speakingPhaseOf=(record:PracticeRecord)=>record.phase.speaking??'answer';
export type LineReview=NonNullable<PracticeRecord['reviews']['reconstruction']>[number];
export function setReview(record:PracticeRecord,index:number,review:LineReview):PracticeRecord {
 const next=structuredClone(record);const lines=[...(next.reviews.reconstruction??[])];while(lines.length<index)lines.push(null);lines[index]=review;
 next.reviews={...next.reviews,reconstruction:lines};return next;
}

// Enter moves a pass along: a written line is checked first, then the next item; the last item finishes the pass.
export function advance(record:PracticeRecord,lesson:StudyContent,typed:string,now=new Date()):{record:PracticeRecord;moved:'checked'|'next'|'finished'|'none'} {
 const pass=passOf(record.step);if(!pass||record.finished[pass])return {record,moved:'none'};
 const i=positionOf(record,pass),n=itemCount(pass,lesson);if(!n)return {record,moved:'none'};
 const next:PracticeRecord=structuredClone(record);
 if(pass==='dictation'||pass==='reconstruction') {
  if(phaseOf(record,pass)==='write') {
   const text=typed.trim();if(!text)return {record,moved:'none'};
   const lines=[...next.written[pass]];lines[i]=text;next.written[pass]=lines;
   delete next.drafts[pass];next.phase[pass]='check';
   return {record:next,moved:'checked'};
  }
  next.phase[pass]='write';
 } else if(pass==='speaking') {
  if(speakingPhaseOf(record)==='answer'){if(!next.done.speaking.includes(i))next.done.speaking=[...next.done.speaking,i];next.phase.speaking='sample';return {record:next,moved:'checked'};}
  next.phase.speaking='answer';
 } else if(pass==='shadowing'&&!next.done.shadowing.includes(i))next.done.shadowing=[...next.done.shadowing,i];
 if(i+1>=n){next.finished[pass]=now.toISOString();return {record:next,moved:'finished'};}
 next.pos[pass]=i+1;
 return {record:next,moved:'next'};
}
export function restartPass(record:PracticeRecord,pass:PassId):PracticeRecord {
 const next:PracticeRecord=structuredClone(record);
 delete next.finished[pass];next.pos[pass]=0;
 if(pass==='dictation'||pass==='reconstruction'){next.phase[pass]='write';next.written[pass]=[];delete next.drafts[pass];if(pass==='reconstruction')next.reviews={...next.reviews,reconstruction:[]};}
 else {next.done[pass]=[];if(pass==='speaking')delete next.phase.speaking;}
 return next;
}

// Dictation check: words of the model that the learner did not write (longest common subsequence of words).
const words=(text:string)=>text.toLowerCase().replace(/[’]/g,"'").replace(/[^a-z0-9'\s-]/g,'').split(/\s+/).filter(Boolean);
export function missedWords(model:string,typed:string):boolean[] {
 const a=words(model),b=words(typed);
 const L=Array.from({length:a.length+1},()=>Array<number>(b.length+1).fill(0));
 for(let i=a.length-1;i>=0;i--)for(let j=b.length-1;j>=0;j--)L[i][j]=a[i]===b[j]?L[i+1][j+1]+1:Math.max(L[i+1][j],L[i][j+1]);
 const kept=new Set<number>();
 for(let i=0,j=0;i<a.length&&j<b.length;){if(a[i]===b[j]){kept.add(i);i++;j++;}else if(L[i+1][j]>=L[i][j+1])i++;else j++;}
 return a.map((_,i)=>!kept.has(i));
}
// Dictation shows the model under a line only when the line differs from it: a missed word, or a different number of words.
// A line that matches word for word needs no second copy (owner, 2026-11-01).
export function differsFromModel(model:string,typed:string):boolean {
 return missedWords(model,typed).some(Boolean)||words(model).length!==words(typed).length;
}

// Feedback lives with Muse: these messages are copied and pasted into Muse, never sent from the app.
const ownLines=(record:PracticeRecord,lesson:StudyContent)=>lesson.sentences.flatMap((s,k)=>{const own=record.written.reconstruction[k]?.trim();return own?[{s,own}]:[];});
export function reviewRequest(record:PracticeRecord,lesson:StudyContent):string {
 const lines=ownLines(record,lesson);
 if(!lines.length)return '';
 return [`The Sentence Bookの「${lesson.title}」で、日本語を見て自分の英語を書きました。`,
  'それぞれ英語として自然かを見て、もっと自然な言い方があれば短く教えてください。意味が通じていれば、お手本と違う言い方でもかまいません。','',
  ...lines.flatMap(({s,own},k)=>[`${k+1}. 日本語：${s.meaning}`,`   自分の英語：${own}`,`   お手本：${s.text}`])].join('\n');
}
export function talkRequest(record:PracticeRecord,lesson:StudyContent):string {
 const questions=lesson.questions??[];
 if(!questions.length)return '';
 const own=ownLines(record,lesson);
 return [`The Sentence Bookの「${lesson.title}」の問いで、英語で話す練習をしたいです。`,
  '音声で、問いを1つずつ英語で聞いてください。私が答えたら、ひと言返して、もう少し話せるように聞き返してください。言い間違いは、話し終わってからまとめて教えてください。','',
  '問い：',...questions.map((q,k)=>`${k+1}. ${q.en}`),
  ...(own.length?['','今日、自分で書いた英文（話すときに使ってみたい）：',...own.map(({own})=>'- '+own)]:[])].join('\n');
}
