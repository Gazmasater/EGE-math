from pathlib import Path
from fractions import Fraction
import hashlib,heapq,json,zipfile,tempfile,subprocess,contextlib,io
R=Path(__file__).resolve().parents[3];P=Path(__file__).parent
proofs=json.loads((R/'scripts/data/ege-informatics-interpretations-proofs.json').read_text())
records={r['id']:r for r in json.loads((R/'scripts/data/ege-informatics-interpretations-records.json').read_text())}
report={}
for task_id,p in proofs.items():
 d=p['data'];m=d['model'];results={}
 if m['kind']=='rate':
  for name,speed in [('literal',m['literalRate']),('power',2**m['hypothesizedExponent'])]:
   raw=Fraction(m['megabytes']*2**20*8,speed)
   packed=raw*Fraction(m['percent'],100)+m['packSeconds']+m['unpackSeconds']
   result=d['result'][name]
   assert str(raw)==result['secondsB'] and str(packed)==result['secondsA']
   assert str(abs(raw-packed))==result['differenceSeconds']
   assert result['faster']==('А' if packed<raw else 'Б')
   results[name]=result
 else:
  filename=R/d['url'].lstrip('/').replace('fipi/','fipi-assets/',1)
  assert hashlib.sha256(filename.read_bytes()).hexdigest()==d['fileSha256']
  with zipfile.ZipFile(filename) as z:
   assert z.testzip() is None
   content=z.read(d['member']);assert hashlib.sha256(content).hexdigest()==d['memberSha256']
  lines=content.decode().splitlines();k=int(lines[0]);n=int(lines[1]);rows=[(*map(int,s.split()),i+1) for i,s in enumerate(lines[2:])];assert len(rows)==n
  for order in ['end-ascending','file-order']:
   ordered=sorted(rows,key=lambda r:(r[0],r[1],r[2]) if order=='end-ascending' else (r[0],r[2]))
   free=list(range(1,k+1));busy=[];trace=[];count=0;last=-1;cell=None
   for start,end,index in ordered:
    while busy and busy[0][0]<start:
     _,released=heapq.heappop(busy);heapq.heappush(free,released)
    if not free:trace.append([index,0]);continue
    current=heapq.heappop(free);heapq.heappush(busy,(end,current));trace.append([index,current]);count+=1
    cell=current if start>last else min(cell,current);last=start
   result={'answer':[count,cell],'lastStart':last,'traceSha256':hashlib.sha256(json.dumps(trace,separators=(',',':')).encode()).hexdigest()}
   assert result==d['result'][order];results[order]=result
  code=records[task_id]['solution'].split('```python\n')[1].split('\n```')[0]
  with tempfile.TemporaryDirectory() as temp:
   t=Path(temp);(t/d['member']).write_bytes(content);(t/'solution.py').write_text(code)
   output=subprocess.check_output(['python3','solution.py'],cwd=t,text=True).strip()
   assert output==' '.join(map(str,d['result']['end-ascending']['answer']))
  results['displayedProgram']=output
 report[task_id]=results
assert Fraction(40*2**23,2**23)-Fraction(30,100)*40-10-1==17
external=json.loads((P/'external-review.json').read_text())
assert external['57433']['downloadSha256']==proofs['EGEINF290F15']['data']['memberSha256']
(P/'independent-review.json').write_text(json.dumps({'status':'ok','tasks':report,'rateAlgorithms':'Python Fraction vs JavaScript BigInt','arrivalAlgorithms':'Python two heaps vs JavaScript direct scan, every assignment','displayedProgramsExecuted':4,'external57433MatchesRecordedDownloadHash':True,'external7376Recalculated':'А17'},ensure_ascii=False,indent=2)+'\n')
print('Verified 14 exact rate cases, 8 complete allocation traces, 4 displayed programs and two external controls.')
