"""Join only the exact quoted response rows and produce the saved semantic core."""
import sys
sys.dont_write_bytecode = True
import csv
import html
import json
import re
from collections import Counter
from pathlib import Path
from curate import csv_write, dump, ROOT

candidates = json.loads((ROOT / 'candidates.json').read_text())
broad = json.loads((ROOT / 'broad.json').read_text())
quoted = json.loads((ROOT / 'quoted.json').read_text())
landings = json.loads((ROOT / 'landing-checks.json').read_text())
ranking_path = ROOT / 'known-rankings.json'
rankings = json.loads(ranking_path.read_text()) if ranking_path.exists() else []
known_rankings = {r['phrase']: r for r in rankings}
assert len(known_rankings) == len(rankings)
assert set(known_rankings) <= {r['phrase'] for r in candidates}
assert landings['passed'], 'Destination verification is incomplete or has failures'
assert quoted.get('completed_at') and broad.get('completed_at')
assert set(quoted['phrases']) == {r['quoted_query'] for r in candidates}
pages = {p['url']: p for p in landings['pages']}
quoted_rows = {}
for batch in quoted['batches']:
    if batch.get('status') != 'complete':
        continue
    assert batch['cleanup_response'].get('data') == 1
    for report in batch['response']['data']:
        # Other SearchedWith rows may contain broad counts, even in a quoted report.
        matches = [x for x in report.get('SearchedWith', []) if x['Phrase'] == report['Phrase']]
        assert len(matches) == 1, report['Phrase']
        assert report['Phrase'] not in quoted_rows
        quoted_rows[report['Phrase']] = {'shows': matches[0]['Shows'], 'report_id': batch['report_id'],
                                         'retrieved_at': batch['retrieved_at']}
assert len(quoted_rows) == len(candidates)

all_rows = []
for original in candidates:
    q = quoted_rows[original['quoted_query']]
    assert isinstance(q['shows'], int) and q['shows'] >= 0
    assert q['shows'] <= original['broad_shows'], original['phrase']
    row = {k: v for k, v in original.items() if k not in ['observations', 'status', 'reason']}
    row.update(quoted_shows=q['shows'], quoted_report_id=q['report_id'], measured_at=q['retrieved_at'],
               broad_report_ids=sorted({o['report_id'] for o in original['observations']}))
    p = row['phrase']
    page = pages[row['target_url']]
    row['landing_title'] = page['title']
    notes = [row['note']] if row['note'] else []
    row['content_status'] = 'Задания с опубликованными решениями'
    if row['exam'] == 'Бренд':
        row['content_status'] = 'Название сайта'
    elif row['exam'] == 'ОГЭ':
        c = page['coverage']
        assert c is not None
        if c.get('tasks') is not None:
            row['content_status'] = f"Решения {c['published_solutions']}/{c['tasks']}; условия доступны"
        else:
            row['content_status'] = 'Условия доступны; решений нет'
        if row['subject'] == 'Математика':
            notes.append('Не обещать ответы и решения до их публикации')
        elif c.get('published_solutions', 0) < c.get('tasks', 1):
            notes.append('Не обещать решения всех задач; доступность проверять перед продвижением')
    if 'фипи' in p and not re.search(r'банк|зада|решен', p):
        notes.append('Смешанное намерение: часть аудитории ищет официальный ФИПИ')
    if 'тренажер' in p:
        notes.append('Есть самостоятельная практика; не обещать автопроверку и сохранение прогресса')
    if row['target_url'].endswith('topic=practical'):
        notes.append('Общая подборка практических задач; отдельные страницы шин, печей и участков ещё не созданы')
    if 'молекулярная' in p and 'термодинамика' in p:
        row['alternative_url'] = 'https://ege-fipi.ru/physics?topic=thermodynamics'
        notes.append('Две темы; обе посадочные указаны отдельно')
    if p == 'задания огэ вероятность и статистика':
        notes.append('Посадочная о вероятности; описательная статистика в банке пока не заполнена')
    if p.startswith('на рисунке'):
        notes.append('Общий текст условия; конкретную задачу по одной фразе не определить')
    ranking = known_rankings.get(p)
    row['ranking_status'] = ranking['status'] if ranking else 'Позиции не проверены'
    row['ranking_source'] = ranking['source'] if ranking else ''
    row['ranking_reported_at'] = ranking['reported_at'] if ranking else ''
    if ranking:
        notes.append('Удержание позиций: пользователь сообщил о топе; точная позиция, поисковик и регион не указаны')
    row['note'] = '; '.join(dict.fromkeys(notes))
    ready = row['exam'] == 'ЕГЭ'
    if row['exam'] == 'ОГЭ' and row['subject'] == 'Физика':
        c = page['coverage']
        ready = c.get('tasks', 0) > 0 and c.get('tasks') == c.get('published_solutions')
    focused = row['cluster'] != 'Общий банк' or bool(re.search(r'банк|зада|решен', p))
    row['priority'] = ('Наблюдение' if q['shows'] == 0 else 'Удержание' if ranking else 'Бренд' if row['exam'] == 'Бренд'
                       else 'P1' if ready and focused and q['shows'] >= 10 and not p.startswith('на рисунке')
                       else 'P2')
    all_rows.append(row)

