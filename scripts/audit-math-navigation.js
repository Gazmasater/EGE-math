const {readOgeCatalog} = require('./lib/oge-catalog');
const {OGE_BANKS} = require('../lib/oge-catalog');
const {readCataloguePages} = require('./lib/catalogue-pages');
// Проверка реального HTTP-каталога после разделения первой и второй частей.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
const {DatabaseSync} = require('node:sqlite');
const {readMathematicsCatalog} = require('./lib/mathematics-catalog');
const {readPhysicsCatalog} = require('./lib/physics-catalog');
const {topics, taskMatchesTopic} = require('../lib/physics-topics');
const {physicsTaskPart} = require('../lib/physics-task-types');
const {MATH_TASK_TYPES, assignments, isFirstPartMathTask, mathTaskType} = require('../lib/math-task-types');
const root = path.resolve(__dirname, '..');
const origin = process.env.SEO_ORIGIN || 'http://127.0.0.1:8765';
const canonical = 'https://ege-fipi.ru';
const output = path.resolve(process.env.SEO_ARTIFACTS || '/tmp/ege-math-navigation');
const server = process.env.SEO_SERVER ? spawn(process.execPath, [process.env.SEO_SERVER], {
  env: {...process.env, PORT: new URL(origin).port}, stdio: 'ignore'
}) : null;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const idsIn = html => [...html.matchAll(/class=["'][^"']*\bqblock\b[^"']*["']\s+id=["']q([A-Z0-9]+)["']/gi)].map(m => m[1].toUpperCase());
const graphIn = html => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(m => JSON.parse(m[1])['@graph'] || []);
const sorted = values => [...values].sort();
const report = {origin, checkedAt: new Date().toISOString(), catalogs: [], tasks: [], errors: []};
async function get(route) {
  const response = await fetch(origin + route, {signal: AbortSignal.timeout(30000)});
  assert.equal(response.status, 200, route);
  return response.text();
}
function page(html, route) {
  assert.equal((html.match(/<h1\b/g) || []).length, 1, `${route}: H1`);
  assert.ok(html.includes(`rel="canonical" href="${canonical + route}"`), `${route}: canonical`);
  return graphIn(html);
}
async function catalog(route, expected) {
  const {html, ids, pages} = await readCataloguePages(get, route);
  page(html, route);
  if (expected) assert.deepEqual(sorted(ids), sorted(expected), `${route}: полный состав заданий`);
  report.catalogs.push({route, count: ids.length, pages});
  return {html, ids};
}

