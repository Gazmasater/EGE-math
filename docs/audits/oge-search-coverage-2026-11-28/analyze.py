"""Reproduce the audit from retained public-content snapshots; no network/writes to the site."""
import argparse
from collections import Counter,defaultdict,deque
import datetime as dt
import hashlib
import html
import json
from pathlib import Path
import re
import urllib.parse as up

cli=argparse.ArgumentParser();cli.add_argument('--input-dir',type=Path,default=Path(__file__).resolve().parent);cli.add_argument('--output-dir',type=Path)
args=cli.parse_args();ROOT=args.input_dir;OUT=args.output_dir or ROOT;OUT.mkdir(exist_ok=True,parents=True)
def read(name):return json.loads((ROOT/name).read_text())
def save(name,obj):(OUT/name).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
local=read('local.json');http=read('http.json');snapshot=read('search-snapshot.json');logs=read('logs.json');pair_reviews=read('pair-review-structure.json')
tasks=local['tasks'];byid={t['id']:t for t in tasks};taskids=set(byid);pages={p['path']:p for p in http};entries=snapshot['entries'];events=snapshot['events']
present={up.urlsplit(e['url']).path.removeprefix('/tasks/') for e in entries if up.urlsplit(e['url']).path.startswith('/tasks/')}
bot200={e['taskId'] for e in logs['byTask'] if e['status']==200}
cohort=[t for t in tasks if 'Одно из чисел' in t['condition'] and 'прямой' in t['condition']]
fractions=[t for t in cohort if '÷' in t['condition']]
family=[t for t in fractions if re.search(r'Одно из чисел \(\d+\) ÷',t['condition'])]
checks=[]
def check(name,ok):checks.append(dict(name=name,ok=bool(ok)))
check('unique_current_oge_ids',len(tasks)==len(taskids)==3884)
check('every_current_oge_task_published',all(t['published'] and t['solution'] for t in tasks))
check('all_2931_oge_condition_image_references_hashed',sum(len(t['images']) for t in tasks)==2931 and all(i['sha256'] for t in tasks for i in t['images']))
check('original_family_12_expanded_37_fraction_27',len(family)==12 and len(fractions)==27 and len(cohort)==37)
for page in http:
 check('http_200_'+page['path'],page.get('status')==200 and not page.get('error'))
 check('metadata_'+page['path'],page.get('canonical')==['https://ege-fipi.ru'+page['path']] and page.get('robots')==['index,follow'] and len(page.get('h1',[]))==1 and not page.get('xRobots'))
 if page['path'].startswith('/tasks/'):
  taskid=page['path'].split('/')[-1]
  check('server_solution_'+taskid,taskid in page['solutionIds'])

# Follow only actual anchors captured from server HTML, excluding fragments and search.
graph={}
for path,p in pages.items():
 graph[path]={up.urldefrag(a['href'])[0] for a in p['links'] if a['href'].startswith('/') and 'nofollow' not in a['rel'].split()}
paths={'/oge':['/oge']};queue=deque(['/oge'])
while queue:
 start=queue.popleft()
 for target in sorted(graph.get(start,[])):
  if target not in paths:paths[target]=paths[start]+[target];queue.append(target)
f1path=paths.get('/tasks/F1F841');check('F1F841_two_actual_anchor_clicks',f1path and len(f1path)==3)
leafpages=[p for p in http if re.fullmatch(r'/oge\?topic=1\.2(?:&page=\d+)?',p['path'])]
leaf_ids=[i for p in leafpages for i in p['conditionIds']]
expected_leaf={t['id'] for t in tasks if '1.2' in t['codes']}
check('complete_11_pages_122_ids_topic_1_2',len(leafpages)==11 and len(leaf_ids)==len(set(leaf_ids))==len(expected_leaf)==122 and set(leaf_ids)==expected_leaf)
check('every_topic_1_2_page_reachable_in_captured_graph',all(p['path'] in paths for p in leafpages))
check('every_topic_1_2_card_has_native_task_link',all('/tasks/'+i in graph[p['path']] for p in leafpages for i in p['conditionIds']))

latest={}
for event in sorted(events,key=lambda e:e['event_date']):
 taskid=up.urlsplit(event['url']).path.removeprefix('/tasks/')
 if taskid in byid:latest[taskid]=event
