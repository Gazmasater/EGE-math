"""Read-only checks of the selected destinations and OGE solution availability."""
import datetime as dt
import json
import re
import sqlite3
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from bs4 import BeautifulSoup

ROOT = Path(__file__).parent
PROJECT = ROOT.parents[2]
chosen = json.loads((ROOT / 'candidates.json').read_text())
snapshot = json.loads((ROOT / 'site-snapshot.json').read_text())
banks = json.loads((PROJECT / 'lib/oge-topic-assignments.json').read_text())['banks']
with sqlite3.connect(f'file:{PROJECT}/storage/solutions.sqlite?mode=ro', uri=True) as db:
    published = {row[0] for row in db.execute('SELECT task_id FROM solutions WHERE published=1')}
coverage_at = dt.datetime.now(dt.timezone.utc).isoformat()


def coverage(url):
    u = urlparse(url)
    bank = u.path.strip('/')
    if bank not in banks:
        return None
    topic = parse_qs(u.query).get('topic', [''])[0]
    if topic == 'practical':
        return {'published_solutions': 0, 'scope': 'Bank-wide published OGE mathematics count is zero'} if not any(t in published for t in banks[bank]['tasks']) else None
    tasks = banks[bank]['tasks']
    ids = [t for t, row in tasks.items() if not topic or topic == 'all' or
           any(c == topic or c.startswith(topic + '.') for c in row['topics'])]
    public_ids = [('OGEPHYS' + t if bank == 'oge-physics' and not t.startswith('OGEPHYS') else t) for t in ids]
    return {'tasks': len(ids), 'published_solutions': sum(t in published for t in public_ids),
            'scope': 'Reviewed local catalogue and read-only production SQLite', 'captured_at': coverage_at}


def check(url):
    for attempt in range(3):
        try:
            with urllib.request.urlopen(url, timeout=30) as response:
                code, final, html = response.status, response.url, response.read()
            break
        except urllib.error.HTTPError as e:
            return {'url': url, 'status': e.code, 'passed': False}
        except (urllib.error.URLError, TimeoutError, ConnectionError):
            if attempt == 2:
                return {'url': url, 'network_error': True, 'passed': False}
            time.sleep(1)
    s = BeautifulSoup(html, 'html.parser')
    canonical = s.find('link', rel='canonical')
    robots = s.find('meta', attrs={'name': 'robots'})
    description = s.find('meta', attrs={'name': 'description'})
    result = {'url': url, 'status': code, 'final_url': final,
              'title': s.title.get_text(' ', strip=True) if s.title else None,
              'h1': s.h1.get_text(' ', strip=True) if s.h1 else None,
              'canonical': canonical.get('href') if canonical else None,
              'robots': robots.get('content') if robots else '',
              'description': description.get('content') if description else None,
              'in_sitemap': url in snapshot['catalogue_urls'], 'coverage': coverage(url)}
    result['passed'] = (code == 200 and final == url and result['canonical'] == url and
                        bool(result['h1']) and 'noindex' not in result['robots'] and result['in_sitemap'])
    if result['coverage'] and 'tasks' in result['coverage'] and description:
        m = re.search(r'(\d+) задан', description.get('content', ''))
        if m:
            result['coverage']['public_description_tasks'] = int(m[1])
            result['coverage']['counts_match'] = int(m[1]) == result['coverage']['tasks']
            result['passed'] &= result['coverage']['counts_match']
    return result


urls = sorted({r[k] for r in chosen for k in ('target_url', 'alternative_url') if r[k]})
results = []
checkpoint = ROOT / 'landing-checks.json'
def save():
    out = {'checked_at': dt.datetime.now(dt.timezone.utc).isoformat(), 'pages': sorted(results, key=lambda r: r['url']),
           'expected_urls': len(urls), 'passed': len(results) == len(urls) and all(r['passed'] for r in results),
           'solution_snapshot': {b: coverage('https://ege-fipi.ru/' + b) for b in banks}}
    checkpoint.write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n')
    return out

with ThreadPoolExecutor(max_workers=3) as pool:
    futures = [pool.submit(check, url) for url in urls]
    for future in as_completed(futures):
        results.append(future.result())
        save()
        if len(results) % 10 == 0:
            print(f'Checked {len(results)}/{len(urls)} destinations', flush=True)
out = save()
print(json.dumps({'urls': len(results), 'passed': out['passed'], 'failures': [r for r in results if not r['passed']],
                  'solution_snapshot': out['solution_snapshot']}, ensure_ascii=False, indent=2))
