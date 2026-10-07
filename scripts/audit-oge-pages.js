const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { readOgeCatalog } = require('./lib/oge-catalog');
const { ogeBank, OGE_PAGE_SIZE, ogeTopicCodes, ogeTopicInfo, ogeTaskMatchesTopic: bankTaskMatchesTopic, ogeCataloguePath: bankCataloguePath } = require('../lib/oge-catalog');
const { conditionText, decodeEntities } = require('../lib/seo-text');

const origin = process.env.OGE_SITE_ORIGIN || 'http://127.0.0.1:8877';
const canonicalOrigin = 'https://ege-fipi.ru';
const section = process.argv[2] || 'oge';
const bank = ogeBank(section);
const { tasks } = readOgeCatalog(undefined, section);
const ogeTaskMatchesTopic = (task, topic) => bankTaskMatchesTopic(task, topic, section);
const ogeCataloguePath = options => bankCataloguePath({ ...options, section });
const taskIds = html => [...html.matchAll(/<div\s+class=['"][^'"]*\bqblock\b[^'"]*['"]\s+id=['"]q([A-Z0-9]+)['"]/gi)].map(match => match[1]);
const get = async url => {
  const response = await fetch(origin + url, { redirect: 'manual', headers: { Connection: 'close' }, signal: AbortSignal.timeout(30000) });
  return { status: response.status, html: await response.text(), location: response.headers.get('location') };
};
function pageMetadata(url, result) {
  assert.equal(result.status, 200, `${url}: HTTP`);
  assert.equal((result.html.match(/<h1\b/g) || []).length, 1, `${url}: H1`);
  const canonical = result.html.match(/<link rel="canonical" href="([^"]+)"/)[1];
  assert.equal(decodeEntities(canonical), canonicalOrigin + url, `${url}: canonical`);
  assert.match(result.html, /<html lang="ru"/);
  assert.match(result.html, /ОГЭ/);
  return [...result.html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(match => {
    const data = JSON.parse(match[1]); return data['@graph'] || [data];
  });
}

