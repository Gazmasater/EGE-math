from pathlib import Path
from collections import Counter,deque
from fractions import Fraction
import json,sys,io,zipfile,hashlib,importlib.util,re,math
LIB=Path(sys.argv[1]);m=json.loads(sys.argv[2]);kind=m['kind'];raw=sys.stdin.buffer.read()
def module(name):
 spec=importlib.util.spec_from_file_location(name,LIB/(name+'.py'));v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v);return v
def digest(v):return hashlib.sha256(json.dumps(v,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
with zipfile.ZipFile(io.BytesIO(raw)) as archive:
 assert archive.testzip() is None
 names=archive.namelist();assert len(names)==len(set(names));assert all(not n.startswith('/') and '..' not in Path(n).parts for n in names)
 def one(ext):
  found=[n for n in names if n.lower().endswith('.'+ext)];assert len(found)==1;return archive.read(found[0])
 if kind in ['database','sheet']:
  sheets=module('read-ege-informatics-mirror-databases').read_ods(io.BytesIO(one('ods')))
  if kind=='sheet':
   nonempty=[r for r in sheets.values() if r];assert len(nonempty)==1;rows=nonempty[0];selected=[]
   for i,a in enumerate(rows,1):
    assert len(a)==m['width'] and all(isinstance(x,int) and x>0 for x in a);freq=Counter(a);single=[x for x,n in freq.items() if n==1];repeat=[x for x,n in freq.items() if n>1]
    if m['predicate']=='pair-mean-smaller':ok=sorted(freq.values())==[1,1,1,1,2] and 4*repeat[0]>sum(single)
    elif m['predicate']=='triple-mean-larger':ok=sorted(freq.values())==[1,1,1,1,3] and sum(single)>4*repeat[0]
    else:assert m['predicate']=='distinct-extremes';b=sorted(a);ok=len(freq)==5 and 2*(b[0]+b[-1])>3*sum(b[1:-1])
    if ok:selected.append((i,sum(a)))
   assert selected;total=sum(v for i,v in selected);answer=total//(6*len(selected)) if m['aggregate']=='mean' else selected[0][1] if m['aggregate']=='first-sum' else selected[-1][0];result={'answer':str(answer),'rows':len(rows),'selected':len(selected),'selectionSha256':digest(selected),'sum':total}
  else:
   by={rows[0][0]:rows for rows in sheets.values() if rows};assert set(by)=={'ID операции','Артикул','ID магазина'};goods=by['Артикул'][1:];stores=by['ID магазина'][1:];ops=by['ID операции'];g={r[0]:r for r in goods};s={r[0]:r for r in stores};assert len(g)==len(goods) and len(s)==len(stores)
   chosenG={r[0] for r in goods if r[2].startswith(m['goods']['prefix'])};chosenS={r[0] for r in stores if (r[1]==m['store']['value'] if m['store']['field']=='district' else r[2].startswith(m['store']['value']))};assert chosenG and chosenS;qi=next(i for i,h in enumerate(ops[0]) if h.startswith('Количество упаковок'));oi=ops[0].index('Тип операции');seen=set();selected=[];total=0
   for r in ops[1:]:
    assert len(r)==len(ops[0]) and r[0] not in seen;seen.add(r[0]);assert r[2] in s and r[3] in g;assert isinstance(r[qi],int) and r[qi]>=0;assert r[oi] in ['Продажа','Поступление'];assert re.fullmatch(r'20\d\d-\d\d-\d\d',r[1])
    if r[2] in chosenS and r[3] in chosenG and m['start']<=r[1]<=m['end'] and r[oi]==m['operation']:
     assert isinstance(g[r[3]][5],int);value=r[qi]*g[r[3]][5];total+=value;selected.append((r[0],value))
   assert selected;result={'answer':str(total),'operations':len(ops)-1,'selected':len(selected),'selectionSha256':digest(selected),'goods':sorted(chosenG),'stores':sorted(chosenS)}
 elif kind=='process':
  nodes=module('read-ege-informatics-mirror-processes').read(one('ods'));by={n['id']:n for n in nodes};assert len(by)==len(nodes);ends={};visiting=set()
  def finish(id):
   if id in ends:return ends[id]
   assert id in by and id not in visiting;visiting.add(id);n=by[id];assert n['duration']>0;start=max([finish(v) for v in n['depends']],default=0);ends[id]=start+n['duration'];visiting.remove(id);return ends[id]
  for id in by:finish(id)
  result={'answer':str(max(ends.values())),'ends':ends,'nodesSha256':digest(nodes)}
 elif kind=='robot':
  d=module('read-ege-informatics-mirror-robot').read_grid(io.BytesIO(one('ods')));n=d['n'];assert 1<n<26;assert all(1<=v<=100 for r in d['grid'] for v in r);memo={}
  def suffix(r,c):
   if (r,c) in memo:return memo[r,c]
   children=[]
   if c+1<n and not d['rightWalls'][r][c]:children.append(suffix(r,c+1))
   if r+1<n and not d['downWalls'][r][c]:children.append(suffix(r+1,c))
   v=d['grid'][r][c];memo[r,c]=(v+min(a for a,b,k in children),v+max(b for a,b,k in children),sum(k for a,b,k in children)) if children else (v,v,1);return memo[r,c]
  lo,hi,paths=suffix(0,0);assert m['finish']=='corners' and m['order']=='max-min';result={'answer':f'{hi} {lo}','n':n,'paths':paths,'gridSha256':digest({k:d[k] for k in ['grid','rightWalls','downWalls']})}
 elif kind=='text':
  doc=module('read-ege-informatics-odt').read_odt(one('odt'));assert doc['notes']==0;pars=doc['paragraphs'];heads=[(i,t.strip()) for i,t in enumerate(pars) if re.fullmatch('[IVXLCDM]+',t.strip())];counts={};hashes={}
  for chapter in m['chapters']:
   selected=[j for j,(i,t) in enumerate(heads) if t==chapter];assert len(selected)==1;j=selected[0];assert j+1<len(heads);text='\n'.join(pars[heads[j][0]+1:heads[j+1][0]]);allMatches=list(re.finditer('|'.join(map(re.escape,m['terms'])),text));whole=list(re.finditer(r'(?<![А-Яа-яЁё])(?:'+'|'.join(map(re.escape,m['terms']))+r')(?![А-Яа-яЁё])',text));hyphen=sum(w in m['terms'] for w in re.findall(r'[А-Яа-яЁё]+(?:[-‑][А-Яа-яЁё]+)*',text));assert hyphen==len(whole);counts[chapter]=len(whole) if m['mode']=='whole' else len(allMatches)-len(whole);hashes[chapter]=digest(text)
  result={'answer':str(sum(counts.values())),'counts':counts,'chapterHashes':hashes}
 elif kind=='clusters':
  result={'files':{}};answers=[]
  for letter in ['A','B']:
   found=[name for name in names if name.endswith('_'+letter+'.txt')];assert len(found)==1;lines=archive.read(found[0]).decode('utf-8-sig').splitlines();assert lines[0].split()==['X','Y'];coords=[r.replace(',','.').split() for r in lines[1:] if r.strip()];assert all(len(r)==2 and all(re.fullmatch(r'-?\d+(?:\.\d{1,7})?',v) for v in r) for r in coords);points=[tuple(map(float,r)) for r in coords];exact=[tuple(map(Fraction,r)) for r in coords];assert len(points)<= (1000 if letter=='A' else 10000);boxes=m['boxes'][letter];assert len(boxes)==(2 if letter=='A' else 3);groups=[[] for b in boxes];anomalies=[]
   for i,a in enumerate(boxes):
    assert a[1]-a[0]==(4.5 if letter=='A' else 5) and a[3]-a[2]==6
    for b in boxes[i+1:]:assert a[1]<b[0] or b[1]<a[0] or a[3]<b[2] or b[3]<a[2]
   for i,(x,y) in enumerate(points):
    hits=[j for j,(x1,x2,y1,y2) in enumerate(boxes) if x1<x<x2 and y1<y<y2];assert len(hits)<=1
    if hits:groups[hits[0]].append(i)
    else:anomalies.append(i)
   assert len(anomalies)==(0 if letter=='A' else 3)
   for i in anomalies:assert min(math.dist(points[i],p) for j,p in enumerate(points) if j!=i)>math.hypot(6,5)
   centers=[];indices=[];assert all(groups) and len(set(map(len,groups)))==len(groups)
   for g in groups:
    scores=sorted((math.fsum(math.dist(points[i],points[j]) for j in g),i) for i in g);assert scores[1][0]-scores[0][0]>1e-8;indices.append(scores[0][1]);centers.append(exact[scores[0][1]])
   if letter=='A':
    values=[sum(c[k] for c in centers)*Fraction(1,2) if m['statistic']=='means-sums' else (min if m['statistic']=='min-distance-radius' else max)(c[k] for c in centers) for k in [0,1]];answer=[abs(int(v*10000)) for v in values]
   else:
    order=sorted(range(3),key=lambda i:len(groups[i]));a,b=centers[order[0]],centers[order[-1]]
    if m['statistic']=='min-distance-radius':
     square=lambda a,b:sum((x-y)**2 for x,y in zip(a,b));values=[square(a,b),max(square(exact[j],centers[i]) for i,g in enumerate(groups) for j in g)];answer=[]
     for q in values:q*=100000000;answer.append(math.isqrt(q.numerator//q.denominator))
    else:answer=[abs(int((a[k]+b[k] if m['statistic']=='means-sums' else a[k]-b[k])*10000)) for k in [0,1]]
   answers+=answer;result['files'][letter]={'rows':len(points),'sizes':list(map(len,groups)),'centers':[i+1 for i in indices],'anomalies':[i+1 for i in anomalies],'answer':answer,'partitionSha256':digest(groups)}
  result['answer']=' '.join(map(str,answers))
 else:
  text=one('txt').decode('utf-8-sig').strip()
  if kind=='sequence':
   assert re.fullmatch(r'-?\d+(?:\s+-?\d+)*',text);a=list(map(int,text.split()));assert len(a)>=3 and all((-100000 if m['signed'] else 1)<=v<=100000 for v in a);M=max(v for v in a if abs(v)%100==m['ending']);selected=[]
   for i in range(len(a)-2):
    triple=a[i:i+3];k=sum(10**(m['digits']-1)<=abs(v)<10**m['digits'] for v in triple);ok=k>=1 if m['count']=='at-least-one' else k<=2 if m['count']=='at-most-two' else k==1;total=sum(triple)
    if ok and (total>=M if m['comparison']=='>=' else total<=M):selected.append((i+1,total))
   assert selected;result={'answer':f'{len(selected)} {max(v for i,v in selected)}','elements':len(a),'threshold':M,'selectionSha256':digest(selected)}
  elif kind=='events':
   lines=text.splitlines();n=int(lines[0]);assert 1<=n<=1000;events=[tuple(map(int,r.split())) for r in lines[1:]];assert len(events)==n and all(len(r)==2 and 1<=r[0]<r[1]<=1440 for r in events);ordered=sorted(events,key=lambda r:(r[1],r[0]));selected=[];finish=0
   for start,end in ordered:
    if start>=finish:selected.append((start,end));finish=end
   prefix=selected[-2][1] if len(selected)>1 else 0;latest=max(end for start,end in events if start>=prefix);result={'answer':f'{len(selected)} {latest}','events':n,'prefixFinish':prefix,'greedySha256':digest(selected)}
  else:
   assert text and re.fullmatch('[A-Z0-9]+',text);best=0;witness=None
   if kind=='initial-letter-digits':
    start=-1;digits=0
    for i,ch in enumerate(text):
     if ch==m['letter']:start=i;digits=0
     elif start>=0:
      digits+=int('0'<=ch<='9')
      if digits==m['digits'] and i+1-start>best:best=i+1-start;witness=[start,i+1]
   else:
    assert kind=='suffix-pattern-count';pattern=m['pattern'];assert pattern=='2025' and m['letter']=='Y';queue=deque(maxlen=m['count']+1);ys=0
    for i,ch in enumerate(text):
     ys+=int(ch==m['letter'])
     if text.startswith(pattern,i):
      queue.append((i,ys))
      if len(queue)<m['count']:continue
      left,before=(0,0) if len(queue)==m['count'] else (queue[0][0]+1,queue[0][1])
      if ys-before>=m['minimum'] and i+len(pattern)-left>best:best=i+len(pattern)-left;witness=[left,i+len(pattern)]
   assert witness;result={'answer':str(best),'characters':len(text),'witness':witness,'witnessSha256':hashlib.sha256(text[witness[0]:witness[1]].encode()).hexdigest()}
print(json.dumps(result,ensure_ascii=False,separators=(',',':')))
