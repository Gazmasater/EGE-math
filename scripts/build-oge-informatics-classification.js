'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { readOgeCatalog } = require('./lib/oge-catalog');
const { ogeSourceSignature } = require('../lib/oge-classification');
const { classifyInformatics } = require('./lib/oge-informatics-classifier');
const { types, catalogueSource } = require('../lib/oge-informatics-types');
const section = 'oge-informatics';
const { tasks } = readOgeCatalog(undefined, section);
const assignments = {};
const counts = Object.fromEntries(types.map(type => [type.code, 0]));
for (const task of tasks) {
  const assignment = classifyInformatics(task);
  counts[assignment.type]++;
  assignments[task.id] = { sourceSignature: ogeSourceSignature(task), sourceCodes: task.ogeCodes, ...assignment };
}
const file = path.join(__dirname, '../lib/oge-informatics-classification.json');
if (process.argv.includes('--write')) {
  fs.writeFileSync(file, JSON.stringify({schemaVersion: 1, checkedAt: '2026-10-17', catalogueSource,
    comparison: 'Сопоставление навыков и семейств условий. Не подтверждает тождество каждого задания, рисунка, ответа или номера в экзаменационном варианте.',
    count: tasks.length, tasks: assignments}, null, 2) + '\n');
} else {
  const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(saved.count, tasks.length);
  assert.deepEqual(saved.tasks, assignments, 'Исходные условия или распределение изменились: требуется новая сверка');
}
console.log(JSON.stringify({tasks: tasks.length, counts, errors: 0}, null, 2));
