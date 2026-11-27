"""Daily read-only observation of the November OGE pilot. State lives outside Git."""
import argparse
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from functools import lru_cache
import gzip
import json
import os
from pathlib import Path
import re
import socket
from urllib.parse import parse_qsl, quote, urlencode, urlsplit
from urllib.request import Request, urlopen

CONFIG = json.loads(Path(__file__).with_name('pilot.json').read_text())
PAIRS = CONFIG['pairs']
IDS = {task for pair in PAIRS for task in pair.values()}
MOSCOW = timezone(timedelta(hours=3))
TODAY = datetime.now(MOSCOW).date()
LAUNCH = datetime.fromisoformat(CONFIG['verifiedOriginUtc'])
ROOT_URL = 'https://ege-fipi.ru'
PERIOD_A = [f'2026-11-{n}' for n in range(16, 21)]
PERIOD_B = [f'2026-11-{n}' for n in range(23, 28)]


def write(path, data):
    tmp = path.with_suffix('.tmp')
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=1) + '\n')
    os.replace(tmp, path)


def load(path, default):
    return json.loads(path.read_text()) if path.exists() else default


class Webmaster:
    def __init__(self, env):
        settings = {}
        for line in env.read_text().splitlines():
            if '=' in line and not line.lstrip().startswith('#'):
                key, value = line.split('=', 1)
                settings[key.strip()] = value.strip().strip('"').strip("'")
        self.base = ('https://api.webmaster.yandex.net/v4/user/' +
                     settings['YANDEX_WEBMASTER_USER_ID'] + '/hosts/' +
                     quote('https:ege-fipi.ru:443', safe='') + '/')
        self.token = settings['YANDEX_WEBMASTER_TOKEN']

    def request(self, endpoint, body=None):
        payload = json.dumps(body).encode() if body is not None else None
        req = Request(self.base + endpoint, data=payload,
                      headers={'Authorization': 'OAuth ' + self.token, 'Content-Type': 'application/json'})
        with urlopen(req, timeout=25) as response:
            return json.load(response)

    def search(self, dimension, selector, value, device='ALL'):
        offset = 0
        while True:
            body = dict(limit=500, offset=offset, text_indicator=dimension,
                        device_type_indicator=device, search_location='WEB_LOCATION',
                        filters={'text_filters': [dict(text_indicator=selector,
                                  operation='TEXT_MATCH', value=value)]})
            data = self.request('query-analytics/list', body)
            rows = data['text_indicator_to_statistics']
            yield from rows
            if offset + 500 >= data['count']:
                return
            if not rows:
                raise ValueError('Unexpected empty search page')
            offset += 500

    def samples(self, kind):
        endpoint = 'search-urls/' + kind + '/samples?'
        offset = 0
        while True:
            data = self.request(endpoint + urlencode(dict(offset=offset, limit=100)))
            yield from data['samples']
            offset += 100
            if offset >= data['count']:
                return


@lru_cache(maxsize=256)
def verified(ip):
    try:
        host = socket.gethostbyaddr(ip)[0].lower().rstrip('.')
        return host.endswith(('.yandex.ru', '.yandex.net', '.yandex.com')) and ip in {
            address[4][0] for address in socket.getaddrinfo(host, None)}
    except OSError:
        return False


def record_crawls(first):
    pattern = re.compile(r'^(\S+) \S+ \S+ \[([^]]+)] "GET /tasks/([A-Z0-9]+) HTTP/[^"]+" 200 \S+ "[^"]*" "([^"]*)"')
    for name in ['access.log', 'access.log.1', 'access.log.2.gz']:
        path = Path('/var/log/nginx') / name
        if not path.exists():
            continue
        opener = gzip.open if name.endswith('.gz') else open
        with opener(path, 'rt', errors='replace') as stream:
            for line in stream:
                if 'YandexBot/' not in line:
                    continue
                match = pattern.match(line)
                if not match:
                    continue
                ip, timestamp, task, agent = match.groups()
                if task not in IDS or 'YandexBot/' not in agent:
                    continue
                stamp = datetime.strptime(timestamp, '%d/%b/%Y:%H:%M:%S %z')
                if stamp < LAUNCH or not verified(ip):
                    continue
                seen = stamp.astimezone(timezone.utc).isoformat()
                first[task] = min(first.get(task, seen), seen)


