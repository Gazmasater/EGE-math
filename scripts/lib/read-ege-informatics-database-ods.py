import zipfile,xml.etree.ElementTree as ET,json,sys
NS={k:'urn:oasis:names:tc:opendocument:xmlns:'+v+':1.0' for k,v in [('t','table'),('o','office'),('x','text')]}
def attr(e,k,n,default=None):return e.get('{'+NS[k]+'}'+n,default)
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
     elif typ=='date':v=attr(c,'o','date-value')[:10]
     elif typ=='string':v='\n'.join(''.join(p.itertext()) for p in c.findall('x:p',NS))
     else:assert typ is None;assert not ''.join(c.itertext()).strip();v=None
     if v is not None:assert repeat<100;vals.extend([v]*repeat)
     elif repeat<100:vals.extend([None]*repeat)
    while vals and vals[-1] is None:vals.pop()
    repeats=int(attr(e,'t','number-rows-repeated','1'))
    if vals:assert not blank;assert repeats<100000;rows.extend([vals]*repeats)
    else:blank=True
    e.clear()
   if event=='end' and e.tag=='{'+NS['t']+'}table':assert name not in sheets;sheets[name]=rows;e.clear()
 return sheets
if __name__=='__main__':print(json.dumps(read_ods(sys.argv[1]),ensure_ascii=False))
