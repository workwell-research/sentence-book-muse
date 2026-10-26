import { useEffect, useMemo, useRef, useState } from 'react';
import { createNote, currentPhase, inkProgress, penPosition, sampleNote, unsupported } from './model';
import type { NoteLayout, Stroke } from './model';
import type { CSSProperties } from 'react';
import { defaultPrintOptions } from './print-layout';
import type { PrintOptions } from './print-layout';
import { palettes, paletteIds } from './palettes';
import './handwriting.css';
import { usePersonalInk } from './usePersonalInk';

const phaseLabels={writing:'英文を書いています',marking:'大切な表現に、マーカーを',annotating:'余白に、ひとこと',complete:'一枚のノートができました'};
function StrokePath({stroke,time}:{stroke:Stroke;time:number}) {
 const progress=inkProgress((time-stroke.start)/stroke.duration);
 return <path d={stroke.d} transform={'translate('+stroke.x+' '+stroke.y+') scale('+stroke.scale+')'}
   visibility={progress===0?'hidden':'visible'} fill="none" stroke={stroke.color} strokeWidth={stroke.width} strokeLinecap="round" strokeLinejoin="round"
   opacity={stroke.phase==='marking'?.48:1} strokeDasharray={stroke.length+' '+stroke.length}
   strokeDashoffset={stroke.length*(1-progress)} data-phase={stroke.phase}/>;
}
function Notebook({note,time,reduceMotion,personalInk}:{note:NoteLayout;time:number;reduceMotion:boolean;personalInk:ReturnType<typeof usePersonalInk>}) {
 const pen=personalInk.pending?null:penPosition(note.strokes,time);
 const rules=[];
 for(let y=note.ruleStart;y<note.height-36;y+=note.lineHeight) rules.push(y);
 return <svg className="notebook" viewBox={'0 0 '+note.width+' '+note.height} role="img" aria-labelledby="note-title note-description" data-complete={time>=note.duration}>
   <title id="note-title">{note.content.title}</title>
   <desc id="note-description">{note.content.body} Expression: {note.content.phrase}. {note.content.annotation}. My own words: {note.content.personal || 'Blank.'}</desc>
   <g aria-hidden="true">
    <rect width={note.width} height={note.height} fill="#fffdf5"/>
    {rules.map(y=><line key={y} x1={note.left-5} x2={note.width-note.right+5} y1={y} y2={y} stroke="#d8ddd1" strokeWidth=".8"/>)}
    <text x={note.left} y={47} className="page-date">{note.content.date}</text>
    <text x={note.width-note.right} y={47} textAnchor="end" className="page-date">a moment, kept.</text>
    {note.strokes.filter(s=>s.phase==='marking').map((s,i)=><StrokePath key={'m'+i} stroke={s} time={time}/>)}
    {note.strokes.filter(s=>s.phase!=='marking').map((s,i)=><StrokePath key={i} stroke={s} time={time}/>)}
    <text x={note.left} y={note.personalTop-42} className="page-label">MY OWN WORDS</text>
    <g data-testid="personal-strokes">
     {personalInk.paths.map(p=><StrokePath key={p.key} stroke={p.stroke} time={p.time}/>)}
    </g>
    {personalInk.pen&&<g data-testid="personal-pen" transform={'translate('+personalInk.pen.x+' '+personalInk.pen.y+') rotate(32)'}>
      <path d="M 0 0 L -4 -13 L 4 -13 Z" fill="#b6a884" stroke="#685f49" strokeWidth=".8"/>
      <path d="M -3.5 -13 L -3.5 -40 Q 0 -43 3.5 -40 L 3.5 -13 Z" fill="#55664e"/>
      <path d="M 0 0 L 0 -8" stroke="#3d443d" strokeWidth="1"/>
    </g>}
    {!note.content.personal && <text x={note.left} y={note.personalTop-1} className="page-placeholder">あなたの一言を、この余白に。</text>}
    <text x={note.left} y={note.height-30} className="page-footer">The Sentence Book</text>
    <text x={note.width-note.right} y={note.height-30} textAnchor="end" className="page-footer">1</text>
    {pen && !reduceMotion && <g data-testid="pen" transform={'translate('+pen.x+' '+pen.y+')'} opacity={pen.down?1:.55}>
      {pen.marker?<path d="M -1 0 L 7 -15 L 16 -11 L 8 4 Z" fill="#b3a05a" stroke="#716336" strokeWidth=".8"/>:
      <g transform="rotate(32)"><path d="M 0 0 L -4 -13 L 4 -13 Z" fill="#b6a884" stroke="#685f49" strokeWidth=".8"/>
      <path d="M -3.5 -13 L -3.5 -47 Q 0 -50 3.5 -47 L 3.5 -13 Z" fill="#55664e"/>
      <path d="M 0 0 L 0 -8" stroke="#3d443d" strokeWidth="1"/></g>}
    </g>}
   </g>
 </svg>;
}
export function HandwritingDemo() {
 const paper=useRef<HTMLDivElement>(null);
 const [width,setWidth]=useState(670);
 const [personal,setPersonal]=useState('');
 const [speed,setSpeed]=useState(1);
 const [running,setRunning]=useState(true);
 const [time,setTime]=useState(0);
 const [reduced,setReduced]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
 const [print,setPrint]=useState<PrintOptions>(defaultPrintOptions);
 const [exporting,setExporting]=useState(false);
 const [feedback,setFeedback]=useState('');
 const date=useMemo(()=>new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric'}).format(new Date()),[]);
 const content=useMemo(()=>({...sampleNote,date,personal}),[date,personal]);
 const ink=palettes[print.palette];
 const note=useMemo(()=>createNote(content,width,{palette:ink}),[content,width,ink]);
 const personalInk=usePersonalInk(personal,note.personal,reduced,ink.personal);
 const elapsed=useRef(0), duration=useRef(note.duration);
 duration.current=note.duration;
 const missing=unsupported(personal);
 useEffect(()=>{
   const element=paper.current;
   if(!element)return;
   const observer=new ResizeObserver(entries=>setWidth(Math.max(280,Math.round(entries[0].contentRect.width))));
   observer.observe(element);return ()=>observer.disconnect();
 },[]);
 useEffect(()=>{
   const mq=window.matchMedia('(prefers-reduced-motion: reduce)');
   const change=()=>setReduced(mq.matches);
   mq.addEventListener('change',change);return ()=>mq.removeEventListener('change',change);
 },[]);
 useEffect(()=>{
   if(reduced){elapsed.current=duration.current;setTime(duration.current);setRunning(false);}
 },[reduced,note.duration]);
 useEffect(()=>{
   if(!running||reduced)return;
   let frame=0,previous=0;
   const tick=(now:number)=>{
     if(previous) elapsed.current=Math.min(duration.current,elapsed.current+Math.min(50,now-previous)*speed);
     previous=now;setTime(elapsed.current);
     if(elapsed.current<duration.current)frame=requestAnimationFrame(tick);
     else setRunning(false);
   };
   frame=requestAnimationFrame(tick);return ()=>cancelAnimationFrame(frame);
 },[running,speed,reduced]);
 const complete=time>=note.duration;
 function finish(){elapsed.current=note.duration;setTime(note.duration);setRunning(false);}
 function replay(){elapsed.current=0;setTime(0);setRunning(true);}
 async function savePDF(){
   setExporting(true);setFeedback('');
   try{
     const {exportNote}=await import('./pdf');
     const bytes=await exportNote(content,print);
     const blob=new Blob([new Uint8Array(bytes)],{type:'application/pdf'});
     const url=URL.createObjectURL(blob),link=document.createElement('a');
     link.href=url;link.download=print.sheet==='A4'?'sentence-book-a5-on-a4.pdf':'sentence-book-a5.pdf';link.click();
     window.setTimeout(()=>URL.revokeObjectURL(url),10000);
     setFeedback('PDFを作成しました。100%（実際のサイズ）で印刷してください。');
   }catch(error){setFeedback(error instanceof Error?error.message:'PDFを作れませんでした。もう一度お試しください。');}
   finally{setExporting(false);}
 }
 return <div className="ink-app">
   <a href="#demo-controls" className="ink-skip">操作へ移動</a>
   <header className="ink-header">
    <a href="/" className="wordmark">The Sentence Book<span>Learn digitally. Keep it beautifully.</span></a>
    <a href="/setup" className="setup-link">関心とメモ</a>
   </header>
   <main className="ink-workspace">
    <div className="paper-column">
      <div className="paper-caption"><span>筆記デモ · サンプル教材</span><span>English / everyday moments</span></div>
      <fieldset className="ink-palettes">
        <legend>文字のカラーセット</legend>
        <div className="palette-options">{paletteIds.map(id=><label key={id} className="palette-option" style={{'--palette-ink':palettes[id].title,'--palette-marker':palettes[id].marker} as CSSProperties}>
          <input type="radio" name="palette" value={id} checked={print.palette===id} onChange={()=>{setPrint({...print,palette:id});setFeedback('');}}/>
          <span className="palette-swatch" aria-hidden="true"/>{palettes[id].label}
        </label>)}</div>
      </fieldset>
      <div ref={paper} className="paper-sheet"><Notebook note={note} time={time} reduceMotion={reduced} personalInk={personalInk}/></div>
      <p className="below-paper">読む。書く。残しておきたくなる。</p>
    </div>
    <aside className="ink-controls" id="demo-controls" aria-label="筆記デモの操作">
      <h1>学びが、一枚の<br/>ノートになる。</h1>
      <p className="intro">一画ずつ、言葉が紙に残っていく。<br/>大切な表現も、あなたの一言も。</p>
      <section className="playback-section" aria-label="再生">
        <p className="ink-status" role="status">{phaseLabels[currentPhase(note,time)]}</p>
        <div className="playback-row">
         <button className="ink-button primary" onClick={complete?replay:()=>setRunning(v=>!v)} disabled={reduced}>
           {complete?'もう一度見る':running?'一時停止':'続きを見る'}
         </button>
         <button className="ink-button quiet" onClick={finish} disabled={complete}>完成を見る</button>
        </div>
        <div className="tempo-row"><label htmlFor="tempo">筆記の速さ</label><select id="tempo" value={speed} onChange={e=>setSpeed(Number(e.target.value))} disabled={reduced}>
          <option value={1}>ゆっくり · 1×</option><option value={2}>軽やか · 2×</option><option value={4}>すばやく · 4×</option>
        </select></div>
        {reduced&&<p className="field-help">端末の設定に合わせ、完成形を表示しています。</p>}
      </section>
      <section className="personal-section">
        <label htmlFor="personal">今日、大切にしたいことは？</label>
        <p className="field-help" id="personal-help">英語でひとこと。ノートの余白に加わります。</p>
        <textarea id="personal" rows={2} maxLength={80} placeholder="I make time for..." value={personal}
          aria-describedby={'personal-help'+(missing?' personal-error':'')} aria-invalid={!!missing}
          onChange={e=>{setRunning(false);setPersonal(e.target.value.replace(/\r?\n/g,' '));setFeedback('');}}/>
        <div className="input-meta"><span>このデモの入力は保存されません</span><span>{personal.length}/80</span></div>
        {personalInk.pending&&<div className="personal-actions">
          <button className="ink-button quiet" onClick={personalInk.toggle}>{personalInk.paused?'筆記を続ける':'筆記を一時停止'}</button>
          <button className="ink-button quiet" onClick={personalInk.finish}>書き終える</button>
        </div>}
        {missing&&<p className="ink-error" id="personal-error">「{missing}」は筆跡未対応です。入力は残っています。英数字と基本の記号でお試しください。</p>}
      </section>
      <section className="print-section" aria-label="PDF出力">
        <h2>この一枚を、手元に。</h2>
        <p className="note-format">完成ノート <strong>A5</strong><span>148 × 210 mm・縦向き</span></p>
        <label className="sheet-label" htmlFor="print-sheet">印刷用紙</label>
        <select id="print-sheet" value={print.sheet} onChange={e=>{setPrint({...print,sheet:e.target.value as PrintOptions['sheet']});setFeedback('');}}>
          <option value="A5">A5 · 1ページ</option><option value="A4">A4横 · 2面付け</option>
        </select>
        <div className="print-plan">
          <svg viewBox="0 0 100 73" role="img" aria-label={print.sheet==='A4'?'A4横にA5ノートを原寸で2部配置':'A5縦の完成ノート1ページ'}>
            {print.sheet==='A4'?<><rect x="1" y="2" width="98" height="69"/><path d="M 49.8 2 V 71 M 50.2 2 V 71" className="cut-guide"/><text x="25" y="39">A5</text><text x="75" y="39">A5</text></>:<><rect x="25" y="2" width="49" height="69"/><text x="50" y="39">A5</text></>}
          </svg>
          <p>{print.sheet==='A4'?'同じページを2部、原寸で配置。中央の2本の線で裁断します。':'1ページをそのまま印刷。A5ルーズリーフやバインダーに。'}</p>
        </div>
        <div className="print-fields">
          <label>綴じる側<select value={print.side} onChange={e=>setPrint({...print,side:e.target.value as PrintOptions['side']})}><option value="left">左</option><option value="right">右</option></select></label>
          <label>穴あけ・綴じ代<select value={print.binding} onChange={e=>setPrint({...print,binding:Number(e.target.value)})}><option value={12}>12 mm</option><option value={18}>18 mm</option><option value={24}>24 mm</option></select></label>
        </div>
        <label className="marker-choice"><input type="checkbox" checked={print.markers} onChange={e=>{setPrint({...print,markers:e.target.checked});setFeedback('');}}/>PDFにマーカーを入れる</label>
        <p className="field-help">外すと、印刷したあとに自分で引けます。</p>
        <p className="print-instructions">印刷倍率は<strong>100%（実際のサイズ）</strong>。{print.sheet==='A4'?'このPDFは面付け済みです。印刷画面の「1枚あたりのページ数」は1にしてください。':'用紙に合わせる拡大・縮小はオフにしてください。'}</p>
        <button className="ink-button export-button" disabled={exporting||!!missing} onClick={savePDF}>{exporting?'PDFを作っています…':'完成ページをPDFに'}</button>
        <p className="export-feedback" role="status">{feedback}</p>
      </section>
      <p className="prototype-note">筆跡と印刷のプロトタイプです。<br/>AI生成・学習記録との連携は、これから。</p>
    </aside>
   </main>
   <footer className="ink-footer"><span>A little practice. A page to keep.</span><a href="/licenses/Stroke-Font-OFL.txt">筆跡ライセンス</a></footer>
 </div>;
}
