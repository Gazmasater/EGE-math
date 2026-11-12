"""Build a sanitized report from saved aggregate responses; no API writes."""
import datetime as dt
import html
import json
import math
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent
META = json.loads((ROOT / 'meta.json').read_text())
REPORTS = {p.stem: json.loads(p.read_text()) for p in (ROOT / 'reports').glob('*.json')}
METRICS = META['metrics']
KEYS = ['visits', 'users', 'pageviews', 'bounce_rate', 'depth', 'seconds',
        'solution_visits', 'solution_reaches', 'next_visits', 'next_reaches',
        'catalogue_visits', 'catalogue_reaches', 'registration_visits', 'registration_reaches',
        'lead_visits', 'lead_reaches']

def stats(name):
    r = REPORTS[name]
    d = dict(zip(KEYS, r['totals']))
    n = d['visits']
    d['bounces'] = round(n * d['bounce_rate'] / 100)
    for event in ['solution', 'next', 'catalogue']:
        d[event + '_rate'] = 100 * d[event + '_visits'] / n if n else None
    return d

def difference(before, after, key):
    # Exploratory independent-session approximation, not a causal or user-level test.
    p1, p2 = before[key] / 100, after[key] / 100
    delta = 100 * (p2 - p1)
    se = 100 * math.sqrt(p1 * (1 - p1) / before['visits'] + p2 * (1 - p2) / after['visits'])
    return dict(delta_pp=delta, approximate_95_ci_pp=[delta - 1.96 * se, delta + 1.96 * se])

segments = ['public', 'public_organic', 'iphone', 'iphone_safari', 'iphone_other', 'mobile_safari',
            'android', 'desktop', 'iphone_organic', 'iphone_direct', 'iphone_nonorganic',
            'android_organic', 'desktop_organic']
analysis = dict(counter=112561663, generated_at_moscow=dt.datetime.now(ZoneInfo('Europe/Moscow')).isoformat(),
                periods=META['periods'], segments={s: {p: stats(p + '_' + s) for p in ['before', 'after']}
                                                for s in segments})
analysis['iphone_rate_differences'] = {
    key: difference(analysis['segments']['iphone']['before'], analysis['segments']['iphone']['after'], key)
    for key in ['bounce_rate', 'solution_rate', 'next_rate']}
analysis['daily_iphone'] = {name[4:14]: stats(name) for name in sorted(REPORTS) if name.startswith('day_')}
analysis['landings'] = {name: {p: stats(p + '_iphone_landing_' + name) for p in ['before', 'after']}
                        for name in ['ege_math', 'tasks', 'oge_math', 'ege_physics', 'oge_physics', 'home']}
analysis['browsers'] = {name: {p: stats(p + '_iphone_browser_' + name) for p in ['before', 'after']}
                        for name in ['yandex_start', 'yandex', 'chrome_mobile', 'alice']}
analysis['alternative_before_iphone'] = stats('alternative_before_iphone')
analysis['original_mobile_safari'] = stats('original_mobile_safari')
analysis['interpretation'] = [
    'Визитов iPhone стало больше, улучшение поведенческих показателей после исправления не подтверждено.',
    'Сравнение одинаковых дней недели: 01–05.11 против 08–12.11. День публикации 07.11 исключён.',
    'В альтернативном предыдущем окне 02–06.11 отказы iPhone 37,7%: знак изменения зависит от базы сравнения.',
    'Mobile Safari — браузер, iPhone — модель устройства. Эти сегменты не взаимозаменяемы.',
    'Наиболее заметное наблюдаемое ухудшение среди браузеров iPhone — Яндекс Старт; Safari изменился слабее.',
    'Отказы Android также выросли. Он получил тот же мобильный CSS и не является независимой контрольной группой. Одна до/после выборка не доказывает влияние CSS на Метрику.',
    'Цели означают визиты с событиями, не число решённых задач и не последовательную воронку.',
    'Закрытие модального окна отдельной целью не измеряется; эффект самой кнопки из этих целей не выделяется.',
    'Среднее время — показатель Метрики, не измерение фактического чтения; последние часы 12.11 могут уточняться.',
]
checks = dict(reports=len(REPORTS), errors=[n for n, r in REPORTS.items() if 'totals' not in r],
              sampled=[n for n, r in REPORTS.items() if r.get('sampled')],
              sample_shares=sorted(set(r.get('sample_share', -1) for r in REPORTS.values())),
              data_lags=sorted(set(r.get('data_lag', -1) for r in REPORTS.values())),
              privacy_limited_reports=sum(bool(r.get('contains_sensitive_data')) for r in REPORTS.values()))
