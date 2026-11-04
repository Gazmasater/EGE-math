import xml.etree.ElementTree as E,zipfile,io,json,sys
NS={k:'urn:oasis:names:tc:opendocument:xmlns:'+v+':1.0' for k,v in [('t','table'),('o','office'),('x','text')]};T='{'+NS['t']+'}'
def read(data):
 with zipfile.ZipFile(io.BytesIO(data)) as z:r=E.fromstring(z.read('content.xml'))
 tables=r.findall('.//t:table',NS);assert len(tables)==1;rows=[]
 for row in tables[0].findall('t:table-row',NS):
  vals=[]
  for cell in row:
   if cell.tag not in [T+'table-cell',T+'covered-table-cell']:continue
   s=' '.join(''.join(p.itertext()) for p in cell.findall('x:p',NS)).strip();repeat=int(cell.get(T+'number-columns-repeated','1'))
   if not s and repeat>3:break
   assert repeat<=3;vals.extend([s]*repeat)
  while vals and not vals[-1]:vals.pop()
  if vals:assert int(row.get(T+'number-rows-repeated','1'))==1;rows.append(vals)
 assert len(rows[0])==3 and 'ID' in rows[0][0]
 return [{'id':int(a),'duration':int(b),'depends':[] if c=='0' else [int(v) for v in c.split(';')]} for a,b,c in rows[1:]]
if __name__=="__main__":print(json.dumps(read(sys.stdin.buffer.read()),separators=(",",":")))
