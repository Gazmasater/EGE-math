"""Only DNS-verified crawler aggregates are retained; no visitor data or IPs."""
from collections import Counter,defaultdict
import concurrent.futures as cf
import datetime as dt
import gzip
import json
from pathlib import Path
import re
import socket
import urllib.parse as up

ROOT=Path(__file__).resolve().parent
local=json.loads((ROOT/'local.json').read_text());bankids={k:set(v) for k,v in local['banks'].items()}
ids={i:k for k,v in bankids.items() for i in v}
pattern=re.compile(r'^(\S+) \S+ \S+ \[([^]]+)\] "(\S+) ([^ ]+) [^"]*" (\d+) \S+ "[^"]*" "([^"]*)"')
records=[];sources=[];first=None;last=None
for path in [Path('/var/log/nginx/access.log'),Path('/var/log/nginx/access.log.1'),Path('/var/log/nginx/access.log.2.gz')]:
 if not path.exists():continue
 sources.append(dict(file=str(path),bytes=path.stat().st_size))
 opener=gzip.open if path.suffix=='.gz' else open
 with opener(path,'rt',errors='replace') as f:
  for line in f:
   m=pattern.match(line)
   if not m:continue
   ip,date,method,url,status,ua=m.groups()
   stamp=dt.datetime.strptime(date,'%d/%b/%Y:%H:%M:%S %z').isoformat()
   first=min(first,stamp) if first else stamp;last=max(last,stamp) if last else stamp
   if 'YandexBot/' not in ua or method!='GET':continue
   p=up.urlsplit(url);taskid=p.path.removeprefix('/tasks/');bank=ids.get(taskid)
   if not bank:continue
   records.append(dict(ip=ip,day=stamp[:10],taskId=taskid,bank=bank,status=int(status),query=bool(p.query)))
socket.setdefaulttimeout(3)
def verify(ip):
 try:
  hostname=socket.gethostbyaddr(ip)[0].lower().rstrip('.')
  if not any(hostname.endswith('.'+suffix) for suffix in ['yandex.ru','yandex.net','yandex.com']):return ip,False
  return ip,ip in {x[4][0] for x in socket.getaddrinfo(hostname,None)}
 except OSError:return ip,False
with cf.ThreadPoolExecutor(max_workers=4) as p:verified=dict(p.map(verify,sorted({r['ip'] for r in records})))
bybank=Counter();bytask=Counter();days=Counter()
for row in records:
 if not verified.get(row['ip']):continue
 bybank[(row['bank'],row['status'])]+=1;bytask[(row['taskId'],row['status'])]+=1;days[(row['day'],row['bank'],row['status'])]+=1
result=dict(generatedUtc=dt.datetime.now(dt.timezone.utc).isoformat(),sources=sources,firstLogRequest=first,lastLogRequest=last,candidateAddresses=len(verified),verifiedAddresses=sum(verified.values()),
 byBank=[dict(bank=k[0],status=k[1],requests=v) for k,v in sorted(bybank.items())],
 byTask=[dict(taskId=k[0],status=k[1],requests=v) for k,v in sorted(bytask.items())],
 byDay=[dict(day=k[0],bank=k[1],status=k[2],requests=v) for k,v in sorted(days.items())],
 limitations=['Only retained files are covered, UTC days; no complete crawl history.','Combined nginx log has no Host field; association uses exact current task IDs.','Forward/reverse DNS verification is current, not archived at request time.','No IP addresses, visitor records, raw referrers or user agents are saved.'])
(ROOT/'logs.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(dict(first=first,last=last,byBank=result['byBank'],uniqueTaskIds=len({k[0] for k in bytask})),ensure_ascii=False),flush=True)
