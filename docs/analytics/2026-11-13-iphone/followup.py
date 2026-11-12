import json
from concurrent.futures import ThreadPoolExecutor, as_completed
import collect as c

c.JOBS.clear()
for label, (d1, d2) in c.PERIODS.items():
    for name, browser in [('yandex_start', '117'), ('yandex', '70'), ('alice', '205'), ('chrome_mobile', '83')]:
        c.add(label + '_iphone_browser_' + name, d1, d2, c.IPHONE + " AND ym:s:browser=='" + browser + "'")
    for source in ['internal', 'referral', 'ad', 'social']:
        c.add(label + '_iphone_source_' + source, d1, d2, c.IPHONE + " AND ym:s:lastTrafficSource=='" + source + "'")
    for name, landing in [('ege_math', c.LANDINGS['ege_math']), ('tasks', c.LANDINGS['tasks']),
                          ('oge_math', c.LANDINGS['oge_math']), ('home', c.LANDINGS['home'])]:
        c.add(label + '_iphone_organic_landing_' + name, d1, d2,
              c.IPHONE + ' AND ' + c.ORGANIC + ' AND (' + landing + ')')
results = {}
with ThreadPoolExecutor(max_workers=4) as pool:
    for future in as_completed([pool.submit(c.collect, job) for job in c.JOBS]):
        name, result = future.result()
        results[name] = result
        print(name, result.get('totals', result), flush=True)
(c.ROOT / 'followup-meta.json').write_text(json.dumps(dict(
    reports=len(results), errors=[k for k, r in results.items() if 'totals' not in r],
    sampled=[k for k, r in results.items() if r.get('sampled')]), ensure_ascii=False, indent=2) + '\n')
