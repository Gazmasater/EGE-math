"""Join keyword demand with dated Webmaster evidence; do not infer missing ranks."""
import sys
sys.dont_write_bytecode = True
import csv
import datetime as dt
import html
import json
from collections import Counter
from pathlib import Path
from collect import ROOT, save

def read(name):
    return json.loads((ROOT / name).read_text())

def response(name):
    d = read('raw/' + name + '.json')['response']
    assert not any(k in d for k in ['http_error', 'network_error', 'error_code']), name
    return d

def csv_file(name, rows):
    with (ROOT / name).open('w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0]))
        writer.writeheader(); writer.writerows(rows)

core = read('../wordstat-2026-10-08/keywords.json')
assert len(core) == 316
all_popular = []
for offset in range(0, 3000, 500):
    d = response(f'popular-{offset:04}')
    assert d['date_from'] == '2026-09-28' and d['date_to'] == '2026-10-04'
    all_popular.extend(d['queries'])
assert len(all_popular) == d['count']
popular = {r['query_text']: r for r in all_popular}
assert len(popular) == len(all_popular)

def detail(file, phrase):
    d = response(file)
    rows = d.get('text_indicator_to_statistics', [])
    assert d['count'] == len(rows)
    matches = [r for r in rows if r['text_indicator']['value'] == phrase]
    assert len(matches) <= 1
    if not matches:
        return {'query_present': False, 'observed_url': None, 'dates': [], 'impressions': None, 'clicks': None, 'avg_position': None}
    r = matches[0]; daily = {}
    for stat in r['statistics']:
        assert stat['field'] not in daily.setdefault(stat['date'], {})
        daily[stat['date']][stat['field']] = stat['value']
    values = [v for day, v in daily.items() if '2026-09-27' <= day <= '2026-10-03']
    weighted = [(v['POSITION'], v.get('IMPRESSIONS', 0)) for v in values if 'POSITION' in v]
    weight = sum(n for _, n in weighted)
    return {'query_present': True, 'observed_url': r['popular_complementary_indicator']['value'],
            'dates': sorted(daily), 'impressions': sum(v.get('IMPRESSIONS', 0) for v in values),
            'clicks': sum(v.get('CLICKS', 0) for v in values),
            'avg_position': sum(p*n for p,n in weighted)/weight if weight else None}

joined = []
for index, kw in enumerate(core):
    det = detail(f'exact-{index:03}', kw['phrase'])
    p = popular.get(kw['phrase'], {}).get('indicators', {})
    if kw['priority'] == 'Удержание': action = 'Удержание — пользователь сообщил о топе'
    elif p.get('TOTAL_SHOWS', 0) >= 20: action = 'Разобрать страницу и CTR; позиции исторические'
    elif p.get('AVG_SHOW_POSITION') is not None or det['avg_position'] is not None: action = 'Мало показов; дополнительная проверка'
    else: action = 'Нет позиции в доступном срезе; положение в выдаче неизвестно'
    joined.append({'phrase': kw['phrase'], 'wordstat_quoted': kw['quoted_shows'], 'target_url': kw['target_url'],
                   'original_priority': kw['priority'], 'action': action,
                   'wm_impressions_28sep_04oct_all_regions': p.get('TOTAL_SHOWS'),
                   'wm_clicks_28sep_04oct_all_regions': p.get('TOTAL_CLICKS'),
                   'wm_position_28sep_04oct_all_regions': p.get('AVG_SHOW_POSITION'),
                   'wm_ctr_percent': 100*p.get('TOTAL_CLICKS', 0)/p['TOTAL_SHOWS'] if p.get('TOTAL_SHOWS', 0) else None,
                   'russia_27sep_03oct': det})
save('keyword-positions.json', joined)
flat = []
for r in joined:
    flat.append({'Фраза': r['phrase'], 'Wordstat в кавычках': r['wordstat_quoted'], 'Решение': r['action'],
                 'Показы 28.09–04.10 все регионы': r['wm_impressions_28sep_04oct_all_regions'],
                 'Клики 28.09–04.10 все регионы': r['wm_clicks_28sep_04oct_all_regions'],
                 'Средняя позиция 28.09–04.10 все регионы': r['wm_position_28sep_04oct_all_regions'],
                 'CTR %': r['wm_ctr_percent'], 'Предложенная страница': r['target_url'],
                 'Популярный URL 20.09–03.10 Россия': r['russia_27sep_03oct']['observed_url'],
                 'Показы 27.09–03.10 Россия': r['russia_27sep_03oct']['impressions'],
                 'Средняя позиция 27.09–03.10 Россия': r['russia_27sep_03oct']['avg_position']})
csv_file('keyword-positions.csv', flat)
csv_file('popular-queries.csv', [{'Запрос': r['query_text'], 'Показы': r['indicators'].get('TOTAL_SHOWS'),
                               'Клики': r['indicators'].get('TOTAL_CLICKS'), 'Средняя позиция': r['indicators'].get('AVG_SHOW_POSITION')}
                              for r in all_popular])

extra = read('wordstat-extra.json')
counts = {}
for batch in extra['batches']:
    assert batch['status'] == 'complete' and batch['cleanup_response'].get('data') == 1
    for r in batch['response']['data']:
        counts[r['Phrase']] = next(x['Shows'] for x in r['SearchedWith'] if x['Phrase'] == r['Phrase'])
assert counts['"иррациональные уравнения егэ профиль"'] == 189
extra_phrase = 'иррациональные уравнения егэ профиль'
save('additional-keyword.json', {'phrase': extra_phrase, 'wordstat_quoted': counts['"'+extra_phrase+'"'],
                               'wordstat_broad': counts[extra_phrase], 'query_statistics': popular[extra_phrase],
                               'russia_detail': detail('extra-query-0', extra_phrase),
                               'note': 'Дополнительная фраза из фактической выдачи. Исходное ядро 316 фраз сохранено отдельно.'})

metrika = {'periods': {'before': ['2026-09-24', '2026-09-30'], 'current': ['2026-10-01', '2026-10-07']},
           'timezone': 'Europe/Moscow', 'regions': 'all', 'note': 'Органический поиск без распознанных роботов, HeadlessChrome и traffic_kind=technical.'}
for label in ['before', 'current']:
    r = response('metrika-' + label + '-totals')
    assert r['sampled'] is False
    metrika[label] = {'totals': r['totals'], 'sampled': r['sampled'], 'contains_sensitive_data': r['contains_sensitive_data'], 'data_lag': r['data_lag']}
metrika['visits_change_percent'] = 100*(metrika['current']['totals'][0]/metrika['before']['totals'][0]-1)
landing_rows = []
for name in read('supplement-jobs.json')['groups']:
    a=response('metrika-before-page-'+name);b=response('metrika-current-page-'+name)
    assert not a['sampled'] and not b['sampled']
    landing_rows.append({'Группа URL':name,'Визиты 24–30 сентября':a['totals'][0],'Визиты 1–7 октября':b['totals'][0],
                         'Визиты с открытием решения 1–7 октября':b['totals'][3], 'Примечание':'Точный фильтр в supplement-jobs.json; малые выборки'})
csv_file('landing-traffic.csv',landing_rows)
metrika['landing_groups'] = landing_rows

def evidence(phrase):
    r=popular[phrase]['indicators']
    return {'phrase':phrase,'impressions':r['TOTAL_SHOWS'],'clicks':r['TOTAL_CLICKS'],
            'avg_position':r['AVG_SHOW_POSITION'],'ctr_percent':100*r['TOTAL_CLICKS']/r['TOTAL_SHOWS'],
            'period':['2026-09-28','2026-10-04'],'region':'Все регионы','devices':'ALL'}

backlog = [
    {'order':1,'topic':'Иррациональные уравнения','evidence':evidence(extra_phrase),'wordstat_quoted':189,
     'urls':['https://ege-fipi.ru/?topic=2.2','https://ege-fipi.ru/?topic=basic-equations.roots'],
     'finding':'В выдаче фигурирует старая тема 2.2 с 27 задачами. Новый учебный тип содержит 16 задач; его title и H1 начинаются с отдельного слова «Иррациональные», без «уравнения». Остальные 11 задач старой темы относятся к прикладным задачам с корнями; наборы не равнозначны.',
     'action':'Первый небольшой эксперимент: уточнить название нового типа до «Иррациональные уравнения», сохранить первую часть и 16 задач. Разобрать роль старой темы и переходы между уравнениями и прикладными моделями; не ставить редирект или общий canonical без проверки состава.',
     'draft_title':'Иррациональные уравнения ЕГЭ — задания с решениями',
     'draft_h1':'Иррациональные уравнения — первая часть ЕГЭ по математике',
     'draft_description':'16 заданий первой части профильного ЕГЭ по математике: иррациональные уравнения из банка ФИПИ. Условия, ответы и подробные решения бесплатно.',
     'measurement':'Отдельно отслеживать обе страницы и точный запрос; сравнить показы, CTR и клики после переобхода за сопоставимые полные недели. Проверить переход к решению в Метрике.',
     'confidence':'Есть спрос и показы; данных недостаточно для прогноза прироста. Сокращённый заголовок нового типа не объясняет CTR старого URL: это разные страницы, связь проверяется отдельно.'},
    {'order':2,'topic':'Общий банк профильной математики','evidence':evidence('фипи егэ математика профиль'),'wordstat_quoted':15279,
     'urls':['https://ege-fipi.ru/ege/math','https://ege-fipi.ru/?topic=all'],
     'finding':'По старому срезу популярная страница — каталог первой части topic=all. Обзор /ege/math уже содержит обе части, 1148 решений и ссылки на темы; каталог первой части имеет другой объём. Ссылка на обзор в навигации уже есть.',
     'action':'Проверить выбор страницы поиском после изменений 6–7 октября. Если общий запрос по-прежнему ведёт на первую часть, отдельно испытать метаданные предметного обзора и понятное объяснение обеих частей. Сохранить самостоятельную роль каталога первой части и не перенаправлять его целиком.',
     'draft_title':'Задания ФИПИ ЕГЭ по математике — профиль, ответы и решения',
     'draft_h1':'ЕГЭ по профильной математике — задания ФИПИ с решениями',
     'draft_description':'Открытый банк ФИПИ: 1148 заданий профильного ЕГЭ по математике с подробными решениями. Первая и вторая части, выбор по темам, бесплатно и без регистрации.',
     'measurement':'Цель — клики по общему кластеру и визиты с открытием решения. Низкий CTR может объясняться поиском официального ФИПИ; не выдавать проект за официальный.',
     'confidence':'Наиболее заметный спрос из математического ядра, но период до последней публикации.'},
    {'order':3,'topic':'Планиметрия','evidence':evidence('планиметрия егэ профиль'),
     'wordstat_quoted':next(x['quoted_shows'] for x in core if x['phrase']=='планиметрия егэ профиль'),
     'urls':['https://ege-fipi.ru/?topic=plane','https://ege-fipi.ru/planimetry'],
     'finding':'У первой части 58 задач, у второй — 75. У второй части title и H1 не называют вторую часть явно; общий запрос может иметь оба намерения. В наблюдаемой неделе всего 11 показов точного запроса.',
     'action':'Второй тематический эксперимент после накопления данных: явно обозначить вторую часть в её заголовках и сделать выбор между частями понятным. Существующие разные подборки сохранить.',
     'draft_title':'Планиметрия ЕГЭ — вторая часть, задачи с решениями',
     'draft_h1':'Планиметрия — задания второй части ЕГЭ',
     'draft_description':'75 задач второй части профильного ЕГЭ по планиметрии из банка ФИПИ. Условия, чертежи и подробные решения.',
     'measurement':'Показы и клики по обеим страницам, затем доля визитов с открытием решения; 11 показов недостаточно для вывода о качестве сниппета.',
     'confidence':'Небольшая выборка; ниже первых двух пунктов.'}
]
heads = read('head-priorities.json') if (ROOT/'head-priorities.json').exists() else []
if heads:
    heads[0]['supporting_fipi_evidence'] = backlog[1]['evidence']
    backlog = heads + [backlog[0], backlog[2]]
    for i, item in enumerate(backlog, 1): item['order'] = i
save('action-plan.json',backlog)
csv_file('action-plan.csv',[{'Очередь':r['order'],'Тема':r['topic'],'Запрос':r['evidence']['phrase'],
                           'Показы 28.09–04.10':r['evidence']['impressions'],'Клики':r['evidence']['clicks'],
                           'Средняя позиция':r['evidence']['avg_position'],'Wordstat в кавычках':r['wordstat_quoted'],
                           'Действие':r['action'],'Оговорка':r['confidence']} for r in backlog])

history=response('history')['indicators']
summary={'generated_at':dt.datetime.now(dt.timezone.utc).isoformat(),'site':'https://ege-fipi.ru',
         'counts':{'core_checked':len(core),'popular_queries':len(popular),
                   'exact_queries_present_russia':sum(r['russia_27sep_03oct']['query_present'] for r in joined),
                   'core_matches_in_popular':sum(r['phrase'] in popular for r in joined),
                   'core_with_position_in_either_window':sum(r['wm_position_28sep_04oct_all_regions'] is not None or r['russia_27sep_03oct']['avg_position'] is not None for r in joined)},
         'latest_wm_history_date_with_position':max(x['date'][:10] for x in history['AVG_SHOW_POSITION']),
         'latest_query_analytics_date':max(day for r in joined for day in r['russia_27sep_03oct']['dates']),
         'metrika':metrika,'backlog':backlog,
         'retention':['векторы егэ','банк фипи егэ физика'],
         'limitations':[
             'Это свежая выгрузка исторических показов, а не проверка сегодняшней выдачи. Статистика не включает эффект изменений сайта 6–7 октября.',
             'Популярные запросы: 28 сентября — 4 октября, все регионы и устройства. Точная детализация: Россия, 20 сентября — 3 октября; расчёт недельных показателей 27 сентября — 3 октября. Региональные и временные срезы не смешиваются.',
             'Пустой ответ по фразе и отсутствие позиции не означают, что сайт не ранжируется или находится за пределами топ-100.',
             'В популярной выдаче найдено только точное текстовое совпадение. Перестановки слов и словоформы не переносят позицию на другую фразу.',
             'Средняя позиция — средняя по состоявшимся показам. Среднее России рассчитано с весом показов из округлённых дневных позиций. Популярный URL относится ко всему доступному окну 20.09–03.10 и не доказывает единственную страницу выдачи.',
             'Метрика: полные недели с одинаковыми днями недели, органический поиск всех систем и регионов, без роботов и технических визитов. Детализация URL вернула пустые строки при ненулевых totals и contains_sensitive_data=true; поэтому группы перепроверены отдельными агрегатными фильтрами. Их сумма не используется как итог сайта.',
             'Малые выборки, изменение навигации 6 октября и запуск ОГЭ 7 октября не позволяют приписать изменение трафика конкретным SEO-правкам. Открытие решения оценивается числом целевых визитов, не количеством событий.',
             'Исходное ядро из 316 фраз сохранено. Новая фраза об иррациональных уравнениях приложена отдельно с частотностью Вордстата. Известные пользователю два запроса оставлены на удержание.',
             'План и черновики метаданных подготовлены для рассмотрения; код, страницы, реклама и настройки аналитики не изменялись.'
         ],
         'docs':['https://yandex.ru/dev/webmaster/doc/ru/reference/host-query-analytics','https://yandex.ru/dev/webmaster/doc/ru/reference/host-search-queries-popular'],
         'reproduce':['python3 collect.py','python3 collect_details.py','python3 collect_supplement.py',
                      'python3 ../wordstat-2026-10-08/collect.py wordstat-extra-seeds.json wordstat-extra.json','python3 analyze.py']}
if heads:
    summary['head_query_followup'] = read('head-query-analysis.json')
    summary['reproduce'].extend(['python3 check_head_queries.py', 'python3 ../wordstat-2026-10-08/collect.py head-query-seeds.json head-query-wordstat.json', 'python3 build_head_priorities.py', 'python3 analyze.py'])
save('analysis.json',summary)
e=html.escape
def display(v):
    return '—' if v is None else f'{v:.2f}' if isinstance(v, float) else str(v)
cards=[]
for r in backlog:
    ev=r['evidence']
    cards.append(f'<section><h2>{r["order"]}. {e(r["topic"])}</h2><p><b>{e(ev["phrase"])}</b>: {display(ev["impressions"])} показов, {display(ev["clicks"])} кликов, средняя позиция {display(ev["avg_position"])}. Вордстат в кавычках: {r["wordstat_quoted"]}.</p><p>{e(r["finding"])}</p><p><b>Действие:</b> {e(r["action"])}</p><p><b>Черновик title:</b> {e(r["draft_title"])}</p><p><b>Черновик H1:</b> {e(r["draft_h1"])}</p><p><b>Черновик description:</b> {e(r["draft_description"])}</p><p><b>Проверка результата:</b> {e(r["measurement"])}</p><small>{e(r["confidence"])}</small><p>'+ ' · '.join('<a href="'+e(url)+'">'+e(url.replace('https://ege-fipi.ru',''))+'</a>' for url in r['urls'])+'</p></section>')
tr=''.join('<tr>'+''.join('<td>'+e(display(r.get(k)))+'</td>' for k in ['Фраза','Wordstat в кавычках','Показы 28.09–04.10 все регионы','Клики 28.09–04.10 все регионы','Средняя позиция 28.09–04.10 все регионы','Решение'])+'</tr>' for r in flat)
page='''<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Следующие SEO-задачи ege-fipi.ru</title><style>body{font:16px/1.6 system-ui,sans-serif;margin:24px;background:#f4f6fa;color:#18263a}main{max-width:1200px;margin:auto}section{background:white;border:1px solid #dce3ee;padding:24px;border-radius:12px;margin:20px 0}h1{line-height:1.2}h2{font-size:22px}a{color:#215fc1}small{color:#5a6475}table{border-collapse:collapse;font-size:14px}td,th{padding:10px;text-align:left;border-bottom:1px solid #dce3ee;vertical-align:top}input{padding:10px;font:inherit;width:min(90%,500px)}.scroll{overflow:auto}[hidden]{display:none!important}</style><main><h1>С чего продолжить SEO ege-fipi.ru</h1><p>Срез получен 8 октября 2026 UTC. Сначала — иррациональные уравнения; затем общий банк профильной математики и планиметрия.</p><section><b>Границы данных</b><p>Вебмастер: популярные запросы за 28.09–04.10, все регионы; детализация страниц по России — только до 03.10. Это исторические средние, не сегодняшние позиции. Изменения сайта 6–7 октября ещё не отражены.</p><p>316 фраз проверено, MATCHES найдено в списке из 2200 популярных запросов. Отсутствие данных не означает отсутствие позиций.</p><p>«Векторы ЕГЭ» и «банк ФИПИ ЕГЭ физика» остаются на удержание по уточнению пользователя.</p><p><a href="action-plan.csv">Очередь работ CSV</a> · <a href="keyword-positions.csv">Все 316 фраз и позиции CSV</a> · <a href="landing-traffic.csv">Поисковые входы по группам URL</a> · <a href="analysis.json">Методика и данные JSON</a> · <a href="additional-keyword.json">Дополнительный запрос</a></p></section>CARDS<section><h2>Метрика</h2><p>Органические визиты: 843 за 24–30 сентября → 705 за 1–7 октября (−16,4%). Визиты с открытием решения: 258 → 347. Причинный эффект SEO не установлен: менялись состав входов и навигация сайта; новая структура опубликована в конце сравнительного окна.</p><p>Для решения об изменениях используем агрегаты отдельных страниц; малые выборки не трактуем как доказательство.</p></section><section><h2>Ядро и наблюдаемые позиции</h2><input id="q" placeholder="Найти фразу"><p>Прочерк — нет данных. В таблице: Вордстат — месячная оценка в кавычках; Вебмастер — 28.09–04.10, все регионы.</p><div class="scroll"><table><thead><tr><th>Фраза</th><th>Вордстат</th><th>Показы</th><th>Клики</th><th>Средняя позиция</th><th>Решение</th></tr></thead><tbody>ROWS</tbody></table></div></section><section><h2>Ограничения и воспроизведение</h2><ul>LIMITS</ul><p>DOCS</p></section></main><script>const q=document.querySelector('#q'),rows=[...document.querySelectorAll('tbody tr')];q.addEventListener('input',()=>{for(const r of rows)r.hidden=!r.textContent.toLowerCase().includes(q.value.toLowerCase())});</script></html>'''
if heads:
    page=page.replace('Сначала — иррациональные уравнения; затем общий банк профильной математики и планиметрия.', 'Приоритет после уточнения пользователя: общие запросы без «ФИПИ» — профильная математика и физика. Затем — иррациональные уравнения и планиметрия.')
    page=page.replace('<section><b>Границы данных</b>', '<section><b>Уточнение общих запросов</b><p>«егэ математика профиль» — 53 729; «егэ физика профиль» — 87; «егэ физика» — 24 194. Это месячные оценки Вордстата в кавычках, Россия. По двум фразам пользователя мониторинг не вернул записей в доступном историческом срезе; сегодняшняя выдача отдельно не измерена.</p><p><a href="head-query-analysis.json">Проверка общих запросов</a> · <a href="head-query-user-observation.json">Наблюдение пользователя</a></p><p>Позиция запроса с «ФИПИ» не переносится на запрос без этого слова. <a href="https://fipi.ru/ege/demoversii-specifikacii-kodifikatory">У ФИПИ</a> физика представлена без отдельного профильного уровня; формулировка с «профиль» сохранена как поисковый вариант.</p></section><section><b>Границы данных</b>')
for key,value in {'MATCHES':str(summary['counts']['core_matches_in_popular']),'CARDS':''.join(cards),'ROWS':tr,'LIMITS':''.join('<li>'+e(x)+'</li>' for x in summary['limitations']),'DOCS':' · '.join('<a href="'+e(u)+'">Документация Вебмастера</a>' for u in summary['docs'])}.items():page=page.replace(key,value)
(ROOT/'report.html').write_text(page+'\n')
print(json.dumps({'counts':summary['counts'],'latest':summary['latest_wm_history_date_with_position'],'plan':backlog,'metrika_change':metrika['visits_change_percent']},ensure_ascii=False,indent=2))
