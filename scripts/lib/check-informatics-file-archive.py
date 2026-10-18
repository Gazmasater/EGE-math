"""Read and independently CRC-check the actual ZIP, not the generated answers."""
import json,zipfile,hashlib
from pathlib import Path
R=Path(__file__).resolve().parents[2]
a=next(a for a in json.loads((R/'data-sources/oge-informatics/manifest.json').read_text())['archives'] if a['group']=='type.12')
p=R/'storage/oge-informatics-release/originals'/a['sha256']
if not p.is_file():p=R/a['repositoryPath']
assert hashlib.sha256(p.read_bytes()).hexdigest()==a['sha256'],'Restore FIPI archives before auditing'
out=[]
with zipfile.ZipFile(p) as z:
 assert z.testzip() is None
 for i in z.infolist():
  if i.is_dir():continue
  name=i.filename if i.flag_bits&0x800 else i.filename.encode('cp437').decode('cp866')
  out.append(name.replace('\\','/'))
assert len(out)==len(set(out))
print(json.dumps({'archiveHash':a['sha256'],'paths':out},ensure_ascii=False))