order = {'P1': 0, 'P2': 1, 'Удержание': 2, 'Бренд': 3, 'Наблюдение': 4}
all_rows.sort(key=lambda r: (order[r['priority']], -r['quoted_shows'], r['phrase']))
core = [r for r in all_rows if r['quoted_shows'] > 0]
watch = [r for r in all_rows if r['quoted_shows'] == 0]
assert len({r['phrase'] for r in all_rows}) == len(all_rows)
for row in all_rows:
    assert pages[row['target_url']]['passed']
    if row['alternative_url']:
        assert pages[row['alternative_url']]['passed']
dump('keywords.json', core)
dump('watchlist.json', watch)

columns = {'phrase': 'Ключевая фраза', 'quoted_shows': 'Частотность в кавычках',
           'broad_shows': 'Широкая частотность', 'priority': 'Приоритет',
           'ranking_status': 'Статус позиций', 'ranking_source': 'Источник сведений о позициях',
           'ranking_reported_at': 'Дата сообщения о позициях', 'exam': 'Экзамен',
           'subject': 'Предмет', 'cluster': 'Группа', 'target_url': 'Посадочная страница',
           'alternative_url': 'Дополнительная страница', 'content_status': 'Доступное содержание',
           'note': 'Оговорки', 'quoted_query': 'Запрос к API', 'measured_at': 'Дата выгрузки UTC',
           'quoted_report_id': 'ID отчета API', 'seeds': 'Исходные основы', 'equivalent_variants': 'Объединенные варианты'}
def export(name, data):
    csv_write(name, [{columns[k]: r.get(k, '') for k in columns} for r in data], list(columns.values()))
export('keywords.csv', core)
export('priority.csv', [r for r in core if r['priority'] == 'P1'])
export('retention.csv', [r for r in core if r['priority'] == 'Удержание'])
export('watchlist.csv', watch)
(ROOT / 'keywords.txt').write_text('\n'.join(r['phrase'] for r in core) + '\n')

