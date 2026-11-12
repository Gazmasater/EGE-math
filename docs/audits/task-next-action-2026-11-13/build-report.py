import datetime as dt
import hashlib
import html
import json
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent
PROJECT = Path('/root/projects/ege-math')
def read(name): return json.loads((ROOT / name).read_text())
chrome_preview = read('analytics-preview-final-2/report.json')
chrome_public = read('analytics-public/report.json')
webkit_preview = read('webkit-preview-release/report.json')
webkit_public = read('webkit-public/report.json')
oge = read('oge-preview/report.json')
deployment = read('deployment.json')
for report in [chrome_preview, chrome_public, webkit_preview, webkit_public, oge]:
    assert not report['errors']
assert len(chrome_preview['pages']) == len(chrome_public['pages']) == 24
assert len(webkit_preview['cases']) == len(webkit_public['cases']) == 13
assert deployment['status'] == 'published' and not deployment['rolled_back']
assert '# pass 14' in (ROOT / 'unit-tests-final.txt').read_text()
assert '# fail 0' in (ROOT / 'unit-tests-final.txt').read_text()
files = ['server.js', 'lib/catalogue-styles.js', 'lib/analytics.js', 'public/catalogue.js', 'public/site.css']
summary = dict(generated_at_moscow=dt.datetime.now(ZoneInfo('Europe/Moscow')).isoformat(),
               deployed_at_utc=deployment['service']['ExecMainStartTimestamp'],
               unit_tests=14, chrome_preview_pages=24, chrome_public_pages=24,
               webkit_preview_cases=13, webkit_public_cases=13, oge_checks=len(oge['interactions']), errors=0,
               unchanged_solution_hashes=len(deployment['solutions']), retained_old_assets=len(deployment['retained_assets']),
               goal='next_task', goal_id=663176354, parameter='navigation_area',
               values=['top', 'after_solution', 'dialog'], old_placement_preserved=True,
               first_full_day_moscow='2026-11-14', physical_iphone=False, real_ad_impressions=False,
               source_sha256={name: hashlib.sha256((PROJECT / name).read_bytes()).hexdigest() for name in files})
(ROOT / 'verification.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n')

rows = ''
for case in webkit_public['cases']:
    label = case.get('area') or case.get('route') or 'Без JavaScript'
    goal = case.get('goal', {}).get('params', {})
    rows += '<tr><td>' + str(case.get('width', '390' if case.get('route') else '375')) + '</td><td>' + html.escape(label) + '</td><td>' + html.escape(goal.get('placement', '—')) + '</td><td>' + html.escape(goal.get('navigation_area', '—')) + '</td><td>Пройдено</td></tr>'
