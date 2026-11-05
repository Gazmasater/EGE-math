"""Compare ODS and XLSX grids inside an unchanged, reviewed FIPI ZIP."""
import hashlib, importlib.util, io, json, sys, zipfile
from pathlib import Path
P=Path(__file__).resolve().parent
def reader(name):
    spec=importlib.util.spec_from_file_location(name,P/(name+'.py'))
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    return module
ods=reader('read-ege-informatics-mirror-robot')
xlsx=reader('read-ege-informatics-reviewed-robot-xlsx')
with zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read())) as archive:
    assert archive.testzip() is None
    members={n:archive.read(n) for n in archive.namelist() if not n.endswith('/')}
    ods_names=[n for n in members if n.endswith('.ods')]
    xlsx_names=[n for n in members if n.endswith('.xlsx')]
    assert len(ods_names)==len(xlsx_names)==1
    a=ods.read_grid(io.BytesIO(members[ods_names[0]]))
    b=xlsx.read(io.BytesIO(members[xlsx_names[0]]))
    grid={k:a[k] for k in ['n','grid','rightWalls','downWalls']}
    assert all(grid[k]==b[k] for k in grid)
    print(json.dumps({'grid':grid,'hashes':{n:hashlib.sha256(v).hexdigest() for n,v in members.items()}},separators=(',',':')))
