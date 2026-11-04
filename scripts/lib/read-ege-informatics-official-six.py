import hashlib,io,json,sys,zipfile,importlib.util
from pathlib import Path
spec=importlib.util.spec_from_file_location('process_ods',Path(__file__).with_name('read-ege-informatics-process-ods.py'))
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
with zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read())) as z:
 assert z.testzip() is None
 names=z.namelist();assert len(set(names))==len(names)
 hashes={name:hashlib.sha256(z.read(name)).hexdigest() for name in names}
 if sys.argv[1]=='process':
  assert sorted(names)==['2_22.ods','2_22.xls','2_22.xlsx']
  result={'hashes':hashes,'processes':module.read(z.read('2_22.ods'))}
 else:
  assert sys.argv[1]=='stars' and len(names)==2 and all(n.endswith(('_A.txt','_B.txt')) for n in names)
  result={'hashes':hashes,'texts':{name:z.read(name).decode('utf-8-sig') for name in names}}
print(json.dumps(result,ensure_ascii=False))
