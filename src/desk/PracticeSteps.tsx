import {useEffect,useRef,useState} from 'react';
import type {CSSProperties,ReactNode} from 'react';
import type {StudyContent} from '../handwriting/study-content';
import {palettes} from '../handwriting/palettes';
import {chooseEnglishVoice} from './audio';
import type {DeskDisplay} from './core';
import {advance,differsFromModel,itemCount,passIds,missedWords,passOf,phaseOf,positionOf,practiceSteps,readPractice,restartPass,reviewRequest,savePractice,talkRequest,writes} from './practice';
import type {PassId,PracticeRecord} from './practice';

// The four passes after Copy. The card shows what each pass needs or lays a ruler over it; a fresh loose leaf lies over the notebook.
const wordsIn=(text:string)=>/[a-z0-9]/i.test(text);
// A ruler lies over what the pass keeps closed. It slides down a line to check and back up to hide again;
// once the pass itself opens the text, the ruler goes back to the tray. Its material follows the desk theme.
// It is a whole 15 cm ruler across the card, never cut to the sentence's length (owner, 2026-11-01).
function Ruled({text,open,label}:{text:string;open:boolean;label:string}) {
 const [slid,setSlid]=useState(false),shown=open||slid;
 return <span className={'ruled'+(shown?' is-open':'')+(open?' is-away':slid?' is-slid':'')}>
  <span className="ruled-text" aria-hidden={!shown}>{text}</span>
  <button type="button" className="ruler" aria-label={slid?'定規で隠す':label} aria-pressed={slid} tabIndex={open?-1:0} onClick={()=>setSlid(v=>!v)}>
   <span className="ruler-scale" aria-hidden="true">{Array.from({length:15},(_,n)=><i key={n} style={{left:(n+1)*6.25+'%'}}>{n+1}</i>)}</span>
  </button>
 </span>;
}
function Marked({model,typed}:{model:string;typed:string}) {
 const missed=missedWords(model,typed);let k=0;
 return <>{model.split(/(\s+)/).map((part,i)=>{if(!part||/^\s+$/.test(part)||!wordsIn(part))return part;return missed[k++]?<mark key={i}>{part}</mark>:part;})}</>;
}