def metrics(row):
    by_date = defaultdict(dict)
    for item in row['statistics']:
        by_date[item['date']][item['field']] = item['value']
    return dict(by_date)


def update_tasks(api, state, reference_dates):
    for task in sorted(IDS):
        path = '/tasks/' + task
        matches = [r for r in api.search('URL', 'URL', path)
                   if r['text_indicator']['value'] == path]
        if len(matches) > 1:
            raise ValueError('Repeated task URL')
        track = state['tasks'].setdefault(task, {})
        # A missing row has a different meaning from a published numerical zero.
        observed = metrics(matches[0]) if matches else {}
        for day in reference_dates:
            track[day] = observed.get(day, {'row': 'unreported'})
    wanted = {ROOT_URL + '/tasks/' + task for task in IDS}
    for kind in ['in-search', 'events']:
        hits = []
        for row in api.samples(kind):
            if row['url'] in wanted:
                hits.append(row)
        state['indexSamples'].setdefault(TODAY.isoformat(), {})[kind] = hits


def compare_pairs(state):
    comparison = []
    for pair in PAIRS:
        visits = [state['firstCrawlUtc'].get(i) for i in pair.values()]
        result = dict(pair)
        comparison.append(result)
        if not all(visits):
            result['status'] = 'waiting_for_verified_crawl'
            continue
        start = max(datetime.fromisoformat(v).astimezone(MOSCOW).date() for v in visits) + timedelta(days=1)
        days = [(start + timedelta(days=n)).isoformat() for n in range(7)]
        result.update(start=days[0], end=days[-1])
        if any(d not in state['tasks'].get(i, {}) for d in days for i in pair.values()):
            result['status'] = 'waiting_for_reporting_dates'
            continue
        result['status'] = 'observed'
        for role, task in pair.items():
            rows = [state['tasks'][task][d] for d in days]
            result[role + 'Results'] = dict(
                daysWithReportedImpressions=sum('IMPRESSIONS' in v for v in rows),
                reportedImpressions=sum(v['IMPRESSIONS'] for v in rows if 'IMPRESSIONS' in v),
                reportedClicks=sum(v['CLICKS'] for v in rows if 'CLICKS' in v))
    return comparison


def reportable_url(url):
    path = urlsplit(url)
    return url.startswith('/') and not path.netloc and all(
        key in {'topic', 'page'} for key, _ in parse_qsl(path.query, keep_blank_values=True))


def root_diagnosis(api, state, reference_dates):
    hub = state['hub']
    if set(PERIOD_A + PERIOD_B) <= set(hub.get('dates', [])):
        return
    selected = sorted(set(reference_dates) & set(PERIOD_A + PERIOD_B))
    if not selected or set(selected) <= set(hub.get('dates', [])):
        return
    # Full pagination on the exact root ranks phrases by loss for this specific URL.
    phrases = hub.setdefault('rootPhrases', {})
    for row in api.search('QUERY', 'URL', '/oge'):
        days = metrics(row)
        values = {d: days[d]['CLICKS'] for d in selected if 'CLICKS' in days.get(d, {})}
        if values:
            phrases.setdefault(row['text_indicator']['value'], {}).update(values)
    hub['dates'] = sorted(set(hub.get('dates', [])) | set(selected))
    # Use the same weekdays in both weeks even during a partial release.
    current = [d for d in PERIOD_B if d in hub['dates'] and
               (date.fromisoformat(d)-timedelta(days=7)).isoformat() in hub['dates']]
    previous = [(date.fromisoformat(d)-timedelta(days=7)).isoformat() for d in current]
    watched = list(CONFIG['watchQueries'])
    if current:
        deltas = []
        for q, rows in phrases.items():
            before = sum(rows.get(d, 0) for d in previous)
            after = sum(rows.get(d, 0) for d in current)
            if before > after:
                deltas.append((after - before, q, before, after))
        top = sorted(deltas)[:5]
        hub['largestReportedRootLosses'] = [dict(query=q, before=a, after=b) for _, q, a, b in top]
        watched.extend(q for _, q, _, _ in top)
    detail = hub.setdefault('landingPages', {})
    for q in dict.fromkeys(watched):
        for device in ('ALL', 'MOBILE', 'DESKTOP'):
            urls = detail.setdefault(q, {}).setdefault(device, {})
            for row in api.search('URL', 'QUERY', q, device):
                url = row['text_indicator']['value']
                if not reportable_url(url):
                    continue
                days = metrics(row)
                values = {d:v for d,v in days.items() if d in PERIOD_A + PERIOD_B}
                if values:
                    urls.setdefault(url, {}).update(values)
    if current:
        hub['through'] = max(current)


