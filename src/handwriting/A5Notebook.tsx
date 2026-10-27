import { japaneseFonts } from './fonts';
import { A5, visibleLayer, visiblePages } from './a5-layout';
import type { A5Layout, ViewSettings, createA5Scene } from './a5-layout';
import { inkProgress, penPosition } from './model';
import type { Stroke } from './model';
import type { InkPalette } from './palettes';
import type { usePersonalInk } from './usePersonalInk';

function StrokePath({stroke,time}:{stroke:Stroke;time:number}) {
  const progress=inkProgress((time-stroke.start)/stroke.duration);
  return <path d={stroke.d} transform={'translate('+stroke.x+' '+stroke.y+') scale('+stroke.scale+')'}
    visibility={progress===0?'hidden':'visible'} fill="none" stroke={stroke.color} strokeWidth={stroke.width}
    strokeLinecap="round" strokeLinejoin="round" strokeDasharray={stroke.length+' '+stroke.length}
    strokeDashoffset={stroke.length*(1-progress)} data-phase={stroke.phase}/>;
}
export function Pen({x,y,marker=false}:{x:number;y:number;marker?:boolean}) {
  return <g transform={'translate('+x+' '+y+') rotate(28)'} aria-hidden="true">
    <path d="M 0 0 L -.65 -2.4 L .65 -2.4 Z" fill="#a99a78"/>
    <path d="M -.65 -2.4 V -10 Q 0 -10.8 .65 -10 V -2.4 Z" fill={marker?'#90aec3':'#47627A'}/>
    <path d="M 0 0 L 0 -1" stroke="#383A3D" strokeWidth=".2"/>
  </g>;
}
export function A5Notebook({layout,scene,view,ink,time,reduced,personalInk,pageIndex,paperColor}:{
  pageIndex?:number;paperColor?:string;layout:A5Layout;scene:ReturnType<typeof createA5Scene>&{memoStarts?:Record<string,number>};view:ViewSettings;ink:InkPalette;
  time:number;reduced:boolean;personalInk:ReturnType<typeof usePersonalInk>;
}) {
  const visible=scene.strokes.filter(s=>visibleLayer(s.layer,view)&&(view.markers||s.phase!=='marking'));
  const pen=personalInk.pending?null:penPosition(visible,time,.8);
  const penPage=visible.find(s=>time<s.start+s.duration)?.page;
  return <>{visiblePages(layout,view).filter(p=>pageIndex===undefined||p.index===pageIndex).map(p=>{
    const runs=p.runs.filter(r=>visibleLayer(r.layer,view));
    const titleId='note-title-'+p.index,descId='note-description-'+p.index;
    const spoken=runs.filter(r=>r.layer!=='base'&&(r.layer!=='memo'||time>=(scene.memoStarts?.[r.sourceId]??scene.memoStart))).map(r=>r.text).join(' ');
    return <svg key={p.index} className="notebook" viewBox="0 0 148 210" role="img" aria-labelledby={titleId+' '+descId}
      data-page={p.index} data-complete={time>=scene.duration} data-memos={view.memos}>
      <title id={titleId}>{layout.source.title} — {p.index+1}ページ</title>
      <desc id={descId}>{spoken}{view.memos==='blank'?' 学習メモの欄は空欄です。':''}</desc>
      <g aria-hidden="true">
        <rect width={148} height={210} fill={paperColor??A5.paper}/>
        {p.lines.filter(l=>visibleLayer(l.layer,view)).map(l=><line key={l.id} data-rule={l.id}
          x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={l.accent?ink.title:A5.rule} strokeWidth={l.width}/>)}
        {view.content==='study-notes'&&p.boxes.map(b=><g key={b.id} data-box={b.id}>
          <rect x={b.x} y={b.y} width={b.width} height={b.height} fill="none" stroke={ink.title} strokeWidth=".25"/>
          {b.checked&&<path d={'M '+(b.x+.4)+' '+(b.y+1.3)+' l .6 .7 l 1.1 -1.5'} fill="none" stroke={A5.ink} strokeWidth=".25"/>}
        </g>)}
        {visible.filter(s=>s.page===p.index&&s.phase==='marking').map(s=><StrokePath key={s.id} stroke={{...s,color:ink.marker}} time={time}/>)}
        {runs.map(r=><g key={r.id} data-run={r.id} data-layer={r.layer} data-baseline={r.y}>
          {r.face==='static'?(r.layer!=='memo'||time>=(scene.memoStarts?.[r.sourceId]??scene.memoStart))&&<text fontFamily={japaneseFonts[layout.fonts.japanese].family} fontSize={r.size} fill={r.accent?ink.title:A5.ink}>
            {r.glyphs.map(g=><tspan key={g.index} x={g.x} y={g.y}>{g.char}</tspan>)}
          </text>:visible.filter(s=>s.page===p.index&&s.phase!=='marking'&&s.id.startsWith(r.id+':')).map(s=><StrokePath key={s.id} stroke={{...s,color:s.accent?ink.title:A5.ink}} time={time}/>)}
        </g>)}
        {view.content==='study-notes'&&p.index===layout.personalPage&&<g data-testid="personal-strokes">
          {personalInk.paths.map(path=><StrokePath key={path.key} stroke={path.stroke} time={path.time}/>)}
        </g>}
        {view.content==='study-notes'&&p.index===layout.personalPage&&personalInk.pen&&<g data-testid="personal-pen"><Pen {...personalInk.pen}/></g>}
        {pen&&penPage===p.index&&!reduced&&<g data-testid="pen"><Pen {...pen}/></g>}
      </g>
    </svg>;
  })}</>;
}
