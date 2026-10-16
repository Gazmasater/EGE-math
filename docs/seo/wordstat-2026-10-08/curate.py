"""Reproducible selection; counts are never summed across overlapping phrases."""
import csv
import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).parent
BASE = "https://ege-fipi.ru"


def dump(name, value):
    (ROOT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def csv_write(name, rows, fields):
    with (ROOT / name).open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows({k: json.dumps(v, ensure_ascii=False) if isinstance(v, (list, dict)) else v
                         for k, v in row.items()} for row in rows)


def normalize(p):
    return " ".join(p.lower().replace("ё", "е").split())


ALIASES = {"математик": "математика", "математике": "математика", "математики": "математика",
           "физик": "физика", "физике": "физика", "физики": "физика", "банки": "банк",
           "задание": "задания", "заданий": "задания", "задач": "задачи", "задача": "задачи",
           "вектора": "векторы", "векторов": "векторы", "вероятностей": "вероятность",
           "вероятности": "вероятность", "функции": "функция", "функций": "функция",
           "решением": "решение", "решениями": "решение", "решения": "решение",
           "электрические": "электрический", "электрическая": "электрический", "цепи": "цепь",
           "погрешности": "погрешность", "практическая": "практический", "практические": "практический"}


def equivalent(p):
    # Only explicit variants and reordered tokens; stop words are preserved.
    # Raw variants are retained. Their counts are NOT added together.
    return " ".join(sorted(ALIASES.get(x, x) for x in normalize(p).split()))


MATH = [
    (r"параметр", "Параметры", "/parameters", ""),
    (r"экономическ|кредит|финанс|вклад", "Финансовые задачи", "/finance", ""),
    (r"числа и их свойств", "Числа и их свойства", "/numbers", ""),
    (r"смес|сплав", "Смеси, сплавы и проценты", "/?topic=word-problems.percent", ""),
    (r"процент", "Проценты", "/?topic=word-problems.percent", ""),
    (r"прикладн", "Прикладные задачи", "/?topic=applied", ""),
    (r"движени|скорост", "Текстовые задачи на движение", "/?topic=word-problems.motion", ""),
    (r"текстов", "Текстовые задачи", "/?topic=word-problems", ""),
    (r"скалярн", "Скалярное произведение", "/?topic=vectors.scalar", ""),
    (r"длина вектор|координат.*вектор", "Координаты и длина вектора", "/?topic=vectors.coordinates", ""),
    (r"вектор", "Векторы", "/?topic=vectors", ""),
    (r"стереометр", "Стереометрия", "/?topic=solid", "/stereometry"),
    (r"планиметр|треугольник|окружност", "Планиметрия", "/?topic=plane", "/planimetry"),
    (r"вероятност", "Вероятность", "/?topic=probability-basic", "/?topic=probability-compound"),
    (r"простейш.*уравнен", "Простейшие уравнения", "/?topic=basic-equations", ""),
    (r"неравенств", "Неравенства", "/inequalities", ""),
    (r"тригонометр.*уравнен|уравнен.*тригонометр", "Тригонометрические уравнения", "/equations", ""),
    (r"логарифм.*уравнен|уравнен.*логарифм", "Логарифмические уравнения", "/?topic=basic-equations.logarithms", "/equations"),
    (r"логарифм", "Логарифмы", "/?topic=expressions.logarithms", ""),
    (r"производн", "Производная", "/?topic=derivative", ""),
    (r"исследован.*функц|наибольш.*значен|наименьш.*значен|экстремум", "Исследование функций", "/?topic=function-study", ""),
    (r"график.*функц", "Графики функций", "/?topic=graphs", ""),
    (r"уравнен", "Уравнения", "/equations", "/?topic=basic-equations"),
]
PHYSICS = [
    (r"кинематик", "Кинематика", "/physics?topic=kinematics", "/physics/part-2?topic=1.1"),
    (r"\bдинамик|ньютон", "Динамика", "/physics?topic=dynamics", "/physics/part-2?topic=1.2"),
    (r"закон.*сохранен", "Законы сохранения", "/physics?topic=conservation", "/physics/part-2?topic=1.4"),
    (r"электростатик", "Электростатика", "/physics?topic=electricity.field", ""),
    (r"\bстатик", "Статика", "/physics?topic=statics-waves.statics", "/physics/part-2?topic=1.3"),
    (r"молекулярн", "Молекулярная физика", "/physics?topic=molecular", "/physics/part-2?topic=2.1"),
    (r"термодинамик", "Термодинамика", "/physics?topic=thermodynamics", "/physics/part-2?topic=2.2"),
    (r"электромагнитн.*индукц", "Электромагнитная индукция", "/physics?topic=magnetism.induction", ""),
    (r"магнитн.*пол", "Магнитное поле", "/physics?topic=magnetism.field", ""),
    (r"электрическ.*цеп|закон ома", "Электрические цепи", "/physics?topic=electricity.circuits", ""),
    (r"оптик", "Оптика", "/physics?topic=optics-waves.optics", ""),
    (r"ядерн|радиоактив|полураспад", "Ядерная физика", "/physics?topic=quantum.nucleus", ""),
    (r"квантов", "Квантовая физика", "/physics?topic=quantum", "/physics/part-2?topic=4"),
    (r"погрешност|измерен", "Измерения и погрешности", "/physics?topic=measurement", ""),
    (r"эксперимент", "Эксперимент", "/physics?topic=experiment", ""),
    (r"колебан|волн", "Колебания и волны", "/physics?topic=statics-waves", ""),
    (r"движени|скорост", "Кинематика", "/physics?topic=kinematics", "/physics/part-2?topic=1.1"),
]
OGE_MATH = [
    (r"шин|участ|печ[ьи]|практическ", "Практические задачи", "practical"),
    (r"треугольник", "Треугольники", "7.2"),
    (r"окружност", "Окружность", "7.4"),
    (r"неравенств", "Неравенства", "3.2"),
    (r"уравнен", "Уравнения", "3.1"),
    (r"график.*функц", "Функции и графики", "5.1"),
    (r"вероятност", "Вероятность", "8.2"),
    (r"прогресси", "Прогрессии", "4.2"),
    (r"текстов", "Текстовые задачи", "3.3"),
]
OGE_PHYSICS = [
    (r"кинематик", "Кинематика", "1", "Общий раздел механики; отдельного хаба кинематики ОГЭ нет"),
    (r"динамик", "Динамика", "1", "Общий раздел механики; нужен отдельный обзор динамики ОГЭ"),
    (r"архимед", "Закон Архимеда", "1.23", ""),
    (r"давлен", "Давление", "1.21", ""),
    (r"количеств.*теплот", "Количество теплоты", "2.8", ""),
    (r"теплов", "Тепловые явления", "2", ""),
    (r"закон ома", "Закон Ома", "3.8", ""),
    (r"электрическ", "Электрические явления", "3", "Раздел включает также магнитные и оптические явления"),
    (r"оптик", "Оптика", "3.24", "Страница только о линзах; для общего запроса нужен обзор оптики"),
    (r"радиоактив", "Радиоактивность", "4.1", ""),
    (r"эксперимент", "Эксперимент", "methods.experiments", ""),
]


def classify(phrase, seed):
    p = normalize(phrase)
    exam = "ОГЭ" if "огэ" in p else "ЕГЭ" if "егэ" in p else ""
    subject = "Физика" if re.search(r"физик", p + " " + seed) else "Математика"
    physical_topic = any(re.search(rx, p) for rx, *_ in PHYSICS[:-1] + OGE_PHYSICS)
    if physical_topic and not re.search(r"математик", p):
        subject = "Физика"
    cluster, path, alt, note = "Общий банк", "", "", ""
    if exam == "ЕГЭ":
        path = "/ege/physics" if subject == "Физика" else "/ege/math"
        for rx, name, dest, alternative in PHYSICS if subject == "Физика" else MATH:
            if re.search(rx, p):
                cluster, path, alt = name, dest, alternative
                break
        if re.search(r"(первая|первой|1) част", p):
            cluster = "Первая часть"
            path = "/physics?topic=all" if subject == "Физика" else "/?topic=all"
        elif re.search(r"(вторая|второй|2) част", p):
            cluster = "Вторая часть"
            path = "/physics/part-2" if subject == "Физика" else "/ege/math"
            if subject == "Математика":
                note = "Обзор обеих частей; отдельного общего URL второй части математики нет"
    elif exam == "ОГЭ":
        path = "/oge-physics" if subject == "Физика" else "/oge"
        rules = OGE_PHYSICS if subject == "Физика" else [(*r, "") for r in OGE_MATH]
        for rx, name, code, comment in rules:
            if re.search(rx, p):
                cluster, path, note = name, path + "?topic=" + code, comment
                break
    if p in {"ege fipi", "еге фипи ру", "ege fipi ru", "ege-fipi ru"}:
        return {"exam": "Бренд", "subject": "Оба", "cluster": "Название сайта",
                "target_url": BASE + "/", "alternative_url": "", "status": "candidate", "reason": "", "note": "Брендовый запрос; не общий спрос на ФИПИ"}
    status, reason = "candidate", ""
    if not exam:
        status, reason = "excluded", "Нет явного экзамена или собственного бренда"
    elif re.search(r"\b(математик|физик|математиками|динамик)\b", p):
        status, reason = "excluded", "Неестественная словоформа API: предпочтение естественному варианту"
    elif re.search(r"предлог|результат|мониторинг", p):
        status, reason = "excluded", "Омоним или административная статистика вместо учебной темы"
    elif re.search(r"русск|хими|биолог|информатик|английск|географ|обществ|литератур|истори", p):
        status, reason = "excluded", "Другой предмет"
    elif re.search(r"решу|сдам|школков|умскул|фоксфорд|ясченк|ларин|статград|демидов|камзеев|гущин|сотка|незнайк|100\s*бал|100бал|егэленд|лобанов|балаян|яхонтов|крылов|малков|ягу|яша|профимат|math100|решутест|решутест|alex|alexlarin|you.?tube|рутуб|rustutors|егэист|складчин", p):
        status, reason = "excluded", "Чужой бренд, авторский сборник или сторонний сервис"
    elif re.search(r"официальн|фипи\s+ру|fipi\s+ru|сайт\s+фипи|фипи\s+сайт", p):
        status, reason = "excluded", "Навигация на официальный сайт ФИПИ"
    elif re.search(r"база|базов", p) and exam == "ЕГЭ" and subject == "Математика":
        status, reason = "excluded", "Базовая математика отсутствует"
    elif re.search(r"репетитор|купить|стоимост|цена|платн|ваканси|курс[а-я]*\b|онлайн школ|\bслив|реальн.*ответ", p):
        status, reason = "excluded", "Услуга или предложение отсутствует"
    elif re.search(r"20[0-2][0-9]", p):
        status, reason = "reserve", "Запрос с годом: нужна проверка актуальности банка и отдельного материала"
    elif ("егэ" in p and "огэ" in p) or ("механика" in p and "молекулярная" in p):
        status, reason = "reserve", "Смешанное намерение: одна выбранная страница не покрывает весь запрос"
    elif re.search(r"есть ли|максимум|с нуля", p):
        status, reason = "reserve", "Нужен отдельный ответ об экзамене или курс с нуля"
    elif re.search(r"демовер|кодификатор|спецификац|изменени|расписан|балл|критер|сколько|вариант|сборник|учебник|скачать|pdf|пдф|презентац|видео|вебинар|тест", p):
        status, reason = "reserve", "Нужен отдельный материал или функция; текущий каталог не закрывает намерение полностью"
    elif re.search(r"формул|шпаргал|конспект|теори", p.replace("теория вероятностей", "").replace("теория вероятности", "")):
        status, reason = "reserve", "Справочник/теория: отдельного полного материала нет"
    elif re.search(r"\d", re.sub(r"\b(?:9|11)\s+класс[а-я]*", "", p)):
        status, reason = "reserve", "Номер задания/числовая конкретизация требует ручного сопоставления с банком"
    elif subject == "Математика" and exam == "ОГЭ" and re.search(r"решен|ответ|разбор|реш[аи]", p):
        status, reason = "reserve", "ОГЭ-математика: решения и ответы пока не опубликованы"
    elif "Обзор оптики" in note or "обзор оптики" in note:
        status, reason = "reserve", "Нужен общий обзор оптики ОГЭ, а не страница одной темы"
    elif re.search(r"чебышев|беллман|кош[иь]|бернулли|крамер|векторн.*произвед", p):
        status, reason = "reserve", "Содержание выбранного метода отдельно не подтверждено"
    return {"exam": exam, "subject": subject, "cluster": cluster,
            "target_url": BASE + path if path else "", "alternative_url": BASE + alt if alt else "",
            "status": status, "reason": reason, "note": note}


def main():
    data = json.loads((ROOT / "broad.json").read_text())
    observations, by_phrase = [], {}
    for batch in data["batches"]:
        if batch.get("status") != "complete":
            continue
        for report in batch["response"]["data"]:
            for relation in ["SearchedWith", "SearchedAlso"]:
                for row in report.get(relation, []):
                    observation = {"phrase": row["Phrase"], "shows": row["Shows"], "seed": report["Phrase"],
                                   "relation": relation, "report_id": batch["report_id"], "retrieved_at": batch["retrieved_at"]}
                    observations.append(observation)
                    if relation != "SearchedWith":
                        continue
                    key = normalize(row["Phrase"])
                    if key not in by_phrase:
                        by_phrase[key] = {"phrase": row["Phrase"], "broad_shows": row["Shows"],
                                          "seeds": [], "observations": [], **classify(row["Phrase"], report["Phrase"])}
                    by_phrase[key]["seeds"].append(report["Phrase"])
                    by_phrase[key]["observations"].append(observation)
    rows = list(by_phrase.values())
    for row in rows:
        row["seeds"] = sorted(set(row["seeds"]))
        row["observed_shows_values"] = sorted(set(o["shows"] for o in row["observations"]))
    candidates = [r for r in rows if r["status"] == "candidate" and r["broad_shows"] >= 10]
    seed_set = set(data["phrases"])
    def preference(r):
        # Prefer natural seed wording to API variants such as "физик".
        penalty = 500 if re.search(r"\b(математик|физик|математиками|банки)\b", r["phrase"]) else 0
        return (1000 if r["phrase"] in seed_set else 0) - penalty + min(r["broad_shows"], 400) / 100
    representatives, groups = {}, defaultdict(list)
    for row in candidates:
        groups[equivalent(row["phrase"])].append(row)
    for key, group in groups.items():
        representatives[key] = max(group, key=preference)
    selected = {}
    for seed in data["phrases"]:
        local = [r for r in representatives.values() if seed in r["seeds"]]
        local.sort(key=lambda r: (r["phrase"] == seed, r["broad_shows"]), reverse=True)
        # At most four representative phrases per seed, plus two solution/task tails.
        for row in local[:4]:
            selected[row["phrase"]] = row
        tails = [r for r in local if re.search(r"решен|зада|ответ|банк", r["phrase"])]
        for row in tails[:2]:
            selected[row["phrase"]] = row
    chosen = list(selected.values())
    chosen.sort(key=lambda r: (r["exam"], r["subject"], r["cluster"], -r["broad_shows"]))
    for row in chosen:
        row["equivalent_variants"] = [g["phrase"] for g in groups[equivalent(row["phrase"])] if g is not row]
        row["quoted_query"] = '"' + row["phrase"] + '"'
    dump("candidates.json", chosen)
    dump("quoted-seeds.json", [r["quoted_query"] for r in chosen])
    dump("classification.json", rows)
    csv_write("all-observations.csv", observations, ["phrase", "shows", "seed", "relation", "report_id", "retrieved_at"])
    csv_write("reserve.csv", [r for r in rows if r["status"] == "reserve"],
              ["phrase", "broad_shows", "exam", "subject", "cluster", "reason", "target_url", "seeds"])
    csv_write("excluded.csv", [r for r in rows if r["status"] == "excluded"], ["phrase", "broad_shows", "reason", "seeds"])
    print(json.dumps({"observations": len(observations), "unique_phrases": len(rows),
                      "eligible_before_selection": len(candidates), "selected": len(chosen),
                      "reserve": sum(r['status'] == 'reserve' for r in rows),
                      "excluded": sum(r['status'] == 'excluded' for r in rows)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