def summary(state):
    lines = [f"Данные Вебмастера по {state['latestReportingDate']}.",
             f"После публикации подтверждён обход {len(state['firstCrawlUtc'])} из {len(IDS)} страниц.",
             "Сравниваются семь полных московских дней после обхода обеих страниц пары."]
    observed = state['indexSamples'].get(TODAY.isoformat(), {}).get('in-search', [])
    listed = {row['url'] for row in observed}
    for result in state['comparison']:
        lines.append('')
        for role in ['changed', 'control']:
            task = result[role]
            label = 'новый заголовок' if role == 'changed' else 'контроль'
            in_list = 'есть в выгрузке' if ROOT_URL+'/tasks/'+task in listed else 'нет в доступной выгрузке'
            message = f"{task}, {label}, {in_list}"
            if result['status'] == 'observed':
                values = result[role+'Results']
                message += (f", с {result['start']} по {result['end']}, "
                            f"дней с числом показов {values['daysWithReportedImpressions']}/7, "
                            f"сумма доступных показов {values['reportedImpressions']}, "
                            f"кликов {values['reportedClicks']}")
            else:
                message += ', ожидается обход или полное окно данных'
            lines.append(message)
    hub = state['hub']
    lines.extend(['', 'Входы на /oge по запросам Яндекса'])
    if not hub.get('through'):
        lines.append('Ожидаются даты с 23 по 27 ноября.')
    else:
        lines.append(f"Сравнение одинаковых дней недели по {hub['through']}.")
        for row in hub['largestReportedRootLosses']:
            lines.append(f"{row['query']} — клики {row['before']} → {row['after']}")
        for query, devices in hub.get('landingPages', {}).items():
            for device, urls in devices.items():
                for url, days in urls.items():
                    for day in PERIOD_B:
                        metrics = days.get(day, {})
                        if metrics.get('IMPRESSIONS', 0) > 0:
                            lines.append(f"{day} · {device} · {query} · {url} · "
                                         f"показов {metrics['IMPRESSIONS']:g}, "
                                         f"позиция {metrics.get('POSITION', 'нет данных')}, "
                                         f"кликов {metrics.get('CLICKS', 'нет данных')}")
    return '\n'.join(lines) + '\n'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path)
    parser.add_argument('--env-file', type=Path, default=Path('/root/.config/yandex-webmaster.env'))
    args = parser.parse_args()
    args.output.mkdir(exist_ok=True, parents=True)
    state_path = args.output / 'observations.json'
    state = load(state_path, dict(firstCrawlUtc={}, tasks={}, indexSamples={}, hub={}))
    record_crawls(state['firstCrawlUtc'])
    write(state_path, state)
    api = Webmaster(args.env_file)
    root = next(r for r in api.search('URL', 'URL', '/oge') if r['text_indicator']['value'] == '/oge')
    dates = sorted(metrics(root))
    if not dates:
        raise ValueError('Missing reference reporting dates')
    update_tasks(api, state, dates)
    state['comparison'] = compare_pairs(state)
    state['updatedUtc'] = datetime.now(timezone.utc).isoformat()
    state['latestReportingDate'] = dates[-1]
    write(state_path, state)
    root_diagnosis(api, state, dates)
    write(state_path, state)
    summary_path = args.output / 'latest.txt'
    temp = summary_path.with_suffix('.tmp')
    temp.write_text(summary(state))
    temp.replace(summary_path)
    print('Reporting through', dates[-1], 'pairs with an observed window',
          sum(p['status'] == 'observed' for p in state['comparison']), 'of', len(PAIRS))


if __name__ == '__main__':
    main()
