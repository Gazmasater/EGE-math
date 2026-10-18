"""Validate editable slide content against the reviewed, original FIPI assets."""
import json,zipfile,hashlib,io,xml.etree.ElementTree as E,math
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
NS={k:'urn:oasis:names:tc:opendocument:xmlns:'+v+':1.0' for k,v in [('d','drawing'),('s','style'),('o','office'),('t','text'),('p','presentation'),('svg','svg-compatible'),('fo','xsl-fo-compatible')]}
NS['x']='http://www.w3.org/1999/xlink'
def a(e,p,k,default=None):return e.get('{'+NS[p]+'}'+k,default)
def cm(v):
 if v.endswith('cm'):return float(v[:-2])
 if v.endswith('in'):return float(v[:-2])*2.54
 raise ValueError(v)
report={}
for id,m in json.load(open(ROOT/'scripts/data/oge-informatics-presentations-content.json')).items():
 raw=(ROOT/'storage/oge-informatics-release/originals'/m['archiveHash']).read_bytes();assert hashlib.sha256(raw).hexdigest()==m['archiveHash']
 with zipfile.ZipFile(io.BytesIO(raw)) as z:
  names={(i.filename if i.flag_bits&2048 else i.filename.encode('cp437').decode('cp866')).replace('\\','/'):i for i in z.infolist()}
  assert hashlib.sha256(z.read(names[m['sourceDocument']])).hexdigest()==m['sourceDocumentHash']
  for p in m['photos']:assert hashlib.sha256(z.read(names[p['member']])).hexdigest()==p['sha256']
 data=(ROOT/'solution-files/oge-informatics'/(id+'.odp')).read_bytes()
 with zipfile.ZipFile(io.BytesIO(data)) as z:
  assert z.read('mimetype')==b'application/vnd.oasis.opendocument.presentation';assert z.testzip() is None
  tree=E.fromstring(z.read('content.xml'));styles=E.fromstring(z.read('styles.xml'))
  props={a(s,'s','name'):s.find('s:text-properties',NS) for s in tree.findall('.//s:style',NS)}
  pages=tree.findall('.//o:presentation/d:page',NS);assert len(pages)==3
  layouts=styles.findall('.//s:page-layout/s:page-layout-properties',NS)
  assert any(math.isclose(cm(a(p,'fo','page-width'))/cm(a(p,'fo','page-height')),16/9,rel_tol=1e-5) for p in layouts)
  assert not any('animation' in el.tag.lower() or el.tag.startswith('{urn:oasis:names:tc:opendocument:xmlns:animation') for el in tree.iter())
  bi=0;pi=0
  for i,page in enumerate(pages):
   frames=page.findall('d:frame',NS);expected=2 if i==0 else 1+len(m['patterns'][i-1]);assert len(frames)==expected,(id,i,'frame count')
   rectangles=[];pattern=[]
   for j,f in enumerate(frames):
    x,y,w,h=[cm(a(f,'svg',k)) for k in ('x','y','width','height')];assert x>=0 and y>=0 and x+w<=32.01 and y+h<=18.01,(id,'bounds');rectangles.append((x,y,w,h))
    image=f.find('d:image',NS)
    if image is not None:
     rawimage=z.read(a(image,'x','href'));assert hashlib.sha256(rawimage).hexdigest()==m['photos'][pi]['sha256'],(id,'image bytes');pi+=1
     with Image.open(io.BytesIO(rawimage)) as im:assert math.isclose(w/h,im.width/im.height,rel_tol=.002),(id,'image aspect ratio')
     pattern.append((y+h/2,x,'I'))
    else:
     text=''.join(f.find('d:text-box',NS).itertext());size=40 if i==0 and j==0 else 24 if i==0 or j==0 else 20
     expectedtext=m['theme'] if i==0 and j==0 else 'Номер участника: ______' if i==0 else m['headings'][i-1] if j==0 else m['blocks'][bi]
     assert text==expectedtext,(id,'text',text,expectedtext)
     for span in f.findall('.//t:span',NS):
      p=props[a(span,'t','style-name')];assert a(p,'fo','font-size')==str(size)+'pt';assert a(p,'s','font-name')=='Liberation Sans'
     if i>0 and j>0:bi+=1;pattern.append((y+h/2,x,'T'))
   for k,(x,y,w,h) in enumerate(rectangles):
    for xx,yy,ww,hh in rectangles[k+1:]:assert min(x+w,xx+ww)-max(x,xx)<.02 or min(y+h,yy+hh)-max(y,yy)<.02,(id,'overlap')
   if i>0:
    actual=''.join(o[2] for o in sorted(pattern,key=lambda o:(round(o[0]),o[1])));assert actual==m['patterns'][i-1],(id,'layout',actual)
  assert bi==pi==len(m['blocks'])
 report[id]=dict(slides=3,images=pi,textBlocks=bi,fileHash=hashlib.sha256(data).hexdigest(),status='ok')
print(json.dumps(report))
