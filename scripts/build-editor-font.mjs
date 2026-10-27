// SIL OFL 1.1: derivative of the same licensed notebook centerlines.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {svgPathProperties} from 'svg-path-properties';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import os from 'node:os';
const root=fileURLToPath(new URL('../',import.meta.url));
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'sentence-input-font-'));
const packs=[['readability','font-readability','Readability'],['tech','font-tech','Tech'],['print','font-data','Print'],['pen','font-neat','Pen']];
for(const [id,file,name] of packs){
 const raw=fs.readFileSync(root+'/src/handwriting/'+file+'.ts','utf8');
 const data=JSON.parse(raw.slice(raw.indexOf(' = {')+3).replace(/;\s*$/,''));
 const glyphs=Object.fromEntries(Object.entries(data).map(([char,g])=>[char,{advance:g.advance,lines:g.strokes.map(s=>{
  const p=new svgPathProperties(s.d),steps=Math.max(1,Math.ceil(s.length/2));
  return Array.from({length:steps+1},(_,i)=>{const pt=p.getPointAtLength(s.length*i/steps);return[pt.x,-pt.y];});
 })}]));
 fs.writeFileSync(path.join(scratch,'editor-font-'+id+'.json'),JSON.stringify({id,name,glyphs}));
}
execFileSync(process.env.FONT_PYTHON??'python3',[path.join(root,'scripts/build-editor-font.py'),root,scratch],{stdio:'inherit'});
fs.rmSync(scratch,{recursive:true});