assert not checks['errors'] and not checks['sampled']
assert checks['sample_shares'] == [1.0]
for period, dates in META['periods'].items():
    days = [d for d in analysis['daily_iphone'] if dates[0] <= d <= dates[1]]
    total = stats(period + '_iphone')
    for key in ['visits', 'pageviews', 'bounces', 'solution_visits', 'solution_reaches', 'next_visits', 'next_reaches']:
        actual = sum(analysis['daily_iphone'][d][key] for d in days)
        assert actual == total[key], (period, key, actual, total[key])
    safari, other = stats(period + '_iphone_safari'), stats(period + '_iphone_other')
    for key in ['visits', 'pageviews', 'bounces', 'solution_visits', 'next_visits']:
        assert safari[key] + other[key] == total[key], (period, key)
    organic, other_source = stats(period + '_iphone_organic'), stats(period + '_iphone_nonorganic')
    for key in ['visits', 'pageviews', 'bounces', 'solution_visits', 'next_visits']:
        assert organic[key] + other_source[key] == total[key], (period, key)
checks['additive_totals'] = 'passed: daily, Safari/other, organic/nonorganic; users not additive'
analysis['verification'] = checks
(ROOT / 'analysis.json').write_text(json.dumps(analysis, ensure_ascii=False, indent=2) + '\n')
(ROOT / 'verification.json').write_text(json.dumps(checks, ensure_ascii=False, indent=2) + '\n')

def num(value, digits=1):
    return f'{value:.{digits}f}'.replace('.', ',')

def clock(value):
    value = round(value)
    return f'{value // 60}:{value % 60:02d}'

def row(label, before, after, kind='number'):
    def fmt(value):
        if kind == 'percent': return num(value) + '%'
        if kind == 'time': return clock(value)
        if kind == 'integer': return str(round(value))
        return num(value, 2)
    return '<tr><th>' + html.escape(label) + '</th><td>' + fmt(before) + '</td><td>' + fmt(after) + '</td></tr>'

def table(headers, body):
    return '<div class="table"><table><thead><tr>' + ''.join('<th>' + html.escape(x) + '</th>' for x in headers) + '</tr></thead><tbody>' + body + '</tbody></table></div>'

b, a = analysis['segments']['iphone']['before'], analysis['segments']['iphone']['after']
main_rows = ''.join(row(label, b[key], a[key], kind) for label, key, kind in [
    ('Визиты', 'visits', 'integer'), ('Посетители', 'users', 'integer'), ('Просмотры', 'pageviews', 'integer'),
    ('Отказы', 'bounce_rate', 'percent'), ('Глубина', 'depth', 'number'), ('Среднее время', 'seconds', 'time'),
    ('Визиты с открытием решения', 'solution_visits', 'integer'), ('Доля с открытием решения', 'solution_rate', 'percent'),
    ('Визиты с переходом к следующему заданию', 'next_visits', 'integer'), ('Доля с переходом к следующему заданию', 'next_rate', 'percent')])
control_rows = ''
for label, name in [('iPhone: Safari', 'iphone_safari'), ('iPhone: другие браузеры', 'iphone_other'),
                    ('Android', 'android'), ('Компьютеры', 'desktop'), ('iPhone: только поиск', 'iphone_organic')]:
    x, y = analysis['segments'][name]['before'], analysis['segments'][name]['after']
    control_rows += '<tr><th>' + label + '</th><td>' + str(round(x['visits'])) + ' → ' + str(round(y['visits'])) + '</td><td>' + num(x['bounce_rate']) + '% → ' + num(y['bounce_rate']) + '%</td><td>' + num(x['solution_rate']) + '% → ' + num(y['solution_rate']) + '%</td><td>' + num(x['next_rate']) + '% → ' + num(y['next_rate']) + '%</td></tr>'
