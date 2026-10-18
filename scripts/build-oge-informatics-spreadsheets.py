#!/usr/bin/env python3
"""Build ODS examples from restored FIPI archives and reviewed calculation evidence.

Requires LibreOffice Calc, python3-uno and a local UNO listener on port 20183.
First run restore-oge-informatics-archives.py --cache-only. Uses /usr/bin/python3.
The original source cells remain intact; formulas and an editable chart are added.
"""
import json,sys,math,hashlib,zipfile,io
from pathlib import Path
import uno
from com.sun.star.beans import PropertyValue
from com.sun.star.awt import Rectangle
R=Path(__file__).resolve().parents[1];W=R/'storage/informatics-completion';W.mkdir(parents=True,exist_ok=True)
sys.path.insert(0,str(R/'scripts/lib'))
from informatics_sheet_math import formula
def prop(k,v):p=PropertyValue();p.Name=k;p.Value=v;return p
local=uno.getComponentContext();resolver=local.ServiceManager.createInstanceWithContext('com.sun.star.bridge.UnoUrlResolver',local)
ctx=resolver.resolve('uno:socket,host=127.0.0.1,port=20183;urp;StarOffice.ComponentContext');desktop=ctx.ServiceManager.createInstanceWithContext('com.sun.star.frame.Desktop',ctx)
models=json.load(open(R/'scripts/data/oge-informatics-spreadsheets-evidence.json'));(W/'source-sheets').mkdir(exist_ok=True);(W/'sheet-pdf').mkdir(exist_ok=True);reports=[]
limit=int(sys.argv[1]) if len(sys.argv)>1 else len(models)
for id,m in list(models.items())[:limit]:
 target=R/'solution-files/oge-informatics'/(id+'.ods')
 raw=(R/'storage/oge-informatics-release/originals'/m['archiveHash']).read_bytes();assert hashlib.sha256(raw).hexdigest()==m['archiveHash']
 with zipfile.ZipFile(io.BytesIO(raw)) as archive:
  members={(i.filename if i.flag_bits&2048 else i.filename.encode('cp437').decode('cp866')).replace('\\','/'):i for i in archive.infolist()};original=archive.read(members[m['member']])
 assert hashlib.sha256(original).hexdigest()==m['memberHash']
 source=W/'source-sheets'/(id+'.ods');source.write_bytes(original)
 doc=desktop.loadComponentFromURL(source.as_uri(),'_blank',0,(prop('Hidden',True),prop('ReadOnly',False),prop('MacroExecutionMode',4),prop('UpdateDocMode',0)))
 try:
  doc.lockControllers();sheet=doc.Sheets.getByIndex(0);n=m['rows']+1;specs=m['calculations']+m['chart'];formulas=[]
  for j,s in enumerate(specs):
   col=chr(ord('V')+j) if j<5 else 'AA';vals=[]
   for row in range(2,n+1):
    pred=formula(s['where'],row,n,m['resultCells'][0]);value=formula(s['value'],row,n,m['resultCells'][0]);false='0' if s['op'] in ['count','percent'] else '""';vals.append(('=IF('+pred+';'+value+';'+false+')',))
   sheet.getCellRangeByName(f'{col}2:{col}{n}').setFormulaArray(tuple(vals));sheet.getCellRangeByName(col+'1').String='Проверка '+str(j+1);ref=f'{col}2:{col}{n}';op=s['op'];f={'count':f'SUM({ref})','sum':f'SUM({ref})','mean':f'AVERAGE({ref})','min':f'MIN({ref})','max':f'MAX({ref})','range':f'MAX({ref})-MIN({ref})','percent':f'100*AVERAGE({ref})','mean-difference':f'ABS(AVERAGE({ref})-AVERAGE({s["value"]}2:{s["value"]}{n}))'}[op];dest=m['resultCells'][j] if j<2 else 'K'+str(j);sheet.getCellRangeByName(dest).Formula='='+f
   formulas.append({'helperColumn':col,'firstRow':vals[0][0],'resultCell':dest,'resultFormula':'='+f})
   if j>=2:sheet.getCellRangeByName('J'+str(j)).String=s['label']
  doc.calculateAll()
  for j,r in enumerate(m['results']):
   cell=sheet.getCellRangeByName(formulas[j]['resultCell']);assert cell.Error==0,(id,cell.Formula,cell.Error);assert math.isclose(cell.Value,float(r['value']),rel_tol=1e-11,abs_tol=1e-9),(id,j,cell.Value,r)
  for answer_index,cellname in enumerate(m['resultCells']):
   cell=sheet.getCellRangeByName(cellname);cell.CharWeight=150.0;cell.CellBackColor=0xE7F0F8
   # Preserve precision in the stored value and display four decimal places.
   locale=uno.createUnoStruct('com.sun.star.lang.Locale');locale.Language='ru';locale.Country='RU';places=m['displayDecimals'][answer_index];pattern='0,'+'0'*places;fmt=doc.NumberFormats.queryKey(pattern,locale,True)
   if fmt<0:fmt=doc.NumberFormats.addNew(pattern,locale)
   cell.NumberFormat=fmt;cell.CharHeight=11.0;cell.CharFontName="Liberation Sans"
   column=sheet.Columns.getByIndex(cell.CellAddress.Column);column.Width=max(column.Width,3500)
   assert math.isclose(float(cell.String.replace(",",".")),cell.Value,rel_tol=1e-6,abs_tol=.50001*10**(-places)),(id,cellname,cell.String,cell.Value)
  sheet.getCellRangeByName('J1').String='Категория';sheet.getCellRangeByName('K1').String='Значение';sheet.Columns.getByIndex(9).Width=4700;sheet.Columns.getByIndex(10).Width=2100
  charts=sheet.Charts;point=sheet.getCellRangeByName('G6').Position;rect=Rectangle(point.X,point.Y,17500,10500);data=sheet.getCellRangeByName('J1:K'+str(len(m['chart'])+1)).RangeAddress
  charts.addNewByName('Диаграмма ответа',rect,(data,),True,True);chart=charts.getByName('Диаграмма ответа').EmbeddedObject;diagram=chart.createInstance('com.sun.star.chart.PieDiagram');chart.setDiagram(diagram);chart.HasLegend=True;chart.HasMainTitle=True;chart.Title.String='Соотношение по условию';diagram.DataCaption=1
  chart.Legend.CharHeight=10.0;chart.Title.CharHeight=12.0
  sheet.Columns.getByName('V:AA').IsVisible=False
  # A single preview page focuses on answers and the editable chart.
  area=sheet.getCellRangeByName('F1:O30').RangeAddress;sheet.setPrintAreas((area,));page=doc.StyleFamilies.getByName('PageStyles').getByName(sheet.PageStyle);page.IsLandscape=True;page.Width=29700;page.Height=21000;page.ScaleToPagesX=1;page.ScaleToPagesY=1
  doc.unlockControllers();doc.storeAsURL(target.as_uri(),(prop('FilterName','calc8'),prop('Overwrite',True)))
  doc.storeToURL((W/'sheet-pdf'/(id+'.pdf')).as_uri(),(prop('FilterName','calc_pdf_Export'),prop('Overwrite',True)))
  reports.append({'id':id,'formulas':formulas,'computedValues':[sheet.getCellRangeByName(f['resultCell']).Value for f in formulas],'chart':{'type':chart.Diagram.DiagramType,'labels':diagram.DataCaption,'legend':chart.HasLegend},'file':str(target.relative_to(R))})
  (W/'sheet-build-report.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2));print(id,'OK',flush=True)
 finally:doc.close(True)

manifest=json.load(open(R/'lib/solution-files.json'));sources=json.load(open(R/'scripts/data/oge-informatics-spreadsheets-sources.json'))
for report in reports:
 id=report['id'];file=R/report['file'];digest=hashlib.sha256(file.read_bytes()).hexdigest()
 models[id]['fileHash']=sources[id]['fileHash']=digest;models[id]['formulas']=report['formulas'];manifest[id]=dict(type='ods',bytes=file.stat().st_size,sha256=digest)
for name,data in [('lib/solution-files.json',manifest),('scripts/data/oge-informatics-spreadsheets-evidence.json',models),('scripts/data/oge-informatics-spreadsheets-sources.json',sources)]:
 (R/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
