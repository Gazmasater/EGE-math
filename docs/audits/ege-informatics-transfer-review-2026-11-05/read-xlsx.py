from pathlib import Path
import zipfile,xml.etree.ElementTree as E,re
N={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
def read(file):
 with zipfile.ZipFile(file) as z:
  styles=E.fromstring(z.read('xl/styles.xml'));borders=list(styles.find('s:borders',N));xfs=list(styles.find('s:cellXfs',N));sheets=[]
  for name in z.namelist():
   if not re.fullmatch(r'xl/worksheets/sheet\d+\.xml',name):continue
   root=E.fromstring(z.read(name));cells={}
   for c in root.findall('.//s:sheetData/s:row/s:c',N):
    v=c.find('s:v',N)
    if v is None or c.get('t') not in [None,'n']:continue
    assert c.find('s:f',N) is None;value=float(v.text);assert value.is_integer() and value>0
    match=re.fullmatch(r'([A-Z]+)(\d+)',c.get('r'));col=0
    for ch in match[1]:col=col*26+ord(ch)-64
    row=int(match[2]);border=borders[int(xfs[int(c.get('s','0'))].get('borderId','0'))];edge={side:(border.find('s:'+side,N).get('style') if border.find('s:'+side,N) is not None else None) for side in ['left','right','top','bottom']};cells[row-1,col-1]=(int(value),edge)
   if cells:sheets.append((name,cells))
 assert len(sheets)==1;name,cells=sheets[0];n=max(r for r,c in cells)+1;assert max(c for r,c in cells)+1==n and len(cells)==n*n;grid=[[cells[r,c][0] for c in range(n)] for r in range(n)];edge=[[cells[r,c][1] for c in range(n)] for r in range(n)]
 right=[[c==n-1 or bool(edge[r][c]['right']) or bool(edge[r][c+1]['left']) for c in range(n)] for r in range(n)];down=[[r==n-1 or bool(edge[r][c]['bottom']) or bool(edge[r+1][c]['top']) for c in range(n)] for r in range(n)];return {'n':n,'grid':grid,'rightWalls':right,'downWalls':down,'edges':edge,'sheet':name}
