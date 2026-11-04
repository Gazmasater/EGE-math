import io,re,zipfile,xml.etree.ElementTree as ET,json,sys
NS={k:'urn:oasis:names:tc:opendocument:xmlns:'+v+':1.0' for k,v in [('t','table'),('o','office'),('x','text')]}
def attr(e,k,n,default=None):return e.get('{'+NS[k]+'}'+n,default)
def text_content(e):
 value=e.text or ''
 for child in e:
  if child.tag=='{'+NS['x']+'}s':value+=' '*int(attr(child,'x','c','1'))
  elif child.tag=='{'+NS['x']+'}tab':value+='\t'
  elif child.tag=='{'+NS['x']+'}line-break':value+='\n'
  else:value+=text_content(child)
  value+=child.tail or ''
 return value
def read_ods(file):
 sheets={}
 with zipfile.ZipFile(file) as z,z.open('content.xml') as xml:
  for event,e in ET.iterparse(xml,events=('start','end')):
   if event=='start' and e.tag=='{'+NS['t']+'}table':name=attr(e,'t','name');rows=[];blank=False
   if event=='end' and e.tag=='{'+NS['t']+'}table-row':
    vals=[]
    for c in e:
     if c.tag not in ['{'+NS['t']+'}table-cell','{'+NS['t']+'}covered-table-cell']:continue
     typ=attr(c,'o','value-type');repeat=int(attr(c,'t','number-columns-repeated','1'));assert not attr(c,'t','formula')
     if typ=='float':v=attr(c,'o','value');v=int(v) if float(v).is_integer() else float(v)
     elif typ=='time':
      raw=attr(c,'o','time-value');match=re.fullmatch(r'PT(\d+)H(\d+)M(\d+(?:\.\d+)?)S',raw);assert match,raw;assert all(float(x).is_integer() for x in match.groups());v=':'.join(f'{int(float(x)):02}' for x in match.groups())
     elif typ=='date':v=attr(c,'o','date-value')[:10]
     elif typ=='string':v='\n'.join(text_content(p) for p in c.findall('x:p',NS))
     else:assert typ is None;assert not ''.join(c.itertext()).strip();v=None
     if isinstance(v,str) and not v.strip():v=None
     if v is not None:assert repeat<100;vals.extend([v]*repeat)
     elif repeat<100:vals.extend([None]*repeat)
    while vals and vals[-1] is None:vals.pop()
    repeats=int(attr(e,'t','number-rows-repeated','1'))
    if vals:assert not blank;assert repeats<100000;rows.extend([vals]*repeats)
    else:blank=True
    e.clear()
   if event=='end' and e.tag=='{'+NS['t']+'}table':assert name not in sheets;sheets[name]=rows;e.clear()
 return sheets
if __name__=='__main__':print(json.dumps(read_ods(sys.argv[1] if len(sys.argv)>1 else io.BytesIO(sys.stdin.buffer.read())),ensure_ascii=False))
