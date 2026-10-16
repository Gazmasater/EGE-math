'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { readOgeCatalog } = require('./lib/oge-catalog');
const { ogeBank, ogeTaskCodes, ogeTopicCodes, ogeTaskMatchesTopic, ogeTopicStats, ogeTaskNavigation } = require('../lib/oge-catalog');
const { reviewedOgeAssignment } = require('../lib/oge-classification');
const review = require('../lib/oge-informatics-classification.json');
const section = 'oge-informatics';
const { tasks } = readOgeCatalog(undefined, section);
const byId = new Map(tasks.map(task => [task.id, task]));

test('Every imported condition has one reviewed family; counts form a partition', () => {
  assert.equal(review.count, tasks.length);
  assert.deepEqual(Object.keys(review.tasks).sort(), tasks.map(t => t.id).sort());
  const types = ogeBank(section).types;
  for (const task of tasks) {
    assert.ok(reviewedOgeAssignment(task, section), task.id);
    assert.equal(types.filter(type => ogeTaskMatchesTopic(task, type.code, section)).length, 1, task.id);
  }
  const stats = ogeTopicStats(tasks, section);
  assert.equal(types.reduce((sum, type) => sum + stats.counts[type.code], 0), tasks.length);
});

test('Identical FIPI KES codes do not merge distinct task families', () => {
  const pairs = [
    ['OGEINF44E848', 'type.4', 'OGEINFFE2246', 'type.9'],
    ['OGEINFDDA24D', 'type.6', 'OGEINFF1B54B', 'type.16'],
    ['OGEINFB2B244', 'type.11', 'OGEINF2D961D', 'type.12']
  ];
  for (const [id1, type1, id2, type2] of pairs) {
    const a = byId.get(id1), b = byId.get(id2);
    assert.deepEqual(ogeTaskCodes(a), ogeTaskCodes(b));
    assert.equal(ogeTaskMatchesTopic(a, type1, section), true);
    assert.equal(ogeTaskMatchesTopic(a, type2, section), false);
    assert.equal(ogeTaskMatchesTopic(b, type2, section), true);
    assert.equal(ogeTaskMatchesTopic(b, type1, section), false);
  }
});

test('Reviewed topics follow the skill while original KES remain intact', () => {
  for (const [id, original, reviewed] of [['OGEINF06EB4F','2.7','2.6'], ['OGEINF0A6843','2.8','2.7'], ['OGEINFF1B54B','3.2','3.5']]) {
    assert.deepEqual(ogeTaskCodes(byId.get(id)), [original]);
    assert.deepEqual(ogeTopicCodes(byId.get(id), section), [reviewed]);
  }
  assert.deepEqual(reviewedOgeAssignment(byId.get('OGEINF4A5F46'), section).sourceTypes, ['Д13']);
});

test('A changed condition cannot retain a previously reviewed type', () => {
  const task = { ...byId.get('OGEINF44E848') };
  assert.equal(ogeTaskMatchesTopic(task, 'type.4', section), true);
  task.fragment = task.fragment.replace('кратчайшего', 'другого');
  assert.equal(reviewedOgeAssignment(task, section), null);
  assert.equal(ogeTaskMatchesTopic(task, 'type.4', section), false);
  assert.deepEqual(ogeTopicCodes(task, section), task.ogeCodes);
});

test('Next task stays in the selected family across a page boundary', () => {
  const selected = tasks.filter(task => ogeTaskMatchesTopic(task, 'type.9', section));
  const navigation = ogeTaskNavigation(selected, {section, topic: 'type.9', page: 1});
  assert.equal(navigation[selected[11].id].id, selected[12].id);
  assert.equal(navigation[selected[11].id].href, `/oge-informatics?topic=type.9&page=2#q${selected[12].id}`);
});
