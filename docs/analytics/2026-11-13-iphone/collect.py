"""Read-only aggregate Metrica reports. No visitor IDs, contacts or credentials."""
import datetime as dt
import importlib.util
import json
import time
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('metrika', '/root/projects/ege-math/scripts/metrika-report.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
PUBLIC = "ym:s:isRobot=='No' AND NOT " + m.TECHNICAL
IPHONE = "ym:s:mobilePhoneModel=='iPhone'"
SAFARI = "ym:s:browser=='38'"
ORGANIC = "ym:s:lastTrafficSource=='organic'"
PERIODS = {'before': ('2026-11-01', '2026-11-05'), 'after': ('2026-11-08', '2026-11-12')}
GOALS = m.api('/management/v1/counter/112561663/goals')['goals']
GIDS = {c['url']: g['id'] for g in GOALS if g['type'] == 'action'
        for c in g.get('conditions', []) if c.get('type') == 'exact'}
EVENTS = ['solution_open', 'next_task', 'catalogue_page_next', 'registration_success', 'study_lead_accepted']
METRICS = ['ym:s:visits', 'ym:s:users', 'ym:s:pageviews', 'ym:s:bounceRate',
           'ym:s:pageDepth', 'ym:s:avgVisitDurationSeconds']
for event in EVENTS:
    METRICS += [f'ym:s:goal{GIDS[event]}visits', f'ym:s:goal{GIDS[event]}reaches']
JOBS = []

def add(name, d1, d2, extra=None, dim=None, raw=False):
    params = dict(ids=112561663, date1=d1, date2=d2, metrics=','.join(METRICS),
                  accuracy='full', timezone='+03:00', limit=1000, lang='ru', include_undefined='true')
    if not raw:
        params['filters'] = '(' + PUBLIC + ')' + (' AND (' + extra + ')' if extra else '')
    if dim:
        params.update(dimensions=dim, sort='-ym:s:visits')
    JOBS.append(dict(name=name, params=params))

SEGMENTS = {
    'public': None,
    'iphone': IPHONE,
    'iphone_safari': IPHONE + ' AND ' + SAFARI,
    'iphone_other': IPHONE + " AND ym:s:browser!='38'",
    'mobile_safari': SAFARI,
    'android': "ym:s:operatingSystemRoot=='108'",
    'desktop': "ym:s:deviceCategory=='desktop'",
    'iphone_organic': IPHONE + ' AND ' + ORGANIC,
    'iphone_direct': IPHONE + " AND ym:s:lastTrafficSource=='direct'",
    'iphone_nonorganic': IPHONE + " AND ym:s:lastTrafficSource!='organic'",
    'public_organic': ORGANIC,
    'android_organic': "ym:s:operatingSystemRoot=='108' AND " + ORGANIC,
    'desktop_organic': "ym:s:deviceCategory=='desktop' AND " + ORGANIC,
}
LANDINGS = {
    'ege_math': "ym:s:startURLPath=='/ege/math'",
    'tasks': "ym:s:startURLPath=~'^/tasks/'",
    'oge_math': "ym:s:startURLPath=='/oge'",
    'ege_physics': "ym:s:startURLPath=='/ege/physics'",
    'oge_physics': "ym:s:startURLPath=='/oge-physics'",
    'home': "ym:s:startURLPathFull=='/'",
}
for label, (d1, d2) in PERIODS.items():
    for name, extra in SEGMENTS.items():
        add(label + '_' + name, d1, d2, extra)
    for name, extra in LANDINGS.items():
        add(label + '_iphone_landing_' + name, d1, d2, IPHONE + ' AND (' + extra + ')')
    for name, dim in [('browsers', 'ym:s:browser'), ('sources', 'ym:s:lastTrafficSource'),
                      ('landings', 'ym:s:startURLPath')]:
        add(label + '_iphone_' + name, d1, d2, IPHONE, dim)
    add(label + '_raw', d1, d2, raw=True)
for day in range(1, 13):
    d = f'2026-11-{day:02d}'
    add('day_' + d + '_iphone', d, d, IPHONE)
add('original_mobile_safari', '2026-10-31', '2026-11-06', SAFARI)
add('alternative_before_iphone', '2026-11-02', '2026-11-06', IPHONE)
add('alternative_before_mobile_safari', '2026-11-02', '2026-11-06', SAFARI)

def collect(job):
    path = ROOT / 'reports' / (job['name'] + '.json')
    if path.exists():
        result = json.loads(path.read_text())
        if 'totals' in result:
            return job['name'], result
    for attempt in range(3):
        try:
            result = m.api('/stat/v1/data', job['params'])
            break
        except urllib.error.HTTPError as e:
            result = {'http_error': e.code, 'message': e.read().decode()[:600]}
            if e.code not in [429, 500, 502, 503, 504]:
                break
        except Exception as e:
            result = {'error': type(e).__name__}
        time.sleep(2 ** attempt)
    result['requested_params'] = job['params']
    result['checked_at_moscow'] = dt.datetime.now(ZoneInfo('Europe/Moscow')).isoformat()
    path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    return job['name'], result

if __name__ == '__main__':
    results = {}
    with ThreadPoolExecutor(max_workers=4) as pool:
        for future in as_completed([pool.submit(collect, job) for job in JOBS]):
            name, result = future.result()
            results[name] = result
            print(name, result.get('totals', result), flush=True)
    meta = dict(counter=112561663, periods=PERIODS, metrics=METRICS, goal_ids=GIDS,
                public_filter=PUBLIC, iphone_filter=IPHONE, reports=len(results),
                errors=[k for k, r in results.items() if 'totals' not in r],
                sampled=[k for k, r in results.items() if r.get('sampled')],
                limited=[k for k, r in results.items() if r.get('contains_sensitive_data')],
                finished_at_moscow=dt.datetime.now(ZoneInfo('Europe/Moscow')).isoformat())
    (ROOT / 'meta.json').write_text(json.dumps(meta, ensure_ascii=False, indent=2) + '\n')
    print('FINISHED', len(results), 'errors', len(meta['errors']), 'sampled', len(meta['sampled']))
