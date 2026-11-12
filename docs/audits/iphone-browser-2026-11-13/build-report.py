import datetime as dt
import hashlib
import html
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PROJECT = Path('/root/projects/ege-math')
sources = ['baseline.json', 'webkit.json', 'narrow-goals.json']
reports = [json.loads((ROOT / name).read_text()) for name in sources]
cases = [case for report in reports for case in report['cases']]
errors = [error for report in reports for error in report['errors']]
assert len(cases) == 28, len(cases)
assert not errors, errors
assert all(case.get('passed', True) for case in cases)
assert all(case['end']['close']['accessible'] for case in cases)
assert all(case['closeScrollDelta'] == 0 for case in cases)
assert all(case['network']['blockedWrites'] == 0 for case in cases)
assert all(not case['afterNext']['loading'] for case in cases)
for case in reports[2]['cases']:
    assert len([g for g in case['goals'] if g['event'] == 'next_task']) == 1
    assert len([g for g in case['goals'] if g['event'] == 'solution_open' and g['params'].get('placement') == 'dialog']) == 3

base_commit = 'd1948d2eb9091f5e75506761a9150857d59d8520'
source_files = ['server.js', 'public/catalogue.js', 'public/site.js', 'lib/catalogue-styles.js', 'lib/analytics.js']
hashes = {name: hashlib.sha256((PROJECT / name).read_bytes()).hexdigest() for name in source_files}
for name in source_files:
    committed = subprocess.check_output(['git', 'show', base_commit + ':' + name], cwd=PROJECT)
    assert hashlib.sha256(committed).hexdigest() == hashes[name], name
meta = dict(generated_at_utc=dt.datetime.now(dt.timezone.utc).isoformat(), cases=len(cases), errors=0,
            base_commit=base_commit, app_source_matches_base_commit=True, playwright_version='1.56.1',
            chromium_version=reports[0]['chromiumVersion'], webkit_version=reports[1]['webkitVersion'],
            physical_iphone=False, native_yandex_start=False, real_ad_impressions=False,
            source_or_database_changes=False, close_button_accessible_all_cases=True,
            close_document_scroll_delta_all_cases=0, production_write_attempts=0,
            metrics_requests='stubbed; external requests blocked',
            next_task_once_per_forward_action=True,
            goal_note='solution_open supports dialog and inline task_page placements; they are separate reaches, not extra solved tasks',
            source_sha256=hashes)
(ROOT / 'verification.json').write_text(json.dumps(meta, ensure_ascii=False, indent=2) + '\n')

modes = {'empty': 'Нет объявления', 'filled': 'Рекламная заглушка 600 px',
         'delayed': 'Появление заглушки после открытия решения', 'loader-error': 'Ошибка загрузки рекламного SDK',
         'slow-api': 'Задержка решения 1,5 с', 'api-error': 'HTTP 503 и повторная попытка'}
rows = ''
for case in cases:
    rows += '<tr><td>' + html.escape(case['engine']) + '</td><td>' + str(case['viewport']['width']) + '</td><td>' + html.escape(case['route']) + '</td><td>' + modes[case['mode']] + '</td><td>Пройдено</td></tr>'