removed={i:e for i,e in latest.items() if e['event']=='REMOVED_FROM_SEARCH'}
def parse_date(s):return dt.datetime.fromisoformat(s.replace('Z','+00:00'))
removed_details=[dict(taskId=i,eventDate=e['event_date'],lastAccess=e['last_access'],reason=e.get('excluded_url_status'),publishedAt=byid[i]['createdAt'],accessAfterPublished=parse_date(e['last_access'])>parse_date(byid[i]['createdAt']),recentVerifiedBot200=i in bot200) for i,e in sorted(removed.items())]
check('57_latest_available_oge_exclusions_all_low_quality_after_publication',len(removed_details)==57 and all(x['reason']=='LOW_QUALITY' and x['accessAfterPublished'] for x in removed_details))
check('no_exclusion_reason_attributed_to_F1F841','F1F841' not in latest)

wm={p.stem:json.loads(p.read_text()) for p in (ROOT/'raw-webmaster').glob('*.json')}
for n,r in wm.items():check('fresh_webmaster_'+n,r['status']==200)
check('37_expanded_cohort_URL_reports_present_and_empty',all(wm.get('url_'+t['id'],{}).get('data',{}).get('count')==0 for t in cohort))
check('F2CF43_positive_comparison_report',wm['url_F2CF43']['data']['count']==1)
f2stats=wm['url_F2CF43']['data']['text_indicator_to_statistics'][0]['statistics']
f2metrics={field:sum(s['value'] for s in f2stats if s['field']==field) for field in ['IMPRESSIONS','CLICKS']}
check('F2CF43_two_recorded_impressions_no_clicks',f2metrics==dict(IMPRESSIONS=2,CLICKS=0))
fresh_boundaries={}
old=Path(snapshot['source'])
for n in ['insearch_00000','events_00000']:
 current=wm[n];previous=json.loads((old/(n+'.json')).read_text())
 fresh_boundaries[n]=dict(checkedUtc=current['checked_utc'],sameDataAsEarlierSnapshot=current['data']==previous['data'],count=current['data']['count'])
check('refreshed_boundaries_unchanged',all(x['sameDataAsEarlierSnapshot'] for x in fresh_boundaries.values()))

def groups(key):
 d=defaultdict(list)
 for t in tasks:
  if t[key]:d[t[key]].append(t['id'])
 return [v for v in d.values() if len(v)>1]
textgroups=groups('textHash');visualgroups=groups('visualHash');solutiongroups=groups('solutionHash')
check('53_text_match_groups_464_members',len(textgroups)==53 and sum(map(len,textgroups))==464)
check('only_two_visual_match_pairs',len(visualgroups)==2 and all(len(g)==2 for g in visualgroups))
for p in pair_reviews:
 check('equivalent_MathML_image_structure_and_solution_'+'_'.join(p['ids']),p['equivalentConditionStructure'] and len({byid[i]['solutionHash'] for i in p['ids']})==1)
check('F1F841_not_in_text_visual_or_exact_solution_duplicates',all('F1F841' not in g for g in textgroups+visualgroups+solutiongroups))
duplicates=dict(textGroups=len(textgroups),textMembers=sum(map(len,textgroups)),conditionAndImageGroups=len(visualgroups),conditionAndImageMembers=sum(map(len,visualgroups)),exactSolutionGroups=len(solutiongroups),exactSolutionMembers=sum(map(len,solutiongroups)),pairs=pair_reviews,
 warning='Matching plain text is not proof of duplicate mathematical tasks: figures and MathML must be compared. The two pairs do not explain the broad coverage gap.')
bankrows=[]
for bank,ids in local['banks'].items():
 s=set(ids);crawled=s&bot200;seen=s&present
 bankrows.append(dict(bank=bank,currentTasks=len(s),presentInAvailableSamples=len(seen),recentBot200UniqueTasks=len(crawled),recentCrawledAbsentFromAvailableSamples=len(crawled-present)))
f1=byid['F1F841'];fp=pages['/tasks/F1F841']
familyrows=[dict(taskId=t['id'],publishedAt=t['createdAt'],conditionHash=t['textHash'],imageHashes=[i['sha256'] for i in t['images']],inAvailableSamples=t['id'] in present,recentBot200=t['id'] in bot200,lastAvailableEvent=latest.get(t['id']),shortestCapturedPath=paths.get('/tasks/'+t['id'])) for t in family]