browser_rows = ''
for label, name in [('Яндекс Старт', 'yandex_start'), ('Яндекс.Браузер', 'yandex')]:
    x, y = analysis['browsers'][name]['before'], analysis['browsers'][name]['after']
    browser_rows += '<tr><th>' + label + '</th><td>' + str(round(x['visits'])) + ' → ' + str(round(y['visits'])) + '</td><td>' + num(x['bounce_rate']) + '% → ' + num(y['bounce_rate']) + '%</td><td>' + clock(x['seconds']) + ' → ' + clock(y['seconds']) + '</td><td>' + num(x['next_rate']) + '% → ' + num(y['next_rate']) + '%</td></tr>'
landing_rows = ''
for label, name in [('/ege/math', 'ege_math'), ('/tasks/*', 'tasks'), ('/oge', 'oge_math'), ('/oge-physics', 'oge_physics')]:
    x, y = analysis['landings'][name]['before'], analysis['landings'][name]['after']
    landing_rows += '<tr><th>' + label + '</th><td>' + str(round(x['visits'])) + ' → ' + str(round(y['visits'])) + '</td><td>' + num(x['bounce_rate']) + '% → ' + num(y['bounce_rate']) + '%</td><td>' + str(round(x['solution_visits'])) + ' → ' + str(round(y['solution_visits'])) + '</td><td>' + str(round(x['next_visits'])) + ' → ' + str(round(y['next_visits'])) + '</td></tr>'
daily_rows = ''.join('<tr><th>' + d + '</th><td>' + str(round(s['visits'])) + '</td><td>' + num(s['bounce_rate']) + '%</td><td>' + str(round(s['solution_visits'])) + '</td><td>' + str(round(s['next_visits'])) + '</td></tr>' for d, s in analysis['daily_iphone'].items())

