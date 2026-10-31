import { defaultFonts, englishFonts, japaneseFonts } from './fonts';
import type { FontSettings, JapaneseFontId } from './fonts';
import { layoutText, supported } from './model';
import type { Glyph, Stroke } from './model';
import type { StudyContent } from './study-content';
import refill from '../../docs/assets/studygram-2026-10-27/blue-v2/refill-a5-v1.json';

const geometry=refill.geometry;
export const A5 = { width:refill.page.widthMm, height:refill.page.heightMm,
  left:geometry.bindingMarginMm, right:geometry.outerMarginMm, first:geometry.bodyFirstRuleMm,
  pitch:geometry.rulePitchMm, rows:Math.round((geometry.bodyLastRuleMm-geometry.bodyFirstRuleMm)/geometry.rulePitchMm)+1,
  titleTop:geometry.headerTopRuleMm, titleBottom:geometry.headerBottomRuleMm, titleBaseline:refill.slots.title.baselineMm,
  footer:geometry.footerRuleMm, rule:geometry.bodyRuleColor, paper:refill.page.paper, ink:'#383A3D',
  // Page furniture (title/date/footer lines, “The Sentence Book”) stays about as light as the rules.
  faint:'#B9C3CB', dateLineY:18, dateLineLength:42 } as const;
export interface PaperSettings { binding:number; side:'left'|'right'; }
export interface ViewSettings { content:'study-notes'|'sentences-only'; memos:'shown'|'blank'; markers:boolean; }
export const defaultView:ViewSettings = {content:'study-notes',memos:'shown',markers:true};
export type Layer = 'base'|'body'|'memo'|'study'|'personal';
export interface InkRun {
  id:string; sourceId:string; text:string; x:number; y:number; size:number;
  face:'hand'|'static'; layer:Layer; accent:boolean; faint?:boolean; glyphs:Glyph[];
}
export interface PaperLine {id:string;x1:number;y1:number;x2:number;y2:number;width:number;layer:Layer;accent?:boolean;}
export interface PaperBox {id:string;x:number;y:number;width:number;height:number;checked?:boolean;}
export interface Highlight {id:string;x1:number;x2:number;y:number;layer:Layer;}
export interface A5Page {index:number;runs:InkRun[];lines:PaperLine[];boxes:PaperBox[];markers:Highlight[];}
export interface A5Layout {pages:A5Page[];left:number;right:number;mainRight:number;railX:number;personal:Glyph[];personalPage:number;source:StudyContent;fonts:FontSettings;}
export function staticAdvance(char:string,size:number,font:JapaneseFontId=defaultFonts.japanese) {
  const metrics=japaneseFonts[font].metrics,staticWidths=metrics.widths as Record<string,number>;
  const cp=char.codePointAt(0)!;
  if(!metrics.ranges.some(([a,b])=>cp>=a&&cp<=b)) throw new Error('ノート用フォントに未対応の文字があります: '+char);
  return (staticWidths[cp]??1)*size;
}
export function wrapInk(text:string,width:number,size:number,face:'hand'|'static',fonts:FontSettings=defaultFonts) {
  if(face==='hand') {
    if(!supported(text,englishFonts[fonts.english].data)) throw new Error('筆跡に未対応の文字があります。入力は保持されています。');
    const glyphs=layoutText(text,0,0,width-1,size,1,englishFonts[fonts.english].data);
    const ys=[...new Set(glyphs.map(g=>g.y))];
    return ys.map(y=>glyphs.filter(g=>g.y===y));
  }
  const rows:Glyph[][]=[[]];let x=0,index=0;
  for(const char of text) {
    if(char==='\n'){rows.push([]);x=0;index++;continue;}
    const advance=staticAdvance(char,size,fonts.japanese);
    if(x+advance>width&&rows.at(-1)!.length){rows.push([]);x=0;}
    rows.at(-1)!.push({char,index,x,y:0,scale:1,advance});x+=advance;index++;
  }
  return rows;
}
// Raise phrase meanings within their reserved row, keeping room for English descenders.
const glossBaselineLiftMm=1;
const baseline=(row:number)=>A5.first+(row%A5.rows)*A5.pitch;
const pageAt=(row:number)=>Math.floor(row/A5.rows);
const lineText=(glyphs:Glyph[])=>glyphs.map(g=>g.char).join('').trimEnd();

