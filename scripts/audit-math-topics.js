const assert = require('node:assert/strict');
const {readMathematicsCatalog} = require('./lib/mathematics-catalog');
const {assignments, MATH_TASK_TYPES, mathTaskAssignment, mathTaskType} = require('../lib/math-task-types');
const catalog = readMathematicsCatalog();
assert.equal(catalog.size, 1148, 'После обновления банка требуется повторная проверка типов');
assert.equal(Object.keys(assignments).length, 703);
const counts = Object.fromEntries(MATH_TASK_TYPES.map(t => [t.code, 0]));
let additions = 0;
for (const [id, record] of Object.entries(assignments)) {
  const task = catalog.get(id);
  assert.ok(task, id);
  assert.equal(mathTaskAssignment(task), record, `${id}: изменилось условие, формат ответа или КЭС`);
  assert.ok(record.batch && record.family, `${id}: не указано основание классификации`);
  if (record.part === 2) {
    assert.ok(['parameters', 'inequalities', 'numbers'].includes(record.type), id);
    additions++;
  }
}
for (const task of catalog.values()) {
  const type = mathTaskType(task);
  if (task.answerType === 'Краткий ответ') {
    assert.ok(type && type.code !== 'other', `${task.id}: требуется классификация первой части`);
    counts[type.group]++;
  } else assert.equal(type, null, task.id);
}
assert.deepEqual(Object.values(counts), [58,31,57,57,53,54,60,56,58,62,58,69]);
assert.equal(additions, 30);
console.log(JSON.stringify({catalog: catalog.size, firstPart: 673, secondPart: 475, additions, types: counts}));