export function usePractice({lesson,display,handFamily,onWriting,onLeaveCopy,onReturnToCopy}:{
 lesson:StudyContent;display:DeskDisplay;handFamily:string;onWriting:()=>void;onLeaveCopy:()=>void;onReturnToCopy:()=>void;
}) {
 const [loaded]=useState(()=>readPractice(localStorage,lesson));
 const [record,setRecord]=useState<PracticeRecord>(loaded.record);
 // Enter can arrive twice before a re-render; the refs always hold the latest record and draft.
 const latest=useRef(loaded.record);
 const [notice,setNotice]=useState(loaded.blocked?'保存した練習の記録を読み込めませんでした。元の記録を守るため、今回の練習は保存しません。':'');
 const [slow,setSlow]=useState(false),[open,setOpen]=useState(false),[speaking,setSpeaking]=useState(false),[said,setSaid]=useState(-1),[copied,setCopied]=useState('');
 const [draft,setDraftState]=useState(()=>{const p=passOf(loaded.record.step);return p&&writes(p)?loaded.record.drafts[p as 'dictation'|'reconstruction']??'':'';});
 const typed=useRef(draft);
 const setDraft=(value:string)=>{typed.current=value;setDraftState(value);};
 const input=useRef<HTMLTextAreaElement>(null),paper=useRef<HTMLDivElement>(null),current=useRef<HTMLLIElement>(null);
 const pass=passOf(record.step),step=record.step;
 const persist=(next:PracticeRecord)=>{latest.current=next;setRecord(next);if(loaded.blocked)return;try{savePractice(localStorage,next);}catch{setNotice('練習の記録を保存できませんでした。この画面を閉じると、今回の進み具合は消えます。');}};
 const hush=()=>{window.speechSynthesis?.cancel();setSpeaking(false);setSaid(-1);};
 function speak(text:string,follow=false) {
  const engine=window.speechSynthesis;if(!engine)return;
  engine.cancel();
  const u=new SpeechSynthesisUtterance(text),v=chooseEnglishVoice(engine.getVoices(),display.voice);
  if(v){u.voice=v;u.lang=v.lang;}else u.lang='en-US';
  u.rate=display.speechRate*(slow?.8:1);
  if(follow)u.onboundary=e=>{if(e.name==='word')setSaid(e.charIndex);};
  u.onend=u.onerror=()=>{setSpeaking(false);setSaid(-1);};
  setSpeaking(true);setSaid(-1);engine.speak(u);
 }
 const item=(p:PassId)=>Math.min(positionOf(record,p),Math.max(0,itemCount(p,lesson)-1));
 const play=(p=pass)=>{
  if(!p||p==='reconstruction')return;
  const i=item(p);
  if(p==='speaking'){const q=lesson.questions?.[i];if(q)speak(q.en);}
  else speak(lesson.sentences[i].text,p==='shadowing');
 };
 const focusWork=()=>requestAnimationFrame(()=>{const p=passOf(record.step);if(!p)return;(p&&writes(p)&&phaseOf(record,p)==='write'&&!record.finished[p]?input.current:paper.current)?.focus({preventScroll:true});});
 function choose(next:number) {
  hush();setSlow(false);setOpen(false);setCopied('');
  const rec={...latest.current,step:next};persist(rec);
  const p=passOf(next);setDraft(p&&writes(p)?rec.drafts[p as 'dictation'|'reconstruction']??'':'');
  if(next===0){onReturnToCopy();return;}
  onLeaveCopy();
 }
 // A newly chosen pass starts by speaking, except Reconstruction, which is read.
 const lastStep=useRef(record.step);
 useEffect(()=>{
  if(lastStep.current===record.step)return;lastStep.current=record.step;
  const p=passOf(record.step);if(!p)return;
  focusWork();if(!record.finished[p])play(p);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[record.step]);
 useEffect(()=>()=>{window.speechSynthesis?.cancel();},[]);
 // The line being worked on stays in view on the sheet.
 useEffect(()=>{if(!pass)return;requestAnimationFrame(()=>{const el=current.current,box=paper.current;if(!el||!box)return;box.scrollTo({top:Math.max(0,el.offsetTop-box.clientHeight*.45),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});});},[pass,record]);

 function go() {
  const record=latest.current,pass=passOf(record.step),step=record.step;
  if(!pass)return;
  if(record.finished[pass]){if(step<4)choose(step+1);return;}
  const {record:next,moved}=advance(record,lesson,typed.current);
  if(moved==='none')return;
  persist(next);setOpen(false);
  if(moved==='checked'){hush();focusWork();return;}
  setDraft('');
  if(moved==='finished'){hush();requestAnimationFrame(()=>paper.current?.focus({preventScroll:true}));return;}
  requestAnimationFrame(()=>{input.current?.focus({preventScroll:true});});
  if(pass!=='reconstruction'){
   const i=positionOf(next,pass);
   if(pass==='speaking'){const q=lesson.questions?.[i];if(q)speak(q.en);}else speak(lesson.sentences[i].text,pass==='shadowing');
  }
 }
 // Enter moves the pass along; ⌥/Alt+R replays this pass's voice instead of the Copy sentence.
 useEffect(()=>{
  if(!pass)return;
  const onKey=(e:KeyboardEvent)=>{
   if(e.altKey&&e.code==='KeyR'&&!e.ctrlKey&&!e.metaKey){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)play();return;}
   if(e.key!=='Enter'||e.shiftKey||e.isComposing||e.repeat||e.keyCode===229)return;
   const t=e.target as HTMLElement;
   if(t===input.current||t===paper.current||t===document.body||t.closest?.('.step-card')&&t.tagName!=='BUTTON'){e.preventDefault();go();}
  };
  window.addEventListener('keydown',onKey,true);return()=>window.removeEventListener('keydown',onKey,true);
 });

 const ink=palettes[display.marker];
 const style={'--step-marker':ink.marker,'--step-pen':ink.title,'--step-hand':'"'+handFamily+'"'} as CSSProperties;
 const today=new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short'}).toUpperCase();
 const tabs=<ol className="lesson-steps" role="tablist" aria-label="学習の5ステップ">{practiceSteps.map((label,i)=><li key={label} role="presentation">
  <button type="button" role="tab" id={'learning-step-'+i} aria-selected={i===step} aria-controls={i===0?'lesson-copy':'lesson-pass'} tabIndex={i===step?0:-1}
   onClick={()=>{if(i!==step)choose(i);}}
   onKeyDown={e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const n=(i+(e.key==='ArrowRight'?1:4))%5;choose(n);requestAnimationFrame(()=>document.getElementById('learning-step-'+n)?.focus());}}>{label}</button>
 </li>)}</ol>;
 if(!pass)return {step,tabs,card:null,sheet:null,notice,choose};

 const n=itemCount(pass,lesson),i=item(pass),done=!!record.finished[pass],phase=phaseOf(record,pass);
 const name=practiceSteps[step],nextName=practiceSteps[step+1];
 const listen=(label:string)=><button type="button" className="audio-button" aria-keyshortcuts="Alt+R" onClick={()=>speaking?hush():play()}><span className="step-sound" aria-hidden="true"/>{speaking?'止める':label}<kbd aria-hidden="true">⌥ / Alt R</kbd></button>;
 // Feedback and conversation happen in Muse; the app only copies what Muse needs.
 async function toMuse(text:string,after:string) {
  try{await navigator.clipboard.writeText(text);setCopied(after);}catch{setCopied('コピーできませんでした。もう一度押してください。');}
 }
 const review=reviewRequest(record,lesson),talk=talkRequest(record,lesson);
 const museButton=pass==='reconstruction'&&review?<button type="button" className="step-muse" onClick={()=>toMuse(review,'コピーしました。Museに貼って送ってください。')}>Museに見てもらう</button>
  :pass==='speaking'&&talk?<button type="button" className="step-muse" onClick={()=>toMuse(talk,'コピーしました。Museに貼って、声で話しかけてください。')}>Museと話す</button>:null;
 const slowChip=<button type="button" className="step-chip" aria-pressed={slow} onClick={()=>{setSlow(v=>!v);}}>ゆっくり</button>;
 let body:ReactNode=null,actions:ReactNode=null,note='';
 if(done) {
  const allDone=passIds.every(p=>record.finished[p]);
  body=<><p className="model-sentence step-done">{nextName?`次は ${nextName}。`:allDone?'4つの練習が終わりました。':`${name}が終わりました。`}</p><p className="model-meaning"/></>;
  actions=<>{nextName&&<button type="button" className="step-next" onClick={()=>choose(step+1)}>{nextName}へ</button>}<button type="button" className="step-chip" onClick={()=>{persist(restartPass(record,pass));setDraft('');requestAnimationFrame(()=>{focusWork();play(pass);});}}>もう一度</button>{museButton}</>;
 } else if(!n) {
  body=<p className="model-sentence is-small">この教材には質問がありません。</p>;
 } else if(pass==='shadowing') {
  const s=lesson.sentences[i];let at=0;
  body=<><p className="model-sentence" lang="en">{s.text.split(/(\s+)/).map((part,k)=>{const start=at;at+=part.length;if(/^\s+$/.test(part)||!part)return part;return <span key={k} className={'say-word'+(said>=start&&said<start+part.length?' is-said':'')}>{part}</span>;})}</p>
   <p className={'model-meaning'+(open?'':' is-hidden')} aria-hidden={!open}>{s.meaning}</p></>;
  actions=<>{listen('音声を聞く')}{slowChip}<button type="button" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{open?'意味を閉じる':'意味を見る'}</button></>;
  note='声に出したら Enter';
 } else if(pass==='dictation') {
  const s=lesson.sentences[i],checked=phase==='check';
  body=<><p className="model-sentence" lang="en"><Ruled key={step+':'+i+':'+phase} text={s.text} open={checked} label="英文を見る"/></p><p className={'model-meaning'+(checked?'':' is-hidden')} aria-hidden={!checked}>{s.meaning}</p></>;
  actions=<>{listen('もう一度聞く')}{slowChip}</>;
  note=checked?'Enterで次の文へ':'聞こえたとおりに書く';
 } else if(pass==='reconstruction') {
  const s=lesson.sentences[i],checked=phase==='check';
  body=<><p className="model-cue">{s.meaning}</p><p className="model-sentence is-small" lang="en"><Ruled key={step+':'+i+':'+phase} text={s.text} open={checked} label="お手本を見る"/></p></>;
  actions=<>{s.hint&&<><button type="button" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{open?'ヒントを閉じる':'ヒント'}</button><em className={"step-hint"+(open?"":" is-hidden")} lang="en">{s.hint}</em></>}{checked&&listen('お手本を聞く')}{museButton}</>;
  note=checked?'違う言い方でも大丈夫。Enterで次へ':'自分の英語で書く';
 } else {
  const q=lesson.questions![i];
  body=<><p className="model-sentence is-small" lang="en"><Ruled key={step+':'+i} text={q.en} open={false} label="質問の文字を見る"/></p><p className={'model-meaning'+(open?'':' is-hidden')} aria-hidden={!open}>{q.native}</p></>;
  actions=<>{listen('質問を聞く')}<button type="button" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{open?'訳を閉じる':'訳を見る'}</button>{museButton}</>;
  note='答えたら Enter';
 }
 const card=<section className="model-card step-card" id="lesson-pass" role="tabpanel" aria-labelledby={'learning-step-'+step} style={style}>
  <div className="model-heading"><h1>{done?`${name} complete`:name}</h1><span>{done?n:Math.min(i+1,n)} / {n}</span></div>
  {body}
  <div className="model-actions">{actions}{(copied||note)&&<div className="step-note" role={copied?'status':undefined}>{copied||note}</div>}</div>
 </section>;

 let rows:ReactNode[]=[];
 if(pass==='shadowing') {
  rows=lesson.sentences.map((s,k)=><li key={s.id} ref={k===i&&!done?current:undefined} className={'step-row is-print'+(k===i&&!done?' is-current':'')+(record.done.shadowing.includes(k)?' is-said':'')}
   onClick={()=>{if(done||k===i)return;persist({...record,pos:{...record.pos,shadowing:k}});speak(s.text,true);}}><span className="row-text" lang="en">{s.text}</span></li>);
 } else if(writes(pass)) {
  const lines=record.written[pass as 'dictation'|'reconstruction'];
  lesson.sentences.forEach((s,k)=>{
   if(k>i&&!done)return;
   const typed=lines[k];
   if(k===i&&!done&&phase==='write')rows.push(<li key={s.id} ref={current} className="step-row is-current"><textarea ref={input} className="step-input" rows={1} spellCheck={false} autoCapitalize="off" autoCorrect="off" enterKeyHint="done" value={draft}
    aria-label={pass==='dictation'?`${k+1}文目を聞いて書く`:`${k+1}文目を自分の英語で書く`}
    onBeforeInput={onWriting} onChange={e=>{setDraft(e.target.value);const next=structuredClone(latest.current);next.drafts[pass as 'dictation'|'reconstruction']=e.target.value;persist(next);}}/></li>);
   else rows.push(<li key={s.id} ref={k===i&&!done?current:undefined} className="step-row"><span className="row-hand" lang="en">{typed??''}</span></li>);
   if(typed!=null&&(k<i||done||phase==='check')&&(pass!=='dictation'||differsFromModel(s.text,typed)))rows.push(<li key={s.id+':model'} className={'step-row is-model'+(pass==='reconstruction'?' is-quiet':'')}><span className="row-model" lang="en">{pass==='dictation'?<Marked model={s.text} typed={typed}/>:s.text}</span></li>);
  });
 } else {
  (lesson.questions??[]).forEach((q,k)=>{
   if(k>i&&!done)return;
   const answered=record.done.speaking.includes(k)||done;
   rows.push(<li key={q.id} ref={k===i&&!done?current:undefined} className={'step-row is-print'+(k===i&&!done?' is-current':'')+(answered?' is-said':'')}><span className="row-text" lang="en">{answered?q.en:'…'}</span></li>);
  });
  const own=record.written.reconstruction.filter((line):line is string=>!!line);
  if(own.length){rows.push(<li key="own-label" className="step-row is-label">自分で作った英文</li>);own.forEach((line,k)=>rows.push(<li key={'own-'+k} className="step-row is-own"><span className="row-hand" lang="en">{line}</span></li>));}
 }
 const sheet=<section className="step-sheet" aria-label="練習用のルーズリーフ" style={style}>
  <div className="step-paper" ref={paper} tabIndex={0}>
   <div className="step-page">
    <p className="step-meta">{name} / {today}</p>
    <p className="step-title">{lesson.title}</p>
    {done&&<div className="step-stamp" aria-label={name+' 済み'}><span>{name}</span><b>{today}</b></div>}
    <ol className="step-rows">{rows}</ol>
   </div>
  </div>
 </section>;
 return {step,tabs,card,sheet,notice,choose};
}
