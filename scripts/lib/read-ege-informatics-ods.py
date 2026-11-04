"""Decode primary ODS rows, including repeated cells, without loading blank grid cells."""
import json,zipfile,xml.etree.ElementTree as ET,sys
NS={k:'urn:oasis:names:tc:opendocument:xmlns:'+v+':1.0' for k,v in [('t','table'),('o','office')]}
def read_ods(file):
 sheets=[];rows=None;blank_seen=False
 with zipfile.ZipFile(file) as z, z.open('content.xml') as xml:
  for event,e in ET.iterparse(xml,events=('start','end')):
   if event=='start' and e.tag=='{'+NS['t']+'}table':rows=[];name=e.get('{'+NS['t']+'}name');blank_seen=False
   if event=='end' and e.tag=='{'+NS['t']+'}table-row':
    values=[];gap=False
    for c in e:
     if c.tag not in ['{'+NS['t']+'}table-cell','{'+NS['t']+'}covered-table-cell']:continue
     repeat=int(c.get('{'+NS['t']+'}number-columns-repeated','1'));typ=c.get('{'+NS['o']+'}value-type');v=c.get('{'+NS['o']+'}value')
     assert not c.get('{'+NS['t']+'}formula')
     if typ=='float':assert not blank_seen and not gap;assert v and int(v)>0;assert repeat<=5;values.extend([int(v)]*repeat)
     else:gap=True;assert typ in (None,'string') and not ''.join(c.itertext()).strip();assert not any(x is None for x in values)
    repeats=int(e.get('{'+NS['t']+'}number-rows-repeated','1'))
    if values:assert repeats<100000;rows.extend([values]*repeats)
    else:blank_seen=True
    e.clear()
   if event=='end' and e.tag=='{'+NS['t']+'}table':sheets.append({'name':name,'rows':rows});rows=None;e.clear()
 nonempty=[s for s in sheets if s['rows']];assert len(nonempty)==1
 return nonempty[0]['rows'],[{'name':s['name'],'rows':len(s['rows'])} for s in sheets]

if __name__=="__main__":
 rows,sheets=read_ods(sys.argv[1])
 print(json.dumps({"rows":rows,"sheets":sheets},separators=(",",":")))
