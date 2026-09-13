const http = require('node:http');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const runFile = promisify(execFile);

const PORT = 8765;
const PROJECT = 'AC437B34557F88EA4115D2F374B0A07B';
const FIPI_ENDPOINT = 'https://ege.fipi.ru/bank/questions.php';
const ADDED_FILE = path.join(__dirname, 'added-history.json');
const ASSET_ROOT = path.join(__dirname, 'fipi-assets');

const cache = new Map();
const added = { stereometry: [], planimetry: [], parameters: [], equations: [], inequalities: [], optimal: [], numbers: [], finance: [] };
try {
  const saved = JSON.parse(fsSync.readFileSync(ADDED_FILE, 'utf8'));
  for (const section of Object.keys(added)) {
    if (Array.isArray(saved[section])) added[section] = saved[section];
  }
} catch { /* Истории ещё нет — это нормальный первый запуск. */ }

async function saveAddedHistory() {
  await fs.writeFile(ADDED_FILE, JSON.stringify(added, null, 2), 'utf8');
}

function taskIds(html) {
  return new Set(Array.from(html.matchAll(/<div\s+class=['"][^'"]*qblock[^'"]*['"]\s+id=['"]q([A-Z0-9]+)['"]/gi), match => match[1]));
}

function filterOptimalHtml(html) {
  const chunks = html.split(/(?=<div\s+class=['"]qblock)/i);
  const prefix = chunks.shift() || '';
  const selected = chunks.filter(chunk => {
    const text = chunk.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').toLowerCase();
    const optimization = /(наибольш|наименьш|максимальн|минимальн).{0,1600}(прибыл|выруч|затрат|окуп|производств|завод|фирм|предприят)|(?:прибыл|выруч|затрат|окуп|производств|завод|фирм|предприят).{0,1600}(наибольш|наименьш|максимальн|минимальн)/.test(text);
    return optimization && !/кредит|банк|вклад|за[её]м|долг|плат[её]ж/.test(text);
  });
  return `${prefix}${selected.join('')} </body></html>`;
}

function filterOptimalHtml(html) {
  const chunks = html.split(/(?=<div\s+class=['"]qblock)/i);
  const prefix = chunks.shift() || '';
  const selected = chunks.filter(chunk => {
    const text = chunk
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .toLowerCase();
    const optimization = /(наибольш|наименьш|максимальн|минимальн).{0,1600}(прибыл|выруч|затрат|окуп|производств|завод|фирм|предприят)|(?:прибыл|выруч|затрат|окуп|производств|завод|фирм|предприят).{0,1600}(наибольш|наименьш|максимальн|минимальн)/.test(text);
    return optimization && !/кредит|банк|вклад|за[её]м|долг|плат[её]ж/.test(text);
  });
  return `${prefix}${selected.join('')} </body></html>`;
}

function decorate(html, section, onlyAdded = null) {
  const isPlane = section === 'planimetry';
  const isParameters = section === 'parameters';
  const isEquations = section === 'equations';
  const isInequalities = section === 'inequalities';
  const isOptimal = section === 'optimal';
  const isNumbers = section === 'numbers';
  const isFinance = section === 'finance';
  const baseTitle = isFinance ? 'Финансовая математика' : (isNumbers ? 'Числа и их свойства' : (isOptimal ? 'Оптимальный выбор' : (isInequalities ? 'Неравенства' : (isEquations ? 'Уравнения' : (isParameters ? 'Задачи с параметром' : (isPlane ? 'Планиметрия' : 'Стереометрия'))))));
  const title = onlyAdded ? `Добавленные задачи — ${baseTitle.toLowerCase()}` : `${baseTitle} — задания второй части`;
  const subtitle = isFinance
    ? 'ФИПИ · сложные проценты и прогрессии · развёрнутый ответ · проверенная подборка'
    : (isNumbers
    ? 'ФИПИ · тема 1.1 · развёрнутый ответ · проверенная подборка'
    : (isOptimal
    ? 'ФИПИ · задачи на оптимальный выбор · развёрнутый ответ · 2 задания'
    : (isInequalities
    ? 'ФИПИ · темы 2.5–2.9 · развёрнутый ответ · проверенная подборка'
    : (isEquations
    ? 'ФИПИ · темы 2.1–2.4 и 2.9 · развёрнутый ответ · проверенная подборка'
    : (isParameters
    ? 'ФИПИ · тема 2.10 · развёрнутый ответ · 64 задания'
    : (isPlane
      ? 'ФИПИ · тема 7.1 · развёрнутый ответ · 92 задания'
      : 'ФИПИ · темы 7.2–7.5 · развёрнутый ответ · 66 заданий'))))));
  const fixed = html
    .replace(/<script[^>]+src=["'][^"']*mathjax[^"']*["'][^>]*><\/script>/gi, '')
    .replace(/<script[^>]+src=["'][^"']*mml-chtml\.js[^"']*["'][^>]*><\/script>/gi, '')
    .replaceAll('<m:', '<')
    .replaceAll('</m:', '</')
    .replaceAll('href="../../', 'href="/fipi/')
    .replaceAll("href='../../", "href='/fipi/")
    .replaceAll('src="../../', 'src="/fipi/')
    .replaceAll("src='../../", "src='/fipi/")
    .replaceAll('var home_directory="../../";', 'var home_directory="/fipi/";')
    .replaceAll("var qfiles_location='../../';", "var qfiles_location='/fipi/';")
    .replaceAll('<IMG SRC=', '<IMG loading="lazy" SRC=')
    .replaceAll('<img src=', '<img loading="lazy" src=');

  const localStyle = `
  <style>
    html.added-loading .task-header-panel,
    html.added-loading .qblock { display: none !important; }
    html.page-loading .task-header-panel,
    html.page-loading .qblock,
    html.page-loading .local-pager { visibility: hidden !important; }
    html.page-loading body::after { content: 'Подготовка заданий…'; display: block; margin: 36px auto; text-align: center;
      color: #526273; font: 15px Arial, sans-serif; }
    math { font-family: 'Cambria Math', 'STIX Two Math', serif; }
    body.questions-container { max-width: 1000px; margin: 0 auto; padding: 24px; background: #f4f6f8; }
    body.questions-container > table { background: white; box-shadow: 0 2px 14px #00000018; }
    .local-header { position: sticky; top: 0; z-index: 50; margin: -24px -24px 20px; padding: 14px 24px;
      background: #183153; color: white; font: 600 16px/1.35 Arial, sans-serif; box-shadow: 0 2px 8px #0003; }
    .local-header small { display: block; margin-top: 3px; font-weight: 400; opacity: .82; }
    .local-menu { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; margin-top: 10px; }
    .local-menu a { padding: 7px 8px; border: 1px solid #ffffff70; border-radius: 6px; color: white; text-decoration: none;
      font-weight: 500; text-align: center; white-space: normal; }
    .local-menu a:hover { background: #ffffff18; }
    .local-menu a.active { background: white; color: #183153; }
    .local-menu form { margin: 0; min-width: 0; }
    .local-menu button { padding: 7px 11px; border: 1px solid #ffffff70; border-radius: 6px; color: white;
      background: transparent; font: 500 14px Arial, sans-serif; cursor: pointer; width: 100%; height: 100%; white-space: normal; }
    .local-menu button:hover { background: #ffffff18; }
    .local-pager { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 7px;
      margin: 18px 0; padding: 12px; background: white; border-radius: 8px; box-shadow: 0 1px 7px #00000015;
      font: 14px Arial, sans-serif; }
    .local-pager button { min-width: 38px; padding: 8px 11px; border: 1px solid #b8c3d1; border-radius: 6px;
      background: white; color: #183153; cursor: pointer; }
    .local-pager button:hover:not(:disabled) { background: #eaf1f8; }
    .local-pager button.active { border-color: #183153; background: #183153; color: white; }
    .local-pager button:disabled { cursor: default; opacity: .4; }
    .local-page-label { margin: 0 6px; color: #4b5968; }
    .local-task-hidden { display: none !important; }
    @media print { .local-header { position: static; margin: 0 0 16px; } body.questions-container { background: white; padding: 0; } }
  </style>`;
  const loadingGuard = `<script>document.documentElement.classList.add('page-loading'${onlyAdded ? ", 'added-loading'" : ''});</script>`;
  const pageTitle = `<title>${title}</title>`;
  const header = `<div class="local-header">${title}
    <small>${subtitle}</small>
    <nav class="local-menu">
      <a href="/equations" class="${isEquations ? 'active' : ''}">Уравнения</a>
      <a href="/" class="${!isPlane && !isParameters && !isEquations && !isInequalities && !isOptimal && !isNumbers && !isFinance ? 'active' : ''}">Стереометрия</a>
      <a href="/inequalities" class="${isInequalities ? 'active' : ''}">Неравенства</a>
      <a href="/finance" class="${isFinance ? 'active' : ''}">Финансовая математика</a>
      <a href="/optimal" class="${isOptimal ? 'active' : ''}">Оптимальный выбор</a>
      <a href="/planimetry" class="${isPlane ? 'active' : ''}">Планиметрия</a>
      <a href="/parameters" class="${isParameters ? 'active' : ''}">Задачи с параметром</a>
      <a href="/numbers" class="${isNumbers ? 'active' : ''}">Числа и их свойства</a>
      <a href="/added?section=${section}" class="${onlyAdded ? 'active' : ''}">Добавленные задачи</a>
      <form method="post" action="/update?section=${section}"><button type="submit">↻ Обновить из ФИПИ</button></form>
    </nav></div>`;
  const pagerScript = `<script>
  window.addEventListener('DOMContentLoaded', function () {
    let currentPage = 1;
    let resizeTimer;
    let pages = [];
    const headers = Array.from(document.querySelectorAll('.task-header-panel')).map(el => el.parentElement);
    const allowedIds = ${JSON.stringify(onlyAdded)};
    const section = ${JSON.stringify(section)};
    function relevant(task) {
      const text = (task.content?.innerText || task.content?.textContent || '').replace(/\\s+/g, ' ').toLowerCase();
      const meta = (task.header.innerText || task.header.textContent || '').replace(/\\s+/g, ' ').toLowerCase();
      if (section === 'equations') {
        return /решите (?:данное )?(?:уравнение|систему уравнений)|найдите (?:все )?(?:корни|решения) уравнения/.test(text);
      }
      if (section === 'inequalities') {
        return /решите (?:данное )?(?:неравенство|систему неравенств|совокупность неравенств)|найдите (?:все )?решения неравенства/.test(text);
      }
      if (section === 'parameters') {
        // Метка КЭС 2.10 уже однозначно обозначает задачи с параметром.
        return true;
      }
      if (section === 'optimal') {
        const optimization = /(наибольш|наименьш|максимальн|минимальн).*(прибыл|выруч|затрат|окуп|производств|завод|фирм|предприят)|(?:прибыл|выруч|затрат|окуп|производств|завод|фирм|предприят).*(наибольш|наименьш|максимальн|минимальн)/.test(text);
        const financial = /кредит|банк|вклад|за[её]м|долг|плат[её]ж/.test(text);
        return optimization && !financial;
      }
      if (section === 'numbers') {
        const numberTopic = /натуральн|цел(?:ое|ых|ые|ыми)|делит|кратн|прост(?:ое|ых|ые)|остат|цифр|числ|дроб/.test(text);
        const unrelated = /кредит|банк|вклад|рубл|заём|прибыл|производств|пирами|призм|тетраэдр/.test(text);
        return numberTopic && !unrelated;
      }
      if (section === 'finance') {
        return /кредит|банк|вклад|заём|долг|плат[её]ж|процентн.{0,20}ставк|ценн.{0,10}бумаг|пенсионн.{0,10}фонд/.test(text);
      }
      if (section === 'planimetry') {
        return !/7\\.2 прямые и плоскости в пространстве|7\\.3 многогранники|7\\.4 тела и поверхности вращения/.test(meta);
      }
      if (section === 'stereometry') {
        return /7\\.2 прямые и плоскости в пространстве|7\\.3 многогранники|7\\.4 тела и поверхности вращения/.test(meta);
      }
      return true;
    }
    const tasks = headers.map(header => {
      const id = header.id.replace(/^i/, '');
      return { header, content: document.getElementById('q' + id) };
    }).filter(task => {
      const id = task.header.id.replace(/^i/, '');
      const keep = (!allowedIds || allowedIds.includes(id)) && relevant(task);
      if (!keep) {
        task.header.classList.add('local-task-hidden');
        if (task.content) task.content.classList.add('local-task-hidden');
      }
      return keep;
    });
    document.documentElement.classList.remove('added-loading');
    const bottom = document.createElement('div');
    bottom.id = 'local-pager-bottom';
    bottom.className = 'local-pager';
    document.body.appendChild(bottom);
    if (!tasks.length) {
      bottom.textContent = 'Новых задач после последнего обновления нет.';
      document.documentElement.classList.remove('page-loading');
      return;
    }

    function drawPager(container, current) {
      const pageCount = pages.length;
      container.replaceChildren();
      const add = (label, page, disabled, active) => {
        const button = document.createElement('button');
        button.textContent = label;
        button.disabled = disabled;
        if (active) button.className = 'active';
        button.addEventListener('click', () => showPage(page, true));
        container.appendChild(button);
      };
      add('← Назад', current - 1, current === 1, false);
      for (let page = 1; page <= pageCount; page++) add(String(page), page, false, page === current);
      add('Вперёд →', current + 1, current === pageCount, false);
      const label = document.createElement('span');
      label.className = 'local-page-label';
      label.textContent = 'Страница ' + current + ' из ' + pageCount + ' · на этой странице: ' + pages[current - 1].length + ' · всего: ' + tasks.length;
      container.appendChild(label);
    }

    function showPage(page, scroll) {
      const pageCount = pages.length;
      page = Math.max(1, Math.min(pageCount, page));
      currentPage = page;
      const visible = new Set(pages[page - 1]);
      tasks.forEach((task, index) => {
        const hidden = !visible.has(index);
        task.header.classList.toggle('local-task-hidden', hidden);
        if (task.content) task.content.classList.toggle('local-task-hidden', hidden);
      });
      drawPager(bottom, page);
      history.replaceState(null, '', '#page=' + page);
      if (scroll) window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function measureAndBuildPages(anchorTask) {
      // Сначала показываем все блоки, чтобы измерить их фактическую высоту
      // при текущей ширине окна и масштабе браузера.
      tasks.forEach(task => {
        task.header.classList.remove('local-task-hidden');
        if (task.content) task.content.classList.remove('local-task-hidden');
      });

      const chromeHeight = document.querySelector('.local-header').getBoundingClientRect().height
        + bottom.getBoundingClientRect().height + 120;
      const available = Math.max(320, window.innerHeight - chromeHeight);
      const heights = tasks.map(task => {
        const headerRect = task.header.getBoundingClientRect();
        const contentRect = task.content ? task.content.getBoundingClientRect() : headerRect;
        return Math.max(headerRect.height + contentRect.height, contentRect.bottom - headerRect.top) + 28;
      });

      pages = [];
      let page = [];
      let used = 0;
      heights.forEach((height, index) => {
        if (page.length && used + height > available) {
          pages.push(page);
          page = [];
          used = 0;
        }
        page.push(index);
        used += height;
      });
      if (page.length) pages.push(page);

      const nextPage = Math.max(0, pages.findIndex(group => group.includes(anchorTask))) + 1;
      showPage(nextPage, false);
    }

    function adaptToViewport() {
      const anchorTask = pages[currentPage - 1]?.[0] || 0;
      measureAndBuildPages(anchorTask);
    }

    const initial = Number((location.hash.match(/page=(\\d+)/) || [])[1]) || 1;
    measureAndBuildPages(0);
    showPage(initial, false);
    // Показываем интерфейс сразу, не ожидая загрузки всех ресурсов скрытых страниц.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        document.documentElement.classList.remove('page-loading');
      });
    });
    // После загрузки видимых картинок незаметно уточняем разбиение.
    window.addEventListener('load', function () {
      adaptToViewport();
    }, { once: true });
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(adaptToViewport, 160);
    });
  });
  </script>`;
  return fixed
    .replace(/<title>[\s\S]*?<\/title>/i, pageTitle)
    .replace('</head>', `${loadingGuard}${localStyle}</head>`)
    .replace(/<body([^>]*)>/i, `<body$1>${header}`)
    .replace('</body>', `${pagerScript}</body>`);
}

async function loadQuestions(section, onlyAdded = false) {
  const cacheKey = `${section}:${onlyAdded ? 'added' : 'all'}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  let html;
  if (section === 'optimal') {
    const parts = await Promise.all(Array.from({ length: 5 }, (_, index) =>
      fs.readFile(path.join(__dirname, `optimal-all-${index + 1}.raw.html`))));
    const decoded = parts.map(bytes => new TextDecoder('windows-1251').decode(bytes));
    html = decoded[0];
    for (const extra of decoded.slice(1)) {
      const body = (extra.match(/<body[^>]*>([\s\S]*?)<\/body>/i) || ['', ''])[1];
      html = html.replace('</body>', `${body}</body>`);
    }
    html = filterOptimalHtml(html);
    html = filterOptimalHtml(html);
  } else if (section === 'equations' || section === 'inequalities') {
    const prefix = section === 'equations' ? 'equations' : 'inequalities';
    const first = new TextDecoder('windows-1251').decode(await fs.readFile(path.join(__dirname, `${prefix}-1.raw.html`)));
    const second = new TextDecoder('windows-1251').decode(await fs.readFile(path.join(__dirname, `${prefix}-2.raw.html`)));
    const secondBody = (second.match(/<body[^>]*>([\s\S]*?)<\/body>/i) || ['', ''])[1];
    html = first.replace('</body>', `${secondBody}</body>`);
  } else {
    const filename = section === 'finance' ? 'finance.raw.html'
      : (section === 'numbers' ? 'numbers.raw.html'
        : (section === 'parameters' ? 'parameters.raw.html'
          : (section === 'planimetry' ? 'planimetry.raw.html' : 'questions.raw.html')));
    const bytes = await fs.readFile(path.join(__dirname, filename));
    html = new TextDecoder('windows-1251').decode(bytes);
  }
  const page = decorate(html, section, onlyAdded ? added[section] : null);
  cache.set(cacheKey, page);
  return page;
}

async function refreshSection(section) {
  const isPlane = section === 'planimetry';
  const isParameters = section === 'parameters';
  const isEquations = section === 'equations';
  const isInequalities = section === 'inequalities';
  const isOptimal = section === 'optimal';
  const isNumbers = section === 'numbers';
  const isFinance = section === 'finance';
  if (isOptimal) {
    const targets = Array.from({ length: 5 }, (_, index) => path.join(__dirname, `optimal-all-${index + 1}.raw.html`));
    const oldParts = await Promise.all(targets.map(file => fs.readFile(file)));
    const oldHtml = oldParts.map(bytes => new TextDecoder('windows-1251').decode(bytes)).join('\n');
    for (let index = 0; index < targets.length; index++) {
      const temporary = `${targets[index]}.new`;
      const pagePart = index > 0 ? `;$body.page='${index}'` : '';
      const command = `$body=@{search='1';pagesize='100';proj='${PROJECT}';qkind='ILI_STD_FULL'}${pagePart}; Invoke-WebRequest -Uri '${FIPI_ENDPOINT}' -Method Post -Body $body -UseBasicParsing -OutFile '${temporary.replaceAll("'", "''")}' -TimeoutSec 60`;
      await runFile('powershell.exe', ['-NoProfile', '-Command', command], { timeout: 70000, windowsHide: true });
      await fs.copyFile(temporary, targets[index]);
      await fs.unlink(temporary);
    }
    const newParts = await Promise.all(targets.map(file => fs.readFile(file)));
    const newHtml = newParts.map(bytes => new TextDecoder('windows-1251').decode(bytes)).join('\n');
    const oldIds = taskIds(oldHtml);
    const discovered = Array.from(taskIds(newHtml)).filter(id => !oldIds.has(id));
    added[section] = Array.from(new Set([...added[section], ...discovered]));
    return;
  }
  if (isEquations || isInequalities) {
    const prefix = isEquations ? 'equations' : 'inequalities';
    const theme = isEquations ? '2.1,2.2,2.3,2.4,2.9' : '2.5,2.6,2.7,2.8,2.9';
    const targets = [`${prefix}-1.raw.html`, `${prefix}-2.raw.html`].map(name => path.join(__dirname, name));
    const oldParts = await Promise.all(targets.map(file => fs.readFile(file)));
    const oldHtml = oldParts.map(bytes => new TextDecoder('windows-1251').decode(bytes)).join('\n');
    for (let index = 0; index < targets.length; index++) {
      const temporary = `${targets[index]}.new`;
      const pagePart = index === 1 ? ";$body.page='1'" : '';
      const command = `$body=@{search='1';pagesize='100';proj='${PROJECT}';theme='${theme}';qkind='ILI_STD_FULL'}${pagePart}; Invoke-WebRequest -Uri '${FIPI_ENDPOINT}' -Method Post -Body $body -UseBasicParsing -OutFile '${temporary.replaceAll("'", "''")}' -TimeoutSec 60`;
      await runFile('powershell.exe', ['-NoProfile', '-Command', command], { timeout: 70000, windowsHide: true });
      await fs.copyFile(temporary, targets[index]);
      await fs.unlink(temporary);
    }
    const newParts = await Promise.all(targets.map(file => fs.readFile(file)));
    const newHtml = newParts.map(bytes => new TextDecoder('windows-1251').decode(bytes)).join('\n');
    const oldIds = taskIds(oldHtml);
    const discovered = Array.from(taskIds(newHtml)).filter(id => !oldIds.has(id));
    added[section] = Array.from(new Set([...added[section], ...discovered]));
    return;
  }
  const filename = isFinance ? 'finance.raw.html'
    : (isNumbers ? 'numbers.raw.html'
      : (isOptimal ? 'optimal.raw.html'
        : (isParameters ? 'parameters.raw.html' : (isPlane ? 'planimetry.raw.html' : 'questions.raw.html'))));
  
  const target = path.join(__dirname, filename);
  const temporary = `${target}.new`;
  const oldHtml = new TextDecoder('windows-1251').decode(await fs.readFile(target));
  const theme = isFinance ? '3.8'
    : (isNumbers ? '1.1' : (isOptimal ? '3.2' : (isParameters ? '2.10' : (isPlane ? '7.1' : '7.2,7.3,7.4,7.5'))));
  const command = `$body=@{search='1';pagesize='100';proj='${PROJECT}';theme='${theme}';qkind='ILI_STD_FULL'}; Invoke-WebRequest -Uri '${FIPI_ENDPOINT}' -Method Post -Body $body -UseBasicParsing -OutFile '${temporary.replaceAll("'", "''")}' -TimeoutSec 60`;
  await runFile('powershell.exe', ['-NoProfile', '-Command', command], { timeout: 70000, windowsHide: true });
  const newBytes = await fs.readFile(temporary);
  const newHtml = new TextDecoder('windows-1251').decode(newBytes);
  const oldIds = taskIds(oldHtml);
  const discovered = Array.from(taskIds(newHtml)).filter(id => !oldIds.has(id));
  added[section] = Array.from(new Set([...added[section], ...discovered]));
  await fs.copyFile(temporary, target);
  await fs.unlink(temporary);
}

async function refreshAll() {
  await refreshSection('stereometry');
  await refreshSection('planimetry');
  await refreshSection('parameters');
  await refreshSection('equations');
  await refreshSection('inequalities');
  await refreshSection('optimal');
  await refreshSection('numbers');
  await refreshSection('finance');
  await runFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'cache-assets.ps1')], {
    timeout: 180000,
    windowsHide: true
  });
  await saveAddedHistory();
  cache.clear();
}

http.createServer(async (req, res) => {
  if (req.url === '/favicon.ico') { res.writeHead(204); return res.end(); }
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = requestUrl.pathname;
    if (pathname.startsWith('/fipi/')) {
      const relative = decodeURIComponent(pathname.slice('/fipi/'.length)).replaceAll('/', path.sep);
      const assetPath = path.resolve(ASSET_ROOT, relative);
      if (!assetPath.startsWith(path.resolve(ASSET_ROOT) + path.sep)) {
        res.writeHead(403);
        return res.end('Forbidden');
      }
      const extensions = {
        '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
        '.png': 'image/png', '.gif': 'image/gif', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
        '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2'
      };
      try {
        const data = await fs.readFile(assetPath);
        res.writeHead(200, { 'content-type': extensions[path.extname(assetPath).toLowerCase()] || 'application/octet-stream', 'cache-control': 'public, max-age=31536000' });
        return res.end(data);
      } catch {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
        return res.end('Локальный ресурс не найден. Нажмите «Обновить из ФИПИ».');
      }
    }
    const requestedSection = requestUrl.searchParams.get('section');
    const section = pathname === '/finance' || requestedSection === 'finance'
      ? 'finance'
      : (pathname === '/numbers' || requestedSection === 'numbers'
        ? 'numbers'
        : (pathname === '/optimal' || requestedSection === 'optimal'
        ? 'optimal'
        : (pathname === '/inequalities' || requestedSection === 'inequalities'
        ? 'inequalities'
        : (pathname === '/equations' || requestedSection === 'equations'
          ? 'equations'
          : (pathname === '/parameters' || requestedSection === 'parameters'
            ? 'parameters'
            : (pathname === '/planimetry' || requestedSection === 'planimetry' ? 'planimetry' : 'stereometry'))))));
    if (pathname === '/update' && req.method === 'POST') {
      await refreshAll();
      res.writeHead(303, { location: `/added?section=${section}` });
      return res.end();
    }
    const page = await loadQuestions(section, pathname === '/added');
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(page);
  } catch (error) {
    res.writeHead(502, { 'content-type': 'text/html; charset=utf-8' });
    res.end(`<h1>Не удалось загрузить задания ФИПИ</h1><pre>${String(error.message)}</pre>`);
  }
}).listen(PORT, '127.0.0.1', async () => {
  console.log(`Стереометрия ФИПИ: http://localhost:${PORT}`);
  const sections = ['stereometry', 'planimetry', 'parameters', 'equations', 'inequalities', 'optimal', 'numbers', 'finance'];
  await Promise.all(sections.map(section => loadQuestions(section).catch(() => null)));
});
