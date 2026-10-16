const {assetUrl, serveAsset, sharedFipiAssetUrl} = require('./lib/web-assets');
const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');
const { createHmac, timingSafeEqual, randomBytes, scryptSync } = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const {renderStudyRequest, validateStudyLead, openStudyLeads, renderStudyLeadsAdmin, createStudyLeadDelivery} = require('./lib/study-leads');
const { conditionText } = require('./lib/seo-text');
const { expandMathmlFences } = require('./lib/mathml-fences');
const {restorePhysicsFigures} = require('./lib/physics-condition-figures');
const {restoreOgePhysicsFigures} = require('./lib/oge-physics-condition-figures');
const { ANALYTICS_SCRIPT, registrationAnalyticsCookie } = require('./lib/analytics');
const {UI_HEAD, renderSiteHeader, renderSiteFooter, renderSiteAd, insertSiteAd, renderStudyHero, renderSubjectSwitch, renderStudyBenefits, renderStudyGuide, renderStudyFaq} = require('./lib/site-ui');
const {egeSubjectContent} = require('./lib/ege-subject-content');
const {PHYSICS_TOPICS, physicsTopicInfo, physicsClassification, taskMatchesTopic, taskPhysicsTopic} = require('./lib/physics-topics');
const {MATH_TASK_TYPES, mathTaskTypeInfo, isFirstPartMathTask, mathTaskAssignment, mathTaskType} = require('./lib/math-task-types');
const {PHYSICS_TASK_TYPES, physicsTaskPart, physicsTaskTypeInfo, physicsTaskType, firstPartPhysicsMatches} = require('./lib/physics-task-types');

const {MATH_CATALOGUE_ALIASES, LEGACY_MATH_NAMES, LEGACY_PHYSICS_NAMES, catalogueUrl, normalizeCatalogueQuery, catalogueMatches, catalogueWindow, cataloguePageNumbers} = require('./lib/catalogue');
const {guides: catalogueGuides} = require('./lib/catalogue-guides');
const { OGE_ORIGIN, OGE_PAGE_SIZE, OGE_BANKS, ogeBank, ogePublicTaskId, ogeSourceTaskId, ogeTopicInfo, ogeTaskCodes, ogeTopicCodes, ogeTaskMatchesTopic, ogeTopicStats, ogeCataloguePath, ogePageNumber, ogeTaskNavigation, normalizeOgeSourceHtml } = require('./lib/oge-catalog');
const { execFile } = require('node:child_process');

const PORT = Number(process.env.PORT || 8765);
const PROJECT = 'AC437B34557F88EA4115D2F374B0A07B';
const PHYSICS_PROJECT = 'BA1F39653304A5B041B656915DC36B38';
const FIPI_ENDPOINT = 'https://ege.fipi.ru/bank/questions.php';
const ADDED_FILE = path.join(__dirname, 'added-history.json');
const ASSET_ROOT = path.join(__dirname, 'fipi-assets');
const STORAGE_ROOT = path.join(__dirname, 'storage');
const SOLUTIONS_DB_FILE = process.env.EGE_SOLUTIONS_DB || path.join(STORAGE_ROOT, 'solutions.sqlite');
const ADMIN_PASSWORD_FILE = process.env.EGE_ADMIN_PASSWORD_FILE || '/etc/ege-math-admin-password';
const ADMIN_SESSION_COOKIE = 'ege_math_admin';
const ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60;
const USER_SESSION_COOKIE = 'ege_math_user';
const USER_SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;
const MAX_COMMENT_LENGTH = 2_000;
const MAX_FEEDBACK_LENGTH = 2_000;
const COMMENTS_WIDGET_LIMIT = 100;
const SITE_ORIGIN = 'https://ege-fipi.ru';
const studyLeads = openStudyLeads(process.env.EGE_LEADS_DB || path.join(STORAGE_ROOT, 'study-leads.sqlite'));
const studyLeadDelivery = createStudyLeadDelivery(studyLeads);
void studyLeadDelivery.flush();
setInterval(() => { void studyLeadDelivery.flush(); }, 60_000).unref();
// Temporary maintenance switch; only an explicit 0 disables bot verification.
const TURNSTILE_ENABLED = process.env.TURNSTILE_ENABLED !== '0';
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY || '';
const TURNSTILE_SITE_KEY = process.env.TURNSTILE_SITE_KEY || '';
const TURNSTILE_HOSTNAMES = new Set(['ege-fipi.ru', 'www.ege-fipi.ru']);
const MATH_SECTIONS = ['stereometry', 'planimetry', 'parameters', 'equations', 'inequalities', 'optimal', 'numbers', 'finance'];
const PUBLIC_SECTIONS = [...MATH_SECTIONS, 'mathematics', 'physics', ...Object.keys(OGE_BANKS)];
const FIPI_PAGE_SIZE = 100;
const FIPI_SOURCES = {
  stereometry: { firstFile: 'questions.raw.html', extraPrefix: 'questions', theme: '7.2,7.3,7.4,7.5', answerKind: 'ILI_STD_FULL' },
  planimetry: { firstFile: 'planimetry.raw.html', extraPrefix: 'planimetry', theme: '7.1', answerKind: 'ILI_STD_FULL' },
  parameters: { firstFile: 'parameters.raw.html', extraPrefix: 'parameters', theme: '2.10', answerKind: 'ILI_STD_FULL' },
  equations: { firstFile: 'equations-1.raw.html', extraPrefix: 'equations', theme: '2.1,2.2,2.3,2.4,2.9', answerKind: 'ILI_STD_FULL' },
  inequalities: { firstFile: 'inequalities-1.raw.html', extraPrefix: 'inequalities', theme: '2.5,2.6,2.7,2.8,2.9', answerKind: 'ILI_STD_FULL' },
  optimal: { firstFile: 'optimal-all-1.raw.html', extraPrefix: 'optimal-all', theme: '', answerKind: 'ILI_STD_FULL' },
  numbers: { firstFile: 'numbers.raw.html', extraPrefix: 'numbers', theme: '1.1', answerKind: 'ILI_STD_FULL' },
  finance: { firstFile: 'finance.raw.html', extraPrefix: 'finance', theme: '3.8', answerKind: 'ILI_STD_FULL' },
  mathematics: { firstFile: 'mathematics-1.raw.html', extraPrefix: 'mathematics', theme: '' },
  physics: { firstFile: 'physics-1.raw.html', extraPrefix: 'physics', theme: '', project: PHYSICS_PROJECT },
  ...Object.fromEntries(Object.values(OGE_BANKS).map(bank => [bank.section, { firstFile: `${bank.filePrefix}-1.raw.html`, extraPrefix: bank.filePrefix, theme: '', project: bank.project }]))
};
const SECTION_INFO = {
  mathematics: { name: 'Первая часть ЕГЭ по математике', path: '/', topic: 'профильной математике', description: 'Задания первой части профильного ЕГЭ из банка ФИПИ: каталог по типам, краткие ответы и подробные решения.' },
  stereometry: { name: 'Стереометрия', path: '/stereometry', topic: 'стереометрии', description: 'Задачи по стереометрии из открытого банка ФИПИ: условия, ответы и подробные решения.' },
  planimetry: { name: 'Планиметрия', path: '/planimetry', topic: 'планиметрии', description: 'Задачи по планиметрии из открытого банка ФИПИ: условия, ответы и подробные решения.' },
  parameters: { name: 'Задачи с параметром', path: '/parameters', topic: 'задачам с параметром', description: 'Задачи с параметром из открытого банка ФИПИ: условия, ответы и подробные решения.' },
  equations: { name: 'Уравнения', path: '/equations', topic: 'уравнениям', description: 'Уравнения профильного ЕГЭ из открытого банка ФИПИ: условия, ответы и подробные решения.' },
  inequalities: { name: 'Неравенства', path: '/inequalities', topic: 'неравенствам', description: 'Неравенства профильного ЕГЭ из открытого банка ФИПИ: условия, ответы и подробные решения.' },
  optimal: { name: 'Оптимальный выбор', path: '/optimal', topic: 'задачам на оптимальный выбор', description: 'Задачи на оптимальный выбор из открытого банка ФИПИ: условия, ответы и подробные решения.' },
  numbers: { name: 'Числа и их свойства', path: '/numbers', topic: 'числам и их свойствам', description: 'Задачи по числам и их свойствам из открытого банка ФИПИ: условия, ответы и подробные решения.' },
  finance: { name: 'Финансовая математика', path: '/finance', topic: 'финансовой математике', description: 'Финансовые задачи профильного ЕГЭ из открытого банка ФИПИ: условия, ответы и подробные решения.' },
  physics: { name: 'Физика', path: '/physics', topic: 'физике', description: 'Первая часть ЕГЭ по физике: задания ФИПИ по учебным типам, числовые ответы, выбор вариантов и соответствия.' },
  oge: { name: 'ОГЭ — математика', path: '/oge', topic: 'математике ОГЭ', description: 'Задания ОГЭ по математике из открытого банка ФИПИ: числа, алгебра, уравнения, функции, геометрия, вероятность и статистика.' },
  'oge-physics': { name: 'ОГЭ — физика', path: '/oge-physics', topic: 'физике ОГЭ', description: 'Задания ОГЭ по физике из открытого банка ФИПИ: механические, тепловые, электромагнитные и квантовые явления.' }
};
const MATH_TOPICS = [
  { code: '1', name: 'Числа и вычисления', children: [
    ['1.1', 'Натуральные и целые числа. Признаки делимости целых чисел'],
    ['1.2', 'Рациональные числа. Обыкновенные и десятичные дроби, проценты, бесконечные периодические дроби'],
    ['1.3', 'Арифметический корень натуральной степени. Действия с арифметическими корнями натуральной степени'],
    ['1.4', 'Степень с целым показателем. Степень с рациональным показателем. Свойства степени'],
    ['1.5', 'Синус, косинус и тангенс числового аргумента. Арксинус, арккосинус, арктангенс числового аргумента'],
    ['1.6', 'Логарифм числа. Десятичные и натуральные логарифмы'],
    ['1.7', 'Действительные числа. Приближённые вычисления, округление, прикидка и оценка результата'],
    ['1.8', 'Преобразование выражений'],
    ['1.9', 'Комплексные числа']
  ] },
  { code: '2', name: 'Уравнения и неравенства', children: [
    ['2.1', 'Целые и дробно-рациональные уравнения'],
    ['2.2', 'Иррациональные уравнения'],
    ['2.3', 'Тригонометрические уравнения'],
    ['2.4', 'Показательные и логарифмические уравнения'],
    ['2.5', 'Целые и дробно-рациональные неравенства'],
    ['2.6', 'Иррациональные неравенства'],
    ['2.7', 'Показательные и логарифмические неравенства'],
    ['2.8', 'Тригонометрические неравенства'],
    ['2.9', 'Системы и совокупности уравнений и неравенств'],
    ['2.10', 'Уравнения, неравенства и системы с параметрами'],
    ['2.11', 'Матрица системы линейных уравнений. Определитель матрицы']
  ] },
  { code: '3', name: 'Функции и графики', children: [
    ['3.1', 'Функция, способы задания функции. График функции'],
    ['3.2', 'Область определения и множество значений. Нули, монотонность, экстремумы и наибольшее значение функции'],
    ['3.3', 'Степенная функция и корень n-й степени: свойства и графики'],
    ['3.4', 'Тригонометрические функции, их свойства и графики'],
    ['3.5', 'Показательная и логарифмическая функции, их свойства и графики'],
    ['3.6', 'Точки разрыва. Асимптоты. Свойства функций, непрерывных на отрезке'],
    ['3.7', 'Последовательности, способы задания последовательностей'],
    ['3.8', 'Арифметическая и геометрическая прогрессии. Формула сложных процентов']
  ] },
  { code: '4', name: 'Начала математического анализа', children: [
    ['4.1', 'Производная функции. Производные элементарных функций'],
    ['4.2', 'Применение производной к исследованию функций, нахождению экстремумов и наибольшего значения'],
    ['4.3', 'Первообразная. Интеграл']
  ] },
  { code: '5', name: 'Множества и логика', children: [
    ['5.1', 'Множество, операции над множествами. Диаграммы Эйлера — Венна'],
    ['5.2', 'Логика']
  ] },
  { code: '6', name: 'Вероятность и статистика', children: [
    ['6.1', 'Описательная статистика'],
    ['6.2', 'Вероятность'],
    ['6.3', 'Комбинаторика']
  ] },
  { code: '7', name: 'Геометрия', children: [
    ['7.1', 'Фигуры на плоскости'],
    ['7.2', 'Прямые и плоскости в пространстве'],
    ['7.3', 'Многогранники'],
    ['7.4', 'Тела и поверхности вращения'],
    ['7.5', 'Координаты и векторы']
  ] }
];
const YANDEX_METRIKA_HEAD = `<!-- Yandex.Metrika counter -->
<script type="text/javascript">
    ${ANALYTICS_SCRIPT}
    (function(m,e,t,r,i,k,a){
        m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
        m[i].l=1*new Date();
        for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
        k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
    })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=112561663', 'ym');

    ym(112561663, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true, params: window.egeAnalytics.visitParams});
</script>
<!-- /Yandex.Metrika counter -->`;
const YANDEX_METRIKA_NOSCRIPT = `<noscript><div><img src="https://mc.yandex.ru/watch/112561663" style="position:absolute; left:-9999px;" alt="" /></div></noscript>`;
const SITE_ICON_HEAD = '<link rel="icon" type="image/svg+xml" sizes="any" href="/favicon.svg">';
const SITE_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" role="img" aria-label="ЕГЭ и ОГЭ ФИПИ"><rect width="192" height="192" rx="38" fill="#183153"/><path fill="#f0b429" d="M38 42h116v24H65v29h75v23H65v32h89v24H38z"/><text x="96" y="87" text-anchor="middle" fill="#fff" font-family="Arial, sans-serif" font-size="30" font-weight="700">ЕГЭ</text></svg>`;

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
fsSync.mkdirSync(path.dirname(SOLUTIONS_DB_FILE), { recursive: true });
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
const sourceEntriesCache = new Map();
const mathStatsCache = new Map();
let taskDirectoryPromise = null;
let taskSearchIndexPromise = null;
const added = { stereometry: [], planimetry: [], parameters: [], equations: [], inequalities: [], optimal: [], numbers: [], finance: [], mathematics: [], physics: [], oge: [], 'oge-physics': [] };
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


function sectionInfo(section) {
  return SECTION_INFO[section] || SECTION_INFO.mathematics;
}

function mathTopicInfo(code) {
  if (!code) return null;
  if (code === 'all') return { code, name: 'Все задания первой части' };
  const type = mathTaskTypeInfo(code);
  if (type) return type;
  for (const group of MATH_TOPICS) {
    if (group.code === code) return { code, name: group.name, legacy: true };
    const child = group.children.find(([childCode]) => childCode === code);
    if (child) return { code, name: LEGACY_MATH_NAMES[code] || child[1], legacy: true };
  }
  return null;
}

function catalogPhysicsTopicInfo(code, part = 1) {
  if (!code) return null;
  if (code === 'all') return { code, name: `Все задания ${part === 2 ? 'второй' : 'первой'} части` };
  if (code === 'unclassified') return { code, name: 'Без указанной темы КЭС' };
  if (part === 1 && physicsTaskTypeInfo(code)) return physicsTaskTypeInfo(code);
  const topic = physicsTopicInfo(code);
  return topic && part === 1 && LEGACY_PHYSICS_NAMES[code] ? {...topic, name: LEGACY_PHYSICS_NAMES[code]} : topic;
}

