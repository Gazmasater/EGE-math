const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readPhysicsCatalog} = require('./lib/physics-catalog');
const {physicsClassification, taskMatchesTopic, taskPhysicsTopic, physicsTopicInfo, overrides} = require('../lib/physics-topics');
const catalog = readPhysicsCatalog();

// Содержательные контрольные примеры, а не ожидания, вычисленные из рабочего реестра.
const expected = {
  E24F06: ['1.2', '1.3'], '963FCF': ['3.4'], BE3A9E: ['1.3'], DA269B: ['1.3'],
  '030E68': ['3.3', '3.1'], D6F721: ['4.3', '2.1'], EBB156: ['4.3', '1.4'],
  FEB0F6: ['3.2'], B920BD: ['3.4', '3.2'], '71DCC4': ['3.4', '3.1'], B8648F: ['3.3', '3.1'],
  '1D4573': ['2.2', '2.1'], D76E33: ['2.2', '2.1'], '63AF96': ['2.2', '2.1'],
  FD2DC6: ['2.2', '2.1'], '8A1211': ['2.2', '2.1'], A0D359: ['2.2', '2.1'], C0FF8E: ['2.2', '2.1'],
  '33447A': ['2.1', '1.3'], '2D0E11': ['2.1', '1.3'], '5A1F95': ['2.1'],
  F6CC25: ['3.4'], '6DAEA0': ['3.4'], '3A5D9D': ['3.4'], '0A9533': ['2.1', '2.2'],
  '27370F': ['3.6'], ABDBC2: ['1.4'], '904AED': ['3.4', '3.3', '3.1'],
  '61B7ED': ['3.4', '3.3', '1.2'], '73F72D': ['3.4', '3.2'], '3ECDA4': ['1.5', '1.4', '1.2'],
  F717A0: ['1.5', '2.1', '1.2']
};

test('32 проверенных распределения: основная тема, дополнительные темы и родительские разделы', () => {
  assert.deepEqual(Object.keys(overrides).sort(), Object.keys(expected).sort());
  for (const [id, topicCodes] of Object.entries(expected)) {
    const task = catalog.get(id), classification = physicsClassification(task);
    assert.equal(classification.reviewStatus, 'reviewed', id);
    assert.deepEqual(classification.topicCodes, topicCodes, id);
    assert.equal(taskPhysicsTopic(task)?.code, topicCodes[0], id);
    assert.ok(topicCodes.every(code => taskMatchesTopic(task, code) && taskMatchesTopic(task, code.split('.')[0])), id);
  }
});

test('Неверные исходные темы удалены, а не добавлены к исправлениям', () => {
  for (const [id, code] of [['963FCF','1.5'],['E24F06','1.1'],['BE3A9E','1.4'],['DA269B','1.4'],
    ['030E68','4.3'],['030E68','1.4'],['D6F721','4.2'],['EBB156','4.2'],['1D4573','4'],['FEB0F6','3.3'],['B8648F','3.4']]) {
    assert.equal(taskMatchesTopic(catalog.get(id), code), false, `${id}: ${code}`);
  }
});

test('Не переносить по ключевым словам: свеча, маятник, лазер, альфа-частица', () => {
  for (const [id, code] of [['6090EE','3.2'],['6F1007','1.2'],['6FD77C','3.6'],['F17C45','2.2'],['8E6D33','3.3']]) {
    assert.equal(taskPhysicsTopic(catalog.get(id)).code, code, id);
    assert.equal(physicsClassification(catalog.get(id)).reviewStatus, 'source', id);
  }
});

test('Исходные коды не мутируют; неизвестные темы и пустые задачи не совпадают', () => {
  const task = catalog.get('030E68'), source = [...task.codes];
  const result = physicsClassification(task);
  assert.deepEqual(task.codes, source);
  assert.deepEqual(result.sourceCodes, ['1.4.5', '4.3']);
  assert.equal(taskMatchesTopic(task, '9.9'), false);
  assert.equal(taskMatchesTopic(null, '1'), false);
  assert.equal(physicsTopicInfo('constructor'), null);
  assert.equal(taskPhysicsTopic(null), null);
  assert.throws(() => result.topicCodes.push('4.3'), TypeError);
  assert.equal(taskPhysicsTopic({...task, id: '030e68'}).code, '3.3');
});

test('Изменённые условие, рисунок или исходная метка требуют новой проверки', () => {
  const task = catalog.get('963FCF');
  for (const changed of [{...task, contentHtml: task.contentHtml + '<img src="new.png">'}, {...task, codes: ['3.3']}, {...task, contentHtml: undefined}]) {
    assert.equal(physicsClassification(changed).reviewStatus, 'stale');
    assert.equal(taskMatchesTopic(changed, '3.4'), false);
  }
});

test('Общая метка не превращается автоматически в подтему; вложенные КЭС распознаются', () => {
  const broad = {id: 'UNREVIEWED', codes: ['1'], contentHtml: '1.5 в тексте не является меткой'};
  assert.equal(taskMatchesTopic(broad, '1'), true);
  assert.equal(taskMatchesTopic(broad, '1.5'), false);
  assert.equal(taskPhysicsTopic({codes:['3.2.10']}).code, '3.2');
});
