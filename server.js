const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');
const { createHmac, timingSafeEqual, randomBytes, scryptSync } = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const PORT = Number(process.env.PORT || 8765);
const PROJECT = 'AC437B34557F88EA4115D2F374B0A07B';
const PHYSICS_PROJECT = 'BA1F39653304A5B041B656915DC36B38';
const FIPI_ENDPOINT = 'https://ege.fipi.ru/bank/questions.php';
const ADDED_FILE = path.join(__dirname, 'added-history.json');
const ASSET_ROOT = path.join(__dirname, 'fipi-assets');
const STORAGE_ROOT = path.join(__dirname, 'storage');
const SOLUTIONS_DB_FILE = path.join(STORAGE_ROOT, 'solutions.sqlite');
const ADMIN_PASSWORD_FILE = process.env.EGE_ADMIN_PASSWORD_FILE || '/etc/ege-math-admin-password';
const ADMIN_SESSION_COOKIE = 'ege_math_admin';
const ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60;
const USER_SESSION_COOKIE = 'ege_math_user';
const USER_SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
const MAX_COMMENT_LENGTH = 2_000;
const MAX_FEEDBACK_LENGTH = 2_000;
const COMMENTS_WIDGET_LIMIT = 100;
const SITE_ORIGIN = 'https://ege-fipi.ru';
const TELEGRAM_CHANNEL_URL = 'https://t.me/leon_358';
const TELEGRAM_USERNAME = '@leon_358';
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY || '';
const TURNSTILE_SITE_KEY = process.env.TURNSTILE_SITE_KEY || '';
const TURNSTILE_HOSTNAMES = new Set(['ege-fipi.ru', 'www.ege-fipi.ru']);
const PUBLIC_SECTIONS = ['stereometry', 'planimetry', 'parameters', 'equations', 'inequalities', 'optimal', 'numbers', 'finance', 'physics'];
const FIPI_PAGE_SIZE = 100;
const FIPI_SOURCES = {
  stereometry: { firstFile: 'questions.raw.html', extraPrefix: 'questions', theme: '7.2,7.3,7.4,7.5' },
  planimetry: { firstFile: 'planimetry.raw.html', extraPrefix: 'planimetry', theme: '7.1' },
  parameters: { firstFile: 'parameters.raw.html', extraPrefix: 'parameters', theme: '2.10' },
  equations: { firstFile: 'equations-1.raw.html', extraPrefix: 'equations', theme: '2.1,2.2,2.3,2.4,2.9' },
  inequalities: { firstFile: 'inequalities-1.raw.html', extraPrefix: 'inequalities', theme: '2.5,2.6,2.7,2.8,2.9' },
  optimal: { firstFile: 'optimal-all-1.raw.html', extraPrefix: 'optimal-all', theme: '' },
  numbers: { firstFile: 'numbers.raw.html', extraPrefix: 'numbers', theme: '1.1' },
  finance: { firstFile: 'finance.raw.html', extraPrefix: 'finance', theme: '3.8' },
  physics: { firstFile: 'physics-1.raw.html', extraPrefix: 'physics', theme: '', project: PHYSICS_PROJECT }
};
const SECTION_INFO = {
  stereometry: { name: 'Стереометрия', path: '/', topic: 'стереометрии', description: 'Задачи по стереометрии из открытого банка ФИПИ: условия, ответы и подробные решения.' },
  planimetry: { name: 'Планиметрия', path: '/planimetry', topic: 'планиметрии', description: 'Задачи по планиметрии из открытого банка ФИПИ: условия, ответы и подробные решения.' },
  parameters: { name: 'Задачи с параметром', path: '/parameters', topic: 'задачам с параметром', description: 'Задачи с параметром из открытого банка ФИПИ: условия, ответы и подробные решения.' },
  equations: { name: 'Уравнения', path: '/equations', topic: 'уравнениям', description: 'Уравнения профильного ЕГЭ из открытого банка ФИПИ: условия, ответы и подробные решения.' },
  inequalities: { name: 'Неравенства', path: '/inequalities', topic: 'неравенствам', description: 'Неравенства профильного ЕГЭ из открытого банка ФИПИ: условия, ответы и подробные решения.' },
  optimal: { name: 'Оптимальный выбор', path: '/optimal', topic: 'задачам на оптимальный выбор', description: 'Задачи на оптимальный выбор из открытого банка ФИПИ: условия, ответы и подробные решения.' },
  numbers: { name: 'Числа и их свойства', path: '/numbers', topic: 'числам и их свойствам', description: 'Задачи по числам и их свойствам из открытого банка ФИПИ: условия, ответы и подробные решения.' },
  finance: { name: 'Финансовая математика', path: '/finance', topic: 'финансовой математике', description: 'Финансовые задачи профильного ЕГЭ из открытого банка ФИПИ: условия, ответы и подробные решения.' },
  physics: { name: 'Физика', path: '/physics', topic: 'физике', description: 'Все задания ЕГЭ по физике с развёрнутым ответом из открытого банка ФИПИ.' }
};
const PHYSICS_TOPICS = [
  { code: '1', name: 'Механика', children: [
    ['1.1', 'Кинематика'], ['1.2', 'Динамика'], ['1.3', 'Статика'],
    ['1.4', 'Законы сохранения'], ['1.5', 'Колебания и волны']
  ] },
  { code: '2', name: 'Молекулярная физика и термодинамика', children: [
    ['2.1', 'Молекулярная физика'], ['2.2', 'Термодинамика']
  ] },
  { code: '3', name: 'Электродинамика', children: [
    ['3.1', 'Электрическое поле'], ['3.2', 'Постоянный ток'], ['3.3', 'Магнитное поле'],
    ['3.4', 'Электромагнитная индукция'], ['3.5', 'Электромагнитные колебания и волны'], ['3.6', 'Оптика']
  ] },
  { code: '4', name: 'Квантовая физика', children: [
    ['4.1', 'Корпускулярно-волновой дуализм'], ['4.2', 'Физика атома'], ['4.3', 'Физика атомного ядра']
  ] }
];
const YANDEX_METRIKA_HEAD = `<!-- Yandex.Metrika counter -->
<script type="text/javascript">
    (function(m,e,t,r,i,k,a){
        m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
        m[i].l=1*new Date();
        for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
        k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
    })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=112561663', 'ym');

    ym(112561663, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});
</script>
<!-- /Yandex.Metrika counter -->`;
const YANDEX_METRIKA_NOSCRIPT = `<noscript><div><img src="https://mc.yandex.ru/watch/112561663" style="position:absolute; left:-9999px;" alt="" /></div></noscript>`;
const SITE_ICON_HEAD = '<link rel="icon" type="image/svg+xml" sizes="any" href="/favicon.svg">';
const SITE_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" role="img" aria-label="ЕГЭ ФИПИ"><rect width="192" height="192" rx="38" fill="#183153"/><path fill="#f0b429" d="M38 42h116v24H65v29h75v23H65v32h89v24H38z"/><text x="96" y="87" text-anchor="middle" fill="#fff" font-family="Arial, sans-serif" font-size="30" font-weight="700">ЕГЭ</text></svg>`;

function requestFipi(url, options = {}) {
  const target = new URL(url);
  if (target.hostname !== 'ege.fipi.ru') return Promise.reject(new Error('Разрешены запросы только к ege.fipi.ru'));
  const body = options.body ? Buffer.from(String(options.body)) : null;
  return new Promise((resolve, reject) => {
    const request = https.request(target, {
      method: options.method || 'GET',
      headers: body ? {
        'content-type': 'application/x-www-form-urlencoded',
        'content-length': body.length
      } : {},
      // Сервер ФИПИ периодически отдаёт неполную цепочку сертификатов.
      // Ограничение hostname выше не позволяет использовать этот режим для других узлов.
      rejectUnauthorized: false,
      timeout: 60_000
    }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => {
        const bytes = Buffer.concat(chunks);
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`ФИПИ вернул HTTP ${response.statusCode}`));
        } else {
          resolve(bytes);
        }
      });
    });
    request.on('timeout', () => request.destroy(new Error('Тайм-аут запроса к ФИПИ')));
    request.on('error', reject);
    if (body) request.write(body);
    request.end();
  });
}

