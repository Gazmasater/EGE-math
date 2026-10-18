"""Re-extract original documents and verify every reviewed text-search quotation."""
import hashlib,json,re,subprocess,tempfile
from pathlib import Path
from bs4 import BeautifulSoup
R=Path(__file__).resolve().parents[2]
evidence=json.loads((R/'scripts/data/oge-informatics-text-search-evidence.json').read_text())
a=next(a for a in json.loads((R/'data-sources/oge-informatics/manifest.json').read_text())['archives'] if a['group']=='type.11')
p=R/'storage/oge-informatics-release/originals'/a['sha256']
if not p.is_file():p=R/a['repositoryPath']
assert hashlib.sha256(p.read_bytes()).hexdigest()==a['sha256'],'Restore FIPI archives before auditing'
texts={}
with tempfile.TemporaryDirectory(prefix='oge-text-audit-') as temp:
 for e in evidence.values():
  member=e['member']
  if member in texts:continue
  data=subprocess.check_output(['unrar','p','-inul',str(p),member],timeout=60)
  assert hashlib.sha256(data).hexdigest()==e['memberHash'],member+': bytes'
  f=Path(temp)/Path(member).name;f.write_bytes(data)
  if f.suffix=='.pdf':s=subprocess.check_output(['pdftotext','-enc','UTF-8',str(f),'-']).decode()
  elif f.suffix=='.htm':s=BeautifulSoup(data,'html.parser').get_text(' ',strip=True)
  elif f.suffix=='.txt':s=data.decode('cp1251')
  elif f.suffix=='.rtf':
   out=Path(temp)/'out';out.mkdir(exist_ok=True)
   subprocess.run(['libreoffice','-env:UserInstallation='+ (Path(temp)/'profile').as_uri(),'--headless','--convert-to','txt:Text','--outdir',str(out),str(f)],check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=60)
   s=(out/(f.stem+'.txt')).read_text()
  else:raise ValueError(member)
  texts[member]=re.sub(r'\s+',' ',s).strip()
 for id,e in evidence.items():
  s=texts[e['member']]
  assert hashlib.sha256(s.encode()).hexdigest()==e['normalizedTextHash'],id+': normalized document'
  assert e['quote'] in s,id+': quotation'
print(json.dumps({'documents':len(texts),'quotations':len(evidence),'archiveHash':a['sha256'],'status':'ok'}))
