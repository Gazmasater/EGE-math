import datetime as dt
import hashlib
import html
import json
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent
PROJECT = Path('/root/projects/ege-math')
def read(name): return json.loads((ROOT / name).read_text())
deployment = read('deployment.json')
checks = {'chromium-preview': 24, 'chromium-public': 24, 'webkit-preview': 13, 'webkit-public': 13}
reports = {name: read(name + '/report.json') for name in checks}
for name, count in checks.items():
    assert len(reports[name]['cases']) == count and not reports[name]['errors'], name
analytics = read('analytics-preview-final/report.json')
assert len(analytics['pages']) == 24 and not analytics['errors']
assert '# pass 14' in (ROOT / 'unit-tests.txt').read_text() and '# fail 0' in (ROOT / 'unit-tests.txt').read_text()
assert deployment['status'] == 'published' and not deployment['rolled_back']
before = read('before-layout.json')[0]['items']
before_y = next(x['y'] for x in before if x['cls'].startswith('qblock'))
after = next(c for c in reports['chromium-public']['cases'] if c['id'] == 'FDA042' and c['width'] == 390)
summary = dict(generated_at_moscow=dt.datetime.now(ZoneInfo('Europe/Moscow')).isoformat(),
               service_start_utc=deployment['service']['ExecMainStartTimestamp'], baseline_cases=10,
               first_screen_checks=checks, analytics_pages=24, unit_tests=14, errors=0,
               reference_viewport='390x844', reference_condition_before_y=before_y,
               reference_condition_after_y=after['conditionY'], content_and_seo_hashes_preserved=True,
               api_statuses_and_hashes_preserved=len(deployment['solutions']), retained_assets=len(deployment['retained_assets']),
               physical_iphone=False, real_ads=False, database_edits=False,
               source_sha256={name: hashlib.sha256((PROJECT / name).read_bytes()).hexdigest()
                              for name in ['server.js', 'lib/site-ui.js', 'public/site.css', 'public/site.js']})
(ROOT / 'verification.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n')
rows = ''.join('<tr><td>' + html.escape(c['id']) + '</td><td>' + str(c['width']) + '</td><td>' + str(round(c['conditionY'])) + '</td><td>' + ('Есть' if c['hasSolution'] else 'Не опубликовано') + '</td><td>Пройдено</td></tr>'
               for c in reports['chromium-public']['cases'])
report = '''<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ege-fipi.ru — новый первый экран задания</title><style>body{font:16px/1.55 system-ui,sans-serif;max-width:1040px;margin:36px auto;padding:0 20px;background:#fafcfd;color:#173148}h1{line-height:1.2}h2{margin-top:2em}.lead{background:#e7f0f8;padding:18px;border-radius:12px}.compare{display:flex;gap:24px;flex-wrap:wrap}figure{margin:0;max-width:390px}img{width:100%;height:auto;border:1px solid #dbe4eb}table{width:100%;border-collapse:collapse;background:#fff}th,td{padding:9px;border-bottom:1px solid #dbe4eb;text-align:left}.table{overflow:auto}a{color:#1358a1}li{margin:8px 0}</style><h1>Условие задачи на первом экране</h1><p class="lead"><strong>Опубликовано 13 ноября 2026 в 02:23 МСК.</strong> Страницы отдельных заданий получили компактную шапку с темой, крупной кнопкой решения и короткой верхней навигацией. Баннер подготовки, реклама и редакционные заметки перенесены после основного разбора и продолжения занятий.</p><p>На контрольном задании FDA042 при 390×844 px условие поднялось с ''' + str(before_y) + ' до ' + str(round(after['conditionY'])) + ''' px. Снимки и тесты сделаны без настоящих рекламных показов. Это проверка расположения и работы интерфейса; рост конверсии пока не установлен.</p><h2>До и после</h2><div class="compare"><figure><a href="before-FDA042.jpg"><img src="before-FDA042.jpg" alt="Старый первый экран: баннер подготовки перед условием"></a><figcaption>До: условие начинается ниже первого экрана</figcaption></figure><figure><a href="chromium-public/FDA042-390.jpg"><img src="chromium-public/FDA042-390.jpg" alt="Новый первый экран с темой, кнопкой и условием"></a><figcaption>После: условие и действие видны сразу</figcaption></figure></div><h2>Что изменилось</h2><ul><li>Отдельный компонент шапки: предмет, ID и тема задания. Длинная тема занимает до двух строк; полный текст доступен в HTML, подсказке и метаданных. Длинная цепочка разделов прокручивается по горизонтали.</li><li>Крупная кнопка в шапке ведёт к встроенному решению. Заголовок разбора не закрывается закреплённой шапкой. Навигация, открытие окна решения и переход к следующему заданию сохранены.</li><li>На странице без опубликованного решения кнопка ведёт к заданиям темы и не обещает готовый ответ.</li><li>Баннер подготовки и рекламный блок остаются на странице ниже основного разбора. ID блока и механизм запроса сохранены; место размещения изменилось.</li></ul><h2>Проверки</h2><ul><li>10 исходных страниц сверены с новой версией: текст условий, количество MathML-дробей/корней, title, description, canonical и JSON-LD совпадают.</li><li>Chrome: 24 сценария в предпросмотре и те же 24 на публичном сайте. Проверены ЕГЭ/ОГЭ, математика, физика, информатика, редакционная заметка и отсутствие готового решения; ширины 320/375/390/430/1280 px.</li><li>WebKit: 13 сценариев в предпросмотре и те же 13 публично, включая работу кнопки без JavaScript.</li><li>14 проверок analytics/catalogue/assets и 24 проверки страниц аналитики прошли. Переход к встроенному решению, возврат, окно решения и один next_task на переход проверены на заглушке Метрики.</li><li>Статусы и хеши 10 API решений сохранены: девять опубликованных разборов и один ожидаемый 404. Четыре прежних CSS/JS доступны с теми же байтами.</li></ul><h2>Ограничения и данные</h2><p>WebKit работает в Linux с профилем iPhone; аппаратный iPhone и нативный «Яндекс Старт» не проверены. Аналитика и настоящие рекламные запросы блокировались; в геометрических тестах использовалась управляемая заглушка высотой 600 px. Публичные формы и аккаунты не создавались, записи запрещены перехватчиком. Предпросмотр использовал отдельную копию SQLite и пустую базу заявок с отключёнными уведомлениями. Исходные условия и решения не редактировались.</p><p>Кнопка в шапке не создаёт отдельную цель: solution_open с placement=task_page по-прежнему фиксирует видимость заголовка разбора в течение секунды. На коротких заданиях новое расположение блоков может менять такую видимость. Изменения кнопок next_task и первого экрана опубликованы в один московский день; первое полное окно после обеих правок — 14 ноября, их эффекты нельзя разделить по простому сравнению до/после.</p><details><summary>Публичные сценарии Chrome</summary><div class="table"><table><thead><tr><th>Задание</th><th>Ширина</th><th>Начало условия, px</th><th>Разбор</th><th>Результат</th></tr></thead><tbody>'''
report += rows + '</tbody></table></div></details><p><a href="verification.json">Итоговые проверки</a> · <a href="deployment.json">Публикация</a> · <a href="chromium-public/report.json">Chrome</a> · <a href="webkit-public/report.json">WebKit</a></p></html>'
(ROOT / 'report.html').write_text(report + '\n')
print(json.dumps({k: v for k, v in summary.items() if k != 'source_sha256'}, ensure_ascii=False, indent=2))