fsSync.mkdirSync(STORAGE_ROOT, { recursive: true });
const solutionsDb = new DatabaseSync(SOLUTIONS_DB_FILE);
solutionsDb.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA busy_timeout = 5000;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS solutions (
    task_id TEXT PRIMARY KEY,
    answer TEXT NOT NULL DEFAULT '',
    solution TEXT NOT NULL,
    diagram_svg TEXT NOT NULL DEFAULT '',
    diagram_caption TEXT NOT NULL DEFAULT '',
    published INTEGER NOT NULL DEFAULT 0 CHECK (published IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS solutions_published_updated_idx ON solutions (published, updated_at DESC);
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    full_name TEXT NOT NULL,
    city TEXT NOT NULL,
    email TEXT NOT NULL COLLATE NOCASE UNIQUE,
    password_hash TEXT NOT NULL,
    consent_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS solution_comments (
    id INTEGER PRIMARY KEY,
    task_id TEXT NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS solution_comments_task_created_idx ON solution_comments (task_id, created_at ASC);
  CREATE INDEX IF NOT EXISTS solution_comments_user_created_idx ON solution_comments (user_id, created_at DESC);
  CREATE TABLE IF NOT EXISTS site_feedback (
    id INTEGER PRIMARY KEY,
    task_id TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('suggestion', 'issue')),
    body TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS site_feedback_created_idx ON site_feedback (created_at DESC, id DESC);
`);
const solutionColumns = new Set(solutionsDb.prepare('PRAGMA table_info(solutions)').all().map(column => column.name));
if (!solutionColumns.has('diagram_svg')) {
  solutionsDb.exec("ALTER TABLE solutions ADD COLUMN diagram_svg TEXT NOT NULL DEFAULT ''");
}
if (!solutionColumns.has('diagram_caption')) {
  solutionsDb.exec("ALTER TABLE solutions ADD COLUMN diagram_caption TEXT NOT NULL DEFAULT ''");
}

const getPublishedSolution = solutionsDb.prepare(`
  SELECT task_id, answer, solution, diagram_svg, diagram_caption, updated_at
  FROM solutions
  WHERE task_id = ? AND published = 1
`);
const getSolutionForAdmin = solutionsDb.prepare(`
  SELECT task_id, answer, solution, diagram_svg, diagram_caption, published, created_at, updated_at
  FROM solutions
  WHERE task_id = ?
`);
const listSolutionsForAdmin = solutionsDb.prepare(`
  SELECT task_id, answer, published, updated_at
  FROM solutions
  ORDER BY updated_at DESC
  LIMIT 100
`);
const listPublishedSolutionDates = solutionsDb.prepare(`
  SELECT task_id, updated_at
  FROM solutions
  WHERE published = 1
`);
const listPublishedSolutionIds = solutionsDb.prepare(`
  SELECT task_id
  FROM solutions
  WHERE published = 1
`);
const saveSolution = solutionsDb.prepare(`
  INSERT INTO solutions (task_id, answer, solution, diagram_svg, diagram_caption, published, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(task_id) DO UPDATE SET
    answer = excluded.answer,
    solution = excluded.solution,
    diagram_svg = excluded.diagram_svg,
    diagram_caption = excluded.diagram_caption,
    published = excluded.published,
    updated_at = excluded.updated_at
`);
const getUserById = solutionsDb.prepare(`
  SELECT id, full_name, city, email, password_hash, consent_at, created_at
  FROM users
  WHERE id = ?
`);
const getUserByEmail = solutionsDb.prepare(`
  SELECT id, full_name, city, email, password_hash, consent_at, created_at
  FROM users
  WHERE email = ?
`);
const createUser = solutionsDb.prepare(`
  INSERT INTO users (full_name, city, email, password_hash, consent_at, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);
const listCommentsForTask = solutionsDb.prepare(`
  SELECT solution_comments.id, solution_comments.task_id, solution_comments.user_id, solution_comments.body, solution_comments.created_at,
         users.full_name, users.city
  FROM solution_comments
  JOIN users ON users.id = solution_comments.user_id
  WHERE solution_comments.task_id = ?
  ORDER BY solution_comments.created_at ASC, solution_comments.id ASC
`);
const listCommentsForUser = solutionsDb.prepare(`
  SELECT solution_comments.id, solution_comments.task_id, solution_comments.body, solution_comments.created_at
  FROM solution_comments
  WHERE solution_comments.user_id = ?
  ORDER BY solution_comments.created_at DESC, solution_comments.id DESC
  LIMIT 100
`);
const countCommentsForUser = solutionsDb.prepare(`
  SELECT COUNT(*) AS total
  FROM solution_comments
  WHERE user_id = ?
`);
const countPublicComments = solutionsDb.prepare(`
  SELECT COUNT(*) AS total
  FROM solution_comments
  JOIN solutions ON solutions.task_id = solution_comments.task_id AND solutions.published = 1
`);
const listRecentPublicComments = solutionsDb.prepare(`
  SELECT solution_comments.id, solution_comments.task_id, solution_comments.user_id, solution_comments.body, solution_comments.created_at,
         users.full_name, users.city
  FROM solution_comments
  JOIN users ON users.id = solution_comments.user_id
  JOIN solutions ON solutions.task_id = solution_comments.task_id AND solutions.published = 1
  ORDER BY solution_comments.created_at DESC, solution_comments.id DESC
  LIMIT ${COMMENTS_WIDGET_LIMIT}
`);
const createComment = solutionsDb.prepare(`
  INSERT INTO solution_comments (task_id, user_id, body, created_at)
  VALUES (?, ?, ?, ?)
`);
const getCommentForUser = solutionsDb.prepare(`
  SELECT solution_comments.id, solution_comments.task_id, solution_comments.body, solution_comments.created_at,
         users.full_name, users.city
  FROM solution_comments
  JOIN users ON users.id = solution_comments.user_id
  WHERE solution_comments.id = ? AND solution_comments.user_id = ?
`);
const deleteCommentForUser = solutionsDb.prepare(`
  DELETE FROM solution_comments
  WHERE id = ? AND user_id = ?
`);
const createFeedback = solutionsDb.prepare(`
  INSERT INTO site_feedback (task_id, kind, body, created_at)
  VALUES (?, ?, ?, ?)
`);
const listFeedbackForAdmin = solutionsDb.prepare(`
  SELECT id, task_id, kind, body, created_at
  FROM site_feedback
  ORDER BY created_at DESC, id DESC
  LIMIT 100
`);

const cache = new Map();
const sourceCache = new Map();
let taskDirectoryPromise = null;
let taskSearchIndexPromise = null;
const added = { stereometry: [], planimetry: [], parameters: [], equations: [], inequalities: [], optimal: [], numbers: [], finance: [], physics: [] };
try {
  const saved = JSON.parse(fsSync.readFileSync(ADDED_FILE, 'utf8'));
  for (const section of Object.keys(added)) {
    if (Array.isArray(saved[section])) added[section] = saved[section];
  }
} catch { /* Истории ещё нет — это нормальный первый запуск. */ }

async function saveAddedHistory() {
  await fs.writeFile(ADDED_FILE, JSON.stringify(added, null, 2), 'utf8');
}

function isValidTaskId(value) {
  return /^[A-Z0-9]{4,32}$/.test(String(value || '').toUpperCase());
}

function normalizeTaskId(value) {
  return String(value || '').trim().toUpperCase();
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

function escapeXml(value) {
  return escapeHtml(value);
}

function absoluteUrl(pathname = '/') {
  return new URL(pathname, SITE_ORIGIN).toString();
}

function renderTelegramBanner() {
  return `<aside class="telegram-banner" aria-label="Подготовка к ЕГЭ">
    <div class="telegram-banner-copy">
      <strong>Подготовка к ЕГЭ: математика и физика</strong>
      <span>Полезные разборы, задания и материалы для подготовки.</span>
    </div>
    <a class="telegram-banner-action" href="${TELEGRAM_CHANNEL_URL}" target="_blank" rel="noopener noreferrer">Перейти в Telegram <span>${TELEGRAM_USERNAME}</span></a>
  </aside>`;
}

function sectionInfo(section) {
  return SECTION_INFO[section] || SECTION_INFO.stereometry;
}

function physicsTopicInfo(code) {
  if (!code) return null;
  for (const group of PHYSICS_TOPICS) {
    if (group.code === code) return { code, name: group.name };
    const child = group.children.find(([childCode]) => childCode === code);
    if (child) return { code, name: child[1] };
  }
  return null;
}

function renderPhysicsTopicMenu(activeCode = '', counts = {}) {
  const groups = PHYSICS_TOPICS.map(group => `<section class="physics-topic-group">
    <a class="physics-topic-major ${activeCode === group.code ? 'active' : ''}" href="/physics?topic=${group.code}" data-physics-topic="${group.code}">${group.code}. ${escapeHtml(group.name)} <span class="physics-topic-count">— ${counts[group.code] || 0}</span></a>
    <div class="physics-topic-children">${group.children.map(([code, name]) => `<a class="${activeCode === code ? 'active' : ''}" href="/physics?topic=${code}" data-physics-topic="${code}">${code} ${escapeHtml(name)} <span class="physics-topic-count">— ${counts[code] || 0}</span></a>`).join('')}</div>
  </section>`).join('');
  return `<section class="physics-topics" aria-labelledby="physics-topics-title">
    <div class="physics-topics-heading"><h2 id="physics-topics-title">Типы задач по физике</h2><a class="${activeCode ? '' : 'active'}" href="/physics">Все 538 задач</a></div>
    <div class="physics-topic-grid">${groups}</div>
  </section>`;
}

function cleanPlainText(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(nbsp|#160);/gi, ' ')
    .replace(/&(amp|#38);/gi, '&')
    .replace(/&(lt|#60);/gi, '<')
    .replace(/&(gt|#62);/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function truncateText(value, maxLength) {
  const text = String(value || '').trim();
  if (text.length <= maxLength) return text;
  const clipped = text.slice(0, Math.max(0, maxLength - 1)).replace(/\s+\S*$/, '').trim();
  return `${clipped || text.slice(0, maxLength - 1).trim()}…`;
}

function renderMathAtoms(value) {
  return String(value)
    .replace(/√\(([^()]*)\)/g, '<span class="math-root">√<span class="math-radicand">$1</span></span>')
    // В записи √14v под корнем находится только 14: буква v — множитель.
    // Несоставное подкоренное выражение с переменной пишется как √x,
    // а составное всегда заключаем в скобки: √(x+y).
    .replace(/√(\d+(?:[.,]\d+)?|[A-Za-zА-Яа-яα-ωΑ-Ω](?:[₀-₉]+|_[A-Za-zА-Яа-яα-ωΑ-Ω0-9]+)?)/gu, '<span class="math-root">√<span class="math-radicand">$1</span></span>')
    .replace(/→([A-Za-zА-Яа-яα-ωΑ-Ω][A-Za-zА-Яа-яα-ωΑ-Ω0-9₀-₉]*)/gu, '<span class="math-vector">$1</span>')
    .replace(/([A-Za-zА-Яа-яα-ωΑ-Ω])_([A-Za-zА-Яа-яα-ωΑ-Ω0-9]+)/gu, '$1<sub>$2</sub>')
    .replace(/\^(\d+)/g, '<sup>$1</sup>');
}

function renderMathText(value) {
  const fractions = [];
  // Без скобок у корня допускается лишь одно число или одна переменная.
  // Это не даёт интерпретировать √14v как √(14v).
  const root = String.raw`√(?:\d+(?:[.,]\d+)?|[A-Za-zА-Яа-яα-ωΑ-Ω](?:[₀-₉]+|_[A-Za-zА-Яа-яα-ωΑ-Ω0-9]+)?|\([^()]*\))`;
  const scalar = String.raw`[−-]?(?:(?:\d+(?:[.,]\d+)?)(?:${root})?|(?:\d+)?[A-Za-zА-Яа-яα-ωΑ-Ω][A-Za-zА-Яа-яα-ωΑ-Ω0-9₀-₉]*|${root})`;
  const atom = String.raw`(?:${scalar}|\([^()]*\))`;
  const fractionPattern = new RegExp(`(${atom})\\/(${atom})`, 'gu');
  const explicitFractionPattern = /⟦([^⟦⟧¦\n]+)¦([^⟦⟧¦\n]+)⟧/gu;
  // В координатной тройке запятые разделяют координаты, а не десятичные дроби.
  // Иначе в записи (−20/9,−10√14/9,0) форматтер принимал «9,0» за знаменатель.
  const coordinateSafe = String(value).replace(/\((?=[^()\n]*,[^()\n]*,)[^()\n]*\)/g, tuple => tuple.replaceAll(',', '\uE100'));
  const saveFraction = (_, numerator, denominator) => {
    const index = fractions.push({ numerator, denominator }) - 1;
    return `\uE000${index}\uE001`;
  };
  let escaped = escapeHtml(coordinateSafe);
  // Явная дробь в исходнике: ⟦числитель¦знаменатель⟧. На странице — вертикальная дробь.
  // Сначала сворачиваем вложенные дроби, затем поддерживаем старые записи с косой чертой.
  while (explicitFractionPattern.test(escaped)) {
    explicitFractionPattern.lastIndex = 0;
    escaped = escaped.replace(explicitFractionPattern, saveFraction);
  }
  escaped = escaped.replace(fractionPattern, saveFraction);
  function renderFraction(index) {
    const fraction = fractions[Number(index)];
    return `<span class="math-fraction"><span>${renderFractions(fraction.numerator)}</span><span>${renderFractions(fraction.denominator)}</span></span>`;
  }
  function renderFractions(text) {
    return renderMathAtoms(text).replaceAll('\uE100', ',').replace(/\uE000(\d+)\uE001/g, (_, index) => renderFraction(index));
  }
  return renderFractions(escaped);
}

function renderMathSolution(value) {
  return String(value || '').trim().split(/\n\s*\n/).filter(Boolean).map(paragraph =>
    `<p>${paragraph.split('\n').map(renderMathText).join('<br>')}</p>`
  ).join('');
}

function renderStructuredData(data) {
  if (!data) return '';
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return `<script type="application/ld+json">${json}</script>`;
}

function renderSeoMetadata({ title, description, pathname, robots = 'index,follow', structuredData = null, type = 'website' }) {
  const url = absoluteUrl(pathname);
  return `
  ${SITE_ICON_HEAD}
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="${escapeHtml(robots)}">
  <link rel="canonical" href="${escapeHtml(url)}">
  <meta property="og:locale" content="ru_RU">
  <meta property="og:type" content="${escapeHtml(type)}">
  <meta property="og:site_name" content="ЕГЭ ФИПИ — математика и физика">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(url)}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  ${renderStructuredData(structuredData)}`;
}

function normalizeFipiHtml(html) {
  return String(html)
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
}

function getAdminPassword() {
  try {
    const password = fsSync.readFileSync(ADMIN_PASSWORD_FILE, 'utf8').trim();
    return password || null;
  } catch {
    return null;
  }
}

function getCookie(req, name) {
  const prefix = `${name}=`;
  return String(req.headers.cookie || '').split(/;\s*/).find(cookie => cookie.startsWith(prefix))?.slice(prefix.length) || null;
}

function createAdminSession(password) {
  const expiresAt = Math.floor(Date.now() / 1000) + ADMIN_SESSION_TTL_SECONDS;
  const signature = createHmac('sha256', password).update(String(expiresAt)).digest('base64url');
  return `${expiresAt}.${signature}`;
}

function secureEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function isAdmin(req) {
  const password = getAdminPassword();
  const cookie = getCookie(req, ADMIN_SESSION_COOKIE);
  if (!password || !cookie) return false;
  const [expiresAt, signature] = cookie.split('.');
  if (!/^\d+$/.test(expiresAt) || !signature || Number(expiresAt) < Math.floor(Date.now() / 1000)) return false;
  const expected = createHmac('sha256', password).update(expiresAt).digest('base64url');
  return secureEqual(signature, expected);
}

function adminSessionCookie(password) {
  return `${ADMIN_SESSION_COOKIE}=${createAdminSession(password)}; Max-Age=${ADMIN_SESSION_TTL_SECONDS}; Path=/admin; HttpOnly; SameSite=Strict`;
}

function expiredAdminSessionCookie() {
  return `${ADMIN_SESSION_COOKIE}=; Max-Age=0; Path=/admin; HttpOnly; SameSite=Strict`;
}

function normalizeUserText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeEmail(value) {
  return normalizeUserText(value).toLowerCase();
}

function isValidFullName(value) {
  return value.length >= 3 && value.length <= 120 && /^[\p{L}][\p{L}\p{M}\s.'’\-]{1,119}$/u.test(value);
}

function isValidCity(value) {
  return value.length >= 2 && value.length <= 100 && /^[\p{L}\p{N}][\p{L}\p{M}\p{N}\s.'’\-()]{1,99}$/u.test(value);
}

function isValidEmail(value) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validateRegistration(form) {
  const fullName = normalizeUserText(form.get('full_name'));
  const city = normalizeUserText(form.get('city'));
  const email = normalizeEmail(form.get('email'));
  const password = String(form.get('password') || '');
  if (!isValidFullName(fullName)) return { error: 'Укажите ФИО: от 3 до 120 букв.' };
  if (!isValidCity(city)) return { error: 'Укажите город: от 2 до 100 символов.' };
  if (!isValidEmail(email)) return { error: 'Укажите корректный адрес электронной почты.' };
  if (password.length < 8 || password.length > 200) return { error: 'Пароль должен содержать от 8 до 200 символов.' };
  if (form.get('consent') !== '1') return { error: 'Нужно подтвердить согласие на обработку данных.' };
  return { fullName, city, email, password };
}

function hashPassword(password, salt = randomBytes(16).toString('base64url')) {
  const digest = scryptSync(String(password), salt, 64).toString('base64url');
  return `${salt}.${digest}`;
}

function verifyPassword(password, storedHash) {
  const [salt, digest] = String(storedHash || '').split('.');
  if (!salt || !digest) return false;
  const expected = hashPassword(password, salt).split('.')[1];
  return secureEqual(digest, expected);
}

function createUserSession(user) {
  const expiresAt = Math.floor(Date.now() / 1000) + USER_SESSION_TTL_SECONDS;
  const payload = `${user.id}.${expiresAt}`;
  const signature = createHmac('sha256', user.password_hash).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function userSessionCookie(user) {
  return `${USER_SESSION_COOKIE}=${createUserSession(user)}; Max-Age=${USER_SESSION_TTL_SECONDS}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

function expiredUserSessionCookie() {
  return `${USER_SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

function getCurrentUser(req) {
  const cookie = getCookie(req, USER_SESSION_COOKIE);
  if (!cookie) return null;
  const [rawId, rawExpiresAt, signature] = cookie.split('.');
  if (!/^\d+$/.test(rawId) || !/^\d+$/.test(rawExpiresAt) || !signature || Number(rawExpiresAt) < Math.floor(Date.now() / 1000)) return null;
  const user = getUserById.get(Number(rawId));
  if (!user) return null;
  const payload = `${user.id}.${rawExpiresAt}`;
  const expected = createHmac('sha256', user.password_hash).update(payload).digest('base64url');
  return secureEqual(signature, expected) ? user : null;
}

function publicUser(user) {
  return user ? { id: user.id, fullName: user.full_name, city: user.city } : null;
}

function serializeComment(comment) {
  return {
    id: comment.id,
    taskId: comment.task_id,
    body: comment.body,
    createdAt: comment.created_at,
    fullName: comment.full_name,
    city: comment.city
  };
}

function safeNextPath(value, fallback = '/') {
  const next = String(value || '').trim();
  return next.startsWith('/') && !next.startsWith('//') && !next.includes('\\') ? next : fallback;
}

function isTrustedOrigin(req) {
  const origin = String(req.headers.origin || '');
  if (!origin) return true;
  const host = String(req.headers.host || '').replace(/[^A-Za-z0-9.:-]/g, '');
  return origin === SITE_ORIGIN || origin === `http://${host}` || origin === `https://${host}`;
}

const rateLimitWindows = new Map();
function isRateLimited(req, action, limit, windowMs) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const address = forwarded || req.socket.remoteAddress || 'unknown';
  const key = `${action}:${address}`;
  const now = Date.now();
  const recent = (rateLimitWindows.get(key) || []).filter(time => time > now - windowMs);
  if (recent.length >= limit) {
    rateLimitWindows.set(key, recent);
    return true;
  }
  recent.push(now);
  rateLimitWindows.set(key, recent);
  return false;
}

function addCommentForUser(taskId, user, rawBody) {
  const body = normalizeUserText(rawBody);
  if (body.length < 2) return { error: 'Комментарий должен содержать не менее двух символов.' };
  if (body.length > MAX_COMMENT_LENGTH) return { error: `Комментарий не должен превышать ${MAX_COMMENT_LENGTH} символов.` };
  const now = new Date().toISOString();
  const result = createComment.run(taskId, user.id, body, now);
  const comment = getCommentForUser.get(Number(result.lastInsertRowid), user.id);
  return { comment: serializeComment(comment) };
}

function addSiteFeedback(taskId, rawKind, rawBody) {
  const kind = rawKind === 'suggestion' || rawKind === 'issue' ? rawKind : '';
  const body = String(rawBody || '').replace(/\r\n?/g, '\n').trim().replace(/\n{3,}/g, '\n\n');
  if (!kind) return { error: 'Выберите тип сообщения.' };
  if (body.length < 2) return { error: 'Опишите пожелание или неточность хотя бы двумя символами.' };
  if (body.length > MAX_FEEDBACK_LENGTH) return { error: `Сообщение не должно превышать ${MAX_FEEDBACK_LENGTH} символов.` };
  createFeedback.run(taskId, kind, body, new Date().toISOString());
  return {};
}

function readForm(req, maxBytes = 512 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error('Размер формы не должен превышать 512 КБ.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(new URLSearchParams(Buffer.concat(chunks).toString('utf8'))));
    req.on('error', reject);
  });
}

async function verifyTurnstile(form) {
  if (!TURNSTILE_SECRET_KEY) return { ok: false, status: 503, error: 'Проверка формы временно недоступна. Попробуйте позже.' };

  const responseToken = String(form.get('cf-turnstile-response') || '').trim();
  if (!responseToken) return { ok: false, status: 400, error: 'Подтвердите, что вы не робот.' };

  try {
    const body = new URLSearchParams({ secret: TURNSTILE_SECRET_KEY, response: responseToken });
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(7_000),
    });
    const result = await response.json();
    if (response.ok && result?.success && TURNSTILE_HOSTNAMES.has(result.hostname || '')) return { ok: true };
  } catch {
    return { ok: false, status: 503, error: 'Не удалось выполнить проверку. Попробуйте ещё раз.' };
  }
  return { ok: false, status: 400, error: 'Проверка не пройдена. Попробуйте ещё раз.' };
}

function renderTurnstileWidget() {
  if (!TURNSTILE_SITE_KEY) return '<p class="turnstile-error" role="alert">Проверка формы временно недоступна. Попробуйте позже.</p>';
  return `<div class="turnstile-field" data-turnstile-widget data-turnstile-sitekey="${escapeHtml(TURNSTILE_SITE_KEY)}"></div>`;
}

function renderTurnstileScript() {
  if (!TURNSTILE_SITE_KEY) return '';
  return `<script>
    (function () {
      function renderAll() {
        if (!window.turnstile) return;
        document.querySelectorAll('[data-turnstile-widget]').forEach(function (container) {
          if (container.dataset.turnstileReady) return;
          container.dataset.turnstileReady = 'true';
          window.turnstile.render(container, { sitekey: container.dataset.turnstileSitekey });
        });
      }
      window.egeTurnstileLoaded = renderAll;
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', renderAll, { once: true });
      else renderAll();
    })();
  </script>
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=egeTurnstileLoaded&render=explicit" async defer></script>`;
}

function renderAdminShell(title, content) {
  return `<!doctype html>
<html lang="ru">
<head>
  ${YANDEX_METRIKA_HEAD}
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} — администрирование</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #f4f6f8; color: #243447; font: 16px/1.5 Arial, sans-serif; }
    main { max-width: 920px; margin: 0 auto; padding: 28px 20px 48px; }
    .top { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
    .top a { color: #183153; font-weight: 700; text-decoration: none; }
    .top form { margin: 0; }
    button, input, textarea { font: inherit; }
    button { border: 0; border-radius: 6px; padding: 10px 14px; background: #183153; color: #fff; cursor: pointer; }
    button:hover { background: #254a79; }
    .card { margin-bottom: 18px; padding: 24px; border: 1px solid #d8e1eb; border-radius: 8px; background: #fff; box-shadow: 0 1px 7px #00000012; }
    h1, h2 { margin-top: 0; color: #183153; }
    h1 { font-size: 28px; }
    h2 { font-size: 20px; }
    label { display: block; margin: 14px 0 6px; font-weight: 700; }
    input[type="text"], input[type="password"], textarea { width: 100%; padding: 10px 12px; border: 1px solid #afbdcd; border-radius: 6px; color: #243447; }
    textarea { min-height: 240px; resize: vertical; line-height: 1.45; }
    .checkbox { display: flex; align-items: center; gap: 8px; font-weight: 400; }
    .checkbox input { width: auto; }
    .notice { padding: 12px 14px; border-radius: 6px; background: #e9f2fb; color: #183153; }
    .error { padding: 12px 14px; border-radius: 6px; background: #fbe9e8; color: #8c241b; }
    .solution-list { width: 100%; border-collapse: collapse; }
    .solution-list th, .solution-list td { padding: 10px 8px; border-top: 1px solid #e1e7ee; text-align: left; vertical-align: top; }
    .solution-list th { color: #526273; font-size: 13px; }
    .feedback-list { width: 100%; border-collapse: collapse; }
    .feedback-list th, .feedback-list td { padding: 10px 8px; border-top: 1px solid #e1e7ee; text-align: left; vertical-align: top; }
    .feedback-list th { color: #526273; font-size: 13px; }
    .feedback-list .feedback-body { min-width: 260px; white-space: pre-wrap; }
    .status { font-size: 14px; }
    .status.public { color: #176a3a; }
    .status.draft { color: #8a5a00; }
    .muted { color: #526273; }
    @media (max-width: 600px) {
      main { padding: 18px 12px 32px; }
      .card { padding: 18px; }
      .solution-list th:nth-child(2), .solution-list td:nth-child(2), .solution-list th:nth-child(4), .solution-list td:nth-child(4) { display: none; }
      .feedback-list th:nth-child(2), .feedback-list td:nth-child(2) { display: none; }
    }
  </style>
</head>
<body>
  ${YANDEX_METRIKA_NOSCRIPT}
  <main>
    <div class="top">
      <a href="/admin">Управление решениями</a>
      <form method="post" action="/admin/logout"><button type="submit">Выйти</button></form>
    </div>
    ${content}
  </main>
</body>
</html>`;
}

function renderAdminLogin(error = '') {
  const message = error ? `<p class="error">${escapeHtml(error)}</p>` : '';
  return `<!doctype html>
<html lang="ru">
<head>
  ${YANDEX_METRIKA_HEAD}
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Вход администратора</title>
  <style>
    * { box-sizing: border-box; }
    body { display: grid; min-height: 100vh; place-items: center; margin: 0; padding: 20px; background: #f4f6f8; color: #243447; font: 16px/1.5 Arial, sans-serif; }
    form { width: min(100%, 420px); padding: 26px; border: 1px solid #d8e1eb; border-radius: 8px; background: #fff; box-shadow: 0 1px 7px #00000012; }
    h1 { margin-top: 0; color: #183153; font-size: 26px; }
    label { display: block; margin-bottom: 6px; font-weight: 700; }
    input { width: 100%; margin-bottom: 16px; padding: 10px 12px; border: 1px solid #afbdcd; border-radius: 6px; font: inherit; }
    button { border: 0; border-radius: 6px; padding: 10px 14px; background: #183153; color: #fff; font: inherit; cursor: pointer; }
    .error { padding: 10px 12px; border-radius: 6px; background: #fbe9e8; color: #8c241b; }
  </style>
</head>
<body>
  ${YANDEX_METRIKA_NOSCRIPT}
  <form method="post" action="/admin/login">
    <h1>Вход для администратора</h1>
    ${message}
    <label for="password">Пароль</label>
    <input id="password" name="password" type="password" autocomplete="current-password" required autofocus>
    ${renderTurnstileWidget()}
    <button type="submit">Войти</button>
  </form>
  ${renderTurnstileScript()}
</body>
</html>`;
}

function renderAdminDashboard() {
  const rows = listSolutionsForAdmin.all().map(record => `<tr>
    <td><a href="/admin/solutions/${encodeURIComponent(record.task_id)}">${escapeHtml(record.task_id)}</a></td>
    <td>${escapeHtml(record.answer || '—')}</td>
    <td><span class="status ${record.published ? 'public' : 'draft'}">${record.published ? 'Опубликовано' : 'Черновик'}</span></td>
    <td>${escapeHtml(new Date(record.updated_at).toLocaleString('ru-RU'))}</td>
  </tr>`).join('') || '<tr><td colspan="4" class="muted">Решений пока нет.</td></tr>';
  const feedbackRows = listFeedbackForAdmin.all().map(record => `<tr>
    <td>${record.kind === 'issue' ? 'Неточность' : 'Пожелание'}</td>
    <td><a href="/tasks/${encodeURIComponent(record.task_id)}#feedback">${escapeHtml(record.task_id)}</a></td>
    <td class="feedback-body">${escapeHtml(record.body)}</td>
    <td>${escapeHtml(formatDateTime(record.created_at))}</td>
  </tr>`).join('') || '<tr><td colspan="4" class="muted">Сообщений пока нет.</td></tr>';
  return renderAdminShell('Решения', `<section class="card">
      <h1>Решения</h1>
      <p>Введите номер задания из карточки, чтобы создать решение или изменить существующее. После публикации ответ и решение будут доступны всем посетителям по кнопке «Решение».</p>
      <form method="get" action="/admin">
        <label for="task">Номер задания</label>
        <input id="task" name="task" type="text" pattern="[A-Za-z0-9]{4,32}" placeholder="Например, 30ED04" required>
        <button type="submit">Открыть редактор</button>
      </form>
    </section>
    <section class="card">
      <h2>Последние изменения</h2>
      <table class="solution-list">
        <thead><tr><th>Задание</th><th>Ответ</th><th>Статус</th><th>Изменено</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </section>
    <section class="card">
      <h2>Пожелания и найденные неточности</h2>
      <table class="feedback-list">
        <thead><tr><th>Тип</th><th>Задание</th><th>Сообщение</th><th>Получено</th></tr></thead>
        <tbody>${feedbackRows}</tbody>
      </table>
    </section>`);
}

function renderSolutionEditor(taskId, record, saved = false) {
  const answer = escapeHtml(record?.answer || '');
  const solution = escapeHtml(record?.solution || '');
  const diagram = escapeHtml(record?.diagram_svg || '');
  const diagramCaption = escapeHtml(record?.diagram_caption || '');
  const checked = record?.published ? ' checked' : '';
  const notice = saved ? '<p class="notice">Изменения сохранены.</p>' : '';
  return renderAdminShell(`Решение ${taskId}`, `<section class="card">
      <h1>Решение задания ${escapeHtml(taskId)}</h1>
      ${notice}
      <p class="muted">Единый формат для всех задач: дроби — <code>⟦числитель¦знаменатель⟧</code>, без <code>/</code>; для составного выражения под корнем используйте <code>√(…)</code>; вектора в пространстве записывайте тремя координатами. Перед публикацией сверьте условие, ответ и ключевые вычисления с «Решу ЕГЭ»; при расхождении первичен ФИПИ.</p>
      <form method="post" action="/admin/solutions/${encodeURIComponent(taskId)}">
        <label for="answer">Ответ</label>
        <input id="answer" name="answer" type="text" value="${answer}" placeholder="Например, 12">
        <label for="solution">Решение</label>
        <textarea id="solution" name="solution" required placeholder="Введите решение. Для дроби используйте ⟦числитель¦знаменатель⟧, без /. Переносы строк сохранятся на странице задания.">${solution}</textarea>
        <label for="diagram">SVG-схема (необязательно)</label>
        <textarea id="diagram" name="diagram" placeholder="SVG-код схемы для этой задачи.">${diagram}</textarea>
        <label for="diagram-caption">Подпись под схемой</label>
        <textarea id="diagram-caption" name="diagram_caption" placeholder="Например: M∈AB, K∈SD; α проходит через M и K.">${diagramCaption}</textarea>
        <label class="checkbox"><input name="published" type="checkbox" value="1"${checked}> Опубликовать: открыть ответ и решение для всех посетителей</label>
        <button type="submit">Сохранить</button>
      </form>
    </section>`);
}

function formatDateTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' });
}

function renderAccountShell(title, content, user = null) {
  const accountLink = user
    ? `<a href="/account">Личный кабинет</a><form method="post" action="/account/logout"><button type="submit">Выйти</button></form>`
    : '<a href="/account/login">Войти</a><a href="/account/register">Регистрация</a>';
  return `<!doctype html>
<html lang="ru">
<head>
  ${YANDEX_METRIKA_HEAD}
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,follow">
  <title>${escapeHtml(title)} — ЕГЭ ФИПИ</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #f4f6f8; color: #243447; font: 16px/1.5 Arial, sans-serif; }
    main { width: min(100%, 820px); margin: 0 auto; padding: 28px 20px 48px; }
    .top { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 16px; margin-bottom: 20px; }
    .top > a:first-child { margin-right: auto; color: #183153; font-weight: 700; text-decoration: none; }
    .top a:not(:first-child) { color: #183153; text-decoration: none; }
    .top form { margin: 0; }
    .card { padding: 26px; border: 1px solid #d8e1eb; border-radius: 9px; background: #fff; box-shadow: 0 1px 7px #00000012; }
    .card + .card { margin-top: 18px; }
    h1, h2 { margin-top: 0; color: #183153; }
    h1 { font-size: 28px; line-height: 1.25; }
    h2 { font-size: 20px; }
    label { display: block; margin: 15px 0 6px; font-weight: 700; }
    input, textarea, button { font: inherit; }
    input[type="text"], input[type="email"], input[type="password"], textarea { width: 100%; padding: 10px 12px; border: 1px solid #afbdcd; border-radius: 6px; color: #243447; }
    textarea { min-height: 96px; resize: vertical; }
    button { border: 0; border-radius: 6px; padding: 10px 14px; background: #183153; color: #fff; cursor: pointer; }
    button:hover { background: #254a79; }
    .checkbox { display: flex; align-items: flex-start; gap: 8px; font-weight: 400; }
    .checkbox input { margin-top: 5px; }
    .error { padding: 11px 13px; border-radius: 6px; background: #fbe9e8; color: #8c241b; }
    .notice { padding: 11px 13px; border-radius: 6px; background: #e9f2fb; color: #183153; }
    .muted { color: #526273; }
    .profile { display: grid; grid-template-columns: max-content 1fr; gap: 8px 18px; margin: 0; }
    .profile dt { color: #526273; }
    .profile dd { margin: 0; font-weight: 600; overflow-wrap: anywhere; }
    .comment-list { display: grid; gap: 12px; padding: 0; margin: 0; list-style: none; }
    .comment-list li { padding: 14px; border: 1px solid #d8e1eb; border-radius: 7px; background: #f8fafc; }
    .comment-list p { margin: 8px 0 0; white-space: pre-wrap; }
    .comment-list time { color: #526273; font-size: 13px; }
    .comment-list form { margin: 12px 0 0; }
    .comment-list .delete-comment { padding: 7px 10px; background: #8c241b; font-size: 14px; }
    .comment-list .delete-comment:hover { background: #6f1c15; }
    @media (max-width: 600px) { main { padding: 18px 12px 32px; } .card { padding: 20px; } .top > a:first-child { flex-basis: 100%; } .profile { grid-template-columns: 1fr; gap: 2px; } .profile dd { margin-bottom: 10px; } }
  </style>
</head>
<body>
  ${YANDEX_METRIKA_NOSCRIPT}
  <main>
    <nav class="top" aria-label="Навигация"><a href="/">Задания ЕГЭ</a>${accountLink}</nav>
    ${content}
  </main>
  ${renderTurnstileScript()}
</body>
</html>`;
}

function renderRegistrationPage(error = '', values = {}, next = '/') {
  const message = error ? `<p class="error">${escapeHtml(error)}</p>` : '';
  return renderAccountShell('Регистрация', `<section class="card">
      <h1>Регистрация</h1>
      <p class="muted">После регистрации можно оставлять комментарии к опубликованным решениям.</p>
      ${message}
      <form method="post" action="/account/register">
        <input type="hidden" name="next" value="${escapeHtml(safeNextPath(next))}">
        <label for="full-name">ФИО</label>
        <input id="full-name" name="full_name" type="text" value="${escapeHtml(values.fullName || '')}" autocomplete="name" maxlength="120" required>
        <label for="city">Город</label>
        <input id="city" name="city" type="text" value="${escapeHtml(values.city || '')}" autocomplete="address-level2" maxlength="100" required>
        <label for="email">Электронная почта</label>
        <input id="email" name="email" type="email" value="${escapeHtml(values.email || '')}" autocomplete="email" maxlength="254" required>
        <label for="password">Пароль</label>
        <input id="password" name="password" type="password" autocomplete="new-password" minlength="8" maxlength="200" required>
        <label class="checkbox"><input name="consent" type="checkbox" value="1"${values.consent ? ' checked' : ''} required> <span>Соглашаюсь на обработку указанных данных для работы личного кабинета и комментариев.</span></label>
        <p class="muted">Какие данные используются: <a href="/privacy">информация для пользователей</a>.</p>
        ${renderTurnstileWidget()}
        <p><button type="submit">Создать аккаунт</button></p>
      </form>
      <p>Уже есть аккаунт? <a href="/account/login?next=${encodeURIComponent(safeNextPath(next))}">Войти</a>.</p>
    </section>`);
}

function renderLoginPage(error = '', next = '/') {
  const message = error ? `<p class="error">${escapeHtml(error)}</p>` : '';
  return renderAccountShell('Вход', `<section class="card">
      <h1>Вход в личный кабинет</h1>
      ${message}
      <form method="post" action="/account/login">
        <input type="hidden" name="next" value="${escapeHtml(safeNextPath(next))}">
        <label for="email">Электронная почта</label>
        <input id="email" name="email" type="email" autocomplete="email" required autofocus>
        <label for="password">Пароль</label>
        <input id="password" name="password" type="password" autocomplete="current-password" required>
        ${renderTurnstileWidget()}
        <p><button type="submit">Войти</button></p>
      </form>
      <p>Нет аккаунта? <a href="/account/register?next=${encodeURIComponent(safeNextPath(next))}">Зарегистрироваться</a>.</p>
    </section>`);
}

function renderAccountPage(user, notice = '') {
  const comments = listCommentsForUser.all(user.id);
  const count = Number(countCommentsForUser.get(user.id).total || 0);
  const commentItems = comments.map(comment => `<li>
    <a href="/tasks/${encodeURIComponent(comment.task_id)}#comments">Задание ${escapeHtml(comment.task_id)}</a>
    <time datetime="${escapeHtml(comment.created_at)}">${escapeHtml(formatDateTime(comment.created_at))}</time>
    <p>${escapeHtml(comment.body)}</p>
    <form method="post" action="/account/comments/${encodeURIComponent(comment.id)}/delete">
      <button class="delete-comment" type="submit">Удалить комментарий</button>
    </form>
  </li>`).join('') || '<li class="muted">Вы ещё не оставляли комментарии.</li>';
  const message = notice === 'deleted' ? '<p class="notice">Комментарий удалён.</p>' : '';
  return renderAccountShell('Личный кабинет', `<section class="card">
      <h1>Личный кабинет</h1>
      ${message}
      <dl class="profile">
        <dt>ФИО</dt><dd>${escapeHtml(user.full_name)}</dd>
        <dt>Город</dt><dd>${escapeHtml(user.city)}</dd>
        <dt>Почта</dt><dd>${escapeHtml(user.email)}</dd>
        <dt>Комментарии</dt><dd>${count}</dd>
      </dl>
    </section>
    <section class="card">
      <h2>Мои комментарии</h2>
      <ul class="comment-list">${commentItems}</ul>
    </section>`, user);
}

function renderPrivacyPage(user = null) {
  return renderAccountShell('Данные пользователей', `<section class="card">
      <h1>Данные пользователей</h1>
      <p>Для создания аккаунта сайт запрашивает ФИО, город, электронную почту и пароль.</p>
      <p>ФИО и город показываются рядом с опубликованным комментарием. Электронная почта используется для входа и не публикуется. Пароль хранится только в виде необратимого защищённого хеша.</p>
      <p>Данные используются для работы личного кабинета, ограничения доступа к комментариям и связи комментария с его автором.</p>
    </section>`, user);
}

function renderCommentSection(taskId, user, notice = '') {
  const comments = listCommentsForTask.all(taskId);
  const items = comments.map(comment => {
    const deletion = user && comment.user_id === user.id
      ? `<form class="solution-comment-delete-form" method="post" action="/account/comments/${encodeURIComponent(comment.id)}/delete">
          <input type="hidden" name="next" value="/tasks/${escapeHtml(taskId)}#comments">
          <button type="submit">Удалить мой комментарий</button>
        </form>`
      : '';
    return `<article class="solution-comment">
      <header><strong>${escapeHtml(comment.full_name)}</strong><span>${escapeHtml(comment.city)}</span><time datetime="${escapeHtml(comment.created_at)}">${escapeHtml(formatDateTime(comment.created_at))}</time></header>
      <p>${escapeHtml(comment.body)}</p>
      ${deletion}
    </article>`;
  }).join('') || '<p class="solution-comments-empty">Комментариев пока нет. Будьте первым.</p>';
  const next = `/tasks/${taskId}#comments`;
  const form = user
    ? `<form class="solution-comment-form" method="post" action="/tasks/${encodeURIComponent(taskId)}/comments">
        <label for="comment-${escapeHtml(taskId)}">Ваш комментарий</label>
        <textarea id="comment-${escapeHtml(taskId)}" name="body" maxlength="${MAX_COMMENT_LENGTH}" required placeholder="Напишите вопрос или дополнение к решению"></textarea>
        ${renderTurnstileWidget()}
        <button type="submit">Отправить комментарий</button>
      </form>`
    : `<p class="solution-comments-login">Чтобы оставить комментарий, <a href="/account/login?next=${encodeURIComponent(next)}">войдите</a> или <a href="/account/register?next=${encodeURIComponent(next)}">зарегистрируйтесь</a>.</p>`;
  const message = notice === 'created'
    ? '<p class="solution-comments-notice">Комментарий опубликован.</p>'
    : (notice === 'deleted'
      ? '<p class="solution-comments-notice">Комментарий удалён.</p>'
      : (notice === 'error' ? '<p class="solution-comments-notice">Подтвердите, что вы не робот, и отправьте комментарий ещё раз.</p>' : ''));
  return `<section class="solution-comments" id="comments" aria-labelledby="comments-${escapeHtml(taskId)}">
    <h2 id="comments-${escapeHtml(taskId)}">Комментарии к решению</h2>
    <p class="solution-comments-public">Комментарии видны всем посетителям сайта.</p>
    ${message}
    <div class="solution-comments-list">${items}</div>
    ${form}
  </section>`;
}

function renderUnavailableCommentSection(taskId) {
  return `<section class="solution-comments" id="comments" aria-labelledby="comments-${escapeHtml(taskId)}">
    <h2 id="comments-${escapeHtml(taskId)}">Комментарии к решению</h2>
    <p class="solution-comments-public">Обсуждение станет доступно после публикации решения к этой задаче.</p>
  </section>`;
}

function renderFeedbackSection(taskId, notice = '') {
  const message = notice === 'created'
    ? '<p class="site-feedback-notice">Спасибо! Сообщение отправлено команде сайта.</p>'
    : (notice === 'rate'
      ? '<p class="site-feedback-error">Слишком много сообщений. Повторите немного позже.</p>'
      : (notice === 'captcha'
        ? '<p class="site-feedback-error">Подтвердите, что вы не робот, и отправьте сообщение ещё раз.</p>'
        : (notice === 'error' ? '<p class="site-feedback-error">Проверьте тип и текст сообщения.</p>' : '')));
  return `<section class="site-feedback" id="feedback" aria-labelledby="feedback-${escapeHtml(taskId)}">
    <h2 id="feedback-${escapeHtml(taskId)}">Помочь улучшить сайт</h2>
    <p>Напишите пожелание к сайту или решению либо сообщите о найденной неточности в задании ${escapeHtml(taskId)}.</p>
    <p class="site-feedback-private">Сообщение увидит только команда сайта: на странице оно не публикуется.</p>
    ${message}
    <form class="site-feedback-form" method="post" action="/tasks/${encodeURIComponent(taskId)}/feedback">
      <label for="feedback-kind-${escapeHtml(taskId)}">Тип сообщения</label>
      <select id="feedback-kind-${escapeHtml(taskId)}" name="kind" required>
        <option value="suggestion">Пожелание по сайту или решению</option>
        <option value="issue">Неточность или ошибка</option>
      </select>
      <label for="feedback-body-${escapeHtml(taskId)}">Ваше сообщение</label>
      <textarea id="feedback-body-${escapeHtml(taskId)}" name="body" maxlength="${MAX_FEEDBACK_LENGTH}" minlength="2" required placeholder="Например: в шаге 2 не хватает пояснения…"></textarea>
      ${renderTurnstileWidget()}
      <button type="submit">Отправить</button>
    </form>
  </section>`;
}

function renderFeedbackModal() {
  return `<section class="feedback-modal" hidden aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="feedback-modal-title">
    <div class="feedback-modal-dialog">
      <header class="feedback-modal-header">
        <h2 id="feedback-modal-title">Сообщить об ошибке или пожелании</h2>
        <button class="feedback-modal-close" type="button" aria-label="Закрыть форму">×</button>
      </header>
      <form class="feedback-modal-form" method="post">
        <p class="feedback-modal-task"></p>
        <p class="feedback-modal-private">Сообщение не публикуется: его увидит только команда сайта.</p>
        <label for="feedback-modal-kind">Тип сообщения</label>
        <select id="feedback-modal-kind" name="kind" required>
          <option value="suggestion">Пожелание по сайту или решению</option>
          <option value="issue">Неточность или ошибка</option>
        </select>
        <label for="feedback-modal-body">Ваше сообщение</label>
        <textarea id="feedback-modal-body" name="body" maxlength="${MAX_FEEDBACK_LENGTH}" minlength="2" required placeholder="Например: в шаге 2 не хватает пояснения…"></textarea>
        <div class="feedback-modal-turnstile"></div>
        <button type="submit">Отправить</button>
      </form>
    </div>
    <style>
      .feedback-modal { position: fixed; inset: 0; z-index: 1100; display: grid; place-items: center; padding: 20px; background: #10243c99; font-family: Arial, sans-serif; }
      .feedback-modal[hidden] { display: none; }
      .feedback-modal-dialog { width: min(560px, 100%); max-height: calc(100dvh - 40px); overflow: auto; border-radius: 10px; background: #fff; color: #243447; box-shadow: 0 12px 40px #0008; }
      .feedback-modal-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 18px; border-bottom: 1px solid #cbd7e4; }
      .feedback-modal-header h2 { margin: 0; color: #183153; font: 700 18px/1.35 Arial, sans-serif; }
      .feedback-modal-close { display: grid; width: 38px; height: 38px; place-items: center; padding: 0; border: 1px solid #183153; border-radius: 6px; background: #fff; color: #183153; font: 700 22px/1 Arial, sans-serif; cursor: pointer; }
      .feedback-modal-close:hover { background: #eaf1f8; }
      .feedback-modal-form { padding: 18px; }
      .feedback-modal-form p { margin: 0 0 10px; }
      .feedback-modal-task { color: #183153; font-weight: 700; }
      .feedback-modal-private { color: #526273; font-size: 14px; }
      .feedback-modal-form label { display: block; margin: 14px 0 6px; font-weight: 700; }
      .feedback-modal-form select, .feedback-modal-form textarea { display: block; width: 100%; padding: 10px 12px; border: 1px solid #afbdcd; border-radius: 6px; color: #243447; background: #fff; font: 16px/1.45 Arial, sans-serif; }
      .feedback-modal-form textarea { min-height: 120px; resize: vertical; }
      .feedback-modal-form > button { margin-top: 12px; padding: 9px 14px; border: 1px solid #183153; border-radius: 6px; background: #183153; color: #fff; font: 600 14px Arial, sans-serif; cursor: pointer; }
      .feedback-modal-form > button:hover { background: #254a79; }
      .feedback-modal-close:focus-visible, .feedback-modal-form select:focus-visible, .feedback-modal-form textarea:focus-visible, .feedback-modal-form > button:focus-visible { outline: 3px solid #f0b429; outline-offset: 3px; }
      @media (max-width: 700px) { .feedback-modal { padding: 12px; } .feedback-modal-form { padding: 16px; } }
    </style>
    <script>
      (function () {
        const modal = document.querySelector('.feedback-modal');
        if (!modal) return;
        const form = modal.querySelector('.feedback-modal-form');
        const task = modal.querySelector('.feedback-modal-task');
        const closeButton = modal.querySelector('.feedback-modal-close');
        const field = modal.querySelector('#feedback-modal-body');
        const turnstileField = modal.querySelector('.feedback-modal-turnstile');
        const turnstileMarkup = ${JSON.stringify(renderTurnstileWidget())};
        let opener = null;

        function closeModal() {
          modal.hidden = true;
          modal.setAttribute('aria-hidden', 'true');
          turnstileField.textContent = '';
          if (opener) opener.focus({ preventScroll: true });
          opener = null;
        }

        function openModal(taskId, source) {
          if (!/^[A-Z0-9]{4,32}$/i.test(taskId || '')) return;
          opener = source;
          task.textContent = 'Задание ' + taskId.toUpperCase();
          form.action = '/tasks/' + encodeURIComponent(taskId.toUpperCase()) + '/feedback';
          modal.hidden = false;
          modal.setAttribute('aria-hidden', 'false');
          turnstileField.innerHTML = turnstileMarkup;
          if (window.egeTurnstileLoaded) window.egeTurnstileLoaded();
          field.focus({ preventScroll: true });
        }

        document.addEventListener('click', function (event) {
          const source = event.target.closest?.('[data-feedback-modal-open]');
          if (!source) return;
          event.preventDefault();
          openModal(source.dataset.taskId, source);
        });
        closeButton.addEventListener('click', closeModal);
        modal.addEventListener('click', function (event) {
          if (event.target === modal) closeModal();
        });
        document.addEventListener('keydown', function (event) {
          if (event.key === 'Escape' && !modal.hidden) closeModal();
        });
      })();
    </script>
  </section>`;
}

function renderCommentsWidget() {
  return `<aside class="comments-widget" aria-label="Комментарии сайта">
    <button class="comments-widget-trigger" type="button" aria-expanded="false" aria-controls="comments-widget-panel">
      <span class="comments-widget-icon" aria-hidden="true">💬</span>
      <span>Комментарии</span>
      <strong class="comments-widget-count" aria-live="polite">…</strong>
    </button>
    <section class="comments-widget-panel" id="comments-widget-panel" hidden aria-labelledby="comments-widget-title">
      <header class="comments-widget-header">
        <h2 id="comments-widget-title">Комментарии</h2>
        <button class="comments-widget-close" type="button" aria-label="Закрыть комментарии">×</button>
      </header>
      <div class="comments-widget-content" aria-live="polite"><p>Загружаем комментарии…</p></div>
    </section>
    <style>
      .comments-widget { position: fixed; right: 20px; bottom: 20px; z-index: 900; font-family: Arial, sans-serif; }
      .comments-widget-trigger { display: inline-flex; align-items: center; gap: 8px; min-height: 46px; padding: 10px 14px; border: 1px solid #183153;
        border-radius: 23px; background: #183153; color: #fff; box-shadow: 0 4px 16px #10243c38; font: 700 14px/1 Arial, sans-serif; cursor: pointer; }
      .comments-widget-trigger:hover { background: #254a79; }
      .comments-widget-trigger:focus-visible, .comments-widget-close:focus-visible, .comments-widget-item a:focus-visible { outline: 3px solid #f0b429; outline-offset: 3px; }
      .comments-widget-icon { font-size: 18px; line-height: 1; }
      .comments-widget-count { display: inline-grid; min-width: 22px; min-height: 22px; place-items: center; padding: 2px 6px; border-radius: 11px; background: #fff; color: #183153; font-size: 13px; }
      .comments-widget-panel { position: absolute; right: 0; bottom: calc(100% + 10px); width: min(390px, calc(100vw - 24px)); max-height: min(620px, calc(100dvh - 92px));
        overflow: auto; border: 1px solid #cbd7e4; border-radius: 10px; background: #fff; color: #243447; box-shadow: 0 12px 34px #10243c38; }
      .comments-widget-header { position: sticky; top: 0; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 16px; border-bottom: 1px solid #d8e1eb; background: #fff; }
      .comments-widget-header h2 { margin: 0; color: #183153; font: 700 18px/1.3 Arial, sans-serif; }
      .comments-widget-close { display: grid; width: 32px; height: 32px; place-items: center; padding: 0; border: 1px solid #afbdcd; border-radius: 6px; background: #fff; color: #183153; font: 700 21px/1 Arial, sans-serif; cursor: pointer; }
      .comments-widget-close:hover { background: #eaf1f8; }
      .comments-widget-content { padding: 14px 16px 16px; }
      .comments-widget-content > p { margin: 0; color: #526273; font: 14px/1.45 Arial, sans-serif; }
      .comments-widget-list { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
      .comments-widget-item { padding: 12px; border: 1px solid #d8e1eb; border-radius: 7px; background: #f8fafc; }
      .comments-widget-item header { display: flex; flex-wrap: wrap; align-items: baseline; gap: 3px 8px; }
      .comments-widget-item strong { color: #183153; }
      .comments-widget-item .comments-widget-city, .comments-widget-item time { color: #526273; font-size: 12px; }
      .comments-widget-item time { margin-left: auto; }
      .comments-widget-item p { margin: 8px 0; white-space: pre-wrap; overflow-wrap: anywhere; }
      .comments-widget-item a { color: #183153; font-size: 13px; font-weight: 700; }
      .comments-widget-meta { margin: 0 0 10px !important; }
      @media (max-width: 700px) {
        .comments-widget { right: 12px; bottom: max(12px, env(safe-area-inset-bottom)); }
        .comments-widget-trigger { min-height: 44px; padding: 9px 12px; }
      }
      @media print { .comments-widget { display: none; } }
    </style>
    <script>
      (function () {
        const widget = document.querySelector('.comments-widget');
        if (!widget) return;
        const trigger = widget.querySelector('.comments-widget-trigger');
        const panel = widget.querySelector('.comments-widget-panel');
        const closeButton = widget.querySelector('.comments-widget-close');
        const content = widget.querySelector('.comments-widget-content');
        const count = widget.querySelector('.comments-widget-count');

        function closePanel() {
          panel.hidden = true;
          trigger.setAttribute('aria-expanded', 'false');
        }

        function setCount(total) {
          const value = Number(total) || 0;
          count.textContent = String(value);
          count.setAttribute('aria-label', 'Всего комментариев: ' + value);
        }

        function dateText(value) {
          const date = new Date(value);
          return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' });
        }

        function renderComments(payload) {
          const total = Number(payload.total) || 0;
          const comments = Array.isArray(payload.comments) ? payload.comments : [];
          setCount(total);
          content.replaceChildren();
          const meta = document.createElement('p');
          meta.className = 'comments-widget-meta';
          meta.textContent = payload.hasMore ? 'Показаны последние ' + comments.length + ' из ' + total + '.' : 'Всего комментариев: ' + total + '.';
          content.appendChild(meta);
          if (!comments.length) {
            const empty = document.createElement('p');
            empty.textContent = 'Комментариев пока нет. Будьте первым в обсуждении задачи.';
            content.appendChild(empty);
            return;
          }
          const list = document.createElement('ol');
          list.className = 'comments-widget-list';
          comments.forEach(function (comment) {
            const item = document.createElement('li');
            item.className = 'comments-widget-item';
            const header = document.createElement('header');
            const author = document.createElement('strong');
            author.textContent = comment.fullName;
            const city = document.createElement('span');
            city.className = 'comments-widget-city';
            city.textContent = comment.city;
            const time = document.createElement('time');
            time.dateTime = comment.createdAt;
            time.textContent = dateText(comment.createdAt);
            const body = document.createElement('p');
            body.textContent = comment.body;
            const link = document.createElement('a');
            link.href = '/tasks/' + encodeURIComponent(comment.taskId) + '#comments';
            link.textContent = 'Перейти к заданию ' + comment.taskId;
            header.append(author, city, time);
            item.append(header, body, link);
            list.appendChild(item);
          });
          content.appendChild(list);
        }

        async function loadComments() {
          content.replaceChildren();
          const loading = document.createElement('p');
          loading.textContent = 'Загружаем комментарии…';
          content.appendChild(loading);
          try {
            const response = await fetch('/api/comments', { headers: { Accept: 'application/json' } });
            const payload = await response.json().catch(function () { return {}; });
            if (!response.ok) throw new Error(payload.error || 'Не удалось загрузить комментарии.');
            renderComments(payload);
          } catch (error) {
            content.replaceChildren();
            const message = document.createElement('p');
            message.textContent = error.message || 'Не удалось загрузить комментарии.';
            content.appendChild(message);
          }
        }

        trigger.addEventListener('click', function () {
          if (!panel.hidden) {
            closePanel();
            return;
          }
          panel.hidden = false;
          trigger.setAttribute('aria-expanded', 'true');
          loadComments();
          closeButton.focus({ preventScroll: true });
        });
        closeButton.addEventListener('click', function () {
          closePanel();
          trigger.focus({ preventScroll: true });
        });
        document.addEventListener('keydown', function (event) {
          if (event.key === 'Escape' && !panel.hidden) {
            closePanel();
            trigger.focus({ preventScroll: true });
          }
        });
        document.addEventListener('click', function (event) {
          if (!panel.hidden && !widget.contains(event.target)) closePanel();
        });
        function refreshCount() {
          fetch('/api/comments', { headers: { Accept: 'application/json' } })
            .then(function (response) { return response.ok ? response.json() : null; })
            .then(function (payload) { if (payload) setCount(payload.total); })
            .catch(function () { count.textContent = '—'; });
        }
        document.addEventListener('comments:changed', function () {
          if (!panel.hidden) {
            loadComments();
            return;
          }
          refreshCount();
        });
        refreshCount();
      })();
    </script>
  </aside>`;
}

function taskIds(html) {
  return new Set(Array.from(html.matchAll(/<div\s+class=['"][^'"]*qblock[^'"]*['"]\s+id=['"]q([A-Z0-9]+)['"]/gi), match => match[1]));
}

function sourceTaskEntries(html) {
  const starts = Array.from(html.matchAll(/<div\s+class=['"][^'"]*\bqblock\b[^'"]*['"]\s+id=['"]q([A-Z0-9]+)['"][^>]*>/gi));
  const bodyEnd = html.search(/<\/body\s*>/i);
  const lastEnd = bodyEnd >= 0 ? bodyEnd : html.length;
  return starts.map((match, index) => {
    const start = match.index;
    const end = starts[index + 1]?.index ?? lastEnd;
    const fragment = html.slice(start, end);
    const headerPattern = new RegExp(`<div\\s+id=['"]i${match[1]}['"][^>]*>`, 'i');
    const headerOffset = fragment.search(headerPattern);
    const contentHtml = headerOffset >= 0 ? fragment.slice(0, headerOffset) : fragment;
    const metaHtml = headerOffset >= 0 ? fragment.slice(headerOffset) : '';
    return {
      id: normalizeTaskId(match[1]),
      start,
      end,
      fragment,
      text: cleanPlainText(contentHtml).toLocaleLowerCase('ru-RU'),
      meta: cleanPlainText(metaHtml).toLocaleLowerCase('ru-RU')
    };
  });
}

function isNumberPropertiesTask(text) {
  const numberTopic = /натуральн|цел(?:ое|ых|ые|ыми)|делит|кратн|прост(?:ое|ых|ые)|остат|цифр|числ|дроб/.test(text);
  const unrelated = /кредит|банк|вклад|рубл|заём|прибыл|производств|пирами|призм|тетраэдр/.test(text);
  return numberTopic && !unrelated;
}

function isSectionTaskRelevant(section, task) {
  const { text, meta } = task;
  if (section === 'equations') {
    return /решите (?:данное )?(?:уравнение|систему уравнений)|найдите (?:все )?(?:корни|решения) уравнения/.test(text);
  }
  if (section === 'inequalities') {
    return /решите (?:данное )?(?:неравенство|систему неравенств|совокупность неравенств)|найдите (?:все )?решения неравенства/.test(text);
  }
  if (section === 'parameters') {
    // Числовые задачи с дополнительной меткой 2.10 относятся к разделу «Числа».
    return !isNumberPropertiesTask(text);
  }
  if (section === 'optimal') {
    const optimization = /(наибольш|наименьш|максимальн|минимальн).*(прибыл|выруч|затрат|окуп|производств|завод|фирм|предприят)|(?:прибыл|выруч|затрат|окуп|производств|завод|фирм|предприят).*(наибольш|наименьш|максимальн|минимальн)/.test(text);
    return optimization && !/кредит|банк|вклад|за[её]м|долг|плат[её]ж/.test(text);
  }
  if (section === 'numbers') return isNumberPropertiesTask(text);
  if (section === 'finance') {
    return /кредит|банк|вклад|заём|долг|плат[её]ж|процентн.{0,20}ставк|ценн.{0,10}бумаг|пенсионн.{0,10}фонд/.test(text);
  }
  if (section === 'planimetry') {
    return !/7\.2 прямые и плоскости в пространстве|7\.3 многогранники|7\.4 тела и поверхности вращения/.test(meta);
  }
  if (section === 'stereometry') {
    return /7\.2 прямые и плоскости в пространстве|7\.3 многогранники|7\.4 тела и поверхности вращения/.test(meta);
  }
  return true;
}

function filterSectionHtml(html, section) {
  const tasks = sourceTaskEntries(html);
  if (!tasks.length) return html;
  const prefix = html.slice(0, tasks[0].start);
  const suffix = html.slice(tasks[tasks.length - 1].end);
  const selectedIds = new Set();
  const selected = tasks.filter(task => {
    if (!isSectionTaskRelevant(section, task) || selectedIds.has(task.id)) return false;
    selectedIds.add(task.id);
    return true;
  });
  return `${prefix}${selected.map(task => task.fragment).join('')}${suffix}`;
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

function decorate(html, section, onlyAdded = null, seoOverride = null) {
  const isPlane = section === 'planimetry';
  const isParameters = section === 'parameters';
  const isEquations = section === 'equations';
  const isInequalities = section === 'inequalities';
  const isOptimal = section === 'optimal';
  const isNumbers = section === 'numbers';
  const isFinance = section === 'finance';
  const isPhysics = section === 'physics';
  const isSearch = Boolean(seoOverride?.isSearch);
  const physicsTopic = isPhysics ? physicsTopicInfo(seoOverride?.physicsTopic) : null;
  const { name: baseTitle, path: sectionPath, description: sectionDescription } = sectionInfo(section);
  const publishedSolutionIds = listPublishedSolutionIds.all().map(record => record.task_id);
  const taskIdFromPath = seoOverride?.pathname?.match(/^\/tasks\/([A-Z0-9]+)$/i)?.[1] || '';
  const hasTaskSolution = taskIdFromPath && publishedSolutionIds.includes(taskIdFromPath);
  const taskNavigation = seoOverride?.taskNavigation || null;
  const useCataloguePager = !seoOverride?.disableCataloguePager;
  const title = onlyAdded ? `Добавленные задачи — ${baseTitle.toLowerCase()}` : (isPhysics
    ? (physicsTopic ? `${physicsTopic.name} — задачи ЕГЭ по физике` : 'Физика — задания с развёрнутым ответом')
    : `${baseTitle} — задания второй части`);
  const subtitle = isSearch
    ? 'Поиск по номеру и тексту условий открытого банка ФИПИ'
    : (isPhysics
    ? (physicsTopic ? `ФИПИ · КЭС ${physicsTopic.code} · ${physicsTopic.name} · развёрнутый ответ` : 'ФИПИ · все разделы ЕГЭ по физике · развёрнутый ответ · 538 заданий')
    : (isFinance
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
    ? 'ФИПИ · тема 2.10 · развёрнутый ответ · проверенная подборка'
    : (isPlane
      ? 'ФИПИ · тема 7.1 · развёрнутый ответ · проверенная подборка'
      : 'ФИПИ · темы 7.2–7.5 · развёрнутый ответ · проверенная подборка'))))))));
  const fixed = normalizeFipiHtml(html)
    .replace(/<html(?![^>]*\blang=)([^>]*)>/i, '<html lang="ru"$1>')
    .replace(/(<div class="id-text">[\s\S]*?<span class="canselect">)([A-Z0-9]{4,32})(<\/span>)/gi, '$1<a class="task-permalink" href="/tasks/$2">$2</a>$3');

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
    /* В исходных стилях ФИПИ для этого body задан overflow: hidden.
       Без переопределения длинные условия и опубликованные решения не прокручиваются на телефонах. */
    body.questions-container { max-width: 1000px; margin: 0 auto; padding: 24px; overflow-x: hidden; overflow-y: auto !important; background: #f4f6f8; }
    body.questions-container > table { background: white; box-shadow: 0 2px 14px #00000018; }
    .local-header { position: sticky; top: 0; z-index: 50; margin: -24px -24px 20px; padding: 14px 24px;
      background: #183153; color: white; font: 600 16px/1.35 Arial, sans-serif; box-shadow: 0 2px 8px #0003; }
    .local-header small { display: block; margin-top: 3px; font-weight: 400; opacity: .82; }
    .local-header h1 { margin: 0; font: inherit; }
    .telegram-banner { display: flex; align-items: center; justify-content: space-between; gap: 18px; margin: 0 0 20px; padding: 18px 20px;
      border: 1px solid #6f9cd0; border-radius: 10px; background: linear-gradient(120deg, #e7f3ff, #f6fbff); color: #183153;
      box-shadow: 0 2px 10px #18315312; font-family: Arial, sans-serif; }
    .telegram-banner-copy { display: grid; gap: 4px; }
    .telegram-banner-copy strong { font-size: 18px; line-height: 1.25; }
    .telegram-banner-copy span { color: #40566d; font-size: 14px; line-height: 1.4; }
    .telegram-banner-action { display: inline-flex; flex: 0 0 auto; align-items: center; justify-content: center; gap: 7px; min-height: 42px;
      padding: 10px 14px; border-radius: 7px; background: #229ed9; color: #fff; font: 700 14px/1.2 Arial, sans-serif; text-align: center; text-decoration: none; }
    .telegram-banner-action:hover { background: #168ac2; color: #fff; }
    .telegram-banner-action span { font-weight: 500; }
    .task-solution-jump { display: inline-flex; margin-top: 9px; padding: 7px 10px; border-radius: 6px; background: #e8f5e9;
      color: #1d5e2d; font: 700 14px Arial, sans-serif; text-decoration: none; }
    .task-solution-jump:hover { background: #d8f0db; color: #12451f; }
    .task-feedback-jump { display: inline-flex; margin: 9px 0 0 8px; padding: 7px 10px; border: 1px solid #f4d18a; border-radius: 6px; background: #fff5db;
      color: #704900; font: 700 14px Arial, sans-serif; text-decoration: none; }
    .task-feedback-jump:hover { background: #ffedbd; color: #563700; }
    .local-menu { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; margin-top: 10px; }
    .local-menu a { padding: 7px 8px; border: 1px solid #ffffff70; border-radius: 6px; color: white; text-decoration: none;
      font-weight: 500; text-align: center; white-space: normal; }
    .local-menu a:hover { background: #ffffff18; }
    .local-menu a.active { background: white; color: #183153; }
    .physics-top-button { position: absolute; top: 12px; right: 24px; display: inline-flex; align-items: center; justify-content: center; min-height: 46px; padding: 9px 22px; border: 2px solid #f0b429; border-radius: 8px; background: #f0b429; color: #183153; font-size: 21px; font-weight: 800; line-height: 1; text-decoration: none; box-shadow: 0 3px 8px #0005; }
    .physics-top-button:hover { background: #ffd166; border-color: #ffd166; color: #183153; }
    .local-menu form { margin: 0; min-width: 0; }
    .local-menu button { padding: 7px 11px; border: 1px solid #ffffff70; border-radius: 6px; color: white;
      background: transparent; font: 500 14px Arial, sans-serif; cursor: pointer; width: 100%; height: 100%; white-space: normal; }
    .local-menu button:hover { background: #ffffff18; }
    .physics-topics { margin: 0 0 20px; padding: 18px; border: 1px solid #cbd7e4; border-radius: 10px;
      background: #fff; color: #243447; font-family: Arial, sans-serif; box-shadow: 0 2px 10px #18315312; }
    .physics-topics-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
    .physics-topics h2 { margin: 0; color: #183153; font-size: 21px; }
    .physics-topics a { color: #1769aa; text-decoration: none; }
    .physics-topics a:hover { text-decoration: underline; }
    .physics-topics a.active { color: #fff; background: #1769aa; }
    .physics-topics-heading > a, .physics-topic-major, .physics-topic-children a { display: block; padding: 8px 10px; border-radius: 6px; }
    .physics-topic-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .physics-topic-group { overflow: hidden; border: 1px solid #d8e1eb; border-radius: 8px; }
    .physics-topic-major { font-weight: 700; background: #eef4fa; }
    .physics-topic-children { display: grid; gap: 2px; padding: 6px; }
    .physics-topic-count { color: #526273; font-weight: 400; }
    .physics-topics a.active .physics-topic-count { color: inherit; }
    .site-search-form { display: flex; align-items: stretch; gap: 7px; margin-top: 10px; font-family: Arial, sans-serif; }
    .site-search-form input { min-width: 0; flex: 1 1 230px; padding: 8px 10px; border: 1px solid #afbdcd; border-radius: 6px;
      color: #183153; background: #fff; font: 14px/1.2 Arial, sans-serif; }
    .site-search-form button { flex: 0 0 auto; padding: 8px 12px; border: 1px solid #ffffff70; border-radius: 6px;
      color: #fff; background: #254a79; font: 600 14px/1.2 Arial, sans-serif; cursor: pointer; }
    .site-search-form button:hover { background: #335d94; }
    .visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden;
      clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
    .task-permalink { color: inherit; text-decoration: underline; text-underline-offset: 2px; }
    .task-permalink:hover { color: #0c4a6e; }
    .local-pager { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 7px;
      margin: 18px 0; padding: 12px; background: white; border-radius: 8px; box-shadow: 0 1px 7px #00000015;
      font: 14px Arial, sans-serif; }
    .local-pager--top { margin-top: 0; }
    .local-pager button { min-width: 38px; padding: 8px 11px; border: 1px solid #b8c3d1; border-radius: 6px;
      background: white; color: #183153; cursor: pointer; }
    .local-pager button:hover:not(:disabled) { background: #eaf1f8; }
    .local-pager button.active { border-color: #183153; background: #183153; color: white; }
    .local-pager button:disabled { cursor: default; opacity: .4; }
    .local-page-label { margin: 0 6px; color: #4b5968; }
    .task-sequence-pager { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 7px;
      margin: 0 0 18px; padding: 12px; background: white; border-radius: 8px; box-shadow: 0 1px 7px #00000015;
      font: 14px Arial, sans-serif; }
    .task-sequence-pager a, .task-sequence-pager span { min-height: 36px; box-sizing: border-box; display: inline-flex; align-items: center;
      justify-content: center; padding: 8px 11px; border: 1px solid #b8c3d1; border-radius: 6px; color: #183153; text-decoration: none; }
    .task-sequence-pager a:hover { background: #eaf1f8; }
    .task-sequence-pager .task-sequence-pager-label { border: 0; color: #4b5968; }
    .task-sequence-pager .task-sequence-pager-disabled { opacity: .4; }
    .search-page { margin: 0 0 24px; padding: 24px; border: 1px solid #d8e1eb; border-radius: 8px; background: #fff;
      box-shadow: 0 1px 7px #00000012; color: #243447; font: 16px/1.5 Arial, sans-serif; }
    .search-page h2 { margin: 0 0 14px; color: #183153; font-size: 24px; line-height: 1.25; }
    .search-page .site-search-form { margin: 0 0 14px; }
    .search-page .site-search-form input { border-color: #7f98b4; font-size: 16px; }
    .search-page .site-search-form button { border-color: #183153; background: #183153; }
    .search-page .site-search-form button:hover { background: #254a79; }
    .search-summary { margin: 0 0 14px; color: #4b5968; }
    .search-results { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
    .search-results a { display: grid; gap: 4px; padding: 14px 16px; border: 1px solid #cbd7e4; border-radius: 7px;
      color: #183153; text-decoration: none; background: #f8fafc; }
    .search-results a:hover { border-color: #7194ba; background: #eef4fa; }
    .search-results strong { font-size: 16px; }
    .search-results span { color: #40566d; font-size: 14px; }
    .local-task-hidden { display: none !important; }
    .solution-controls { margin-top: 16px; padding-top: 14px; border-top: 1px solid #d8e1eb; font-family: Arial, sans-serif; }
    .solution-controls.has-published-solution { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; border-color: #86ae8e; }
    .solution-published-badge { display: inline-flex; align-items: center; min-height: 34px; padding: 0 10px; border-radius: 17px;
      background: #e8f5e9; color: #1f6330; font: 700 13px Arial, sans-serif; }
    .solution-controls.has-published-solution .solution-discussion-link { margin-left: 0; }
    .solution-button { padding: 9px 14px; border: 1px solid #183153; border-radius: 6px; background: #183153; color: #fff;
      font: 600 14px Arial, sans-serif; cursor: pointer; }
    .solution-button:hover:not(:disabled) { background: #254a79; }
    .solution-button:disabled { cursor: wait; opacity: .7; }
    .solution-discussion-link { display: inline-flex; align-items: center; min-height: 38px; margin-left: 10px; color: #183153;
      font: 600 14px Arial, sans-serif; text-decoration: underline; text-underline-offset: 2px; }
    .solution-discussion-link:hover { color: #254a79; }
    .solution-feedback-link { display: inline-flex; align-items: center; min-height: 38px; margin-left: 2px; color: #704900;
      padding: 0; border: 0; background: transparent; font: 600 14px Arial, sans-serif; text-decoration: underline; text-underline-offset: 2px; cursor: pointer; }
    .solution-feedback-link:hover { color: #563700; }
    .solution-result { margin-top: 12px; padding: 14px 16px; border-radius: 6px; background: #eef4fa; color: #243447; }
    .solution-result[hidden] { display: none; }
    .solution-result p { margin: 0 0 10px; }
    .solution-result p:last-child { margin-bottom: 0; }
    .solution-answer { font-weight: 700; }
    .solution-text { margin: 0; font: 16px/1.55 Arial, sans-serif; }
    .solution-text p, .formatted-solution p { margin: 0 0 12px; }
    .solution-text p:last-child, .formatted-solution p:last-child { margin-bottom: 0; }
    .math-fraction { display: inline-flex; flex-direction: column; min-width: 1.1em; margin: 0 .08em; vertical-align: middle;
      text-align: center; font: .93em/1.05 'Cambria Math', 'STIX Two Math', serif; }
    .math-fraction > span { display: block; padding: 0 .12em; }
    .math-fraction > span:first-child { border-bottom: 1px solid currentColor; }
    .math-root { display: inline-flex; align-items: flex-start; margin-right: .03em; vertical-align: middle;
      font-family: 'Cambria Math', 'STIX Two Math', serif; }
    .math-radicand { margin-top: .11em; padding: 0 .08em 0 .1em; border-top: 1px solid currentColor; line-height: .95; }
    .math-vector { position: relative; display: inline-block; padding-top: .13em; vertical-align: middle;
      font-family: 'Cambria Math', 'STIX Two Math', serif; }
    .math-vector::before { position: absolute; top: -.5em; left: 50%; content: '→'; transform: translateX(-50%); font-size: .85em; line-height: 1; }
    .solution-text sub, .solution-text sup, .formatted-solution sub, .formatted-solution sup { font-size: .75em; line-height: 0; }
    .solution-modal { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; padding: 24px;
      background: #10243c99; font-family: Arial, sans-serif; }
    .solution-modal[hidden] { display: none; }
    .solution-modal-dialog { display: flex; flex-direction: column; width: min(940px, 100%); max-height: calc(100dvh - 48px);
      overflow: hidden; border-radius: 10px; background: #eef4fa; color: #243447; box-shadow: 0 12px 40px #0008; }
    .solution-modal-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex: 0 0 auto;
      padding: 14px 18px; border-bottom: 1px solid #cbd7e4; background: #fff; }
    .solution-modal-title { margin: 0; color: #183153; font: 700 17px/1.35 Arial, sans-serif; }
    .solution-modal-close { min-width: 38px; min-height: 38px; border: 1px solid #183153; border-radius: 6px; background: #fff;
      color: #183153; font: 700 22px/1 Arial, sans-serif; cursor: pointer; }
    .solution-modal-close:hover { background: #eaf1f8; }
    .solution-modal-body { min-height: 0; overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch;
      padding: 18px; scrollbar-gutter: stable; }
    .solution-modal-body p { margin: 0 0 10px; }
    .solution-modal-body p:last-child { margin-bottom: 0; }
    .solution-figure { margin: 16px 0 0; }
    .solution-diagram-caption { margin: 8px 0 0; color: #40566d; font: 14px/1.45 Arial, sans-serif; }
    .solution-diagram { display: block; width: min(100%, 560px); height: auto; max-height: none; margin-top: 12px; border: 1px solid #cbd7e4;
      border-radius: 4px; background: #fff; object-fit: contain; }
    .solution-comments { margin: 20px 0; padding: 20px; border: 1px solid #cbd7e4; border-radius: 8px; background: #fff;
      color: #243447; font-family: Arial, sans-serif; }
    .solution-comments h2 { margin: 0 0 14px; color: #183153; font-size: 21px; }
    .solution-comments-list { display: grid; gap: 12px; }
    .solution-comment { padding: 14px; border: 1px solid #d8e1eb; border-radius: 7px; background: #f8fafc; }
    .solution-comment header { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; }
    .solution-comment header strong { color: #183153; }
    .solution-comment header span, .solution-comment time { color: #526273; font-size: 13px; }
    .solution-comment time { margin-left: auto; }
    .solution-comment p { margin: 8px 0 0; white-space: pre-wrap; overflow-wrap: anywhere; }
    .solution-comment-delete-form { margin: 10px 0 0; }
    .solution-comment-delete-form button { padding: 7px 10px; border: 1px solid #8c241b; border-radius: 6px; background: #fff; color: #8c241b;
      font: 600 13px Arial, sans-serif; cursor: pointer; }
    .solution-comment-delete-form button:hover { background: #fbe9e8; }
    .solution-comments-empty, .solution-comments-login, .solution-comments-public { margin: 0; color: #526273; }
    .solution-comments-notice { margin: 0 0 12px; padding: 10px 12px; border-radius: 6px; background: #e9f2fb; color: #183153; }
    .solution-comment-form { margin-top: 18px; }
    .solution-comment-form label { display: block; margin-bottom: 6px; font-weight: 700; }
    .solution-comment-form textarea { display: block; width: 100%; min-height: 92px; padding: 10px 12px; border: 1px solid #afbdcd; border-radius: 6px;
      color: #243447; font: 16px/1.45 Arial, sans-serif; resize: vertical; }
    .solution-comment-form button { margin-top: 10px; padding: 9px 14px; border: 1px solid #183153; border-radius: 6px; background: #183153;
      color: #fff; font: 600 14px Arial, sans-serif; cursor: pointer; }
    .solution-comment-form button:hover:not(:disabled) { background: #254a79; }
    .solution-comment-form .comment-error { margin: 9px 0 0; color: #8c241b; }
    .site-feedback { margin: 20px 0; padding: 20px; border: 1px solid #bad4c0; border-radius: 8px; background: #f5fbf6;
      color: #243447; font-family: Arial, sans-serif; }
    .site-feedback h2 { margin: 0 0 10px; color: #183153; font-size: 21px; }
    .site-feedback > p { margin: 0 0 8px; }
    .site-feedback-private { color: #526273; font-size: 14px; }
    .site-feedback-notice, .site-feedback-error { margin: 12px 0 !important; padding: 10px 12px; border-radius: 6px; }
    .site-feedback-notice { background: #e8f5e9; color: #1d5e2d; }
    .site-feedback-error { background: #fbe9e8; color: #8c241b; }
    .site-feedback-form { margin-top: 16px; }
    .site-feedback-form label { display: block; margin: 12px 0 6px; font-weight: 700; }
    .site-feedback-form select, .site-feedback-form textarea { display: block; width: 100%; padding: 10px 12px; border: 1px solid #afbdcd; border-radius: 6px;
      color: #243447; background: #fff; font: 16px/1.45 Arial, sans-serif; }
    .site-feedback-form textarea { min-height: 100px; resize: vertical; }
    .site-feedback-form button { margin-top: 10px; padding: 9px 14px; border: 1px solid #183153; border-radius: 6px; background: #183153;
      color: #fff; font: 600 14px Arial, sans-serif; cursor: pointer; }
    .site-feedback-form button:hover { background: #254a79; }
    .seo-task-solution { margin: 20px 0; padding: 20px; border: 1px solid #cbd7e4; border-radius: 8px; background: #eef4fa;
      color: #243447; font-family: Arial, sans-serif; }
    .seo-task-solution h2 { margin: 0 0 12px; color: #183153; font-size: 21px; }
    .seo-task-solution p { margin: 0 0 12px; }
    .seo-task-solution .formatted-solution { margin: 0; font: 16px/1.55 Arial, sans-serif; }
    .seo-task-solution figure { margin: 16px 0 0; }
    .seo-task-solution figcaption { margin-top: 8px; color: #40566d; font-size: 14px; }
    .seo-task-solution img { display: block; width: min(100%, 560px); height: auto; border: 1px solid #cbd7e4; border-radius: 4px; background: #fff; }
    @media (max-width: 700px) {
      body.questions-container { padding: 12px; overflow-x: hidden; }
      .local-header { position: static; margin: -12px -12px 14px; padding: 14px 12px; font-size: 15px; }
      .physics-top-button { position: static; margin: 0 0 10px auto; min-height: 42px; padding: 8px 18px; font-size: 19px; }
      .local-header small { font-size: 12px; line-height: 1.35; }
      .telegram-banner { align-items: stretch; flex-direction: column; gap: 12px; margin-bottom: 14px; padding: 16px; }
      .telegram-banner-copy strong { font-size: 16px; }
      .telegram-banner-action { width: 100%; }
      .local-menu { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin-top: 12px; }
      .local-menu a, .local-menu button { display: grid; place-items: center; min-height: 46px; padding: 6px 4px;
        font-size: 12px; line-height: 1.2; overflow-wrap: anywhere; }
      .physics-topics { padding: 14px 12px; }
      .physics-topics-heading { align-items: flex-start; flex-direction: column; }
      .physics-topic-grid { grid-template-columns: 1fr; }
      .qblock { margin-top: 8px; padding: 14px 16px; }
      .qblock, .qblock p, .qblock .hint { font-size: 17px; line-height: 1.48; text-align: left; }
      .qblock > form table[align="right"] { float: none; margin: 12px auto; max-width: 100%; }
      .task-header-panel { display: grid; grid-template-columns: 32px minmax(0, 1fr); gap: 8px; align-items: center; padding: 9px 8px; }
      .task-header-panel .id-text { min-width: 0; margin: 0; font-size: 15px; }
      .task-header-panel .favorite-button { display: none; }
      .task-header-panel .answer-panel { grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; gap: 8px; min-width: 0; }
      .task-header-panel .task-status { min-width: 0; font-size: 14px; }
      .task-header-panel .answer-button { float: none; flex: 0 0 auto; width: auto; height: 36px; margin: 0; padding: 8px 10px; font-size: 12px; }
      .task-header-panel .task-info-panel { left: 8px; right: 8px; bottom: auto; top: 48px; max-width: none; }
      .task-info-panel .task-info-content { padding: 10px 12px; overflow-x: auto; }
      .local-pager { gap: 6px; margin: 14px 0; padding: 10px 8px; }
      .local-pager button { min-width: 36px; padding: 8px 9px; font-size: 13px; }
      .local-page-label { flex: 1 0 100%; margin: 2px 0 0; text-align: center; font-size: 12px; }
      .site-search-form input { flex-basis: 0; }
      .search-page { margin-bottom: 16px; padding: 18px 14px; }
      .search-page h2 { font-size: 21px; }
      .solution-controls { margin-top: 14px; }
      .solution-controls.has-published-solution { gap: 7px; }
      .solution-published-badge { min-height: 32px; font-size: 12px; }
      .solution-button { min-height: 38px; font-size: 14px; }
      .solution-discussion-link { margin-left: 8px; font-size: 13px; }
      .solution-result { padding: 12px; }
      .solution-text { font-size: 15px; }
      /* На iOS прокрутка вложенного блока внутри fixed-диалога может не принимать жесты.
         Поэтому на телефоне прокручивается само полноэкранное окно решения. */
      .solution-modal { display: block; padding: 0; overflow-y: auto; overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch; touch-action: pan-y; }
      .solution-modal-dialog { display: block; width: 100%; min-height: 100%; height: auto; max-height: none; border-radius: 0; }
      .solution-modal-header { position: sticky; top: 0; z-index: 1; padding: 12px; }
      .solution-modal-title { font-size: 16px; }
      .solution-modal-body { min-height: calc(100dvh - 63px); overflow: visible; padding: 14px 12px 24px; }
    }
    @media print { .local-header { position: static; margin: 0 0 16px; } body.questions-container { background: white; padding: 0; } }
  </style>`;
  const loadingGuard = `<script>${useCataloguePager ? `document.documentElement.classList.add('page-loading'${onlyAdded ? ", 'added-loading'" : ''});` : ''}
    // В исходной странице ФИПИ эти функции принадлежат родительскому iframe.
    // Здесь документ открыт самостоятельно, поэтому оставляем безопасные заглушки:
    // ошибка старого скрипта не должна прерывать работу навигации каталога.
    if (typeof window.setQCount !== 'function') window.setQCount = function () {};
    if (typeof window.setContainerSize !== 'function') window.setContainerSize = function () {};
    if (typeof window.MathJax === 'undefined') {
      window.MathJax = { Hub: { Register: { StartupHook: function () {} } } };
    }
    // Если внешний HTML задания нарушит работу скрипта, каталог всё равно не останется скрытым.
    ${useCataloguePager ? "window.setTimeout(function () { document.documentElement.classList.remove('page-loading', 'added-loading'); }, 2500);" : ''}
  </script>`;
  const documentTitle = seoOverride?.title || title;
  const pageTitle = `<title>${escapeHtml(documentTitle)}</title>`;
  const pageDescription = onlyAdded
    ? `Новые задания раздела «${baseTitle}» из открытого банка ФИПИ.`
    : sectionDescription;
  const pageSeo = renderSeoMetadata(seoOverride?.title ? seoOverride : {
    title: documentTitle,
    description: pageDescription,
    pathname: sectionPath,
    robots: onlyAdded ? 'noindex,follow' : 'index,follow',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      description: pageDescription,
      url: absoluteUrl(sectionPath),
      inLanguage: 'ru',
      isPartOf: { '@type': 'WebSite', name: 'ЕГЭ ФИПИ — математика и физика', url: SITE_ORIGIN }
    }
  });
  const viewportMeta = /<meta\s+[^>]*name=["']viewport["']/i.test(fixed)
    ? ''
    : '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">';
  const headerTitle = seoOverride?.heading || title;
  const sectionMenu = isPhysics
    ? `<a href="/physics" class="active">Физика</a><a href="/added?section=physics" class="${onlyAdded ? 'active' : ''}">Добавленные задачи</a>`
    : `<a href="/equations" class="${isEquations ? 'active' : ''}">Уравнения</a>
      <a href="/" class="${!isPlane && !isParameters && !isEquations && !isInequalities && !isOptimal && !isNumbers && !isFinance && !isSearch ? 'active' : ''}">Стереометрия</a>
      <a href="/inequalities" class="${isInequalities ? 'active' : ''}">Неравенства</a>
      <a href="/finance" class="${isFinance ? 'active' : ''}">Финансовая математика</a>
      <a href="/optimal" class="${isOptimal ? 'active' : ''}">Оптимальный выбор</a>
      <a href="/planimetry" class="${isPlane ? 'active' : ''}">Планиметрия</a>
      <a href="/parameters" class="${isParameters ? 'active' : ''}">Задачи с параметром</a>
      <a href="/numbers" class="${isNumbers ? 'active' : ''}">Числа и их свойства</a>
      <a href="/physics">Физика</a>
      <a href="/added?section=${section}" class="${onlyAdded ? 'active' : ''}">Добавленные задачи</a>`;
  const header = `<div class="local-header"><a class="physics-top-button" href="/physics">Физика</a><h1>${escapeHtml(headerTitle)}</h1>
    <small>${subtitle}</small>
    ${hasTaskSolution ? `<a class="task-solution-jump" href="#solution-${escapeHtml(taskIdFromPath)}">Решение опубликовано — перейти к ответу ↓</a>` : ''}
    ${taskIdFromPath ? `<a class="task-feedback-jump" href="#feedback" data-feedback-modal-open data-task-id="${escapeHtml(taskIdFromPath)}">Ошибка или пожелание</a>` : ''}
    <form class="site-search-form" action="/search" method="get" role="search">
      <label class="visually-hidden" for="site-search-query">Поиск по заданиям</label>
      <input id="site-search-query" name="q" type="search" value="${escapeHtml(seoOverride?.searchQuery || '')}" placeholder="Поиск по номеру или условию" autocomplete="off">
      <button type="submit">Найти</button>
    </form>
    <nav class="local-menu">${sectionMenu}
      <a href="/account">Личный кабинет</a>
      <a href="/about">О проекте</a>
      <form method="post" action="/update?section=${section}"><button type="submit">↻ Обновить из ФИПИ</button></form>
    </nav></div>`;
  const taskPager = taskNavigation ? `<nav class="task-sequence-pager" aria-label="Навигация по заданиям раздела">
    ${taskNavigation.previous ? `<a href="/tasks/${escapeHtml(taskNavigation.previous)}">← Предыдущее</a>` : '<span class="task-sequence-pager-disabled">← Предыдущее</span>'}
    <span class="task-sequence-pager-label">Задание ${taskNavigation.position} из ${taskNavigation.total}</span>
    <a href="${escapeHtml(taskNavigation.sectionPath)}">Все задания раздела</a>
    ${taskNavigation.next ? `<a href="/tasks/${escapeHtml(taskNavigation.next)}">Следующее →</a>` : '<span class="task-sequence-pager-disabled">Следующее →</span>'}
  </nav>` : '';
  const physicsCounts = {};
  if (isPhysics && !isSearch) {
    const taskBlocks = [...fixed.matchAll(/<div[^>]+class=["'][^"']*qblock[^"']*["'][^>]*>[\s\S]*?(?=<div[^>]+class=["'][^"']*qblock[^"']*["'][^>]*>|<\/body>|$)/gi)].map(match => match[0]);
    const primaryCodes = taskBlocks.map(block => block.match(/\b([1-5]\.[0-9]+(?:\.[0-9]+)*)\b/)?.[1] || '').filter(Boolean);
    for (const group of PHYSICS_TOPICS) {
      for (const [code] of [[group.code, group.name], ...group.children]) {
        const codePattern = new RegExp(`^${code.replace('.', '\\.')}(?:\\.[0-9]+)*$`);
        physicsCounts[code] = primaryCodes.filter(primary => codePattern.test(primary)).length;
      }
    }
  }
  const physicsTopicMenu = isPhysics && !isSearch ? renderPhysicsTopicMenu(physicsTopic?.code || '', physicsCounts) : '';
  const pagerScript = useCataloguePager ? `<script>
  window.addEventListener('DOMContentLoaded', function () {
    let currentPage = 1;
    let resizeTimer;
    let pages = [];
    const allowedIds = ${JSON.stringify(onlyAdded)};
    const publishedSolutionIds = new Set(${JSON.stringify(publishedSolutionIds)});
    const section = ${JSON.stringify(section)};
    const physicsTopic = ${JSON.stringify(physicsTopic?.code || '')};
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
      if (section === 'physics' && physicsTopic) {
        const code = meta.match(/\b([1-5]\.[0-9]+(?:\.[0-9]+)*)\b/)?.[1] || '';
        return code === physicsTopic || code.startsWith(physicsTopic + '.');
      }
      if (section === 'planimetry') {
        return !/7\\.2 прямые и плоскости в пространстве|7\\.3 многогранники|7\\.4 тела и поверхности вращения/.test(meta);
      }
      if (section === 'stereometry') {
        return /7\\.2 прямые и плоскости в пространстве|7\\.3 многогранники|7\\.4 тела и поверхности вращения/.test(meta);
      }
      return true;
    }
    // Старый HTML банка неидеален. Собираем пары по устойчивому идентификатору
    // самого задания, а не по родительскому элементу панели: мобильные браузеры
    // могут по-разному восстанавливать вложенность такой разметки.
    const allTasks = Array.from(document.querySelectorAll('.qblock[id^="q"]')).map(content => {
      const id = content.id.slice(1);
      const header = id ? document.getElementById('i' + id) : null;
      return header ? { id, header, content } : null;
    }).filter(Boolean);
    const tasks = allTasks.filter(task => {
      const keep = (!allowedIds || allowedIds.includes(task.id)) && relevant(task);
      if (!keep) {
        task.header.classList.add('local-task-hidden');
        if (task.content) task.content.classList.add('local-task-hidden');
      }
      return keep;
    });

    let modalOpener = null;
    const solutionModal = document.createElement('section');
    solutionModal.className = 'solution-modal';
    solutionModal.hidden = true;
    solutionModal.setAttribute('role', 'dialog');
    solutionModal.setAttribute('aria-modal', 'true');
    solutionModal.setAttribute('aria-labelledby', 'solution-modal-title');
    solutionModal.innerHTML = '<div class="solution-modal-dialog"><header class="solution-modal-header"><h2 class="solution-modal-title" id="solution-modal-title"></h2><button class="solution-modal-close" type="button" aria-label="Закрыть решение">×</button></header><div class="solution-modal-body" tabindex="0"></div></div>';
    document.body.appendChild(solutionModal);
    const modalTitle = solutionModal.querySelector('.solution-modal-title');
    const modalBody = solutionModal.querySelector('.solution-modal-body');
    const modalClose = solutionModal.querySelector('.solution-modal-close');

    function closeSolutionModal() {
      solutionModal.hidden = true;
      if (modalOpener) modalOpener.focus({ preventScroll: true });
      modalOpener = null;
    }

    function modalCommentElement(comment, taskId) {
      const article = document.createElement('article');
      article.className = 'solution-comment';
      const header = document.createElement('header');
      const author = document.createElement('strong');
      author.textContent = comment.fullName;
      const city = document.createElement('span');
      city.textContent = comment.city;
      const time = document.createElement('time');
      time.dateTime = comment.createdAt;
      const date = new Date(comment.createdAt);
      time.textContent = Number.isNaN(date.getTime()) ? '' : date.toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' });
      const body = document.createElement('p');
      body.textContent = comment.body;
      header.append(author, city, time);
      article.append(header, body);
      if (comment.isOwn) {
        const form = document.createElement('form');
        form.className = 'solution-comment-delete-form';
        form.method = 'post';
        form.action = '/account/comments/' + encodeURIComponent(comment.id) + '/delete';
        const next = document.createElement('input');
        next.type = 'hidden';
        next.name = 'next';
        next.value = location.pathname + location.search + '#comments';
        const button = document.createElement('button');
        button.type = 'submit';
        button.textContent = 'Удалить мой комментарий';
        form.append(next, button);
        article.appendChild(form);
      }
      return article;
    }

    function appendSolutionComments(solution, taskId) {
      const section = document.createElement('section');
      section.className = 'solution-comments';
      const heading = document.createElement('h3');
      heading.textContent = 'Комментарии к решению';
      const list = document.createElement('div');
      list.className = 'solution-comments-list';
      const comments = Array.isArray(solution.comments) ? solution.comments : [];
      if (comments.length) {
        comments.forEach(comment => list.appendChild(modalCommentElement(comment, taskId)));
      } else {
        const empty = document.createElement('p');
        empty.className = 'solution-comments-empty';
        empty.textContent = 'Комментариев пока нет. Будьте первым.';
        list.appendChild(empty);
      }
      section.append(heading, list);
      if (!solution.viewer) {
        const hint = document.createElement('p');
        hint.className = 'solution-comments-login';
        const prefix = document.createTextNode('Чтобы оставить комментарий, ');
        const login = document.createElement('a');
        login.href = '/account/login?next=' + encodeURIComponent(location.pathname + location.search + '#comments');
        login.textContent = 'войдите';
        const middle = document.createTextNode(' или ');
        const register = document.createElement('a');
        register.href = '/account/register?next=' + encodeURIComponent(location.pathname + location.search + '#comments');
        register.textContent = 'зарегистрируйтесь';
        hint.append(prefix, login, middle, register, '.');
        section.appendChild(hint);
        return section;
      }
      const form = document.createElement('form');
      form.className = 'solution-comment-form';
      const label = document.createElement('label');
      const inputId = 'modal-comment-' + taskId;
      label.htmlFor = inputId;
      label.textContent = 'Ваш комментарий';
      const field = document.createElement('textarea');
      field.id = inputId;
      field.name = 'body';
      field.maxLength = ${MAX_COMMENT_LENGTH};
      field.required = true;
      field.placeholder = 'Напишите вопрос или дополнение к решению';
      const button = document.createElement('button');
      button.type = 'submit';
      button.textContent = 'Отправить комментарий';
      const error = document.createElement('p');
      error.className = 'comment-error';
      error.hidden = true;
      form.append(label, field, button, error);
      form.addEventListener('submit', async function (event) {
        event.preventDefault();
        error.hidden = true;
        button.disabled = true;
        try {
          const response = await fetch('/tasks/' + encodeURIComponent(taskId) + '/comments', {
            method: 'POST',
            headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ body: field.value }).toString()
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok || !payload.comment) throw new Error(payload.error || 'Не удалось отправить комментарий.');
          solution.comments = comments;
          solution.comments.push(payload.comment);
          list.querySelector('.solution-comments-empty')?.remove();
          list.appendChild(modalCommentElement(payload.comment, taskId));
          document.dispatchEvent(new Event('comments:changed'));
          field.value = '';
        } catch (requestError) {
          error.textContent = requestError.message || 'Не удалось отправить комментарий.';
          error.hidden = false;
        } finally {
          button.disabled = false;
        }
      });
      section.appendChild(form);
      return section;
    }

    function openSolutionModal(solution, taskId, opener) {
      modalOpener = opener;
      modalTitle.textContent = 'Решение задания ' + taskId;
      modalBody.replaceChildren();
      if (solution.answer) {
        const answer = document.createElement('p');
        answer.className = 'solution-answer';
        if (solution.answerHtml) {
          answer.innerHTML = '<strong>Ответ:</strong> ' + solution.answerHtml;
        } else {
          answer.textContent = 'Ответ: ' + solution.answer;
        }
        modalBody.appendChild(answer);
      }
      const title = document.createElement('p');
      title.textContent = 'Решение:';
      modalBody.appendChild(title);
      const text = document.createElement('div');
      text.className = 'solution-text';
      if (solution.solutionHtml) {
        text.innerHTML = solution.solutionHtml;
      } else {
        text.textContent = solution.solution;
      }
      modalBody.appendChild(text);
      if (solution.diagramSvg) {
        const figure = document.createElement('figure');
        figure.className = 'solution-figure';
        const diagram = document.createElement('img');
        diagram.className = 'solution-diagram';
        diagram.alt = 'Схема к решению задания ' + taskId;
        diagram.src = URL.createObjectURL(new Blob([solution.diagramSvg], { type: 'image/svg+xml' }));
        figure.appendChild(diagram);
        if (solution.diagramCaption) {
          const caption = document.createElement('figcaption');
          caption.className = 'solution-diagram-caption';
          caption.textContent = 'Обозначения: ' + solution.diagramCaption;
          figure.appendChild(caption);
        }
        modalBody.appendChild(figure);
      }
      modalBody.appendChild(appendSolutionComments(solution, taskId));
      modalBody.scrollTop = 0;
      solutionModal.scrollTop = 0;
      solutionModal.hidden = false;
      modalClose.focus({ preventScroll: true });
    }

    modalClose.addEventListener('click', closeSolutionModal);
    solutionModal.addEventListener('click', event => {
      if (event.target === solutionModal) closeSolutionModal();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !solutionModal.hidden) closeSolutionModal();
    });

    function addSolutionControls() {
      tasks.forEach(task => {
        const sourceTaskId = task.content?.id?.replace(/^q/, '') || '';
        const taskId = sourceTaskId.toUpperCase();
        if (!/^[A-Z0-9]{4,32}$/i.test(sourceTaskId) || task.content.querySelector('.solution-controls')) return;

        const controls = document.createElement('section');
        controls.className = 'solution-controls';
        const hasPublishedSolution = publishedSolutionIds.has(taskId);
        if (hasPublishedSolution) controls.classList.add('has-published-solution');
        const button = document.createElement('button');
        button.className = 'solution-button';
        button.type = 'button';
        button.textContent = hasPublishedSolution ? 'Открыть решение' : 'Решение';
        button.setAttribute('aria-haspopup', 'dialog');
        const result = document.createElement('div');
        result.className = 'solution-result';
        result.hidden = true;
        const discussionLink = document.createElement('a');
        discussionLink.className = 'solution-discussion-link';
        discussionLink.href = '/tasks/' + encodeURIComponent(taskId) + '#comments';
        discussionLink.textContent = 'Комментарии к решению';
        const feedbackLink = document.createElement('button');
        feedbackLink.className = 'solution-feedback-link';
        feedbackLink.type = 'button';
        feedbackLink.dataset.feedbackModalOpen = '';
        feedbackLink.dataset.taskId = taskId;
        feedbackLink.textContent = 'Ошибка или пожелание';
        if (hasPublishedSolution) {
          const badge = document.createElement('span');
          badge.className = 'solution-published-badge';
          badge.textContent = '✓ Решение опубликовано';
          controls.append(badge);
        }
        controls.append(button, discussionLink, feedbackLink, result);
        task.content.appendChild(controls);

        button.addEventListener('click', async function () {
          if (controls.dataset.loaded === 'true') {
            openSolutionModal(controls.solutionData, taskId, button);
            return;
          }

          button.disabled = true;
          button.textContent = 'Загрузка…';
          result.hidden = false;
          result.replaceChildren();
          const loading = document.createElement('p');
          loading.textContent = 'Загружаем решение…';
          result.appendChild(loading);

          try {
            const response = await fetch('/api/solutions/' + encodeURIComponent(taskId), { headers: { Accept: 'application/json' } });
            if (response.status === 404) {
              result.replaceChildren();
              const message = document.createElement('p');
              message.textContent = 'Решение ещё не опубликовано.';
              result.appendChild(message);
              return;
            }
            if (!response.ok) throw new Error('Не удалось загрузить решение.');
            const solution = await response.json();
            result.replaceChildren();
            result.hidden = true;
            controls.solutionData = solution;
            openSolutionModal(solution, taskId, button);
            controls.dataset.loaded = 'true';
            button.textContent = 'Открыть решение';
          } catch {
            result.replaceChildren();
            const message = document.createElement('p');
            message.textContent = 'Не удалось загрузить решение. Попробуйте ещё раз.';
            result.appendChild(message);
          } finally {
            button.disabled = false;
            if (controls.dataset.loaded !== 'true') button.textContent = hasPublishedSolution ? 'Открыть решение' : 'Решение';
          }
        });
      });
    }

    addSolutionControls();
    document.documentElement.classList.remove('added-loading');
    const top = document.createElement('nav');
    top.id = 'local-pager-top';
    top.className = 'local-pager local-pager--top';
    top.setAttribute('aria-label', 'Навигация по страницам заданий');
    document.querySelector('.local-header').insertAdjacentElement('afterend', top);
    const bottom = document.createElement('nav');
    bottom.id = 'local-pager-bottom';
    bottom.className = 'local-pager';
    bottom.setAttribute('aria-label', 'Навигация по страницам заданий');
    document.body.appendChild(bottom);
    const pagers = [top, bottom];
    if (!tasks.length) {
      pagers.forEach(pager => { pager.textContent = 'Новых задач после последнего обновления нет.'; });
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
      const pageLinks = [];
      const addPage = (page) => {
        if (!pageLinks.includes(page) && page >= 1 && page <= pageCount) pageLinks.push(page);
      };
      addPage(1);
      addPage(current - 1);
      addPage(current);
      addPage(current + 1);
      addPage(pageCount);
      pageLinks.sort((a, b) => a - b).forEach((page, index, pagesToShow) => {
        if (index && page - pagesToShow[index - 1] > 1) {
          const gap = document.createElement('span');
          gap.textContent = '…';
          gap.setAttribute('aria-hidden', 'true');
          container.appendChild(gap);
        }
        add(String(page), page, false, page === current);
      });
      add('Вперёд →', current + 1, current === pageCount, false);
      const label = document.createElement('span');
      label.className = 'local-page-label';
      label.textContent = 'Страница ' + current + ' из ' + pageCount + ' · заданий: ' + tasks.length;
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
      pagers.forEach(pager => drawPager(pager, page));
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
        + top.getBoundingClientRect().height + bottom.getBoundingClientRect().height + 120;
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

      // Нулевые размеры во время восстановления страницы из кэша браузера
      // раньше объединяли весь каталог в «Страницу 1 из 1». В таком случае
      // сохраняем рабочую постраничную навигацию: по одному заданию на страницу.
      if (pages.length === 1 && tasks.length > 1) {
        pages = tasks.map((_, index) => [index]);
      }

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
    window.addEventListener('pageshow', function () {
      // Восстановление страницы из истории браузера может вернуть устаревшее DOM-состояние.
      requestAnimationFrame(function () {
        if (pages.length) adaptToViewport();
        document.documentElement.classList.remove('page-loading', 'added-loading');
      });
    });
  });
  </script>` : '';
  return fixed
    .replace(/<head([^>]*)>/i, `<head$1>${YANDEX_METRIKA_HEAD}${viewportMeta}`)
    .replace(/<link\b(?=[^>]*\brel\s*=\s*["'](?:shortcut\s+)?icon["'])[^>]*>\s*/gi, '')
    .replace(/<title>[\s\S]*?<\/title>/i, pageTitle)
    .replace('</head>', `${loadingGuard}${localStyle}${pageSeo}</head>`)
    .replace(/<body([^>]*)>/i, `<body$1>${YANDEX_METRIKA_NOSCRIPT}${header}${taskPager}${physicsTopicMenu}${renderTelegramBanner()}${renderCommentsWidget()}${renderFeedbackModal()}`)
    .replace('</body>', `${pagerScript}${renderTurnstileScript()}</body>`);
}

async function loadSourceHtml(section) {
  if (sourceCache.has(section)) return sourceCache.get(section);
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
  } else if (section === 'finance') {
    const [financeBytes, equationsFirstBytes, equationsSecondBytes, numbersBytes] = await Promise.all([
      fs.readFile(path.join(__dirname, 'finance.raw.html')),
      fs.readFile(path.join(__dirname, 'equations-1.raw.html')),
      fs.readFile(path.join(__dirname, 'equations-2.raw.html')),
      fs.readFile(path.join(__dirname, 'numbers.raw.html'))
    ]);
    const decode = bytes => new TextDecoder('windows-1251').decode(bytes);
    html = decode(financeBytes);
    const equationsSecondBody = (decode(equationsSecondBytes).match(/<body[^>]*>([\s\S]*?)<\/body>/i) || ['', ''])[1];
    const equationsHtml = decode(equationsFirstBytes).replace('</body>', `${equationsSecondBody}</body>`);
    for (const extra of [equationsHtml, decode(numbersBytes)]) {
      const extraBody = (extra.match(/<body[^>]*>([\s\S]*?)<\/body>/i) || ['', ''])[1];
      html = html.replace('</body>', `${extraBody}</body>`);
    }
  } else if (section === 'physics') {
    const filenames = await sourceFilenames(section);
    const parts = await Promise.all(filenames.map(filename => fs.readFile(path.join(__dirname, filename))));
    const decoded = parts.map(bytes => new TextDecoder('windows-1251').decode(bytes));
    html = decoded[0];
    for (const extra of decoded.slice(1)) {
      const body = (extra.match(/<body[^>]*>([\s\S]*?)<\/body>/i) || ['', ''])[1];
      html = html.replace('</body>', `${body}</body>`);
    }
  } else if (section === 'equations' || section === 'inequalities') {
    const prefix = section === 'equations' ? 'equations' : 'inequalities';
    const first = new TextDecoder('windows-1251').decode(await fs.readFile(path.join(__dirname, `${prefix}-1.raw.html`)));
    const second = new TextDecoder('windows-1251').decode(await fs.readFile(path.join(__dirname, `${prefix}-2.raw.html`)));
    const secondBody = (second.match(/<body[^>]*>([\s\S]*?)<\/body>/i) || ['', ''])[1];
    html = first.replace('</body>', `${secondBody}</body>`);
  } else {
    const filename = section === 'numbers' ? 'numbers.raw.html'
      : (section === 'parameters' ? 'parameters.raw.html'
          : (section === 'planimetry' ? 'planimetry.raw.html' : 'questions.raw.html'));
    const bytes = await fs.readFile(path.join(__dirname, filename));
    html = new TextDecoder('windows-1251').decode(bytes);
  }
  html = filterSectionHtml(html, section);
  sourceCache.set(section, html);
  return html;
}

async function sourceFilenames(section) {
  const source = FIPI_SOURCES[section];
  if (!source) throw new Error(`Неизвестный раздел ФИПИ: ${section}`);
  const names = await fs.readdir(__dirname);
  const escapedPrefix = source.extraPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const numberedPattern = new RegExp(`^${escapedPrefix}-(\\d+)\\.raw\\.html$`, 'i');
  const numbered = names.map(name => ({ name, match: name.match(numberedPattern) }))
    .filter(item => item.match)
    .sort((left, right) => Number(left.match[1]) - Number(right.match[1]))
    .map(item => item.name);
  if (numbered.includes(source.firstFile)) return numbered;
  return [source.firstFile, ...numbered.filter(name => name !== source.firstFile)];
}

async function loadQuestions(section, onlyAdded = false, options = {}) {
  const physicsTopic = section === 'physics' ? physicsTopicInfo(options.physicsTopic)?.code || '' : '';
  const cacheKey = `${section}:${onlyAdded ? 'added' : 'all'}:${physicsTopic}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  const html = await loadSourceHtml(section);
  const page = decorate(html, section, onlyAdded ? added[section] : null, physicsTopic ? { physicsTopic } : null);
  cache.set(cacheKey, page);
  return page;
}

function extractTaskFragment(html, taskId) {
  const startPattern = new RegExp(`<div\\s+class=['"][^'"]*\\bqblock\\b[^'"]*['"]\\s+id=['"]q${taskId}['"][^>]*>`, 'i');
  const startMatch = startPattern.exec(html);
  if (!startMatch) return null;
  const start = startMatch.index;
  const afterStart = start + startMatch[0].length;
  const remainder = html.slice(afterStart);
  const nextTaskOffset = remainder.search(/<div\s+class=['"][^'"]*\bqblock\b[^'"]*['"]/i);
  const bodyEndOffset = remainder.search(/<\/body\s*>/i);
  const end = nextTaskOffset >= 0
    ? afterStart + nextTaskOffset
    : (bodyEndOffset >= 0 ? afterStart + bodyEndOffset : html.length);
  return html.slice(start, end);
}

function taskDocument(sourceHtml, fragment) {
  const head = sourceHtml.match(/<head[^>]*>[\s\S]*?<\/head>/i)?.[0]
    || '<head><meta charset="utf-8"><title>Задание ЕГЭ</title></head>';
  const bodyOpen = sourceHtml.match(/<body[^>]*>/i)?.[0] || '<body class="questions-container">';
  const firstTaskOffset = sourceHtml.search(/<div\s+class=['"][^'"]*\bqblock\b[^'"]*['"]/i);
  const bodyOffset = sourceHtml.search(/<body[^>]*>/i);
  const bodyPrefix = firstTaskOffset >= 0 && bodyOffset >= 0
    ? sourceHtml.slice(bodyOffset + bodyOpen.length, firstTaskOffset)
    : '';
  return `<!doctype html><html lang="ru">${head}${bodyOpen}${bodyPrefix}${fragment}</body></html>`;
}

async function getTaskDirectory() {
  if (!taskDirectoryPromise) {
    taskDirectoryPromise = Promise.all(PUBLIC_SECTIONS.map(async section => ({ section, html: await loadSourceHtml(section) })))
      .then(parts => {
        const byId = new Map();
        for (const { section, html } of parts) {
          for (const sourceTaskId of taskIds(html)) {
            const taskId = normalizeTaskId(sourceTaskId);
            if (!byId.has(taskId)) byId.set(taskId, { taskId, sourceTaskId, section });
          }
        }
        return Array.from(byId.values()).sort((left, right) => left.taskId.localeCompare(right.taskId));
      })
      .catch(error => {
        taskDirectoryPromise = null;
        throw error;
      });
  }
  return taskDirectoryPromise;
}

function normalizeSearchQuery(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function decodeSearchEntities(value) {
  return String(value || '')
    .replace(/&#x([0-9a-f]+);/gi, (entity, hex) => {
      const code = Number.parseInt(hex, 16);
      return Number.isInteger(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
    })
    .replace(/&#(\d+);/g, (entity, decimal) => {
      const code = Number.parseInt(decimal, 10);
      return Number.isInteger(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity;
    })
    .replace(/&(nbsp|amp|lt|gt|quot|apos);/gi, (_, name) => ({
      nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'"
    }[name.toLowerCase()]));
}

async function getTaskSearchIndex() {
  if (!taskSearchIndexPromise) {
    taskSearchIndexPromise = Promise.all(PUBLIC_SECTIONS.map(async section => ({ section, html: await loadSourceHtml(section) })))
      .then(parts => {
        const byId = new Map();
        for (const { section, html } of parts) {
          const starts = Array.from(html.matchAll(/<div\s+class=['"][^'"]*\bqblock\b[^'"]*['"]\s+id=['"]q([A-Z0-9]+)['"][^>]*>/gi));
          for (const [index, match] of starts.entries()) {
            const taskId = normalizeTaskId(match[1]);
            if (!isValidTaskId(taskId) || byId.has(taskId)) continue;
            const end = starts[index + 1]?.index ?? html.search(/<\/body\s*>/i);
            const fragment = html.slice(match.index, end >= 0 ? end : html.length);
            const text = decodeSearchEntities(cleanPlainText(fragment)).replace(/\s+/g, ' ').trim();
            if (text) byId.set(taskId, { taskId, section, text, searchableText: text.toLocaleLowerCase('ru-RU') });
          }
        }
        return Array.from(byId.values());
      })
      .catch(error => {
        taskSearchIndexPromise = null;
        throw error;
      });
  }
  return taskSearchIndexPromise;
}

async function searchTasks(query) {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) return { query: normalized, total: 0, items: [] };
  const needle = normalized.toLocaleLowerCase('ru-RU');
  const terms = needle.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const index = await getTaskSearchIndex();
  const matches = index.map(task => {
    const taskId = task.taskId.toLocaleLowerCase('ru-RU');
    const idExact = taskId === needle;
    const idStartsWith = taskId.startsWith(needle);
    const idIncludes = taskId.includes(needle);
    const phrasePosition = task.searchableText.indexOf(needle);
    const hasEveryTerm = terms.every(term => task.searchableText.includes(term) || taskId.includes(term));
    if (!idIncludes && phrasePosition < 0 && !hasEveryTerm) return null;
    const score = (idExact ? 10000 : 0)
      + (idStartsWith ? 3000 : 0)
      + (idIncludes ? 1000 : 0)
      + (phrasePosition === 0 ? 700 : phrasePosition >= 0 ? 400 : 0)
      + (hasEveryTerm ? 100 : 0);
    return {
      ...task,
      score,
      preview: truncateText(task.text, 280)
    };
  }).filter(Boolean).sort((left, right) => right.score - left.score || left.taskId.localeCompare(right.taskId));
  return { query: normalized, total: matches.length, items: matches.slice(0, 50) };
}

function renderSearchPage(query, search) {
  const hasQuery = Boolean(query);
  const plural = search.total === 1 ? 'задание' : (search.total >= 2 && search.total <= 4 ? 'задания' : 'заданий');
  const summary = !hasQuery
    ? '<p class="search-summary">Введите номер задания, марку, тему или слова из условия.</p>'
    : (search.total
      ? `<p class="search-summary">Найдено: ${search.total} ${plural}${search.total > search.items.length ? '. Показаны первые 50.' : '.'}</p>`
      : '<p class="search-summary">Ничего не найдено. Попробуйте номер задания или другие слова из условия.</p>');
  const results = search.items.length
    ? `<ol class="search-results">${search.items.map(task => `<li><a href="/tasks/${escapeHtml(task.taskId)}"><strong>${escapeHtml(task.taskId)} · ${escapeHtml(sectionInfo(task.section).name)}</strong><span>${escapeHtml(task.preview)}</span></a></li>`).join('')}</ol>`
    : '';
  const title = hasQuery ? `Поиск: ${query} — ЕГЭ профиль` : 'Поиск заданий — ЕГЭ профиль';
  const body = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body class="questions-container"><main class="search-page" aria-labelledby="search-title">
    <h2 id="search-title">Поиск заданий</h2>
    <form class="site-search-form" action="/search" method="get" role="search">
      <label class="visually-hidden" for="search-page-query">Поисковый запрос</label>
      <input id="search-page-query" name="q" type="search" value="${escapeHtml(query)}" placeholder="Например: AA7FF7 или окружность" autocomplete="off" autofocus>
      <button type="submit">Найти</button>
    </form>
    ${summary}
    ${results}
  </main></body></html>`;
  return decorate(body, 'search', null, {
    title,
    heading: 'Поиск по заданиям ЕГЭ',
    description: 'Поиск по номеру и тексту заданий открытого банка ФИПИ.',
    pathname: '/search',
    robots: 'noindex,follow',
    isSearch: true,
    disableCataloguePager: true,
    searchQuery: query
  });
}

function renderPublishedSolution(taskId) {
  const solution = getPublishedSolution.get(taskId);
  if (!solution) return '';
  const answer = solution.answer ? `<p><strong>Ответ:</strong> ${renderMathText(solution.answer)}</p>` : '';
  const diagram = solution.diagram_svg
    ? `<figure><img src="data:image/svg+xml;base64,${Buffer.from(solution.diagram_svg).toString('base64')}" alt="Схема к решению задания ${escapeHtml(taskId)}">${solution.diagram_caption ? `<figcaption>Обозначения: ${escapeHtml(solution.diagram_caption)}</figcaption>` : ''}</figure>`
    : '';
  return `<section class="seo-task-solution" aria-labelledby="solution-${escapeHtml(taskId)}">
    <h2 id="solution-${escapeHtml(taskId)}">Решение задания ${escapeHtml(taskId)}</h2>
    ${answer}
    <div class="formatted-solution">${renderMathSolution(solution.solution)}</div>
    ${diagram}
  </section>`;
}

function renderTaskPage(entry, sourceHtml, user = null, commentNotice = '', feedbackNotice = '') {
  const fragment = extractTaskFragment(sourceHtml, entry.sourceTaskId || entry.taskId);
  if (!fragment) return null;
  const info = sectionInfo(entry.section);
  const pathname = `/tasks/${entry.taskId}`;
  const condition = truncateText(cleanPlainText(fragment), 150);
  const publishedSolution = getPublishedSolution.get(entry.taskId);
  const hasPublishedSolution = Boolean(publishedSolution);
  const sectionSeoName = info.name.toLocaleLowerCase('ru-RU');
  const title = `${entry.taskId} — задание ЕГЭ профиль: ${sectionSeoName}, ${hasPublishedSolution ? 'ответ и решение' : 'условие'} | ФИПИ`;
  const description = truncateText(
    `${entry.taskId} — задание ЕГЭ профиль по теме «${sectionSeoName}» из открытого банка ФИПИ. ${condition}${hasPublishedSolution ? ' Ответ и подробное решение.' : ''}`,
    250
  );
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['LearningResource', 'CreativeWork'],
        name: title,
        description,
        url: absoluteUrl(pathname),
        inLanguage: 'ru',
        isAccessibleForFree: true,
        educationalLevel: 'Среднее общее образование',
        learningResourceType: 'Экзаменационное задание',
        about: info.name,
        mainEntityOfPage: absoluteUrl(pathname)
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Главная', item: absoluteUrl('/') },
          { '@type': 'ListItem', position: 2, name: info.name, item: absoluteUrl(info.path) },
          { '@type': 'ListItem', position: 3, name: `Задание ${entry.taskId}`, item: absoluteUrl(pathname) }
        ]
      }
    ]
  };
  const sectionTasks = Array.from(taskIds(sourceHtml))
    .map(normalizeTaskId)
    .filter(isValidTaskId);
  const taskPosition = sectionTasks.indexOf(entry.taskId);
  const taskNavigation = {
    previous: taskPosition > 0 ? sectionTasks[taskPosition - 1] : '',
    next: taskPosition >= 0 && taskPosition < sectionTasks.length - 1 ? sectionTasks[taskPosition + 1] : '',
    position: taskPosition + 1,
    total: sectionTasks.length,
    sectionPath: info.path
  };
  const page = decorate(taskDocument(sourceHtml, fragment), entry.section, null, {
    title,
    heading: `Задание ${entry.taskId} по ${info.topic}`,
    description,
    pathname,
    type: 'article',
    structuredData,
    taskNavigation
  });
  const solution = publishedSolution ? renderPublishedSolution(entry.taskId) : '';
  const comments = publishedSolution
    ? renderCommentSection(entry.taskId, user, commentNotice)
    : renderUnavailableCommentSection(entry.taskId);
  const feedback = renderFeedbackSection(entry.taskId, feedbackNotice);
  return page.replace('</body>', `${solution}${feedback}${comments}</body>`);
}

async function renderSitemap() {
  const publishedDates = new Map(listPublishedSolutionDates.all().map(record => [record.task_id, record.updated_at]));
  const staticPages = [
    { pathname: '/', priority: '1.0' },
    ...PUBLIC_SECTIONS.filter(section => section !== 'stereometry').map(section => ({ pathname: sectionInfo(section).path, priority: '0.9' })),
    { pathname: '/about', priority: '0.5' }
  ];
  const tasks = await getTaskDirectory();
  const entries = [
    ...staticPages,
    ...tasks.map(({ taskId }) => ({ pathname: `/tasks/${taskId}`, priority: '0.7', updatedAt: publishedDates.get(taskId) }))
  ];
  const urls = entries.map(({ pathname, priority, updatedAt }) => {
    const lastmod = updatedAt ? `<lastmod>${escapeXml(String(updatedAt).slice(0, 10))}</lastmod>` : '';
    return `  <url><loc>${escapeXml(absoluteUrl(pathname))}</loc>${lastmod}<changefreq>weekly</changefreq><priority>${priority}</priority></url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

function renderNotFoundPage() {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,follow"><title>Страница не найдена</title></head><body><main><h1>Страница не найдена</h1><p>Вернитесь к <a href="/">каталогу заданий ЕГЭ</a>.</p></main></body></html>`;
}

async function refreshSection(section) {
  const source = FIPI_SOURCES[section];
  if (!source) throw new Error(`Неизвестный раздел ФИПИ: ${section}`);
  const oldFiles = await sourceFilenames(section);
  const oldParts = await Promise.all(oldFiles.map(filename => fs.readFile(path.join(__dirname, filename))));
  const oldHtml = oldParts.map(bytes => new TextDecoder('windows-1251').decode(bytes)).join('\n');
  const pages = [];

  for (let page = 0; ; page++) {
    const body = new URLSearchParams({
      search: '1',
      pagesize: String(FIPI_PAGE_SIZE),
      proj: source.project || PROJECT,
      qkind: 'ILI_STD_FULL'
    });
    if (source.theme) body.set('theme', source.theme);
    if (page > 0) body.set('page', String(page));
    const bytes = await requestFipi(FIPI_ENDPOINT, { method: 'POST', body });
    const html = new TextDecoder('windows-1251').decode(bytes);
    const count = taskIds(html).size;
    if (page === 0 && count === 0) throw new Error(`ФИПИ не вернул задания раздела ${section}`);
    pages.push({ bytes, html });
    if (count < FIPI_PAGE_SIZE) break;
    if (page >= 99) throw new Error(`Слишком много страниц ФИПИ в разделе ${section}`);
  }

  const targetNames = pages.map((_, index) => index === 0
    ? source.firstFile
    : `${source.extraPrefix}-${index + 1}.raw.html`);
  const temporaryNames = targetNames.map(name => `${name}.new`);
  try {
    await Promise.all(pages.map((page, index) => fs.writeFile(path.join(__dirname, temporaryNames[index]), page.bytes)));
    for (let index = 0; index < targetNames.length; index++) {
      await fs.rename(path.join(__dirname, temporaryNames[index]), path.join(__dirname, targetNames[index]));
    }
  } finally {
    await Promise.all(temporaryNames.map(name => fs.unlink(path.join(__dirname, name)).catch(() => {})));
  }
  await Promise.all(oldFiles.filter(name => !targetNames.includes(name))
    .map(name => fs.unlink(path.join(__dirname, name))));

  const newHtml = pages.map(page => page.html).join('\n');
  const oldIds = taskIds(oldHtml);
  const discovered = Array.from(taskIds(newHtml)).filter(id => !oldIds.has(id));
  added[section] = Array.from(new Set([...added[section], ...discovered]));
}

async function cacheFipiAssets() {
  const filenames = (await fs.readdir(__dirname)).filter(name => name.endsWith('.raw.html'));
  const paths = new Set();
  for (const filename of filenames) {
    const html = new TextDecoder('windows-1251').decode(await fs.readFile(path.join(__dirname, filename)));
    for (const match of html.matchAll(/(?:src|href)=["']\.\.\/\.\.\/([^"'?#]+)(?:\?[^"']*)?["']/gi)) paths.add(match[1]);
    for (const match of html.matchAll(/["'](docs\/[^"']+)["']/gi)) paths.add(match[1]);
  }
  for (const relativePath of paths) {
    const segments = relativePath.split('/').filter(Boolean);
    const target = path.join(ASSET_ROOT, ...segments);
    if (fsSync.existsSync(target)) continue;
    const url = `https://ege.fipi.ru/${segments.map(encodeURIComponent).join('/')}`;
    try {
      const bytes = await requestFipi(url);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, bytes);
    } catch (error) {
      console.warn(`Не удалось скачать ресурс ФИПИ ${relativePath}: ${error.message}`);
    }
  }
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
  await refreshSection('physics');
  await cacheFipiAssets();
  await saveAddedHistory();
  cache.clear();
  sourceCache.clear();
  taskDirectoryPromise = null;
  taskSearchIndexPromise = null;
}

function renderAboutPage() {
  return `<!doctype html>
<html lang="ru">
<head>
  ${YANDEX_METRIKA_HEAD}
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>О проекте — задания ЕГЭ по математике и физике</title>
  ${renderSeoMetadata({
    title: 'О проекте — задания ЕГЭ по математике и физике',
    description: 'Каталог заданий ЕГЭ по профильной математике и физике из открытого банка ФИПИ.',
    pathname: '/about',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      name: 'О проекте',
      url: absoluteUrl('/about'),
      inLanguage: 'ru',
      isPartOf: { '@type': 'WebSite', name: 'ЕГЭ ФИПИ — математика и физика', url: SITE_ORIGIN }
    }
  })}
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #f4f6f8; color: #334155; font: 16px/1.5 Arial, sans-serif; }
    .page { max-width: 1000px; margin: 0 auto; padding: 24px; }
    .local-header { position: sticky; top: 0; z-index: 50; margin: -24px -24px 20px; padding: 14px 24px;
      background: #183153; color: #fff; font: 600 16px/1.35 Arial, sans-serif; box-shadow: 0 2px 8px #0003; }
    .local-header small { display: block; margin-top: 3px; font-weight: 400; opacity: .82; }
    .local-menu { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; margin-top: 10px; }
    .local-menu a { padding: 7px 8px; border: 1px solid #ffffff70; border-radius: 6px; color: #fff; text-decoration: none;
      font-weight: 500; text-align: center; white-space: normal; }
    .local-menu a:hover { background: #ffffff18; }
    .local-menu a.active { background: #fff; color: #183153; }
    .physics-top-button { position: absolute; top: 12px; right: 24px; display: inline-flex; align-items: center; justify-content: center; min-height: 46px; padding: 9px 22px; border: 2px solid #f0b429; border-radius: 8px; background: #f0b429; color: #183153; font-size: 21px; font-weight: 800; line-height: 1; text-decoration: none; box-shadow: 0 3px 8px #0005; }
    .physics-top-button:hover { background: #ffd166; border-color: #ffd166; color: #183153; }
    .telegram-banner { display: flex; align-items: center; justify-content: space-between; gap: 18px; margin: 0 0 20px; padding: 18px 20px;
      border: 1px solid #6f9cd0; border-radius: 10px; background: linear-gradient(120deg, #e7f3ff, #f6fbff); color: #183153;
      box-shadow: 0 2px 10px #18315312; }
    .telegram-banner-copy { display: grid; gap: 4px; }
    .telegram-banner-copy strong { font-size: 18px; line-height: 1.25; }
    .telegram-banner-copy span { color: #40566d; font-size: 14px; line-height: 1.4; }
    .telegram-banner-action { display: inline-flex; flex: 0 0 auto; align-items: center; justify-content: center; gap: 7px; min-height: 42px;
      padding: 10px 14px; border-radius: 7px; background: #229ed9; color: #fff; font: 700 14px/1.2 Arial, sans-serif; text-align: center; text-decoration: none; }
    .telegram-banner-action:hover { background: #168ac2; color: #fff; }
    .telegram-banner-action span { font-weight: 500; }
    .about-card { padding: 28px 32px; border: 1px solid #d8e1eb; border-radius: 8px; background: #fff;
      box-shadow: 0 1px 7px #00000012; }
    .about-card h1 { margin: 0 0 16px; color: #183153; font-size: 28px; line-height: 1.25; }
    .about-card p { margin: 0 0 14px; }
    .about-card p:last-child { margin-bottom: 0; }
    @media (max-width: 700px) {
      .page { padding: 12px; }
      .local-header { position: static; margin: -12px -12px 14px; padding: 14px 12px; font-size: 15px; }
      .physics-top-button { position: static; margin: 0 0 10px auto; min-height: 42px; padding: 8px 18px; font-size: 19px; }
      .local-header small { font-size: 12px; line-height: 1.35; }
      .telegram-banner { align-items: stretch; flex-direction: column; gap: 12px; margin-bottom: 14px; padding: 16px; }
      .telegram-banner-copy strong { font-size: 16px; }
      .telegram-banner-action { width: 100%; }
      .local-menu { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin-top: 12px; }
      .local-menu a { display: grid; place-items: center; min-height: 46px; padding: 6px 4px; font-size: 12px;
        line-height: 1.2; overflow-wrap: anywhere; }
      .about-card { padding: 20px; }
      .about-card h1 { font-size: 23px; }
    }
  </style>
</head>
<body>
  ${YANDEX_METRIKA_NOSCRIPT}
  <main class="page">
    <header class="local-header"><a class="physics-top-button" href="/physics">Физика</a>Задания ЕГЭ по математике и физике
      <small>Каталог заданий с развёрнутым ответом</small>
      <nav class="local-menu" aria-label="Разделы сайта">
        <a href="/equations">Уравнения</a>
        <a href="/">Стереометрия</a>
        <a href="/inequalities">Неравенства</a>
        <a href="/finance">Финансовая математика</a>
        <a href="/optimal">Оптимальный выбор</a>
        <a href="/planimetry">Планиметрия</a>
        <a href="/parameters">Задачи с параметром</a>
        <a href="/numbers">Числа и их свойства</a>
        <a href="/physics">Физика</a>
        <a href="/added?section=stereometry">Добавленные задачи</a>
        <a href="/account">Личный кабинет</a>
        <a href="/about" class="active" aria-current="page">О проекте</a>
      </nav>
    </header>
    ${renderTelegramBanner()}
    <section class="about-card" aria-labelledby="about-title">
      <h1 id="about-title">О проекте</h1>
      <p>Это каталог заданий ЕГЭ по профильной математике и физике для системной подготовки к экзамену.</p>
      <p>Все задания на сайте взяты из открытого банка ФИПИ и систематизированы по темам. Выберите нужный раздел, чтобы целенаправленно отрабатывать нужный тип задач.</p>
    </section>
  </main>
  ${renderCommentsWidget()}
</body>
</html>`;
}

function renderPhysicsPage() {
  const topics = [
    ['qualitative', 'Качественная задача', 'Задание 27: объяснение физического явления с опорой на законы и причинно-следственные связи'],
    ['mechanics', 'Механика', 'Задание 28: расчётная задача высокого уровня — кинематика, динамика и законы сохранения'],
    ['molecular', 'Молекулярная физика и термодинамика', 'Задание 29: расчёты по МКТ, газовым законам, теплообмену и термодинамике'],
    ['electrodynamics', 'Электродинамика', 'Задание 30: расчётная задача высокого уровня — электрические цепи, поле, магнитные явления и индукция']
  ];
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>ЕГЭ по физике — типы задач и подробные решения</title><meta name="description" content="Типы задач ЕГЭ по физике: механика, молекулярная физика, электродинамика, оптика, квантовая физика и задания с развёрнутым ответом."><style>
    *{box-sizing:border-box}body{margin:0;background:#f4f6f8;color:#334155;font:16px/1.5 Arial,sans-serif}.page{max-width:1000px;margin:0 auto;padding:24px}.local-header{position:sticky;top:0;z-index:50;margin:-24px -24px 20px;padding:14px 24px;background:#183153;color:#fff;box-shadow:0 2px 8px #0003}.local-header h1{margin:0;font-size:26px}.local-header small{display:block;margin-top:3px;opacity:.82}.physics-top-button{position:absolute;top:12px;right:24px;display:inline-flex;align-items:center;justify-content:center;min-height:46px;padding:9px 22px;border:2px solid #f0b429;border-radius:8px;background:#f0b429;color:#183153;font-size:21px;font-weight:800;text-decoration:none;box-shadow:0 3px 8px #0005}.physics-top-button:hover{background:#ffd166}.local-menu{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:14px}.local-menu a{padding:8px;border:1px solid #ffffff70;border-radius:6px;color:#fff;text-decoration:none;text-align:center}.local-menu a:hover{background:#ffffff18}.local-menu .active{background:#fff;color:#183153}.card-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.topic-card{display:block;padding:20px;border:1px solid #d8e1eb;border-radius:10px;background:#fff;color:#183153;text-decoration:none;box-shadow:0 1px 7px #00000012}.topic-card:hover{border-color:#f0b429;box-shadow:0 3px 12px #18315320;transform:translateY(-1px)}.topic-card h2{margin:0 0 8px;font-size:20px}.topic-card p{margin:0;color:#526273}.intro{margin:0 0 18px}.note{margin-top:20px;padding:14px 16px;border-left:4px solid #f0b429;background:#fff;color:#526273}@media(max-width:700px){.page{padding:12px}.local-header{margin:-12px -12px 14px;padding:14px 12px}.physics-top-button{position:static;margin:0 0 10px auto;min-height:42px;padding:8px 18px;font-size:19px}.local-menu,.card-grid{grid-template-columns:1fr}.local-menu a{min-height:42px;display:grid;place-items:center}}
  </style></head><body><main class="page"><header class="local-header"><a class="physics-top-button" href="/physics">Физика</a><h1>ЕГЭ по физике</h1><small>Задания с развёрнутым ответом</small><nav class="local-menu" aria-label="Навигация"><a href="/">Математика</a><a href="/physics" class="active">Физика</a><a href="/about">О проекте</a><a href="/account">Личный кабинет</a></nav></header><p class="intro">Меню содержит только типы заданий с развёрнутым ответом: №27–30. Для каждого типа публикуются решения с обоснованием, формулами и проверкой результата.</p><section class="card-grid">${topics.map(([id,name,description]) => `<a class="topic-card" id="${id}" href="#${id}"><h2>${name}</h2><p>${description}</p></a>`).join('')}</section><p class="note">Такой формат соответствует тематическим блокам заданий с развёрнутым ответом, используемым в «Решу ЕГЭ — физика»: качественная задача, механика, молекулярная физика и термодинамика, электродинамика.</p></main></body></html>`;
}

http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = requestUrl.pathname;
    if (pathname === '/favicon.svg' || pathname === '/favicon.ico') {
      res.writeHead(200, {
        'content-type': 'image/svg+xml; charset=utf-8',
        'cache-control': 'public, max-age=31536000, immutable',
      });
      return res.end(SITE_ICON_SVG);
    }
    if (pathname.startsWith('/admin') || pathname.startsWith('/api/') || pathname.startsWith('/account') || pathname === '/update' || /^\/tasks\/[A-Za-z0-9]+\/(?:comments|feedback)$/.test(pathname)) {
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    }
    if (pathname === '/yandex_bb9d4153ffc40087.html') {
      const verificationFile = path.join(__dirname, 'yandex_bb9d4153ffc40087.html');
      const verificationHtml = await fs.readFile(verificationFile, 'utf8');
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300' });
      return res.end(verificationHtml);
    }
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
    if (pathname === '/robots.txt') {
      if (req.method !== 'GET') {
        res.writeHead(405, { allow: 'GET' });
        return res.end();
      }
      const robots = `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /update\n\nSitemap: ${absoluteUrl('/sitemap.xml')}\n`;
      res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' });
      return res.end(robots);
    }
    if (pathname === '/sitemap.xml') {
      if (req.method !== 'GET') {
        res.writeHead(405, { allow: 'GET' });
        return res.end();
      }
      const sitemap = await renderSitemap();
      res.writeHead(200, { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=300' });
      return res.end(sitemap);
    }
    if (pathname === '/account/register') {
      const next = safeNextPath(requestUrl.searchParams.get('next'));
      const currentUser = getCurrentUser(req);
      if (req.method === 'GET') {
        if (currentUser) {
          res.writeHead(303, { location: next });
          return res.end();
        }
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        return res.end(renderRegistrationPage('', {}, next));
      }
      if (req.method === 'POST') {
        if (!isTrustedOrigin(req)) {
          res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
          return res.end('Недопустимый источник запроса.');
        }
        if (isRateLimited(req, 'registration', 5, 60 * 60 * 1000)) {
          res.writeHead(429, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
          return res.end(renderRegistrationPage('Слишком много попыток. Повторите через час.', {}, next));
        }
        const form = await readForm(req);
        const result = validateRegistration(form);
        const formNext = safeNextPath(form.get('next'));
        const values = {
          fullName: normalizeUserText(form.get('full_name')),
          city: normalizeUserText(form.get('city')),
          email: normalizeEmail(form.get('email')),
          consent: form.get('consent') === '1'
        };
        if (result.error) {
          res.writeHead(422, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
          return res.end(renderRegistrationPage(result.error, values, formNext));
        }
        const turnstile = await verifyTurnstile(form);
        if (!turnstile.ok) {
          res.writeHead(turnstile.status, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
          return res.end(renderRegistrationPage(turnstile.error, values, formNext));
        }
        if (getUserByEmail.get(result.email)) {
          res.writeHead(409, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
          return res.end(renderRegistrationPage('Этот адрес уже зарегистрирован. Войдите в личный кабинет.', values, formNext));
        }
        const now = new Date().toISOString();
        createUser.run(result.fullName, result.city, result.email, hashPassword(result.password), now, now);
        const user = getUserByEmail.get(result.email);
        res.writeHead(303, { location: formNext, 'set-cookie': userSessionCookie(user) });
        return res.end();
      }
      res.writeHead(405, { allow: 'GET, POST' });
      return res.end();
    }
    if (pathname === '/account/login') {
      const next = safeNextPath(requestUrl.searchParams.get('next'));
      const currentUser = getCurrentUser(req);
      if (req.method === 'GET') {
        if (currentUser) {
          res.writeHead(303, { location: next });
          return res.end();
        }
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        return res.end(renderLoginPage('', next));
      }
      if (req.method === 'POST') {
        if (!isTrustedOrigin(req)) {
          res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
          return res.end('Недопустимый источник запроса.');
        }
        if (isRateLimited(req, 'login', 10, 10 * 60 * 1000)) {
          res.writeHead(429, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
          return res.end(renderLoginPage('Слишком много попыток. Повторите позже.', next));
        }
        const form = await readForm(req);
        const turnstile = await verifyTurnstile(form);
        if (!turnstile.ok) {
          res.writeHead(turnstile.status, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
          return res.end(renderLoginPage(turnstile.error, safeNextPath(form.get('next'))));
        }
        const email = normalizeEmail(form.get('email'));
        const user = getUserByEmail.get(email);
        const formNext = safeNextPath(form.get('next'));
        if (!user || !verifyPassword(form.get('password') || '', user.password_hash)) {
          res.writeHead(401, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
          return res.end(renderLoginPage('Неверная почта или пароль.', formNext));
        }
        res.writeHead(303, { location: formNext, 'set-cookie': userSessionCookie(user) });
        return res.end();
      }
      res.writeHead(405, { allow: 'GET, POST' });
      return res.end();
    }
    if (pathname === '/account/logout') {
      if (req.method !== 'POST') {
        res.writeHead(405, { allow: 'POST' });
        return res.end();
      }
      if (!isTrustedOrigin(req)) {
        res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
        return res.end('Недопустимый источник запроса.');
      }
      res.writeHead(303, { location: '/', 'set-cookie': expiredUserSessionCookie() });
      return res.end();
    }
    const deleteOwnCommentMatch = pathname.match(/^\/account\/comments\/([1-9]\d*)\/delete$/);
    if (deleteOwnCommentMatch) {
      if (req.method !== 'POST') {
        res.writeHead(405, { allow: 'POST' });
        return res.end();
      }
      if (!isTrustedOrigin(req)) {
        res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
        return res.end('Недопустимый источник запроса.');
      }
      const user = getCurrentUser(req);
      if (!user) {
        res.writeHead(303, { location: '/account/login?next=%2Faccount' });
        return res.end();
      }
      const form = await readForm(req, 8 * 1024);
      const next = safeNextPath(form.get('next'), '/account');
      const commentId = Number(deleteOwnCommentMatch[1]);
      const result = deleteCommentForUser.run(commentId, user.id);
      if (!result.changes) {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
        return res.end('Комментарий не найден.');
      }
      const hashIndex = next.indexOf('#');
      const nextPath = hashIndex >= 0 ? next.slice(0, hashIndex) : next;
      const hash = hashIndex >= 0 ? next.slice(hashIndex) : '';
      const location = `${nextPath}${nextPath.includes('?') ? '&' : '?'}comment=deleted${hash}`;
      res.writeHead(303, { location });
      return res.end();
    }
    if (pathname === '/account') {
      if (req.method !== 'GET') {
        res.writeHead(405, { allow: 'GET' });
        return res.end();
      }
      const user = getCurrentUser(req);
      if (!user) {
        res.writeHead(303, { location: '/account/login?next=%2Faccount' });
        return res.end();
      }
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      return res.end(renderAccountPage(user, requestUrl.searchParams.get('comment') === 'deleted' ? 'deleted' : ''));
    }
    if (pathname === '/privacy') {
      if (req.method !== 'GET') {
        res.writeHead(405, { allow: 'GET' });
        return res.end();
      }
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      return res.end(renderPrivacyPage(getCurrentUser(req)));
    }
    const taskFeedbackMatch = pathname.match(/^\/tasks\/([A-Za-z0-9]+)\/feedback$/);
    if (taskFeedbackMatch) {
      if (req.method !== 'POST') {
        res.writeHead(405, { allow: 'POST' });
        return res.end();
      }
      const taskId = normalizeTaskId(taskFeedbackMatch[1]);
      const redirect = status => {
        res.writeHead(303, { location: `/tasks/${encodeURIComponent(taskId)}?feedback=${status}#feedback` });
        return res.end();
      };
      if (!isTrustedOrigin(req)) {
        res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
        return res.end('Недопустимый источник запроса.');
      }
      const task = (await getTaskDirectory()).find(entry => entry.taskId === taskId);
      if (!task) {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
        return res.end('Задание не найдено.');
      }
      if (isRateLimited(req, 'feedback', 5, 60 * 60 * 1000)) return redirect('rate');
      const form = await readForm(req, 32 * 1024);
      const turnstile = await verifyTurnstile(form);
      if (!turnstile.ok) return redirect('captcha');
      const result = addSiteFeedback(taskId, form.get('kind'), form.get('body'));
      if (result.error) return redirect('error');
      return redirect('created');
    }
    const taskCommentMatch = pathname.match(/^\/tasks\/([A-Za-z0-9]+)\/comments$/);
    if (taskCommentMatch) {
      if (req.method !== 'POST') {
        res.writeHead(405, { allow: 'POST' });
        return res.end();
      }
      const taskId = normalizeTaskId(taskCommentMatch[1]);
      const wantsJson = String(req.headers.accept || '').includes('application/json');
      const sendCommentError = (status, error) => {
        if (wantsJson) {
          res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
          return res.end(JSON.stringify({ error }));
        }
        res.writeHead(303, { location: `/tasks/${encodeURIComponent(taskId)}?comment=error#comments` });
        return res.end();
      };
      if (!isTrustedOrigin(req)) return sendCommentError(403, 'Недопустимый источник запроса.');
      const user = getCurrentUser(req);
      if (!user) {
        if (wantsJson) return sendCommentError(401, 'Для комментария нужно войти в личный кабинет.');
        res.writeHead(303, { location: `/account/login?next=${encodeURIComponent(`/tasks/${taskId}#comments`)}` });
        return res.end();
      }
      const task = (await getTaskDirectory()).find(entry => entry.taskId === taskId);
      if (!task || !getPublishedSolution.get(taskId)) return sendCommentError(404, 'Опубликованное решение не найдено.');
      if (isRateLimited(req, `comment:${user.id}`, 12, 10 * 60 * 1000)) return sendCommentError(429, 'Слишком много комментариев. Повторите позже.');
      const form = await readForm(req, 32 * 1024);
      const turnstile = await verifyTurnstile(form);
      if (!turnstile.ok) return sendCommentError(turnstile.status, turnstile.error);
      const result = addCommentForUser(taskId, user, form.get('body'));
      if (result.error) return sendCommentError(422, result.error);
      if (wantsJson) {
        res.writeHead(201, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
        return res.end(JSON.stringify({ comment: { ...result.comment, isOwn: true } }));
      }
      res.writeHead(303, { location: `/tasks/${encodeURIComponent(taskId)}?comment=created#comments` });
      return res.end();
    }
    const taskPageMatch = pathname.match(/^\/tasks\/([A-Za-z0-9]+)$/);
    if (taskPageMatch) {
      if (req.method !== 'GET') {
        res.writeHead(405, { allow: 'GET' });
        return res.end();
      }
      const taskId = normalizeTaskId(taskPageMatch[1]);
      const task = (await getTaskDirectory()).find(entry => entry.taskId === taskId);
      if (!task) {
        res.writeHead(404, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        return res.end(renderNotFoundPage());
      }
      const commentStatus = requestUrl.searchParams.get('comment');
      const feedbackStatus = requestUrl.searchParams.get('feedback');
      const taskPage = renderTaskPage(
        task,
        await loadSourceHtml(task.section),
        getCurrentUser(req),
        commentStatus === 'created' || commentStatus === 'deleted' || commentStatus === 'error' ? commentStatus : '',
        feedbackStatus === 'created' || feedbackStatus === 'rate' || feedbackStatus === 'captcha' || feedbackStatus === 'error' ? feedbackStatus : ''
      );
      if (!taskPage) {
        res.writeHead(404, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        return res.end(renderNotFoundPage());
      }
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      return res.end(taskPage);
    }
    if (pathname === '/api/comments') {
      if (req.method !== 'GET') {
        res.writeHead(405, { allow: 'GET' });
        return res.end();
      }
      const total = Number(countPublicComments.get().total || 0);
      const comments = listRecentPublicComments.all().map(serializeComment);
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      return res.end(JSON.stringify({ total, comments, hasMore: total > comments.length }));
    }
    const publicSolutionMatch = pathname.match(/^\/api\/solutions\/([A-Za-z0-9]+)$/);
    if (publicSolutionMatch) {
      if (req.method !== 'GET') {
        res.writeHead(405, { allow: 'GET' });
        return res.end();
      }
      const taskId = normalizeTaskId(publicSolutionMatch[1]);
      if (!isValidTaskId(taskId)) {
        res.writeHead(400, { 'content-type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify({ error: 'Некорректный номер задания.' }));
      }
      const solution = getPublishedSolution.get(taskId);
      if (!solution) {
        res.writeHead(404, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
        return res.end(JSON.stringify({ error: 'Решение ещё не опубликовано.' }));
      }
      const viewer = getCurrentUser(req);
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      return res.end(JSON.stringify({
        taskId: solution.task_id,
        answer: solution.answer,
        answerHtml: renderMathText(solution.answer),
        solution: solution.solution,
        solutionHtml: renderMathSolution(solution.solution),
        diagramSvg: solution.diagram_svg,
        diagramCaption: solution.diagram_caption,
        updatedAt: solution.updated_at,
        comments: listCommentsForTask.all(taskId).map(comment => ({
          ...serializeComment(comment),
          isOwn: Boolean(viewer && comment.user_id === viewer.id)
        })),
        viewer: publicUser(viewer)
      }));
    }
    if (pathname === '/admin/login') {
      const adminPassword = getAdminPassword();
      if (!adminPassword) {
        res.writeHead(503, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
        return res.end('Администрирование не настроено. Укажите пароль в защищённом файле сервера.');
      }
      if (req.method === 'GET') {
        if (isAdmin(req)) {
          res.writeHead(303, { location: '/admin' });
          return res.end();
        }
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        return res.end(renderAdminLogin());
      }
      if (req.method === 'POST') {
        const form = await readForm(req);
        const turnstile = await verifyTurnstile(form);
        if (!turnstile.ok) {
          res.writeHead(turnstile.status, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
          return res.end(renderAdminLogin(turnstile.error));
        }
        if (!secureEqual(form.get('password') || '', adminPassword)) {
          res.writeHead(401, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
          return res.end(renderAdminLogin('Неверный пароль.'));
        }
        res.writeHead(303, { location: '/admin', 'set-cookie': adminSessionCookie(adminPassword) });
        return res.end();
      }
      res.writeHead(405, { allow: 'GET, POST' });
      return res.end();
    }
    if (pathname === '/admin/logout') {
      if (req.method !== 'POST') {
        res.writeHead(405, { allow: 'POST' });
        return res.end();
      }
      res.writeHead(303, { location: '/admin/login', 'set-cookie': expiredAdminSessionCookie() });
      return res.end();
    }
    const adminSolutionMatch = pathname.match(/^\/admin\/solutions\/([A-Za-z0-9]+)$/);
    if (pathname === '/admin' || adminSolutionMatch) {
      if (!getAdminPassword()) {
        res.writeHead(503, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
        return res.end('Администрирование не настроено. Укажите пароль в защищённом файле сервера.');
      }
      if (!isAdmin(req)) {
        res.writeHead(303, { location: '/admin/login' });
        return res.end();
      }
      if (pathname === '/admin') {
        if (req.method !== 'GET') {
          res.writeHead(405, { allow: 'GET' });
          return res.end();
        }
        const requestedTaskId = normalizeTaskId(requestUrl.searchParams.get('task'));
        if (requestedTaskId) {
          if (!isValidTaskId(requestedTaskId)) {
            res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
            return res.end('Номер задания должен содержать от 4 до 32 латинских букв или цифр.');
          }
          res.writeHead(303, { location: `/admin/solutions/${requestedTaskId}` });
          return res.end();
        }
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        return res.end(renderAdminDashboard());
      }
      const taskId = normalizeTaskId(adminSolutionMatch[1]);
      if (!isValidTaskId(taskId)) {
        res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
        return res.end('Некорректный номер задания.');
      }
      if (req.method === 'GET') {
        const record = getSolutionForAdmin.get(taskId);
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        return res.end(renderSolutionEditor(taskId, record, requestUrl.searchParams.get('saved') === '1'));
      }
      if (req.method === 'POST') {
        const form = await readForm(req);
        const answer = String(form.get('answer') || '').trim();
        const solution = String(form.get('solution') || '').trim();
        const diagram = String(form.get('diagram') || '').trim();
        const diagramCaption = String(form.get('diagram_caption') || '').trim();
        if (!solution) {
          res.writeHead(422, { 'content-type': 'text/plain; charset=utf-8' });
          return res.end('Введите текст решения.');
        }
        if (answer.includes('/') || solution.includes('/')) {
          res.writeHead(422, { 'content-type': 'text/plain; charset=utf-8' });
          return res.end('Не используйте / для деления. Запишите дробь как ⟦числитель¦знаменатель⟧ — на странице она будет вертикальной.');
        }
        const now = new Date().toISOString();
        saveSolution.run(taskId, answer, solution, diagram, diagramCaption, form.get('published') === '1' ? 1 : 0, now, now);
        res.writeHead(303, { location: `/admin/solutions/${taskId}?saved=1` });
        return res.end();
      }
      res.writeHead(405, { allow: 'GET, POST' });
      return res.end();
    }
    if (pathname === '/about') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      return res.end(renderAboutPage());
    }
    if (pathname === '/search') {
      if (req.method !== 'GET') {
        res.writeHead(405, { allow: 'GET' });
        return res.end();
      }
      const query = normalizeSearchQuery(requestUrl.searchParams.get('q'));
      const search = await searchTasks(query);
      const requestedTaskId = query.replace(/[\s-]+/g, '').toUpperCase();
      const exactTask = isValidTaskId(requestedTaskId)
        ? search.items.find((task) => task.taskId === requestedTaskId)
        : undefined;
      // A number in the search box is an address, not a text query: open the
      // task immediately so the visitor sees the answer and full solution.
      if (exactTask) {
        res.writeHead(302, { location: `/tasks/${exactTask.taskId}`, 'cache-control': 'no-store' });
        return res.end();
      }
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      return res.end(renderSearchPage(query, search));
    }
    const requestedSection = (pathname === '/added' || pathname === '/update')
      ? requestUrl.searchParams.get('section')
      : '';
    const section = pathname === '/physics' || requestedSection === 'physics'
      ? 'physics'
      : (pathname === '/finance' || requestedSection === 'finance'
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
            : (pathname === '/planimetry' || requestedSection === 'planimetry' ? 'planimetry' : 'stereometry')))))));
    if (pathname === '/update' && req.method === 'POST') {
      await refreshAll();
      res.writeHead(303, { location: `/added?section=${section}` });
      return res.end();
    }
    if (pathname === '/update') {
      res.writeHead(405, { allow: 'POST' });
      return res.end();
    }
    const publicPaths = new Set(['/', '/added', ...PUBLIC_SECTIONS.filter(name => name !== 'stereometry').map(name => sectionInfo(name).path)]);
    if (!publicPaths.has(pathname)) {
      res.writeHead(404, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      return res.end(renderNotFoundPage());
    }
    const physicsTopic = section === 'physics' ? requestUrl.searchParams.get('topic') : '';
    const page = await loadQuestions(section, pathname === '/added', { physicsTopic });
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(page);
  } catch (error) {
    res.writeHead(502, { 'content-type': 'text/html; charset=utf-8' });
    res.end(`<h1>Не удалось загрузить задания ФИПИ</h1><pre>${String(error.message)}</pre>`);
  }
}).listen(PORT, '127.0.0.1', async () => {
  console.log(`Стереометрия ФИПИ: http://localhost:${PORT}`);
  const sections = PUBLIC_SECTIONS;
  await Promise.all(sections.map(section => loadQuestions(section).catch(() => null)));
});
