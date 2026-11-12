import json
from concurrent.futures import ThreadPoolExecutor, as_completed
import collect as c

c.JOBS.clear()
catalogues = {
    'math': "ym:s:startURLPath=.('/','/math','/ege/math','/oge','/equations','/inequalities','/stereometry','/planimetry','/parameters','/optimal','/numbers','/finance')",
    'physics': "ym:s:startURLPath=.('/ege/physics','/physics','/physics/part-2','/oge-physics')",
    'informatics': "ym:s:startURLPath=.('/ege-informatics','/oge-informatics')",
}
for period, (d1, d2) in c.PERIODS.items():
    for name, filters in catalogues.items():
        for source, extra in [('all', ''), ('organic', " AND ym:s:lastTrafficSource=='organic'")]:
            c.add(period + '_' + name + '_catalogues_' + source, d1, d2, '(' + c.PUBLIC + ') AND (' + filters + ')' + extra)
    for name, extra in [('yandex', "ym:s:lastSearchEngineRoot=='yandex'"), ('google', "ym:s:lastSearchEngineRoot=='google'"),
                        ('inform_phrase', "ym:s:lastSearchPhrase=@'информ'")]:
        c.add(period + '_' + name, d1, d2, '(' + c.PUBLIC + ') AND ' + c.INFO + " AND ym:s:lastTrafficSource=='organic' AND (" + extra + ')')
with ThreadPoolExecutor(max_workers=4) as pool:
    for future in as_completed([pool.submit(c.collect, j) for j in c.JOBS]):
        name, result = future.result()
        print(name, result.get('totals', result), flush=True)
