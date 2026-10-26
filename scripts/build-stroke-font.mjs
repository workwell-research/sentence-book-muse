// Font derivative/build script: SIL OFL 1.1, public/licenses/Stroke-Font-OFL.txt.
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import svgpath from 'svgpath';
import { svgPathProperties } from 'svg-path-properties';
const source = "import json,xml.etree.ElementTree as E\nr=E.parse('assets/fonts/CutlingsSingularis.svg').getroot()\nprint(json.dumps([dict(g.attrib) for g in r.iter() if g.tag.endswith('glyph') and g.get('unicode')]))";
const glyphs = JSON.parse(execFileSync('python3', ['-c', source], {encoding:'utf8'}));
const orders = { A:[2,1,0], H:[2,1,0], E:[3,4,0,2,1], F:[4,2,1,0,3], t:[1,0], f:[1,0], g:[1,0], i:[2,1,0], j:[1,0], '!':[1,0], '?':[1,0] };
const data = {};
for (const g of glyphs) {
 const path = svgpath(g.d || '').scale(1,-1).abs().unshort().unarc().round(3).toString();
 const parts = path.match(/M[^M]+/g) || [];
 const ordered = (orders[g.unicode] || parts.map((_,i)=>i)).map(i=>parts[i]).filter(Boolean);
 const strokes = ordered.map(d=>({d,length:new svgPathProperties(d).getTotalLength()})).filter(s=>s.length>0.1);
 data[g.unicode] = {advance:Number(g['horiz-adv-x'] || 70),strokes};
}
data[' '] = {advance:65,strokes:[]};

// Newly authored geometric punctuation completes printable ASCII; same OFL license.
const additions={
 "'":[40,["M 21 -118 Q 25 -103 12 -91"]],
 '*':[80,["M 40 -110 L 40 -55","M 17 -96 L 64 -69","M 18 -68 L 63 -96"]],
 '<':[90,["M 72 -99 L 18 -54 L 73 -10"]],
 '>':[90,["M 18 -99 L 72 -54 L 17 -10"]],
 '[':[65,["M 49 -140 L 18 -140 L 18 15 L 49 15"]],
 ']':[65,["M 14 -140 L 45 -140 L 45 15 L 14 15"]],
 '^':[90,["M 15 -82 L 44 -126 L 73 -82"]],
 '_':[100,["M 8 12 Q 49 10 92 12"]],
 '|':[45,["M 23 -151 Q 20 -70 23 28"]],
 '{':[75,["M 58 -145 C 15 -149 40 -90 12 -69 C 42 -47 15 22 58 19"]],
 '}':[75,["M 16 -145 C 59 -149 34 -90 62 -69 C 32 -47 59 22 16 19"]],
 '$':[105,["M 84 -121 C 19 -160 0 -76 49 -75 C 111 -73 94 9 19 -12","M 56 -163 L 44 22"]],
 '%':[125,["M 24 -19 L 106 -138","M 35 -142 C 9 -145 7 -96 32 -95 C 60 -96 59 -141 35 -142 Z","M 91 -62 C 65 -65 63 -16 88 -15 C 116 -16 115 -61 91 -62 Z"]],
};
additions[String.fromCharCode(96)]=[50,["M 14 -124 L 33 -101"]];
for (const [char,[advance,paths]] of Object.entries(additions)) data[char]={advance,strokes:paths.map(d=>({d,length:new svgPathProperties(d).getTotalLength()}))};

for (const [to,from] of Object.entries({'’':"'",'‘':"'",'“':'"','”':'"','–':'-','—':'-'})) data[to]=data[from];
writeFileSync('src/handwriting/font-data.ts', '// Sentence Study Strokes — derived from Cutlings Singularis by Ellen Wasbø.\n// Font data licensed under SIL OFL 1.1; see public/licenses/Stroke-Font-OFL.txt.\nexport const fontData: Record<string, { advance: number; strokes: { d: string; length: number }[] }> = '+JSON.stringify(data)+';\n');
console.log('Generated '+Object.keys(data).length+' glyphs.');
