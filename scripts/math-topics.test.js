const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {readMathematicsCatalog} = require('./lib/mathematics-catalog');
const types = require('../lib/math-task-types');
const catalog = readMathematicsCatalog();
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const context = {...types, normalizeTaskId: value => String(value).trim().toUpperCase()};
vm.createContext(context);
vm.runInContext(
  source.slice(source.indexOf('const MATH_TOPICS ='), source.indexOf('const YANDEX_METRIKA_HEAD ='))
  + source.slice(source.indexOf('function cleanPlainText('), source.indexOf('function truncateText('))
  + source.slice(source.indexOf('function sourceTaskEntries('), source.indexOf('function taskMatchesPhysicsCatalogTopic(')), context);
const files = fs.readdirSync(root).filter(name => /^mathematics-\d+\.raw\.html$/.test(name))
  .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
const fragments = files.flatMap(file => context.sourceTaskEntries(new TextDecoder('windows-1251').decode(fs.readFileSync(path.join(root, file)))).map(t => t.fragment));
const fullHtml = `<body>${fragments.join('')}</body>`;
const ids = html => Array.from(context.sourceTaskEntries(html), task => task.id);
const first = [...catalog.values()].filter(task => task.answerType === 'Краткий ответ');
const firstIds = first.map(task => task.id).sort();

test('Основной каталог и каждый фильтр содержат только первую часть; все 673 задания доступны', () => {
  assert.equal(first.length, 673);
  assert.deepEqual(ids(context.filterMathTopicHtml(fullHtml, 'all')).sort(), firstIds);
  assert.equal(ids(context.filterMathTopicHtml(fullHtml, '')).length, 0);
  const union = new Set();
  const stats = context.mathTopicStats(fullHtml);
  assert.equal(stats.total, 673);
  assert.equal(stats.counts.other, 0);
  for (const group of types.MATH_TASK_TYPES) {
    const selected = ids(context.filterMathTopicHtml(fullHtml, group.code));
    assert.equal(selected.length, stats.counts[group.code], group.code);
    for (const id of selected) {
      assert.equal(catalog.get(id).answerType, 'Краткий ответ', id);
      assert.equal(union.has(id), false, `${id}: повтор в основных типах`);
      union.add(id);
    }
    const children = group.children.flatMap(([code]) => {
      const childIds = ids(context.filterMathTopicHtml(fullHtml, code));
      assert.equal(childIds.length, stats.counts[code], code);
      return childIds;
    });
    assert.deepEqual(children.sort(), selected.sort(), group.code);
  }
  assert.deepEqual([...union].sort(), firstIds);
  for (const task of catalog.values()) if (task.answerType !== 'Краткий ответ') {
    assert.equal(context.mathTaskMatchesTopic({...task, meta: ''}, 'all'), false, task.id);
    assert.equal(types.mathTaskType(task), null, task.id);
  }
});

test('Старые ссылки КЭС также показывают только первую часть, без кредитов и задач на целые числа', () => {
  assert.deepEqual(ids(context.filterMathTopicHtml(fullHtml, '1.1')), ['6D1598']);
  assert.deepEqual(ids(context.filterMathTopicHtml(fullHtml, '1.2')).sort(), ['6D1598', 'ADEDE3', 'C1228A']);
  const stats = context.mathTopicStats(fullHtml);
  assert.equal(stats.counts['1.1'], 1);
  assert.equal(stats.counts['1.2'], 3);
  for (const [code, count] of Object.entries(stats.counts)) {
    assert.equal(ids(context.filterMathTopicHtml(fullHtml, code)).length, count, code);
  }
});

test('Типы определяются содержанием: проценты, формулы, графики и две группы вероятностей', () => {
  for (const [id, code] of Object.entries({
    '6D1598':'word-problems.percent', 'C1228A':'expressions.trigonometry', 'ADEDE3':'word-problems.percent',
    '2E36C3':'applied.algebraic', '196238':'graphs.exponential-log', '35F6F7':'function-study.extrema',
    'D13540':'derivative.tangent', '95F2C4':'probability-basic.classical', '8B6F73':'probability-compound.events'
  })) assert.equal(types.mathTaskType(catalog.get(id)).code, code, id);
  assert.equal(types.mathTaskAssignment(catalog.get('C009C4')).type, 'numbers');
});

test('Перестройка каталога сохраняет условия и метаданные, устаревшая разметка не применяется', () => {
  for (const task of context.sourceTaskEntries(context.filterMathTopicHtml(fullHtml, 'all'))) {
    assert.equal(task.contentHtml, catalog.get(task.id).contentHtml, task.id);
    assert.ok(types.mathTaskAssignment(task), task.id);
  }
  const original = catalog.get('6D1598');
  for (const changed of [{...original, contentHtml: original.contentHtml + ' '}, {...original, codes: ['1.1']}]) {
    assert.equal(types.mathTaskAssignment(changed), null);
    assert.equal(types.mathTaskType(changed).code, 'other');
  }
});