analysis=dict(generatedUtc=dt.datetime.now(dt.timezone.utc).isoformat(),scope='Read-only continuation: OGE task discoverability, actual bot delivery, published-solution exclusions and duplicate evidence.',banks=bankrows,
 oge=dict(tasks=len(tasks),published=sum(t['published'] for t in tasks),presentInAvailableSamples=len(taskids&present),recentBot200UniqueTasks=len(taskids&bot200),recentBot200Requests=sum(e['requests'] for e in logs['byBank'] if e['bank']=='oge' and e['status']==200),recentCrawledAbsentFromAvailableSamples=len((taskids&bot200)-present),latestAvailableExcluded=len(removed),exclusionsAfterPublished=sum(e['accessAfterPublished'] for e in removed_details),excludedWithRecentVerifiedBot200=sum(e['recentVerifiedBot200'] for e in removed_details)),
 cohorts=dict(originalImproperFractionFamily=familyrows,expandedNumberLineTasks=len(cohort),fractionTasks=len(fractions),sqrtTasks=len(cohort)-len(fractions),expandedCohortApiRows=0,queryWindow=['2026-11-09','2026-11-22'],comparisonF2CF43=f2metrics),
 F1F841=dict(path=f1path,existingTitle=fp['title'],existingH1=fp['h1'],existingDescription=fp['description'],sameGenericTopicHeadingExistsOnSearchSampleControl=fp['title'].replace('F1F841','{id}')==pages['/tasks/F2CF43']['title'].replace('F2CF43','{id}'),duplicate=False,
 draftTitle='F1F841 — Какая дробь отмечена на числовой прямой? Ответ и решение | ОГЭ',draftOnly=True),
 http=dict(pages=len(http),taskPages=sum(p['path'].startswith('/tasks/') for p in http),completeTopic12Pages=len(leafpages),completeTopic12Tasks=len(leaf_ids),all200=all(p.get('status')==200 for p in http)),duplicates=duplicates,latestAvailableExclusions=removed_details,freshWebmasterReports=len(wm),freshBoundaries=fresh_boundaries,
 evidence=dict(snapshotSource=snapshot['source'],searchRows=len(entries),uniqueSearchUrls=len({e['url'] for e in entries}),eventRows=len(events),logStart=logs['firstLogRequest'],logEnd=logs['lastLogRequest'],httpSnapshots='html/',localExport='local.json'),
 limitations=['Список поиска и журнал содержат разнородные даты и не отражают синхронное текущее состояние индекса. 11 из 3884 — охват доступной выгрузки, а не измеренная текущая доля индексации.','Заново получены только первые страницы и счётчики списков поиска/событий; совпадение ответов не доказывает актуальность каждой старой строки.','37 свежих адресных аналитических отчётов заканчиваются 22 ноября; отсутствие строк не устанавливает текущую причину исключения.','Обход подтверждён только сохранёнными логами 25–27 ноября: в них нет Host, проверка прямого и обратного DNS выполнена сейчас. Ответ 200 не устанавливает включение в поиск или его дату.','188 HTTP-проверок подтверждают текущие ответы сервера, но не раскрывают HTML-копию в индексе. Все 3884 решения проверены локально, а не 3884 запросами к сайту.','Общие названия тем есть и у страниц из доступного списка поиска. Их роль в исключении остаётся гипотезой; уточнение заголовков не гарантирует включение.','Для F1F841 нет адресного события исключения. Причины 57 других задач нельзя переносить на неё. Причинная связь старых исключений с недавним спадом входов в каталоги не установлена.'],
 priorities=[dict(priority=1,action='Получить текущий адресный статус и версию в индексе для F1F841, 7C7947, 8D164C, DC38F4 и контроля F2CF43 в Вебмастере; сохранить время и точную причину.',reason='Доступные индексные списки и отчёты запросов отстают от фактических недавних обращений робота.'),
 dict(priority=2,action='Подготовить ограниченное сравнение сопоставимых групп с конкретными title/H1 для 12 задач о неправильной дроби на числовой прямой, сохраняя условия, решения и URL.',reason='Сейчас метаданные описывают широкую тему дробей, а вопрос требует определить дробь по точке на прямой. Это проверяемая гипотеза, а не установленная причина.'),
 dict(priority=3,action='Отдельно рассмотреть две пары с одинаковыми условиями, рисунками и решениями перед выбором основного адреса.',reason='Учебное содержимое совпадает у 83E501/77BC78 и 1506BA/6F5EF4. Речь только о четырёх страницах.'),
 dict(priority=4,action='Перед будущей публикацией записать исходный срез и дату подтверждённого обхода; затем сравнивать одинаковые окна запросов и неизменный набор URL.',reason='Различать получение страницы, включение, показы и клики; одновременная правка всех страниц лишит сравнение проверяемого контроля.')],
 sources=[dict(url='https://yandex.ru/support/webmaster/ru/site-indexing/low-demand',use='LOW_QUALITY or low demand is a per-page automatic selection decision; accessible content does not ensure inclusion.'),dict(url='https://yandex.ru/support/webmaster/ru/robot-workings/canonical',use='Canonical is a recommendation for equivalent pages, not a general remedy for distinct task variants.')])
