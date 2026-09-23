const assert = require('node:assert/strict');
const {readPhysicsCatalog} = require('./lib/physics-catalog');
const {topics, overrides, physicsClassification, physicsTopicInfo, conditionSha256, taskMatchesTopic} = require('../lib/physics-topics');
const catalog = readPhysicsCatalog();
assert.equal(catalog.size, 538, 'Состав исходного снимка: требуется повторный аудит после обновления');
assert.equal(Object.keys(overrides).length, 32, 'Число согласованных изменений разметки');
for (const [id, override] of Object.entries(overrides)) {
  const task = catalog.get(id);
  assert.ok(task, `${id}: задача отсутствует в исходном снимке`);
  assert.deepEqual(task.codes, override.sourceCodes, `${id}: исходные метки изменились`);
  assert.equal(conditionSha256(task.contentHtml), override.conditionSha256, `${id}: условие или рисунок изменены, нужна повторная сверка`);
  const codes = [override.primaryTopic, ...override.secondaryTopics];
  assert.equal(new Set(codes).size, codes.length, `${id}: повторные темы`);
  assert.ok(codes.every(code => code.includes('.') && physicsTopicInfo(code)), `${id}: неверная подтема`);
  assert.ok(override.reason.length > 20, `${id}: отсутствует обоснование`);
  assert.equal(physicsClassification(task).reviewStatus, 'reviewed', `${id}: исправление не применяется`);
}
const tasks = [...catalog.values()];
assert.deepEqual(tasks.filter(task => !physicsClassification(task).primaryTopic).map(t => t.id), [], 'Не должно быть задач вне всех тем');
assert.deepEqual(tasks.filter(task => physicsClassification(task).reviewStatus === 'stale').map(t => t.id), [], 'Устаревшие ручные метки');
const counts = Object.fromEntries(topics.map(topic => [topic.code, tasks.filter(task => taskMatchesTopic(task, topic.code)).length]));
assert.deepEqual(counts, {
  '1':142, '1.1':11, '1.2':42, '1.3':35, '1.4':36, '1.5':5,
  '2':140, '2.1':62, '2.2':53,
  '3':213, '3.1':33, '3.2':34, '3.3':25, '3.4':24, '3.5':8, '3.6':40,
  '4':49, '4.1':28, '4.2':1, '4.3':2
}, 'Зафиксированный состав тем после согласованных переносов');
const broadOnly = tasks.filter(task => physicsClassification(task).topicCodes.every(code => !code.includes('.')));
assert.equal(broadOnly.length, 125, 'Оставшиеся общие метки не классифицировать автоматически');
console.log(JSON.stringify({tasks:catalog.size, reviewed:Object.keys(overrides).length, missingTopics:0, broadOnly:broadOnly.length, counts, status:'ok'}));