// Owner's print review (2026-10-31): rules and bands run edge to edge like loose-leaf refills,
// so front and back look alike; the outer margin is narrower than the adopted 12 mm.
export const outerMarginMm=8;
// Every page shares the same furniture: one title line, a short date line at the outer top, and a footer line.
// Title and date are written only on the first copied page; the others leave the lines blank.
function paperLines(edge:number):PaperLine[] {
  return [
    ...Array.from({length:A5.rows},(_,n)=>({id:'rule-'+n,x1:0,x2:A5.width,y1:A5.first+n*A5.pitch,y2:A5.first+n*A5.pitch,width:.10,layer:'base' as const})),
    {id:'band-title',x1:0,x2:A5.width,y1:A5.titleBottom,y2:A5.titleBottom,width:.22,layer:'base'},
    {id:'band-footer',x1:0,x2:A5.width,y1:A5.footer,y2:A5.footer,width:.18,layer:'base'},
    {id:'date-line',x1:edge-A5.dateLineLength,x2:edge,y1:A5.dateLineY,y2:A5.dateLineY,width:.18,layer:'base'},
  ];
}

export function createA5Layout(source:StudyContent,paper:PaperSettings={binding:18,side:'left'},fonts:FontSettings=defaultFonts):A5Layout {
  const wrap=(text:string,width:number,size:number,face:'hand'|'static')=>wrapInk(text,width,size,face,fonts);
  if(![12,18,24].includes(paper.binding)||!['left','right'].includes(paper.side))throw new Error('綴じ代の設定を確認してください。');
  const left=paper.side==='left'?paper.binding:outerMarginMm,right=paper.side==='right'?paper.binding:outerMarginMm;
  const edge=A5.width-right,mainRight=edge-32,railX=edge-28,mainWidth=mainRight-left;
  const pages:A5Page[]=[];
  const page=(index:number):A5Page=>{
    while(pages.length<=index) {
      const i=pages.length;
      pages.push({index:i,runs:[],boxes:[],markers:[],lines:paperLines(edge)});
    }
    return pages[index];
  };
  function run(id:string,sourceId:string,glyphs:Glyph[],x:number,row:number,size:number,layer:Layer,face:'hand'|'static'='hand',accent=false,baselineOffsetMm=0) {
    const y=baseline(row)+baselineOffsetMm,placed=glyphs.map(g=>({...g,x:g.x+x,y}));
    page(pageAt(row)).runs.push({id,sourceId,text:lineText(glyphs),x,y,size,layer,face,accent,glyphs:placed});
    return placed;
  }
  let row=0,railNext=0;
  const sourceIds=new Set<string>();
  const checkId=(id:string)=>{if(!id||sourceIds.has(id))throw new Error('ノートの項目IDが重複しています。');sourceIds.add(id);};
  for(const sentence of source.sentences) {
    checkId(sentence.id);
    for(const gloss of sentence.glosses??[]) {
      checkId(gloss.id);
      if(!Number.isInteger(gloss.start)||!Number.isInteger(gloss.end)||gloss.start<0||gloss.end<=gloss.start||[...sentence.text].slice(gloss.start,gloss.end).join('')!==gloss.quote)
        throw new Error('意味メモの語句と文字位置が一致しません。');
    }
    const wrapped=wrap(sentence.text,mainWidth,4.1,'hand');
    let firstRow=row;
    for(const [lineIndex,letters] of wrapped.entries()) {
      const anchored=(sentence.glosses??[]).filter(g=>letters.some(l=>l.index===g.start));
      const glossLines=anchored.map(g=>{
        const x=Math.min(letters.find(l=>l.index===g.start)!.x+left,mainRight-28);
        return {gloss:g,x,lines:wrap(g.meaning,mainRight-x,2.6,'static')};
      });
      const reserve=glossLines.reduce((n,g)=>n+g.lines.length,0);
      if(row%A5.rows+1+Math.min(reserve,A5.rows-1)>A5.rows)row=(pageAt(row)+1)*A5.rows;
      if(lineIndex===0)firstRow=row;
      const placed=run(sentence.id+':'+lineIndex,sentence.id,letters,left,row,4.1,'body');
      for(const g of sentence.glosses??[]) {
        const selected=placed.filter(l=>l.index>=g.start&&l.index<g.end&&l.char!==' ');
        if(selected.length)page(pageAt(row)).markers.push({id:g.id+':'+lineIndex,x1:selected[0].x-.25,x2:selected.at(-1)!.x+selected.at(-1)!.advance,y:baseline(row)-.45,layer:'body'});
      }
      row++;
      for(const g of glossLines) for(const [i,letters] of g.lines.entries())run(g.gloss.id+':'+i,g.gloss.id,letters,g.x,row++,2.6,'memo','static',false,-glossBaselineLiftMm);
    }
    // A last-line gloss occupies the intervening row; otherwise reserve a whole blank row.
    const last=wrapped.at(-1)??[];
    if(!(sentence.glosses??[]).some(g=>last.some(l=>l.index===g.start))) row++;
    for(const [n,footnote] of (sentence.footnotes??[]).entries()) {
      checkId(footnote.id);
      railNext=Math.max(firstRow,railNext);
      const number=source.sentences.slice(0,source.sentences.indexOf(sentence)).reduce((n,s)=>n+(s.footnotes?.length??0),0)+n+1;
      const lines=wrap(number+'. '+footnote.text,edge-railX,3.2,'hand');
      for(const [i,letters] of lines.entries())run(footnote.id+':'+i,footnote.id,letters,railX,railNext++,3.2,'memo');
      run(footnote.id+':anchor',footnote.id,wrap(String(number),2,1.8,'hand')[0],mainRight+.3,firstRow,1.8,'memo');
      railNext++;
    }
  }
  // Rail allocation is measured even when its ink will be hidden.
  const storyEnd=Math.max(row,railNext);
  for(let i=0;i<=pageAt(Math.max(0,storyEnd-1));i++) {
    const last=Math.min(A5.rows-1,storyEnd-i*A5.rows-1);
    page(i).lines.push({id:'rail',x1:edge-30,x2:edge-30,y1:A5.first-3,y2:baseline(i*A5.rows+last)+1,width:.18,layer:'study',accent:true});
  }
  row=storyEnd+1;
  function room(count:number){if(row%A5.rows+count>A5.rows)row=(pageAt(row)+1)*A5.rows;}
  function heading(id:string,text:string){run(id,id,wrap(text,edge-left,4.5,'hand')[0],left,row++,4.5,'study','hand',true);}
  for(let n=0;n<source.vocabulary.length;) {
    room(3);const topRow=row;
    heading('words-heading-'+n,n?'Words to keep (continued)':'Words to keep');
    const index=pageAt(topRow),xEnglish=left+6,meaningX=left+(edge-left)*.53;
    while(n<source.vocabulary.length) {
      const word=source.vocabulary[n];checkId(word.id);
      const english=wrap(word.english,meaningX-xEnglish-3,3.8,'hand');
      const meaning=wrap(word.meaning,edge-meaningX-2,2.7,'static');
      const needed=Math.max(english.length,meaning.length);
      if(needed>A5.rows-2)throw new Error('単語の説明が長すぎます。短い意味に分けてください。');
      if(pageAt(row+needed-1)!==index){sourceIds.delete(word.id);break;}
      for(const [j,g] of english.entries())run(word.id+':en:'+j,word.id,g,xEnglish,row+j,3.8,'study');
      for(const [j,g] of meaning.entries())run(word.id+':ja:'+j,word.id,g,meaningX,row+j,2.7,'study','static');
      page(index).boxes.push({id:word.id,x:left+1.5,y:baseline(row)-2.5,width:2.5,height:2.5,checked:word.checked});
      row+=needed;n++;
    }
    page(index).boxes.push({id:'vocabulary-frame-'+index,x:left-1,y:baseline(topRow)-4.6,width:edge-left+1,height:baseline(row-1)-baseline(topRow)+5.9});
    if(n<source.vocabulary.length)row=(index+1)*A5.rows;else row+=1;
  }
  if(source.grammar) {
    checkId(source.grammar.id);
    const lines=wrap(source.grammar.english,edge-left,4.1,'hand');
    const labels=wrap(source.grammar.label,edge-left,2.8,'hand');
    room(Math.min(A5.rows,1+lines.length+labels.length));heading('pattern-heading','A useful pattern');
    for(const [i,g] of lines.entries())run(source.grammar.id+':'+i,source.grammar.id,g,left,row++,4.1,'study');
    for(const [i,g] of labels.entries())run(source.grammar.id+':label:'+i,source.grammar.id,g,left,row++,2.8,'study','hand',true);
    row++;
  }
  let personal:Glyph[]=[],personalPage=0;
  if(source.personal) {
    // UI caps this editable line at 80 characters; keep its block together.
    const lines=wrap(source.personal,edge-left,4.1,'hand');
    if(lines.length>A5.rows-1)throw new Error('ひとことを短くしてください。入力は保持されています。');
    room(lines.length+1);heading('personal-heading','My own words');personalPage=pageAt(row);
    for(const [i,g] of lines.entries())personal.push(...run('personal-user:'+i,'personal-user',g,left,row++,4.1,'personal'));
  }
  page(0);
  for(const p of pages) {
    const metadata=(id:string,text:string,x:number,y:number,size:number,align:'left'|'right',maxWidth:number,faint=false)=>{
      const lines=wrap(text,maxWidth,size,'hand');
      // Metadata is never silently truncated, nor allowed to move the body grid.
      if(lines.length>1)throw new Error('タイトルまたは分類名が欄に収まりません。表示名を短くしてください。元の内容は保持されています。');
      const g=lines[0]??[],w=g.reduce((n,l)=>n+l.advance,0),left=align==='right'?x-w:x;
      p.runs.push({id,sourceId:source.id,text,x:left,y,size,face:'hand',layer:'base',accent:false,faint,glyphs:g.map(l=>({...l,x:l.x+left,y:y-(id==='title'?englishFonts[fonts.english].titleLift*size/200:0)}))});
    };
    if(p.index===0) {
      metadata('title',source.title,left,A5.titleBaseline,5.65,'left',edge-left);
      metadata('classification',source.classification?.label??'Unfiled',edge,11,3.2,'right',edge-left);
      metadata('date',source.date??'Draft',edge,A5.dateLineY-1,2.9,'right',edge-left);
    }
    metadata('footer','The Sentence Book',edge,206,2.7,'right',edge-left,true);
  }
  return {pages,left,right,mainRight,railX,personal,personalPage,source,fonts:{...fonts}};
}

