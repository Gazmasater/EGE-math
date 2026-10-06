'use strict';

// Shared presentation only: task catalogs, solutions and their URLs stay in server.js.
const UI_HEAD = '<link rel="stylesheet" href="/assets/site.css?v=20261006-1"><script defer src="/assets/site.js?v=20261006-1"></script>';
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[character]));
const number = value => Number(value).toLocaleString('ru-RU');
const icon = (name, className = '') => {
  const paths = {
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    chevron: '<path d="m7 10 5 5 5-5"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    book: '<path d="M12 5v15M3 4c4-1 6 0 9 2 3-2 5-3 9-2v14c-4-1-6 0-9 2-3-2-5-3-9-2Z"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    math: '<path d="m3 13 4 5 4-14h10M14 10l6 8m0-8-6 8"/>',
    physics: '<circle cx="12" cy="12" r="2"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-35 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(35 12 12)"/>'
  };
  return `<svg class="ui-icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.arrow}</svg>`;
};

const mathLinks = [
  ['/equations', 'Уравнения'], ['/stereometry', 'Стереометрия'], ['/inequalities', 'Неравенства'],
  ['/finance', 'Финансовая математика'], ['/optimal', 'Оптимальный выбор'], ['/planimetry', 'Планиметрия'],
  ['/parameters', 'Задачи с параметром'], ['/numbers', 'Числа и их свойства']
];
const physicsLinks = [
  ['/physics/part-2?topic=1#tasks', 'Механика'], ['/physics/part-2?topic=2#tasks', 'Молекулярная физика и термодинамика'],
  ['/physics/part-2?topic=3#tasks', 'Электродинамика'], ['/physics/part-2?topic=4#tasks', 'Квантовая физика']
];

function subjectLinks(subject, pathname) {
  const physics = subject === 'physics';
  const link = (href, label) => `<a href="${escape(href)}"${href.split('#')[0] === pathname ? ' aria-current="page"' : ''}>${escape(label)}</a>`;
  return `${link(physics ? '/ege/physics' : '/ege/math', 'Обзор предмета · обе части')}
    ${link(physics ? '/physics#practice' : '/#practice', 'Первая часть · по типам')}
    <span class="site-nav-label">Вторая часть</span>
    ${(physics ? physicsLinks : mathLinks).map(([href, label]) => link(href, label)).join('')}
    ${physics ? link('/physics/part-2#tasks', 'Вся вторая часть') : ''}
    ${link(`/added?section=${physics ? 'physics' : 'mathematics'}`, 'Добавленные задания')}`;
}

function renderSiteHeader({subject = '', pathname = '', searchQuery = '', searchPath = '/search', searchTopic = ''} = {}) {
  const dropdown = (name, key) => `<details class="site-dropdown${subject === key ? ' is-current' : ''}"><summary>${name}${icon('chevron')}</summary><div class="site-dropdown-panel">${subjectLinks(key, pathname)}</div></details>`;
  const ogeLinks = `<a href="/oge"${pathname === '/oge' ? ' aria-current="page"' : ''}>ОГЭ — математика</a><a href="/oge-physics"${pathname === '/oge-physics' ? ' aria-current="page"' : ''}>ОГЭ — физика</a>`;
  return `<header class="local-header site-header">
    <a class="site-brand" href="/" aria-label="ЕГЭ ФИПИ — на главную"><span class="site-brand-mark">${icon('book')}</span><span>ЕГЭ<span class="site-brand-dot">·</span>ФИПИ<small>понять и решить</small></span></a>
    <nav class="site-desktop-nav" aria-label="Предметы и разделы">${dropdown('Математика', 'math')}${dropdown('Физика', 'physics')}<details class="site-dropdown${subject.startsWith('oge') ? ' is-current' : ''}"><summary>ОГЭ${icon('chevron')}</summary><div class="site-dropdown-panel">${ogeLinks}</div></details><a href="/about"${pathname === '/about' ? ' aria-current="page"' : ''}>О проекте</a></nav>
    <div class="site-header-actions">
      <details class="site-dropdown site-search"><summary aria-label="Поиск заданий">${icon('search')}</summary><div class="site-dropdown-panel site-search-panel"><form action="${escape(searchPath)}" method="get" role="search">${searchTopic ? `<input type="hidden" name="topic" value="${escape(searchTopic)}">` : ''}<label for="header-search">Номер ФИПИ или текст условия</label><div><input id="header-search" type="search" name="q" value="${escape(searchQuery)}" placeholder="Номер задания или слова из условия" required><button type="submit">Найти</button></div></form></div></details>
      <a class="site-account" href="/account">Кабинет</a>
      <a class="site-header-cta" href="/ege#subjects">Начать подготовку${icon('arrow')}</a>
      <details class="site-mobile-menu"><summary>${icon('menu')}<span>Меню</span></summary><nav class="site-mobile-panel" aria-label="Мобильная навигация">
        <a class="site-mobile-start" href="/ege#subjects">Выбрать предмет ${icon('arrow')}</a>
        <details><summary>${icon('math')}Математика${icon('chevron')}</summary><div>${subjectLinks('math', pathname)}</div></details>
        <details><summary>${icon('physics')}Физика${icon('chevron')}</summary><div>${subjectLinks('physics', pathname)}</div></details>
        <details><summary>${icon('book')}ОГЭ${icon('chevron')}</summary><div>${ogeLinks}</div></details>
        <a href="/about">О проекте</a><a href="/account">Личный кабинет</a><a href="/search">Найти задание</a>
      </nav></details>
    </div>
  </header>`;
}

