const assert = require('node:assert/strict');
const path = require('node:path');
const { readOgeCatalog } = require('./lib/oge-catalog');
const { OGE_BANKS, ogeTaskCodes, ogeTopicCodes, ogeTopicStats } = require('../lib/oge-catalog');
const { ogeSourceSignature, reviewedOgeAssignment } = require('../lib/oge-classification');
const review = require('../lib/oge-topic-assignments.json');

const root = path.resolve(__dirname, '..');
assert.equal(review.schemaVersion, 1);
const report = [];
for (const [section, bank] of Object.entries(OGE_BANKS)) {
  const { tasks } = readOgeCatalog(root, section);
  const rows = review.banks[section];
  const leaves = new Set(bank.topics.flatMap(group => group.children.map(([code]) => code)));
  assert.equal(rows.count, tasks.length, `${section}: новый состав банка требует аудита тем`);
  assert.deepEqual(Object.keys(rows.tasks).sort(), tasks.map(task => task.id).sort(), `${section}: потерянные или лишние записи аудита`);
  let changed = 0;
  for (const task of tasks) {
    const assignment = rows.tasks[task.id];
    assert.equal(assignment.sourceSignature, ogeSourceSignature(task), `${task.id}: условие изменилось после аудита`);
    assert.deepEqual(assignment.sourceCodes, ogeTaskCodes(task), `${task.id}: исходные КЭС изменились после аудита`);
    assert.ok(assignment.topics.length, `${task.id}: нет конкретной темы`);
    assert.equal(new Set(assignment.topics).size, assignment.topics.length, `${task.id}: повтор темы`);
    assert.ok(assignment.topics.every(code => leaves.has(code)), `${task.id}: неизвестная тема или только общий раздел`);
    assert.ok(reviewedOgeAssignment(task, section), `${task.id}: сайт не использует проверенное распределение`);
    assert.deepEqual(ogeTopicCodes(task, section), assignment.topics);
    if ([...assignment.sourceCodes].sort().join() !== [...assignment.topics].sort().join()) changed++;
  }
  const stats = ogeTopicStats(tasks, section);
  assert.equal(stats.counts.unclassified, 0, `${section}: есть нераспределённые задачи`);
  report.push({section, total: tasks.length, changed, unclassified: 0, emptyTopics: [...leaves].filter(code => !stats.counts[code]), counts: stats.counts});
}
console.log(JSON.stringify({checkedAt: new Date().toISOString(), banks: report}, null, 2));
