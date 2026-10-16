"""Get exact core queries, popular queries and fresh organic landing totals."""
import sys
sys.dont_write_bytecode = True
import concurrent.futures
import importlib.util
import json
from collect import ROOT, api, host_path, save

base = host_path()
core = json.loads((ROOT.parent / 'wordstat-2026-10-08/keywords.json').read_text())
jobs = []
for index, row in enumerate(core):
    body = {'limit': 500, 'offset': 0, 'text_indicator': 'QUERY', 'region_ids': [225],
            'device_type_indicator': 'ALL', 'search_location': 'WEB_LOCATION',
            'filters': {'text_filters': [{'text_indicator': 'QUERY', 'operation': 'TEXT_MATCH', 'value': row['phrase']}]}}
    jobs.append((f'exact-{index:03}', 'wm', base + '/query-analytics/list', None, body))
for offset in range(0, 3000, 500):
    jobs.append((f'popular-{offset:04}', 'wm', base + '/search-queries/popular',
                 {'date_from': '2026-09-28T00:00:00+03:00', 'date_to': '2026-10-04T00:00:00+03:00',
                  'query_indicator': ['TOTAL_SHOWS', 'TOTAL_CLICKS', 'AVG_SHOW_POSITION'],
                  'device_type_indicator': 'ALL', 'order_by': 'TOTAL_SHOWS', 'limit': 500, 'offset': offset}, None))
spec = importlib.util.spec_from_file_location('metrika', ROOT.parents[2] / 'scripts/metrika-report.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
metrics = ['ym:s:visits', 'ym:s:users', 'ym:s:bounceRate', 'ym:s:avgVisitDurationSeconds',
           'ym:s:goal663176353visits', 'ym:s:goal663176354visits']
for label, dates in [('before', ('2026-09-24', '2026-09-30')), ('current', ('2026-10-01', '2026-10-07'))]:
    for dimension in [None, 'ym:s:startURLPathFull']:
        params = {'ids': 112561663, 'date1': dates[0], 'date2': dates[1], 'metrics': ','.join(metrics),
                  'filters': m.SEARCH, 'accuracy': 'full', 'timezone': '+03:00',
                  'limit': 10000, 'include_undefined': 'true'}
        if dimension:
            params.update(dimensions=dimension, sort='-ym:s:visits')
        jobs.append(('metrika-' + label + ('-landings' if dimension else '-totals'), 'metrika', '/stat/v1/data', params, None))
save('collection-jobs.json', {'metric_order': metrics, 'jobs': [{'name': j[0], 'service': j[1], 'path': j[2], 'params': j[3], 'body': j[4]} for j in jobs]})
errors = []
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    futures = {}
    for job in jobs:
        path = ROOT / 'raw' / (job[0] + '.json')
        if path.exists() and not any(k in json.loads(path.read_text())['response'] for k in ['http_error', 'network_error']):
            continue
        futures[pool.submit(api, *job)] = job[0]
    for i, f in enumerate(concurrent.futures.as_completed(futures), 1):
        response = f.result()
        if any(k in response for k in ['http_error', 'network_error']):
            errors.append({'name': futures[f], 'error': response})
        if i % 25 == 0 or i == len(futures):
            print(f'{i}/{len(futures)} done; errors={len(errors)}', flush=True)
save('collection-errors.json', errors)
assert not errors, f'{len(errors)} requests failed'
