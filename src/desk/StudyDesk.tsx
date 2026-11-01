import {useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import type {CSSProperties,KeyboardEvent} from 'react';
import {A5Notebook} from '../handwriting/A5Notebook';
import {englishFonts} from '../handwriting/fonts';
import {supported} from '../handwriting/model';
import {resolveDeskLesson} from '../lib/study-page';
import {addLookup,expressionOf,readWordbook,requestLookup,saveWordbookEntry,tokenize} from '../lib/lookup';
import type {LookupOutcome} from '../lib/lookup';
type LookupResult=Extract<LookupOutcome,{kind:'ready'}>['result'];
import {displayKey,displaySchema,practiceSchema,defaultDisplay,emptyCopy,validCopy,readSaved,saveRecord,submitCopy,nextCopy,markerIds,themes,idleTimer,timerAt,toggleTimer} from './core';
import type {CopyRecord,DeskDisplay,DeskTheme} from './core';
import {deskLayout,confirmedLayout,inputPosition,practiceScene,wordHits} from './note';
import type {WordHit} from './note';
import {palettes} from '../handwriting/palettes';
import '../handwriting/handwriting.css';
import './desk.css';
import {LiveDraftInk} from './LiveDraftInk';
import {audioShortcut,createLessonSpeaker,englishVoices,chooseEnglishVoice} from './audio';
import type {AudioState} from './audio';
import {caretOffset,revealDelta,writingPaperHeight} from './viewport';
import {NoteStyle,PrintPanel,TrayHandle,useDismiss} from './DeskControls';
import {usePractice} from './PracticeSteps';
import {AppHeader} from '../AppHeader';
import './practice.css';
import './desk-tray.css';
import type {ChangeDisplay} from './DeskControls';
import type {PrintSides} from '../handwriting/study-pdf';

const themeNames={'pure-white':'Pure White',natural:'Natural',walnut:'Walnut'};
const markerNames={blue:'Blue',pink:'Pink',purple:'Purple',gray:'Gray',orange:'Orange',green:'Green'};
const tabs=['My Lessons','Topic Index','My Vocabulary','Review','Completed Notes','Note Style'];
const penRows={ 'pure-white':[[64,134],[209,134],[361,136],[517,135],[677,135],[835,135]],natural:[[49,148],[205,150],[365,150],[523,151],[680,150],[838,150]],walnut:[[87,141],[231,140],[376,140],[520,141],[664,142],[808,142]]};
const penFiles={'pure-white':'white',natural:'natural',walnut:'walnut'};
const emptyInk={paths:[],pending:false,pen:null,paused:false,toggle:()=>{},finish:()=>{}};
function Icon({name}:{name:'sound'|'settings'|'check'}){
 const paths={sound:'M4 9H8L13 5V19L8 15H4ZM17 8Q22 12 17 16',settings:'M4 7H20M4 17H20M8 4V10M16 14V20',check:'M5 12L10 17L20 6'};
 return <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d={paths[name]} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function Timer({theme,visible,minutes,change}:{theme:DeskTheme;visible:boolean;minutes:number;change:ChangeDisplay}) {
 const [timer,setTimer]=useState(()=>idleTimer(minutes)),[announcement,setAnnouncement]=useState('');
 const [sheet,setSheet]=useState(false),space=useRef<HTMLDivElement>(null);
 useDismiss(sheet,()=>setSheet(false),space);
 useEffect(()=>{if(timer.state!=='running')return;const id=setInterval(()=>setTimer(t=>timerAt(t,Date.now())),250);return()=>clearInterval(id);},[timer.state]);
 useEffect(()=>{if(timer.state==='finished')setAnnouncement('タイマーが終了しました。');},[timer.state]);
 // A new length shows at once on a timer that has not started; a running one keeps its deadline.
 useEffect(()=>{setTimer(t=>t.state==='idle'?idleTimer(minutes):t);},[minutes]);
 const seconds=Math.ceil(timer.remaining/1000),digits=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
 const crop=theme==='pure-white'?'16 208 564 502':theme==='natural'?'612 208 570 502':'1210 120 540 600';
 return <div className="timer-space" data-testid="timer-space" ref={space}><div className="desk-timer" hidden={!visible}>
  <button type="button" className="timer-object timer-face" aria-label={'タイマーの時間 · '+minutes+'分'} aria-expanded={sheet} onClick={()=>setSheet(v=>!v)}><svg className="timer-plate" viewBox={crop} aria-hidden="true"><image href="/desk/timers.png" width="1774" height="887"/></svg>
   {theme==='walnut'?<svg className="clock-hands" viewBox="0 0 540 600" aria-hidden="true"><g transform="translate(307.5 365)"><circle r="4" fill="#3e352a"/><path d="M0 8V-125" transform={'rotate('+(seconds/3600*360)+')'} stroke="#3e352a" strokeWidth="4" strokeLinecap="round"/><path d="M0 7V-92" transform={'rotate('+(seconds%60*6)+')'} stroke="#78613b" strokeWidth="2"/></g></svg>:<span className="timer-digits" aria-hidden="true">{digits}</span>}
  </button>
  {sheet&&<div className="timer-sheet" role="group" aria-label="タイマーの時間">
   <div className="timer-minutes">{[5,15,25,45,60].map(n=><button key={n} type="button" aria-pressed={minutes===n} onClick={()=>change({timerMinutes:n})}>{n}<small>分</small></button>)}</div>
   <button type="button" className="timer-stow" onClick={()=>{setSheet(false);change({timerVisible:false});}}>タイマーを片づける</button>
  </div>}
  <span className={'timer-reading '+(theme==='walnut'?'':'sr-only')} aria-label={'残り '+digits}>{digits}</span>
  <div className="timer-actions"><button onClick={()=>{setTimer(t=>toggleTimer(t,Date.now(),minutes));setAnnouncement(timer.state==='running'?'タイマーを一時停止しました。':'タイマーを開始しました。');}}>{timer.state==='running'?'Pause':timer.state==='paused'?'Resume':'Start'}</button><button onClick={()=>{setTimer(idleTimer(minutes));setAnnouncement('タイマーをリセットしました。');}}>Reset</button></div>
 </div>
 {!visible&&<button type="button" className="timer-ghost" aria-label="タイマーを出す" onClick={()=>change({timerVisible:true})}>+</button>}
 <span className="sr-only" role="status">{announcement}</span></div>;
}
export function StudyDesk(){
 // Daily notes are always long-edge duplex sheets bound on the left; older binding choices are no longer offered.
 const [loadedDisplay]=useState(()=>{const saved=readSaved(displayKey,displaySchema,defaultDisplay);return {...saved,value:{...saved.value,side:'left',binding:18} as DeskDisplay};});
 // The desk opens a page from the learner's shelf when one is named or remembered; otherwise the sample fixture.
 const [resolved]=useState(()=>resolveDeskLesson(localStorage,location.search,{binding:loadedDisplay.value.binding,side:loadedDisplay.value.side},{english:loadedDisplay.value.english,japanese:loadedDisplay.value.japanese}));
 const lesson=resolved.lesson;
 const [loadedCopy]=useState(()=>readSaved(resolved.copyKey,practiceSchema,emptyCopy(lesson),r=>validCopy(r,lesson)));
 const [display,setDisplay]=useState(loadedDisplay.value),[record,setRecord]=useState(()=>nextCopy(loadedCopy.value,lesson));
 const [voices,setVoices]=useState<SpeechSynthesisVoice[]>([]);
 const selectedVoice=chooseEnglishVoice(voices,display.voice);
 const [audio,setAudio]=useState<AudioState>({phase:'idle',message:''});
 const [speaker]=useState(()=>createLessonSpeaker(typeof window.SpeechSynthesisUtterance==='function'?window.speechSynthesis:undefined,text=>new SpeechSynthesisUtterance(text),setAudio));
 const [notice,setNotice]=useState(loadedCopy.message||loadedDisplay.message||resolved.notice),[error,setError]=useState('');
 const [voiceOpen,setVoiceOpen]=useState(false),voiceControl=useRef<HTMLDivElement>(null);
 useDismiss(voiceOpen,()=>setVoiceOpen(false),voiceControl);
 const [tab,setTab]=useState(0),[meaning,setMeaning]=useState(false),[personalMode,setPersonalMode]=useState(false);
 const [pick,setPick]=useState<{sentenceId:string;from:number;to:number}|null>(null),[lookingUp,setLookingUp]=useState(false),[lookupNote,setLookupNote]=useState('');
 const [wordbook,setWordbook]=useState(()=>readWordbook(localStorage));
 const [zoom,setZoom]=useState<'fit'|'read'>(()=>matchMedia('(max-width: 760px)').matches?'read':'fit');
 const [annotationsOnly,setAnnotationsOnly]=useState(false),[composingText,setComposingText]=useState(false),[inputScroll,setInputScroll]=useState({x:0,y:0});
 const [animateId,setAnimateId]=useState<string|null>(null),[time,setTime]=useState(1e9),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(2);
 const [reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),[fontReady,setFontReady]=useState(false),[exporting,setExporting]=useState(false);
 const editor=useRef<HTMLTextAreaElement>(null),settings=useRef<HTMLDialogElement>(null),paper=useRef<HTMLDivElement>(null);
 // The tray holds the timer, pens and index book; it slides away as soon as writing starts and comes back by its handle.
 const [trayStowed,setTrayStowed]=useState(()=>matchMedia('(max-width: 760px)').matches),tray=useRef<HTMLElement>(null);
 const stowTray=(stowed:boolean,focusWriting=false)=>{setTrayStowed(stowed);if(focusWriting)requestAnimationFrame(()=>editor.current?.focus({preventScroll:true}));};
 const lessonPanel=useRef<HTMLDivElement>(null),paperViewport=useRef<HTMLDivElement>(null),writingControls=useRef<HTMLDivElement>(null);
 const [paperHeight,setPaperHeight]=useState(320);
 const follow=useRef(()=>{});
 const composing=useRef(false),compositionEnded=useRef(0),[unit,setUnit]=useState(470/148);
 const current=lesson.sentences[record.index];
 const total=lesson.sentences.length;
 // Lines are drawn on written sentences only, so the picked words are always the model's words.
 const pickedSentence=pick?lesson.sentences.find(s=>s.id===pick.sentenceId)??null:null;
 const pickedTokens=useMemo(()=>pickedSentence?tokenize(pickedSentence.text):[],[pickedSentence]);
 const picked=pick&&pickedSentence&&pickedTokens[pick.from]&&pickedTokens[pick.to]?{start:pickedTokens[pick.from].start,end:pickedTokens[pick.to].end}:null;
 const pickedText=picked&&pickedSentence?expressionOf(pickedSentence.text,picked.start,picked.end):'';
 // The meaning shows as soon as a selection settles (450 ms after the last tap); drawing the line stays the learner's act.
 const pickKey=picked&&pickedSentence?pickedSentence.id+':'+picked.start+':'+picked.end:'';
 const pickRef=useRef('');pickRef.current=pickKey;
 const previewTimer=useRef(0);
 const [preview,setPreview]=useState<{key:string;result:LookupResult}|null>(null);
 const shown=preview&&preview.key===pickKey?preview.result:null;
 useEffect(()=>{
  if(!pickKey||!pickedSentence||!pickedText||(preview&&preview.key===pickKey))return;
  const key=pickKey,sentence=pickedSentence.text,expression=pickedText;
  previewTimer.current=window.setTimeout(()=>{
   setLookingUp(true);setLookupNote('');
   void requestLookup(fetch,{expression,sentence,level:resolved.page?.level??'A2',native_language:resolved.page?.native_language??'ja'}).then(outcome=>{
    if(pickRef.current!==key)return;
    setLookingUp(false);
    if(outcome.kind==='failed')setLookupNote(outcome.message);else setPreview({key,result:outcome.result});
   });
  },450);
  return()=>{window.clearTimeout(previewTimer.current);setLookingUp(false);};
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[pickKey]);
 const pageId=resolved.page?.id??null;
 const otherLines=wordbook.kind==='ready'?wordbook.entries.filter(e=>e.pageId!==pageId):[];
 const layout=useMemo(()=>deskLayout(lesson,record,display,personalMode),[lesson,record.personal,record.checks,record.lookups,display.english,display.japanese,display.binding,display.side,personalMode]);
 const rendered=useMemo(()=>confirmedLayout(layout,record,display,personalMode),[layout,record.entries,record.phase,record.personal,display.vocabulary,display.grammar,personalMode]);
 const scene=useMemo(()=>practiceScene(rendered,animateId,annotationsOnly),[rendered,animateId,annotationsOnly]);
 const hits=useMemo(()=>wordHits(rendered),[rendered]);
 const position=inputPosition(layout,record,personalMode);
 const isEditing=personalMode||record.phase==='editing';
 const draft=personalMode?record.personalDraft:record.draft;
 const liveInk=fontReady&&!composingText&&draft.length<=500&&supported(draft,englishFonts[display.english].data);
 const inputHeight=Math.min(position.rows,Math.max(2,Math.ceil(draft.length/32)+draft.split('\n').length))*5.2;
 const inputFamily='Sentence Notebook '+({readability:'Readability',tech:'Tech',print:'Print',pen:'Pen'}[display.english])+' Input';
 // Shadowing, Dictation, Reconstruction and Speaking keep their own record; Copy's record is never touched by them.
 const practice=usePractice({lesson,display,handFamily:inputFamily,level:resolved.page?.level??'A2',nativeLanguage:resolved.page?.native_language??'ja',onWriting:()=>{if(!trayStowed)setTrayStowed(true);},
  onLeaveCopy:()=>speaker.stop(),onReturnToCopy:()=>requestAnimationFrame(()=>editor.current?.focus({preventScroll:true}))});
 const view={content:display.content,memos:display.memos,markers:display.markers};
 const paperColor=display.theme==='pure-white'?'#FFFFFF':'#FAF8F5';
 useEffect(()=>{
  const engine=window.speechSynthesis;if(!engine)return;
  const refresh=()=>setVoices(englishVoices(engine.getVoices()));
  refresh();engine.addEventListener('voiceschanged',refresh);return()=>engine.removeEventListener('voiceschanged',refresh);
 },[]);
 useEffect(()=>{const mq=matchMedia('(prefers-reduced-motion: reduce)');const fn=()=>setReduced(mq.matches);mq.addEventListener('change',fn);return()=>mq.removeEventListener('change',fn);},[]);
 useEffect(()=>{let alive=true;setFontReady(false);document.fonts.load('16px "'+inputFamily+'"').then(()=>{if(alive)setFontReady(true);}).catch(()=>{if(alive)setError('入力用の書体を読み込めませんでした。再読み込みしてください。');});return()=>{alive=false;};},[inputFamily]);
 useEffect(()=>{const el=paper.current;if(!el)return;const observer=new ResizeObserver(()=>setUnit(el.clientWidth/148));observer.observe(el);return()=>observer.disconnect();},[zoom]);
 useEffect(()=>{if(!playing||reduced)return;let frame=0,previous=0;const tick=(now:number)=>{if(previous)setTime(t=>Math.min(scene.duration,t+Math.min(50,now-previous)*speed));previous=now;frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);},[playing,reduced,speed,scene.duration]);
 useEffect(()=>{if(time>=scene.duration||reduced)setPlaying(false);},[time,scene.duration,reduced]);
 useEffect(()=>{setMeaning(false);speaker.stop();return()=>speaker.stop(true);},[record.index,speaker,display.voice,display.speechRate]);
 useEffect(()=>{setPick(null);setLookupNote('');},[current.id]);
 useEffect(()=>{const onKey=(event:globalThis.KeyboardEvent)=>{if(event.defaultPrevented||practice.step>0)return;const intent=audioShortcut(event,composing.current||Date.now()-compositionEnded.current<100||!!settings.current?.open);if(!intent)return;event.preventDefault();if(intent==='play')speaker.play(current.text,{voice:display.voice,rate:display.speechRate});};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);},[current.text,speaker,display.voice,display.speechRate,practice.step]);
 function changeDisplay(patch:Partial<DeskDisplay>){const next={...display,...patch};setDisplay(next);try{saveRecord(displayKey,next,loadedDisplay.blocked);}catch(e){setNotice((e as Error).message);}if(patch.english||patch.japanese){setAnimateId(null);setTime(1e9);setPlaying(false);}}
 function persist(next:CopyRecord,required=false){try{saveRecord(resolved.copyKey,next,loadedCopy.blocked);setRecord(next);return true;}catch(e){setError((e as Error).message);if(!required)setRecord(next);return false;}}
 function followCaret(){
  const el=editor.current,scroll=paperViewport.current,model=lessonPanel.current;
  if(!el||!scroll||!model||document.activeElement!==el||composing.current||settings.current?.open)return;
  const viewport=window.visualViewport,top=viewport?.offsetTop??0,bottom=top+(viewport?.height??innerHeight);
  // Keep the model above the paper; only the paper pans as the learner writes.
  const modelBox=model.getBoundingClientRect(),paperBox=scroll.getBoundingClientRect();
  if(modelBox.top<top+8||paperBox.bottom>bottom-8){
   window.scrollBy({top:modelBox.top-top-16,behavior:'instant'});
  }
  const caret=caretOffset(el.value,el.selectionEnd,el.clientWidth/unit,englishFonts[display.english].data);
  const box=scroll.getBoundingClientRect(),input=el.getBoundingClientRect();
  const x=input.left+caret.x*unit-el.scrollLeft,y=input.top+caret.y*unit-el.scrollTop;
  scroll.scrollBy({
   left:revealDelta(x,x+2,box.left,box.left+scroll.clientWidth),
   top:revealDelta(y,y+5.2*unit,box.top,box.top+scroll.clientHeight,40),
   behavior:'instant',
  });
 }
 follow.current=followCaret;
 useLayoutEffect(()=>{
  if(!isEditing)return;
  let frame=0;
  const update=()=>{
   const model=lessonPanel.current,scroll=paperViewport.current;if(!model||!scroll)return;
   setPaperHeight(writingPaperHeight(window.visualViewport?.height??innerHeight,scroll.getBoundingClientRect().top-model.getBoundingClientRect().top));
   cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>follow.current());
  };
  const observer=new ResizeObserver(update);
  if(lessonPanel.current)observer.observe(lessonPanel.current);
  if(writingControls.current)observer.observe(writingControls.current);
  window.addEventListener('resize',update);window.visualViewport?.addEventListener('resize',update);update();
  return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',update);window.visualViewport?.removeEventListener('resize',update);};
 },[isEditing]);
 function changeDraft(value:string){requestAnimationFrame(followCaret);setError('');persist(personalMode?{...record,personalDraft:value}:{...record,draft:value});}
 function focusNextLine(){setInputScroll({x:0,y:0});requestAnimationFrame(()=>{const el=editor.current;if(!el)return;el.scrollTop=0;el.scrollLeft=0;el.focus({preventScroll:true});el.setSelectionRange(0,0);requestAnimationFrame(()=>follow.current());});}
 function confirm(){
  if(composing.current||Date.now()-compositionEnded.current<100||settings.current?.open||!fontReady)return;
  try{
   if(personalMode){if(!draft.trim()||draft.length>80||!supported(draft,englishFonts[display.english].data)||draft.includes('\n'))throw new Error('ひとことは英数字・基本記号で80文字以内の一文にしてください。入力は残っています。');if(!persist({...record,personal:draft},true))return;setPersonalMode(false);setAnimateId('personal-user');}
   else{const next=submitCopy(record,lesson,new Date().toISOString());if(!persist(next,true))return;setAnimateId(current.id);if(next.phase==='editing')focusNextLine();else requestAnimationFrame(()=>document.getElementById('copy-complete')?.focus({preventScroll:true}));}
   setError('');setAnnotationsOnly(true);setTime(0);setPlaying(true);
  }catch(e){setError((e as Error).message);editor.current?.focus();}
 }
 function keyDown(e:KeyboardEvent<HTMLTextAreaElement>){if(e.key!=='Enter'||e.shiftKey||e.altKey||e.metaKey||e.ctrlKey)return;if(e.repeat){e.preventDefault();return;}if(e.nativeEvent.isComposing||composing.current||e.keyCode===229||e.repeat||Date.now()-compositionEnded.current<100){return;}e.preventDefault();confirm();}
 function playAudio(){speaker.play(current.text,{voice:display.voice,rate:display.speechRate});}
 // Tapping written words picks a span: first tap starts it, a later word of the same line extends it, a tap inside clears it.
 function pickWord(hit:WordHit){setLookupNote('');setPick(p=>!p||p.sentenceId!==hit.sentenceId?{sentenceId:hit.sentenceId,from:hit.token,to:hit.token}:hit.token>=p.from&&hit.token<=p.to?null:hit.token>p.to?{...p,to:hit.token}:{...p,from:hit.token});}
 async function lookUp(){
  if(!picked||!pickedSentence||lookingUp)return;
  let result=shown;
  if(!result){
   window.clearTimeout(previewTimer.current); // an explicit lookup replaces the pending preview: one request, not two
   setLookingUp(true);setLookupNote('');
   const outcome=await requestLookup(fetch,{expression:pickedText,sentence:pickedSentence.text,level:resolved.page?.level??'A2',native_language:resolved.page?.native_language??'ja'});
   if(outcome.kind==='failed'){setLookupNote(outcome.message);setLookingUp(false);return;}
   result=outcome.result;
  }
  const entry={sentenceId:pickedSentence.id,start:picked.start,end:picked.end,expression:pickedText,native:result.native,note:result.note,lookedUpAt:new Date().toISOString()};
  let next:CopyRecord;
  try{next=addLookup(record,entry);}catch(e){setLookupNote((e as Error).message);setLookingUp(false);return;}
  if(!persist(next,true)){setLookingUp(false);return;}
  // The page record already holds the line; the shared word list is kept when it is readable.
  try{setWordbook({kind:'ready',entries:saveWordbookEntry(localStorage,{...entry,pageId,pageTitle:resolved.page?.title??lesson.title,sentence:pickedSentence.text})});}catch{/* unreadable word list stays untouched */}
  setPick(null);setPreview(null);setLookingUp(false);
  // The sentence is already written, so the line and its memo are drawn right away.
  setAnimateId(pickedSentence.id);setAnnotationsOnly(true);setTime(0);setPlaying(true);
 }
 function startPersonal(){setPersonalMode(true);changeDisplay({content:'study-notes'});requestAnimationFrame(()=>{editor.current?.focus({preventScroll:true});follow.current();});}
 async function exportPdf(sides:PrintSides='both'){setExporting(true);try{const {exportStudyNote}=await import('../handwriting/study-pdf');const bytes=await exportStudyNote(confirmedLayout(layout,record,display),view,{...display,notebook:'a5',palette:display.marker,markers:display.printMarkers??display.markers},undefined,sides);const url=URL.createObjectURL(new Blob([new Uint8Array(bytes)],{type:'application/pdf'}));const a=document.createElement('a');a.href=url;a.download=(display.sheet==='A4'?'sentence-book-a5-on-a4':'sentence-book-a5')+(sides==='both'?'':'-'+sides)+'.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);setNotice(sides==='front'?'表のPDFを作成しました。刷ったら紙を裏返して入れ直し、裏を刷ってください。':sides==='back'?'裏のPDFを作成しました。表を刷った紙を裏返して入れてください。':'PDFを作成しました。100%（実際のサイズ）で両面印刷してください。');}catch(e){setNotice((e as Error).message);}finally{setExporting(false);}}
 const inputTop=(position.y-4.65)*unit;
 return <div className={'study-desk theme-'+display.theme+(isEditing?' is-writing':'')} style={{'--paper':paperColor} as CSSProperties}>
  <a className="desk-skip" href="#notebook-input">ノートの入力へ</a>
  <AppHeader current="desk" wide className="desk-header"><button className="settings-button" aria-label="机のテーマ" title="机のテーマ" onClick={()=>settings.current?.showModal()}><Icon name="settings"/></button></AppHeader>
  <main className="desk-grid">
   <aside className={'desk-tray'+(trayStowed?' is-stowed':'')} id="desk-tray" aria-label="道具のトレイ" ref={tray} onKeyDown={e=>{if(e.key==='Escape'&&!trayStowed&&!e.defaultPrevented){e.stopPropagation();stowTray(true,true);}}}>
    <div className="tray-well" inert={trayStowed}>
   <section className="desk-tools" aria-label="文具とタイマー"><Timer theme={display.theme} visible={display.timerVisible} minutes={display.timerMinutes} change={changeDisplay}/>
    <fieldset className="desk-pens"><legend className="sr-only">マーカーの色</legend>{markerIds.map((id,i)=><label className="pen-choice" key={id}>
      <input type="radio" name="desk-marker" value={id} checked={display.marker===id} onChange={()=>{changeDisplay({marker:id});requestAnimationFrame(()=>editor.current?.focus({preventScroll:true}));}}/>
      <svg className="pen-art" viewBox={'48 '+penRows[display.theme][i][0]+' 1440 '+penRows[display.theme][i][1]} aria-hidden="true"><image href={'/desk/pens-'+penFiles[display.theme]+'.png'} width="1536" height="1024"/></svg>
      <span className="pen-label">{markerNames[id]}</span><span className="pen-check" aria-hidden="true"><Icon name="check"/></span>
    </label>)}</fieldset>
   </section>
   <section className="index-book" aria-label="学習インデックス"><img src="/desk/index-book.png" alt="" className="index-plate"/>
    <div className="index-left"><h2>My Sentence Book</h2><div className="index-tabs" role="tablist" aria-label="ノートの目次" aria-orientation="vertical">{tabs.map((name,i)=><button key={name} role="tab" id={'index-tab-'+i} aria-selected={tab===i} aria-controls="index-content" tabIndex={tab===i?0:-1} onKeyDown={e=>{if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();const n=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowDown'?1:tabs.length-1))%tabs.length;setTab(n);document.getElementById('index-tab-'+n)?.focus();}}} onClick={()=>setTab(i)}>{name}<span aria-hidden="true">{tab===i?'—':''}</span></button>)}</div></div>
    <div className="index-right" id="index-content" role="tabpanel" aria-labelledby={'index-tab-'+tab} tabIndex={0}>
     <h2>{tabs[tab]}</h2>
     {tab===0&&<><button className="lesson-link" onClick={()=>{setPersonalMode(false);editor.current?.focus();}}>{resolved.page?.title??lesson.title}<small>Copy · {record.entries.length} / {total}</small></button>
      {resolved.page&&resolved.binder?<><p>「{resolved.binder.title}」のページ · {resolved.page.level}</p><p className="index-note">Museがあなたの話から作りました。<br/>このブラウザに進み具合を保存します。</p><a href="/shelf">Folderから別のページを選ぶ</a><br/><a href="/?page=sample">サンプル教材に戻る</a></>
      :<><p>静かな朝の、小さな習慣。</p><p className="index-note">サンプル教材<br/>このブラウザに進み具合を保存します。</p><a href="/shelf">Folderのページを練習する</a></>}</>}
     {tab===1&&<>{resolved.page?resolved.page.sceneTags.map(tag=><p key={tag}>{tag}</p>):<><p>Daily Life</p><p>Small Habits</p></>}<a href="/settings">Settings</a></>}
     {(tab===2||tab===3)&&<>{layout.source.vocabulary.map(v=><label className="book-word" key={v.id}><input type="checkbox" checked={!!record.checks[v.id]} onChange={e=>persist({...record,checks:{...record.checks,[v.id]:e.target.checked}})}/><span>{v.english}<small>{v.meaning}</small></span></label>)}<p className="index-note">{layout.source.vocabulary.length?'線を引いた語句はここに残ります。復習した印もつけられます。':'まだ語句がありません。見本の語句をタップして調べると、ここに残ります。'}</p>
      {otherLines.length>0&&<><p className="index-subhead">ほかのページで引いた線 · {otherLines.length}</p>{otherLines.slice(0,12).map(e=><p className="wordbook-entry" key={e.lookedUpAt+e.expression}><span lang="en">{e.expression}</span> {e.native}<small>{e.pageTitle}</small></p>)}</>}</>}
     {tab===4&&<>{record.phase==='complete'?<><p>{lesson.title}</p><p>{total}文を書き終えました。</p><button onClick={startPersonal}>自分のひとことを書く</button></>:<p>{total}文を書き終えると、<br/>ここに一枚のノートが残ります。</p>}
      <PrintPanel display={display} change={changeDisplay} ready={record.entries.length>0} exporting={exporting} onExport={sides=>void exportPdf(sides)}/></>}
     {tab===5&&<NoteStyle display={display} change={changeDisplay}/>}
    </div>
   </section>
    </div>
    <TrayHandle stowed={trayStowed} tray={tray} onStow={stowTray}/>
   </aside>
   <div className="lesson-panel" ref={lessonPanel}>
    {practice.tabs}
   <section className="model-card" id="lesson-copy" role="tabpanel" aria-labelledby="learning-step-0" hidden={practice.step>0}><div className="model-heading"><h1 id="copy-complete" tabIndex={-1}>{record.phase==='complete'?'Copy complete':'Copy'}</h1><span>{record.entries.length} / {total}</span></div>
     <p className="model-sentence" lang="en">{current.text}</p><p className={'model-meaning '+(meaning||audio.message?'':'is-hidden')+(audio.message?' audio-error':'')} aria-hidden={!meaning&&!audio.message} role={audio.message?'alert':undefined}>{audio.message||current.meaning||''}</p>
     <div className="model-actions"><button onClick={playAudio} className="audio-button" aria-keyshortcuts="Alt+R" title="音声を聞く（Mac: Option + R / Windows: Alt + R）"><Icon name="sound"/>{audio.phase==='speaking'?'読み上げ中':audio.phase==='loading'?'音声を準備中':'音声を聞く'}<kbd aria-hidden="true">⌥ / Alt R</kbd></button><button aria-expanded={meaning} onClick={()=>setMeaning(v=>!v)}>{meaning?'意味を閉じる':'意味を見る'}</button>
      <div className="voice-control" ref={voiceControl}><button type="button" aria-expanded={voiceOpen} onClick={()=>setVoiceOpen(v=>!v)}>声</button>
       {voiceOpen&&<div className="voice-sheet" role="group" aria-label="読み上げ">
        <label>英語の声<select value={voices.some(v=>v.voiceURI===display.voice)?display.voice:'auto'} onChange={e=>changeDisplay({voice:e.target.value})}>
         <option value="auto">自動{selectedVoice?' · '+chooseEnglishVoice(voices)?.name:''}</option>
         {voices.map(v=><option key={v.voiceURI} value={v.voiceURI}>{v.name} · {v.lang}</option>)}
        </select></label>
        <div className="voice-rates" role="group" aria-label="読み上げの速さ">{([[.85,'ゆっくり'],[1,'標準'],[1.1,'少し速く']] as const).map(([rate,label])=><button key={rate} type="button" aria-pressed={display.speechRate===rate} onClick={()=>changeDisplay({speechRate:rate})}>{label}</button>)}</div>
        <button type="button" className="voice-preview" onClick={playAudio}><Icon name="sound"/>試しに聞く</button>
       </div>}
      </div>{record.phase==='complete'&&<button type="button" className="copy-next" style={{color:palettes[display.marker].title}} onClick={()=>practice.choose(1)}>Shadowingへ</button>}<span>{record.phase==='complete'?'ノートに残りました':'ノートの行に書き写す'}</span></div>
   </section>
   {practice.card}
   </div>
   <section className="notebook-area" aria-label="A5学習ノート" data-in-step={practice.step>0||undefined}><div className="writing-controls" ref={writingControls}><div className="notebook-toolbar"><span>A5 · 148 × 210 mm</span><div className="notebook-tools"><button onClick={()=>setZoom(v=>v==='fit'?'read':'fit')}>{zoom==='fit'?'拡大して読む':'紙全体を見る'}</button>{record.phase==='complete'&&!personalMode&&<button onClick={startPersonal}>ひとことを書く</button>}</div></div><p id="writing-error" role="alert" className="writing-feedback">{error}</p><div className="lookup-bar">{picked?<><span>「<span lang="en">{pickedText}</span>」{shown&&<span className="lookup-meaning"> — {shown.native}</span>}</span><button type="button" className="lookup-button" onClick={lookUp} disabled={lookingUp} aria-busy={lookingUp}>{lookingUp?'調べています…':shown?'線を引く':'調べて線を引く'}</button><button type="button" className="lookup-cancel" onClick={()=>setPick(null)} disabled={lookingUp}>やめる</button></>:<span className="lookup-hint">書き終えた行の語句をタップすると意味が出ます。線を引くと、ページに残ります。</span>}<span role="status" className="lookup-status">{lookupNote}</span></div></div>
    <div className={'desk-paper-scroll '+(zoom==='read'?'reading':'')} ref={paperViewport} style={isEditing?{height:paperHeight}:undefined} tabIndex={0} aria-label="ノート。入力行に合わせてスクロールします。拡大表示は左右にもスクロールできます">
     <div className="desk-pages" style={{'--marker-ink':palettes[display.marker].marker} as CSSProperties}>{layout.pages.map(p=><div className="desk-page-row" key={p.index}><div className="desk-paper" ref={p.index===0?paper:undefined}>
      <A5Notebook showPen={!annotationsOnly||!isEditing} layout={rendered} scene={scene} pageIndex={p.index} paperColor={paperColor} view={view} ink={palettes[display.marker]} time={reduced?scene.duration:time} reduced={reduced} personalInk={emptyInk}/>
      {hits.filter(h=>h.page===p.index).map(h=>{const lined=record.lookups.find(l=>l.sentenceId===h.sentenceId&&h.start>=l.start&&h.end<=l.end);const on=!!pick&&pick.sentenceId===h.sentenceId&&h.token>=pick.from&&h.token<=pick.to;return <button type="button" key={h.sentenceId+':'+h.token+':'+h.x} className={'word-hit'+(on?' is-picked':'')} style={{left:h.x*unit,top:h.y*unit,width:h.width*unit,height:h.height*unit}} aria-label={lined?'「'+h.text+'」— '+lined.native:'「'+h.text+'」を選ぶ'} aria-pressed={on} title={lined?.native} onClick={()=>pickWord(h)}/>;})}
      {p.index===position.page&&isEditing&&<textarea ref={editor} id="notebook-input" className={'notebook-input'+(liveInk?' live-ink-input':'')} aria-label={personalMode?'ノートに自分のひとことを書く':'ノートに英文を書き写す'} aria-describedby="writing-help writing-error" aria-invalid={!!error} enterKeyHint={personalMode||record.index===total-1?'done':'next'} spellCheck={false} autoCapitalize="off" autoCorrect="off" wrap="soft" disabled={!fontReady} value={draft} rows={1}
       style={{left:position.x*unit,top:inputTop,width:position.width*unit,height:inputHeight*unit,fontFamily:'"'+inputFamily+'", sans-serif',fontSize:4.1*unit,lineHeight:(5.2*unit)+'px'} as CSSProperties}
       onScroll={e=>setInputScroll({x:e.currentTarget.scrollLeft/unit,y:e.currentTarget.scrollTop/unit})} onBeforeInput={()=>{if(!trayStowed)setTrayStowed(true);}} onChange={e=>changeDraft(e.target.value)} onSelect={()=>requestAnimationFrame(followCaret)} onKeyUp={e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(e.key))requestAnimationFrame(followCaret);}} onFocus={()=>requestAnimationFrame(followCaret)} onKeyDown={keyDown} onCompositionStart={()=>{composing.current=true;setComposingText(true);}} onCompositionEnd={()=>{composing.current=false;setComposingText(false);compositionEnded.current=Date.now();requestAnimationFrame(()=>follow.current());}}/>}
      {p.index===position.page&&isEditing&&<LiveDraftInk key={personalMode?'personal':current.id} text={draft.length<=500?draft:''} font={display.english} animate={liveInk&&!reduced} visible={liveInk} x={position.x} y={position.y} width={position.width} top={position.y-4.65} height={inputHeight} scrollX={inputScroll.x} scrollY={inputScroll.y}/>}
     </div></div>)}</div>
    </div>
    <p id="writing-help" className="writing-help">{personalMode?'英語でひとこと。80文字以内。Enterで保存します。':record.phase==='complete'?total+'文を保存しました。ノートにひとことを添えたり、PDFにできます。':'Enterで答え合わせ・保存して、次の文へ。入力中も筆跡になります。'} {zoom==='read'?'左右にスクロールして読めます。':''}</p>
    <div className="ink-actions"><button disabled={!record.entries.length||reduced} onClick={()=>{setAnnotationsOnly(false);setAnimateId(record.entries.at(-1)?.sentenceId??null);setTime(0);setPlaying(true);}}>筆跡をもう一度</button><button disabled={time>=scene.duration||reduced} onClick={()=>setPlaying(v=>!v)}>{playing?'筆記を一時停止':'筆記を続ける'}</button><button disabled={time>=scene.duration||reduced} onClick={()=>{setTime(scene.duration);setPlaying(false);}}>最後まで表示</button>
     <span className="ink-speed" role="group" aria-label="筆記の速さ">{[1,2,4].map(n=><button key={n} type="button" aria-pressed={speed===n} onClick={()=>setSpeed(n)}>{n}×</button>)}</span></div>
    {practice.sheet}
   </section>
  </main>
  <footer className="desk-footer"><span>{resolved.binder?`「${resolved.binder.title}」のページ · Museが作成 · ${resolved.page?.model??''}`:'サンプル教材のCopy体験 · 本棚に仕舞ったページも練習できます'}</span><a href="/fonts/README.md">書体とライセンス</a></footer>
  <p className="desk-notice" role="status">{notice||practice.notice}</p>
  <dialog className="desk-settings theme-settings" ref={settings} aria-labelledby="theme-title" onClick={e=>{if(e.target===e.currentTarget)settings.current?.close();}}>
   <h2 id="theme-title" className="sr-only">机のテーマ</h2>
   <div className="theme-swatches" role="radiogroup" aria-labelledby="theme-title">{themes.map(t=><label key={t} className={'theme-swatch swatch-'+t}>
    <input type="radio" name="desk-theme" value={t} checked={display.theme===t} onChange={()=>changeDisplay({theme:t})}/><span className="swatch-art" aria-hidden="true"/><span>{themeNames[t]}</span>
   </label>)}</div>
   <button className="theme-close" onClick={()=>settings.current?.close()}>閉じる</button>
  </dialog>
 </div>;
}
