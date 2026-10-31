import {useEffect,useRef} from 'react';
import type {RefObject} from 'react';
import {englishFonts,japaneseFonts} from '../handwriting/fonts';
import type {EnglishFontId,JapaneseFontId} from '../handwriting/fonts';
import {layoutText} from '../handwriting/model';
import type {DeskDisplay} from './core';
import type {PrintSides} from '../handwriting/study-pdf';

// Settings live on the objects they change: hand and page contents in the index book,
// print with the finished notes, timer length on the timer, voice on the card.
export type ChangeDisplay=(patch:Partial<DeskDisplay>)=>void;

// Small sheets close on Escape or on a press outside them, like paper set back down.
export function useDismiss(open:boolean,close:()=>void,ref:RefObject<HTMLElement|null>) {
 const latest=useRef(close);latest.current=close;
 useEffect(()=>{
  if(!open)return;
  const down=(e:PointerEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))latest.current();};
  const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();latest.current();}};
  document.addEventListener('pointerdown',down);document.addEventListener('keydown',key);
  return()=>{document.removeEventListener('pointerdown',down);document.removeEventListener('keydown',key);};
 },[open,ref]);
}

// The real centerline strokes of each face, so the learner chooses from actual handwriting.
export function HandSample({font,text='Making time'}:{font:EnglishFontId;text?:string}) {
 const data=englishFonts[font].data,glyphs=layoutText(text,0,4.6,1000,4.1,6,data);
 const width=Math.max(1,...glyphs.map(g=>g.x+g.advance));
 return <svg className="hand-sample" viewBox={'0 1 '+(width+.6)+' 5.2'} aria-hidden="true">
  {glyphs.flatMap((g,i)=>(data[g.char]?.strokes??[]).map((s,j)=><path key={i+':'+j} d={s.d} transform={'translate('+g.x+' '+g.y+') scale('+g.scale+')'}
   fill="none" stroke="currentColor" strokeWidth={.2/g.scale} strokeLinecap="round" strokeLinejoin="round"/>))}
 </svg>;
}

export function NoteStyle({display,change}:{display:DeskDisplay;change:ChangeDisplay}) {
 const sentencesOnly=display.content==='sentences-only';
 return <div className="note-style">
  <fieldset className="style-group"><legend>英語の筆跡</legend>
   {(Object.keys(englishFonts) as EnglishFontId[]).map(id=><label key={id} className="hand-choice">
    <input type="radio" name="note-english" checked={display.english===id} onChange={()=>change({english:id})}/>
    <HandSample font={id}/><span className="sr-only">{englishFonts[id].label}</span>
   </label>)}
  </fieldset>
  <fieldset className="style-group"><legend>日本語の文字</legend>
   {(Object.keys(japaneseFonts) as JapaneseFontId[]).map(id=><label key={id} className="hand-choice">
    <input type="radio" name="note-japanese" checked={display.japanese===id} onChange={()=>change({japanese:id})}/>
    <span className="japanese-sample" style={{fontFamily:japaneseFonts[id].family}} aria-hidden="true">朝の習慣</span><span className="sr-only">{japaneseFonts[id].label}</span>
   </label>)}
  </fieldset>
  <fieldset className="style-group style-toggles"><legend>ノートに載せる</legend>
   <label><input type="checkbox" checked={!sentencesOnly} onChange={e=>change({content:e.target.checked?'study-notes':'sentences-only'})}/>語句と学習欄</label>
   <label><input type="checkbox" disabled={sentencesOnly} checked={display.memos==='shown'} onChange={e=>change({memos:e.target.checked?'shown':'blank'})}/>学習メモ</label>
   <label><input type="checkbox" checked={display.markers} onChange={e=>change({markers:e.target.checked})}/>マーカー</label>
   <label><input type="checkbox" disabled={sentencesOnly} checked={display.vocabulary} onChange={e=>change({vocabulary:e.target.checked})}/>単語欄</label>
   <label><input type="checkbox" disabled={sentencesOnly} checked={display.grammar} onChange={e=>change({grammar:e.target.checked})}/>構文欄</label>
  </fieldset>
 </div>;
}

// Each daily note prints as one two-sided sheet: the copied page, and the review page on the back.
// Printers without A5 duplex print one side, then the same sheet turned over.
export function PrintPanel({display,change,ready,exporting,onExport}:{display:DeskDisplay;change:ChangeDisplay;ready:boolean;exporting:boolean;onExport:(sides:PrintSides)=>void}) {
 return <div className="print-panel">
  <p className="index-subhead">印刷</p>
  <fieldset className="style-group print-sheets"><legend className="sr-only">用紙</legend>
   <label><input type="radio" name="print-sheet" checked={display.sheet==='A5'} onChange={()=>change({sheet:'A5'})}/>A5</label>
   <label><input type="radio" name="print-sheet" checked={display.sheet==='A4'} onChange={()=>change({sheet:'A4'})}/>A4に2部</label>
  </fieldset>
  <label className="print-check"><input type="checkbox" checked={display.printMarkers??display.markers} onChange={e=>change({printMarkers:e.target.checked})}/>マーカーも印刷</label>
  <div className="print-sides" role="group" aria-label="PDFにする"><button className="pdf-button" disabled={!ready||exporting} onClick={()=>onExport('both')}>{exporting?'作成中…':'両面'}</button>
   <button disabled={!ready||exporting} onClick={()=>onExport('front')}>表だけ</button><button disabled={!ready||exporting} onClick={()=>onExport('back')}>裏だけ</button></div>
  <p className="index-note">100%で印刷。両面は{display.sheet==='A4'?'短辺とじ':'長辺とじ'}、裏は確認問題。両面に対応しないプリンタは、表を刷った紙を裏返して裏を。まず1枚で向きを確かめてください。</p>
 </div>;
}
