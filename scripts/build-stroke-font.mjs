// Font derivative and build script: SIL OFL 1.1.
// EMS strokes by Sheldon B. Michaels; SVG by Windell H. Oskay.
// Original designers, copyrights and derivative changes: public/fonts/README.md.
// Renamed Sentence Notebook families; local tangents, normalized scale, spacing and aliases.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import svgpath from 'svgpath';
import {svgPathProperties} from 'svg-path-properties';
const packs=[
 {source:'EMSDelight',file:'font-data',name:'Sentence Notebook Print',license:'Delius',scale:.2},
 {source:'EMSNeato',file:'font-neat',name:'Sentence Notebook Pen',license:'BadScript',scale:.145,overhang:true},
 {source:'EMSReadabilityItalic',file:'font-readability',name:'Sentence Notebook Readability',license:'SourceSans',scale:.2,overhang:true},
 {source:'EMSTech',file:'font-tech',name:'Sentence Notebook Tech',license:'ArchitectsDaughter',scale:.2,overhang:true},
];
for(const pack of packs){
const path='assets/fonts/'+pack.source+'.svg';
const xml="import json,xml.etree.ElementTree as E,sys\nr=E.parse(sys.argv[1]).getroot()\nprint(json.dumps([dict(g.attrib) for g in r.iter() if g.tag.endswith('glyph') and g.get('unicode')]))";
const glyphs=JSON.parse(execFileSync('python3',['-c',xml,path],{encoding:'utf8'}));
function smooth(points){
 if(points.length<3)return points.map((p,i)=>(i?'L':'M')+p.join(' ')).join(' ');
 const tangent=i=>{
  if(i===0||i===points.length-1)return [0,0];
  const a=points[i-1],b=points[i],c=points[i+1],u=[b[0]-a[0],b[1]-a[1]],v=[c[0]-b[0],c[1]-b[1]];
  const lu=Math.hypot(...u),lv=Math.hypot(...v);
  if(!lu||!lv||(u[0]*v[0]+u[1]*v[1])/(lu*lv)<.64)return [0,0];
  const d=[c[0]-a[0],c[1]-a[1]],n=Math.hypot(...d),length=Math.min(lu,lv)/3;
  return d.map(x=>x/n*length);
 };
 let d='M '+points[0].join(' ');
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],t=tangent(i-1),u=tangent(i);
  d+=' C '+[a[0]+t[0],a[1]+t[1],b[0]-u[0],b[1]-u[1],...b].map(x=>Number(x.toFixed(3))).join(' ');
 }
 return d;
}
const data={};
for(const g of glyphs){
 const segments=svgpath(g.d||'').abs().unshort().unarc().segments;
 if(segments.some(s=>!['M','L'].includes(s[0]))){
  const d=svgpath(g.d).abs().unshort().unarc().scale(pack.scale,-pack.scale).round(3).toString();
  data[g.unicode]={advance:Number(g['horiz-adv-x']||378)*pack.scale,strokes:(d.match(/M[^M]+/g)||[]).map(d=>({d,length:new svgPathProperties(d).getTotalLength()}))};
  continue;
 }
 const parts=[];
 for(const s of segments){if(s[0]==='M')parts.push([]);if(s[0]==='M'||s[0]==='L')parts.at(-1).push(s.slice(1));else throw new Error('Unexpected command '+s[0]);}
 if(pack.source==='EMSDelight'&&g.unicode==='B')parts.reverse();
 if(pack.source==='EMSDelight'&&['C','f'].includes(g.unicode)&&parts[0])parts[0].reverse();
 const strokes=parts.map(points=>svgpath(smooth(points)).scale(pack.scale,-pack.scale).round(3).toString()).map(d=>({d,length:new svgPathProperties(d).getTotalLength()})).filter(s=>s.length>.1);
 data[g.unicode]={advance:Number(g['horiz-adv-x']||378)*pack.scale,strokes};
}
// Reserve real overhangs; independent letters stay separate.
if(pack.overhang)for(const glyph of Object.values(data)){
 const xs=glyph.strokes.flatMap(s=>{const p=new svgPathProperties(s.d);return Array.from({length:101},(_,i)=>p.getPointAtLength(s.length*i/100).x);});
 if(!xs.length)continue;
 const min=Math.min(...xs),max=Math.max(...xs),shift=Math.max(0,2-min);
 glyph.strokes=glyph.strokes.map(s=>({...s,d:svgpath(s.d).translate(shift,0).round(3).toString()}));
 glyph.advance=Number(Math.max(glyph.advance+shift,max+shift+4).toFixed(3));
}
for(const [to,from] of Object.entries({'’':"'",'‘':"'",'“':'"','”':'"','–':'-','—':'-'}))data[to]=data[from];
fs.writeFileSync('src/handwriting/'+pack.file+'.ts', '// '+pack.name+' — derived from '+pack.source+'.\n// SIL OFL 1.1; see public/licenses/EMS-OFL.txt and '+pack.license+'-OFL.txt.\nexport const fontData: Record<string, { advance: number; strokes: { d: string; length: number }[] }> = '+JSON.stringify(data)+';\n');
console.log(pack.name,'glyphs',Object.keys(data).length);
}
