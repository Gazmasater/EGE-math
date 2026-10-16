"""Read-only Yandex Webmaster and Metrica evidence for the keyword backlog."""
import concurrent.futures
import datetime as dt
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).parent
RAW = ROOT / 'raw'
RAW.mkdir(exist_ok=True)
CFG = {}
for line in Path('/root/.config/yandex-webmaster.env').read_text().splitlines():
    if '=' in line and not line.lstrip().startswith('#'):
        k, v = line.split('=', 1)
        CFG[k.strip()] = v.strip().strip("\"'")

def save(name, value):
    path = ROOT / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')

def api(name, service, path, params=None, body=None):
    wm_token = os.environ.get('YANDEX_WEBMASTER_TOKEN') or CFG.get('YANDEX_WEBMASTER_TOKEN')
    token = wm_token if service == 'wm' else (os.environ.get('YANDEX_METRIKA_TOKEN') or CFG.get('YANDEX_METRIKA_TOKEN') or wm_token)
    base = 'https://api.webmaster.yandex.net' if service == 'wm' else 'https://api-metrika.yandex.net'
    url = base + path + ('?' + urllib.parse.urlencode(params, doseq=True) if params else '')
    data = json.dumps(body, ensure_ascii=False).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers={'Authorization': 'OAuth ' + token, 'Content-Type': 'application/json; charset=UTF-8'})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=45) as response:
                result = json.load(response)
            break
        except urllib.error.HTTPError as exc:
            if exc.code in [429, 502, 503] and attempt < 2:
                time.sleep(2 ** attempt)
                continue
            result = {'http_error': exc.code, 'response': exc.read().decode()[:2000]}
            break
        except (urllib.error.URLError, TimeoutError, ConnectionError):
            if attempt == 2:
                result = {'network_error': True}
                break
            time.sleep(2)
    envelope = {'retrieved_at': dt.datetime.now(dt.timezone.utc).isoformat(), 'path': path,
                'params': params, 'body': body, 'response': result}
    save('raw/' + name + '.json', envelope)
    return result

def host_path():
    uid = CFG.get('YANDEX_WEBMASTER_USER_ID') or api('user', 'wm', '/v4/user')['user_id']
    # The host belongs to the project; no other connected hosts are collected.
    return f'/v4/user/{uid}/hosts/' + urllib.parse.quote('https:ege-fipi.ru:443', safe='')

def main():
    base = host_path()
    jobs = [
        ('history', 'wm', base + '/search-queries/all/history',
         {'date_from': '2026-09-24T00:00:00+03:00', 'date_to': '2026-10-08T00:00:00+03:00',
          'query_indicator': ['TOTAL_SHOWS', 'TOTAL_CLICKS', 'AVG_SHOW_POSITION']}, None),
        ('query-probe', 'wm', base + '/query-analytics/list', None,
         {'limit': 5, 'offset': 0, 'text_indicator': 'QUERY', 'region_ids': [225], 'device_type_indicator': 'ALL', 'search_location': 'WEB_LOCATION'}),
        ('summary', 'wm', base + '/summary', None, None)
    ]
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        futures = {pool.submit(api, *job): job[0] for job in jobs}
        for f in concurrent.futures.as_completed(futures):
            result = f.result()
            print(futures[f], json.dumps(result, ensure_ascii=False)[:6000], flush=True)

if __name__ == '__main__':
    main()
