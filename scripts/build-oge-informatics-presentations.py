#!/usr/bin/env python3
"""Build reviewed ODP examples through a local LibreOffice UNO listener (port 20183).

Restore original archives with restore-oge-informatics-archives.py --cache-only first.
The content manifest contains the separately reviewed text, image and layout choices.
Use /usr/bin/python3 with python3-uno, Pillow and LibreOffice Impress installed.
"""
import json,sys,zipfile,hashlib,io,tempfile
from pathlib import Path
import uno
from PIL import Image
from com.sun.star.beans import PropertyValue
from com.sun.star.awt import Point,Size
ROOT=Path(__file__).resolve().parents[1]
WORK=ROOT/'storage/informatics-completion';(WORK/'presentation-pdf').mkdir(parents=True,exist_ok=True)
def prop(k,v):p=PropertyValue();p.Name=k;p.Value=v;return p
local=uno.getComponentContext();resolver=local.ServiceManager.createInstanceWithContext('com.sun.star.bridge.UnoUrlResolver',local)
context=resolver.resolve('uno:socket,host=127.0.0.1,port=20183;urp;StarOffice.ComponentContext')
desktop=context.ServiceManager.createInstanceWithContext('com.sun.star.frame.Desktop',context)
provider=context.ServiceManager.createInstanceWithContext('com.sun.star.graphic.GraphicProvider',context)
models=json.load(open(ROOT/'scripts/data/oge-informatics-presentations-content.json'))
reports=[]
def textshape(doc,page,text,rect,size,center=False,bold=False):
 shape=doc.createInstance('com.sun.star.drawing.TextShape');page.add(shape)
 shape.Position=Point(int(rect[0]),int(rect[1]));shape.Size=Size(int(rect[2]),int(rect[3]));shape.String=text
 shape.TextAutoGrowHeight=False;shape.TextAutoGrowWidth=False
 shape.TextFitToSize=uno.Enum('com.sun.star.drawing.TextFitToSizeType','NONE')
 shape.TextVerticalAdjust=uno.Enum('com.sun.star.drawing.TextVerticalAdjust','CENTER')
 for side in ('Left','Right','Upper','Lower'):setattr(shape,'Text'+side+'Distance',150)
 cursor=shape.createTextCursor();cursor.gotoStart(False);cursor.gotoEnd(True);cursor.CharFontName='Liberation Sans';cursor.CharHeight=float(size);cursor.CharColor=0x183247
 cursor.CharWeight=150.0 if bold else 100.0;cursor.ParaAdjust=uno.Enum('com.sun.star.style.ParagraphAdjust','CENTER' if center else 'LEFT')
 return shape
def picture(doc,page,file,rect):
 with Image.open(file) as im:w,h=im.size
 scale=min(rect[2]/w,rect[3]/h);width=round(w*scale);height=round(h*scale)
 shape=doc.createInstance('com.sun.star.drawing.GraphicObjectShape');page.add(shape)
 shape.Position=Point(round(rect[0]+(rect[2]-width)/2),round(rect[1]+(rect[3]-height)/2));shape.Size=Size(width,height)
 shape.Graphic=provider.queryGraphic((prop('URL',file.as_uri()),));return shape
limit=int(sys.argv[1]) if len(sys.argv)>1 else len(models)
for id,m in list(models.items())[:limit]:
 archive=ROOT/'storage/oge-informatics-release/originals'/m['archiveHash'];raw=archive.read_bytes();assert hashlib.sha256(raw).hexdigest()==m['archiveHash']
 with tempfile.TemporaryDirectory(prefix='oge-presentation-') as temp:
  files=[]
  with zipfile.ZipFile(io.BytesIO(raw)) as z:
   names={(i.filename if i.flag_bits&2048 else i.filename.encode('cp437').decode('cp866')).replace('\\','/'):i for i in z.infolist()}
   for j,ph in enumerate(m['photos']):
    data=z.read(names[ph['member']]);assert hashlib.sha256(data).hexdigest()==ph['sha256'];f=Path(temp)/(str(j)+Path(ph['member']).suffix);f.write_bytes(data);files.append(f)
  doc=desktop.loadComponentFromURL('private:factory/simpress','_blank',0,(prop('Hidden',True),prop('MacroExecutionMode',4)))
  try:
   doc.lockControllers();pages=doc.DrawPages
   while pages.Count<3:pages.insertNewByIndex(pages.Count)
   while pages.Count>3:pages.remove(pages.getByIndex(pages.Count-1))
   for i in range(3):
    page=pages.getByIndex(i);page.Width=32000;page.Height=18000
    while page.Count:page.remove(page.getByIndex(0))
    page.IsBackgroundVisible=False;page.IsBackgroundObjectsVisible=False
   page=pages.getByIndex(0);textshape(doc,page,m['theme'],(1600,5000,28800,4400),40,True,True);textshape(doc,page,'Номер участника: ______',(1600,10500,28800,2200),24,True)
   bi=0;pi=0
   for i,pattern in enumerate(m['patterns'],1):
    page=pages.getByIndex(i);textshape(doc,page,m['headings'][i-1],(1300,700,29400,1500),24,True,True)
    ncols=2 if len(pattern)==4 else 3
    for pos,kind in enumerate(pattern):
     row=pos//ncols;col=pos%ncols;y=3100+row*7000
     if ncols==3:rect=(1300+col*10000,y,9400,6000)
     else:
      first=pattern[row*2];leftw=9500 if first=='I' else 19000;rect=(1300 if col==0 else 1300+leftw+900,y,leftw if col==0 else 28500-leftw,6000)
     if kind=='I':picture(doc,page,files[pi],rect);pi+=1
     else:textshape(doc,page,m['blocks'][bi],rect,20);bi+=1
   assert pi==bi==len(m['blocks']);doc.DocumentProperties.Title=m['theme'];doc.DocumentProperties.Subject='Пример выполнения задания ФИПИ '+id
   doc.DocumentProperties.Description='Иллюстрации и основной материал: архив ФИПИ. '+m['contentNote']+'\n'+'\n'.join(s['scope']+': '+s['url'] for s in m['supplements'])
   doc.unlockControllers();target=ROOT/'solution-files/oge-informatics'/(id+'.odp');doc.storeAsURL(target.as_uri(),(prop('FilterName','impress8'),prop('Overwrite',True)))
   doc.storeToURL((WORK/'presentation-pdf'/(id+'.pdf')).as_uri(),(prop('FilterName','impress_pdf_Export'),prop('Overwrite',True)))
   reports.append(dict(id=id,file=str(target.relative_to(ROOT)),sha256=hashlib.sha256(target.read_bytes()).hexdigest(),slides=3,blocks=bi,images=pi))
   (WORK/'presentation-build-report.json').write_text(json.dumps(reports,ensure_ascii=False,indent=2)+'\n');print(id,'OK',flush=True)
  finally:doc.close(True)
