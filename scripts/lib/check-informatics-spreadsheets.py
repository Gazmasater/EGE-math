"""Check original FIPI bytes, source rows, formulas, cached results and editable charts."""
import io,json,zipfile,hashlib,xml.etree.ElementTree as ET,math,re
from decimal import Decimal,ROUND_HALF_UP
from pathlib import Path
from informatics_sheet_math import calculate
ROOT=Path(__file__).resolve().parents[2]
NS={k:'urn:oasis:names:tc:opendocument:xmlns:'+v+':1.0' for k,v in [('t','table'),('o','office'),('text','text'),('c','chart'),('s','style')]}
def attr(e,p,k,default=None):return e.get('{'+NS[p]+'}'+k,default)
def rows(data,ncols,nrows):
 tree=ET.fromstring(data);table=tree.find('.//t:table',NS);out=[];cells={}
 for row in table.findall('.//t:table-row',NS):
  line=[];col=0
  for cell in row:
   if cell.tag not in ('{'+NS['t']+'}table-cell','{'+NS['t']+'}covered-table-cell'):continue
   typ=attr(cell,'o','value-type');value=attr(cell,'o','value') if typ=='float' else attr(cell,'o','date-value') if typ=='date' else '\n'.join(''.join(p.itertext()) for p in cell.findall('text:p',NS))
   for _ in range(min(int(attr(cell,'t','number-columns-repeated','1')),27-col)):
    cells[(len(out)+1,col)]=cell
    if col<ncols:line.append(value)
    col+=1
  line+=(['']*(ncols-len(line)))
  for _ in range(min(int(attr(row,'t','number-rows-repeated','1')),nrows-len(out))):out.append(line)
  if len(out)>=nrows:break
 return out,cells,tree
def coord(name):
 import re
 a,b=re.fullmatch(r'([A-Z]+)(\d+)',name).groups();c=0
 for ch in a:c=c*26+ord(ch)-64
 return int(b),c-1
def column_widths(tree):
 styles={attr(s,'s','name'):s.find('s:table-column-properties',NS) for s in tree.findall('.//s:style',NS)}
 widths=[]
 for column in tree.find('.//t:table',NS).findall('.//t:table-column',NS):
  style=styles[attr(column,'t','style-name')];size=attr(style,'s','column-width')
  value,unit=re.fullmatch(r'([0-9.]+)(cm|mm|in|pt)',size).groups()
  width=float(value)*{'cm':1,'mm':.1,'in':2.54,'pt':2.54/72}[unit]
  widths.extend([width]*min(int(attr(column,'t','number-columns-repeated','1')),27-len(widths)))
  if len(widths)>=27:break
 return widths
report={}
for id,e in json.load(open(ROOT/'scripts/data/oge-informatics-spreadsheets-evidence.json')).items():
 archive=ROOT/'storage/oge-informatics-release/originals'/e['archiveHash'];raw=archive.read_bytes();assert hashlib.sha256(raw).hexdigest()==e['archiveHash']
 with zipfile.ZipFile(io.BytesIO(raw)) as z:
  members={ (i.filename if i.flag_bits&2048 else i.filename.encode('cp437').decode('cp866')).replace('\\','/'):i for i in z.infolist()};original=z.read(members[e['member']])
 assert hashlib.sha256(original).hexdigest()==e['memberHash']
 with zipfile.ZipFile(io.BytesIO(original)) as z:source,_,_=rows(z.read('content.xml'),e['columns'],e['rows']+1)
 model=dict(e,rows=source,id=id);results=calculate(model);assert results==e['results'],(id,'calculation')
 precisions=[];answers=[]
 for name,result,question in zip(e['resultCells'],results,e['questions']):
  match=re.search(r'точностью до (одного|двух) знак(?:а|ов) после запятой',question)
  places={'одного':1,'двух':2}[match[1]] if match else 4;precisions.append(places)
  value=Decimal(result['value']);answer=str(int(value)) if not match and value==int(value) else format(value.quantize(Decimal(1).scaleb(-places),rounding=ROUND_HALF_UP),'f')
  answers.append(name+' = '+answer.replace('.',','))
 assert e['displayDecimals']==precisions,(id,'required answer precision')
 assert e['answer']=='; '.join(answers),(id,'independent rounded answer')
 target=ROOT/'solution-files/oge-informatics'/(id+'.ods');data=target.read_bytes();assert hashlib.sha256(data).hexdigest()==e['fileHash']
 with zipfile.ZipFile(io.BytesIO(data)) as z:
  assert z.read('mimetype')==b'application/vnd.oasis.opendocument.spreadsheet';assert z.testzip() is None
  saved,cells,tree=rows(z.read('content.xml'),e['columns'],e['rows']+1);assert saved==source,(id,'source cells changed')
  widths=column_widths(tree)
  for j,(f,r) in enumerate(zip(e['formulas'],results)):
   cell=cells[coord(f['resultCell'])];assert math.isclose(float(attr(cell,'o','value')),float(r['value']),rel_tol=1e-11,abs_tol=1e-9),(id,f['resultCell'])
   if j<2:
    visible=''.join(p.text or '' for p in cell.findall('text:p',NS)).replace(',','.')
    rounded=Decimal(r['value']).quantize(Decimal(1).scaleb(-precisions[j]),rounding=ROUND_HALF_UP)
    assert visible==format(rounded,'f'),(id,f['resultCell'],'displayed value',visible,rounded)
    assert widths[coord(f['resultCell'])[1]]>=3.49,(id,f['resultCell'],'answer column too narrow')
   # ODF uses brackets around range references and an of: namespace prefix.
   actual=attr(cell,'t','formula','').replace('of:','').replace('[.','').replace(':.',':').replace(']','')
   assert actual==f['resultFormula'],(id,actual,f['resultFormula'])
   if j>=2:assert ''.join(cells[coord('J'+str(j))].itertext())==e['chart'][j-2]['label'],(id,'chart category')
  charts=[ET.fromstring(z.read(name)) for name in z.namelist() if name.endswith('/content.xml')]
  assert len(charts)==1;chart=charts[0];element=chart.find('.//c:chart',NS);assert attr(element,'c','class')=='chart:circle';assert chart.find('.//c:legend',NS) is not None
  assert any(attr(p,'c','data-label-number')=='value' for p in chart.findall('.//s:chart-properties',NS)),(id,'numeric chart labels')
  cache,_,_=rows(ET.tostring(chart),2,len(e['chart'])+1)
  assert len(cache)==len(e['chart'])+1,(id,'chart data rows')
  for row,s,r in zip(cache[1:],e['chart'],results[2:]):
   assert row[0]==s['label'],(id,'chart cached label')
   assert math.isclose(float(row[1]),float(r['value']),rel_tol=1e-11,abs_tol=1e-9),(id,'chart cached value')
 report[id]={'rows':e['rows'],'results':len(results),'chartCategories':len(e['chart']),'fileHash':e['fileHash'],'status':'ok'}
print(json.dumps(report))