save('analysis.json',analysis)
verification=dict(passed=sum(c['ok'] for c in checks),failed=[c for c in checks if not c['ok']],checks=checks);save('verification.json',verification)
# Compact evidence is safe to keep in Git; raw HTML and all-content exports stay outside.
save('http-summary.json',[{k:p[k] for k in ['path','status','title','h1','canonical','robots','solutionIds','conditionIds']} for p in http])
save('source-manifest.json',[dict(file=name,sha256=hashlib.sha256((ROOT/name).read_bytes()).hexdigest(),bytes=(ROOT/name).stat().st_size) for name in ['local.json','http.json','search-snapshot.json','logs.json','pair-review-structure.json']])
E=html.escape
rows=''.join(f'<tr><td>{E(b["bank"])}</td><td>{b["currentTasks"]}</td><td>{b["presentInAvailableSamples"]}</td><td>{b["recentBot200UniqueTasks"]}</td></tr>' for b in bankrows)
fam=''.join(f'<tr><td><a href="https://ege-fipi.ru/tasks/{t["taskId"]}">{t["taskId"]}</a></td><td>{E((t["lastAvailableEvent"] or {}).get("excluded_url_status") or "нет причины в журнале")}</td><td>{"да" if t["recentBot200"] else "не найден в этих логах"}</td></tr>' for t in familyrows)
body='''<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ЕГЭ ФИПИ: охват решений ОГЭ и проверка причин</title><style>body{font:16px/1.65 system-ui;color:#183047;max-width:1120px;margin:32px auto;padding:0 20px}h1{font-size:29px;line-height:1.25}h2{font-size:22px;margin-top:32px}table{border-collapse:collapse;width:100%;font-size:14px}td,th{padding:9px;border-bottom:1px solid #dce4ed;text-align:left;vertical-align:top}a{color:#145b9d}code{overflow-wrap:anywhere}.lead{background:#eaf0fc;border-radius:10px;padding:18px}.scroll{overflow-x:auto}.note{background:#f4f6f9;padding:14px;border-radius:8px}li{margin:8px 0}</style><h1>ЕГЭ ФИПИ: робот обходит решения, но поисковый охват ОГЭ остаётся проблемой</h1><p>28 ноября 2026, московская дата. Анализ без изменений сайта.</p><p class="lead"><b>Широкий пробел нельзя объяснить отсутствием решений или общим запретом обхода.</b> Все 3884 задачи ОГЭ-математики имеют опубликованные решения. За доступные 25–27 ноября подтверждённый YandexBot получил 200 для 924 разных задач (1035 запросов). В сохранённом списке поиска нашли только 11 отдельных страниц. Это разрыв между наблюдениями, а не точная текущая доля индексации.</p><h2>Что подтверждено</h2><ul><li>Для 57 задач последнее доступное событие — REMOVED_FROM_SEARCH / LOW_QUALITY. В каждом случае указанный обход был после публикации решения. 19 из них повторно получили 200 от подтверждённого робота уже 25–27 ноября. Повторный обход не доказывает возврат в поиск.</li><li>Для F1F841 причина исключения по-прежнему не получена. Задача открывается за два обычных перехода из /oge, в том числе через тему 1.2. Она первая в теме 1.2 и одиннадцатая на первой странице всех заданий; решение есть в HTML.</li><li>Проверены 188 публичных страниц, включая 48 отдельных задач. Везде 200, один H1, canonical на себя, index,follow. Все 11 страниц темы 1.2 содержат ровно 122 разных задания и обычные ссылки на отдельные страницы; каждая страница достижима по полученным ссылкам.</li><li>У всех 37 задач расширенной группы «число на прямой» свежие URL-отчёты не содержат строк; доступное окно 9–22 ноября. В группе 27 задач с дробями и 10 с корнями; исходная узкая группа с неправильными дробями — 12. Контроль F2CF43 возвращает одну строку: два показа и ноль кликов за окно.</li></ul><h2>Сравнение предметов</h2><div class="scroll"><table><tr><th>Банк</th><th>Задач сейчас</th><th>Отдельных задач в доступном списке поиска</th><th>Разных задач с реальным YandexBot 200 за 25–27.11</th></tr>'''+rows+'''</table></div><p class="note">Столбцы относятся к разным источникам и датам. Список поиска содержит старые и повторные строки; нельзя вычитать его из текущего банка и объявлять разность числом исключённых страниц. Сводки и полные списки уже получены в предыдущей проверке; сейчас заново проверены первые страницы/счётчики и 38 точечных URL-отчётов.</p><h2>Похожие задачи и настоящие дубли</h2><p>Сравнение только текста даёт 53 группы, 464 задания. После учёта SHA-256 всех 2931 ссылок на рисунки остаются две пары: <b>83E501 / 77BC78</b> и <b>1506BA / 6F5EF4</b>. У обеих совпадают структура исходного условия с MathML, байты рисунков, ответ и полный набор полей решения. Технические идентификаторы и формы ФИПИ исключены из сравнения структуры. Эти четыре страницы — отдельные кандидаты для последующего ручного решения о canonical; они не объясняют весь пробел.</p><p>У F1F841 точных дублей по тексту, условию с рисунком или полному решению не обнаружено. Массово объединять страницы с одинаковым коротким текстом опасно: разные рисунки и формулы могут задавать разные математические задачи.</p><h2>Что остаётся гипотезой</h2><p>F1F841 названа широкой темой «Обыкновенные и десятичные дроби, проценты, бесконечные периодические дроби»; конкретный навык — выбор дроби по точке на числовой прямой. Более точный заголовок можно проверить на ограниченной группе. Но контроль F2CF43 с тем же общим названием темы присутствует в сохранённом списке, поэтому одно название не объясняет исключение.</p><p>Черновик для проверки, пока не опубликованный: <code>'''+E(analysis['F1F841']['draftTitle'])+'''</code>.</p><p><a href="https://yandex.ru/support/webmaster/ru/site-indexing/low-demand">Документация Яндекса</a> описывает малоценность/маловостребованность как автоматическое решение для конкретной страницы с несколькими возможными причинами. Этот статус сам по себе не устанавливает ограничение всего сайта. <a href="https://yandex.ru/support/webmaster/ru/robot-workings/canonical">Canonical</a> предназначен для эквивалентных страниц; он не служит универсальным исправлением для разных вариантов заданий.</p><h2>12 задач исходной группы</h2><div class="scroll"><table><tr><th>Задание</th><th>Последняя доступная причина</th><th>Подтверждённый робот 200 в сохранённых логах 25–27.11</th></tr>'''+fam+'''</table></div><h2>Следующие действия по приоритету</h2><ol>'''
body+=''.join('<li>'+E(p['action'])+'<br><small>'+E(p['reason'])+'</small></li>' for p in analysis['priorities'])
body+='''</ol><p>Конкретный следующий шаг — получить текущий адресный статус F1F841 и нескольких контрольных задач, затем проверить ограниченную правку описания навыка. Сайт, условия, решения, SQLite, canonical, реклама, настройки Метрики и очередь переобхода этой проверкой не менялись.</p><h2>Ограничения и воспроизводимость</h2><ul>'''
body+=''.join('<li>'+E(s)+'</li>' for s in analysis['limitations'])
body+=f'''</ul><p>Контрольные сверки: {verification['passed']} успешных; ошибок: {len(verification['failed'])}. <a href="analysis.json">Расчёты и события по 57 задачам</a>, <a href="verification.json">контрольные сверки</a>, <a href="http-summary.json">HTTP-результаты</a>, <a href="source-manifest.json">хеши исходных снимков</a>. Полные публичные HTML, локальная выгрузка учебных материалов и обезличенные ответы хранятся отдельно в /root/ege-oge-coverage-20261128/. Сохранённая копия кода и документации не заменяет резервную копию рабочих данных.</p></html>'''
(OUT/'report.html').write_text(body)
print(json.dumps(dict(passed=verification['passed'],failed=verification['failed'],oge=analysis['oge'],http=analysis['http'],family=len(family)),ensure_ascii=False,indent=2))
assert not verification['failed']
