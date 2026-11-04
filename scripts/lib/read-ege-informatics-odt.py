"""Read ordered body paragraphs; preserve ODF spaces and exclude note bodies."""
import xml.etree.ElementTree as ET,zipfile,io,json,sys
NS={'office':'urn:oasis:names:tc:opendocument:xmlns:office:1.0','text':'urn:oasis:names:tc:opendocument:xmlns:text:1.0'};T='{'+NS['text']+'}'
def read_odt(data):
 with zipfile.ZipFile(io.BytesIO(data)) as z:
  assert z.testzip() is None
  root=ET.fromstring(z.read('content.xml'))
 def text(e):
  if e.tag==T+'note':return ''
  if e.tag==T+'s':return ' '*int(e.get(T+'c','1'))
  if e.tag in [T+'tab',T+'line-break']:return ' '
  return (e.text or '')+''.join(text(c)+(c.tail or '') for c in e)
 result=[]
 def visit(e):
  if e.tag==T+'note':return
  if e.tag in [T+'p',T+'h']:result.append(text(e));return
  for c in e:visit(c)
 body=root.find('office:body/office:text',NS);assert body is not None;visit(body)
 return {'paragraphs':result,'notes':len(root.findall('.//text:note',NS))}
if __name__=='__main__':print(json.dumps(read_odt(sys.stdin.buffer.read()),ensure_ascii=False,separators=(',',':')))
