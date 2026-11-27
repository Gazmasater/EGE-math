"""Compare original condition structure, including MathML and image bytes."""
import hashlib,json,re,subprocess
from html.parser import HTMLParser
from pathlib import Path
ROOT=Path(__file__).resolve().parent
PROJECT=Path('/root/projects/ege-math')
js="const {readOgeCatalog}=require('./scripts/lib/oge-catalog'); console.log(JSON.stringify(readOgeCatalog(process.cwd()).tasks.filter(t=>['83E501','77BC78','1506BA','6F5EF4'].includes(t.id)).map(t=>({id:t.id,fragment:t.fragment.split(/<div\\s+id=['\\\"]i[A-Z0-9]+['\\\"]/i)[0]}))));"
tasks=json.loads(subprocess.check_output(['node','-e',js],cwd=PROJECT,text=True))
class Structure(HTMLParser):
 def __init__(self):super().__init__(convert_charrefs=True);self.tokens=[];self.skip=0
 def handle_starttag(self,t,attrs):
  if t in ['form','script','style']:self.skip+=1
  if self.skip or t in ['input','button']:return
  attrs=dict(attrs)
  # Preserve math operators, table structure, fenced delimiters and span lengths.
  semantic={k:v for k,v in attrs.items() if k in ['open','close','separators','rowspan','colspan']}
  if t=='img':
   p=PROJECT/'fipi-assets/oge'/attrs['src'].removeprefix('/fipi/oge/')
   semantic['sha256']=hashlib.sha256(p.read_bytes()).hexdigest()
  self.tokens.append(['start',t,semantic])
 def handle_endtag(self,t):
  if t in ['form','script','style']:self.skip-=1;return
  if not self.skip and t not in ['input','button']:self.tokens.append(['end',t])
 def handle_data(self,s):
  if not self.skip and s.strip():self.tokens.append(['text',re.sub(r'\s+',' ',s.strip())])
data={}
for t in tasks:
 p=Structure();p.feed(t['fragment']);data[t['id']]=p.tokens
result=[]
for ids in [['83E501','77BC78'],['1506BA','6F5EF4']]:
 result.append(dict(ids=ids,equivalentConditionStructure=data[ids[0]]==data[ids[1]],sha256=[hashlib.sha256(json.dumps(data[i],ensure_ascii=False).encode()).hexdigest() for i in ids]))
(ROOT/'pair-review-structure.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False))
