import json,math,sys
from pathlib import Path
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib.removeOverlaps import removeOverlaps

root=Path(sys.argv[1]);out=root/'public/fonts';U=16384;scale=U/200;r=(.2/(4.1/200))/2
for id in ['readability','tech','print','pen']:
 data=json.loads((Path(sys.argv[2])/('editor-font-'+id+'.json')).read_text()); chars=list(data['glyphs']); names={c:'uni%04X'%ord(c) for c in chars}
 order=['.notdef']+list(names.values());fb=FontBuilder(U,isTTF=True);fb.setupGlyphOrder(order)
 glyphs={};metrics={'.notdef':(U//2,0)}
 def polygon(pen,pts):
  pen.moveTo(tuple(round(v*scale) for v in pts[0]))
  for pt in pts[1:]:pen.lineTo(tuple(round(v*scale) for v in pt))
  pen.closePath()
 glyphs['.notdef']=TTGlyphPen(None).glyph()
 for c,g in data['glyphs'].items():
  pen=TTGlyphPen(None)
  for line in g['lines']:
   for x,y in line:
    polygon(pen,[(x+r*math.cos(-2*math.pi*i/12),y+r*math.sin(-2*math.pi*i/12)) for i in range(12)])
   for (ax,ay),(bx,by) in zip(line,line[1:]):
    dx,dy=bx-ax,by-ay;length=math.hypot(dx,dy)
    if length<.0001:continue
    nx,ny=-dy/length*r,dx/length*r
    polygon(pen,[(ax+nx,ay+ny),(bx+nx,by+ny),(bx-nx,by-ny),(ax-nx,ay-ny)])
  glyph=pen.glyph();glyphs[names[c]]=glyph
  metrics[names[c]]=(round(g['advance']*scale), min(pt[0] for pt in glyph.coordinates) if glyph.numberOfContours else 0)
 fb.setupGlyf(glyphs);fb.setupHorizontalMetrics(metrics);fb.setupHorizontalHeader(ascent=U,descent=0,lineGap=0)
 fb.setupCharacterMap({ord(c):names[c] for c in chars})
 family='Sentence Notebook '+data['name']+' Input'
 fb.setupNameTable({'familyName':family,'styleName':'Regular','uniqueFontIdentifier':family+' 1.0','fullName':family,'psName':family.replace(' ',''),'version':'Version 1.0','copyright':'Derivative of licensed EMS centerlines. Original credits and OFL notices: public/fonts/README.md.','licenseDescription':'SIL Open Font License, Version 1.1. See accompanying notices.','licenseInfoURL':'https://openfontlicense.org/'})
 fb.setupOS2(sTypoAscender=U,sTypoDescender=0,sTypoLineGap=0,usWinAscent=U,usWinDescent=U//2)
 fb.setupPost();fb.setupMaxp()
 # Each segment and joint was drawn as its own shape; merge them, or browsers show the seams as thin light lines (owner's 2026-11-01 report).
 removeOverlaps(fb.font,removeHinting=True)
 fb.font.flavor='woff2';path=out/('NotebookInput-'+id+'.woff2');fb.save(path)
 print(path.name,path.stat().st_size)