async function run() {
  if (server) {
    let ready = false;
    for (let n = 0; n < 100; n++) {try {await get('/robots.txt');ready = true;break;} catch {await delay(100);}}
    assert.ok(ready, 'Предпросмотр не запустился');
  }
  const math = readMathematicsCatalog(root);
  const first = [...math.values()].filter(isFirstPartMathTask);
  const second = [...math.values()].filter(task => !isFirstPartMathTask(task));
  const db = new DatabaseSync(path.join(root, 'storage/solutions.sqlite'), {readOnly: true});
  const solutions = new Map(db.prepare('SELECT * FROM solutions WHERE published=1').all().map(row => [row.task_id, row]));
  db.close();
  const home = await catalog('/', []);
  assert.ok(home.html.includes('Первая часть: задания по типам'));
  assert.ok(home.html.includes('Вторая часть'));
  const hub = await get('/math'), hubGraph = page(hub, '/math');
  assert.ok(hub.includes(`${first.length} заданий · ${first.filter(t => solutions.has(t.id)).length} подробных решений`));
  assert.equal((hub.match(/class="math-hub-card"/g) || []).length, MATH_TASK_TYPES.length);
  assert.deepEqual(hubGraph.find(g => g['@type'] === 'CollectionPage').mainEntity.itemListElement.map(i => i.url),
    MATH_TASK_TYPES.map(g => `${canonical}/?topic=${g.code}#tasks`));
  const groups = new Map(), taskSections = new Map();
  const typeCodes = MATH_TASK_TYPES.flatMap(g => [g.code, ...g.children.map(([code]) => code)]);
  await catalog('/?topic=all', first.map(t => t.id));
  for (const code of typeCodes) {
    const expected = first.filter(t => {const type = mathTaskType(t);return type.code === code || type.group === code;}).map(t => t.id);
    const result = await catalog(`/?topic=${code}`, expected);
    if (MATH_TASK_TYPES.some(g => g.code === code)) groups.set(code, result.ids);
  }
  for (const code of ['1.1', '1.2']) {
    await catalog(`/?topic=${code}`, first.filter(t => t.codes.some(c => c === code || c.startsWith(code + '.'))).map(t => t.id));
  }
  const added = await catalog('/added?section=mathematics');
  assert.ok(added.ids.every(id => isFirstPartMathTask(math.get(id))), 'Добавленные: только первая часть');
  assert.deepEqual(idsIn(await get('/?section=finance')), [], 'section не меняет основной каталог');
  const counts = {stereometry: 66, planimetry: 75, parameters: 70, equations: 67, inequalities: 71, optimal: 2, numbers: 60, finance: 64};
  for (const [section, count] of Object.entries(counts)) {
    const {ids} = await catalog('/' + section);
    assert.equal(ids.length, count, section);
    assert.ok(home.html.includes(`href="/${section}"`), `${section}: доступ через меню`);
    for (const id of ids) {
      assert.ok(math.has(id) && !isFirstPartMathTask(math.get(id)), `${section}/${id}: вторая часть`);
      assert.ok(!taskSections.has(id), `${id}: повтор в разделах`);
      taskSections.set(id, section);
    }
    groups.set(section, ids);
  }
  assert.deepEqual(sorted(taskSections.keys()), sorted(second.map(t => t.id)), 'Вся вторая часть доступна в меню');
  for (const [id, record] of Object.entries(assignments)) if (record.part === 2) assert.equal(taskSections.get(id), record.type, `${id}: назначение раздела`);
  const physics = readPhysicsCatalog(root, {allAnswerTypes: true});
  await catalog('/physics', []);
  for (const topic of topics) await catalog(`/physics?topic=${topic.code}`, [...physics.values()].filter(t => physicsTaskPart(t) === 1 && taskMatchesTopic(t, topic.code)).map(t => t.id));
  const sitemap = await get('/sitemap.xml');
  const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1].replace(/&amp;/g, '&'));
  assert.equal(urls.length, new Set(urls).size, 'sitemap: дубликаты');
  assert.deepEqual(sorted(urls.filter(url => url.includes('/tasks/')).map(url => url.split('/').at(-1))), sorted([...math.keys(), ...physics.keys(), ...Object.keys(OGE_BANKS).flatMap(section => readOgeCatalog(root, section).tasks.map(task => task.id))]));
  for (const code of typeCodes) assert.ok(urls.includes(`${canonical}/?topic=${code}`), `sitemap: ${code}`);
  assert.ok(urls.includes(canonical + '/math'));
  report.sitemapUrls = urls.length;
  console.log(`Каталоги: ${report.catalogs.length}; первая часть: ${first.length}; вторая часть: ${second.length}; sitemap: ${urls.length}`);
  for (const task of math.values()) {
    const route = `/tasks/${task.id}`, html = await get(route), graph = page(html, route);
    assert.deepEqual(idsIn(html), [task.id], `${route}: условие`);
    const resource = graph.find(g => Array.isArray(g['@type']) && g['@type'].includes('LearningResource'));
    assert.equal(resource?.identifier, task.id);
    const group = isFirstPartMathTask(task) ? mathTaskType(task).group : taskSections.get(task.id);
    const returnPath = isFirstPartMathTask(task) ? `/?topic=${group}#tasks` : '/' + group;
    const navigation = html.match(/<nav class="task-sequence-pager"[\s\S]*?<\/nav>/)?.[0] || '';
    assert.ok(navigation.includes(`href="${returnPath}"`), `${route}: возврат в свой тип`);
    assert.ok(navigation.includes(`из ${groups.get(group).length}</span>`), `${route}: размер раздела`);
    for (const [, id] of navigation.matchAll(/href="\/tasks\/([A-Z0-9]+)"/g)) assert.ok(groups.get(group).includes(id), `${route}: сосед ${id}`);
    const stored = solutions.get(task.id);
    assert.ok(stored && html.includes('class="seo-task-solution"'), `${route}: полное решение`);
    const api = JSON.parse(await get(`/api/solutions/${task.id}`));
    for (const [key, field] of [['answer', 'answer'], ['solution', 'solution'], ['diagramSvg', 'diagram_svg'], ['diagramCaption', 'diagram_caption']]) assert.equal(api[key], stored[field], `${task.id}: API ${key}`);
    assert.ok(html.includes(api.solutionHtml), `${route}: опубликованный текст`);
    report.tasks.push(task.id);
    if (report.tasks.length % 200 === 0) console.log(`Страницы и API: ${report.tasks.length}/${math.size}`);
  }
}
run().catch(error => {report.errors.push(error.stack);console.error(error);process.exitCode = 1;}).finally(() => {
  server?.kill();
  fs.mkdirSync(output, {recursive: true});
  fs.writeFileSync(path.join(output, 'navigation-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({catalogs: report.catalogs.length, tasks: report.tasks.length, errors: report.errors.length, artifacts: output}));
});
