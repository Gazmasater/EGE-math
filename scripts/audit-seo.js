const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const {DatabaseSync} = require('node:sqlite');
const {readPhysicsCatalog} = require('./lib/physics-catalog');
const {topics, physicsClassification, taskMatchesTopic, taskPhysicsTopic} = require('../lib/physics-topics');
const root = path.resolve(__dirname, '..');
const origin = process.env.SEO_ORIGIN || 'http://127.0.0.1:8765';
const canonicalOrigin = 'https://ege-fipi.ru';
const output = path.resolve(process.env.SEO_ARTIFACTS || '/tmp/ege-seo-audit');
fs.mkdirSync(output, {recursive: true});
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const server = process.env.SEO_SERVER ? spawn(process.execPath, [process.env.SEO_SERVER], {env: {...process.env, PORT: new URL(origin).port}, stdio: 'ignore'}) : null;
const unescape = text => text.replace(/&(amp|lt|gt|quot|#39);/g, (_, name) => ({amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'"}[name]));
const attribute = (tag, key) => unescape(tag.match(new RegExp(`\\b${key}=["']([^"']*)["']`, 'i'))?.[1] || '');
const idsIn = html => Array.from(html.matchAll(/class=["'][^"']*\bqblock\b[^"']*["']\s+id=["']q([A-Z0-9]+)["']/gi), m => m[1].toUpperCase());
function inspect(html) {
  const head = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1] || '';
  const tags = Array.from(head.matchAll(/<meta\b[^>]*>/gi), m => m[0]);
  const meta = name => tags.filter(tag => attribute(tag, 'name') === name || attribute(tag, 'property') === name).map(tag => attribute(tag, 'content'));
  const graph = Array.from(head.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g), m => JSON.parse(m[1])).flatMap(data => data['@graph'] || [data]);
  return {
    title: unescape(head.match(/<title>([^<]*)<\/title>/)?.[1] || ''), description: meta('description'), robots: meta('robots'),
    canonical: attribute(head.match(/<link\b[^>]*rel="canonical"[^>]*>/)?.[0] || '', 'href'),
    ogUrl: meta('og:url'), ogTitle: meta('og:title'), ogDescription: meta('og:description'),
    h1: Array.from(html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi), m => m[1]), graph
  };
}
const report = {origin, checkedAt: new Date().toISOString(), catalogs: [], tasks: [], networkRetries: [], errors: []};
function check(test, message) {if (!test) report.errors.push(message);}
function checkPage(url, html, status, indexable = true) {
  const data = inspect(html);
  check(status === 200, `${url}: HTTP ${status}`);
  check(data.canonical === canonicalOrigin + url, `${url}: canonical ${data.canonical}`);
  check(data.h1.length === 1 && data.h1[0].length > 5, `${url}: один содержательный H1`);
  check(data.title.length > 15 && data.title.length < 150, `${url}: title`);
  check(data.description.length === 1 && data.description[0].length >= 30 && data.description[0].length <= 260, `${url}: description`);
  check(!/&(?:#[x\d][\da-f]*|[a-z][a-z\d]+);/i.test(data.description.join('') + data.title), `${url}: непреобразованная HTML-сущность`);
  check(data.robots.length === 1 && data.robots[0] === (indexable ? 'index,follow' : 'noindex,follow'), `${url}: robots`);
  check(data.ogUrl[0] === data.canonical && data.ogTitle[0] === data.title && data.ogDescription[0] === data.description[0], `${url}: Open Graph согласован`);
  const crumbs = data.graph.find(item => item['@type'] === 'BreadcrumbList');
  check(crumbs?.itemListElement.at(-1)?.item === data.canonical, `${url}: хлебные крошки JSON-LD`);
  check(html.includes('class="seo-breadcrumbs"'), `${url}: видимые хлебные крошки`);
  return data;
}
async function get(url, options) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(origin + url, {...options, signal: AbortSignal.timeout(30000)});
      return {status: response.status, html: await response.text(), location: response.headers.get('location')};
    } catch (error) {
      if (attempt === 3) throw new Error(`${url}: request failed after ${attempt} attempts`, {cause: error});
      report.networkRetries.push({url, attempt, error: String(error), cause: error.cause?.code || error.cause?.message || ''});
      await delay(attempt * 250);
    }
  }
}
async function run() {
  if (server) {
    let ready = false;
    for (let n = 0; n < 100; n++) {try {ready = (await get('/robots.txt')).status === 200;} catch {} if (ready) break; await delay(100);}
    assert.ok(ready, 'Предпросмотр не запустился');
  }
  const db = new DatabaseSync(path.join(root, 'storage/solutions.sqlite'), {readOnly: true});
  const published = new Set(db.prepare('SELECT task_id FROM solutions WHERE published=1').all().map(row => row.task_id));db.close();
  const physics = readPhysicsCatalog(root);
  for (const task of physics.values()) check(physicsClassification(task).reviewStatus !== 'stale', `${task.id}: классификация требует повторной проверки источника`);
  const expectedSections = {'/':66, '/planimetry':75, '/parameters':57, '/equations':67, '/inequalities':63, '/optimal':2, '/numbers':51, '/finance':64, '/physics':538};
  const mathIds = new Set(), catalogDescriptions = new Set();
  const topicCodes = topics.map(topic => topic.code);
  const topicIds = Object.fromEntries(topicCodes.map(code => [code, [...physics.values()].filter(task => taskMatchesTopic(task, code)).map(task => task.id).sort()]));
  const sitemap = await get('/sitemap.xml');check(sitemap.status === 200, 'sitemap: HTTP 200');
  const urls = Array.from(sitemap.html.matchAll(/<loc>(.*?)<\/loc>/g), m => unescape(m[1]));
  const urlSet = new Set(urls);check(urls.length === urlSet.size, 'sitemap: нет дубликатов');
  const mathHub = await get('/math');
  const mathHubData = checkPage('/math', mathHub.html, mathHub.status);
  check(mathHubData.title.includes('Решения задач по математике ФИПИ'), '/math: title под широкий запрос');
  check(mathHub.html.match(/class="math-hub-card"/g)?.length === 8, '/math: восемь математических разделов');
  check(mathHub.html.includes('445 заданий') && mathHub.html.includes('445 подробных решений'), '/math: сводное число заданий и решений');
  const mathHubList = mathHubData.graph.find(graph => graph['@type'] === 'CollectionPage')?.mainEntity;
  check(mathHubList?.numberOfItems === 8, '/math: JSON-LD ItemList');
  check(JSON.stringify((mathHubList?.itemListElement || []).map(item => item.url).sort()) === JSON.stringify([
    '/', '/planimetry', '/parameters', '/equations', '/inequalities', '/optimal', '/numbers', '/finance'
  ].map(url => canonicalOrigin + url).sort()), '/math: ссылки JSON-LD');
  check(urlSet.has(canonicalOrigin + '/math'), 'sitemap: раздел математики');
  const catalogPaths = [...Object.keys(expectedSections), ...topicCodes.map(code => `/physics?topic=${code}`)];
  for (const url of catalogPaths) {
    const code = new URL(url, origin).searchParams.get('topic');
    const expected = code ? topicIds[code] : null;
    const {status, html} = await get(url), ids = idsIn(html);
    const data = checkPage(url, html, status, code ? expected.length > 0 : true);
    check(ids.length === new Set(ids).size, `${url}: нет повторных заданий`);
    if (expected) check(JSON.stringify([...ids].sort()) === JSON.stringify(expected), `${url}: точный состав проверенной темы в HTML до JavaScript`);
    else check(ids.length === expectedSections[url], `${url}: число задач ${ids.length}`);
    if (url !== '/physics' && !code) ids.forEach(id => mathIds.add(id));
    if (url === '/physics' || code) for (const topicCode of topicCodes) {
      const counter = html.match(new RegExp(`data-physics-topic="${topicCode.replaceAll('.', '\\.')}"[^>]*>[\\s\\S]*?<span class="physics-topic-count">— (\\d+)</span>`));
      check(Number(counter?.[1]) === topicIds[topicCode].length, `${url}: счётчик ${topicCode}`);
    }
    check(!catalogDescriptions.has(data.description[0]), `${url}: уникальное описание темы`);catalogDescriptions.add(data.description[0]);
    check(urlSet.has(canonicalOrigin + url) === (!code || expected.length > 0), `${url}: соответствие sitemap и индексации`);
    const list = data.graph.find(g => g['@type'] === 'CollectionPage')?.mainEntity;
    check(list?.numberOfItems === ids.length, `${url}: число задач в ItemList`);
    check(JSON.stringify((list?.itemListElement || []).map(i => i.url).sort()) === JSON.stringify(ids.map(id => `${canonicalOrigin}/tasks/${id}`).sort()), `${url}: ссылки ItemList`);
    report.catalogs.push({url, count: ids.length, bytes: Buffer.byteLength(html), title: data.title, description: data.description[0], canonical: data.canonical});
  }
  check(mathIds.size === 445, 'Математика: 445 уникальных задач');
  check(physics.size === 538, 'Физика: 538 уникальных задач');
  const expectedIds = [...new Set([...mathIds, ...physics.keys()])].sort();
  const sitemapIds = urls.filter(url => /\/tasks\//.test(url)).map(url => url.split('/').at(-1)).sort();
  check(JSON.stringify(sitemapIds) === JSON.stringify(expectedIds), 'sitemap: все 983 задачи');
  let cursor = 0;
  const concurrency = Number(process.env.SEO_CONCURRENCY || 4);
  assert.ok(Number.isInteger(concurrency) && concurrency >= 1 && concurrency <= 8, 'SEO_CONCURRENCY: 1–8');
  const workers = await Promise.allSettled(Array.from({length: concurrency}, async () => {
    while (cursor < expectedIds.length) {
      const id = expectedIds[cursor++], url = `/tasks/${id}`;
      const {status, html} = await get(url), data = checkPage(url, html, status);
      const isPhysics = physics.has(id), solved = published.has(id);
      check(isPhysics ? data.title.includes('ЕГЭ по физике') && !data.title.includes('профиль') : data.title.includes('математике, профиль'), `${id}: предмет в title`);
      check(data.title.includes(id) && data.description[0]?.includes(id), `${id}: идентификатор в метаданных`);
      check(data.title.includes(solved ? 'ответ и решение' : 'условие'), `${id}: наличие решения в title`);
      check(html.includes('class="seo-task-solution"') === solved, `${id}: опубликованное решение в серверном HTML`);
      const resource = data.graph.find(g => Array.isArray(g['@type']) && g['@type'].includes('LearningResource'));
      if (isPhysics) {
        const task = physics.get(id), topic = taskPhysicsTopic(task);
        const topicPath = topic ? `/physics?topic=${topic.code}` : '/physics';
        const crumbs = data.graph.find(item => item['@type'] === 'BreadcrumbList')?.itemListElement || [];
        check(data.title.includes(`${topic?.name || 'Физика'}:`), `${id}: основная тема в title`);
        check(crumbs.at(-2)?.item === canonicalOrigin + topicPath, `${id}: основная тема в хлебных крошках`);
        const expectedAbout = ['Физика', ...physicsClassification(task).topicCodes.map(code => topics.find(t => t.code === code).name)];
        check(JSON.stringify(resource?.about?.map(t => t.name)) === JSON.stringify(expectedAbout), `${id}: основные и дополнительные темы JSON-LD`);
        const navigation = html.match(/<nav class="task-sequence-pager"[\s\S]*?<\/nav>/)?.[0] || '';
        check(navigation.includes(`href="${topicPath}"`), `${id}: возврат в основную тему`);
        for (const neighbor of navigation.matchAll(/href="\/tasks\/([A-Z0-9]+)"/g)) {
          check(topic ? topicIds[topic.code].includes(neighbor[1]) : physics.has(neighbor[1]), `${id}: сосед ${neighbor[1]} из своей темы`);
        }
      }
      check(resource?.identifier === id && resource?.url === data.canonical && resource?.text?.length > 15, `${id}: LearningResource`);
      check(!/СВОЙСТВА ЗАДАНИЯ|Статус задания:|Дайте разв[её]рнутый ответ/i.test(resource?.text || ''), `${id}: в описании только условие`);
      report.tasks.push({id, subject: isPhysics ? 'physics' : 'math', status, published: solved, title: data.title, description: data.description[0]});
      if (report.tasks.length % 200 === 0) console.log(`SEO: проверено ${report.tasks.length} задач`);
    }
  }));
  for (const result of workers) if (result.status === 'rejected') report.errors.push(String(result.reason));
  check(report.tasks.length === expectedIds.length, 'Проверка HTTP охватила каждую задачу');
  check(new Set(report.tasks.map(t => t.title)).size === expectedIds.length, 'У задач уникальные title');
  check(new Set(report.tasks.map(t => t.description)).size === expectedIds.length, 'У задач уникальные description');
  for (const url of ['/physics?topic=9.9', '/tasks/ZZZZZZ']) {
    const {status, html} = await get(url);check(status === 404 && html.includes('noindex'), `${url}: 404, noindex`);
  }
  const redirect = await get('/tasks/9ac70f', {redirect: 'manual'});
  check(redirect.status === 301 && redirect.location === '/tasks/9AC70F', '301 на канонический регистр');
  const search = await get('/search?q=скорость');
  check(inspect(search.html).robots[0] === 'noindex,follow', 'Поиск закрыт от индексации');
  const added = await get('/added?section=physics');
  checkPage('/added?section=physics', added.html, added.status, false);
  const robots = await get('/robots.txt');
  check(robots.status === 200 && robots.html.includes(`Sitemap: ${canonicalOrigin}/sitemap.xml`) && !robots.html.includes('Disallow: /tasks'), 'robots.txt');
  report.tasks.sort((a, b) => a.id.localeCompare(b.id));
  fs.writeFileSync(path.join(output, 'seo-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({catalogs: report.catalogs.length, tasks: report.tasks.length, published: report.tasks.filter(t => t.published).length, sitemap: urls.length, errors: report.errors, artifacts: output}));
  assert.deepEqual(report.errors, [], 'SEO-аудит');
}
run().catch(error => {console.error(error);process.exitCode = 1;}).finally(async () => {server?.kill();if (server) await delay(300);});