// Pages printed with the copied note but not written on screen: built in front orientation on the
// same grid, and placed on the right side of the sheet by `printPages`.
function extraPage(layout:A5Layout,index:number,title:string|null) {
  const {fonts,left}=layout,edge=A5.width-layout.right;
  const page:A5Page={index,runs:[],boxes:[],markers:[],lines:paperLines(edge)};
  const wrap=(text:string,width:number,size:number,face:'hand'|'static')=>wrapInk(text,width,size,face,fonts);
  const place=(id:string,text:string,glyphs:Glyph[],x:number,y:number,size:number,face:'hand'|'static',layer:Layer,accent=false,faint=false)=>
    page.runs.push({id,sourceId:id,text,x,y,size,face,layer,accent,faint,glyphs:glyphs.map(g=>({...g,x:g.x+x,y}))});
  const metadata=(id:string,text:string,x:number,y:number,size:number,align:'left'|'right',faint=false)=>{
    const g=wrap(text,edge-left,size,'hand')[0]??[],w=g.reduce((n,l)=>n+l.advance,0);
    place(id,text,g,align==='right'?x-w:x,y-(id==='title'?englishFonts[fonts.english].titleLift*size/200:0),size,'hand','base',false,faint);
  };
  // The lesson title and date belong to the first copied page only; a review page names itself on the title line.
  if(title)metadata('title',title,left,A5.titleBaseline,5.65,'left');
  metadata('footer','The Sentence Book',edge,206,2.7,'right',true);
  return {page,place,wrap,left,edge};
}