report = '''<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ege-fipi.ru — iPhone после 7 ноября</title><style>body{font:16px/1.55 system-ui,sans-serif;max-width:1050px;margin:36px auto;padding:0 20px;color:#172d40;background:#fafcfd}h1{line-height:1.2}h2{margin-top:2em}table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums;background:#fff}td,th{border-bottom:1px solid #dbe4eb;padding:9px 12px;text-align:left}.table{overflow:auto}thead{background:#e8f0f7}small{color:#53677a}.lead{background:#e8f0f7;padding:18px;border-radius:10px}a{color:#1358a1}code{overflow-wrap:anywhere}li{margin:8px 0}</style><h1>ege-fipi.ru: что изменилось на iPhone</h1><p>Счётчик 112561663. Полные московские дни 1–5 и 8–12 ноября 2026; одинаковые дни недели, воскресенье–четверг. Собрано после полуночи 13 ноября.</p><p class="lead"><strong>Трафика стало больше, улучшение вовлечённости после исправления не подтверждено.</strong> Визиты iPhone +25,4%, но доли открытия решения и перехода к следующему заданию ниже. Рост отказов небольшой и зависит от выбранной базы сравнения.</p><h2>Все браузеры iPhone</h2>'''
report += table(['Показатель', '1–5 ноября', '8–12 ноября'], main_rows)
report += '<h2>Сопоставление платформ и источников</h2>' + table(['Сегмент', 'Визиты', 'Отказы', 'Открытие решения', 'Следующее задание'], control_rows)
report += '<p>Отказы выросли и на Android: 18,3% → 26,2%. Мобильный CSS изменился для обеих платформ, поэтому Android не является независимой контрольной группой. На ПК отказы почти прежние: 18,2% → 18,5%; аудитория и сценарии на ПК отличаются.</p>'
report += '<h2>Разные браузеры iPhone ведут себя по-разному</h2>' + table(['Браузер', 'Визиты', 'Отказы', 'Среднее время', 'Следующее задание'], browser_rows)
report += '<p>В Safari на iPhone глубина выросла 2,36 → 2,63, время 4:24 → 4:37; отказы при этом 34,4% → 37,6%. Самое заметное падение времени и переходов — в Яндекс Старт. Это наблюдение, не установленная причина.</p>'
report += '<h2>Страницы входа на iPhone</h2>' + table(['Вход', 'Визиты', 'Отказы', 'Визиты: решение', 'Визиты: следующее'], landing_rows)
report += '<p>На /ege/math отказы снизились, на отдельных заданиях выросли. Среди поисковых входов на задания 45 → 46 визитов, отказы 15,6% → 26,1%, открытие решения 41/45 → 37/46, следующее задание 3/45 → 0/46. Это малые группы; ноль зарегистрированных событий не означает доказанную поломку.</p>'
report += '<h2>Что было исправлено</h2><p>7 ноября мобильному диалогу решения задали overflow:visible: крестик остаётся доступным при прокрутке длинного решения. На 13 ноября публичная /tasks/FDA042 подключает тот же CSS catalogue-math.1c9e8706c6273e89.css; нужное правило присутствует. Предыдущие 9 сценариев WebKit прошли; настоящий iPhone и реальные рекламные вставки в том аудите не проверялись. В этом анализе новые браузерные тесты не запускались.</p>'
report += '<h2>Ограничения вывода</h2><ul>' + ''.join('<li>' + html.escape(t) + '</li>' for t in analysis['interpretation'][1:]) + '</ul>'
report += '<p>Исходный Mobile Safari 31.10–06.11: 159 визитов, 39,0% отказов. Сейчас 08–12.11: 134 визита, 37,3%. Это разные по длительности и дням недели окна; снижение на 1,7 п.п. не подтверждает эффект правки. В основном сравнении на одинаковых днях недели Safari даёт 34,4% → 37,3%.</p>'
report += '<p>Для изменения отказов всех iPhone +3,6 п.п. приблизительный 95% интервал разности составляет −4,4…+11,7 п.п. Это лишь ориентир при условной независимости визитов; повторные пользователи и множественные сравнения не учтены. На таких данных нельзя уверенно заявить ни улучшение, ни вред от CSS.</p>'
report += '<h2>Следующий шаг</h2><p>Приоритет — воспроизвести путь «поиск → отдельное задание → решение → возврат/следующее» в Яндекс Старт на настоящем iPhone, с реальной рекламой и длинным решением. Проверить тот же сценарий на Android: мобильная правка затрагивает и его. Перед повторной оценкой взять более длинные одинаковые недельные окна. По этим данным откат исправления кнопки не обоснован; это рекомендация, изменений сайта сейчас нет.</p>'
report += '<h2>Качество данных</h2><p>85 агрегатных запросов Reporting API, accuracy=full, без сэмплирования и ошибок. Распознанные роботы, HeadlessChrome и traffic_kind=technical исключены. Итоги взяты из totals и отдельных фильтров. API помечает чувствительные комбинации: скрытые строки детализации не считаются нулями; суммы дней, источников и браузеров проверены. Правила скрытия описаны в <a href="https://yandex.com/dev/metrika/ru/faq">документации Метрики</a>; сегмент iPhone использует <a href="https://yandex.ru/dev/metrika/ru/stat/attributes/visitstechnology_/device">модель устройства</a>.</p><p>Сайт, цели, настройки счётчика, реклама и базы этим анализом не изменялись. Секреты, контакты и идентификаторы посетителей в артефакты не включены.</p>'
report += '<details><summary>Дневная статистика iPhone</summary>' + table(['Дата', 'Визиты', 'Отказы', 'Решение', 'Следующее'], daily_rows) + '</details><p><a href="analysis.json">Расчёты JSON</a> · <a href="verification.json">Проверки</a> · <a href="meta.json">Методика запросов</a></p></html>'
(ROOT / 'report.html').write_text(report + '\n')
print(json.dumps(dict(verification=checks, iphone=analysis['segments']['iphone'], differences=analysis['iphone_rate_differences']), ensure_ascii=False, indent=2))
