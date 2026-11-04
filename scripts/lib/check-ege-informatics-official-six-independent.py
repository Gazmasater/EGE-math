import json,math,re,itertools,hashlib
from pathlib import Path
from decimal import Decimal,localcontext
ROOT=Path(__file__).resolve().parent
SCALE=10**6
SPECS={
 '0D9B7C':dict(kind='nearest',aType='KVI',bCountType='FII',bType='AII'),
 '90EECD':dict(kind='nearest',aType='BII',bCountType='GV',bType='KV'),
 '9C15B9':dict(kind='radius',aType='MIII',radius=1000000,bType='OIII',extreme='min',bCountType='GV'),
 '7B95E8':dict(kind='radius',aType='GIV',radius=1200000,bType='KIII',extreme='max',bCountType='AII'),
 '577EED':dict(kind='radius',aType='BII',radius=1500000,bType='GV',extreme='max',bCountType='KV'),
}
def sq(a,b):return (a['x']-b['x'])**2+(a['y']-b['y'])**2
def parse(path):
 points=[]
 for i,line in enumerate(path.read_text().splitlines(),1):
  x,y,code=line.split();assert re.fullmatch(r'(?:[OBAFGKM][0-9](?:I|II|III|IV|V|VI)|VII)',code)
  points.append(dict(index=i,x=int(Decimal(x.replace(',','.'))*SCALE),y=int(Decimal(y.replace(',','.'))*SCALE),code=code,type=code if code=='VII' else code[0]+code[2:]))
 return points
def partition(points,kind,family):
 groups=[[],[]] if kind=='A' else [[],[],[]]
 for p in points:
  if kind=='A':g=0 if p['y']<14*SCALE else 1
  elif family=='nearest':g=2 if p['x']>16*SCALE else (0 if p['y']<30*SCALE else 1)
  else:g=2 if p['x']>21*SCALE else (0 if p['y']<23*SCALE else 1)
  groups[g].append(p)
 assert all(groups)
 return groups
def prove(groups):
 bounds=[];options=[]
 for group in groups:
  xs=[p['x'] for p in group];ys=[p['y'] for p in group];xmin,xmax,ymin,ymax=min(xs),max(xs),min(ys),max(ys)
  assert xmax-xmin<=5500000 and ymax-ymin<=6000000
  bounds.append([xmin,xmax,ymin,ymax])
  options.append([[x,x+5500000,y,y+6000000] for x in [xmin,xmax-5500000] for y in [ymin,ymax-6000000]])
 for boxes in itertools.product(*options):
  if all(a[1]<b[0] or b[1]<a[0] or a[3]<b[2] or b[3]<a[2] for a,b in itertools.combinations(boxes,2)):
   return bounds,list(boxes)
 raise AssertionError('No disjoint rectangles')
def medoid(g):
 sums=[math.fsum(math.sqrt(sq(p,q)) for q in g) for p in g]
 order=sorted(range(len(g)),key=lambda k:sums[k]);first,second=order[:2]
 margin=sums[second]-sums[first];assert margin>0.001
 with localcontext() as ctx:
  ctx.prec=45
  exact=[sum(Decimal(sq(g[k],q)).sqrt() for q in g) for k in [first,second]]
  assert exact[1]>exact[0]
 return {'point':g[first],'sumMicro':sums[first],'runnerUpIndex':g[second]['index'],'gapMicro':margin,'highPrecisionTopTwoSums':[str(v) for v in exact]}
def file_result(path,kind,spec):
 points=parse(path);groups=partition(points,kind,spec['kind']);bounds,boxes=prove(groups);centers=[medoid(g) for g in groups]
 return points,groups,{'file':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'pointCount':len(points),'groups':[{'indices':[p['index'] for p in g],'size':len(g),'boundsMicro':bound,'rectangleMicro':box,'center':center} for g,bound,box,center in zip(groups,bounds,boxes,centers)]}