// The review: each sentence's meaning, then two ruled rows to write the English from memory.
// Long translations continue on another page instead of blocking the PDF; the type never shrinks.
export function createReviewPages(layout:A5Layout,firstIndex:number):A5Page[] {
  const items=layout.source.sentences.map((s,i)=>({n:i+1,meaning:s.meaning?.trim()??''})).filter(s=>s.meaning);
  const pages:A5Page[]=[];
  let current=extraPage(layout,firstIndex,'Review');pages.push(current.page);
  const next=()=>{current=extraPage(layout,firstIndex+pages.length,'Review (continued)');pages.push(current.page);};
  const numberWidth=6,meaningWidth=current.edge-current.left-numberWidth,writing=2;
  // A meaning the notebook font cannot draw is left off rather than blocking the whole PDF.
  const wrapped=items.flatMap(item=>{try{return [{...item,lines:current.wrap(item.meaning,meaningWidth,2.9,'static')}];}catch{return [];}});
  let row=0;
  for(const item of wrapped) {
    // Keep an item together when it fits on a fresh page.
    if(row>0&&row+item.lines.length+writing>A5.rows){next();row=0;}
    current.place('review-number-'+item.n,item.n+'.',current.wrap(item.n+'.',numberWidth,3.2,'hand')[0]??[],current.left,A5.first+row*A5.pitch,3.2,'hand','body',true);
    for(const [i,g] of item.lines.entries()) {
      if(row>=A5.rows){next();row=0;}
      current.place('review-'+item.n+':'+i,item.meaning,g,current.left+numberWidth,A5.first+row*A5.pitch-1,2.9,'static','body');
      row++;
    }
    row+=writing;
  }
  return pages;
}
export const createNotesPage=(layout:A5Layout,index:number):A5Page=>extraPage(layout,index,null).page;