classification = json.loads((ROOT / 'classification.json').read_text())
report = {
    'site': 'https://ege-fipi.ru', 'source': 'Yandex Direct Live 4 Wordstat API',
    'api_endpoint': broad['endpoint'], 'methods': ['GetRegions', 'CreateNewWordstatReport', 'GetWordstatReport', 'DeleteWordstatReport'],
    'geo_ids': [225], 'region': 'Россия', 'devices': 'Без фильтра устройств; все доступные в API',
    'collection_started_at': broad['started_at'], 'collection_completed_at': quoted['completed_at'],
    'period': 'Месячная оценка Shows на дату выгрузки. Точные границы периода этот API в ответе не возвращает.',
    'counts': {'seeds': len(broad['phrases']), 'raw_observations': sum(len(r.get(k, [])) for b in broad['batches'] if b.get('status') == 'complete' for r in b['response']['data'] for k in ['SearchedWith', 'SearchedAlso']),
               'unique_searched_with': len(classification), 'quoted_checked': len(all_rows), 'positive_keywords': len(core),
               'zero_frequency_watchlist': len(watch), 'priority_p1': sum(r['priority'] == 'P1' for r in core),
               'retention': sum(r['priority'] == 'Удержание' for r in core),
               'reserve': sum(r['status'] == 'reserve' for r in classification),
               'excluded': sum(r['status'] == 'excluded' for r in classification), 'checked_destinations': len(pages),
               'groups': len({(r['exam'], r['subject'], r['cluster']) for r in core})},
    'by_exam_subject': dict(Counter(r['exam'] + ' / ' + r['subject'] for r in core)),
    'methodology': [
        'Основы выбраны по текущим банкам ЕГЭ и ОГЭ: профильная математика и физика. Рекомендованное ядро отобрано из SearchedWith; ассоциации сохранены как сырые наблюдения.',
        'Не более четырех основных фраз и двух целевых уточнений на основу, с удалением пересечений. Это репрезентативный подбор, не исчерпывающая семантика. Выдача может упираться в 200 строк на основу.',
        'Широкая частотность включает вложенные запросы. Кавычки фиксируют количество слов, но не словоформы и порядок; ! и [] не применялись. Это не строгая частота буквальной строки.',
        'Из каждого уточняющего отчета берется только строка, дословно равная запросу с кавычками. Соседние строки могут по-прежнему содержать широкую частотность.',
        'Частоты похожих, вложенных и переставленных фраз нельзя складывать. Это не уникальные люди, визиты сайта, прогноз кликов, CPC или дохода.',
        'Перестановки слов и явные перечисленные словоформы объединены; исходные варианты, значения и ID отчетов сохранены. Частоты не суммировались.',
        'P1 — кандидаты для проверки потенциала роста: существующие разделы с решениями, релевантным намерением и частотой в кавычках не менее 10. P2 — более широкое намерение, ограниченное содержание либо меньшая частота. Спрос сам по себе не подтверждает возможность роста: позиции остальных запросов ещё не проверены, конкуренция не оценена.',
        'Известные со слов пользователя запросы в топе переведены в «Удержание» и исключены из priority.csv. Источник и дата сообщения сохранены в known-rankings.json; точная позиция, поисковик и регион не сообщались. Статус относится только к двум названным фразам и не переносится на весь тематический раздел или соседние формулировки.',
        'ОГЭ-математика: обещания ответов и решений исключены из ядра. По физике ОГЭ наличие решений проверено по рабочей SQLite только для чтения; это датированный снимок.',
        'Запросы с 2027 и другими годами, номерами КИМ, демоверсиями, вариантами и справочниками оставлены в резерве: нельзя обещать соответствие текущему экзамену без отдельной проверки.',
        'Условия отбора резерва и исключений автоматические, они требуют ручного просмотра перед будущим расширением. Все рекомендованные фразы просмотрены, назначения проверены по HTTP, canonical, robots и sitemap.',
        'Для возможной рекламы исключать чужие бренды, базовую математику, отсутствующие услуги и явную навигацию на официальный ФИПИ. Не применять весь reserve.csv как глобальные минус-слова; «бесплатно», «решения», «ответы» для ЕГЭ не минусовать.',
        'Рекламные кампании и содержимое сайта не изменены. Внешние действия ограничены созданием и удалением собственных временных отчетов подбора.'
    ],
    'documentation': [
        'https://yandex.ru/dev/direct/doc/ru/best-practice/statistics',
        'https://yandex.ru/support/direct/ru/keywords/wordstat',
        'https://yandex.ru/support/direct/ru/keywords/symbols-and-operators'
    ],
    'solution_snapshot': landings['solution_snapshot'],
    'known_rankings': rankings,
    'reproduce': ['python3 collect.py seeds.json broad.json', 'python3 curate.py',
                  'python3 collect.py quoted-seeds.json quoted.json', 'python3 check_landings.py', 'python3 build_result.py'],
    'reproduction_note': 'Существующие выгрузки не перезапрашиваются. Для нового среза скопировать seeds.json, known-rankings.json и скрипты в новый датированный каталог; актуальность сведений о позициях перепроверить. Ключ читается из окружения или защищенного файла, никогда не сохраняется в отчете.',
    'highlights': [{k: r[k] for k in ['phrase', 'quoted_shows', 'broad_shows', 'priority', 'target_url']} for r in core[:20]]
}
dump('report.json', report)

e = html.escape
table = ''.join('<tr data-exam="' + e(r['exam']) + '" data-subject="' + e(r['subject']) + '">' +
                ''.join('<td>' + e(str(r[k])) + '</td>' for k in ['priority', 'phrase', 'quoted_shows', 'broad_shows', 'ranking_status', 'exam', 'subject', 'cluster']) +
                '<td><a href="' + e(r['target_url'], quote=True) + '">' + e(r['target_url'].replace('https://ege-fipi.ru', '') or '/') + '</a></td>' +
                '<td>' + e(r['content_status']) + (('<br>' + e(r['note'])) if r['note'] else '') + '</td></tr>' for r in core)
