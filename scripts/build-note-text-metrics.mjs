import fs from 'node:fs';
import crypto from 'node:crypto';
import fontkit from '@pdf-lib/fontkit';
const path='public/fonts/MPLUS1p-Regular.ttf',bytes=fs.readFileSync(path);
const font=fontkit.create(bytes),widths={},ranges=[];
for(const code of [...font.characterSet].sort((a,b)=>a-b)) {
 const width=font.glyphForCodePoint(code).advanceWidth/font.unitsPerEm;
 if(width!==1) widths[code]=width;
 const last=ranges.at(-1);
 if(last&&code===last[1]+1)last[1]=code;else ranges.push([code,code]);
}
fs.writeFileSync('src/handwriting/text-metrics.json',JSON.stringify({units:'em',sha256:crypto.createHash('sha256').update(bytes).digest('hex'),ranges,widths})+'\n');
