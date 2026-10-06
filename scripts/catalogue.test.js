const assert = require('node:assert/strict');
const test = require('node:test');
const {catalogueUrl, catalogueWindow, catalogueMatches, normalizeCatalogueQuery} = require('../lib/catalogue');

test('All conditions remain reachable exactly once across server pages', () => {
  const tasks = Array.from({length: 673}, (_, i) => ({id: String(i)}));
  const first = catalogueWindow(tasks), recovered = [];
  assert.equal(first.tasks.length, 12);
  for (let page = 1; page <= first.totalPages; page++) recovered.push(...catalogueWindow(tasks, page).tasks);
  assert.deepEqual(recovered, tasks);
  assert.equal(catalogueWindow(tasks, 57).tasks.length, 1);
  for (const page of [0, -1, 58, 1.5, Infinity, NaN]) assert.equal(catalogueWindow(tasks, page), null);
  assert.deepEqual(catalogueWindow([], 1).tasks, []);
  assert.equal(catalogueWindow([], 2), null);
});

test('Query state survives pagination and is safely encoded in local URLs', () => {
  const url = catalogueUrl('/physics?topic=measurement.direct', {page: 2, query: 'ток & <script>', taskId: 'A46BFA'});
  const parsed = new URL(url, 'https://ege-fipi.ru');
  assert.equal(parsed.searchParams.get('q'), 'ток & <script>');
  assert.equal(parsed.searchParams.get('topic'), 'measurement.direct');
  assert.equal(parsed.searchParams.get('page'), '2');
  assert.equal(parsed.hash, '#task-A46BFA');
  assert.ok(!url.includes('<script>'));
  assert.equal(catalogueUrl('/?topic=all&page=2&q=old'), '/?topic=all');
});

test('Catalogue search matches IDs and all condition terms, not scripts or task metadata', () => {
  const task = {id: 'A46BFA', contentHtml: '<div>Показания амперметра с учётом погрешности</div><script>secret()</script><div id="iA46BFA">КЭС: скрытые метаданные</div>'};
  assert.ok(catalogueMatches(task, 'a46bfa'));
  assert.ok(catalogueMatches(task, 'амперметра учетом'));
  assert.ok(!catalogueMatches(task, 'амперметра вольтметра'));
  assert.ok(!catalogueMatches(task, 'secret'));
  assert.ok(!catalogueMatches(task, 'метаданные'));
  assert.ok(!catalogueMatches(task, '!!!'));
  assert.equal(normalizeCatalogueQuery('  ток \n сила '), 'ток сила');
  assert.equal(normalizeCatalogueQuery('а'.repeat(100)).length, 80);
});