async function main() {
  const sitemap = await get('/sitemap.xml');
  assert.equal(sitemap.status, 200);
  const sitemapPaths = [...sitemap.html.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => decodeEntities(match[1]).replace(canonicalOrigin, ''));
  const urls = new Set(sitemapPaths);
  assert.equal(urls.size, sitemapPaths.length, 'Повторяющиеся URL в sitemap');
  pageMetadata(bank.path, await get(bank.path));
  assert.ok(urls.has(bank.path));
  let catalogues = 0;
  let catalogPages = 0;
  const checkedCatalogues = new Set();
  const codes = ['all', 'practical', ...bank.topics.flatMap(group => [group.code, ...group.children.map(([code]) => code)]), 'unclassified'];
  for (const topic of codes) {
    const selected = tasks.filter(task => ogeTaskMatchesTopic(task, topic));
    const pages = Math.max(1, Math.ceil(selected.length / OGE_PAGE_SIZE));
    for (let page = 1; page <= pages; page++) {
      const url = ogeCataloguePath({ topic, page });
      const result = await get(url);
      const data = pageMetadata(url, result);
      const expected = selected.slice((page - 1) * OGE_PAGE_SIZE, page * OGE_PAGE_SIZE).map(task => task.id);
      assert.deepEqual(taskIds(result.html), expected, `${url}: состав и порядок HTML`);
      const list = data.find(item => item['@type'] === 'CollectionPage').mainEntity;
      assert.equal(list.numberOfItems, selected.length, `${url}: полный размер подборки`);
      assert.deepEqual(list.itemListElement.map(item => item.position), expected.map((_, index) => (page - 1) * OGE_PAGE_SIZE + index + 1));
      assert.equal(urls.has(url), selected.length > 0, `${url}: наличие в sitemap`);
      if (!selected.length) assert.match(result.html, /name="robots" content="noindex,follow"/);
      if (page < pages) assert.ok(result.html.includes(`rel="next" href="${ogeCataloguePath({ topic, page: page + 1 }).replaceAll('&', '&amp;')}"`), `${url}: ссылка дальше`);
      if (page > 1) assert.ok(result.html.includes(`rel="prev" href="${ogeCataloguePath({ topic, page: page - 1 }).replaceAll('&', '&amp;')}"`), `${url}: ссылка назад`);
      checkedCatalogues.add(url); catalogPages++;
    }
    assert.equal((await get(ogeCataloguePath({ topic, page: pages + 1 }))).status, 404);
    catalogues++;
  }
  for (const url of sitemapPaths.filter(url => url.startsWith(bank.path + '?'))) assert.ok(checkedCatalogues.has(url), `${url}: необработанная страница sitemap`);

  let checkedTasks = 0;
  let nextTask = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (nextTask < tasks.length) {
      const task = tasks[nextTask++];
      const url = `/tasks/${task.id}`;
      const result = await get(url);
      const data = pageMetadata(url, result);
      assert.ok(urls.has(url));
      assert.deepEqual(taskIds(result.html), [task.id], `${url}: одно условие`);
      const resource = data.find(item => Array.isArray(item['@type']) && item['@type'].includes('LearningResource'));
      assert.equal(resource.identifier, task.id);
      assert.equal(resource.text, conditionText(task.fragment), `${url}: исходное условие`);
      assert.equal(resource.educationalLevel, 'Основное общее образование, 9 класс');
      assert.deepEqual(resource.about.slice(1).map(item => item.name), ogeTopicCodes(task, section).map(code => ogeTopicInfo(code, section).name), `${url}: проверенные темы в разметке страницы`);
      const breadcrumb = data.find(item => item['@type'] === 'BreadcrumbList');
      const firstTopic = ogeTopicCodes(task, section)[0];
      assert.equal(breadcrumb.itemListElement[1].item, canonicalOrigin + ogeCataloguePath({topic: firstTopic}), `${url}: переход в основную тему`);
      assert.ok(result.html.includes(bank.assetPrefix + 'styles.css'), `${url}: ресурсы банка ОГЭ`);
      assert.ok(result.html.includes(`<a class="task-permalink" href="/tasks/${task.id}">${task.sourceId}</a>`), `${url}: исходный номер и уникальная ссылка`);
      checkedTasks++;
      if (checkedTasks % 500 === 0) console.log(`tasks=${checkedTasks}/${tasks.length}`);
    }
  }));
  // Cover existing section routes and every other task URL without changing their data.
  let checkedExistingTasks = 0;
  const ogeTaskPaths = new Set(tasks.map(task => `/tasks/${task.id}`));
  // A combined two-bank run may cover these identical legacy routes once.
  // The default still checks every existing URL.
  const existingPaths = process.env.OGE_AUDIT_EXISTING === '0' ? [] : sitemapPaths.filter(url => !checkedCatalogues.has(url) && url !== bank.path && !ogeTaskPaths.has(url));
  let nextExisting = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (nextExisting < existingPaths.length) {
      const url = existingPaths[nextExisting++];
      assert.equal((await get(url)).status, 200, `${url}: прежний URL`);
      if (url.startsWith('/tasks/')) checkedExistingTasks++;
    }
  }));
  for (const suffix of ['?topic=unknown', '?topic=all&page=0', '?topic=all&page=01', '?topic=all&page=-1', '?topic=all&page=1.5', '?page=2']) {
    assert.equal((await get(bank.path + suffix)).status, 404, suffix);
  }
  const redirect = await get(bank.path + '?topic=all&page=1');
  assert.equal(redirect.status, 301); assert.equal(redirect.location, bank.path + '?topic=all');
  const queryUrl = ogeCataloguePath({ topic: 'all', query: tasks[0].id });
  const query = await get(queryUrl);
  assert.deepEqual(taskIds(query.html), [tasks[0].id]);
  assert.match(query.html, /name="robots" content="noindex,follow"/);
  const sourceQuery = await get(ogeCataloguePath({ topic: 'all', query: tasks[0].sourceId }));
  assert.deepEqual(taskIds(sourceQuery.html), [tasks[0].id], 'Поиск по оригинальному номеру ФИПИ');
  const unscopedQuery = await get(bank.path + '?q=' + tasks[0].sourceId);
  assert.deepEqual(taskIds(unscopedQuery.html), [tasks[0].id], 'Поиск без явной темы');
  const added = await get(ogeCataloguePath({ added: true }));
  assert.equal(added.status, 200); assert.match(added.html, /name="robots" content="noindex,follow"/);
  const otherBankPath = section === 'oge' ? '/oge-physics' : '/oge';
  assert.ok(query.html.includes(`href="${otherBankPath}"`), 'Навигация между банками ОГЭ');
  if (section === 'oge-physics') {
    // A real short-ID collision must never link physics to the mathematical condition/API.
    const collision = tasks.find(task => task.sourceId === '465498');
    assert.ok(collision);
    const physicsPage = await get(`/tasks/${collision.id}`);
    const mathPage = await get('/tasks/465498');
    assert.deepEqual(taskIds(physicsPage.html), [collision.id]);
    assert.deepEqual(taskIds(mathPage.html), ['465498']);
    assert.notEqual(conditionText(collision.fragment), conditionText(mathPage.html));
    assert.equal((await get('/api/solutions/' + collision.id)).status, 404);
  }
  const injection = await get(ogeCataloguePath({ topic: 'all', query: '<script>alert(1)</script>' }));
  assert.equal(injection.status, 200); assert.ok(!injection.html.includes('<script>alert(1)</script>'));
  const globalSearch = await get(`/search?q=${tasks[0].id}`);
  if ([302, 303].includes(globalSearch.status)) assert.equal(globalSearch.location, `/tasks/${tasks[0].id}`);
  else {
    assert.equal(globalSearch.status, 200);
    assert.ok(globalSearch.html.includes(`/tasks/${tasks[0].id}`));
    assert.ok(globalSearch.html.includes(bank.name));
  }
  assert.equal((await get(`/tasks/${tasks[0].id.toLowerCase()}`)).status, 301);
  const solution = await get(`/api/solutions/${tasks[0].id}`);
  assert.ok([200, 404].includes(solution.status));
  if (solution.status === 200) assert.equal(JSON.parse(solution.html).taskId, tasks[0].id);
  const report = { section, catalogues, catalogPages, ogeTasks: checkedTasks, existingTasks: checkedExistingTasks, sitemapUrls: urls.size, errors: 0 };
  const output = path.resolve(process.env.OGE_AUDIT_REPORT || `storage/${section}-http-report.json`);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
