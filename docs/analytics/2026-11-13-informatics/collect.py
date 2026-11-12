"""Aggregate read-only Metrica checks. No visitor IDs or credentials persisted."""
import datetime as dt
import importlib.util
import json
import time
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('m', '/root/projects/ege-math/scripts/metrika-report.py')
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
PUBLIC = "ym:s:isRobot=='No' AND NOT " + m.TECHNICAL
PERIODS = {'week': ('2026-11-06', '2026-11-12'), 'month': ('2026-10-16', '2026-11-12')}
GROUPS = {
    'ege_catalogue': "ym:s:startURLPath=='/ege-informatics'",
    'oge_catalogue': "ym:s:startURLPath=='/oge-informatics'",
    'ege_tasks': "ym:s:startURLPath=~'^/tasks/(EGEINF|egeinf)'",
    'oge_tasks': "ym:s:startURLPath=~'^/tasks/(OGEINF|ogeinf)'",
}
INFO = '(' + ' OR '.join('(' + f + ')' for f in GROUPS.values()) + ')'
BROAD = "(ym:s:startURLPath=@'inform' OR ym:s:startURLPath=~'^/tasks/(EGEINF|OGEINF|egeinf|ogeinf)')"
ANY_INFO = "EXISTS(ym:pv:URL=@'/ege-informatics' OR ym:pv:URL=@'/oge-informatics' OR ym:pv:URL=@'/tasks/EGEINF' OR ym:pv:URL=@'/tasks/OGEINF')"
METRICS = ['ym:s:visits', 'ym:s:users', 'ym:s:pageviews', 'ym:s:bounceRate']
JOBS = []

def add(name, d1, d2, filters, dimensions=None):
    params = dict(ids=112561663, date1=d1, date2=d2, metrics=','.join(METRICS),
                  accuracy='full', timezone='+03:00', limit=1000, lang='ru', include_undefined='true', filters=filters)
    if dimensions: params.update(dimensions=dimensions, sort='-ym:s:visits')
    JOBS.append(dict(name=name, params=params))

for period, (d1, d2) in PERIODS.items():
    for name, f in dict(GROUPS, combined=INFO).items():
        for source, suffix in [('all', ''), ('organic', " AND ym:s:lastTrafficSource=='organic'")]:
            add(period + '_' + name + '_' + source, d1, d2, '(' + PUBLIC + ') AND (' + f + ')' + suffix)
    for name in ['ege_catalogue', 'oge_catalogue']:
        path = '/ege-informatics' if name == 'ege_catalogue' else '/oge-informatics'
        for kind, comparison in [('bare', '=='), ('query', '!=')]:
            add(period + '_' + name + '_' + kind, d1, d2,
                '(' + PUBLIC + ') AND (' + GROUPS[name] + ") AND ym:s:startURLPathFull" + comparison + "'" + path + "'")
    add(period + '_any_info_visit', d1, d2, '(' + PUBLIC + ') AND ' + ANY_INFO)
    add(period + '_info_via_internal_navigation', d1, d2, '(' + PUBLIC + ') AND ' + ANY_INFO + ' AND NOT ' + INFO)
    add(period + '_raw_entrances', d1, d2, INFO)
    add(period + '_broad_entrances', d1, d2, '(' + PUBLIC + ') AND ' + BROAD)
    for name, dim, extra in [('paths', 'ym:s:startURLPath', ''), ('sources', 'ym:s:lastTrafficSource', ''),
                             ('phrases', 'ym:s:lastSearchPhrase', " AND ym:s:lastTrafficSource=='organic'")]:
        add(period + '_details_' + name, d1, d2, '(' + PUBLIC + ') AND ' + BROAD + extra, dim)
    add(period + '_all_site', d1, d2, PUBLIC)
for name, f in dict(GROUPS, combined=INFO).items():
    add('today_' + name, '2026-11-13', '2026-11-13', '(' + PUBLIC + ') AND (' + f + ')')

def collect(job):
    dest = ROOT / 'reports' / (job['name'] + '.json')
    if dest.exists():
        r = json.loads(dest.read_text())
        if 'totals' in r: return job['name'], r
    for attempt in range(3):
        try: r = m.api('/stat/v1/data', job['params']); break
        except urllib.error.HTTPError as e:
            r = {'http_error': e.code, 'message': e.read().decode()[:700]}
            if e.code not in [429, 500, 502, 503, 504]: break
        except Exception as e: r = {'error': type(e).__name__}
        time.sleep(2 ** attempt)
    r['requested_params'] = job['params']; r['checked_at_moscow'] = dt.datetime.now(ZoneInfo('Europe/Moscow')).isoformat()
    dest.write_text(json.dumps(r, ensure_ascii=False, indent=2) + '\n')
    return job['name'], r

if __name__ == '__main__':
    counter = m.api('/management/v1/counter/112561663')['counter']
    safe_counter = {key: counter.get(key) for key in ['id', 'site', 'name', 'time_zone_name', 'code_status', 'status']}
    (ROOT / 'counter.json').write_text(json.dumps(safe_counter, ensure_ascii=False, indent=2) + '\n')
    results = {}
    with ThreadPoolExecutor(max_workers=4) as pool:
        for future in as_completed([pool.submit(collect, j) for j in JOBS]):
            name, r = future.result(); results[name] = r
            print(name, r.get('totals', r), flush=True)
    meta = dict(counter=112561663, periods=PERIODS, metrics=METRICS, public_filter=PUBLIC, groups=GROUPS,
                reports=len(results), errors=[n for n, r in results.items() if 'totals' not in r],
                sampled=[n for n, r in results.items() if r.get('sampled')],
                finished_at_moscow=dt.datetime.now(ZoneInfo('Europe/Moscow')).isoformat())
    (ROOT / 'meta.json').write_text(json.dumps(meta, ensure_ascii=False, indent=2) + '\n')
    print('FINISHED', len(results), 'errors', len(meta['errors']), 'sampled', len(meta['sampled']))