function renderStudyHero({subject = 'math', solved = 0, types = 0, sampleAnswer = '', hub = false} = {}) {
  const physics = subject === 'physics';
  const sampleId = physics ? '8A3445' : '6D1598';
  const primary = hub ? '#subjects' : '#practice';
  return `<section class="study-hero" aria-labelledby="study-hero-title">
    <div class="study-hero-copy">
      <p class="study-eyebrow"><span></span>Подготовка к ЕГЭ · бесплатно</p>
      <h1 id="study-hero-title">${!hub && physics ? 'ЕГЭ по физике:<br><em>задания ФИПИ с решениями.</em>' : `${hub ? 'Готовьтесь к ЕГЭ' : 'Математика ЕГЭ'}<br><em>с пониманием.</em>`}</h1>
      <p class="study-lead">${hub ? 'Математика и физика' : physics ? 'Формулы, графики и законы физики' : 'От простых вычислений до сложных задач'} — шаг за шагом. Решайте задания ФИПИ, разбирайтесь в трудных местах и закрепляйте то, что получилось.</p>
      <div class="study-actions"><a class="study-button" href="${primary}">${hub ? 'Выбрать предмет' : 'Начать решать'}${icon('arrow')}</a><a class="study-secondary" href="/tasks/${sampleId}#solution-${sampleId}">Посмотреть разбор ${icon('arrow')}</a></div>
      <p class="study-reassurance">${icon('check')}Все решения открыты. Без оплаты и регистрации.</p>
      <div class="study-stats" aria-label="Возможности каталога">
        <div><strong>${number(solved)}</strong><span>${hub ? 'подробных решений' : 'решений первой части'}</span></div>
        <div><strong>${hub ? '2' : types}</strong><span>${hub ? 'предмета для подготовки' : 'типов заданий'}</span></div>
        <div><strong>0 ₽</strong><span>доступ к разборам</span></div>
      </div>
    </div>
    <div class="study-preview">
      <div class="study-preview-note">${icon('check')}Сначала попробуйте сами</div>
      <div class="study-preview-card">
        <div class="study-preview-top"><span class="study-subject-icon">${icon(physics ? 'physics' : 'math')}</span><div><strong>${physics ? 'Движение по окружности' : 'Проценты'}</strong><span>${physics ? 'Физика' : 'Профильная математика'} · первая часть</span></div><span class="study-example-tag">ФИПИ</span></div>
        <p class="study-preview-question">${physics ? 'Тело движется по окружности радиусом 2 м с центростремительным ускорением 2 м·с⁻². Чему равна его скорость?' : 'Шесть призёров олимпиады составляют 5% от всех участников. Сколько человек участвовало в олимпиаде?'}</p>
        <div class="study-preview-sketch" aria-hidden="true">${physics ? '<span>v = √(aR)</span><small>от закона → к ответу</small>' : '<span>6 участников <b>→</b> 5%</span><span><i>?</i> участников <b>→</b> 100%</span>'}</div>
        <details class="study-demo-answer"><summary>Показать ответ${icon('chevron')}</summary><div><strong>Ответ: ${escape(sampleAnswer)}${physics ? ' м·с⁻¹' : ' участников'}.</strong><p>${physics ? 'Скорость — корень из произведения ускорения и радиуса: √(2 · 2) = 2 м·с⁻¹.' : '1% — это 6 ÷ 5 = 1,2 участника. Значит, 100% — это 1,2 · 100 = 120 участников.'}</p></div></details>
        <a class="study-preview-link" href="/tasks/${sampleId}">Открыть задание ${sampleId}${icon('arrow')}</a>
      </div>
      <p class="study-preview-caption">Условие → ваше решение → подробный разбор</p>
    </div>
  </section>`;
}

