'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {readOgeCatalog} = require('./lib/oge-catalog');
const {ogeBank, ogeTopicStats, ogeTaskMatchesTopic, ogeTaskNavigation, ogeAssetPaths, ogeIsExternalAsset} = require('../lib/oge-catalog');
const {reviewedOgeAssignment} = require('../lib/oge-classification');
const {classifyEgeInformatics} = require('./lib/ege-informatics-classifier');
const review = require('../lib/ege-informatics-classification.json');
const section = 'ege-informatics';
const {tasks, assets} = readOgeCatalog(undefined,section);
const byId = new Map(tasks.map(t=>[t.id,t]));

test('EGE informatics has complete, disjoint, signed study families', () => {
  assert.equal(tasks.length,2475);
  assert.deepEqual(Object.keys(review.tasks).sort(),tasks.map(t=>t.id).sort());
  const bank=ogeBank(section),stats=ogeTopicStats(tasks,section);
  for(const task of tasks) {
    assert.ok(reviewedOgeAssignment(task,section),task.id);
    assert.equal(bank.types.filter(type=>ogeTaskMatchesTopic(task,type.code,section)).length,1,task.id);
    assert.equal(review.tasks[task.id].type,classifyEgeInformatics(task).type);
  }
  assert.equal(bank.types.reduce((n,type)=>n+stats.counts[type.code],0),tasks.length);
  assert.equal(stats.counts.unclassified,0);
});

test('Task meaning distinguishes ambiguous words, old metadata and input formats', () => {
  for(const [id,type] of Object.entries({
    '1BE844':'information-volume', // A password stored in a database is a volume question.
    '41E442':'sorting', // Store records are processed by an algorithm, not a DB query.
    '290F15':'sorting', // A locker cell is not a spreadsheet cell.
    'B88351':'combinatorics', // Counting words is not a Fano code problem.
    '7257B4':'sorting', // Russian "файле все" is not two input files A/B.
    '0348F9':'large-data', '92F3E0':'string-executors', 'F1FE67':'executor-programs',
    '59D97F':'text-search', '0FD1C5':'spreadsheets', 'C22345':'large-data'
  })) assert.equal(review.tasks['EGEINF'+id].type,'type.'+type,id);
});

test('EGE source origin and namespace cannot point into OGE', () => {
  assert.equal(ogeBank(section).exam,'ЕГЭ');
  assert.equal(ogeBank(section).origin,'https://ege.fipi.ru');
  const ogeIds=new Set(readOgeCatalog(undefined,'oge-informatics').tasks.map(t=>t.id));
  for(const task of tasks) {
    assert.ok(task.id.startsWith('EGEINF'));
    assert.ok(!ogeIds.has(task.id));
    for(const [,href] of task.fragment.matchAll(/class="fipi-attachment" href="([^"]+)"/g)) assert.equal(new URL(href).origin,'https://ege.fipi.ru');
  }
  assert.equal([...assets].filter(p=>ogeIsExternalAsset(p,section)).length,388);
});

test('Changed conditions lose their reviewed classification', () => {
  const task={...tasks[0]};
  assert.ok(reviewedOgeAssignment(task,section));
  task.fragment=task.fragment.replace('TCP/IP','CHANGED');
  assert.equal(reviewedOgeAssignment(task,section),null);
});

test('Next task preserves family across page boundaries', () => {
  const selected=tasks.filter(t=>ogeTaskMatchesTopic(t,'type.games',section));
  const nav=ogeTaskNavigation(selected,{section,topic:'type.games'});
  assert.equal(nav[selected[11].id].href,`/ege-informatics?topic=type.games&page=2#q${selected[12].id}`);
});

test('Grouped games retain the common condition and independent question', () => {
  const grouped=tasks.filter(t=>t.fragment.includes('class="oge-shared-condition"'));
  assert.equal(grouped.length,129);
  for(const task of grouped) {
    assert.equal(review.tasks[task.id].type,'type.games');
    assert.equal((task.fragment.match(/class="oge-shared-condition"/g)||[]).length,1);
    assert.match(task.fragment,/Петя/);
    assert.match(task.fragment,/Ваня/);
  }
});