function renderMathTopicMenu(activeCode = '', counts = {}, total = 0) {
  const groups = MATH_TASK_TYPES.map(group => {
    const groupCount = counts[group.code] || 0;
    const groupIsActive = activeCode === group.code || activeCode.startsWith(`${group.code}.`);
    const groupLink = groupCount
      ? `<a class="math-topic-major ${activeCode === group.code ? 'active' : ''}" href="/?topic=${group.code}#tasks">Все задания раздела <span class="math-topic-count">${groupCount}</span></a>`
      : '<span class="math-topic-major disabled" aria-disabled="true">В банке пока нет заданий</span>';
    const children = group.children.map(([code, name]) => {
      const count = counts[code] || 0;
      return count
        ? `<a class="${activeCode === code ? 'active' : ''}" href="/?topic=${code}#tasks">${escapeHtml(name)} <span class="math-topic-count">${count}</span></a>`
        : `<span class="disabled" aria-disabled="true">${escapeHtml(name)} <span class="math-topic-count">0</span></span>`;
    }).join('');
    return `<details class="math-topic-group" ${groupIsActive ? 'open' : ''}>
      <summary><span>${escapeHtml(group.name)}</span><span class="math-topic-count">${groupCount}</span></summary>
      <div class="math-topic-children">${groupLink}${children}</div>
    </details>`;
  }).join('');
  const menu = `<section class="math-topics" id="practice" aria-labelledby="math-topics-title">
    <div class="math-topics-heading">
      <div><h2 id="math-topics-title">Первая часть: задания по типам</h2><p>Выберите тип и тему задания с кратким ответом.</p></div>
      <a class="math-all-link ${activeCode === 'all' ? 'active' : ''}" href="/?topic=all#tasks">Вся первая часть <span>${total}</span></a>
    </div>
    <div class="math-topic-grid">${groups}</div>
    ${counts.other ? `<a href="/?topic=other#tasks">Другие задания первой части (${counts.other})</a>` : ''}
  </section>`;
  return activeCode
    ? `<details class="math-topic-picker"><summary>Выбрать другую тему</summary>${menu}</details>`
    : menu;
}

function renderPhysicsTopicMenu(activeCode = '', counts = {}, total = 0) {
  const groups = PHYSICS_TASK_TYPES.map(group => `<details class="math-topic-group" ${activeCode === group.code || activeCode.startsWith(group.code + '.') ? 'open' : ''}>
    <summary><span>${escapeHtml(group.name)}</span><span class="math-topic-count">${counts[group.code] || 0}</span></summary>
    <div class="math-topic-children">
      <a class="math-topic-major" href="/physics?topic=${group.code}#tasks">Все задания раздела <span class="math-topic-count">${counts[group.code] || 0}</span></a>
      ${group.children.map(([code, name]) => counts[code]
        ? `<a href="/physics?topic=${code}#tasks" class="${activeCode === code ? 'active' : ''}">${escapeHtml(name)} <span class="math-topic-count">${counts[code]}</span></a>`
        : `<span class="disabled" aria-disabled="true">${escapeHtml(name)} <span class="math-topic-count">0</span></span>`).join('')}
    </div>
  </details>`).join('');
  const menu = `<section class="math-topics physics-first-part" id="practice" aria-labelledby="physics-topics-title">
    <div class="math-topics-heading"><div><h2 id="physics-topics-title">Первая часть физики: задания по типам</h2><p>Выберите тип и тему задания.</p></div>
      <a class="math-all-link" href="/physics?topic=all#tasks">Вся первая часть <span>${total}</span></a></div>
    <div class="math-topic-grid">${groups}</div>
    ${counts.other ? `<a href="/physics?topic=other#tasks">Другие задания первой части (${counts.other})</a>` : ''}
  </section>`;
  return activeCode ? `<details class="math-topic-picker physics-topic-picker"><summary>Выбрать другой тип задания</summary>${menu}</details>` : menu;
}

function renderPhysicsSecondPartMenu(activeCode = '', counts = {}, total = 0, unclassified = 0) {
  const groups = PHYSICS_TOPICS.map(group => {
    const groupCount = counts[group.code] || 0;
    const groupLink = groupCount
      ? `<a class="physics-topic-major ${activeCode === group.code ? 'active' : ''}" href="/physics?topic=${group.code}">${group.code}. ${escapeHtml(group.name)} <span class="physics-topic-count">${groupCount}</span></a>`
      : `<span class="physics-topic-major disabled" aria-disabled="true">${group.code}. ${escapeHtml(group.name)} <span class="physics-topic-count">0</span></span>`;
    const children = group.children.map(([code, name]) => {
      const count = counts[code] || 0;
      return count
        ? `<a class="${activeCode === code ? 'active' : ''}" href="/physics?topic=${code}"><strong>${code}</strong> ${escapeHtml(name)} <span class="physics-topic-count">${count}</span></a>`
        : `<span class="disabled" aria-disabled="true"><strong>${code}</strong> ${escapeHtml(name)} <span class="physics-topic-count">0</span></span>`;
    }).join('');
    return `<section class="physics-topic-group">${groupLink}<div class="physics-topic-children">${children}</div></section>`;
  }).join('');
  const unclassifiedLink = unclassified
    ? `<a class="physics-unclassified ${activeCode === 'unclassified' ? 'active' : ''}" href="/physics?topic=unclassified">Без указанной темы КЭС <span class="physics-topic-count">${unclassified}</span></a>`
    : '';
  return `<details class="math-topic-picker physics-topic-picker"><summary>Темы второй части</summary><section class="physics-topics" aria-labelledby="physics-topics-title">
    <div class="physics-topics-heading">
      <div><h2 id="physics-topics-title">Вторая часть физики</h2><p>Задачи с развёрнутым ответом по разделам и темам.</p></div>
      <a class="physics-all-link ${activeCode === 'all' ? 'active' : ''}" href="/physics?topic=all">Вся вторая часть <span>${total}</span></a>
    </div>
    <div class="physics-topic-grid">${groups}</div>${unclassifiedLink}
  </section></details>`.replaceAll('/physics?topic=', '/physics/part-2?topic=').replace(/(href="\/physics\/part-2\?topic=[^"]+)"/g, '$1#tasks"');
}

