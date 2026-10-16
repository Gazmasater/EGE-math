"""Read-only checks for a small, evidence-backed shortlist."""
import sys
sys.dont_write_bytecode = True
import concurrent.futures
import importlib.util
import json
import urllib.request
from html.parser import HTMLParser
from collect import ROOT, api, host_path, save

base = host_path()
jobs = []
for i, phrase in enumerate(['иррациональные уравнения егэ профиль', 'открытый банк заданий фипи математика профиль']):
    jobs.append((f'extra-query-{i}', 'wm', base + '/query-analytics/list', None,
                 {'limit': 500, 'text_indicator': 'QUERY', 'region_ids': [225], 'search_location': 'WEB_LOCATION',
                  'filters': {'text_filters': [{'text_indicator': 'QUERY', 'operation': 'TEXT_MATCH', 'value': phrase}]}}))
groups = {
    'math-general': "ym:s:startURLPathFull=.('/','/?topic=all','/math','/ege/math')",
    'physics-general': "ym:s:startURLPathFull=.('/physics','/physics?topic=all','/ege/physics')",
    'plane-first': "ym:s:startURLPathFull=='/?topic=plane'",
    'plane-second': "ym:s:startURLPath=='/planimetry'",
    'equations': "ym:s:startURLPath=='/equations'",
    'roots-first': "ym:s:startURLPathFull=='/?topic=basic-equations.roots'",
    'finance': "ym:s:startURLPath=='/finance'",
    'derivative': "ym:s:startURLPathFull=='/?topic=derivative'",
    'kinematics': "ym:s:startURLPathFull=='/physics?topic=kinematics'"
}
spec = importlib.util.spec_from_file_location('metrika', ROOT.parents[2] / 'scripts/metrika-report.py')
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
for label, dates in [('before', ('2026-09-24', '2026-09-30')), ('current', ('2026-10-01', '2026-10-07'))]:
    for name, filt in groups.items():
        params = {'ids': 112561663, 'date1': dates[0], 'date2': dates[1],
                  'metrics': 'ym:s:visits,ym:s:users,ym:s:bounceRate,ym:s:goal663176353visits,ym:s:goal663176354visits',
                  'filters': '(' + m.SEARCH + ') AND (' + filt + ')',
                  'accuracy': 'full', 'timezone': '+03:00'}
        jobs.append((f'metrika-{label}-page-{name}', 'metrika', '/stat/v1/data', params, None))
save('supplement-jobs.json', {'groups': groups, 'jobs': [{'name': j[0], 'path': j[2], 'params': j[3], 'body': j[4]} for j in jobs]})
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    fs = {pool.submit(api, *j): j[0] for j in jobs if not (ROOT / 'raw' / (j[0] + '.json')).exists()}
    for f in concurrent.futures.as_completed(fs):
        r = f.result()
        print(fs[f], 'error', r.get('http_error', r.get('network_error')), 'totals', r.get('totals'), flush=True)

class Page(HTMLParser):
    def __init__(self):
        super().__init__(); self.title = ''; self.h1 = ''; self.links = []; self.parts = []; self.target = None; self.meta = {}
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ['h1', 'title']: self.target = tag
        if tag == 'meta' and a.get('name') in ['description', 'robots']: self.meta[a['name']] = a.get('content')
        if tag == 'link' and a.get('rel') == 'canonical': self.meta['canonical'] = a.get('href')
        if tag == 'a': self.links.append(a.get('href', ''))
    def handle_endtag(self, tag):
        if tag == self.target: self.target = None
    def handle_data(self, text):
        if self.target: setattr(self, self.target, getattr(self, self.target) + text)
        self.parts.append(text)

paths = ['/ege/math', '/?topic=all', '/?topic=plane', '/planimetry', '/equations', '/?topic=basic-equations.roots', '/?topic=7.5', '/?topic=2.2', '/?topic=2.3', '/ege/physics', '/finance']
pages = []
for path in paths:
    url = 'https://ege-fipi.ru' + path
    try:
        with urllib.request.urlopen(url, timeout=30) as r:
            body = r.read().decode(); status = r.status; final = r.url
        page = Page(); page.feed(body)
        text = ' '.join(' '.join(page.parts).split())
        pages.append({'url': url, 'final_url': final, 'status': status, 'title': page.title, 'h1': page.h1,
                      **page.meta, 'topic_links': sorted({x for x in page.links if 'topic=' in x}),
                      'irrational_mentions': text.lower().count('иррациональ'),
                      'body_excerpt_after_h1': text[text.find(page.h1):text.find(page.h1)+1800]})
    except Exception as e:
        pages.append({'url': url, 'error': type(e).__name__})
save('live-pages.json', pages)
print('Saved',len(pages),'live pages',flush=True)
