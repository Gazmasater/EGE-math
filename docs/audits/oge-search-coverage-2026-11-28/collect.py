"""Read-only HTTP and graph checks, public educational content only."""
import concurrent.futures as cf
import datetime as dt
import hashlib
import json
import re
import urllib.parse as up
import urllib.request as ur
from collections import Counter, defaultdict, deque
from html.parser import HTMLParser
from pathlib import Path

ROOT=Path(__file__).resolve().parent
OLD=Path('/root/ege-diagnostics-20261128/raw-webmaster')
def save(name,obj): (ROOT/(name+'.json')).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
def read(name): return json.loads((ROOT/name).read_text())
class Page(HTMLParser):
 def __init__(self):
  super().__init__(); self.links=[];self.canonical=[];self.robots=[];self.description='';self.title='';self.h1=[];self.tag='';self.data=[];self.images=[]
 def handle_starttag(self,t,a):
  a=dict(a)
  if t=='a' and a.get('href'): self.links.append(dict(href=a['href'],rel=a.get('rel',''),text=''))
  if t=='link' and a.get('rel')=='canonical':self.canonical.append(a.get('href'))
  if t=='meta' and a.get('name')=='robots':self.robots.append(a.get('content'))
  if t=='meta' and a.get('name')=='description':self.description=a.get('content','')
  if t=='img':self.images.append({k:v for k,v in a.items() if k in ['src','alt','loading']})
  if t in ['title','h1']:self.tag=t;self.data=[]
 def handle_data(self,s):
  if self.tag:self.data.append(s)
 def handle_endtag(self,t):
  if t==self.tag:
   if t=='title':self.title=''.join(self.data)
   else:self.h1.append(''.join(self.data))
   self.tag=''
def fetch(path):
 try:
  req=ur.Request('https://ege-fipi.ru'+path,headers={'User-Agent':'EGE-ReadOnly-Coverage-Audit/1.0'})
  with ur.urlopen(req,timeout=25) as r: text=r.read().decode(); status=r.status; url=r.url;headers=dict(r.headers)
  p=Page();p.feed(text)
  filename=hashlib.sha256(path.encode()).hexdigest()[:16]+'.html';(ROOT/'html'/filename).write_text(text)
  return dict(path=path,status=status,url=url,checkedUtc=dt.datetime.now(dt.timezone.utc).isoformat(),file=filename,title=p.title,h1=p.h1,description=p.description,canonical=p.canonical,robots=p.robots,xRobots=headers.get('X-Robots-Tag'),links=p.links,images=p.images,
   conditionIds=re.findall(r'<div\s+class=[\'"][^\'"]*\bqblock\b[^\'"]*[\'"]\s+id=[\'"]q([A-Z0-9]+)',text),solutionIds=re.findall(r'Решение задания ([A-Z0-9]+)',text))
 except Exception as e:return dict(path=path,error=type(e).__name__+': '+str(e))

if __name__=='__main__':
 local=read('local.json');tasks=local['tasks'];byid={t['id']:t for t in tasks};ids=set(byid)
 entries=[x for p in sorted(OLD.glob('insearch_*.json')) for x in json.loads(p.read_text())['data'].get('samples',[])]
 events=[x for p in sorted(OLD.glob('events_*.json')) for x in json.loads(p.read_text())['data'].get('samples',[])]
 # Preserve URL identity and timestamps: repeated old API samples are not a live index.
 save('search-snapshot',dict(source=str(OLD),entries=entries,events=events))
 family=[t for t in tasks if 'Одно из чисел' in t['condition'] and 'на координатной прямой' in t['condition'] and 'точкой' in t['condition']]
 if not any(t['id']=='F1F841' for t in family):
  family=[t for t in tasks if 'Одно из чисел' in t['condition'] and 'прямой' in t['condition']]
 present={up.urlsplit(x['url']).path.removeprefix('/tasks/') for x in entries if up.urlsplit(x['url']).path.startswith('/tasks/')}
 sample_ids={t['id'] for t in family}|(ids&present)|{'F1F841','7C7947','8D164C','DC38F4','F2CF43'}
 paths={'/oge','/oge?topic=all','/oge?topic=1.2','/oge?topic=6.1'}
 for taskid in sample_ids:
  if taskid not in byid:continue
  paths.add('/tasks/'+taskid)
  for link in byid[taskid]['links']:
   if link['index']<0:continue
   p='/oge?topic='+link['topic']
   if link['page']>1:p+='&page='+str(link['page'])
   paths.add(p)
 # Complete leaf 1.2 provides a small, exhaustively checked reference cohort.
 count=sum('1.2' in t['codes'] for t in tasks)
 for page in range(1,(count+11)//12+1):paths.add('/oge?topic=1.2'+('&page='+str(page) if page>1 else ''))
 with cf.ThreadPoolExecutor(max_workers=2) as pool:
  pages=list(pool.map(fetch,sorted(paths)))
 save('http',pages)
 save('cohort',dict(familyIds=sorted(t['id'] for t in family),sampleIds=sorted(sample_ids),presentIds=sorted(ids&present)))
 print(json.dumps(dict(pages=len(pages),errors=[x for x in pages if x.get('error')],family=len(family),present=sorted(ids&present)),ensure_ascii=False),flush=True)