screens = [(case['engine'], case['mode'], case['viewport']['width'], case.get('screenshot')) for case in cases if case.get('screenshot')]
gallery = ''.join('<figure><a href="' + file + '"><img loading="lazy" src="' + file + '" alt="Кнопка закрытия и конец длинного решения, ' + engine + '" width="300"></a><figcaption>' + engine + ', ' + str(width) + ' px, ' + modes[mode] + '</figcaption></figure>' for engine, mode, width, file in screens)
report = '''<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ege-fipi.ru — проверка мобильных решений 13.11.2026</title><style>body{font:16px/1.55 system-ui,sans-serif;max-width:1080px;margin:36px auto;padding:0 20px;color:#173148;background:#fafcfd}h1{line-height:1.2}h2{margin-top:2em}.lead{padding:18px;background:#e7f0f8;border-radius:10px}.table{overflow:auto}table{border-collapse:collapse;width:100%;background:#fff}td,th{padding:10px;border-bottom:1px solid #dbe4eb;text-align:left;vertical-align:top}thead{background:#e7f0f8}.gallery{display:flex;flex-wrap:wrap;gap:12px}.gallery figure{margin:0;max-width:300px}.gallery img{width:100%;height:auto;border:1px solid #dbe4eb}figcaption{font-size:14px;color:#53677a}code{overflow-wrap:anywhere}li{margin:8px 0}a{color:#1358a1}</style><h1>Проверка мобильных решений ege-fipi.ru</h1><p>13 ноября 2026 по Москве. Продолжение <a href="../../analytics/2026-11-13-iphone/report.html">анализа Метрики iPhone</a>.</p><p class="lead"><strong>В доступных браузерах 28 сценариев прошли без ошибок сайта.</strong> Кнопка закрытия длинного решения доступна, переход к следующему заданию и возврат работают. Подтверждённую проблему для изменения кода воспроизвести не удалось. Настоящий iPhone и нативный «Яндекс Старт» остаются непроверенными.</p><h2>Что проверено</h2><ul><li>WebKit 26.0 с профилем iPhone 13 и Chrome 152 с профилем Android. Это браузеры Linux, не реальные мобильные приложения.</li><li>Ширины 390 и 375 px; высота 844/667 px с уменьшением до 520 px; поворот до 844×390 и обратно.</li><li>Поиск FDA042 через шапку, длинное решение, прокрутка до конца, доступность крестика по координатам и hit-test, закрытие без скачка страницы, повторное открытие из кеша.</li><li>Следующее задание, возврат браузером и повторное открытие решения; /tasks/FDA042, /tasks/6EFCFF и /oge?topic=all.</li><li>Пустое объявление, блок 600 px сразу и после открытия решения, ошибка загрузчика рекламы. Это управляемые заглушки, не настоящие объявления.</li><li>Задержка ответа решения 1,5 секунды и HTTP 503 с последующим успешным повтором.</li></ul><h2>События Метрики</h2><p>На ширине 375 px проверен один next_task на один переход вперёд в обоих движках, с пустой и поздно появляющейся рекламной заглушкой. Три намеренных открытия диалога дают три solution_open с placement=dialog. Страница также поддерживает отдельное чтение встроенного решения с placement=task_page; это штатное достижение, поэтому нельзя считать все reaches числом открытых окон или решённых задач. Аналитика подменена локальной заглушкой: реальных целей от теста нет.</p><h2>Чего эта проверка не доказывает</h2><p>Нет подключённого настоящего iPhone, доступа к BrowserStack или другой ферме устройств. Поиск доступных интеграций BrowserStack результата не дал. Проверка не подтверждает работу нативного «Яндекс Старт», жестов пальцем, динамической панели приложения и настоящего рекламного SDK/креатива. Прокрутка решения программная, кнопки нажимались через tap. Изменение viewport проверяет геометрию при доступном месте, а не поведение реальной адресной строки. Различие профиля устройства и физического устройства соответствует подходу <a href="https://playwright.dev/docs/emulation">эмуляции Playwright</a>.</p><h2>Решение по сайту</h2><p>Код, учебные материалы, SQLite, цели, реклама и настройки счётчика не изменялись. Перезапуска или публикации приложения нет. Без воспроизводимой ошибки оснований для правки или отката сейчас не найдено. Этот результат не объясняет ухудшение Метрики в «Яндекс Старт» и не доказывает отсутствие проблемы на настоящем устройстве.</p><h2>Оставшийся сценарий на настоящем iPhone</h2><ol><li>В приложении «Яндекс Старт» открыть ege-fipi.ru/ege/math, найти FDA042 поиском по ID в шапке.</li><li>Дождаться загрузки страницы и объявления, открыть решение и прокрутить до конца. Проверить крестик, закрыть и снова открыть решение.</li><li>Нажать «Следующее задание», вернуться назад в приложении и снова открыть решение. Повторить с поворотом экрана. Если сбой есть, зафиксировать шаг, модель iPhone, версию iOS и версию приложения.</li></ol><h2>Проверки</h2><p>24 основных сценария (12 на движок) и 4 сценария на 375 px с проверкой целей. Ошибок JavaScript в основных сценариях нет. Изменение document.scrollY при закрытии равно нулю во всех 28 случаях. Попыток записи в production нет; внешние запросы к аналитике и настоящей рекламе перехвачены. Персональные данные пользователей не собирались.</p><details><summary>Все 28 сценариев</summary><div class="table"><table><thead><tr><th>Движок</th><th>Ширина</th><th>Маршрут</th><th>Условие</th><th>Результат</th></tr></thead><tbody>'''
report += rows + '</tbody></table></div></details><h2>Снимки конца длинного решения</h2><div class="gallery">' + gallery + '</div><p><a href="verification.json">Итоговые проверки и хеши кода</a> · <a href="baseline.json">Chrome</a> · <a href="webkit.json">WebKit</a> · <a href="narrow-goals.json">Узкий экран и цели</a></p></html>'
(ROOT / 'report.html').write_text(report + '\n')
print(json.dumps({k: v for k, v in meta.items() if k != 'source_sha256'}, ensure_ascii=False, indent=2))