report = '''<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ege-fipi.ru — кнопка следующего задания, 13.11.2026</title><style>body{font:16px/1.55 system-ui,sans-serif;max-width:1020px;margin:36px auto;padding:0 20px;background:#fafcfd;color:#173148}h1{line-height:1.2}h2{margin-top:2em}.lead{padding:18px;background:#e7f0f8;border-radius:10px}table{border-collapse:collapse;width:100%;background:#fff}td,th{padding:10px;border-bottom:1px solid #dbe4eb;text-align:left}.table{overflow:auto}.gallery{display:flex;gap:20px;flex-wrap:wrap}figure{margin:0;max-width:390px}img{width:100%;height:auto;border:1px solid #dbe4eb}code{overflow-wrap:anywhere}a{color:#1358a1}li{margin:8px 0}</style><h1>Заметная кнопка «Следующее задание»</h1><p class="lead"><strong>Опубликовано 13 ноября в 01:41 МСК.</strong> Кнопка после готового решения и в окне решения стала контрастной, высотой не менее 48 px, на телефоне занимает всю ширину. Под встроенным решением она стоит первой в блоке навигации. Верхняя навигация сохраняет компактный вид.</p><h2>Зачем меняли</h2><p>В обновлённом срезе за 8–12 ноября на iPhone было 84 визита с входом на отдельные задания; next_task зарегистрирован в одном визите. Это основание проверить заметность продолжения занятий, а не доказательство ошибки кнопки. Ссылки и порядок заданий сохранены. Улучшение конверсии пока не установлено.</p><h2>Как учитываются переходы</h2><p>Сохранены цель next_task (663176354), прежние значения placement и правило «одно действие — одно событие». Добавлен параметр navigation_area:</p><table><thead><tr><th>Значение</th><th>Место</th></tr></thead><tbody><tr><td>top</td><td>Верхняя навигация страницы задания</td></tr><tr><td>after_solution</td><td>Кнопка под встроенным решением</td></tr><tr><td>dialog</td><td>Кнопка в окне решения на странице или в каталоге</td></tr></tbody></table><p>Раньше параметра не было; он также может отсутствовать в давно открытых вкладках. Пустая группа не означает нулевые переходы. Первое полное московское окно новых данных — 14 ноября. Эффект оценивать после накопления 7–14 полных дней на сопоставимых устройствах, источниках и страницах входа. Новые цели и автоматические расписания не создавались.</p><h2>Проверки</h2><ul><li>14 проверок кода аналитики, каталога и версии ресурсов — успешно.</li><li>Chrome: 24 сочетания страниц и экранов 360/390/1280 px в предпросмотре и те же 24 на публичном сайте. Нет горизонтального переполнения, пропавших изображений, повторных инициализаций или ошибок JavaScript.</li><li>Навигация ОГЭ: шесть проверок, включая оба предмета, переход через границу страницы, возврат, двойное нажатие и конец выборки.</li><li>WebKit: 13 сценариев в предпросмотре и те же 13 публично. Ширины 375/390/430 px, три места перехода, один next_task на действие, клавиатура, двойное нажатие, возврат, отсутствие callback Метрики, каталоги ЕГЭ/ОГЭ и работа без JavaScript.</li><li>В каталогах удалено устаревшее правило min-height:44px!important, которое мешало единому размеру новой кнопки. Финальная высота 48 px проверена отдельно.</li><li>Содержимое пяти контрольных решений совпало по SHA-256 до/после публикации. Четыре старых CSS/JS доступны с прежними байтами; семь файлов новой страницы сверены с предпросмотром.</li></ul><h2>Ограничения и безопасность проверки</h2><p>WebKit запускался в Linux с профилем iPhone, это не настоящий iPhone и не нативный «Яндекс Старт». Реклама в WebKit заменялась управляемым блоком 600 px, в Chrome блокировалась; реальных рекламных показов и целей от тестов нет. Публичные сценарии не создавали аккаунты или заявки, записи запрещены перехватчиком WebKit. Предпросмотр использовал отдельную копию SQLite и пустую базу заявок с отключённой отправкой уведомлений. Содержимое заданий и решений, рабочие базы, настройки счётчика и реклама в рамках изменения не редактировались.</p><h2>Публичные снимки</h2><div class="gallery"><figure><a href="webkit-public/after_solution-390.jpg"><img src="webkit-public/after_solution-390.jpg" alt="Основная кнопка после встроенного решения"></a><figcaption>После встроенного решения</figcaption></figure><figure><a href="webkit-public/dialog-390.jpg"><img src="webkit-public/dialog-390.jpg" alt="Основная кнопка в окне решения"></a><figcaption>В окне решения</figcaption></figure></div><details><summary>Публичные сценарии WebKit</summary><div class="table"><table><thead><tr><th>Ширина</th><th>Сценарий</th><th>placement</th><th>navigation_area</th><th>Результат</th></tr></thead><tbody>'''
report += rows + '</tbody></table></div></details><p><a href="verification.json">Итог проверок</a> · <a href="deployment.json">Публикация</a> · <a href="baseline-metrika.json">Срез до изменения</a> · <a href="analytics-public/report.json">Chrome</a> · <a href="webkit-public/report.json">WebKit</a></p></html>'
(ROOT / 'report.html').write_text(report + '\n')
print(json.dumps({k: v for k, v in summary.items() if k != 'source_sha256'}, ensure_ascii=False, indent=2))
