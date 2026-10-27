import { useEffect, useMemo, useRef, useState } from 'react';
import { currentPhase, supported, unsupported } from './model';
import { createA5Layout, createA5Scene, defaultView, visiblePages, A5 } from './a5-layout';
import type { ViewSettings } from './a5-layout';
import { studySample } from './study-content';
import { A5Notebook } from './A5Notebook';
import type { CSSProperties } from 'react';
import { defaultPrintOptions } from './print-layout';
import type { PrintOptions } from './print-layout';
import { palettes, paletteIds } from './palettes';
import './handwriting.css';
import { usePersonalInk } from './usePersonalInk';

const phaseLabels={writing:'英文を書いています',marking:'大切な表現に、マーカーを',annotating:'余白に、ひとこと',complete:'一枚のノートができました'};
export function HandwritingDemo() {
 const [view,setView]=useState<ViewSettings>(defaultView);
 const [zoom,setZoom]=useState(()=>window.matchMedia('(max-width: 760px)').matches?'read':'fit');
 const [printMarkers,setPrintMarkers]=useState<boolean|null>(null);
 const [checks,setChecks]=useState<Record<string,boolean>>({});
 const [personal,setPersonal]=useState('');
 const [speed,setSpeed]=useState(1);
 const [running,setRunning]=useState(true);
 const [time,setTime]=useState(0);
 const [reduced,setReduced]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
 const [print,setPrint]=useState<PrintOptions>(defaultPrintOptions);
 const [exporting,setExporting]=useState(false);
 const [feedback,setFeedback]=useState('');
 const missing=unsupported(personal);
 const content=useMemo(()=>({...studySample,
   personal:[...personal].map(char=>supported(char)?char:' ').join(''),
   vocabulary:studySample.vocabulary.map(v=>({...v,checked:checks[v.id]??v.checked})),
 }),[personal,checks]);
 const ink=palettes[print.palette];
 const layout=useMemo(()=>createA5Layout(content,print),[content,print.binding,print.side]);
 const note=useMemo(()=>createA5Scene(layout),[layout]);
 const personalInk=usePersonalInk(content.personal,layout.personal,reduced,A5.ink,.20);
 const elapsed=useRef(0), duration=useRef(note.duration);
 duration.current=note.duration;

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
     const {exportStudyNote}=await import('./study-pdf');
     const bytes=await exportStudyNote(layout,view,{...print,markers:printMarkers??view.markers});
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
      <div className="paper-toolbar">
        <span>A5 · 148 × 210 mm · {visiblePages(layout,view).length}ページ</span>
        <label>表示倍率<select aria-label="ノートの表示倍率" value={zoom} onChange={e=>setZoom(e.target.value)}><option value="fit">紙全体</option><option value="read">拡大して読む</option></select></label>
      </div>
      <p className="zoom-help">{zoom==='read'?'左右にスクロールして読めます。':'印刷ではA5の実寸になります。'}</p>
      <div className={'paper-scroll '+(zoom==='read'?'is-reading':'')} tabIndex={0} role="region" aria-label="A5ノート。拡大表示では左右にスクロールできます">
        <div className="paper-pages"><A5Notebook layout={layout} scene={note} view={view} ink={ink} time={time} reduced={reduced} personalInk={personalInk}/></div>
      </div>
      <p className="below-paper">読む。書く。残しておきたくなる。</p>
    </div>
    <aside className="ink-controls" id="demo-controls" aria-label="筆記デモの操作">
      <h1>学びが、一枚の<br/>ノートになる。</h1>
      <p className="intro">一画ずつ、言葉が紙に残っていく。<br/>大切な表現も、あなたの一言も。</p>
      <section className="view-section" aria-label="ノートの表示設定">
        <label className="sheet-label" htmlFor="note-content">ノートに載せる内容</label>
        <select id="note-content" value={view.content} onChange={e=>{setView({...view,content:e.target.value as ViewSettings['content']});setFeedback('');}}>
          <option value="study-notes">単語・イディオムも載せる</option><option value="sentences-only">センテンスのみ</option>
        </select>
        <fieldset className="memo-options" disabled={view.content==='sentences-only'} aria-describedby="memo-help">
          <legend>学習メモ</legend>
          <div>{(['shown','blank'] as const).map(value=><label key={value}>
            <input type="radio" name="memos" value={value} checked={view.memos===value} onChange={()=>{setView({...view,memos:value});setFeedback('');}}/>
            {value==='shown'?'表示する':'空欄にする'}
          </label>)}</div>
        </fieldset>
        <p id="memo-help" className="field-help">{view.content==='sentences-only'?'学習メモは単語・イディオム付きで使えます。':'空欄でも本文や単語欄は動きません。印刷後、自分の言葉で書き込めます。'}</p>
        <label className="marker-choice"><input type="checkbox" checked={view.markers} onChange={e=>{setView({...view,markers:e.target.checked});setFeedback('');}}/>画面にマーカーを表示する</label>
      </section>
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
        <p className="field-help" id="personal-help">英語でひとこと。単語・イディオム付きのノートに加わります。</p>
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
      <details className="review-section">
        <summary>単語の復習チェック</summary>
        <p className="field-help">自分で復習した印です。このデモのチェックは保存されません。</p>
        {content.vocabulary.map(v=><label className="marker-choice" key={v.id}>
          <input type="checkbox" checked={v.checked} onChange={e=>{setChecks({...checks,[v.id]:e.target.checked});setFeedback('');}}/>{v.english}
        </label>)}
      </details>
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
        <label className="marker-choice"><input type="checkbox" checked={printMarkers??view.markers} onChange={e=>{setPrintMarkers(e.target.checked);setFeedback('');}}/>PDFにマーカーを入れる</label>
        <p className="field-help">メモは画面と同じ設定です。マーカーは印刷後に自分で引くこともできます。</p>
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