// Print order for long-edge duplex: every copied page on a front, the review behind the last one,
// and plain ruled notes behind any earlier copied page. Odd positions are backs.
export function printPages(layout:A5Layout,view:ViewSettings):A5Page[] {
  const copied=visiblePages(layout,view),pages:A5Page[]=[];
  for(const [i,p] of copied.entries()) {
    pages.push(p);
    if(i<copied.length-1)pages.push(createNotesPage(layout,pages.length));
  }
  return [...pages,...createReviewPages(layout,pages.length)];
}

export function visibleLayer(layer:Layer,view:ViewSettings) {
  if(layer==='base'||layer==='body')return true;
  if(view.content==='sentences-only')return false;
  return layer!=='memo'||view.memos==='shown';
}
export function visiblePages(layout:A5Layout,view:ViewSettings) {
  return layout.pages.filter(p=>view.content==='study-notes'||p.runs.some(r=>r.layer==='body'));
}
export interface SceneStroke extends Stroke {page:number;layer:Layer;id:string;accent:boolean;faint?:boolean;}
export function createA5Scene(layout:A5Layout,includePersonal=false) {
  const strokes:SceneStroke[]=[];let clock=250;
  const add=(run:InkRun,page:number,phase:Stroke['phase'])=>{
    const immediate=(run.layer==='base'&&(run.id!=='title'||page>0))||run.id==='personal-heading';
    if(run.face!=='hand'||(!includePersonal&&run.sourceId==='personal-user'))return;
    let n=0;
    for(const g of run.glyphs) {
      for(const s of englishFonts[layout.fonts.english].data[g.char]?.strokes??[]) {
        const duration=Math.max(16,s.length*g.scale*11);
        strokes.push({...s,x:g.x,y:g.y,scale:g.scale,start:clock,duration,phase,width:(run.id==='title'?.28:.20)/g.scale,color:A5.ink,page,layer:run.layer,id:run.id+':'+n++,accent:run.accent,faint:run.faint});
        // Metadata is present immediately; handwriting is the authored motion.
        if(!immediate)clock+=duration+5;
        else {strokes.at(-1)!.start=0;strokes.at(-1)!.duration=1;}
      }
      if(g.char===' '&&!immediate)clock+=12;
    }
    if(run.layer!=='base'&&run.id!=='personal-heading')clock+=60;
  };
  for(const p of layout.pages)for(const run of [...p.runs.filter(r=>r.layer==='base'),...p.runs.filter(r=>r.layer!=='memo'&&r.layer!=='base')])add(run,p.index,'writing');
  for(const p of layout.pages)for(const m of p.markers) {
    strokes.push({d:'M '+m.x1+' '+m.y+' L '+m.x2+' '+m.y,length:m.x2-m.x1,x:0,y:0,scale:1,start:clock,duration:350,phase:'marking',width:2.25,color:A5.ink,page:p.index,layer:m.layer,id:m.id,accent:true});clock+=430;
  }
  const memoStart=clock;
  for(const p of layout.pages)for(const run of p.runs.filter(r=>r.layer==='memo'))add(run,p.index,'annotating');
  return {strokes:strokes.sort((a,b)=>a.start-b.start),duration:clock+150,memoStart};
}
