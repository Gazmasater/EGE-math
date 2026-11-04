"""Read original ODS coin values and visible borders with inherited cell styles."""
import json,zipfile,xml.etree.ElementTree as ET,re,sys
NS={k:'urn:oasis:names:tc:opendocument:xmlns:'+v+':1.0' for k,v in [('t','table'),('o','office'),('s','style'),('fo','xsl-fo-compatible')]}
def a(e,p,k,default=None):return e.get('{'+NS[p]+'}'+k,default)
def read_grid(file):
 with zipfile.ZipFile(file) as z:
  content=ET.fromstring(z.read('content.xml'));styleroot=ET.fromstring(z.read('styles.xml'));styles={a(s,'s','name'):s for root in [styleroot,content] for s in root.findall('.//s:style',NS) if a(s,'s','family')=='table-cell'}
  def props(name):
   if not name:return {}
   st=styles[name];d=props(a(st,'s','parent-style-name'));cp=st.find('s:table-cell-properties',NS)
   if cp is not None:d.update(cp.attrib)
   return d
  cache={n:props(n) for n in styles};grids=[]
  for sh in content.findall('.//t:table',NS):
   grid=[];edges=[];column_styles=[]
   for col in sh.findall('t:table-column',NS):column_styles.extend([a(col,'t','default-cell-style-name','Default')]*min(40-len(column_styles),int(a(col,'t','number-columns-repeated','1'))))
   for row in sh.findall('t:table-row',NS):
    rr=[];ee=[];column=0
    for cell in row:
     repeat=int(a(cell,'t','number-columns-repeated','1'))
     if a(cell,'o','value-type')!='float':column+=repeat;continue
     assert column==len(rr)
     assert not a(cell,'t','formula');value=int(a(cell,'o','value'));assert 1<=value<=100
     assert repeat<=29
     # A repeated value without an explicit cell style can cross columns with
     # different defaults. Resolve each physical cell separately.
     for offset in range(repeat):
      style=a(cell,'t','style-name') or a(row,'t','default-cell-style-name') or column_styles[column+offset];assert style in cache;cp=cache[style];border={}
      for side in ['left','right','top','bottom']:
       v=cp.get('{'+NS['fo']+'}border-'+side,cp.get('{'+NS['fo']+'}border','none'))
       if v=='none':border[side]=False
       else:assert re.fullmatch(r'[\d.]+pt solid #000000',v);assert float(v.split('pt')[0])>=1.5;border[side]=True
      rr.append(value);ee.append(border)
     column+=repeat
    if rr:
     repeat=int(a(row,'t','number-rows-repeated','1'));assert repeat<=29;grid.extend([rr]*repeat);edges.extend([ee]*repeat)
   if grid:grids.append((grid,edges,a(sh,'t','name')))
  assert len(grids)==1;grid,edges,sheet=grids[0];n=len(grid);assert 1<n<30 and all(len(r)==n for r in grid)
  right=[];down=[];asym=[]
  for r in range(n):
   right.append([]);down.append([])
   for c in range(n):
    if c<n-1 and edges[r][c]['right']!=edges[r][c+1]['left']:asym.append([r,c,'right'])
    if r<n-1 and edges[r][c]['bottom']!=edges[r+1][c]['top']:asym.append([r,c,'down'])
    right[-1].append(c==n-1 or edges[r][c]['right'] or edges[r][c+1]['left'])
    down[-1].append(r==n-1 or edges[r][c]['bottom'] or edges[r+1][c]['top'])
  assert all(edges[0][c]['top'] and edges[n-1][c]['bottom'] for c in range(n));assert all(edges[r][0]['left'] and edges[r][n-1]['right'] for r in range(n))
  return {'n':n,'sheet':sheet,'grid':grid,'rightWalls':right,'downWalls':down,'oneSidedBorders':asym}

if __name__=="__main__":print(json.dumps(read_grid(sys.argv[1]),separators=(",",":")))
