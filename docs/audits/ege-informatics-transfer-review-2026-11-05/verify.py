"""Recompute held robot/rate evidence without modifying publication data."""
from pathlib import Path
from functools import lru_cache
from fractions import Fraction
import importlib.util, json, hashlib, io, zipfile

P = Path(__file__).resolve().parent
def load(name):
    return json.loads((P / name).read_text())
def reader(name):
    spec = importlib.util.spec_from_file_location(name, P / (name + '.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

ods, xlsx = reader('read-ods'), reader('read-xlsx')
inputs, results = load('robot-inputs.json'), load('robot-calculations.json')
drafts = {r['id']: r for r in load('robot-conditional-drafts.json')}
for archive in load('robot-archives.json'):
    task_id = archive['id']
    data = (P / (task_id + '.zip')).read_bytes()
    assert hashlib.sha256(data).hexdigest() == archive['sha256']
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        assert z.testzip() is None
        for member in archive['members']:
            assert hashlib.sha256(z.read(member['name'])).hexdigest() == member['sha256']
        name = next(m['name'] for m in archive['members'] if m['name'].endswith('.ods'))
        grid = ods.read_grid(io.BytesIO(z.read(name)))
        name = next(m['name'] for m in archive['members'] if m['name'].endswith('.xlsx'))
        alternative = xlsx.read(io.BytesIO(z.read(name)))
    for key in ['n', 'grid', 'rightWalls', 'downWalls']:
        assert grid[key] == alternative[key] == inputs[task_id]['grid'][key]
    n, values = grid['n'], grid['grid']
    excess = [(r, c) for r in range(n) for c in range(n) if values[r][c] > 100]
    assert excess == [(0, 0)]
    @lru_cache(None)
    def suffix(r, c):
        if (r, c) == (n-1, n-1):
            return values[r][c], values[r][c], 1
        successors = []
        if c < n-1 and not grid['rightWalls'][r][c]:
            successors.append(suffix(r, c+1))
        if r < n-1 and not grid['downWalls'][r][c]:
            successors.append(suffix(r+1, c))
        successors = [v for v in successors if v[2]]
        if not successors:
            return None, None, 0
        return (values[r][c] + min(v[0] for v in successors),
                values[r][c] + max(v[1] for v in successors),
                sum(v[2] for v in successors))
    minimum, maximum, paths = suffix(0, 0)
    result = results[task_id]
    assert (minimum, maximum, paths) == (result['minimum'], result['maximum'], result['paths'])
    assert drafts[task_id]['answer'] is None
    assert drafts[task_id]['calculatedFileAnswer'] == f'{maximum} {minimum}'
    for kind in ['minimum', 'maximum']:
        route = result[kind + 'Route']
        assert len(route) == 2*n-1
        assert (route[0]['row'], route[0]['col']) == (0, 0)
        assert (route[-1]['row'], route[-1]['col']) == (n-1, n-1)
        assert sum(values[v['row']][v['col']] for v in route) == result[kind]
        for a, b in zip(route, route[1:]):
            assert (b['row'] == a['row'] and b['col'] == a['col']+1 and not grid['rightWalls'][a['row']][a['col']]
                    or b['row'] == a['row']+1 and b['col'] == a['col'] and not grid['downWalls'][a['row']][a['col']])

for record in load('rate-conditional-drafts.json'):
    assert record['answer'] is None
    p = record['parameters']
    bits = p['megabytes'] * 8 * 2**20
    for mode, calculated in record['alternatives'].items():
        speed = int(p['literalRate']) if mode == 'literal' else 2**p['hypothesizedExponent']
        time_b = Fraction(bits, speed)
        time_a = time_b * Fraction(p['percent'], 100) + p['packSeconds'] + p['unpackSeconds']
        assert str(time_a) == calculated['secondsA']
        assert str(time_b) == calculated['secondsB']
        assert str(abs(time_b-time_a)) == calculated['differenceSeconds']
        assert ('А' if time_b > time_a else 'Б') == calculated['faster']
print('OK: 7 original archives; 2800 cells and all walls; 14 routes; 14 exact rate alternatives; all 14 drafts unpublished.')
