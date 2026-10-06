const {readOgeCatalog} = require('./lib/oge-catalog');
const {OGE_BANKS} = require('../lib/oge-catalog');
const {readCataloguePages} = require('./lib/catalogue-pages');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
const {DatabaseSync} = require('node:sqlite');
const {readPhysicsCatalog} = require('./lib/physics-catalog');
const {readMathematicsCatalog} = require('./lib/mathematics-catalog');
const {PHYSICS_TASK_TYPES, physicsTaskPart, physicsTaskType, firstPartPhysicsMatches} = require('../lib/physics-task-types');
const {topics, taskMatchesTopic, taskPhysicsTopic, physicsClassification} = require('../lib/physics-topics');
const {MATH_TASK_TYPES, mathTaskType, isFirstPartMathTask} = require('../lib/math-task-types');
const root = path.resolve(__dirname, '..'), origin = process.env.SEO_ORIGIN || 'http://127.0.0.1:8765';
const canonical = 'https://ege-fipi.ru', output = process.env.SEO_ARTIFACTS || '/tmp/ege-physics-navigation';
const server = process.env.SEO_SERVER ? spawn(process.execPath, [process.env.SEO_SERVER], {env: {...process.env, PORT: new URL(origin).port}, stdio: 'ignore'}) : null;
const report = {origin, checkedAt: new Date().toISOString(), catalogs: [], tasks: [], apis: 0, errors: []};
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const idsIn = html => [...html.matchAll(/class=["'][^"']*\bqblock\b[^"']*["']\s+id=["']q([A-Z0-9]+)["']/gi)].map(m => m[1].toUpperCase());
const graphIn = html => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(m => JSON.parse(m[1])['@graph'] || []);
const sorted = values => [...values].sort();
async function get(route) {
  const response = await fetch(origin + route, {signal: AbortSignal.timeout(30000)});
  assert.equal(response.status, 200, route);return response.text();
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
    for (let i = 0; i < 100; i++) {try {await get('/robots.txt');ready = true;break;} catch {await delay(100);}}
    assert.ok(ready, 'Предпросмотр не запустился');
  }
  const physics = readPhysicsCatalog(root, {allAnswerTypes: true}), math = readMathematicsCatalog(root);
  const first = [...physics.values()].filter(t => physicsTaskPart(t) === 1), second = [...physics.values()].filter(t => physicsTaskPart(t) === 2);
  assert.equal(first.length, 1806);assert.equal(second.length, 538);
  const db = new DatabaseSync(path.resolve(process.env.PHYSICS_DB || path.join(root, 'storage/solutions.sqlite')), {readOnly: true});
  const solutions = new Map(db.prepare('SELECT * FROM solutions WHERE published=1').all().map(row => [row.task_id, row]));db.close();
  const home = await catalog('/physics', []);
  assert.ok(home.html.includes('Первая часть физики: задания по типам'));
  assert.equal((home.html.match(/<details class="math-topic-group"/g) || []).length, PHYSICS_TASK_TYPES.length);
  for (const code of ['1', '2', '3', '4']) assert.ok(home.html.includes(`/physics/part-2?topic=${code}#tasks`));
  await catalog('/physics?topic=all', first.map(t => t.id));
  await catalog('/physics/part-2', second.map(t => t.id));
  const groups = new Map(), typeCodes = PHYSICS_TASK_TYPES.flatMap(g => [g.code, ...g.children.map(([code]) => code)]);
  for (const code of typeCodes) {
    const expected = first.filter(t => firstPartPhysicsMatches(t, code)).map(t => t.id);
    const result = await catalog(`/physics?topic=${code}`, expected);groups.set('1:' + code, result.ids);
  }
  for (const topic of topics) for (const part of [1, 2]) {
    const expected = (part === 1 ? first : second).filter(t => taskMatchesTopic(t, topic.code)).map(t => t.id);
    const result = await catalog(`/physics${part === 2 ? '/part-2' : ''}?topic=${topic.code}`, expected);
    if (part === 2) groups.set('2:' + topic.code, result.ids);
  }
  const added = await catalog('/added?section=physics');assert.ok(added.ids.every(id => physicsTaskPart(physics.get(id)) === 1));
  assert.deepEqual(idsIn(await get('/physics?part=2&section=finance')), []);
  const mathFirst = [...math.values()].filter(isFirstPartMathTask);
  await catalog('/', []);await catalog('/?topic=all', mathFirst.map(t => t.id));
  for (const group of MATH_TASK_TYPES) await catalog(`/?topic=${group.code}`, mathFirst.filter(t => mathTaskType(t).group === group.code).map(t => t.id));
  for (const [section, count] of Object.entries({stereometry: 66, planimetry: 75, parameters: 70, equations: 67, inequalities: 71, optimal: 2, numbers: 60, finance: 64})) {
    const result = await catalog('/' + section);assert.equal(result.ids.length, count);
  }
  const hub = await get('/math');assert.ok(hub.includes('673 заданий · 673 подробных решений'));
  const sitemap = await get('/sitemap.xml'), urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1].replace(/&amp;/g, '&'));
  assert.equal(urls.length, new Set(urls).size, 'sitemap: дубликаты');
  assert.deepEqual(sorted(urls.filter(u => u.includes('/tasks/')).map(u => u.split('/').at(-1))), sorted([...math.keys(), ...physics.keys(), ...Object.keys(OGE_BANKS).flatMap(section => readOgeCatalog(root, section).tasks.map(task => task.id))]));
  for (const code of typeCodes) assert.equal(urls.includes(`${canonical}/physics?topic=${code}`), groups.get('1:' + code).length > 0, `sitemap: ${code}`);
  assert.ok(urls.includes(canonical + '/physics/part-2'));
  report.sitemapUrls = urls.length;
  console.log(`Каталоги: ${report.catalogs.length}; первая часть: ${first.length}; вторая: ${second.length}; sitemap: ${urls.length}`);
  const selection = process.env.PHYSICS_TASK_IDS ? new Set(process.env.PHYSICS_TASK_IDS.split(',')) : new Set(physics.keys());
  assert.ok(selection.size && [...selection].every(id => physics.has(id)), 'Неизвестные ID проверки');
  report.expectedTasks = selection.size;
  for (const id of selection) {
    const task = physics.get(id), route = '/tasks/' + id, html = await get(route), graph = page(html, route);
    assert.deepEqual(idsIn(html), [id]);
    const resource = graph.find(g => Array.isArray(g['@type']) && g['@type'].includes('LearningResource'));
    assert.equal(resource?.identifier, id);
    const part = physicsTaskPart(task), type = physicsTaskType(task), code = type?.group || taskPhysicsTopic(task)?.code || 'all';
    const returnPath = `/physics${part === 2 ? '/part-2' : ''}?topic=${code}`;
    const navigation = html.match(/<nav class="task-sequence-pager"[\s\S]*?<\/nav>/)?.[0] || '';
    assert.ok(navigation.includes(`href="${returnPath}#tasks"`), `${id}: возврат в свою часть`);
    const sectionIds = groups.get(part + ':' + code);
    assert.ok(navigation.includes(`из ${sectionIds.length}</span>`), `${id}: размер типа`);
    for (const [, neighbor] of navigation.matchAll(/href="\/tasks\/([A-Z0-9]+)"/g)) assert.ok(sectionIds.includes(neighbor), `${id}: сосед ${neighbor}`);
    const crumbs = graph.find(g => g['@type'] === 'BreadcrumbList');
    assert.equal(crumbs.itemListElement.at(-2).item, canonical + returnPath, `${id}: хлебные крошки`);
    assert.equal(html.includes('class="seo-task-solution"'), solutions.has(id), `${id}: наличие решения`);
    if (solutions.has(id)) {
      const api = JSON.parse(await get('/api/solutions/' + id)), stored = solutions.get(id);
      for (const [key, field] of [['answer', 'answer'], ['solution', 'solution'], ['diagramSvg', 'diagram_svg'], ['diagramCaption', 'diagram_caption']]) assert.equal(api[key], stored[field], `${id}: API ${key}`);
      assert.ok(html.includes(api.solutionHtml), `${id}: полный текст решения`);report.apis++;
    }
    if (part === 2 && physicsClassification(task).reviewStatus === 'reviewed') {
      for (const topic of physicsClassification(task).topicCodes) assert.ok(html.includes(`/physics/part-2?topic=${topic}#tasks`), `${id}: проверенная тема`);
    }
    report.tasks.push(id);
    if (report.tasks.length % 400 === 0) console.log(`Страницы: ${report.tasks.length}/${selection.size}; API: ${report.apis}`);
  }
  for (const route of ['/physics?topic=not-a-type', '/physics/part-2?topic=kinematics']) assert.equal((await fetch(origin + route)).status, 404, route);
}
run().catch(error => {report.errors.push(error.stack);console.error(error);process.exitCode = 1;}).finally(() => {
  server?.kill();fs.mkdirSync(output, {recursive: true});
  fs.writeFileSync(path.join(output, 'navigation-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({catalogs: report.catalogs.length, tasks: report.tasks.length, apis: report.apis, errors: report.errors.length, artifacts: output}));
});