function renderSubjectSwitch(subject = 'math') {
  return `<nav class="study-subject-switch" aria-label="Предмет для подготовки"><a href="${subject === 'math' ? '#practice' : '/#practice'}"${subject === 'math' ? ' aria-current="page"' : ''}>${icon('math')}Математика<span>профиль</span></a><a href="${subject === 'physics' ? '#practice' : '/physics#practice'}"${subject === 'physics' ? ' aria-current="page"' : ''}>${icon('physics')}Физика</a></nav>`;
}

function renderStudyBenefits() {
  return `<section class="study-benefits" aria-label="Что помогает в подготовке">
    <div><span>01</span><div><h2>Практика по темам</h2><p>Выбирайте именно то, что нужно подтянуть.</p></div></div>
    <div><span>02</span><div><h2>Понятный ход решения</h2><p>Проверяйте каждый шаг, а не только ответ.</p></div></div>
    <div><span>03</span><div><h2>В удобном темпе</h2><p>Занимайтесь с телефона или компьютера.</p></div></div>
  </section>`;
}

function renderStudyGuide({subject = 'math', hub = false} = {}) {
  const route = hub ? '/ege#subjects' : subject === 'physics' ? '/physics#practice' : '/#practice';
  return `<section class="study-guide-section" id="how-to-study" aria-labelledby="study-guide-heading">
    <p class="study-eyebrow">Одна тема. Три простых шага.</p><h2 id="study-guide-heading">От первой попытки<br>к самостоятельному решению</h2>
    <ol class="study-steps"><li><span>1</span><h3>Выберите тему</h3><p>Начните с того, что вызывает вопросы, или повторите знакомый тип задания.</p></li><li><span>2</span><h3>Попробуйте сами</h3><p>Прочитайте условие и запишите свой ход решения. Не спешите смотреть ответ.</p></li><li><span>3</span><h3>Разберите и закрепите</h3><p>Сравните шаги с объяснением и перейдите к следующей задаче той же темы.</p></li></ol>
    <a class="study-button" href="${route}">Выбрать первое задание${icon('arrow')}</a>
  </section>`;
}

function renderStudyFaq() {
  return `<section class="study-faq" aria-labelledby="study-faq-title"><div><p class="study-eyebrow">Перед началом</p><h2 id="study-faq-title">Частые вопросы</h2></div><div class="study-faq-items">
    <details><summary>Решения действительно бесплатные?${icon('chevron')}</summary><p>Да. Условия, ответы, подробные решения и схемы можно смотреть бесплатно и без регистрации.</p></details>
    <details><summary>С какого задания лучше начать?${icon('chevron')}</summary><p>Выберите знакомую тему первой части и попробуйте решить одну задачу. Если возникли трудности, изучите разбор и закрепите метод на следующем задании. Для развёрнутых задач откройте вторую часть в меню предмета.</p></details>
    <details><summary>Для чего нужен личный кабинет?${icon('chevron')}</summary><p>После регистрации можно оставлять комментарии к решениям и видеть свои комментарии в личном кабинете. Сами задания и разборы доступны всем.</p></details>
    <details><summary>Это официальный сайт ФИПИ?${icon('chevron')}</summary><p>Нет, это самостоятельный проект для подготовки. Условия взяты из открытого банка ФИПИ, а подробные решения и пояснения подготовлены для этого сайта.</p></details>
  </div></section>`;
}

function renderSiteFooter({advertising = false} = {}) {
  const ad = advertising ? '<aside class="site-ad" data-site-ad="R-A-20149267-3" data-ad-state="idle" aria-label="Реклама"><span class="site-ad-label" hidden>Реклама</span><div class="site-ad-slot" id="yandex_rtb_R-A-20149267-3"></div></aside>' : '';
  return `${ad}<footer class="site-footer"><div class="site-footer-top"><a class="site-brand" href="/"><span class="site-brand-mark">${icon('book')}</span><span>ЕГЭ<span class="site-brand-dot">·</span>ФИПИ<small>понять и решить</small></span></a><p>Математика и физика.<br>Задания, которые становятся понятнее.</p><nav aria-label="Ссылки в подвале"><a href="/ege/math">Математика</a><a href="/ege/physics">Физика</a><a href="/about">О проекте</a><a href="/account">Личный кабинет</a></nav></div><div class="site-footer-bottom"><span>Независимый учебный проект. Задания из открытого банка ФИПИ.</span><a href="/privacy">Политика конфиденциальности</a></div></footer>`;
}

module.exports = {UI_HEAD, renderSiteHeader, renderSiteFooter, renderStudyHero, renderSubjectSwitch, renderStudyBenefits, renderStudyGuide, renderStudyFaq, icon};
