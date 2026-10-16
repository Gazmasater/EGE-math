"""Persist user-prioritized head terms separately from FIPI-modified phrases."""
import sys
sys.dont_write_bytecode = True
import json
from collect import ROOT, save

wordstat = json.loads((ROOT/'head-query-wordstat.json').read_text())
counts = {}
for b in wordstat['batches']:
    assert b['status']=='complete' and b['cleanup_response'].get('data')==1
    for r in b['response']['data']:
        counts[r['Phrase']] = next(x['Shows'] for x in r['SearchedWith'] if x['Phrase']==r['Phrase'])
popular = {}
for f in (ROOT/'raw').glob('popular-*.json'):
    for r in json.loads(f.read_text())['response']['queries']:popular[r['query_text']]=r['indicators']
phrases = ['егэ математика профиль','егэ физика профиль','егэ физика']
checked=[]
for i,phrase in enumerate(phrases):
    d=json.loads((ROOT/'raw'/f'head-query-{i}.json').read_text())
    assert not d['response'].get('http_error')
    rows=[r for r in d['response'].get('text_indicator_to_statistics',[]) if r['text_indicator']['value']==phrase]
    assert len(rows)<=1
    checked.append({'phrase':phrase,'wordstat_quoted':counts['"'+phrase+'"'],'wordstat_broad':counts[phrase],
                    'wm_exact_query_present':bool(rows),'wm_response_file':f'raw/head-query-{i}.json',
                    'wm_popular_statistics':popular.get(phrase),'user_reported_not_found':i<2,
                    'current_position':None,'note':'Отсутствие записи в историческом отчёте не доказывает отсутствие в текущей выдаче или индексе.'})
save('head-query-analysis.json',{'queries':checked,'region_wordstat':225,'wm_monitoring_region':225,
     'wm_latest_available_date':'2026-10-03','user_observation':'head-query-user-observation.json',
     'decision':'Общие предметные запросы без ФИПИ — основной приоритет. Запросы с ФИПИ — отдельный подкластер, их позиции не переносятся на общие фразы.',
     'physics_naming_source':'https://fipi.ru/ege/demoversii-specifikacii-kodifikatory',
     'physics_note':'У ЕГЭ по физике нет отдельного профильного экзамена. Слово «профиль» учитывается как поисковая формулировка пользователя; основной предметный запрос — ЕГЭ по физике.'})
def evidence(phrase):
    r=popular.get(phrase,{})
    return {'phrase':phrase,'impressions':r.get('TOTAL_SHOWS'),'clicks':r.get('TOTAL_CLICKS'),
            'avg_position':r.get('AVG_SHOW_POSITION'),'ctr_percent':100*r.get('TOTAL_CLICKS',0)/r['TOTAL_SHOWS'] if r.get('TOTAL_SHOWS') else None,
            'period':['2026-09-28','2026-10-04'],'region':'Все регионы','devices':'ALL'}
heads=[
 {'order':1,'topic':'ЕГЭ по математике, профиль — общий поиск','evidence':evidence(phrases[0]),'wordstat_quoted':counts['"'+phrases[0]+'"'],
  'urls':['https://ege-fipi.ru/ege/math','https://ege-fipi.ru/?topic=all'],
  'finding':'Пользователь не находит сайт по «егэ математика профиль». Вебмастер не вернул точную фразу в доступном историческом мониторинге. Прежняя позиция 7,11 относится к другой фразе — «фипи егэ математика профиль». Обзор /ege/math уже содержит обе части и 1148 решений.',
  'action':'Приоритет №1 — предметный обзор /ege/math для общего профильного ЕГЭ. Вынести предмет и уровень в начало title и H1, ясно описать обе части и путь к заданиям. Сначала проверить актуальную выдачу, индексирование и выбранный URL по точной фразе; затем измерять общий кластер отдельно от ФИПИ. Использовать тематические подборки как связанные разделы обзора.',
  'draft_title':'ЕГЭ по математике, профиль — задания с ответами и решениями',
  'draft_h1':'ЕГЭ по математике: профильный уровень',
  'draft_description':'Подготовка к профильному ЕГЭ по математике: 1148 заданий ФИПИ с подробными решениями. Первая и вторая части, выбор по темам, бесплатно и без регистрации.',
  'measurement':'Отдельная группа общих запросов без ФИПИ: показы, клики и средняя позиция; входы на /ege/math и визиты с открытием решения. Зафиксировать поисковик, регион и глубину при текущем замере. Частотность не является прогнозом трафика.',
  'confidence':'Высокий спрос подтверждён. Текущая позиция и причина отсутствия в пользовательской выдаче ещё не установлены; изменение заголовков само по себе не гарантирует топ.'},
 {'order':2,'topic':'ЕГЭ по физике — общий поиск','evidence':evidence(phrases[2]),'wordstat_quoted':counts['"'+phrases[2]+'"'],
  'urls':['https://ege-fipi.ru/ege/physics','https://ege-fipi.ru/physics'],
  'finding':'Пользователь не находит сайт по «егэ физика профиль»: Вордстат в кавычках 87, записи в мониторинге нет. У общего «егэ физика» частотность 24194, в мониторинге за 27.09–03.10 — только два показа и ноль кликов. /ege/physics уже содержит обе части и 2344 решения. В ФИПИ отдельного профильного уровня ЕГЭ по физике нет.',
  'action':'Продвигать существующий предметный обзор /ege/physics под общий ЕГЭ по физике и задачи с решениями. Фразу со словом «профиль» сохранить как второстепенный поисковый вариант; отдельный фиктивный раздел «профильная физика» не создавать. Разделить мониторинг общего предмета и уже успешных запросов банка ФИПИ.',
  'draft_title':'ЕГЭ по физике — задания с ответами и подробными решениями',
  'draft_h1':'ЕГЭ по физике: задания и решения',
  'draft_description':'Подготовка к ЕГЭ по физике: 2344 задания ФИПИ с подробными решениями, схемами и пояснениями. Первая и вторая части, выбор по темам.',
  'measurement':'Отдельно отслеживать «егэ физика», «егэ физика профиль» и запросы с ФИПИ. Проверять предметный обзор и каталог первой части как разные страницы, учитывать открытия решений.',
  'confidence':'Спрос по общему запросу подтверждён; исторических показов мало. Пользовательское отсутствие в поиске сохранено как наблюдение, не как доказательство деиндексации.'}
]
save('head-priorities.json',heads)
print(json.dumps({'queries':checked,'new_priority':['Математика: общий профильный ЕГЭ','Физика: общий ЕГЭ','Иррациональные уравнения','Планиметрия']},ensure_ascii=False,indent=2))
