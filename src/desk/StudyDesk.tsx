import {useEffect,useMemo,useRef,useState} from 'react';
import type {CSSProperties,KeyboardEvent} from 'react';
import {A5Notebook} from '../handwriting/A5Notebook';
import {englishFonts,japaneseFonts} from '../handwriting/fonts';
import {studySample} from '../handwriting/study-content';
import {supported,layoutText} from '../handwriting/model';
import {displayKey,practiceKey,displaySchema,practiceSchema,defaultDisplay,emptyCopy,validCopy,readSaved,saveRecord,confirmCopy,nextCopy,markerIds,themes,idleTimer,timerAt,toggleTimer} from './core';
import type {CopyRecord,DeskDisplay,DeskTheme} from './core';
import {deskLayout,confirmedLayout,inputPosition,practiceScene} from './note';
import {palettes} from '../handwriting/palettes';
import '../handwriting/handwriting.css';
import './desk.css';
import {LiveDraftInk} from './LiveDraftInk';

const themeNames={'pure-white':'Pure White',natural:'Natural',walnut:'Walnut'};
const markerNames={blue:'Blue',pink:'Pink',purple:'Purple',gray:'Gray',orange:'Orange',green:'Green'};
const tabs=['My Lessons','Topic Index','My Vocabulary','Review','Completed Notes'];
const translations=['今日は、少しペースを落とすことにした。','静かな朝を過ごす時間をつくった。','スマートフォンを見る代わりに、ノートを開いた。','温かいお茶を一杯飲むと、落ち着くことができた。','覚えておきたいことを一つ書き留めた。','何か特別なことでなくてもよかった。','小さなひとときが、いつもの一日を違ったものにしてくれる。','明日も、そんな時間をつくりたい。'];
const penRows={ 'pure-white':[[64,134],[209,134],[361,136],[517,135],[677,135],[835,135]],natural:[[49,148],[205,150],[365,150],[523,151],[680,150],[838,150]],walnut:[[87,141],[231,140],[376,140],[520,141],[664,142],[808,142]]};
const penFiles={'pure-white':'white',natural:'natural',walnut:'walnut'};
const emptyInk={paths:[],pending:false,pen:null,paused:false,toggle:()=>{},finish:()=>{}};
function Icon({name}:{name:'sound'|'settings'|'check'|'arrow'}){
 const paths={sound:'M4 9H8L13 5V19L8 15H4ZM17 8Q22 12 17 16',settings:'M4 7H20M4 17H20M8 4V10M16 14V20',check:'M5 12L10 17L20 6',arrow:'M4 12H20M14 6L20 12L14 18'};
 return <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d={paths[name]} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function Timer({theme,visible,minutes}:{theme:DeskTheme;visible:boolean;minutes:number}) {
 const [timer,setTimer]=useState(()=>idleTimer(minutes)),[announcement,setAnnouncement]=useState('');
 useEffect(()=>{if(timer.state!=='running')return;const id=setInterval(()=>setTimer(t=>timerAt(t,Date.now())),250);return()=>clearInterval(id);},[timer.state]);
 useEffect(()=>{if(timer.state==='finished')setAnnouncement('タイマーが終了しました。');},[timer.state]);
 const seconds=Math.ceil(timer.remaining/1000),digits=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
 const crop=theme==='pure-white'?'16 208 564 502':theme==='natural'?'612 208 570 502':'1210 120 540 600';
 return <div className="timer-space" data-testid="timer-space"><div className="desk-timer" hidden={!visible}>
  <div className="timer-object"><svg className="timer-plate" viewBox={crop} aria-hidden="true"><image href="/desk/timers.png" width="1774" height="887"/></svg>
   {theme==='walnut'?<svg className="clock-hands" viewBox="0 0 540 600" aria-hidden="true"><g transform="translate(307.5 365)"><circle r="4" fill="#3e352a"/><path d="M0 8V-125" transform={'rotate('+(seconds/3600*360)+')'} stroke="#3e352a" strokeWidth="4" strokeLinecap="round"/><path d="M0 7V-92" transform={'rotate('+(seconds%60*6)+')'} stroke="#78613b" strokeWidth="2"/></g></svg>:<span className="timer-digits" aria-hidden="true">{digits}</span>}
  </div>
  <span className={'timer-reading '+(theme==='walnut'?'':'sr-only')} aria-label={'残り '+digits}>{digits}</span>
  <div className="timer-actions"><button onClick={()=>{setTimer(t=>toggleTimer(t,Date.now(),minutes));setAnnouncement(timer.state==='running'?'タイマーを一時停止しました。':'タイマーを開始しました。');}}>{timer.state==='running'?'Pause':timer.state==='paused'?'Resume':'Start'}</button><button onClick={()=>{setTimer(idleTimer(minutes));setAnnouncement('タイマーをリセットしました。');}}>Reset</button></div>
 </div><span className="sr-only" role="status">{announcement}</span></div>;
}
export function StudyDesk(){
 const [loadedDisplay]=useState(()=>readSaved(displayKey,displaySchema,defaultDisplay));
 const [loadedCopy]=useState(()=>readSaved(practiceKey,practiceSchema,emptyCopy(studySample),r=>validCopy(r,studySample)));
 const [display,setDisplay]=useState(loadedDisplay.value),[record,setRecord]=useState(loadedCopy.value);
 const [notice,setNotice]=useState(loadedCopy.message||loadedDisplay.message),[error,setError]=useState('');
 const [tab,setTab]=useState(0),[meaning,setMeaning]=useState(false),[personalMode,setPersonalMode]=useState(false);
 const [zoom,setZoom]=useState<'fit'|'read'>(()=>matchMedia('(max-width: 760px)').matches?'read':'fit');
 const [annotationsOnly,setAnnotationsOnly]=useState(false),[composingText,setComposingText]=useState(false),[inputScroll,setInputScroll]=useState({x:0,y:0});
 const [animateId,setAnimateId]=useState<string|null>(null),[time,setTime]=useState(1e9),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(2);
 const [reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),[fontReady,setFontReady]=useState(false),[exporting,setExporting]=useState(false);
 const editor=useRef<HTMLTextAreaElement>(null),settings=useRef<HTMLDialogElement>(null),paper=useRef<HTMLDivElement>(null);
 const composing=useRef(false),compositionEnded=useRef(0),[unit,setUnit]=useState(470/148);
 const current=studySample.sentences[record.index];
 const layout=useMemo(()=>deskLayout(record,display,personalMode),[record.personal,record.checks,display.english,display.japanese,display.binding,display.side,personalMode]);
 const rendered=useMemo(()=>confirmedLayout(layout,record,display,personalMode),[layout,record.entries,record.phase,record.personal,display.vocabulary,display.grammar,personalMode]);
 const scene=useMemo(()=>practiceScene(rendered,animateId,annotationsOnly),[rendered,animateId,annotationsOnly]);
 const position=inputPosition(layout,record,personalMode);
 const isEditing=personalMode||record.phase==='editing';
 const draft=personalMode?record.personalDraft:record.draft;
 const liveInk=fontReady&&!composingText&&draft.length<=500&&supported(draft,englishFonts[display.english].data);
 const inputHeight=Math.min(position.rows,Math.max(2,Math.ceil(draft.length/32)+draft.split('\n').length))*5.2;
 const inputFamily='Sentence Notebook '+({readability:'Readability',tech:'Tech',print:'Print',pen:'Pen'}[display.english])+' Input';
 const view={content:display.content,memos:display.memos,markers:display.markers};
 const paperColor=display.theme==='natural'?'#F9F3E7':display.theme==='walnut'?'#F6EEDC':'#FFFEFB';
 useEffect(()=>{const mq=matchMedia('(prefers-reduced-motion: reduce)');const fn=()=>setReduced(mq.matches);mq.addEventListener('change',fn);return()=>mq.removeEventListener('change',fn);},[]);
 useEffect(()=>{let alive=true;setFontReady(false);document.fonts.load('16px "'+inputFamily+'"').then(()=>{if(alive)setFontReady(true);}).catch(()=>{if(alive)setError('入力用の書体を読み込めませんでした。再読み込みしてください。');});return()=>{alive=false;};},[inputFamily]);
 useEffect(()=>{const el=paper.current;if(!el)return;const observer=new ResizeObserver(()=>setUnit(el.clientWidth/148));observer.observe(el);return()=>observer.disconnect();},[zoom]);
 useEffect(()=>{if(!playing||reduced)return;let frame=0,previous=0;const tick=(now:number)=>{if(previous)setTime(t=>Math.min(scene.duration,t+Math.min(50,now-previous)*speed));previous=now;frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);},[playing,reduced,speed,scene.duration]);
 useEffect(()=>{if(time>=scene.duration||reduced)setPlaying(false);},[time,scene.duration,reduced]);
 useEffect(()=>{setMeaning(false);window.speechSynthesis?.cancel();return()=>window.speechSynthesis?.cancel();},[record.index]);
 function changeDisplay(patch:Partial<DeskDisplay>){const next={...display,...patch};setDisplay(next);try{saveRecord(displayKey,next,loadedDisplay.blocked);}catch(e){setNotice((e as Error).message);}if(patch.english||patch.japanese){setAnimateId(null);setTime(1e9);setPlaying(false);}}
 function persist(next:CopyRecord,required=false){try{saveRecord(practiceKey,next,loadedCopy.blocked);setRecord(next);return true;}catch(e){setError((e as Error).message);if(!required)setRecord(next);return false;}}
 function followCaret(){
  const el=editor.current,scroll=el?.closest('.desk-paper-scroll');
  if(!el||!scroll||composing.current||scroll.scrollWidth<=scroll.clientWidth)return;
  const count=[...el.value.slice(0,el.selectionEnd)].length;
  const glyphs=layoutText(el.value,0,0,position.width,4.1,5.2,englishFonts[display.english].data);
  const next=glyphs.find(g=>g.index===count),previous=glyphs.filter(g=>g.index<count).at(-1);
  const caret=(next?.x??(previous?previous.x+previous.advance:0))*unit;
  const x=el.getBoundingClientRect().left+caret,box=scroll.getBoundingClientRect();
  if(x>box.right-24)scroll.scrollLeft+=x-box.right+24;
  else if(x<box.left+24)scroll.scrollLeft+=x-box.left-24;
 }
 function changeDraft(value:string){requestAnimationFrame(followCaret);setError('');persist(personalMode?{...record,personalDraft:value}:{...record,draft:value});}
 function confirm(){
  if(composing.current||Date.now()-compositionEnded.current<100||settings.current?.open||!fontReady)return;
  try{
   if(personalMode){if(!draft.trim()||draft.length>80||!supported(draft,englishFonts[display.english].data)||draft.includes('\n'))throw new Error('ひとことは英数字・基本記号で80文字以内の一文にしてください。入力は残っています。');if(!persist({...record,personal:draft},true))return;setPersonalMode(false);setAnimateId('personal-user');}
   else{const next=confirmCopy(record,studySample,new Date().toISOString());if(!persist(next,true))return;setAnimateId(current.id);}
   setError('');setAnnotationsOnly(true);setTime(0);setPlaying(true);
  }catch(e){setError((e as Error).message);editor.current?.focus();}
 }
 function advance(){if(persist(nextCopy(record,studySample),true)){setError('');setInputScroll({x:0,y:0});setAnimateId(null);setTime(1e9);setPlaying(false);requestAnimationFrame(()=>{editor.current?.focus({preventScroll:true});editor.current?.scrollIntoView({block:'nearest',inline:'nearest'});});}}
 function keyDown(e:KeyboardEvent<HTMLTextAreaElement>){if(e.key!=='Enter'||e.shiftKey||e.altKey||e.metaKey||e.ctrlKey)return;if(e.repeat){e.preventDefault();return;}if(e.nativeEvent.isComposing||composing.current||e.keyCode===229||e.repeat||Date.now()-compositionEnded.current<100){return;}e.preventDefault();confirm();}
 function playAudio(){if(!('speechSynthesis' in window)){setNotice('このブラウザでは読み上げを利用できません。');return;}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(current.text);u.lang='en-US';u.rate=.85;u.onerror=()=>setNotice('読み上げを再生できませんでした。ブラウザの音声設定を確認してください。');speechSynthesis.speak(u);}
 async function exportPdf(){setExporting(true);try{const {exportStudyNote}=await import('../handwriting/study-pdf');const bytes=await exportStudyNote(confirmedLayout(layout,record,display),view,{...display,notebook:'a5',palette:display.marker,markers:display.printMarkers??display.markers});const url=URL.createObjectURL(new Blob([new Uint8Array(bytes)],{type:'application/pdf'}));const a=document.createElement('a');a.href=url;a.download=display.sheet==='A4'?'sentence-book-a5-on-a4.pdf':'sentence-book-a5.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);setNotice('PDFを作成しました。100%（実際のサイズ）で印刷してください。');}catch(e){setNotice((e as Error).message);}finally{setExporting(false);}}
 function writingAction(){return isEditing?<button className="confirm-writing" onClick={confirm} disabled={!fontReady||!draft.trim()}><Icon name="check"/><span>確定</span></button>:record.phase==='confirmed'?<button onClick={advance}><Icon name="arrow"/><span>{record.index===7?'ノート完成':'次の文'}</span></button>:<button onClick={()=>{setPersonalMode(true);changeDisplay({content:'study-notes'});requestAnimationFrame(()=>editor.current?.focus());}}>ひとこと<br/>書く</button>;}
 const inputTop=(position.y-4.65)*unit;
 return <div className={'study-desk theme-'+display.theme} style={{'--paper':paperColor} as CSSProperties}>
  <a className="desk-skip" href="#notebook-input">ノートの入力へ</a>
  <header className="desk-header"><a href="/" className="desk-wordmark">The Sentence Book</a><span className="desk-tagline">Learn digitally. Keep it beautifully.</span><button className="settings-button" onClick={()=>settings.current?.showModal()}><Icon name="settings"/>表示・印刷</button></header>
  <main className="desk-grid">
   <section className="desk-tools" aria-label="文具とタイマー"><Timer theme={display.theme} visible={display.timerVisible} minutes={display.timerMinutes}/>
    <fieldset className="desk-pens"><legend className="sr-only">マーカーの色</legend>{markerIds.map((id,i)=><label className="pen-choice" key={id}>
      <input type="radio" name="desk-marker" value={id} checked={display.marker===id} onChange={()=>changeDisplay({marker:id})}/>
      <svg className="pen-art" viewBox={'48 '+penRows[display.theme][i][0]+' 1440 '+penRows[display.theme][i][1]} aria-hidden="true"><image href={'/desk/pens-'+penFiles[display.theme]+'.png'} width="1536" height="1024"/></svg>
      <span className="pen-label">{markerNames[id]}</span><span className="pen-check" aria-hidden="true"><Icon name="check"/></span>
    </label>)}</fieldset>
   </section>
   <section className="model-card" aria-label="英文のお手本"><div className="model-heading"><h1>{record.phase==='complete'?'Copy complete':'Copy'}</h1><span>{record.entries.length} / {studySample.sentences.length}</span></div>
     <p className="model-sentence">{current.text}</p><p className={'model-meaning '+(meaning?'':'is-hidden')} aria-hidden={!meaning}>{translations[record.index]}</p>
     <div className="model-actions"><button onClick={playAudio}><Icon name="sound"/>音声を聞く</button><button aria-expanded={meaning} onClick={()=>setMeaning(v=>!v)}>{meaning?'意味を閉じる':'意味を見る'}</button><span>{record.phase==='complete'?'ノートに残りました':'ノートの行に書き写す'}</span></div>
   </section>
   <section className="index-book" aria-label="学習インデックス"><img src="/desk/index-book.png" alt="" className="index-plate"/>
    <div className="index-left"><h2>My Sentence Book</h2><div className="index-tabs" role="tablist" aria-label="ノートの目次" aria-orientation="vertical">{tabs.map((name,i)=><button key={name} role="tab" id={'index-tab-'+i} aria-selected={tab===i} aria-controls="index-content" tabIndex={tab===i?0:-1} onKeyDown={e=>{if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();const n=e.key==='Home'?0:e.key==='End'?4:(i+(e.key==='ArrowDown'?1:4))%5;setTab(n);document.getElementById('index-tab-'+n)?.focus();}}} onClick={()=>setTab(i)}>{name}<span aria-hidden="true">{tab===i?'—':''}</span></button>)}</div></div>
    <div className="index-right" id="index-content" role="tabpanel" aria-labelledby={'index-tab-'+tab} tabIndex={0}>
     <h2>{tabs[tab]}</h2>
     {tab===0&&<><button className="lesson-link" onClick={()=>{setPersonalMode(false);editor.current?.focus();}}>{studySample.title}<small>Copy · {record.entries.length} / 8</small></button><p>静かな朝の、小さな習慣。</p><p className="index-note">サンプル教材<br/>このブラウザに進み具合を保存します。</p></>}
     {tab===1&&<><p>Daily Life</p><p>Small Habits</p><a href="/setup">関心と教材メモを編集</a></>}
     {(tab===2||tab===3)&&<>{studySample.vocabulary.map(v=><label className="book-word" key={v.id}><input type="checkbox" checked={!!record.checks[v.id]} onChange={e=>persist({...record,checks:{...record.checks,[v.id]:e.target.checked}})}/><span>{v.english}<small>{v.meaning}</small></span></label>)}<p className="index-note">自分で復習した印をつけられます。</p></>}
     {tab===4&&(record.phase==='complete'?<><p>{studySample.title}</p><p>8文を書き終えました。</p><button onClick={()=>{setPersonalMode(true);changeDisplay({content:'study-notes'});requestAnimationFrame(()=>editor.current?.focus());}}>自分のひとことを書く</button><button onClick={exportPdf} disabled={exporting}>PDFに保存</button></>:<p>8文を書き終えると、<br/>ここに一枚のノートが残ります。</p>)}
    </div>
   </section>
   <section className="notebook-area" aria-label="A5学習ノート"><div className="mobile-writing-actions"><button onClick={()=>{editor.current?.focus();editor.current?.scrollIntoView({block:'center',inline:'nearest'});requestAnimationFrame(followCaret);}}>現在の行へ · {Math.min(record.index+1,8)} / 8</button>{writingAction()}</div><div className="notebook-toolbar"><span>A5 · 148 × 210 mm</span><button onClick={()=>setZoom(v=>v==='fit'?'read':'fit')}>{zoom==='fit'?'拡大して読む':'紙全体を見る'}</button></div>
    <div className={'desk-paper-scroll '+(zoom==='read'?'reading':'')} tabIndex={0} aria-label="ノート。拡大表示は左右にスクロールできます">
     <div className="desk-pages">{layout.pages.map(p=><div className="desk-page-row" key={p.index}><div className="desk-paper" ref={p.index===0?paper:undefined}>
      <A5Notebook layout={rendered} scene={scene} pageIndex={p.index} paperColor={paperColor} view={view} ink={palettes[display.marker]} time={reduced?scene.duration:time} reduced={reduced} personalInk={emptyInk}/>
      {p.index===position.page&&isEditing&&<textarea ref={editor} id="notebook-input" className={'notebook-input'+(liveInk?' live-ink-input':'')} aria-label={personalMode?'ノートに自分のひとことを書く':'ノートに英文を書き写す'} aria-describedby="writing-help writing-error" aria-invalid={!!error} spellCheck={false} autoCapitalize="off" autoCorrect="off" wrap="soft" disabled={!fontReady} value={draft} rows={1}
       style={{left:position.x*unit,top:inputTop,width:position.width*unit,height:inputHeight*unit,fontFamily:'"'+inputFamily+'", sans-serif',fontSize:4.1*unit,lineHeight:(5.2*unit)+'px'} as CSSProperties}
       onScroll={e=>setInputScroll({x:e.currentTarget.scrollLeft/unit,y:e.currentTarget.scrollTop/unit})} onChange={e=>changeDraft(e.target.value)} onSelect={followCaret} onFocus={()=>requestAnimationFrame(followCaret)} onKeyDown={keyDown} onCompositionStart={()=>{composing.current=true;setComposingText(true);}} onCompositionEnd={()=>{composing.current=false;setComposingText(false);compositionEnded.current=Date.now();}}/>}
      {p.index===position.page&&isEditing&&<LiveDraftInk key={personalMode?'personal':current.id} text={draft.length<=500?draft:''} font={display.english} animate={liveInk&&!reduced} visible={liveInk} x={position.x} y={position.y} width={position.width} top={position.y-4.65} height={inputHeight} scrollX={inputScroll.x} scrollY={inputScroll.y}/>}
     </div>{p.index===position.page&&<div className="notebook-action" style={{top:inputTop}}>
      {writingAction()}
     </div>}</div>)}</div>
    </div>
    <p id="writing-help" className="writing-help">{personalMode?'英語でひとこと。80文字以内。確定するとノートに残ります。':record.phase==='editing'?'入力した文字から、その場で筆跡になります。Enter または「確定」で答え合わせ。':'確定した文章を保存しました。'} {zoom==='read'?'左右にスクロールして読めます。':''}</p>
    <p id="writing-error" role="alert" className="desk-error">{error}</p>
    <div className="ink-actions"><button disabled={!record.entries.length||reduced} onClick={()=>{setAnnotationsOnly(false);setAnimateId(current.id);setTime(0);setPlaying(true);}}>筆跡をもう一度</button><button disabled={time>=scene.duration||reduced} onClick={()=>setPlaying(v=>!v)}>{playing?'筆記を一時停止':'筆記を続ける'}</button><button onClick={()=>{setTime(scene.duration);setPlaying(false);}}>書き終える</button></div>
   </section>
  </main>
  <footer className="desk-footer"><span>サンプル教材のCopy体験 · AI生成との連携は準備中</span><a href="/fonts/README.md">書体とライセンス</a></footer>
  <p className="desk-notice" role="status">{notice}</p>
  <dialog className="desk-settings" ref={settings}><div className="settings-heading"><h2>ノートを整える</h2><button onClick={()=>settings.current?.close()}>閉じる</button></div>
   <div className="settings-columns"><section><h3>机と書体</h3><fieldset><legend>机のテーマ</legend>{themes.map(t=><label key={t}><input type="radio" name="desk-theme" value={t} checked={display.theme===t} onChange={()=>changeDisplay({theme:t})}/>{themeNames[t]}</label>)}</fieldset>
    <label>英語の書体<select aria-label="英語の書体" value={display.english} onChange={e=>changeDisplay({english:e.target.value as DeskDisplay['english']})}>{Object.entries(englishFonts).map(([id,f])=><option key={id} value={id}>{f.label}</option>)}</select></label>
    <label>日本語の書体<select aria-label="日本語の書体" value={display.japanese} onChange={e=>changeDisplay({japanese:e.target.value as DeskDisplay['japanese']})}>{Object.entries(japaneseFonts).map(([id,f])=><option key={id} value={id}>{f.label}</option>)}</select></label>
    <label><input type="checkbox" checked={display.timerVisible} onChange={e=>changeDisplay({timerVisible:e.target.checked})}/>タイマーを表示する</label>
    <label>リセット後の時間<select aria-label="リセット後の時間" value={display.timerMinutes} onChange={e=>changeDisplay({timerMinutes:Number(e.target.value)})}>{[5,15,25,45,60].map(n=><option key={n} value={n}>{n} 分</option>)}</select></label>
    <label>筆記の速さ<select aria-label="筆記の速さ" value={speed} onChange={e=>setSpeed(Number(e.target.value))}>{[1,2,4].map(n=><option value={n} key={n}>{n}×</option>)}</select></label>
   </section><section><h3>ノートに残す内容</h3><label>内容<select aria-label="内容" value={display.content} onChange={e=>changeDisplay({content:e.target.value as DeskDisplay['content']})}><option value="study-notes">単語・イディオムも載せる</option><option value="sentences-only">センテンスのみ</option></select></label>
    <fieldset disabled={display.content==='sentences-only'}><legend>学習メモ</legend>{(['shown','blank'] as const).map(v=><label key={v}><input type="radio" name="desk-memos" checked={display.memos===v} value={v} onChange={()=>changeDisplay({memos:v})}/>{v==='shown'?'表示する':'空欄にする'}</label>)}</fieldset><p>空欄でも、本文や単語欄は動きません。</p>
    <label><input type="checkbox" checked={display.markers} onChange={e=>changeDisplay({markers:e.target.checked})}/>画面にマーカーを表示</label>
    <label><input type="checkbox" checked={display.vocabulary} onChange={e=>changeDisplay({vocabulary:e.target.checked})}/>単語欄を表示</label><label><input type="checkbox" checked={display.grammar} onChange={e=>changeDisplay({grammar:e.target.checked})}/>構文欄を表示</label>
    <h3>印刷用PDF</h3><p>完成ノートは A5（148 × 210 mm）です。</p>
    <label>印刷用紙<select aria-label="印刷用紙" value={display.sheet} onChange={e=>changeDisplay({sheet:e.target.value as DeskDisplay['sheet']})}><option value="A5">A5 · 1ページ</option><option value="A4">A4横 · 同じA5を2部</option></select></label>
    <div className="binding-fields"><label>綴じる側<select aria-label="綴じる側" value={display.side} onChange={e=>changeDisplay({side:e.target.value as DeskDisplay['side']})}><option value="left">左</option><option value="right">右</option></select></label><label>綴じ代<select aria-label="綴じ代" value={display.binding} onChange={e=>changeDisplay({binding:Number(e.target.value) as DeskDisplay['binding']})}>{[12,18,24].map(n=><option value={n} key={n}>{n} mm</option>)}</select></label></div>
    <label><input type="checkbox" checked={display.printMarkers??display.markers} onChange={e=>changeDisplay({printMarkers:e.target.checked})}/>PDFにマーカーを入れる</label>
    <p>100%（実際のサイズ）で印刷。A4は面付け済みなので、印刷画面の「1枚あたりのページ数」は1にします。入力途中の文字はPDFに入りません。</p>
    <button className="pdf-button" disabled={exporting||!record.entries.length} onClick={exportPdf}>{exporting?'PDFを作成中…':'確定したノートをPDFに'}</button>
   </section></div>
  </dialog>
 </div>;
}
