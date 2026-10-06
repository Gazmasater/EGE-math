const {readOgeCatalog} = require('./lib/oge-catalog');
const {OGE_BANKS} = require('../lib/oge-catalog');
const {readCataloguePages} = require('./lib/catalogue-pages');
// Check subject landing pages against the real catalogs and published solutions.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {DatabaseSync} = require('node:sqlite');
const {readMathematicsCatalog} = require('./lib/mathematics-catalog');
const {readPhysicsCatalog} = require('./lib/physics-catalog');
const {physicsTaskPart} = require('../lib/physics-task-types');
const root = path.resolve(__dirname, '..');
const origin = process.env.SEO_ORIGIN || 'http://127.0.0.1:8765';
const out = process.env.SEO_ARTIFACTS || '/tmp/ege-subject-audit';
const canonical = 'https://ege-fipi.ru';
const report = {origin, checkedAt: new Date().toISOString(), subjects: [], catalogs: [], examples: [], errors: []};
const graph = html => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(m => JSON.parse(m[1])['@graph'] || []);
const idsIn = html => [...html.matchAll(/class=["'][^"']*\bqblock\b[^"']*["']\s+id=["']q([A-Z0-9]+)["']/gi)].map(m => m[1].toUpperCase());
async function get(route) {
  const response = await fetch(origin + route, {headers: {Connection: 'close'}, signal: AbortSignal.timeout(30000)});
  assert.equal(response.status, 200, route);
  return response.text();
}
async function run() {
  const db = new DatabaseSync(path.join(root, 'storage/solutions.sqlite'), {readOnly: true});
  const solutions = new Map(db.prepare('SELECT * FROM solutions WHERE published=1').all().map(row => [row.task_id, row]));
  db.close();
  const math = readMathematicsCatalog(root);
  const physics = readPhysicsCatalog(root, {allAnswerTypes: true});
  const hub = await get('/ege');
  assert.deepEqual(graph(hub).find(item => item['@type'] === 'CollectionPage').mainEntity.itemListElement.map(item => item.url),
    [canonical + '/ege/math', canonical + '/ege/physics']);
  for (const [subject, name, source] of [['math', 'математике', math], ['physics', 'физике', physics]]) {
    const route = '/ege/' + subject, html = await get(route), data = graph(html);
    assert.equal((html.match(/<h1\b/g) || []).length, 1, route + ': H1');
    assert.ok(html.includes(`>Решение задач ЕГЭ по ${name}</h1>`));
    assert.ok(html.includes(`rel="canonical" href="${canonical + route}"`));
    assert.ok(html.includes('name="robots" content="index,follow"'));
    assert.equal((html.match(/ym\(112561663, 'init'/g) || []).length, 1);
    assert.ok(html.includes(`Заданий: ${source.size} · С решениями: ${[...source.keys()].filter(id => solutions.has(id)).length}`));
    assert.deepEqual(data.find(item => item['@type'] === 'BreadcrumbList').itemListElement.map(item => item.item),
      [canonical + '/ege', canonical + route]);
    const seen = new Set(), destinations = [];
    const cards = [...html.matchAll(/<article class="topic-card">([\s\S]*?)<\/article>/g)].map(m => m[1]);
    for (const card of cards) {
      const link = card.match(/<h3><a href="([^"]+)"/)[1];
      const expected = card.match(/Заданий: (\d+) · С решениями: (\d+)/).slice(1).map(Number);
      const {ids} = await readCataloguePages(get, link.split('#')[0]);
      assert.equal(ids.length, expected[0], link + ': task count');
      assert.equal(ids.filter(id => solutions.has(id)).length, expected[1], link + ': solution count');
      assert.equal(ids.length, new Set(ids).size, link + ': unique tasks');
      ids.forEach(id => {assert.ok(source.has(id), link + ': subject'); seen.add(id);});
      destinations.push(canonical + link);
      report.catalogs.push({route: link, tasks: ids.length, solved: expected[1]});
      const example = card.match(/href="\/tasks\/([A-Z0-9]+)#solution-\1"/);
      if (expected[1]) assert.ok(example, link + ': published example');
      if (example) {
        const id = example[1];
        assert.ok(ids.includes(id), link + ': example belongs to group');
        const task = await get('/tasks/' + id), api = JSON.parse(await get('/api/solutions/' + id));
        assert.equal(api.solution, solutions.get(id).solution, id + ': published text');
        assert.ok(task.includes(api.solutionHtml), id + ': SSR solution');
        assert.ok(task.includes(`href="${route}"`), id + ': parent subject link');
        assert.ok(task.includes(`rel="canonical" href="${canonical}/tasks/${id}"`));
        report.examples.push(id);
      }
    }
    assert.deepEqual([...seen].sort(), [...source.keys()].sort(), route + ': all tasks reachable');
    const collection = data.find(item => item['@type'] === 'CollectionPage').mainEntity;
    assert.equal(collection.numberOfItems, cards.length);
    assert.deepEqual(collection.itemListElement.map(item => item.url), destinations);
    const trailing = await fetch(origin + route + '/?utm_source=audit', {redirect: 'manual'});
    assert.equal(trailing.status, 301); assert.equal(trailing.headers.get('location'), route + '?utm_source=audit');
    const rejected = await fetch(origin + route, {method: 'POST'});
    assert.equal(rejected.status, 405); assert.equal(rejected.headers.get('allow'), 'GET');
    report.subjects.push({route, tasks: seen.size, groups: cards.length});
  }
  const physicsPage = await get('/physics');
  const firstSolved = [...physics.values()].filter(task => physicsTaskPart(task) === 1 && solutions.has(task.id)).length;
  assert.ok(physicsPage.match(/<meta name="description" content="([^"]*)"/)?.[1].includes(`${firstSolved} ответов и подробных решений`));
  const sitemap = await get('/sitemap.xml'), urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1].replaceAll('&amp;', '&'));
  assert.equal(urls.length, new Set(urls).size);
  for (const route of ['/ege', '/ege/math', '/ege/physics', '/math', '/', '/physics', '/physics/part-2']) assert.ok(urls.includes(canonical + route));
  assert.deepEqual(urls.filter(url => url.includes('/tasks/')).map(url => url.split('/').at(-1)).sort(), [...math.keys(), ...physics.keys(), ...Object.keys(OGE_BANKS).flatMap(section => readOgeCatalog(root, section).tasks.map(task => task.id))].sort());
  assert.equal((await fetch(origin + '/ege/unknown')).status, 404);
  report.sitemapUrls = urls.length;
}
run().catch(error => {report.errors.push(error.stack); console.error(error); process.exitCode = 1;}).finally(() => {
  fs.mkdirSync(out, {recursive: true});
  fs.writeFileSync(path.join(out, 'subject-audit.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({subjects: report.subjects, catalogs: report.catalogs.length, examples: report.examples.length, errors: report.errors.length}));
});
