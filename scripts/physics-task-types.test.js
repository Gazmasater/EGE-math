const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const types = require('../lib/physics-task-types');
const subjects = require('../lib/physics-topics');
const {readPhysicsCatalog} = require('./lib/physics-catalog');
const catalog = readPhysicsCatalog(undefined, {allAnswerTypes: true});
const root = path.resolve(__dirname, '..'), source = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const context = {...types, ...subjects, MATH_SECTIONS: [], normalizeTaskId: s => String(s).trim().toUpperCase()};
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('const MATH_TOPICS ='), source.indexOf('const YANDEX_METRIKA_HEAD ='))
  + source.slice(source.indexOf('function cleanPlainText('), source.indexOf('function truncateText('))
  + source.slice(source.indexOf('function sourceTaskEntries('), source.indexOf('function breadcrumbData(')), context);
const fragments = [...new Set([...catalog.values()].map(t => t.file))].flatMap(file =>
  Array.from(context.sourceTaskEntries(new TextDecoder('windows-1251').decode(fs.readFileSync(path.join(root, file)))), t => t.fragment));
const html = `<body>${fragments.join('')}</body>`, parsed = context.sourceTaskEntries(html);
const ids = content => Array.from(context.sourceTaskEntries(content), t => t.id).sort();

test('1806 заданий первой части распределены по типам; 538 развёрнутых отделены', () => {
  const stats = context.physicsCatalog(html), seen = new Set();
  assert.equal(stats.total, 1806);assert.equal(stats.secondTotal, 538);assert.equal(stats.counts.other, 0);
  assert.equal(Object.keys(types.assignments).length, 1806);
  for (const group of types.PHYSICS_TASK_TYPES) {
    const selected = Array.from(parsed).filter(t => context.taskMatchesPhysicsCatalogTopic(t, group.code));
    assert.equal(selected.length, stats.counts[group.code], group.code);
    const children = group.children.flatMap(([code]) => Array.from(parsed).filter(t => context.taskMatchesPhysicsCatalogTopic(t, code)).map(t => t.id));
    assert.deepEqual(children.sort(), selected.map(t => t.id).sort(), group.code);
    for (const task of selected) {assert.equal(types.physicsTaskPart(task), 1);assert.ok(!seen.has(task.id));seen.add(task.id);}
  }
  assert.equal(seen.size, 1806);
  assert.equal(stats.counts.astronomy, 44);
  assert.equal(stats.counts['quantum-change'], 72);
  assert.equal(stats.counts['measurement.indirect'], 5);
  assert.equal(stats.counts['measurement.direct'], 71);
  for (const t of parsed) {
    assert.equal(t.contentHtml, catalog.get(t.id).contentHtml, t.id);
    assert.equal(context.taskMatchesPhysicsCatalogTopic(t, 'all'), types.physicsTaskPart(t) === 1, t.id);
    assert.equal(context.taskMatchesPhysicsCatalogTopic(t, 'all', 2), types.physicsTaskPart(t) === 2, t.id);
    if (types.physicsTaskPart(t) === 1) assert.ok(types.physicsTaskAssignment(t), t.id);
  }
});

test('Серверные фильтры, старые КЭС и добавленные задания не смешивают части', () => {
  for (const part of [1, 2]) {
    const expected = [...catalog.values()].filter(t => types.physicsTaskPart(t) === part).map(t => t.id).sort();
    assert.deepEqual(ids(context.filterSectionHtml(html, 'physics', {physicsPart: part, physicsTopic: 'all'})), expected);
    const legacy = [...catalog.values()].filter(t => types.physicsTaskPart(t) === part && subjects.taskMatchesTopic(t, '1.1')).map(t => t.id).sort();
    assert.deepEqual(ids(context.filterSectionHtml(html, 'physics', {physicsPart: part, physicsTopic: '1.1'})), legacy);
  }
  assert.deepEqual(ids(context.filterSectionHtml(html, 'physics', {physicsPart: 1, allowedIds: new Set(['BBFB41', '083006'])})), ['BBFB41']);
  assert.equal(ids(context.filterSectionHtml(html, 'physics')).length, 2344, 'Полный источник сохранён для страниц задач');
  assert.equal(types.physicsTaskPart(catalog.get('FC2D8A')), 1, 'Единственный выбор одного ответа сохранён');
  assert.equal(types.physicsTaskPart({answerType: 'новый неизвестный формат'}), null);
});

test('Содержание задания отличает планирование опыта от анализа и соответствий', () => {
  const expected = {
    E41101: 'experiment.conditions', '70B4D7': 'experiment.conditions', '46D7FD': 'experiment.equipment',
    DDF127: 'electro-change.matching', AE92AD: 'electro-change.matching', '0A7DAC': 'electro-change.matching', E27EA7: 'thermal-analysis.graphs',
    '7D73C4': 'mechanics-analysis.graphs', '0A7743': 'mechanics-analysis.graphs', '33A2F0': 'mechanics-analysis.graphs',
    '72C2B7': 'measurement.direct', '617BD6': 'measurement.indirect', F13F4D: 'measurement.indirect',
    B044CF: 'measurement.indirect', '6FB53E': 'measurement.indirect', '2EC822': 'measurement.indirect',
    BBFB41: 'kinematics.graphs', '328611': 'dynamics.elasticity', '59B436': 'dynamics.gravity', '3EE5A8': 'electricity.field', '75F429': 'magnetism.induction', BA974A: 'dynamics.friction', '51C0F9': 'quantum.nucleus',
    E53EF5: 'mechanics-change.changes', B87A01: 'mechanics-change.matching', '45855A': 'quantum.photons',
    '0FDA4F': 'laws.statements', F85DF4: 'laws.graphs', '60B3E4': 'astronomy.stars', FC2D8A: 'conservation.momentum',
    '1F08A5': 'thermodynamics.heat', '5745AB': 'thermodynamics.heat', '3ABA89': 'thermodynamics.heat',
    '8A543D': 'quantum.nucleus', CE0949: 'astronomy.planets', '48B3FB': 'astronomy.stars', '0178B8': 'astronomy.planets',
    '192F48': 'thermodynamics.heat', FB590C: 'thermodynamics.heat', '7DA290': 'thermodynamics.heat',
    '480A51': 'molecular.matter', '82225A': 'molecular.matter', '8C933B': 'molecular.matter', '890891': 'molecular.matter'
  };
  for (const [id, code] of Object.entries(expected)) assert.equal(types.physicsTaskType(catalog.get(id)).code, code, id);
});

test('Изменённые условия и метки не получают устаревшую разметку; вторая часть не попадает в первую', () => {
  const task = catalog.get('BBFB41');
  for (const changed of [{...task, contentHtml: task.contentHtml + ' '}, {...task, codes: ['1.1']}, {...task, id: 'NEWID'}]) {
    assert.equal(types.physicsTaskAssignment(changed), null);
    assert.equal(types.physicsTaskType(changed).code, 'other');
  }
  assert.equal(types.physicsTaskType({...task, answerType: 'Развернутый ответ'}), null);
  assert.equal(types.physicsTaskTypeInfo('constructor'), null);
  for (const task of catalog.values()) if (types.physicsTaskPart(task) === 2) assert.equal(types.physicsTaskType(task), null, task.id);
});