function renderExamPage({title, description, pathname, breadcrumbs, items, content, faq}) {
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  ${YANDEX_METRIKA_HEAD}
  ${renderSeoMetadata({title, description, pathname, structuredData: {
    '@context': 'https://schema.org', '@graph': [
      {'@type': 'CollectionPage', name: title, description, url: absoluteUrl(pathname), inLanguage: 'ru',
        mainEntity: {'@type': 'ItemList', name: title, numberOfItems: items.length, itemListElement: items.map((item, index) => ({
          '@type': 'ListItem', position: index + 1, name: item.name, url: absoluteUrl(item.path)
        }))}},
      breadcrumbData(breadcrumbs)
    ]
  }})}
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #f4f6f8; color: #334155; font: 16px/1.5 Arial, sans-serif; }
    a { color: #1769aa; }
    a:focus-visible, button:focus-visible, input:focus-visible { outline: 3px solid #f0b429; outline-offset: 3px; }
    .exam-header { background: #183153; color: #fff; }
    .exam-header-inner, main { max-width: 1100px; margin: auto; padding: 24px; }
    .exam-header-inner { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; }
    .exam-header strong { font-size: 19px; }
    .exam-nav { display: flex; flex-wrap: wrap; gap: 8px; }
    .exam-nav a { padding: 8px 12px; border: 1px solid #ffffff70; border-radius: 7px; color: #fff; text-decoration: none; }
    .exam-nav a[aria-current], .exam-nav a:hover { background: #fff; color: #183153; }
    .seo-breadcrumbs { color: #526273; font-size: 14px; }
    .seo-breadcrumbs ol { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; padding: 0; list-style: none; }
    .seo-breadcrumbs li:not(:last-child)::after { content: "›"; margin-left: 6px; }
    .exam-intro { margin: 24px 0; }
    h1 { margin: 0 0 12px; color: #183153; font-size: 38px; line-height: 1.2; }
    .exam-intro p { max-width: 740px; margin: 0; }
    .subject-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; align-items: start; }
    .subject-card { padding: 28px; border: 1px solid #d8e1eb; border-top: 4px solid #183153; border-radius: 10px; background: #fff; box-shadow: 0 2px 8px #1831530b; scroll-margin-top: 20px; }
    .subject-card h2 { margin: 0 0 8px; color: #183153; font-size: 26px; line-height: 1.2; }
    .subject-card p { margin: 0 0 20px; }
    .subject-stats { color: #526273; font-size: 14px; }
    .subject-card h3 { margin: 22px 0 8px; color: #183153; font-size: 18px; }
    .subject-card .part-link { display: block; padding: 12px 16px; border: 1px solid #183153; border-radius: 8px; background: #183153; color: #fff; text-decoration: none; font-weight: 700; text-align: center; }
    .part-link:hover { background: #244971; }
    .subject-topics { display: flex; flex-wrap: wrap; gap: 8px; }
    .subject-topics a { padding: 8px 10px; border: 1px solid #d8e1eb; border-radius: 6px; text-decoration: none; }
    .subject-topics a:hover { border-color: #1769aa; background: #f4f8fc; }
    .exam-search { margin: 24px 0; padding: 24px 28px; border: 1px solid #d8e1eb; border-radius: 10px; background: #fff; }
    .exam-search label { display: block; margin-bottom: 10px; font-weight: 700; color: #183153; }
    .exam-search-row { display: flex; gap: 10px; }
    .exam-search input { min-width: 0; flex: 1; padding: 12px; border: 1px solid #9aabba; border-radius: 7px; font: inherit; }
    .exam-search button { padding: 12px 20px; border: 0; border-radius: 7px; background: #183153; color: #fff; font: inherit; cursor: pointer; }
    @media (max-width: 700px) {
      .exam-header-inner, main { padding: 18px 16px; }
      .exam-nav a { font-size: 14px; padding: 8px 10px; }
      h1 { font-size: 32px; }
      .subject-grid { grid-template-columns: 1fr; gap: 16px; }
      .subject-card, .exam-search { padding: 20px; }
      .subject-card h2 { font-size: 24px; }
      .exam-search-row { flex-wrap: wrap; }
      .exam-search input { flex-basis: 100%; }
    }
    .subject-card h2 a { color: inherit; text-decoration: none; }
    .subject-card h2 a:hover { text-decoration: underline; }
    .subject-overview-link { display: inline-block; margin: 0 0 20px; font-weight: 700; }
    .exam-intro .subject-stats { margin-top: 16px; }
    .subject-jumps { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
    .subject-jumps a { padding: 10px 16px; border: 1px solid #183153; border-radius: 8px; color: #183153; text-decoration: none; font-weight: 700; }
    .subject-jumps a:first-child { background: #183153; color: white; }
    .subject-section { margin: 22px 0; padding: 26px; background: #fff; border: 1px solid #d8e1eb; border-radius: 10px; scroll-margin-top: 16px; }
    .subject-section h2 { color: #183153; margin: 0 0 10px; font-size: 25px; line-height: 1.25; }
    .subject-section > p { margin: 0 0 16px; }
    .topic-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .topic-card { padding: 16px; border: 1px solid #d8e1eb; border-radius: 8px; }
    .topic-card h3 { margin: 0 0 8px; font-size: 18px; line-height: 1.35; }
    .topic-card p { margin: 0 0 10px; font-size: 14px; color: #526273; }
    .topic-card .topic-example { display: inline-block; margin-top: 6px; font-size: 14px; }
    .subject-guide { padding-left: 24px; margin-bottom: 0; }
    .subject-guide li { margin: 10px 0; }
    @media (max-width: 700px) {
      .subject-section { padding: 20px; }
      .topic-grid { grid-template-columns: 1fr; }
      .subject-section h2 { font-size: 22px; }
    }
  </style>
  ${UI_HEAD}
</head>
<body class="exam-page">
  ${YANDEX_METRIKA_NOSCRIPT}
  ${renderSiteHeader({pathname, subject: pathname === '/ege/physics' ? 'physics' : pathname === '/ege/math' ? 'math' : ''})}
  <main>
    ${renderBreadcrumbs(breadcrumbs)}
    ${insertSiteAd(content)}
    <form class="exam-search" action="/search" method="get" role="search">
      <label for="exam-search-query">Найти задание по номеру ФИПИ или условию</label>
      <div class="exam-search-row"><input id="exam-search-query" name="q" type="search" placeholder="Номер ФИПИ или текст условия" required><button type="submit">Найти</button></div>
    </form>
    ${faq || renderStudyFaq()}
    ${renderStudyRequest('ЕГЭ', pathname.includes('physics') ? 'физика' : 'математика')}
    ${renderSiteFooter()}
  </main>
</body>
</html>`;
}

async function renderEgeHubPage() {
  const title = 'ЕГЭ — задания ФИПИ по математике и физике';
  const description = 'Подготовка к ЕГЭ: задания открытого банка ФИПИ по профильной математике и физике. Выберите предмет, часть экзамена и тип задания.';
  const published = new Set(listPublishedSolutionIds.all().map(row => row.task_id));
  const [mathHtml, physicsHtml] = await Promise.all([loadSourceHtml('mathematics'), loadSourceHtml('physics')]);
  const stats = html => {
    const ids = [...new Set(sourceTaskEntries(html).map(task => task.id))];
    return `${ids.length} заданий · ${ids.filter(id => published.has(id)).length} решений`;
  };
  const allIds = new Set([...sourceTaskEntries(mathHtml), ...sourceTaskEntries(physicsHtml)].map(task => task.id));
  const solved = [...allIds].filter(id => published.has(id)).length;
  const breadcrumbs = [{name: 'ЕГЭ', path: '/ege'}];
  return renderExamPage({title, description, pathname: '/ege', breadcrumbs,
    items: [{name: 'ЕГЭ по математике: профильный уровень', path: '/ege/math'}, {name: 'ЕГЭ по физике', path: '/ege/physics'}],
    content: `${renderStudyHero({hub: true, solved, sampleAnswer: getPublishedSolution.get('6D1598')?.answer || ''})}
    ${renderStudyBenefits()}
    <div class="subject-choice-heading" id="subjects"><h2>С какого предмета начнём?</h2><p>Выберите предмет, затем часть экзамена и нужную тему.</p></div>
    <div class="subject-grid">
      <section class="subject-card" id="mathematics" aria-labelledby="math-title">
        <h2 id="math-title"><a href="/ege/math">Математика</a></h2>
        <p>Профильный уровень</p>
        <p class="subject-stats">${stats(mathHtml)}</p>
        <a class="subject-overview-link" href="/ege/math">Профильный ЕГЭ по математике: обе части →</a>
        <a class="part-link" href="/math">Первая часть — по типам заданий</a>
        <h3>Вторая часть — по темам</h3>
        <div class="subject-topics">${MATH_SECTIONS.map(section => `<a href="${sectionInfo(section).path}">${escapeHtml(sectionInfo(section).name)}</a>`).join('')}</div>
      </section>
      <section class="subject-card" id="physics" aria-labelledby="physics-title">
        <h2 id="physics-title"><a href="/ege/physics">Физика</a></h2>
        <p>Задания с кратким и развёрнутым ответом</p>
        <p class="subject-stats">${stats(physicsHtml)}</p>
        <a class="subject-overview-link" href="/ege/physics">ЕГЭ по физике: подготовка по темам →</a>
        <a class="part-link" href="/physics">Первая часть — по типам заданий</a>
        <h3>Вторая часть — по темам</h3>
        <div class="subject-topics">${PHYSICS_TOPICS.map(group => `<a href="/physics/part-2?topic=${group.code}#tasks">${escapeHtml(group.name)}</a>`).join('')}<a href="/physics/part-2#tasks">Вся вторая часть</a></div>
      </section>
    </div>
    ${renderStudyGuide({hub: true})}
`
  });
}

async function renderEgeSubjectPage(subject) {
  const isPhysics = subject === 'physics';
  const pathname = isPhysics ? '/ege/physics' : '/ege/math';
  const subjectName = isPhysics ? 'Физика' : 'Математика';
  const tasks = [...new Map(sourceTaskEntries(await loadSourceHtml(isPhysics ? 'physics' : 'mathematics')).map(task => [task.id, task])).values()];
  const published = new Set(listPublishedSolutionIds.all().map(row => row.task_id));
  const first = tasks.filter(task => isPhysics ? physicsTaskPart(task) === 1 : isFirstPartMathTask(task));
  const second = tasks.filter(task => isPhysics ? physicsTaskPart(task) === 2 : !isFirstPartMathTask(task));
  const solvedCount = entries => entries.filter(task => published.has(task.id)).length;
  const stats = entries => `Заданий: ${entries.length} · С решениями: ${solvedCount(entries)}`;
  const subjectContent = egeSubjectContent(subject, {total: tasks.length, solved: solvedCount(tasks)});
  const {title, heading, description} = subjectContent;
  const firstTypes = isPhysics ? PHYSICS_TASK_TYPES : MATH_TASK_TYPES;
  const firstGroups = [...firstTypes, {code: 'other', name: 'Другие задания первой части'}].map(group => ({
    name: group.name,
    path: `${isPhysics ? '/physics' : '/'}?topic=${group.code}#tasks`,
    tasks: first.filter(task => {
      const type = isPhysics ? physicsTaskType(task) : mathTaskType(task);
      return (type?.group || type?.code) === group.code;
    })
  })).filter(group => group.tasks.length);
  const secondGroups = (isPhysics
    ? [...PHYSICS_TOPICS, {code: 'unclassified', name: 'Другие темы второй части'}].map(group => ({
      name: group.name, path: `/physics/part-2?topic=${group.code}#tasks`,
      tasks: second.filter(task => taskMatchesPhysicsCatalogTopic(task, group.code, 2))
    }))
    : await Promise.all(MATH_SECTIONS.map(async section => ({
      name: sectionInfo(section).name, path: sectionInfo(section).path,
      tasks: sourceTaskEntries(await loadSourceHtml(section))
    })))).filter(group => group.tasks.length);
  const cards = groups => groups.map(group => {
    const example = group.tasks.find(task => published.has(task.id));
    return `<article class="topic-card">
      <h3><a href="${escapeHtml(group.path)}">${escapeHtml(group.name)}</a></h3>
      <p>${stats(group.tasks)}</p>
      ${example ? `<a class="topic-example" href="/tasks/${example.id}#solution-${example.id}">Пример с решением: ${example.id} →</a>` : '<p>Условия для самостоятельной подготовки</p>'}
    </article>`;
  }).join('');
  const breadcrumbs = [{name: 'ЕГЭ', path: '/ege'}, {name: subjectName, path: pathname}];
  return renderExamPage({title, description, pathname, breadcrumbs, items: [...firstGroups, ...secondGroups], faq: subjectContent.faq, content: `
    <section class="exam-intro" aria-labelledby="subject-title">
      <p class="study-eyebrow"><span></span>${isPhysics ? 'Физика' : 'Профильная математика'} · обе части ЕГЭ</p>
      <h1 id="subject-title">${heading}</h1>
      <p>${subjectContent.lead}</p>
      <p>Задания и опубликованные решения — бесплатно и без регистрации.</p>
      <p class="subject-stats">${stats(tasks)}</p>
      <nav class="subject-jumps" aria-label="Навигация по подготовке"><a href="#part-1">Первая часть →</a><a href="#part-2">Вторая часть</a><a href="#preparation">С чего начать</a><a href="#study-guide">Как пользоваться решениями</a></nav>
    </section>
    ${subjectContent.preparation}
    <section class="subject-section" id="part-1" aria-labelledby="part-1-title">
      <h2 id="part-1-title">Первая часть: задания с кратким ответом</h2>
      <p>${isPhysics
        ? 'Выберите учебную тему или тип задания: от кинематики и термодинамики до анализа физических законов и экспериментов. В подборках доступны условия, а готовые решения отмечены отдельно.'
        : 'Начните с нужного типа: геометрия, вероятности, вычисления, уравнения, графики или текстовые задачи. Внутри подборки можно перейти к более узкой теме и последовательно разобрать задания.'}</p>
      <p class="subject-stats">${stats(first)}</p>
      <p><a href="${isPhysics ? '/physics' : '/math'}">Открыть каталог первой части →</a></p>
      <div class="topic-grid">${cards(firstGroups)}</div>
    </section>
    <section class="subject-section" id="part-2" aria-labelledby="part-2-title">
      <h2 id="part-2-title">Вторая часть: задачи с развёрнутым ответом</h2>
      <p>${isPhysics
        ? 'Расчётные задачи по механике, молекулярной физике, термодинамике, электродинамике и квантовой физике. Используйте подробный разбор, чтобы проследить переход от исходных данных к уравнениям и ответу.'
        : 'Выберите тему для тренировки развёрнутой записи решения. В подборках собраны алгебраические, геометрические и экономические задачи, задачи с параметром и на свойства чисел.'}</p>
      <p class="subject-stats">${stats(second)}</p>
      ${solvedCount(second) === second.length && second.length ? '<p>Для каждого задания второй части в этом каталоге опубликовано подробное решение.</p>' : '<p>Готовые разборы доступны у заданий с опубликованным решением.</p>'}
      ${isPhysics ? '<p><a href="/physics/part-2#tasks">Открыть всю вторую часть →</a></p>' : ''}
      <div class="topic-grid">${cards(secondGroups)}</div>
    </section>
    <section class="subject-section" id="study-guide" aria-labelledby="study-guide-title">
      <h2 id="study-guide-title">Как пользоваться решениями</h2>
      <ol class="subject-guide">
        <li>Выберите тему или найдите задание по его номеру ФИПИ через поиск ниже.</li>
        <li>Прочитайте условие и попробуйте решить задачу самостоятельно. Затем откройте опубликованный разбор и сравните ход решения и ответ.</li>
        <li>${isPhysics ? 'Проверьте, какие физические законы использованы, как записаны уравнения и учтены единицы измерения.' : 'Сравните преобразования и обоснования каждого шага. В задачах второй части проверьте не только итоговый ответ, но и полноту записи решения.'}</li>
        <li>Перейдите к следующему заданию того же раздела. Если заметили ошибку в условии или разборе, сообщите о ней на странице задания.</li>
      </ol>
    </section>
  `});
}

async function renderMathHubPage() {
  const title = 'Первая часть ЕГЭ по математике — задания и решения ФИПИ';
  const description = 'Каталог первой части профильного ЕГЭ по математике: задания с кратким ответом по типам, условия и подробные решения из банка ФИПИ.';
  const published = new Set(listPublishedSolutionIds.all().map(row => row.task_id));
  const tasks = sourceTaskEntries(await loadSourceHtml('mathematics')).filter(isFirstPartMathTask);
  const catalogIds = tasks.map(task => task.id);
  const sections = MATH_TASK_TYPES.map(group => {
    const ids = tasks.filter(task => mathTaskType(task)?.group === group.code).map(task => task.id);
    return {
      name: group.name,
      path: `/?topic=${group.code}#tasks`,
      description: group.children.map(([, name]) => name).join(', ') + '.',
      count: ids.length,
      solved: ids.filter(id => published.has(id)).length
    };
  });
  const total = catalogIds.length;
  const solved = catalogIds.filter(id => published.has(id)).length;
  const breadcrumbs = [{name: 'ЕГЭ', path: '/ege'}, {name: 'Математика', path: '/ege/math'}, {name: 'Первая часть', path: '/math'}];
  const sectionLinks = sections.map((section, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: `${section.name} — решения задач ЕГЭ`,
    url: absoluteUrl(section.path)
  }));
  return `<!doctype html>
<html lang="ru">
<head>
  ${YANDEX_METRIKA_HEAD}
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  ${renderSeoMetadata({
    title,
    description,
    pathname: '/math',
    structuredData: {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'CollectionPage',
          name: title,
          description,
          url: absoluteUrl('/math'),
          inLanguage: 'ru',
          isPartOf: {'@type': 'WebSite', name: 'ЕГЭ и ОГЭ ФИПИ — математика и физика', url: SITE_ORIGIN},
          mainEntity: {'@type': 'ItemList', name: 'Типы заданий первой части ЕГЭ', numberOfItems: sections.length, itemListElement: sectionLinks}
        },
        breadcrumbData(breadcrumbs)
      ]
    }
  })}
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #f4f6f8; color: #334155; font: 16px/1.5 Arial, sans-serif; }
    .math-hub-page { max-width: 1100px; margin: 0 auto; padding: 24px; }
    .math-hub-header { position: sticky; top: 0; z-index: 50; margin: -24px -24px 20px; padding: 14px 24px;
      background: #183153; color: #fff; box-shadow: 0 2px 8px #0003; }
    .math-hub-header strong { display: block; font-size: 18px; }
    .math-hub-header small { display: block; margin-top: 3px; opacity: .82; }
    .math-hub-header .physics-link { float: right; margin: -2px 0 8px 16px; padding: 9px 18px; border: 2px solid #f0b429;
      border-radius: 8px; background: #f0b429; color: #183153; font-weight: 800; text-decoration: none; }
    .math-hub-menu { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .math-hub-menu a { padding: 7px 10px; border: 1px solid #ffffff70; border-radius: 6px; color: #fff; text-decoration: none; }
    .math-hub-menu a:hover, .math-hub-menu a.active { background: #fff; color: #183153; }
    .seo-breadcrumbs { margin: 0 0 16px; color: #526273; font-size: 14px; }
    .seo-breadcrumbs ol { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; padding: 0; list-style: none; }
    .seo-breadcrumbs li:not(:last-child)::after { content: '›'; margin-left: 6px; color: #8a9aab; }
    .seo-breadcrumbs a { color: #1769aa; }
    .math-hub-intro, .math-hub-section { padding: 26px 30px; border: 1px solid #d8e1eb; border-radius: 10px; background: #fff; box-shadow: 0 1px 7px #00000012; }
    .math-hub-intro { margin-bottom: 20px; }
    .math-hub-intro h1 { margin: 0 0 12px; color: #183153; font-size: 30px; line-height: 1.2; }
    .math-hub-intro p { max-width: 850px; margin: 0 0 14px; }
    .math-hub-stats { color: #526273; font-weight: 700; }
    .math-hub-actions { display: flex; flex-wrap: wrap; gap: 10px; }
    .math-hub-actions a { padding: 12px 18px; border: 1px solid #183153; border-radius: 8px; color: #183153; font-weight: 700; text-decoration: none; }
    .math-hub-actions .math-hub-all { background: #183153; color: #fff; }
    .math-hub-actions a:hover { box-shadow: 0 2px 9px #18315333; }
    .math-hub-section h2 { margin: 0 0 18px; color: #183153; font-size: 23px; }
    .math-hub-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    .math-hub-card { display: block; padding: 18px; border: 1px solid #d8e1eb; border-radius: 8px; color: #334155; text-decoration: none; }
    .math-hub-card:hover { border-color: #1769aa; box-shadow: 0 2px 9px #1769aa22; }
    .math-hub-card h3 { margin: 0 0 7px; color: #1769aa; font-size: 19px; }
    .math-hub-card p { margin: 0 0 8px; }
    .math-hub-card small { color: #526273; font-weight: 700; }
    @media (max-width: 700px) {
      .math-hub-page { padding: 12px; }
      .math-hub-header { position: static; margin: -12px -12px 14px; padding: 14px 12px; }
      .math-hub-header .physics-link { float: none; display: block; width: max-content; margin: 0 0 10px auto; }
      .math-hub-menu { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
      .math-hub-menu a { min-height: 42px; padding: 6px; font-size: 13px; text-align: center; }
      .math-hub-intro, .math-hub-section { padding: 20px; }
      .math-hub-intro h1 { font-size: 24px; }
      .math-hub-grid { grid-template-columns: 1fr; }
    }
  </style>
  ${UI_HEAD}
</head>
<body>
  ${YANDEX_METRIKA_NOSCRIPT}
  <main class="math-hub-page">
    ${renderSiteHeader({subject: 'math', pathname: '/math'})}
    ${renderBreadcrumbs(breadcrumbs)}
    <section class="math-hub-intro" aria-labelledby="math-hub-title">
      <p class="study-eyebrow"><span></span>Профильная математика · бесплатная практика</p>
      <h1 id="math-hub-title">${escapeHtml(title)}</h1>
      <p>Здесь собраны задания первой части профильного ЕГЭ по математике из открытого банка ФИПИ. Выберите тип задания или откройте всю первую часть. Подробные решения доступны ${solved === total ? 'для каждого задания' : 'для части заданий'}.</p>
      <p class="math-hub-stats">${total} заданий · ${solved} подробных решений</p>
      <div class="math-hub-actions">
        <a class="math-hub-all" href="/?topic=all#tasks">Вся первая часть (${total})</a>
        <a href="/">Выбрать тип задания</a>
      </div>
    </section>
    ${renderSiteAd()}
    <section class="math-hub-section" aria-labelledby="math-hub-sections-title">
      <h2 id="math-hub-sections-title">Типы заданий первой части</h2>
      <div class="math-hub-grid">
        ${sections.map(section => `<a class="math-hub-card" href="${escapeHtml(section.path)}">
          <h3>${escapeHtml(section.name)} — решения задач ЕГЭ</h3>
          <p>${escapeHtml(section.description)}</p>
          <small>${section.count} заданий · ${section.solved} решений</small>
        </a>`).join('')}
      </div>
    </section>
    ${renderStudyGuide({subject: 'math'})}
    ${renderStudyRequest()}
    ${renderSiteFooter()}
  </main>
</body>
</html>`;
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
  // Match the whole balanced radicand, including units or nested expressions.
  // Fractions are still placeholders here and are expanded by renderMathText.
  function compoundRoots(text) {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '√' && text[i + 1] === '(') {
        let depth = 1, end = i + 2;
        for (; end < text.length && depth; end++) {
          if (text[end] === '(') depth++;
          if (text[end] === ')') depth--;
        }
        if (!depth) {
          result += '<span class="math-root">√<span class="math-radicand">' + compoundRoots(text.slice(i + 2, end - 1)) + '</span></span>';
          i = end - 1;
          continue;
        }
      }
      result += text[i];
    }
    return result;
  }
  function compoundPowers(text) {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '^' && text[i + 1] === '(') {
        let depth = 1, end = i + 2;
        for (; end < text.length && depth && text[end] !== '\n'; end++) {
          if (text[end] === '(') depth++;
          if (text[end] === ')') depth--;
        }
        if (!depth) {
          result += '<sup>' + compoundPowers(text.slice(i + 2, end - 1)) + '</sup>';
          i = end - 1;
          continue;
        }
      }
      result += text[i];
    }
    return result;
  }
  return compoundRoots(compoundPowers(String(value)))
    // В записи √14v под корнем находится только 14: буква v — множитель.
    // Несоставное подкоренное выражение с переменной пишется как √x,
    // а составное всегда заключаем в скобки: √(x+y).
    .replace(/√(\d+(?:[.,]\d+)?|[A-Za-zА-Яа-яα-ωΑ-Ω](?:[₀-₉]+|_[A-Za-zА-Яа-яα-ωΑ-Ω0-9]+)?)/gu, '<span class="math-root">√<span class="math-radicand">$1</span></span>')
    .replace(/→([A-Za-zА-Яа-яα-ωΑ-Ω][A-Za-zА-Яа-яα-ωΑ-Ω0-9₀-₉]*)/gu, '<span class="math-vector">$1</span>')
    .replace(/([A-Za-zА-Яа-яα-ωΑ-Ωℰ])_([A-Za-zА-Яа-яα-ωΑ-Ω0-9]+)/gu, '$1<sub>$2</sub>')
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
  <meta property="og:site_name" content="ЕГЭ и ОГЭ ФИПИ — математика и физика">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(url)}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  ${renderStructuredData(structuredData)}`;
}

function normalizeFipiHtml(html, assetPrefix = '/fipi/', expandFences = false) {
  const normalized = String(html)
    .replace(/<script[^>]+src=["'][^"']*mathjax[^"']*["'][^>]*><\/script>/gi, '')
    .replace(/<script[^>]+src=["'][^"']*mml-chtml\.js[^"']*["'][^>]*><\/script>/gi, '')
    .replaceAll('<m:', '<')
    .replaceAll('</m:', '</');
  return (expandFences ? expandMathmlFences(normalized) : normalized)
    .replace(/<math\b[^>]*>[\s\S]*?<\/math>/gi, formula => `<span class="fipi-math-scroll">${formula}</span>`)
    .replace(/((?:src|href)=["'])\.\.\/\.\.\//gi, `$1${assetPrefix}`)
    .replace(/((?:src|href)=["'])(\/fipi\/(?:oge\/|oge-physics\/)?(?:styles\.css|xmodules\/os\/img\/_styles\.css|lib\/t3utils\.js))(?:\?[^"']*)?(["'])/gi,
      (_, prefix, url, suffix) => `${prefix}${sharedFipiAssetUrl(url)}${suffix}`)
    .replaceAll('var home_directory="../../";', `var home_directory="${assetPrefix}";`)
    .replaceAll("var qfiles_location='../../';", `var qfiles_location='${assetPrefix}';`)
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
  if (!TURNSTILE_ENABLED) return { ok: true };
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
  if (!TURNSTILE_ENABLED) return '';
  if (!TURNSTILE_SITE_KEY) return '<p class="turnstile-error" role="alert">Проверка формы временно недоступна. Попробуйте позже.</p>';
  return `<div class="turnstile-field" data-turnstile-widget data-turnstile-sitekey="${escapeHtml(TURNSTILE_SITE_KEY)}"></div>`;
}

function renderTurnstileScript() {
  if (!TURNSTILE_ENABLED || !TURNSTILE_SITE_KEY) return '';
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

function renderAdminShell(title, content, privateData = false) {
  return `<!doctype html>
<html lang="ru">
<head>
  ${privateData ? '' : YANDEX_METRIKA_HEAD}
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
  ${privateData ? '' : YANDEX_METRIKA_NOSCRIPT}
  <main>
    <div class="top">
      <a href="/admin">Управление решениями</a>
      <a href="/admin/leads">Заявки</a>
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
      <p class="muted">Для физики ОГЭ используйте идентификатор из адреса страницы, например <code>OGEPHYS4D1B4F</code>. Короткий номер ФИПИ может совпадать с номером другой задачи.</p>
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
      <p class="muted">Единый формат для всех задач: дроби — <code>⟦числитель¦знаменатель⟧</code>, без <code>/</code>; для составного выражения под корнем используйте <code>√(…)</code>; вектора в пространстве записывайте тремя координатами. Перед публикацией сверьте условие, ответ и ключевые вычисления с «Решу ЕГЭ» или «Решу ОГЭ» для соответствующего экзамена; при расхождении первичен ФИПИ.</p>
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
  <title>${escapeHtml(title)} — ЕГЭ и ОГЭ ФИПИ</title>
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
  ${UI_HEAD}
</head>
<body class="account-page">
  ${YANDEX_METRIKA_NOSCRIPT}
  ${renderSiteHeader()}
  <main>
    <nav class="top" aria-label="Навигация"><a href="/ege">ЕГЭ — все предметы</a>${accountLink}</nav>
    ${content}
    ${renderSiteFooter()}
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
      <h2>Обращения через форму</h2>
      <p>Для ответа на обращение сохраняются имя, указанный контакт, экзамен, предмет, текст вопроса и время согласия на обработку данных. Эти сведения доступны администратору сайта и не публикуются. Обращение также направляется администратору через Telegram. Контакт используется для ответа на ваше обращение.</p>
      <p>Чтобы исправить или удалить обращение, напишите через эту же форму и укажите контакт из первоначального обращения.</p>
      <h2>Личный кабинет</h2>
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

function renderCommentsWidget({ inlineOnMobile = false } = {}) {
  return `<aside class="comments-widget${inlineOnMobile ? ' comments-widget-inline-mobile' : ''}" aria-label="Комментарии сайта">
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
        .comments-widget.comments-widget-inline-mobile { position: relative; right: auto; bottom: auto; display: flex; justify-content: flex-end; margin: 0 0 12px; }
        .comments-widget-inline-mobile .comments-widget-panel { top: calc(100% + 10px); bottom: auto; width: min(390px, 100%); box-sizing: border-box; }
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
  if (sourceEntriesCache.has(html)) return sourceEntriesCache.get(html);
  const starts = Array.from(html.matchAll(/<div\s+class=['"][^'"]*\bqblock\b[^'"]*['"]\s+id=['"]q([A-Z0-9]+)['"][^>]*>/gi));
  const bodyEnd = html.search(/<\/body\s*>/i);
  const lastEnd = bodyEnd >= 0 ? bodyEnd : html.length;
  const entries = starts.map((match, index) => {
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
      contentHtml,
      codes: Array.from(metaHtml.matchAll(/<div>\s*([1-7](?:\.\d+)*)\s/gi), match => match[1]),
      answerType: (metaHtml.match(/Тип ответа:<\/td><td>([^<]+)/)?.[1] || '').trim(),
      text: cleanPlainText(contentHtml).toLocaleLowerCase('ru-RU'),
      meta: cleanPlainText(metaHtml).toLocaleLowerCase('ru-RU')
    };
  });
  if (sourceEntriesCache.size >= 40) sourceEntriesCache.delete(sourceEntriesCache.keys().next().value);
  sourceEntriesCache.set(html, entries);
  return entries;
}

const MATH_TOPIC_CODES = new Set(MATH_TOPICS.flatMap(group => group.children.map(([code]) => code)));

function mathTaskTopicCodes(task) {
  return Array.from(new Set((task.meta.match(/\b[1-7]\.\d+(?:\.\d+)*\b/g) || [])
    .filter(code => MATH_TOPIC_CODES.has(code))));
}

function mathTaskMatchesTopic(task, topicCode) {
  if (!isFirstPartMathTask(task)) return false;
  if (topicCode === 'all') return true;
  if (mathTaskTypeInfo(topicCode)) {
    const type = mathTaskType(task);
    return type.code === topicCode || type.group === topicCode;
  }
  const codes = mathTaskTopicCodes(task);
  if (/^[1-7]$/.test(topicCode)) return codes.some(code => code.startsWith(`${topicCode}.`));
  return codes.includes(topicCode);
}

function mathTopicStats(html) {
  if (mathStatsCache.has(html)) return mathStatsCache.get(html);
  const tasks = sourceTaskEntries(html).filter(isFirstPartMathTask);
  const counts = Object.fromEntries([...MATH_TOPICS, ...MATH_TASK_TYPES].flatMap(group => [
    [group.code, 0],
    ...group.children.map(([code]) => [code, 0])
  ]));
  counts.other = 0;
  for (const task of tasks) {
    const type = mathTaskType(task);
    counts[type.code] += 1;
    if (type.group && type.group !== type.code) counts[type.group] += 1;
    const codes = mathTaskTopicCodes(task);
    for (const group of MATH_TOPICS) {
      if (codes.some(code => code.startsWith(`${group.code}.`))) counts[group.code] += 1;
      for (const [code] of group.children) {
        if (codes.includes(code)) counts[code] += 1;
      }
    }
  }
  const stats = {total: tasks.length, counts};
  mathStatsCache.set(html, stats);
  return stats;
}

function filterMathTopicHtml(html, topicCode) {
  const tasks = sourceTaskEntries(html);
  if (!tasks.length) return html;
  const prefix = html.slice(0, tasks[0].start);
  const suffix = html.slice(tasks[tasks.length - 1].end);
  const selected = topicCode
    ? tasks.filter(task => mathTaskMatchesTopic(task, topicCode))
    : [];
  if (topicCode === 'all') {
    const order = new Map(MATH_TASK_TYPES.map((group, index) => [group.code, index]));
    const rank = task => order.get(mathTaskType(task)?.group) ?? MATH_TASK_TYPES.length;
    selected.sort((left, right) => rank(left) - rank(right));
  }
  return `${prefix}${selected.map(task => task.fragment).join('')}${suffix}`;
}

function taskMatchesPhysicsCatalogTopic(task, topicCode, part = 1) {
  if (physicsTaskPart(task) !== part) return false;
  if (topicCode === 'all') return true;
  if (part === 1 && physicsTaskTypeInfo(topicCode)) return firstPartPhysicsMatches(task, topicCode);
  const classification = physicsClassification(task);
  if (topicCode === 'unclassified') return classification.topicCodes.length === 0;
  return taskMatchesTopic(task, topicCode);
}

function isNumberPropertiesTask(text) {
  const numberTopic = /натуральн|цел(?:ое|ых|ые|ыми)|делит|кратн|прост(?:ое|ых|ые)|остат|цифр|числ|дроб/.test(text);
  const unrelated = /кредит|банк|вклад|рубл|заём|прибыл|производств|пирами|призм|тетраэдр/.test(text);
  return numberTopic && !unrelated;
}

function isSectionTaskRelevant(section, task) {
  if (MATH_SECTIONS.includes(section)) {
    if (isFirstPartMathTask(task)) return false;
    const assignment = mathTaskAssignment(task);
    if (assignment?.part === 2) return assignment.type === section;
  }
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

function filterSectionHtml(html, section, options = {}) {
  const tasks = sourceTaskEntries(html);
  if (!tasks.length) return html;
  const prefix = html.slice(0, tasks[0].start);
  const suffix = html.slice(tasks[tasks.length - 1].end);
  const selectedIds = new Set();
  const selected = tasks.filter(task => {
    if (!isSectionTaskRelevant(section, task) || selectedIds.has(task.id)) return false;
    if (section === 'physics' && options.physicsPart && physicsTaskPart(task) !== options.physicsPart) return false;
    if (section === 'physics' && options.physicsTopic && !taskMatchesPhysicsCatalogTopic(task, options.physicsTopic, options.physicsPart || 1)) return false;
    if (options.allowedIds && !options.allowedIds.has(task.id)) return false;
    selectedIds.add(task.id);
    return true;
  });
  return `${prefix}${selected.map(task => task.fragment).join('')}${suffix}`;
}

let physicsCatalogSource = null;
let physicsCatalogData = null;
function physicsCatalog(html) {
  if (html !== physicsCatalogSource) {
    const tasks = sourceTaskEntries(html);
    const first = tasks.filter(task => physicsTaskPart(task) === 1), second = tasks.filter(task => physicsTaskPart(task) === 2);
    const secondTopics = PHYSICS_TOPICS.flatMap(group => [{code: group.code, name: group.name}, ...group.children.map(([code, name]) => ({code, name}))]);
    const topics = PHYSICS_TASK_TYPES.flatMap(group => [physicsTaskTypeInfo(group.code), ...group.children.map(([code]) => physicsTaskTypeInfo(code))]);
    const counts = Object.fromEntries([...topics, ...secondTopics, {code: 'other'}, {code: 'unclassified'}, {code: 'all'}].map(topic => [topic.code, first.filter(task => taskMatchesPhysicsCatalogTopic(task, topic.code)).length]));
    const secondCounts = Object.fromEntries([...secondTopics, {code: 'unclassified'}, {code: 'all'}].map(topic => [topic.code, second.filter(task => taskMatchesPhysicsCatalogTopic(task, topic.code, 2)).length]));
    physicsCatalogData = {tasks, topics, counts, total: first.length, unclassified: counts.unclassified,
      secondTopics, secondCounts, secondTotal: second.length};
    physicsCatalogSource = html;
  }
  return physicsCatalogData;
}

function breadcrumbData(items) {
  return {'@type': 'BreadcrumbList', itemListElement: items.map((item, index) => ({
    '@type': 'ListItem', position: index + 1, name: item.name, item: absoluteUrl(item.path)
  }))};
}

function renderBreadcrumbs(items) {
  return `<nav class="seo-breadcrumbs" aria-label="Хлебные крошки"><ol>${items.map((item, index) =>
    `<li>${index === items.length - 1 ? `<span aria-current="page">${escapeHtml(item.name)}</span>` : `<a href="${escapeHtml(item.path)}">${escapeHtml(item.name)}</a>`}</li>`
  ).join('')}</ol></nav>`;
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
  const ogeConfig = Object.hasOwn(OGE_BANKS, section) ? ogeBank(section) : null;
  const isOge = Boolean(ogeConfig);
  const isMathematics = section === 'mathematics';
  const isStereometry = section === 'stereometry';
  const isPlane = section === 'planimetry';
  const isParameters = section === 'parameters';
  const isEquations = section === 'equations';
  const isInequalities = section === 'inequalities';
  const isOptimal = section === 'optimal';
  const isNumbers = section === 'numbers';
  const isFinance = section === 'finance';
  const isPhysics = section === 'physics';
  const isSearch = Boolean(seoOverride?.isSearch);
  const mathTopic = isMathematics ? mathTopicInfo(seoOverride?.mathTopic) : null;
  const mathStats = seoOverride?.mathStats || { total: 0, counts: {} };
  const isMathCatalogue = Boolean(seoOverride?.mathCatalogue);
  const isSelectedMathCatalogue = isMathematics && isMathCatalogue && Boolean(mathTopic) && !onlyAdded;
  const physicsPart = isPhysics && seoOverride?.physicsPart === 2 ? 2 : 1;
  const physicsPartName = physicsPart === 2 ? 'вторая' : 'первая';
  const physicsBasePath = physicsPart === 2 ? '/physics/part-2' : '/physics';
  const physicsTopic = isPhysics ? catalogPhysicsTopicInfo(seoOverride?.physicsTopic, physicsPart) : null;
  const physicsStats = seoOverride?.physicsStats || {
    total: seoOverride?.physicsTotal || 0,
    counts: seoOverride?.physicsCounts || {},
    unclassified: seoOverride?.physicsUnclassified || 0
  };
  const isPhysicsCatalogue = Boolean(seoOverride?.physicsCatalogue);
  const isSelectedPhysicsCatalogue = isPhysics && isPhysicsCatalogue && (physicsTopic || physicsPart === 2) && !onlyAdded;
  const { name: baseTitle, path: sectionPath, description: sectionDescription } = sectionInfo(section);
  const visibleIds = new Set(Array.from(taskIds(html), normalizeTaskId));
  const publishedSolutionIds = listPublishedSolutionIds.all().map(record => record.task_id).filter(id => visibleIds.has(id));
  const taskIdFromPath = seoOverride?.pathname?.match(/^\/tasks\/([A-Z0-9]+)$/i)?.[1] || '';
  const hasTaskSolution = taskIdFromPath && publishedSolutionIds.includes(taskIdFromPath);
  const taskNavigation = seoOverride?.taskNavigation || null;
  const catalogue = seoOverride?.catalogue || null;
  const useCataloguePager = !seoOverride?.disableCataloguePager
    && !(isMathematics && isMathCatalogue && !mathTopic && !onlyAdded)
    && !(isPhysics && isPhysicsCatalogue && !physicsTopic && physicsPart === 1 && !onlyAdded);
  const title = isOge ? `${ogeConfig.name}: задания ФИПИ` : onlyAdded ? `Добавленные задачи — ${baseTitle.toLowerCase()}` : (isMathematics
    ? (mathTopic?.code === 'all'
      ? 'Первая часть ЕГЭ по математике — все задания'
      : (mathTopic ? `${mathTopic.name} — первая часть ЕГЭ по математике` : 'Первая часть ЕГЭ по математике — каталог по типам'))
    : (isPhysics
    ? (physicsTopic?.code === 'all'
      ? `Все задания ЕГЭ по физике — ${physicsPartName} часть`
      : (physicsTopic ? `${physicsTopic.name} — ${physicsPartName} часть ЕГЭ по физике` : `ЕГЭ по физике — ${physicsPartName} часть`))
    : `${baseTitle} — задания второй части`));
  const subtitle = isOge
    ? `ФИПИ · ОГЭ · все форматы ответа · ${seoOverride?.ogeStats?.total || 0} заданий`
    : isSearch
    ? 'Поиск по номеру и тексту условий открытого банка ФИПИ'
    : taskIdFromPath ? 'Открытый банк ФИПИ · условие и решение задания'
    : (isMathematics
    ? (mathTopic && mathTopic.code !== 'all'
      ? `ФИПИ · первая часть · краткий ответ · ${mathStats.counts[mathTopic.code] || 0} заданий`
      : `ФИПИ · первая часть · краткий ответ · ${mathStats.total || 0} заданий`)
    : (isPhysics
    ? (physicsTopic && physicsTopic.code !== 'all'
      ? `ФИПИ · ${physicsPartName} часть · ${physicsStats.counts[physicsTopic.code] || 0} заданий`
      : `ФИПИ · ${physicsPartName} часть · ${physicsPart === 2 ? 'развёрнутый ответ' : 'краткие ответы, выбор и соответствия'} · ${physicsStats.total || 0} заданий`)
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
      : 'ФИПИ · темы 7.2–7.5 · развёрнутый ответ · проверенная подборка')))))))));
  const fixed = normalizeFipiHtml(isPhysics ? restorePhysicsFigures(html) : section === 'oge-physics' ? restoreOgePhysicsFigures(html) : html, isOge ? ogeConfig.assetPrefix : '/fipi/', section === 'oge')
    .replace(/<html(?![^>]*\blang=)([^>]*)>/i, '<html lang="ru"$1>')
    .replace(/(<div class="id-text">[\s\S]*?<span class="canselect">)([A-Z0-9]{4,32})(<\/span>)/gi,
      (_, before, id, after) => `${before}<a class="task-permalink" href="/tasks/${isOge ? ogePublicTaskId(id, section) : normalizeTaskId(id)}">${normalizeTaskId(id)}</a>${after}`);

  const localStyle = `<link rel="stylesheet" href="${assetUrl(`catalogue-${isOge ? section : isPhysics ? 'physics' : 'math'}.css`)}">`;
  // A single task is already server rendered; reading it must not wait for controls.
  const loadingGuard = `<script>${useCataloguePager && !taskIdFromPath ? `document.documentElement.classList.add('page-loading'${onlyAdded ? ", 'added-loading'" : ''});` : ''}
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
  const cataloguePathname = isMathematics && isMathCatalogue && mathTopic
    ? `/?topic=${encodeURIComponent(mathTopic.code)}`
    : (isPhysics && isPhysicsCatalogue && physicsTopic
      ? `${physicsBasePath}?topic=${encodeURIComponent(physicsTopic.code)}`
      : sectionPath);
  const pageDescription = seoOverride?.description || (onlyAdded
    ? `Новые задания раздела «${baseTitle}» из открытого банка ФИПИ.`
    : (isMathematics && mathTopic && mathTopic.code !== 'all'
      ? truncateText(`Задания первой части ЕГЭ по профильной математике: «${mathTopic.name}». Краткие ответы и подробные решения задач ФИПИ.`, 250)
      : (isPhysics && physicsTopic && physicsTopic.code !== 'all'
        ? truncateText(`${physicsTopic.name}: ${physicsPartName} часть ЕГЭ по физике из открытого банка ФИПИ.`, 250)
        : sectionDescription)));
  const seoPathname = seoOverride?.pathname || cataloguePathname;
  const pageSeo = renderSeoMetadata({
    title: documentTitle,
    description: pageDescription,
    pathname: seoPathname,
    robots: onlyAdded ? 'noindex,follow' : 'index,follow',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      description: pageDescription,
      url: absoluteUrl(seoPathname),
      inLanguage: 'ru',
      isPartOf: { '@type': 'WebSite', name: 'ЕГЭ и ОГЭ ФИПИ — математика и физика', url: SITE_ORIGIN }
    },
    ...seoOverride
  });
  const viewportMeta = /<meta\s+[^>]*name=["']viewport["']/i.test(fixed)
    ? ''
    : '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">';
  const headerTitle = seoOverride?.heading || title;
  const isLandingCatalogue = !onlyAdded && !isSearch && (
    (isMathematics && isMathCatalogue && !mathTopic)
    || (isPhysics && isPhysicsCatalogue && physicsPart === 1 && !physicsTopic));
  const uiSubject = isOge ? section : isPhysics ? 'physics' : 'math';
  const header = renderSiteHeader({subject: isSearch ? '' : uiSubject, pathname: seoPathname, searchQuery: seoOverride?.searchQuery,
    searchPath: isOge ? ogeConfig.path : '/search', searchTopic: isOge ? 'all' : ''});
  const pageHeading = isLandingCatalogue ? renderStudyHero({subject: uiSubject,
    solved: seoOverride?.catalogueSolved || 0, types: isPhysics ? PHYSICS_TASK_TYPES.length : MATH_TASK_TYPES.length,
    sampleAnswer: getPublishedSolution.get(isPhysics ? '8A3445' : '6D1598')?.answer || ''}) + renderSiteAd() + renderStudyBenefits()
    : `<section class="page-heading"><h1>${escapeHtml(headerTitle)}</h1><p>${escapeHtml(subtitle)}</p>
      ${isSelectedMathCatalogue || isSelectedPhysicsCatalogue || hasTaskSolution || taskIdFromPath ? `<div class="page-heading-actions">
        ${isSelectedMathCatalogue || isSelectedPhysicsCatalogue ? '<a class="catalogue-task-jump" href="#tasks">Начать решать ↓</a>' : ''}
        ${hasTaskSolution ? `<a class="task-solution-jump" href="#solution-${escapeHtml(taskIdFromPath)}">Открыть решение ↓</a>` : ''}
        ${taskIdFromPath ? `<a class="task-feedback-jump" href="#feedback" data-feedback-modal-open data-task-id="${escapeHtml(taskIdFromPath)}">Ошибка или пожелание</a>` : ''}
      </div>` : ''}</section>${isSearch ? '' : renderSiteAd()}`;
  const taskPager = renderTaskNavigation(taskNavigation);
  const physicsTopicMenu = isPhysics && isPhysicsCatalogue && !onlyAdded && !isSearch
    ? (physicsPart === 2 ? renderPhysicsSecondPartMenu(physicsTopic?.code || '', physicsStats.counts, physicsStats.total, physicsStats.unclassified)
      : renderPhysicsTopicMenu(physicsTopic?.code || '', physicsStats.counts, physicsStats.total))
    : '';
  const mathTopicMenu = isMathematics && isMathCatalogue && !onlyAdded
    ? renderMathTopicMenu(mathTopic?.code || '', mathStats.counts, mathStats.total)
    : '';
  const pagerScript = useCataloguePager ? `<script id="catalogue-config" type="application/json">${JSON.stringify({
    isSingleTaskPage: Boolean(taskIdFromPath),
    publishedSolutionIds: publishedSolutionIds,
    emptyCatalogueMessage: catalogue?.query ? 'По вашему запросу заданий не найдено. Измените слова или вернитесь ко всей подборке.' : onlyAdded
      ? 'Новых задач после последнего обновления нет.'
      : 'По выбранной теме заданий в банке ФИПИ пока нет.',
    maxCommentLength: MAX_COMMENT_LENGTH,
    nextTaskId: taskNavigation?.next || '',
    ogeMath: section === 'oge',
    serverCatalogue: Boolean(seoOverride?.serverCatalogue),
    ogeNavigation: seoOverride?.ogeNavigation || null,
    ogeSection: isOge ? section : '',
    ogeHubPath: isOge ? ogeConfig.path : ''
  }).replace(/</g, '\\u003c')}</script>` : '';
  const banner = renderStudyRequest(isOge ? 'ОГЭ' : 'ЕГЭ', section === 'physics' || section === 'oge-physics' ? 'физика' : 'математика');
  return fixed
    .replace(/<head([^>]*)>/i, `<head$1>${YANDEX_METRIKA_HEAD}${viewportMeta}`)
    .replace(/<link\b(?=[^>]*\brel\s*=\s*["'](?:shortcut\s+)?icon["'])[^>]*>\s*/gi, '')
    .replace(/<title>[\s\S]*?<\/title>/i, pageTitle)
    .replace('</head>', `${loadingGuard}${localStyle}${pageSeo}${UI_HEAD}${useCataloguePager ? `<script defer src="${assetUrl('catalogue.js')}"></script>` : ''}</head>`)
    .replace(/<body([^>]*)>/i, `<body$1>${YANDEX_METRIKA_NOSCRIPT}${header}${seoOverride?.breadcrumbs ? renderBreadcrumbs(seoOverride.breadcrumbs) : ''}${pageHeading}${taskPager}${isLandingCatalogue ? renderSubjectSwitch(uiSubject) : ''}${mathTopicMenu}${physicsTopicMenu}${isLandingCatalogue ? '' : seoOverride?.intro || ''}${catalogue && !catalogue.total ? `<div id="tasks"></div>${renderCataloguePages(catalogue, 'top')}` : ''}${!isLandingCatalogue && !isSearch ? renderCommentsWidget({ inlineOnMobile: section === 'oge' }) : ''}${renderFeedbackModal()}`)
    .replace(/<div\s+class=['"][^'"]*\bqblock\b[^'"]*['"][^>]*>/i, match =>
      `${catalogue || isSelectedMathCatalogue || isSelectedPhysicsCatalogue ? `<div id="tasks" class="catalogue-task-start">${renderCataloguePages(catalogue, 'top')}</div>` : ''}${match}`)
    .replace('</body>', `${isLandingCatalogue ? renderStudyGuide({subject: uiSubject}) + renderStudyFaq() : ''}${!taskIdFromPath ? banner : ''}${renderCataloguePages(catalogue, 'bottom')}<div id="site-end"></div>${renderSiteFooter()}${catalogue ? `<script id="catalogue-data" type="application/json">${JSON.stringify(catalogue).replace(/</g, '\\u003c')}</script>` : ''}${pagerScript}${renderTurnstileScript()}</body>`);
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
  } else if (section === 'physics' || section === 'mathematics' || Object.hasOwn(OGE_BANKS, section)) {
    const filenames = await sourceFilenames(section);
    const parts = await Promise.all(filenames.map(filename => fs.readFile(path.join(__dirname, filename))));
    const decoded = parts.map(bytes => {
      const decodedHtml = new TextDecoder('windows-1251').decode(bytes);
      return Object.hasOwn(OGE_BANKS, section) ? normalizeOgeSourceHtml(decodedHtml, section) : decodedHtml;
    });
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
  if (['parameters', 'inequalities', 'numbers'].includes(section)) {
    const existing = new Set(Array.from(taskIds(html), normalizeTaskId));
    const extra = sourceTaskEntries(await loadSourceHtml('mathematics')).filter(task => {
      const assignment = mathTaskAssignment(task);
      return assignment?.part === 2 && assignment.type === section && !existing.has(task.id);
    });
    html = html.replace('</body>', `${extra.map(task => task.fragment).join('')}</body>`);
  }
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

const ogeCatalogCache = new Map();
function ogeCatalog(html, section = 'oge') {
  if (ogeCatalogCache.get(section)?.source !== html) {
    const tasks = sourceTaskEntries(html).map(task => ({ ...task, sourceId: ogeSourceTaskId(task.id, section), ogeCodes: ogeTaskCodes(task), condition: conditionText(task.fragment) }));
    ogeCatalogCache.set(section, { source: html, data: { tasks, byId: new Map(tasks.map(task => [task.id, task])), ...ogeTopicStats(tasks, section) } });
  }
  return ogeCatalogCache.get(section).data;
}

function renderOgeTopicMenu(activeCode, stats, section = 'oge') {
  const bank = ogeBank(section);
  const link = (code, name, className = '') => {
    const count = stats.counts[code] || 0;
    return count
      ? `<a class="${className} ${activeCode === code ? 'active' : ''}" href="${ogeCataloguePath({ topic: code, section })}">${escapeHtml(name)} <span class="math-topic-count">${count}</span></a>`
      : `<span class="${className} disabled" aria-disabled="true">${escapeHtml(name)} <span class="math-topic-count">0</span></span>`;
  };
  return `<section class="math-topics" aria-labelledby="oge-topics-title">
    <div class="math-topics-heading"><div><h2 id="oge-topics-title">Каталог заданий ОГЭ</h2><p>Выберите раздел или тему для подготовки.</p></div>
    <a class="math-all-link ${activeCode === 'all' ? 'active' : ''}" href="${bank.path}?topic=all">Все задания <span>${stats.total}</span></a></div>
    ${stats.counts.practical ? `<p>${link('practical', ogeTopicInfo('practical', section).name)}</p>` : ''}
    <div class="math-topic-grid">${bank.topics.map(group => `<details class="math-topic-group" ${activeCode === group.code || activeCode.startsWith(`${group.code}.`) ? 'open' : ''}>
      <summary><span>${/^\d+$/.test(group.code) ? group.code + ". " : ""}${escapeHtml(group.name)}</span><span class="math-topic-count">${stats.counts[group.code] || 0}</span></summary>
      <div class="math-topic-children">${link(group.code, 'Все задания раздела', 'math-topic-major')}${group.children.map(([code, name]) => link(code, `${/^\d/.test(code) ? code + " " : ""}${name}`)).join('')}</div>
    </details>`).join('')}</div>
    ${stats.counts.unclassified ? link('unclassified', 'Без указанной темы КЭС') : ''}
  </section>`;
}

function renderOgePager({ topic, page, query, added: onlyAdded, total, section = 'oge' }) {
  const pages = Math.max(1, Math.ceil(total / OGE_PAGE_SIZE));
  const url = number => escapeHtml(ogeCataloguePath({ topic, page: number, query, added: onlyAdded, section }));
  const numbers = [...new Set([1, page - 1, page, page + 1, pages])].filter(number => number >= 1 && number <= pages).sort((a, b) => a - b);
  const forwardAttributes = number => number > page ? ` data-analytics-catalogue-page-next="${number}" data-analytics-section="${escapeHtml(section)}"` : '';
  return `<nav class="local-pager oge-pager" aria-label="Страницы каталога ОГЭ">
    ${page > 1 ? `<a rel="prev" href="${url(page - 1)}">← Назад</a>` : '<span>← Назад</span>'}
    ${numbers.map(number => number === page ? `<span aria-current="page">${number}</span>` : `<a href="${url(number)}"${forwardAttributes(number)}>${number}</a>`).join('')}
    ${page < pages ? `<a rel="next" href="${url(page + 1)}"${forwardAttributes(page + 1)}>Вперёд →</a>` : '<span>Вперёд →</span>'}
    <span class="local-page-label">Страница ${page} из ${pages} · заданий: ${total}</span>
  </nav>`;
}

async function loadOgeQuestions(onlyAdded, options = {}, section = 'oge') {
  const bank = ogeBank(section);
  const sourceHtml = await loadSourceHtml(section);
  const catalog = ogeCatalog(sourceHtml, section);
  const query = normalizeSearchQuery(options.query);
  const topicCode = options.ogeTopic || (query ? 'all' : '');
  const topic = ogeTopicInfo(topicCode, section);
  const page = options.page || 1;
  let selected = onlyAdded ? catalog.tasks.filter(task => added[section].includes(task.id))
    : topicCode ? catalog.tasks.filter(task => ogeTaskMatchesTopic(task, topicCode, section)) : [];
  if (query) {
    const terms = query.toLocaleLowerCase('ru-RU').split(/\s+/).filter(Boolean);
    selected = selected.filter(task => terms.every(term => `${task.id} ${task.sourceId} ${task.condition}`.toLocaleLowerCase('ru-RU').includes(term)));
  }
  const pages = Math.max(1, Math.ceil(selected.length / OGE_PAGE_SIZE));
  if (page > pages || (!onlyAdded && !topicCode && page !== 1)) return null;
  const visible = selected.slice((page - 1) * OGE_PAGE_SIZE, page * OGE_PAGE_SIZE);
  const baseName = onlyAdded ? `Добавленные задания ОГЭ по ${bank.subject}` : topic ? `${topic.name} — ОГЭ по ${bank.subject}` : `ОГЭ по ${bank.subject} — банк заданий ФИПИ`;
  const title = `${baseName}${page > 1 ? ` — страница ${page}` : ''}${query ? ` — поиск: ${query}` : ''}`;
  const pathname = ogeCataloguePath({ topic: topicCode, page, query, added: onlyAdded, section });
  const breadcrumbs = [{ name: 'Главная', path: '/' }, { name: bank.name, path: bank.path }];
  if (topic) breadcrumbs.push({ name: topic.name, path: ogeCataloguePath({ topic: topicCode, section }) });
  const description = `${baseName}. ${topic || onlyAdded ? selected.length : catalog.total} заданий из открытого банка ФИПИ для подготовки в 9 классе.${page > 1 ? ` Страница ${page} из ${pages}.` : ''}`;
  const pager = topic || onlyAdded ? renderOgePager({ topic: topicCode, page, query, added: onlyAdded, total: selected.length, section }) : '';
  const html = taskDocument(sourceHtml, visible.map(task => task.fragment).join(''));
  const queryForm = topic || onlyAdded ? `<form class="site-search-form" action="${onlyAdded ? '/added' : bank.path}" method="get" role="search">
    ${onlyAdded ? `<input type="hidden" name="section" value="${section}">` : ''}${topic ? `<input type="hidden" name="topic" value="${escapeHtml(topicCode)}">` : ''}
    <label class="visually-hidden" for="oge-query">Поиск в подборке ОГЭ</label><input id="oge-query" name="q" type="search" value="${escapeHtml(query)}" placeholder="Поиск в этой подборке по номеру или условию"><button type="submit">Найти в подборке</button>
  </form>` : '';
  const result = decorate(html, section, onlyAdded ? added[section] : null, {
    title, heading: title, description, pathname, breadcrumbs,
    ogeStats: catalog, serverCatalogue: true, disableCataloguePager: !topic && !onlyAdded,
    ogeNavigation: ogeTaskNavigation(selected, {topic: topicCode, page, query, added: onlyAdded, section}),
    robots: query || onlyAdded || (topic && !selected.length) ? 'noindex,follow' : 'index,follow',
    intro: `${onlyAdded ? '' : topic ? `<details class="oge-topic-switcher"><summary>Выбрать другую тему</summary>${renderOgeTopicMenu(topicCode, catalog, section)}</details>` : renderOgeTopicMenu(topicCode, catalog, section)}<section class="catalog-summary"><p>${escapeHtml(description)}</p>
      ${!topic && !onlyAdded ? `<p>Условия и рисунки сохранены из <a href="${OGE_ORIGIN}/bank/index.php?proj=${bank.project}" target="_blank" rel="noopener noreferrer">открытого банка ФИПИ</a>. Выберите тему или откройте все задания.</p>` : ''}</section>${queryForm}${pager}
      <style>.oge-pager a { padding: 7px 11px; border: 1px solid #b8c8da; border-radius: 5px; color: #1769aa; background: white; text-decoration: none; }.oge-pager [aria-current] { padding: 7px 11px; border-radius: 5px; background: #1769aa; color: white; }</style>`,
    structuredData: { '@context': 'https://schema.org', '@graph': [
      { '@type': 'CollectionPage', name: title, description, url: absoluteUrl(pathname), inLanguage: 'ru',
        mainEntity: { '@type': 'ItemList', numberOfItems: selected.length, itemListElement: visible.map((task, index) => ({
          '@type': 'ListItem', position: (page - 1) * OGE_PAGE_SIZE + index + 1, name: `Задание ${task.sourceId}`, url: absoluteUrl(`/tasks/${task.id}`)
        })) } }, breadcrumbData(breadcrumbs)
    ] }
  });
  return result.replace('</body>', `${pager}</body>`);
}

function renderCatalogueGuide(section, topicCode, fallback) {
  const guide = catalogueGuides[`${section === 'mathematics' ? 'math' : section}:${topicCode}`];
  if (!guide) return `<section class="catalog-summary"><p>${escapeHtml(fallback)}</p></section>`;
  return `<section class="catalog-summary catalogue-guide"><p>${escapeHtml(guide.intro)}</p>
    <details><summary>Как решать задания этой темы</summary><ol>${guide.steps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ol></details>
    <nav aria-label="Связанные темы">${guide.links.map(([name, href]) => `<a href="${escapeHtml(href)}">${escapeHtml(name)}</a>`).join('')}</nav></section>`;
}

function renderCatalogueSearch(basePath, query, total) {
  const url = new URL(basePath, SITE_ORIGIN);
  return `<form class="catalogue-search" action="${escapeHtml(url.pathname)}#tasks" method="get" role="search">
    ${[...url.searchParams].map(([key, value]) => `<input type="hidden" name="${escapeHtml(key)}" value="${escapeHtml(value)}">`).join('')}
    <label for="catalogue-query">Найти задание в этой подборке</label>
    <div><input id="catalogue-query" name="q" type="search" maxlength="80" value="${escapeHtml(query)}" placeholder="Номер ФИПИ или слова из условия"><button type="submit">Найти</button></div>
    ${query ? `<p>Найдено: ${total}. <a href="${escapeHtml(basePath)}#tasks">Показать всю подборку</a></p>` : ''}
  </form>`;
}

function renderCataloguePages(config, position) {
  if (!config) return '';
  const {page, totalPages, total, offset, pageSize, basePath, query} = config;
  const href = n => escapeHtml(catalogueUrl(basePath, {page: n, query}) + '#tasks');
  const numbers = cataloguePageNumbers(page, totalPages).map(n => `<a href="${href(n)}"${n === page ? ' aria-current="page" class="active"' : ''}>${n}</a>`).join('');
  return `<nav id="local-pager-${position}" class="local-pager local-pager--${position}" aria-label="Страницы подборки">
    ${page > 1 ? `<a href="${href(page - 1)}" rel="prev">← Назад</a>` : ''}${numbers}
    ${page < totalPages ? `<a href="${href(page + 1)}" rel="next">Вперёд →</a>` : ''}
    <span class="local-page-label">${total ? `Задания ${offset + 1}–${Math.min(offset + pageSize, total)} из ${total}` : 'Заданий не найдено'}</span>
  </nav>`;
}

async function loadQuestions(section, onlyAdded = false, options = {}) {
  if (Object.hasOwn(OGE_BANKS, section)) return loadOgeQuestions(onlyAdded, options, section);
  const physicsPart = section === 'physics' && options.physicsPart === 2 ? 2 : 1;
  const physicsBasePath = physicsPart === 2 ? '/physics/part-2' : '/physics';
  const physicsPartName = physicsPart === 2 ? 'второй' : 'первой';
  const physicsTopic = section === 'physics' ? catalogPhysicsTopicInfo(options.physicsTopic, physicsPart)?.code || '' : '';
  const mathTopic = section === 'mathematics' ? mathTopicInfo(options.mathTopic)?.code || '' : '';
  const query = normalizeCatalogueQuery(options.query);
  const requestedPage = options.page ?? 1;
  const cacheKey = `${section}:${onlyAdded ? 'added' : 'all'}:${physicsPart}:${physicsTopic}:${mathTopic}:${requestedPage}`;
  if (!query && cache.has(cacheKey)) return cache.get(cacheKey);
  const sourceHtml = await loadSourceHtml(section);
  const info = sectionInfo(section);
  const mathStats = section === 'mathematics' ? mathTopicStats(sourceHtml) : null;
  const catalog = section === 'physics' ? physicsCatalog(sourceHtml) : null;
  const topic = section === 'mathematics' ? mathTopicInfo(mathTopic) : catalogPhysicsTopicInfo(physicsTopic, physicsPart);
  const physicsStats = catalog ? {counts: physicsPart === 2 ? catalog.secondCounts : catalog.counts,
    total: physicsPart === 2 ? catalog.secondTotal : catalog.total,
    unclassified: physicsPart === 2 ? catalog.secondCounts.unclassified : catalog.unclassified} : null;
  const allowedIds = onlyAdded ? new Set(added[section].map(normalizeTaskId)) : null;
  let entries = sourceTaskEntries(sourceHtml).filter(task => {
    if (allowedIds && !allowedIds.has(task.id)) return false;
    if (section === 'mathematics') return mathTaskMatchesTopic(task, onlyAdded ? 'all' : mathTopic);
    if (section === 'physics') return (physicsTopic || physicsPart === 2 || onlyAdded)
      && taskMatchesPhysicsCatalogTopic(task, physicsTopic || 'all', physicsPart);
    return isSectionTaskRelevant(section, task);
  });
  if (section === 'mathematics' && mathTopic === 'all') {
    const order = new Map(MATH_TASK_TYPES.map((group, index) => [group.code, index]));
    entries.sort((a, b) => (order.get(mathTaskType(a)?.group) ?? 99) - (order.get(mathTaskType(b)?.group) ?? 99));
  }
  if (section === 'physics' && physicsPart === 1 && physicsTopic === '1.1') {
    // Keep every historical task, but start with the actual kinematics exercises.
    entries.sort((a, b) => Number(physicsTaskType(b)?.group === 'kinematics') - Number(physicsTaskType(a)?.group === 'kinematics'));
  }
  const completeIds = entries.map(task => task.id);
  if (query) entries = entries.filter(task => catalogueMatches(task, query));
  const window = catalogueWindow(entries, requestedPage);
  if (!window) return null;
  const ids = entries.map(task => task.id);
  const published = new Set(listPublishedSolutionIds.all().map(row => row.task_id));
  const basePath = onlyAdded ? `/added?section=${section}` : topic
    ? `${section === 'mathematics' ? '/' : physicsBasePath}?topic=${encodeURIComponent(topic.code)}`
    : section === 'physics' ? physicsBasePath : info.path;
  const pathname = catalogueUrl(basePath, {page: requestedPage, query});
  const name = topic?.name || (section === 'physics' ? `${physicsPart === 2 ? 'Вторая' : 'Первая'} часть физики` : info.name);
  const landing = !topic && !onlyAdded && (section === 'mathematics' || (section === 'physics' && physicsPart === 1));
  const describedCount = landing ? (mathStats?.total ?? physicsStats.total) : completeIds.length;
  const describedSolved = landing
    ? sourceTaskEntries(sourceHtml).filter(task => (section === 'physics' ? physicsTaskPart(task) === physicsPart : isFirstPartMathTask(task)) && published.has(task.id)).length
    : completeIds.filter(id => published.has(id)).length;
  const description = query ? `Поиск по подборке «${name}»: ${query}. Найдено заданий: ${ids.length}.`
    : section === 'physics' && landing
      ? `ЕГЭ по физике: ${describedCount} заданий первой части из банка ФИПИ; ${describedSolved} ответов и подробных решений. Бесплатная подготовка по темам, графики и схемы.`
      : `${name}: задания ${section === 'mathematics' ? 'первой части ' : section === 'physics' ? physicsPartName + ' части ' : ''}ЕГЭ по ${section === 'physics' ? 'физике' : 'математике профильного уровня'} из банка ФИПИ. Заданий: ${describedCount}; с подробными решениями: ${describedSolved}.${requestedPage > 1 ? ` Страница ${requestedPage}: задания ${window.offset + 1}–${window.offset + window.tasks.length}.` : ''}`;
  const baseTitle = onlyAdded ? `Добавленные задачи — ${name}` : section === 'physics'
    ? topic ? `${name} — ${physicsPart === 1 ? 'первая' : 'вторая'} часть ЕГЭ по физике`
      : physicsPart === 1 ? 'ЕГЭ по физике: задания ФИПИ с решениями — первая часть' : `${name} — задания ЕГЭ из банка ФИПИ`
    : section === 'mathematics' ? topic ? `${name} — первая часть ЕГЭ по математике` : 'Первая часть ЕГЭ по математике — каталог по типам'
      : `${name} — ЕГЭ по математике, профильный уровень`;
  const title = `${query ? 'Поиск по подборке: ' : ''}${baseTitle}${requestedPage > 1 ? ` — страница ${requestedPage}` : ''}`;
  const breadcrumbs = [{name: 'ЕГЭ', path: '/ege'}, section === 'physics' ? {name: 'Физика', path: '/ege/physics'} : {name: 'Математика', path: '/ege/math'}];
  if (section === 'physics' && topic) breadcrumbs.push({name: physicsPart === 2 ? 'Вторая часть физики' : 'Первая часть физики', path: physicsBasePath});
  if (section === 'mathematics' && topic) breadcrumbs.push({name: 'Профильная математика', path: '/'});
  breadcrumbs.push({name: onlyAdded ? `Добавленные задачи: ${name}` : name, path: basePath});
  if (requestedPage > 1 || query) breadcrumbs.push({name: query ? 'Результаты поиска' : `Страница ${requestedPage}`, path: pathname});
  const catalogue = landing ? null : {...window, tasks: undefined, ids, basePath, query,
    hubPath: section === 'physics' ? physicsBasePath + '#practice' : section === 'mathematics' ? '/#practice' : '/math'};
  const intro = landing ? '' : (requestedPage === 1 && !query ? renderCatalogueGuide(section, physicsPart === 2 ? '' : topic?.code, description) : '')
    + renderCatalogueSearch(basePath, query, ids.length);
  const page = decorate(taskDocument(sourceHtml, window.tasks.map(task => task.fragment).join('')), section, onlyAdded ? added[section] : null, {
    catalogue, catalogueCount: ids.length, catalogueSolved: describedSolved,
    mathCatalogue: section === 'mathematics', mathTopic, mathStats: mathStats || undefined,
    physicsCatalogue: section === 'physics', physicsTopic, physicsPart, physicsStats: physicsStats || undefined,
    title, heading: !landing ? title : undefined, description, pathname, breadcrumbs,
    robots: onlyAdded || query || (topic && !completeIds.length) ? 'noindex,follow' : 'index,follow',
    intro,
    structuredData: {'@context': 'https://schema.org', '@graph': [
      {'@type': 'CollectionPage', name: title, description, url: absoluteUrl(pathname), inLanguage: 'ru',
        isPartOf: {'@type': 'WebSite', name: 'ЕГЭ и ОГЭ ФИПИ — математика и физика', url: SITE_ORIGIN},
        mainEntity: {'@type': 'ItemList', numberOfItems: ids.length, itemListElement: window.tasks.map((task, index) => ({
          '@type': 'ListItem', position: window.offset + index + 1, name: `Задание ${task.id}`, url: absoluteUrl(`/tasks/${task.id}`)
        }))}}, breadcrumbData(breadcrumbs)]}
  });
  if (!query) {
    if (cache.size >= 160) cache.delete(cache.keys().next().value);
    cache.set(cacheKey, page);
  }
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
            const text = conditionText(fragment).replace(/\s+/g, ' ').trim();
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
  const title = hasQuery ? `Поиск: ${query} — ЕГЭ и ОГЭ` : 'Поиск заданий ЕГЭ и ОГЭ: математика и физика';
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
    heading: 'Поиск по заданиям ЕГЭ и ОГЭ',
    description: 'Поиск по номеру и тексту заданий открытого банка ФИПИ.',
    pathname: '/search',
    breadcrumbs: [{name: 'ЕГЭ', path: '/ege'}, {name: 'Поиск', path: '/search'}],
    robots: 'noindex,follow',
    isSearch: true,
    disableCataloguePager: true,
    searchQuery: query
  });
}

function renderTaskNavigation(taskNavigation, afterSolution = false) {
  if (!taskNavigation) return '';
  return `<nav class="task-sequence-pager${afterSolution ? ' task-sequence-pager--after-solution' : ''}" aria-label="${afterSolution ? 'Навигация после решения' : 'Навигация по заданиям раздела'}">
    ${taskNavigation.previous ? `<a href="/tasks/${escapeHtml(taskNavigation.previous)}">← Предыдущее</a>` : '<span class="task-sequence-pager-disabled">← Предыдущее</span>'}
    <span class="task-sequence-pager-label">Задание ${taskNavigation.position} из ${taskNavigation.total}</span>
    <a href="${escapeHtml(taskNavigation.sectionPath)}">Все задания раздела</a>
    ${taskNavigation.next ? `<a href="/tasks/${escapeHtml(taskNavigation.next)}" data-analytics-next-task="${escapeHtml(taskNavigation.next)}">Следующее →</a>` : '<span class="task-sequence-pager-disabled">Следующее →</span>'}
  </nav>`;
}

function renderPublishedSolution(taskId, topicName = '') {
  const solution = getPublishedSolution.get(taskId);
  if (!solution) return '';
  const answer = solution.answer ? `<p><strong>Ответ:</strong> ${renderMathText(solution.answer)}</p>` : '';
  const diagram = solution.diagram_svg
    ? `<figure><img src="data:image/svg+xml;base64,${Buffer.from(solution.diagram_svg).toString('base64')}" alt="${escapeHtml(`${topicName ? topicName + ': ' : ''}схема решения задания ${taskId}`)}">${solution.diagram_caption ? `<figcaption>Обозначения: ${renderMathText(solution.diagram_caption)}</figcaption>` : ''}</figure>`
    : '';
  return `<section class="seo-task-solution" aria-labelledby="solution-${escapeHtml(taskId)}">
    <h2 id="solution-${escapeHtml(taskId)}">Решение задания ${escapeHtml(taskId)}</h2>
    ${answer}
    <div class="formatted-solution">${renderMathSolution(solution.solution)}</div>
    ${diagram}
  </section>`;
}

function renderTaskPage(entry, sourceHtml, user = null, commentNotice = '', feedbackNotice = '') {
  const bank = Object.hasOwn(OGE_BANKS, entry.section) ? ogeBank(entry.section) : null;
  const oge = bank ? ogeCatalog(sourceHtml, entry.section) : null;
  const ogeTask = oge?.byId.get(entry.taskId);
  const fragment = ogeTask?.fragment || extractTaskFragment(sourceHtml, entry.sourceTaskId || entry.taskId);
  if (!fragment) return null;
  const info = sectionInfo(entry.section);
  const pathname = `/tasks/${entry.taskId}`;
  const condition = conditionText(fragment);
  const catalog = entry.section === 'physics' ? physicsCatalog(sourceHtml) : null;
  const sourceTask = catalog?.tasks.find(task => task.id === entry.taskId);
  const physicsPart = sourceTask ? physicsTaskPart(sourceTask) : 1;
  const physicsType = sourceTask ? physicsTaskType(sourceTask) : null;
  const physicsCode = physicsType?.group || physicsType?.code || (sourceTask ? taskPhysicsTopic(sourceTask)?.code : '') || 'all';
  const physicsPath = `${physicsPart === 2 ? '/physics/part-2' : '/physics'}?topic=${physicsCode}`;
  const mathSourceTask = entry.section === 'mathematics' ? sourceTaskEntries(sourceHtml).find(task => task.id === entry.taskId) : null;
  const mathType = mathSourceTask ? mathTaskType(mathSourceTask) : null;
  const ogeTopics = ogeTask ? ogeTopicCodes(ogeTask, entry.section).map(code => ogeTopicInfo(code, entry.section)).filter(Boolean).sort((left, right) => right.code.split('.').length - left.code.split('.').length) : [];
  const topic = oge ? ogeTopics[0] : sourceTask ? taskPhysicsTopic(sourceTask) : null;
  const classification = sourceTask ? physicsClassification(sourceTask) : null;
  const taskTopics = oge ? ogeTopics : classification?.topicCodes.map(physicsTopicInfo).filter(Boolean) || [];
  const publishedSolution = getPublishedSolution.get(entry.taskId);
  const hasPublishedSolution = Boolean(publishedSolution);
  const topicName = physicsType ? `${physicsType.groupName ? physicsType.groupName + ': ' : ''}${physicsType.name}`
    : topic?.name || (mathType ? `${mathType.groupName ? mathType.groupName + ': ' : ''}${mathType.name}` : info.name);
  const subject = oge ? `ОГЭ по ${bank.subject}` : entry.section === 'physics' ? 'ЕГЭ по физике' : 'ЕГЭ по математике, профиль';
  const displayTaskId = ogeTask?.sourceId || entry.taskId;
  const title = `${displayTaskId} — ${topicName}: ${hasPublishedSolution ? 'ответ и решение' : 'условие'} | ${subject}`;
  const prefix = `${displayTaskId}. ${subject}. ${topicName}. `;
  const suffix = hasPublishedSolution ? ' Ответ и подробное решение.' : ' Задание из банка ФИПИ.';
  let excerpt = truncateText(condition, Math.max(50, 209 - prefix.length - suffix.length)).replace(/[.,;:!?]+…$/, '…');
  if (excerpt && !/[.!?…]$/.test(excerpt)) excerpt += '.';
  const description = prefix + excerpt + suffix;
  let breadcrumbs;
  if (oge) {
    breadcrumbs = [{name: bank.name, path: bank.path}];
    if (topic) breadcrumbs.push({name: topic.name, path: ogeCataloguePath({topic: topic.code, section: entry.section})});
    breadcrumbs.push({name: `Задание ${displayTaskId}`, path: pathname});
  } else {
    breadcrumbs = [{name: 'ЕГЭ', path: '/ege'}];
    breadcrumbs.push(entry.section === 'physics' ? {name: 'Физика', path: '/ege/physics'} : {name: 'Математика', path: '/ege/math'});
    if (info.path !== '/') breadcrumbs.push({name: sourceTask ? `${physicsPart === 2 ? 'Вторая' : 'Первая'} часть физики` : info.name, path: sourceTask && physicsPart === 2 ? '/physics/part-2' : info.path});
    if (sourceTask && (physicsType || topic)) breadcrumbs.push({name: physicsType?.groupName || physicsType?.name || topic.name, path: physicsPath});
    if (mathType) breadcrumbs.push({name: mathType.groupName || mathType.name, path: `/?topic=${mathType.group || mathType.code}`});
    breadcrumbs.push({name: `Задание ${entry.taskId}`, path: pathname});
  }
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
        educationalLevel: oge ? 'Основное общее образование, 9 класс' : 'Среднее общее образование',
        learningResourceType: 'Экзаменационное задание',
        identifier: entry.taskId,
        about: [{ '@type': 'Thing', name: info.name }, ...taskTopics.map(item => ({ '@type': 'Thing', name: item.name }))],
        text: condition,
        ...(publishedSolution ? {dateModified: publishedSolution.updated_at} : {}),
        mainEntityOfPage: absoluteUrl(pathname)
      },
      breadcrumbData(breadcrumbs)
    ]
  };
  const sectionTasks = (oge ? oge.tasks.filter(task => !topic || ogeTaskMatchesTopic(task, topic.code, entry.section)).map(task => task.id)
    : sourceTask ? catalog.tasks.filter(task => taskMatchesPhysicsCatalogTopic(task, physicsCode, physicsPart)).map(task => task.id)
    : Array.from(taskIds(mathType ? filterMathTopicHtml(sourceHtml, mathType.group || mathType.code) : sourceHtml)))
    .map(normalizeTaskId)
    .filter(isValidTaskId);
  const taskPosition = sectionTasks.indexOf(entry.taskId);
  const taskNavigation = {
    previous: taskPosition > 0 ? sectionTasks[taskPosition - 1] : '',
    next: taskPosition >= 0 && taskPosition < sectionTasks.length - 1 ? sectionTasks[taskPosition + 1] : '',
    position: taskPosition + 1,
    total: sectionTasks.length,
    sectionPath: oge ? ogeCataloguePath({topic: topic?.code || 'all', section: entry.section}) : sourceTask
      ? physicsPath + '#tasks'
      : (mathType ? `/?topic=${mathType.group || mathType.code}#tasks` : info.path)
  };
  const page = decorate(taskDocument(sourceHtml, fragment), entry.section, null, {
    title,
    heading: `Задание ${entry.taskId}: ${topicName}`,
    description,
    pathname,
    type: 'article',
    structuredData,
    taskNavigation,
    breadcrumbs,
    ogeStats: oge || undefined,
    serverCatalogue: Boolean(oge),
    mathTopic: mathType?.group || mathType?.code,
    physicsTopic: sourceTask ? physicsCode : undefined,
    physicsPart,
    physicsStats: catalog ? { counts: physicsPart === 2 ? catalog.secondCounts : catalog.counts, total: physicsPart === 2 ? catalog.secondTotal : catalog.total, unclassified: physicsPart === 2 ? catalog.secondCounts.unclassified : catalog.unclassified } : undefined,
    intro: oge && taskTopics.length
      ? `<section class="catalog-summary"><p>Учебные темы: ${taskTopics.map(item => `<a href="${ogeCataloguePath({ topic: item.code, section: entry.section })}">${escapeHtml(item.name)}</a>`).join('; ')}.</p></section>`
      : classification?.reviewStatus === 'reviewed'
      ? `<section class="catalog-summary physics-task-topics"><p>Темы сайта: ${taskTopics.map((item, index) => `<a href="${physicsPart === 2 ? '/physics/part-2' : '/physics'}?topic=${item.code}#tasks">${escapeHtml(item.name)}</a>${index === 0 ? ' (основная)' : ''}`).join('; ')}.</p><p>Исходные метки ФИПИ сохранены в свойствах задания.</p></section>`
      : ''
  });
  const solution = publishedSolution ? renderPublishedSolution(entry.taskId, topicName) : '';
  const comments = publishedSolution
    ? renderCommentSection(entry.taskId, user, commentNotice)
    : renderUnavailableCommentSection(entry.taskId);
  const feedback = renderFeedbackSection(entry.taskId, feedbackNotice);
  return page.replace('<div id="site-end"></div>', `${solution}${renderTaskNavigation(taskNavigation, true)}${feedback}${comments}`);
}

async function renderSitemap() {
  const publishedDates = new Map(listPublishedSolutionDates.all().map(record => [record.task_id, record.updated_at]));
  const sectionPaths = Array.from(new Set(PUBLIC_SECTIONS.map(section => sectionInfo(section).path)));
  const mathStats = mathTopicStats(await loadSourceHtml('mathematics'));
  const mathTopicCodes = [...MATH_TASK_TYPES.flatMap(group => [group.code, ...group.children.map(([code]) => code)]), 'other']
    .filter(code => (mathStats.counts[code] || 0) > 0);
  const catalog = physicsCatalog(await loadSourceHtml('physics'));
  const ogePages = (await Promise.all(Object.values(OGE_BANKS).map(async bank => {
    const catalog = ogeCatalog(await loadSourceHtml(bank.section), bank.section);
    return ['all', 'practical', ...bank.topics.flatMap(group => [group.code, ...group.children.map(([code]) => code)]), 'unclassified']
      .filter(code => code === 'all' || catalog.counts[code] > 0)
      .flatMap(topic => Array.from({ length: Math.ceil((topic === 'all' ? catalog.total : catalog.counts[topic]) / OGE_PAGE_SIZE) }, (_, index) => ({
        pathname: ogeCataloguePath({ topic, page: index + 1, section: bank.section }), priority: index ? '0.6' : '0.8'
      })));
  }))).flat();
  const staticPages = [
    { pathname: '/ege', priority: '1.0' },
    { pathname: '/ege/math', priority: '0.95' },
    { pathname: '/ege/physics', priority: '0.95' },
    { pathname: '/math', priority: '0.95' },
    ...sectionPaths.map(pathname => ({ pathname, priority: pathname === '/' ? '1.0' : '0.9' })),
    { pathname: '/?topic=all', priority: '0.9' },
    ...mathTopicCodes.map(code => ({ pathname: `/?topic=${encodeURIComponent(code)}`, priority: '0.8' })),
    { pathname: '/physics?topic=all', priority: '0.9' },
    ...(catalog.counts.other ? [{ pathname: '/physics?topic=other', priority: '0.7' }] : []),
    { pathname: '/physics/part-2', priority: '0.9' },
    { pathname: '/about', priority: '0.5' }
  ];
  const tasks = await getTaskDirectory();
  const topicPages = catalog.topics.filter(topic => catalog.counts[topic.code] > 0).map(topic => ({
    pathname: `/physics?topic=${topic.code}`, priority: '0.8',
    updatedAt: catalog.tasks.filter(task => taskMatchesPhysicsCatalogTopic(task, topic.code)).map(task => publishedDates.get(task.id)).filter(Boolean).sort().at(-1)
  }));
  const secondPartPages = catalog.secondTopics.filter(topic => catalog.secondCounts[topic.code] > 0).map(topic => ({
    pathname: `/physics/part-2?topic=${topic.code}`, priority: '0.8',
    updatedAt: catalog.tasks.filter(task => taskMatchesPhysicsCatalogTopic(task, topic.code, 2)).map(task => publishedDates.get(task.id)).filter(Boolean).sort().at(-1)
  }));
  const entries = [
    ...staticPages,
    ...topicPages,
    ...secondPartPages,
    ...ogePages,
    ...tasks.map(({ taskId }) => ({ pathname: `/tasks/${taskId}`, priority: '0.7', updatedAt: publishedDates.get(taskId) }))
  ];
  const urls = entries.map(({ pathname, priority, updatedAt }) => {
    const lastmod = updatedAt ? `<lastmod>${escapeXml(String(updatedAt).slice(0, 10))}</lastmod>` : '';
    return `  <url><loc>${escapeXml(absoluteUrl(pathname))}</loc>${lastmod}<changefreq>weekly</changefreq><priority>${priority}</priority></url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

function renderNotFoundPage() {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,follow"><title>Страница не найдена</title></head><body><main><h1>Страница не найдена</h1><p>Вернитесь к <a href="/ege">каталогу заданий ЕГЭ</a>.</p></main></body></html>`;
}

async function refreshSection(section) {
  const source = FIPI_SOURCES[section];
  if (!source) throw new Error(`Неизвестный раздел ФИПИ: ${section}`);
  const oldFiles = await sourceFilenames(section);
  const oldParts = await Promise.all(oldFiles.map(filename => fs.readFile(path.join(__dirname, filename))));
  const oldHtml = oldParts.map(bytes => new TextDecoder('windows-1251').decode(bytes)).join('\n');
  if (Object.hasOwn(OGE_BANKS, section)) {
    await new Promise((resolve, reject) => {
      execFile(process.execPath, [path.join(__dirname, 'scripts', 'fetch-oge.js'), section], { maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) reject(new Error(`Не удалось обновить банк ОГЭ: ${stderr || error.message}`));
        else resolve(stdout);
      });
    });
    const newFiles = await sourceFilenames(section);
    const newHtml = (await Promise.all(newFiles.map(filename => fs.readFile(path.join(__dirname, filename)))))
      .map(bytes => normalizeOgeSourceHtml(new TextDecoder('windows-1251').decode(bytes), section)).join('\n');
    const oldIds = new Set([...taskIds(oldHtml)].map(id => ogePublicTaskId(id, section)));
    added[section] = Array.from(new Set([...added[section], ...Array.from(taskIds(newHtml)).filter(id => !oldIds.has(id))]));
    return;
  }
  const pages = [];

  for (let page = 0; ; page++) {
    const body = new URLSearchParams({
      search: '1',
      pagesize: String(FIPI_PAGE_SIZE),
      proj: source.project || PROJECT
    });
    if (source.theme) body.set('theme', source.theme);
    if (source.answerKind) body.set('qkind', source.answerKind);
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
  const filenames = (await fs.readdir(__dirname)).filter(name => name.endsWith('.raw.html') && !name.startsWith('oge-'));
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
  await refreshSection('mathematics');
  await refreshSection('stereometry');
  await refreshSection('planimetry');
  await refreshSection('parameters');
  await refreshSection('equations');
  await refreshSection('inequalities');
  await refreshSection('optimal');
  await refreshSection('numbers');
  await refreshSection('finance');
  await refreshSection('physics');
  for (const section of Object.keys(OGE_BANKS)) await refreshSection(section);
  await cacheFipiAssets();
  await saveAddedHistory();
  cache.clear();
  sourceCache.clear();
  sourceEntriesCache.clear();
  mathStatsCache.clear();
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
  <title>О проекте — задания ЕГЭ и ОГЭ по математике и физике</title>
  ${renderSeoMetadata({
    title: 'О проекте — задания ЕГЭ и ОГЭ по математике и физике',
    description: 'Подготовка к ЕГЭ и ОГЭ по математике и физике: задания открытого банка ФИПИ по темам. Подробные решения ЕГЭ и всех заданий ОГЭ по математике, постепенно добавляемые разборы ОГЭ по физике.',
    pathname: '/about',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'AboutPage',
      name: 'О проекте',
      url: absoluteUrl('/about'),
      inLanguage: 'ru',
      isPartOf: { '@type': 'WebSite', name: 'ЕГЭ и ОГЭ ФИПИ — математика и физика', url: SITE_ORIGIN }
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
      .local-menu { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; margin-top: 12px; }
      .local-menu a { display: grid; place-items: center; min-height: 46px; padding: 6px 4px; font-size: 12px;
        line-height: 1.2; overflow-wrap: anywhere; }
      .about-card { padding: 20px; }
      .about-card h1 { font-size: 23px; }
    }
  </style>
  ${UI_HEAD}
</head>
<body>
  ${YANDEX_METRIKA_NOSCRIPT}
  <main class="page">
    ${renderSiteHeader({pathname: '/about'})}
    <section class="about-card" aria-labelledby="about-title">
      <p class="study-eyebrow">Бесплатно. Понятно. В вашем темпе.</p>
      <h1 id="about-title">Подготовка к ЕГЭ и ОГЭ</h1>
      <p>ЕГЭ и ОГЭ ФИПИ помогает самостоятельно готовиться к обоим экзаменам по математике и физике: выбирать нужную тему, пробовать свои силы и закреплять знания. Все опубликованные материалы доступны бесплатно и без регистрации.</p>
      <p>Каталог математики ЕГЭ содержит задания первой части с кратким ответом, распределённые по типам и темам. Задания второй части с развёрнутым ответом собраны в отдельных разделах верхнего меню.</p>
      <p>Каталог физики ЕГЭ содержит задания первой части: числовые ответы, выбор вариантов и соответствия, сгруппированные по типам. Задачи второй части с развёрнутым ответом доступны через отдельные пункты меню физики.</p>
      <p>Для ОГЭ открыты отдельные банки по <a href="/oge">математике</a> и <a href="/oge-physics">физике</a> с выбором тем и поиском. В ОГЭ по физике постепенно добавляем подробные решения: задания с готовым разбором отмечены в каталоге. В ОГЭ по математике опубликованы подробные решения ко всем 3884 заданиям банка ФИПИ. В разделах ЕГЭ опубликованы подробные решения.</p>
      <p>Это независимый учебный проект. Условия взяты из открытого банка ФИПИ, а решения и пояснения подготовлены для сайта.</p>
      <a class="study-button" href="/ege#subjects">Выбрать предмет ЕГЭ →</a>
    </section>
    ${renderStudyGuide({hub: true})}
    ${renderStudyFaq()}
    ${renderStudyRequest()}
    ${renderSiteFooter()}
  </main>
  ${renderCommentsWidget()}
</body>
</html>`;
}

http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = requestUrl.pathname;
    if (serveAsset(req, res, pathname)) return;
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
    if (pathname === '/api/study-leads') {
      res.setHeader('cache-control', 'no-store');
      if (req.method !== 'POST') { res.writeHead(405, {allow: 'POST'}); return res.end(); }
      const wantsJson = String(req.headers.accept || '').includes('application/json');
      const sendError = (status, error) => {
        res.writeHead(status, {'content-type': wantsJson ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8'});
        return res.end(wantsJson ? JSON.stringify({error}) : renderAccountShell('Обращение не отправлено', `<section class="card"><h1>Обращение не отправлено</h1><p>${escapeHtml(error)}</p><a href="/#study-request">Вернуться к форме</a></section>`));
      };
      if (!isTrustedOrigin(req)) return sendError(403, 'Недопустимый источник запроса.');
      if (!String(req.headers['content-type'] || '').startsWith('application/x-www-form-urlencoded')) return sendError(415, 'Неподдерживаемый формат формы.');
      const form = await readForm(req, 16 * 1024);
      let accepted = false;
      if (!String(form.get('website') || '').trim()) {
        if (isRateLimited(req, 'study-lead', 3, 10 * 60 * 1000)) return sendError(429, 'Слишком много обращений. Попробуйте через 10 минут.');
        const started = Number(form.get('formStartedAt'));
        // Without JS the ordinary HTML form still works; rate limit and honeypot remain active.
        if (started && (!Number.isFinite(started) || Date.now() - started < 2000 || Date.now() - started > 2 * 60 * 60 * 1000)) return sendError(400, 'Попробуйте заполнить форму ещё раз.');
        const result = validateStudyLead(form);
        if (result.error) return sendError(422, result.error);
        try { accepted = studyLeads.save(result.lead); if (accepted) void studyLeadDelivery.flush(); }
        catch { return sendError(503, 'Не удалось сохранить обращение. Попробуйте ещё раз позже.'); }
      }
      if (wantsJson) {
        res.writeHead(200, {'content-type': 'application/json; charset=utf-8'});
        return res.end(JSON.stringify({ok: true, accepted}));
      }
      if (accepted) res.setHeader('set-cookie', 'ege_study_accepted=1; Max-Age=120; Path=/; Secure; SameSite=Lax');
      res.writeHead(303, {location: '/study-request/sent'});
      return res.end();
    }
    if (pathname === '/study-request/sent') {
      if (req.method !== 'GET') {res.writeHead(405, {allow: 'GET'}); return res.end();}
      res.writeHead(200, {'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow'});
      return res.end(renderAccountShell('Обращение принято', '<section class="card"><h1>Обращение принято</h1><p>Спасибо за вопрос. Для ответа используем указанный контакт.</p><a href="/#study-request">Вернуться на сайт</a></section>'));
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
        res.writeHead(303, { location: formNext, 'set-cookie': [userSessionCookie(user), registrationAnalyticsCookie()] });
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
      if (taskPageMatch[1] !== taskId) {
        res.writeHead(301, {location: `/tasks/${taskId}${requestUrl.search}`, 'cache-control': 'public, max-age=3600'});
        return res.end();
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
        diagramCaptionHtml: renderMathText(solution.diagram_caption),
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
    if (pathname === '/admin' || pathname === '/admin/leads' || adminSolutionMatch) {
      if (!getAdminPassword()) {
        res.writeHead(503, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
        return res.end('Администрирование не настроено. Укажите пароль в защищённом файле сервера.');
      }
      if (!isAdmin(req)) {
        res.writeHead(303, { location: '/admin/login' });
        return res.end();
      }
      if (pathname === '/admin/leads') {
        if (req.method !== 'GET') { res.writeHead(405, {allow: 'GET'}); return res.end(); }
        const page = Math.max(1, Math.min(100000, Number.parseInt(requestUrl.searchParams.get('page'), 10) || 1));
        res.writeHead(200, {'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'referrer-policy': 'no-referrer'});
        return res.end(renderAdminShell('Заявки', renderStudyLeadsAdmin(studyLeads, page), true));
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
    if (['/ege', '/ege/', '/ege/math', '/ege/math/', '/ege/physics', '/ege/physics/'].includes(pathname)) {
      if (req.method !== 'GET') {
        res.writeHead(405, { allow: 'GET' });
        return res.end();
      }
      if (pathname.endsWith('/')) {
        res.writeHead(301, { location: pathname.slice(0, -1) + requestUrl.search });
        return res.end();
      }
      const page = pathname === '/ege' ? await renderEgeHubPage() : await renderEgeSubjectPage(pathname.split('/').at(-1));
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      return res.end(page);
    }
    if (pathname === '/math') {
      if (req.method !== 'GET') {
        res.writeHead(405, { allow: 'GET' });
        return res.end();
      }
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      return res.end(await renderMathHubPage());
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
    const routeSection = pathname === '/physics/part-2' ? 'physics' : PUBLIC_SECTIONS.find(name => sectionInfo(name).path === pathname);
    const section = PUBLIC_SECTIONS.includes(requestedSection)
      ? requestedSection
      : (routeSection || 'mathematics');
    if (pathname === '/update' && req.method === 'POST') {
      if (Object.hasOwn(OGE_BANKS, section)) {
        await refreshSection(section);
        await saveAddedHistory();
        cache.clear(); sourceCache.clear(); taskDirectoryPromise = null; taskSearchIndexPromise = null;
      } else await refreshAll();
      res.writeHead(303, { location: `/added?section=${section}` });
      return res.end();
    }
    if (pathname === '/update') {
      res.writeHead(405, { allow: 'POST' });
      return res.end();
    }
    const publicPaths = new Set(['/added', '/physics/part-2', ...PUBLIC_SECTIONS.map(name => sectionInfo(name).path)]);
    if (!publicPaths.has(pathname)) {
      res.writeHead(404, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      return res.end(renderNotFoundPage());
    }
    const physicsTopic = section === 'physics' ? requestUrl.searchParams.get('topic') : '';
    const physicsPart = pathname === '/physics/part-2' ? 2 : 1;
    const mathTopic = section === 'mathematics' ? requestUrl.searchParams.get('topic') : '';
    const isOge = Object.hasOwn(OGE_BANKS, section);
    const ogeTopic = isOge ? requestUrl.searchParams.get('topic') || '' : '';
    if ((physicsTopic && !catalogPhysicsTopicInfo(physicsTopic, physicsPart)) || (mathTopic && !mathTopicInfo(mathTopic)) || (ogeTopic && !ogeTopicInfo(ogeTopic, section))) {
      res.writeHead(404, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      return res.end(renderNotFoundPage());
    }
    const rawPage = requestUrl.searchParams.get('page');
    if ((isOge && ogePageNumber(rawPage) === null) || (rawPage !== null && (!/^[0-9]{1,6}$/.test(rawPage) || Number(rawPage) < 1))) {
      res.writeHead(404, {'content-type': 'text/html; charset=utf-8'});
      return res.end(renderNotFoundPage());
    }
    const redirected = new URL(requestUrl);
    if (pathname === '/' && Object.hasOwn(MATH_CATALOGUE_ALIASES, mathTopic)) redirected.searchParams.set('topic', MATH_CATALOGUE_ALIASES[mathTopic]);
    if (rawPage !== null) {
      if (Number(rawPage) === 1) redirected.searchParams.delete('page');
      else redirected.searchParams.set('page', String(Number(rawPage)));
    }
    if (redirected.search !== requestUrl.search) {
      res.writeHead(301, {location: redirected.pathname + redirected.search});
      return res.end();
    }
    const page = await loadQuestions(section, pathname === '/added', { physicsTopic, physicsPart, mathTopic, ogeTopic, page: rawPage === null ? 1 : Number(rawPage), query: requestUrl.searchParams.get('q') });
    if (page === null) {
      res.writeHead(404, {'content-type': 'text/html; charset=utf-8'});
      return res.end(renderNotFoundPage());
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(page);
  } catch (error) {
    res.writeHead(502, { 'content-type': 'text/html; charset=utf-8' });
    res.end(`<h1>Не удалось загрузить задания ФИПИ</h1><pre>${String(error.message)}</pre>`);
  }
}).listen(PORT, '127.0.0.1', async () => {
  console.log(`ЕГЭ и ОГЭ ФИПИ: http://localhost:${PORT}`);
  const sections = PUBLIC_SECTIONS;
  await Promise.all(sections.map(section => loadQuestions(section).catch(() => null)));
});