def compute(short,spec):
 folder=ROOT/('EGEINF'+short)
 pa,ga,a=file_result(next(folder.glob('*_A.txt')),'A',spec);pb,gb,b=file_result(next(folder.glob('*_B.txt')),'B',spec)
 ca=[g['center']['point'] for g in a['groups']];cb=[g['center']['point'] for g in b['groups']]
 ac=[len(g) for g in ga];bc=[sum(p['type']==spec['bCountType'] for p in g) for g in gb];detail={'aSizes':ac,'bCounts':bc}
 if spec['kind']=='nearest':
  ai=ac.index(max(ac));assert ac.count(ac[ai])==1
  eligible=sorted([p for p in ga[ai] if p['type']==spec['aType']],key=lambda p:sq(p,ca[ai]));assert len(eligible)>1 and sq(eligible[0],ca[ai])<sq(eligible[1],ca[ai])
  selected=eligible[0];amin=[abs(selected[k])//100 for k in ['x','y']]
  lo,hi=bc.index(min(bc)),bc.index(max(bc));assert bc.count(bc[lo])==bc.count(bc[hi])==1
  between=sq(cb[lo],cb[hi]);pairs=[(sq(p,q),gi,p['index'],q['index']) for gi,g in enumerate(gb) for p,q in itertools.combinations([p for p in g if p['type']==spec['bType']],2)];diameter=max(pairs)
  answer=amin+[math.isqrt(between)//100,math.isqrt(diameter[0])//100]
  detail.update(aCluster=ai,aSelected=selected,aDistanceSquared=sq(selected,ca[ai]),bMinCluster=lo,bMaxCluster=hi,bBetweenSquared=between,bDiameter={'squared':diameter[0],'cluster':diameter[1],'indices':list(diameter[2:])})
 else:
  ai=ac.index(min(ac));assert ac.count(ac[ai])==1
  selected=[p['index'] for p in ga[ai] if p['type']==spec['aType'] and sq(p,ca[ai])<=spec['radius']**2]
  between=sq(ca[0],ca[1]);distances=[(sq(p,cb[i]),i,p['index']) for i,g in enumerate(gb) for p in g if p['type']==spec['bType']];extreme=(min if spec['extreme']=='min' else max)(distances)
  answer=[len(selected),math.isqrt(between)//100,math.isqrt(extreme[0])//100,max(bc)]
  detail.update(aCluster=ai,aSelectedIndices=selected,aBetweenSquared=between,bExtreme={'squared':extreme[0],'cluster':extreme[1],'index':extreme[2]},bMaxCountClusters=[i for i,c in enumerate(bc) if c==max(bc)])
 return {'id':'EGEINF'+short,'spec':spec,'files':[a,b],'detail':detail,'answer':' '.join(map(str,answer))}
if __name__=='__main__':
 import tempfile,zipfile,io,importlib.util
 repo=Path(__file__).resolve().parents[2]
 proofs=json.loads((repo/'scripts/data/ege-informatics-official-six-proofs.json').read_text())
 with tempfile.TemporaryDirectory(prefix='ege-official-six-') as temporary:
  ROOT=Path(temporary)
  for id,p in proofs.items():
   archive=repo/'fipi-assets'/p['url'].removeprefix('/fipi/')
   data=archive.read_bytes();assert hashlib.sha256(data).hexdigest()==p['archiveSha256']
   target=ROOT/id;target.mkdir()
   with zipfile.ZipFile(io.BytesIO(data)) as z:
    for name,digest in p['memberHashes'].items():
     assert Path(name).name==name
     b=z.read(name);assert hashlib.sha256(b).hexdigest()==digest;(target/name).write_bytes(b)
  results=[compute(k,v) for k,v in SPECS.items()]
  for result in results:
   p=proofs[result['id']]['calculation']
   assert result['answer']==p['answer'] and result['detail']==p['detail']
   assert result['files']==p['files']
  spec=importlib.util.spec_from_file_location('ods',Path(__file__).with_name('read-ege-informatics-process-ods.py'))
  ods=importlib.util.module_from_spec(spec);spec.loader.exec_module(ods)
  rows=ods.read((ROOT/'EGEINF64212F/2_22.ods').read_bytes());ends={}
  while len(ends)<len(rows):
   previous=len(ends)
   for row in rows:
    if row['id'] not in ends and all(d in ends for d in row['depends']):ends[row['id']]=max([ends[d] for d in row['depends']],default=0)+row['duration']
   assert len(ends)>previous
  active=[r['id'] for r in rows if ends[r['id']]-r['duration']<23<=ends[r['id']]]
  assert active==proofs['EGEINF64212F']['active'] and str(len(active))==proofs['EGEINF64212F']['answer']
  print(json.dumps({'status':'ok','tasks':6,'starPoints':sum(f['pointCount'] for r in results for f in r['files']),'processes':len(rows),'answers':{r['id']:r['answer'] for r in results}|{'EGEINF64212F':str(len(active))}}))
