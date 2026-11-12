'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const {allocate, rateModel, solveRates} = require('./lib/ege-informatics-interpretations-machine');
const {auditInterpretations} = require('./lib/audit-ege-informatics-interpretations');
const records = require('./data/ege-informatics-interpretations-records.json');
const sources = require('./data/ege-informatics-interpretations-sources.json');
const tasks = require('./lib/oge-catalog').readOgeCatalog(undefined, 'ege-informatics').tasks;

test('All eleven calculations retain conditional labels and reject bare answers', () => {
  assert.equal(records.length, 11);
  for (const record of records) {
    const task = tasks.find(t => t.id === record.id), source = sources[record.id];
    assert.equal(auditInterpretations(task, record, source).answer, record.answer);
    assert.match(record.answer, /^При /);
    assert.throws(() => auditInterpretations(task, {...record, answer: '344 53'}, source), /answer/);
    assert.throws(() => auditInterpretations(task, record, {...source, answerStatus: 'official'}), /conditional/);
    assert.throws(() => auditInterpretations({...task, fragment: task.fragment.replace('Впишите', 'Удалено')}, record, source), /condition/);
    assert.throws(() => auditInterpretations(task, {...record, solution: record.solution.replace('Проверка', 'Скрыто')}, source), /explanation/);
  }
});

test('Literal and hypothesized rates give different exact answers without rounding', () => {
  const record = records.find(r => r.id === 'EGEINF5459A3');
  const m = rateModel(sources[record.id].fipiCondition), result = solveRates(m);
  assert.equal(result.power.conditionalAnswer, 'Б15');
  assert.equal(result.literal.conditionalAnswer, 'А1572738/7');
  assert.throws(() => rateModel(sources[record.id].fipiCondition.replace('224 бит', '2²⁴ бит')), /parameters/);
});

test('Arrival rules include the next minute, minimal free cell and last-time minimum', () => {
  assert.deepEqual(allocate(1, [[1, 2], [2, 3], [3, 4]], 'end-ascending').answer, [2, 1]);
  assert.deepEqual(allocate(2, [[1, 3], [1, 2]], 'end-ascending').answer, [2, 1]);
  const rows = [[1, 10], [1, 2], [3, 4]];
  assert.deepEqual(allocate(1, rows, 'end-ascending').answer, [2, 1]);
  assert.deepEqual(allocate(1, rows, 'file-order').answer, [1, 1]);
  assert.throws(() => allocate(1, rows, 'unspecified'), /order/);
});

test('Changed attachment bytes cannot inherit a reviewed conditional answer', () => {
  const record = records.find(r => r.id === 'EGEINF290F15');
  const task = tasks.find(t => t.id === record.id);
  assert.throws(() => auditInterpretations(task, record, sources[record.id], () => Buffer.from('wrong file')), /archive/);
});
