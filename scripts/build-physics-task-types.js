// Структура типов: https://phys-ege.sdamgia.ru/prob_catalog.
// Разметка использует формат задания, вопрос и тему условия; это не нумерация КИМ.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {readPhysicsCatalog} = require('./lib/physics-catalog');
const {conditionText} = require('../lib/seo-text');
const {physicsClassification, conditionSha256} = require('../lib/physics-topics');
const reviews = require('./data/physics-type-reviews.json');
const {physicsTaskPart, physicsTaskTypeInfo} = require('../lib/physics-task-types');

function classify(task) {
  const text = conditionText(task.contentHtml).toLocaleLowerCase('ru-RU');
  const review = reviews[task.id];
  if (review) {
    assert.equal(conditionSha256(task.contentHtml), review.conditionSha256, `${task.id}: устарела ручная тема`);
    assert.deepEqual(task.codes, review.sourceCodes, `${task.id}: изменились исходные КЭС`);
    if (review.type) return review.type;
  }
  const primary = review?.primaryTopic || physicsClassification(task).primaryTopic;
  const domain = primary?.split('.')[0];
  if (primary === 'astronomy') return /зв[её]зд|герцшпрунга/.test(text) ? 'astronomy.stars' : 'astronomy.planets';
  if (/необходимо собрать экспериментальную установку|какие (?:два|две).{0,180}(?:необходим|следует|нужн|использовать|должен выбрать)/.test(text)) {
    return /оборудован|предмет|прибор.{0,30}(переч|допол)/.test(text) ? 'experiment.equipment' : 'experiment.conditions';
  }
  if (task.answerType !== 'Выбор ответов из предложенных вариантов' && /погрешност|цен[аыуе] деления/.test(text)) {
    return /косвенн|диаметр проволоки|диаметр горошин|толщин.{0,15}(бумаг|лист)/.test(text) ? 'measurement.indirect' : 'measurement.direct';
  }
  if (/верные утверждения о физических (явлениях|величинах)/.test(text)) return 'laws.statements';
  if (/даны следующие зависимости величин/.test(text)) return 'laws.graphs';
  const matching = task.answerType === 'Установление соответствия' || /установите соответствие между/.test(text);
  const changes = /характер.{0,12}изменени|1\)\s*увелич.{0,30}2\)\s*уменьш.{0,30}3\)\s*не измен/.test(text);
  if (matching || changes) {
    const group = {1: 'mechanics-change', 2: 'thermal-change', 3: 'electro-change', 4: 'quantum-change'}[domain];
    assert.ok(group, `${task.id}: тема соответствия`);
    return `${group}.${changes ? 'changes' : 'matching'}`;
  }
  if (task.answerType === 'Выбор ответов из предложенных вариантов') {
    const group = {1: 'mechanics-analysis', 2: 'thermal-analysis', 3: 'electro-analysis', 4: 'quantum-change'}[domain];
    assert.ok(group, `${task.id}: тема анализа`);
    return group + (domain === '4' ? '.analysis' : /график|диаграмм|таблиц/.test(text) ? '.graphs' : '.statements');
  }
  switch (primary) {
    case '1.1': return /график/.test(text) ? 'kinematics.graphs' : 'kinematics.motion';
    case '1.2': {
      const detailed = task.codes.find(code => /^1\.2\.[678]$/.test(code));
      if (detailed) return {'1.2.6': 'dynamics.gravity', '1.2.7': 'dynamics.elasticity', '1.2.8': 'dynamics.friction'}[detailed];
      return /коэффициент трения|сила трения|силы трения/.test(text) ? 'dynamics.friction' : /пружин|упруг|ж[её]стк/.test(text) ? 'dynamics.elasticity' : /тяготени|спутник|планет|гравитац/.test(text) ? 'dynamics.gravity' : 'dynamics.forces';
    }
    case '1.3': return 'statics-waves.statics';
    case '1.4': return task.codes.some(code => /^1\.4\.[123]$/.test(code)) || /импульс/.test(text) ? 'conservation.momentum' : 'conservation.energy';
    case '1.5': return /волн|звук/.test(text) ? 'statics-waves.waves' : 'statics-waves.oscillations';
    case '2.1': return /влажност|насыщенн|испарени|плавлен|кристал|жидкост|поверхностн/.test(text) ? 'molecular.matter' : 'molecular.gas';
    case '2.2': return /кпд|теплов.{0,10}(машин|двигател)|цикл/.test(text) ? 'thermodynamics.engines' : /газ/.test(text) ? 'thermodynamics.gas' : 'thermodynamics.heat';
    case '3.1': return 'electricity.field';
    case '3.2': return 'electricity.circuits';
    case '3.3': return 'magnetism.field';
    case '3.4': return 'magnetism.induction';
    case '3.5': return 'optics-waves.oscillations';
    case '3.6': return 'optics-waves.optics';
    case '4.1': return 'quantum.photons';
    case '4.2': return 'quantum.atom';
    case '4.3': return 'quantum.nucleus';
    default: throw new Error(`${task.id}: не определён тип задания (${primary})`);
  }
}
function build() {
  return Object.fromEntries([...readPhysicsCatalog(undefined, {allAnswerTypes: true}).values()]
    .filter(task => physicsTaskPart(task) === 1).sort((a, b) => a.id.localeCompare(b.id)).map(task => {
      const type = classify(task);
      assert.ok(physicsTaskTypeInfo(type), `${task.id}: неизвестный тип ${type}`);
      return [task.id, {type, answerType: task.answerType, sourceCodes: task.codes, conditionSha256: conditionSha256(task.contentHtml)}];
    }));
}
if (require.main === module) {
  const result = build(), file = path.resolve(__dirname, '../lib/physics-task-assignments.json');
  if (process.argv.includes('--write')) fs.writeFileSync(file, JSON.stringify(result, null, 2) + '\n');
  else assert.deepEqual(JSON.parse(fs.readFileSync(file)), result, 'Реестр типов должен соответствовать проверенным правилам');
  const counts = {};
  for (const row of Object.values(result)) {const group = row.type.split('.')[0];counts[group] = (counts[group] || 0) + 1;}
  console.log(JSON.stringify({firstPart: Object.keys(result).length, types: counts}));
}
module.exports = {classify, build};