methodology = ''.join('<li>' + e(p) + '</li>' for p in report['methodology'])
doclinks = ' · '.join('<a href="' + e(u) + '">Справка Яндекса ' + str(i + 1) + '</a>' for i, u in enumerate(report['documentation']))
page = '''<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ключевые слова ege-fipi.ru — Вордстат, 08.10.2026 UTC</title>
<style>body{font:16px/1.55 system-ui,sans-serif;color:#162337;background:#f4f6fa;margin:0;padding:32px}main{max-width:1500px;margin:auto}h1{font-size:30px;line-height:1.2}.card{background:white;border:1px solid #dde4ee;border-radius:12px;padding:22px;margin:20px 0}.stats{font-size:20px}a{color:#215cc5}input,select{font:inherit;padding:10px;border:1px solid #b9c5d5;border-radius:6px;margin:6px 10px 6px 0}input{width:min(95%,480px)}.scroll{overflow:auto}table{border-collapse:collapse;min-width:1050px;width:100%;font-size:14px}th,td{text-align:left;vertical-align:top;border-bottom:1px solid #e2e7ef;padding:10px}th{background:#eaf0f8;position:sticky;top:0}td:nth-child(2){min-width:200px}td:last-child{min-width:240px}small{color:#526176}[hidden]{display:none!important}li{margin:10px 0}@media(max-width:600px){body{padding:16px}.card{padding:15px}h1{font-size:25px}}</style>
<main><h1>Ключевые слова для ege-fipi.ru</h1><p>Выгрузка 8 октября 2026, UTC · Россия, GeoID 225 · без фильтра устройств</p>
<div class="card stats">POSITIVE фраз с ненулевой частотностью · PRIORITY кандидатов P1 · RETENTION на удержание · GROUPS групп</div>
<div class="card"><p>Источник — API Вордстата через Яндекс Директ. Проверены QUOTED фраз в кавычках; ZERO с нулевой частотой оставлены для наблюдения.</p>
<p><strong>Частотность — месячная оценка запросов, а не трафик сайта.</strong> Кавычки ограничивают количество слов. Словоформы и порядок не фиксированы; пересекающиеся частоты не складываются.</p>
<p><a href="keywords.csv">Все ключи CSV</a> · <a href="priority.csv">Кандидаты P1 CSV</a> · <a href="retention.csv">Удержание позиций CSV</a> · <a href="reserve.csv">Резерв</a> · <a href="excluded.csv">Исключения</a> · <a href="watchlist.csv">Нулевая частотность</a> · <a href="all-observations.csv">Исходные наблюдения</a> · <a href="report.json">Методика и сводка JSON</a></p>
<p>P1: кандидаты для проверки потенциала роста, подобранные по содержанию и спросу. P2: более широкое намерение, ограниченное содержание или меньшая частота. «Удержание»: запросы уже в топе со слов пользователя. Позиции остальных фраз ещё не проверены; P1 не означает, что запрос находится вне топа. Конкуренция не оценивалась. В ОГЭ по математике пока нет решений; в физике ОГЭ покрытие неполное.</p></div>
<div class="card"><label>Поиск <input id="q" type="search" placeholder="Фраза, тема или URL"></label><label>Экзамен <select id="exam"><option value="">Все</option><option>ЕГЭ</option><option>ОГЭ</option><option>Бренд</option></select></label><label>Предмет <select id="subject"><option value="">Все</option><option>Математика</option><option>Физика</option><option>Оба</option></select></label><p id="count" aria-live="polite"></p>
<div class="scroll"><table><thead><tr><th>Очередь</th><th>Фраза</th><th>В кавычках</th><th>Широкая</th><th>Позиции</th><th>Экзамен</th><th>Предмет</th><th>Группа</th><th>Посадочная</th><th>Содержание и ограничения</th></tr></thead><tbody>TABLE</tbody></table></div></div>
<details class="card"><summary>Методика, ограничения и источники</summary><ul>METHOD</ul><p>DOCS</p><p>Все назначения проверены по HTTP, canonical, robots и sitemap. Файлы доступны локально в проекте; публикация сайта и рекламных кампаний не выполнялась.</p></details></main>
<script>const rows=[...document.querySelectorAll('tbody tr')],q=document.querySelector('#q'),ex=document.querySelector('#exam'),su=document.querySelector('#subject');function filter(){let n=0;for(const r of rows){r.hidden=!(r.textContent.toLocaleLowerCase('ru').includes(q.value.toLocaleLowerCase('ru'))&&(!ex.value||r.dataset.exam===ex.value)&&(!su.value||r.dataset.subject===su.value));if(!r.hidden)n++}document.querySelector('#count').textContent='Показано '+n+' из '+rows.length}for(const el of [q,ex,su])el.addEventListener('input',filter);filter();</script></html>'''
for key, value in {'POSITIVE': len(core), 'PRIORITY': report['counts']['priority_p1'], 'RETENTION': report['counts']['retention'], 'GROUPS': report['counts']['groups'],
                   'QUOTED': len(all_rows), 'ZERO': len(watch), 'TABLE': table, 'METHOD': methodology, 'DOCS': doclinks}.items():
    page = page.replace(key, str(value))
(ROOT / 'report.html').write_text(page)
print(json.dumps({'counts': report['counts'], 'by_exam_subject': report['by_exam_subject'], 'top': report['highlights'][:10]}, ensure_ascii=False, indent=2))
