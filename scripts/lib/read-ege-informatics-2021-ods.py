"""Read the preserved 2021 workbooks without expanding empty spreadsheet tails."""
import io, json, sys, zipfile, xml.etree.ElementTree as E
T='{urn:oasis:names:tc:opendocument:xmlns:table:1.0}'
O='{urn:oasis:names:tc:opendocument:xmlns:office:1.0}'
def read(data):
 with zipfile.ZipFile(io.BytesIO(data)) as z:
  root=E.fromstring(z.read('content.xml'))
 sheets=[]
 for table in root.iter(T+'table'):
  rows=[]
  for row in table.iter(T+'table-row'):
   cells=[];pending=0
   for cell in row:
    if cell.tag not in [T+'table-cell',T+'covered-table-cell']:continue
    assert not cell.get(T+'formula')
    value=cell.get(O+'value') or cell.get(O+'date-value') or cell.get(O+'time-value') or ''.join(cell.itertext()).strip()
    repeat=int(cell.get(T+'number-columns-repeated','1'))
    if not value:pending+=repeat;continue
    assert pending+len(cells)+repeat<=100
    cells.extend(['']*pending+[value]*repeat);pending=0
   repeat=int(row.get(T+'number-rows-repeated','1'))
   if cells:
    assert repeat+len(rows)<=200
    rows.extend([cells]*repeat)
  if rows:sheets.append({'name':table.get(T+'name'),'rows':rows})
 return sheets
if __name__=='__main__':print(json.dumps(read(sys.stdin.buffer.read()),ensure_ascii=False))
