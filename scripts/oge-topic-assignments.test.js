const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readOgeCatalog } = require('./lib/oge-catalog');
const { ogeTaskCodes, ogeTopicCodes, ogeTaskMatchesTopic, ogeTopicStats } = require('../lib/oge-catalog');
const banks = new Map(['oge', 'oge-physics'].map(section => [section, new Map(readOgeCatalog(undefined, section).tasks.map(task => [task.id, task]))]));
const physical = id => banks.get('oge-physics').get(`OGEPHYS${id}`);

test('Период полураспада доступен в своей теме, исходный КЭС сохранён', () => {
  const task = physical('643D4C');
  assert.deepEqual(ogeTaskCodes(task), ['4.1']);
  assert.ok(ogeTaskMatchesTopic(task, '4.4', 'oge-physics'));
  assert.ok(ogeTaskMatchesTopic(task, '4', 'oge-physics'));
});
test('Неверный вариант ответа не превращает расширение рельсов в вынужденные колебания', () => {
  const task = physical('62AC06');
  assert.ok(ogeTaskMatchesTopic(task, '2.4', 'oge-physics'));
  assert.equal(ogeTaskMatchesTopic(task, '1.26', 'oge-physics'), false);
});
test('Электрический подъёмник не попадает в тепловые двигатели', () => {
  const task = physical('65087B');
  assert.ok(ogeTaskMatchesTopic(task, '3.10', 'oge-physics'));
  assert.equal(ogeTaskMatchesTopic(task, '2.14', 'oge-physics'), false);
});
test('Маятник отделён от волн и звука', () => {
  const task = physical('5A0F7E');
  assert.ok(ogeTaskMatchesTopic(task, '1.25', 'oge-physics'));
  assert.equal(ogeTaskMatchesTopic(task, '1.27', 'oge-physics'), false);
  assert.equal(ogeTaskMatchesTopic(task, '1.28', 'oge-physics'), false);
});
test('Общий текст о молнии не подменяет вопрос о распространении звука', () => {
  const task = physical('84453C');
  assert.ok(ogeTaskMatchesTopic(task, '1.28', 'oge-physics'));
  assert.equal(ogeTaskMatchesTopic(task, '3.1', 'oge-physics'), false);
});
test('Задача на приборы не теряет две предметные темы', () => {
  const task = physical('0F90D9');
  assert.ok(ogeTaskMatchesTopic(task, '1.31', 'oge-physics'));
  assert.ok(ogeTaskMatchesTopic(task, '2.17', 'oge-physics'));
  const stats = ogeTopicStats([task], 'oge-physics');
  assert.equal(stats.total, 1);
  assert.equal(stats.counts['methods'], 1);
});
test('Конкретные навыки математики не теряются за общим кодом', () => {
  assert.deepEqual(ogeTaskCodes(banks.get('oge').get('27FFA4')), ['8']);
  assert.ok(ogeTaskMatchesTopic(banks.get('oge').get('27FFA4'), '8.3'));
  assert.ok(ogeTaskMatchesTopic(banks.get('oge').get('0C154A'), '8.4'));
  assert.ok(ogeTaskMatchesTopic(banks.get('oge').get('A63D02'), '2.5'));
  assert.ok(ogeTaskMatchesTopic(banks.get('oge').get('494C47'), '2.1'));
});
test('Кубическое уравнение сохраняет тему преобразования многочленов', () => {
  const task = banks.get('oge').get('4AF24D');
  assert.ok(ogeTaskMatchesTopic(task, '3.1'));
  assert.ok(ogeTaskMatchesTopic(task, '2.3'));
});
test('График линейной функции сохраняет навык чтения декартовых координат', () => {
  const task = banks.get('oge').get('EBD148');
  assert.ok(ogeTaskMatchesTopic(task, '5.1'));
  assert.ok(ogeTaskMatchesTopic(task, '6.2'));
});
test('Старая проверка не применяется к изменённому условию или рисунку', () => {
  const task = { ...physical('643D4C') };
  assert.ok(ogeTopicCodes(task, 'oge-physics').includes('4.4'));
  task.fragment = task.fragment.replace('полураспада', 'совершенно другого процесса');
  assert.deepEqual(ogeTopicCodes(task, 'oge-physics'), ogeTaskCodes(task));
  const imageTask = { ...physical('643D4C') };
  imageTask.fragment = imageTask.fragment.replace(/(<img[^>]*src=["'])/, '$1changed-');
  assert.deepEqual(ogeTopicCodes(imageTask, 'oge-physics'), ogeTaskCodes(imageTask));
  const formulaTask = { ...physical('643D4C') };
  formulaTask.fragment = formulaTask.fragment.replace(/(<div[^>]*>)/, '$1<math><mfrac><mn>1</mn><mn>2</mn></mfrac></math>');
  assert.deepEqual(ogeTopicCodes(formulaTask, 'oge-physics'), ogeTaskCodes(formulaTask));
});
