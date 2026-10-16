"""Check the exact non-FIPI queries called out by the user, without inferring SERP absence."""
import sys
sys.dont_write_bytecode = True
import concurrent.futures
from collect import api, host_path, save

phrases = ['егэ математика профиль', 'егэ физика профиль', 'егэ физика']
base = host_path()
jobs = [(f'head-query-{i}', 'wm', base + '/query-analytics/list', None,
         {'limit': 500, 'text_indicator': 'QUERY', 'region_ids': [225], 'device_type_indicator': 'ALL',
          'search_location': 'WEB_LOCATION', 'filters': {'text_filters': [
              {'text_indicator': 'QUERY', 'operation': 'TEXT_MATCH', 'value': phrase}]}})
        for i, phrase in enumerate(phrases)]
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    for phrase, result in zip(phrases, pool.map(lambda j: api(*j), jobs)):
        assert not result.get('http_error') and not result.get('network_error')
        rows = result.get('text_indicator_to_statistics', [])
        print(phrase, 'count', result.get('count'), 'exact_rows',
              len([r for r in rows if r['text_indicator']['value'] == phrase]), flush=True)
save('head-query-user-observation.json', {
    'reported_at': '2026-10-08', 'source': 'Сообщение пользователя в этой задаче',
    'phrases': phrases[:2], 'observation': 'Пользователь не находит сайт по этим точным запросам в поиске',
    'search_engine': None, 'region': None, 'checked_depth': None,
    'note': 'Не означает техническое отсутствие страниц в индексе. Независимый текущий замер выдачи не выполнен. Запросы без ФИПИ анализируются отдельно от фраз с ФИПИ.'
})
