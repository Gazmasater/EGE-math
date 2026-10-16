"""Reproducible analysis of archived API evidence; never labels it as fresh data."""
from pathlib import Path
import collections
import csv
import datetime as dt
import html
import json

ROOT = Path(__file__).resolve().parent
OLD = ROOT.parent / 'wordstat-2026-10-08'
HEAD = ROOT.parent / 'positions-2026-10-08/head-query-wordstat.json'


def save(name, value):
    (ROOT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def csv_save(name, rows):
    with (ROOT / name).open('w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


observations = []
for path in [OLD / 'broad.json', OLD / 'quoted.json', HEAD]:
    document = json.loads(path.read_text())
    assert document['geo_ids'] == [225]
    for batch in document['batches']:
        if batch.get('status') != 'complete':
            continue
        for result in batch['response']['data']:
            for field in ['SearchedWith', 'SearchedAlso']:
                for item in result.get(field, []):
                    observations.append(dict(phrase=item['Phrase'], shows=item['Shows'],
                        query=result['Phrase'], field=field, report_id=batch['report_id'],
                        measured_at=batch['retrieved_at'], source_file=str(path.relative_to(ROOT.parent))))


def evidence(phrase, quoted=False):
    query = '"' + phrase + '"' if quoted else phrase
    candidates = [x for x in observations if x['phrase'] == query]
    if quoted:
        candidates = [x for x in candidates if x['query'] == query and x['field'] == 'SearchedWith']
    assert candidates, query
    # Prefer the explicitly requested seed, then SearchedWith, then latest evidence.
    return sorted(candidates, key=lambda x: (x['query'] == query and x['field'] == 'SearchedWith',
                                             x['field'] == 'SearchedWith', x['measured_at']), reverse=True)[0]


overview = []
for phrase, exam, subject in [('огэ математика', 'ОГЭ', 'Математика'),
                              ('егэ математика', 'ЕГЭ', 'Математика'),
                              ('егэ математика профиль', 'ЕГЭ', 'Математика, профиль'),
                              ('егэ физика', 'ЕГЭ', 'Физика'),
                              ('огэ физика', 'ОГЭ', 'Физика')]:
    item = evidence(phrase)
    quote = evidence(phrase, True) if phrase in ['егэ математика профиль', 'егэ физика'] else None
    overview.append(dict(phrase=phrase, exam=exam, subject=subject, broad_shows=item['shows'],
                         quoted_shows=quote['shows'] if quote else None,
                         broad_source=item, quoted_source=quote))

old_rows = json.loads((OLD / 'keywords.json').read_text())
rows = []
for item in old_rows:
    proof = evidence(item['phrase'], True)
    assert proof['shows'] == item['quoted_shows'], item['phrase']
    rows.append({k: item[k] for k in ['phrase', 'exam', 'subject', 'cluster', 'broad_shows',
                                     'quoted_shows', 'target_url', 'ranking_status']})
    rows[-1].update(measured_at=proof['measured_at'], report_id=proof['report_id'],
                    source_file=proof['source_file'])
for phrase, subject, url in [('егэ математика профиль', 'Математика', '/ege/math'),
                            ('егэ физика', 'Физика', '/ege/physics'),
                            ('егэ физика профиль', 'Физика', '/ege/physics')]:
    broad, quote = evidence(phrase), evidence(phrase, True)
    rows.append(dict(phrase=phrase, exam='ЕГЭ', subject=subject, cluster='Общий запрос',
        broad_shows=broad['shows'], quoted_shows=quote['shows'], target_url='https://ege-fipi.ru'+url,
        ranking_status='Текущие позиции не проверены', measured_at=quote['measured_at'],
        report_id=quote['report_id'], source_file=quote['source_file']))

index = {r['phrase']: r for r in rows}
selected = [
    ('егэ математика профиль', 'P1', 'Общая предметная страница: приоритет проверки видимости и соответствия запросу.'),
    ('огэ математика шины', 'P1', 'Проверить возможность отдельной подборки: сейчас назначение — общий раздел практических задач.'),
    ('квадратные уравнения огэ 9 класс', 'P1', 'Продвигать существующую тему с разборами задач.'),
    ('неравенства огэ', 'P1', 'Продвигать существующую тему с разборами задач.'),
    ('графики функций огэ', 'P1', 'Продвигать существующую тему с разборами задач.'),
    ('экономическая задача егэ математика профиль', 'P1', 'Продвигать существующий раздел финансовых задач.'),
    ('производная егэ', 'P1', 'Продвигать существующую подборку первой части.'),
    ('тригонометрические уравнения егэ', 'P1', 'Проверить соответствие раздела уравнений и поискового сниппета.'),
    ('егэ физика', 'P1', 'Основной предметный запрос по физике; без искусственного раздела «профиль».'),
    ('кинематика егэ', 'P2', 'Следующий тематический кандидат после общей предметной страницы.'),
    ('магнитное поле егэ физика', 'P2', 'Тематический кандидат; небольшой уточнённый спрос.'),
    ('подготовка к огэ по физике', 'P2', 'Подготовка с заданиями и решениями; не обещать курс или личного преподавателя.'),
    ('кинематика огэ', 'P2', 'Проверить отдельную подборку внутри механики; текущая страница шире запроса.'),
    ('векторы егэ', 'Удержание', 'Пользователь 8 октября сообщил о топе; текущая выдача не проверялась.'),
    ('банк фипи егэ физика', 'Удержание', 'Пользователь 8 октября сообщил о топе; не переносить статус на весь раздел.'),
]
priorities = [dict(index[phrase], priority=priority, action=action) for phrase, priority, action in selected]
fipi = [index[x] for x in ['фипи огэ математика', 'фипи егэ математика профиль',
                          'фипи егэ физика', 'фипи огэ физика']]
year_queries = [evidence(q) for q in ['егэ математика профиль 2027', 'егэ физика 2027']]
status = dict(checked_at=dt.datetime.now(dt.timezone.utc).isoformat(),
              fresh_collection='failed', fresh_rows=0, temporary_reports_created=0,
              error_code=509, error='Метод недоступен в данной версии API',
              probes=['broad.json', 'api-probe.json', 'api-v4-probe.json'],
              new_api='https://searchapi.api.cloud.yandex.net/v2/wordstat/topRequests',
              missing='Yandex Search API credentials and folderId are not configured in inspected locations',
              plugin_search='No Wordstat plugin found by exact-name search',
              analysis_source='Archived successful Direct Wordstat responses from 2026-10-08 UTC')
save('api-status.json', status)
result = dict(prepared_at=status['checked_at'], data_date_utc='2026-10-08', region='Россия',
              geo_id=225, devices='Без фильтра устройств',
              period='Прошедший месяц по старому API; точные границы не возвращались',
              fresh_api=status, overview=overview, fipi=fipi, priorities=priorities,
              keywords_count=len(rows), observations_count=len(observations), year_queries=year_queries,
              limitations=[
                  'Свежая выгрузка 16 октября не получена. Все частотности относятся к сохранённым ответам 8 октября UTC.',
                  'Кавычки фиксируют число слов, но не порядок и словоформы; ! и [] не применялись.',
                  'Суммировать пересекающиеся частоты нельзя. Это запросы, не люди и не прогноз трафика.',
                  'ОГЭ математика, общий ЕГЭ математика и ОГЭ физика найдены в SearchedAlso; прямой повторный замер отсутствует.',
                  'Широкий ЕГЭ математика включает базовый и профильный уровни. Профиль — подмножество, не дополнительный рынок.',
                  'Подборка ядра не исчерпывает спрос. Текущие позиции, конкуренция, CPC, бюджет и сезонная динамика не измерены.',
                  'Приоритеты — кандидаты по спросу и соответствию содержанию, не гарантии роста.',
              ],
              sources=[str(p.relative_to(ROOT.parent)) for p in [OLD/'broad.json', OLD/'quoted.json', HEAD]],
              docs=['https://yandex.ru/support2/wordstat/ru/content/api-wordstat',
                    'https://aistudio.yandex.ru/ru/docs/search-api/operations/wordstat-gettop',
                    'https://yandex.ru/support2/wordstat/ru/content/operators'])
save('analysis.json', result)
save('keywords.json', rows)
csv_save('keywords.csv', rows)
csv_save('priorities.csv', priorities)
csv_save('overview.csv', [dict(phrase=r['phrase'], broad_shows=r['broad_shows'],
    quoted_shows=r['quoted_shows'], source_field=r['broad_source']['field'],
    source_query=r['broad_source']['query'], measured_at=r['broad_source']['measured_at'],
    report_id=r['broad_source']['report_id']) for r in overview])


def number(value):
    return '—' if value is None else f'{value:,}'.replace(',', ' ')


def table(headers, values):
    return '<div class="tablewrap"><table><thead><tr>'+''.join('<th>'+html.escape(h)+'</th>' for h in headers)+\
        '</tr></thead><tbody>'+''.join('<tr>'+''.join('<td>'+str(v)+'</td>' for v in row)+'</tr>' for row in values)+'</tbody></table></div>'


overview_table = table(['Запрос', 'Широко', 'В кавычках', 'Источник широкой частоты'], [
    [html.escape(r['phrase']), number(r['broad_shows']), number(r['quoted_shows']),
     'Прямой запрос' if r['broad_source']['query'] == r['phrase'] else 'Связанная фраза · SearchedAlso'] for r in overview])
priority_table = table(['Приоритет', 'Запрос', 'В кавычках', 'Страница и действие'], [
    [r['priority'], html.escape(r['phrase']), number(r['quoted_shows']),
     '<a href="'+html.escape(r['target_url'], quote=True)+'">'+html.escape(r['target_url'].removeprefix('https://ege-fipi.ru'))+'</a><br>'+html.escape(r['action'])]
    for r in priorities])
fipi_table = table(['Запрос', 'Широко', 'В кавычках'], [[r['phrase'], number(r['broad_shows']), number(r['quoted_shows'])] for r in fipi])
keyword_table = table(['Запрос', 'Экзамен', 'Предмет', 'Тема', 'Широко', 'В кавычках'], [
    [html.escape(r['phrase']), r['exam'], r['subject'], r['cluster'], number(r['broad_shows']), number(r['quoted_shows'])]
    for r in sorted(rows, key=lambda r:r['quoted_shows'], reverse=True)])
document = '''<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Спрос на ЕГЭ и ОГЭ — анализ API Wordstat</title><style>
*{box-sizing:border-box}body{margin:0;background:#f2f5fa;color:#17263a;font:16px/1.55 system-ui,sans-serif}main{max-width:1180px;margin:auto;padding:32px 20px 64px}h1{font-size:clamp(28px,5vw,44px);line-height:1.15}h2{margin-top:32px}a{color:#154bb4}section,.notice{background:white;border:1px solid #d8e1ee;border-radius:14px;padding:20px;margin:20px 0}.notice{background:#fff4d8;border-color:#e7cd8a}.muted{color:#50627a}.tablewrap{overflow:auto}table{border-collapse:collapse;width:100%;font-size:14px}th,td{text-align:left;border-bottom:1px solid #dce3ec;padding:11px 12px;vertical-align:top}th{background:#eaf0f8}td:nth-child(2),td:nth-child(3){font-variant-numeric:tabular-nums}input{font:inherit;width:100%;padding:12px;border:1px solid #b8c8db;border-radius:7px;margin:10px 0}li{margin:9px 0}.bar{height:12px;background:#356bd3;border-radius:8px;min-width:2px}.barrow{display:grid;grid-template-columns:200px 1fr 100px;gap:12px;align-items:center;margin:14px 0}.barrow span:last-child{text-align:right}@media(max-width:600px){main{padding:18px 12px}section,.notice{padding:14px}.barrow{grid-template-columns:140px 1fr 72px;font-size:12px}}
</style><main><p class="muted">ege-fipi.ru · анализ подготовлен 16 октября 2026</p><h1>Спрос на ЕГЭ и ОГЭ:<br>математика и физика</h1>
<div class="notice"><strong>Данные от 8 октября 2026 UTC, не свежая выгрузка.</strong> Попытка обновления 16 октября через Direct Live 4 и v4 завершилась ошибкой 509 «Метод недоступен в данной версии API». Новых частотностей не получено. Яндекс направляет в Wordstat API сервиса Search API; для него нужны отдельный доступ и folderId.</div>
<p><strong>Вывод:</strong> математические направления дают больший масштаб спроса. Для существующего банка ближайшие кандидаты — общая страница профильного ЕГЭ и тематические подборки ОГЭ по математике. По физике приоритет — общий ЕГЭ, затем тематические задачи. Это гипотезы для проверки видимости, а не прогноз прироста трафика.</p>
<p class="muted">Россия · все устройства · месячная статистика старого API, точные границы периода не возвращались.</p>
<section><h2>Масштаб спроса</h2>OVERVIEW<p class="muted">ЕГЭ математика включает оба уровня; профиль входит в общий объём. Три общие частоты найдены в блоке связанных запросов SearchedAlso и не проверены прямым повторным запросом. Частоты не складываются.</p></section>
<section><h2>Что делать с имеющимися страницами</h2>PRIORITIES<p class="muted">P1/P2 — очередность анализа и контентной работы. Выдачу и конкуренцию нужно проверить перед изменениями. «Удержание» основано на сообщении пользователя от 8 октября, не на свежем замере позиций.</p></section>
<section><h2>Запросы с ФИПИ — отдельная группа</h2>FIPI<p>Спрос значительный, но намерение смешанное: часть людей ищет официальный ФИПИ. Показывать собственные разборы и удобство поиска задач; не позиционировать сайт как официальный.</p></section>
<section><h2>Дополнительные возможности и ограничения</h2><ul>
<li>«ЕГЭ математика профиль 2027» — 175 615 широко; «ЕГЭ физика 2027» — 52 229. Годовые страницы имеют смысл после проверки актуальных материалов; эти числа не доказывают динамику спроса.</li>
<li>«ЕГЭ физика профиль» — 87 в кавычках против 24 194 у «ЕГЭ физика». Отдельный раздел «профильная физика» не обоснован.</li>
<li>Варианты, демоверсии, формулы и подготовка — разные задачи посетителя. Текущий банк задач не заменяет полноценный вариант экзамена или курс.</li>
<li>Для рекламы сначала выделить намерение «задачи / решения / банк», уточнить коммерческую цель, посадочную страницу и прогноз цены клика. Wordstat не даёт цены привлечения и окупаемости.</li>
<li>Запросы с чужими брендами, утечками ответов, расписанием и результатами экзаменов требуют отдельной оценки релевантности. Не использовать весь резерв как глобальные минус-слова.</li></ul></section>
<section id="keywords"><h2>319 проверенных фраз из сохранённой выгрузки</h2><p>316 фраз исходного ядра + 3 общих запроса. Это отобранная семантика, не полный рынок.</p><label for="search">Найти запрос, предмет или тему</label><input id="search" type="search" placeholder="Например: шины, ОГЭ, кинематика"><p id="count" class="muted"></p>KEYWORDS</section>
<section><h2>Методика и источники</h2><ul>LIMITATIONS</ul><p><a href="analysis.json">Данные и ссылки на исходные ответы</a> · <a href="keywords.csv">Все ключи CSV</a> · <a href="priorities.csv">Приоритеты CSV</a> · <a href="api-status.json">Диагностика API</a></p><p><a href="https://yandex.ru/support2/wordstat/ru/content/api-wordstat">Актуальная справка API</a> · <a href="https://aistudio.yandex.ru/ru/docs/search-api/operations/wordstat-gettop">Новый GetTop и доступ</a> · <a href="https://yandex.ru/support2/wordstat/ru/content/operators">Операторы Wordstat</a></p></section></main>
<script>const input=document.querySelector('#search'),rows=[...document.querySelectorAll('#keywords tbody tr')],count=document.querySelector('#count');function filter(){const q=input.value.trim().toLocaleLowerCase('ru');let n=0;rows.forEach(r=>{r.hidden=!r.textContent.toLocaleLowerCase('ru').includes(q);if(!r.hidden)n++});count.textContent=`Показано ${n} из ${rows.length}`;}input.addEventListener('input',filter);filter();</script></html>'''
for token, value in [('OVERVIEW', overview_table), ('PRIORITIES', priority_table), ('FIPI', fipi_table),
                     ('KEYWORDS', keyword_table), ('LIMITATIONS', ''.join('<li>'+html.escape(x)+'</li>' for x in result['limitations']))]:
    document = document.replace(token, value)
(ROOT/'report.html').write_text(document)
save('validation.json', dict(keywords=len(rows), all_quoted_values_match_raw_api=True,
                             overview_values_have_raw_evidence=True, historical_label=True,
                             fresh_rows=0, validated_at=status['checked_at']))
print(json.dumps({'keywords':len(rows), 'priorities':len(priorities), 'overview':[(r['phrase'], r['broad_shows'], r['quoted_shows']) for r in overview]},ensure_ascii=False))
