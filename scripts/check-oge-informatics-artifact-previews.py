#!/usr/bin/env python3
"""Check and render PDFs exported by the OGE ODS/ODP builders for visual review.

Requires pdftoppm, pdftotext and Pillow. A successful report checks visible text;
contact sheets still need an actual human/visual review before publication.
"""
from decimal import Decimal,ROUND_HALF_UP
import json,subprocess,xml.etree.ElementTree as E,zipfile,re,sys
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
R=Path(__file__).resolve().parents[1];W=R/'storage/informatics-completion';dest=W/'artifact-review';dest.mkdir(parents=True,exist_ok=True)
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',17)
ns={'h':'http://www.w3.org/1999/xhtml','d':'urn:oasis:names:tc:opendocument:xmlns:drawing:1.0','s':'urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0'}
report={'presentations':[],'spreadsheets':[]}
for kind,models in [('presentations',json.load(open(R/'scripts/data/oge-informatics-presentations-content.json'))),('spreadsheets',json.load(open(R/'scripts/data/oge-informatics-spreadsheets-evidence.json')))]:
 previews=[]
 for id,m in models.items():
  pdf=W/('presentation-pdf' if kind=='presentations' else 'sheet-pdf')/(id+'.pdf');prefix=dest/id
  subprocess.run(['pdftoppm','-scale-to-x','720','-scale-to-y','-1','-png',str(pdf),str(prefix)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
  pages=sorted(dest.glob(id+'-*.png'));assert len(pages)==(3 if kind=='presentations' else 1),(id,'pages')
  if kind=='presentations':
   bbox=subprocess.run(['pdftotext','-bbox',str(pdf),'-'],check=True,capture_output=True).stdout;tree=E.fromstring(bbox)
   z=zipfile.ZipFile(R/'solution-files/oge-informatics'/(id+'.odp'));source=E.fromstring(z.read('content.xml'));sp=source.findall('.//d:page',ns)
   for i,p in enumerate(tree.findall('.//h:page',ns)):
    words=p.findall('h:word',ns);text=' '.join(''.join(w.itertext()) for w in words).replace('- ','-')
    wanted=[m['theme'],'Номер участника: ______'] if i==0 else [m['headings'][i-1]]+m['blocks'][0:2 if i==1 else 0] if i==1 else [m['headings'][1]]+m['blocks'][2:]
    for t in wanted:assert ' '.join(t.split()) in text,(id,i,'missing visible text',t,text)
    frames=[f for f in sp[i].findall('d:frame',ns) if f.find('d:text-box',ns) is not None];rects=[tuple(float(f.get('{'+ns['s']+'}'+key)[:-2]) for key in ('x','y','width','height')) for f in frames]
    for word in words:
     x1,y1,x2,y2=[float(word.get(key))*2.54/72 for key in ('xMin','yMin','xMax','yMax')]
     assert any(x1>=x-.08 and y1>=y-.08 and x2<=x+w+.08 and y2<=y+h+.08 for x,y,w,h in rects),(id,i,'overflow',word.text,(x1,y1,x2,y2))
   for page in pages:previews.append((id,page))
  else:
   text=subprocess.run(['pdftotext',str(pdf),'-'],capture_output=True,text=True,check=True).stdout.replace(',','.').replace('−','-')
   assert '###' not in text,(id,'number does not fit column')
   for result,places in zip(m['results'][:2],m['displayDecimals']):
    visible=format(Decimal(result['value']).quantize(Decimal(1).scaleb(-places),rounding=ROUND_HALF_UP),'f')
    assert visible in text,(id,'answer not visible in PDF',visible,text)
   previews.append((id,pages[0]))
  report[kind].append(dict(id=id,pages=len(pages),status='ok'));print(kind,id,'OK',flush=True)
 for start in range(0,len(previews),9):
  canvas=Image.new('RGB',(2160,1455),'white');draw=ImageDraw.Draw(canvas)
  for j,(id,file) in enumerate(previews[start:start+9]):
   row=j//3;col=j%3;im=Image.open(file).convert('RGB');im.thumbnail((720,455));draw.text((col*720+5,row*485+3),id+' · '+file.stem.split('-')[-1],fill='black',font=font);canvas.paste(im,(col*720,row*485+27))
  canvas.save(dest/f'{kind}-contact-{start//9:02}.jpg',quality=88)
(dest/'checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
