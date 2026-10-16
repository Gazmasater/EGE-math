"""Read-only reports for counter 112561663. OAuth stays in the local env file."""
import argparse
import datetime
import json
import os
import pathlib
import urllib.parse
import urllib.request
from zoneinfo import ZoneInfo

COUNTER = 112561663
ROOT = pathlib.Path(__file__).resolve().parents[1]
TECHNICAL = "(ym:s:isRobot=='Yes' OR ym:s:browser=='204' OR (ym:s:paramsLevel1=='traffic_kind' AND ym:s:paramsLevel2=='technical'))"
SEARCH = "ym:s:lastTrafficSource=='organic' AND ym:s:isRobot=='No' AND NOT " + TECHNICAL
REPORTS = [
    {'key': 'search', 'name': 'ЕГЭ — поиск без роботов и технических визитов', 'expression': SEARCH},
    {'key': 'mobile_search', 'name': 'ЕГЭ — мобильный поиск без роботов', 'expression': SEARCH + " AND ym:s:deviceCategory=='mobile'"},
    {'key': 'technical', 'name': 'ЕГЭ — роботы и технические визиты', 'expression': TECHNICAL},
]
GOALS = [
    {'event': 'solution_open', 'name': 'Просмотр решения'},
    {'event': 'next_task', 'name': 'Переход к следующему заданию'},
    {'event': 'catalogue_page_next', 'name': 'Переход вперёд по страницам каталога ОГЭ'},
    {'event': 'registration_success', 'name': 'Успешная регистрация'},
    {'event': 'study_lead_accepted', 'name': 'Обращение через форму принято'},
]


def api(path, params=None):
    cfg = {}
    env_path = pathlib.Path(os.environ.get('YANDEX_METRIKA_ENV', '/root/.config/yandex-webmaster.env'))
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if '=' in line and not line.lstrip().startswith('#'):
                key, value = line.split('=', 1)
                cfg[key.strip()] = value.strip().strip('\"\'')
    token = os.environ.get('YANDEX_METRIKA_TOKEN') or cfg.get('YANDEX_METRIKA_TOKEN') or cfg.get('YANDEX_WEBMASTER_TOKEN')
    if not token:
        raise RuntimeError('YANDEX_METRIKA_TOKEN is not configured')
    url = 'https://api-metrika.yandex.net' + path
    if params:
        url += '?' + urllib.parse.urlencode(params)
    request = urllib.request.Request(url, headers={'Authorization': 'OAuth ' + token})
    with urllib.request.urlopen(request, timeout=45) as response:
        return json.load(response)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    yesterday = datetime.datetime.now(ZoneInfo('Europe/Moscow')).date() - datetime.timedelta(days=1)
    parser.add_argument('--date1', default=str(yesterday - datetime.timedelta(days=6)))
    parser.add_argument('--date2', default=str(yesterday))
    parser.add_argument('--out', type=pathlib.Path, required=True)
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    goals = api(f'/management/v1/counter/{COUNTER}/goals')['goals']
    goal_ids = {c['url']: g['id'] for g in goals if g['type'] == 'action' for c in g.get('conditions', []) if c.get('type') == 'exact'}
    metrics = ['ym:s:visits', 'ym:s:users', 'ym:s:bounceRate', 'ym:s:pageDepth', 'ym:s:avgVisitDurationSeconds']
    for goal in GOALS:
        if goal['event'] in goal_ids:
            metrics += [f"ym:s:goal{goal_ids[goal['event']]}visits", f"ym:s:goal{goal_ids[goal['event']]}conversionRate"]
    summary = {'counter': COUNTER, 'date1': args.date1, 'date2': args.date2, 'metrics': metrics, 'goals': goal_ids, 'reports': []}
    lines = [f'# Метрика ege-fipi.ru: {args.date1} — {args.date2}', '',
             'Технический сегмент включает распознанных роботов, HeadlessChrome и визиты с явной технической меткой. Это не доказательство, что все такие визиты принадлежат владельцу.', '',
             '| Отчёт | Визиты | Посетители | Отказы | Глубина | Среднее время, с |',
             '|---|---:|---:|---:|---:|---:|']
    for spec in REPORTS:
        result = api('/stat/v1/data', {'ids': COUNTER, 'date1': args.date1, 'date2': args.date2,
                     'metrics': ','.join(metrics),
                     'filters': spec['expression'], 'accuracy': 'full', 'limit': 1000})
        (args.out / (spec['key'] + '.json')).write_text(json.dumps(result, ensure_ascii=False, indent=2))
        totals = result['totals']
        summary['reports'].append({**spec, 'totals': totals, 'sampled': result.get('sampled'),
                                   'contains_sensitive_data': result.get('contains_sensitive_data')})
        lines.append(f"| {spec['name']} | {totals[0]:.0f} | {totals[1]:.0f} | {totals[2]:.2f}% | {totals[3]:.2f} | {totals[4]:.0f} |")
        print(spec['key'], 'visits:', totals[0], 'sampled:', result.get('sampled'))
    lines += ['', '## Цели', '', '| Отчёт | Цель | Целевые визиты | Конверсия |', '|---|---|---:|---:|']
    for report in summary['reports']:
        index = 5
        for goal in GOALS:
            if goal['event'] in goal_ids:
                lines.append(f"| {report['name']} | {goal['name']} | {report['totals'][index]:.0f} | {report['totals'][index+1]:.2f}% |")
                index += 2
    lines += ['', 'Итоги запрошены без группировки по дням: Метрика скрывает небольшие строки при privacy-фильтрации, поэтому сумма видимых дневных строк может быть меньше итогового числа визитов. Флаг contains_sensitive_data сохранён в JSON; он не означает сэмплирование.', '',
              'Основные цели введены 24.09.2026, study_lead_accepted — 09.10.2026. catalogue_page_next и продолжение next_task из окон каталогов ОГЭ добавлены 16.10.2026. Страница ОГЭ содержит до 12 заданий: не складывать её перелистывание с переходом к одному следующему заданию и не считать прежние нули отсутствием продолжения. Первое полное окно новых событий: 17–23.10.2026. Отказы и цели до и после изменений сравнивать с учётом изменения инструмента измерения.', '']
    (args.out / 'summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2))
    (args.out / 'REPORT.md').write_text('\n'.join(lines))


if __name__ == '__main__':
    main()
