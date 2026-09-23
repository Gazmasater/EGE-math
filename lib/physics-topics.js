const {createHash} = require('node:crypto');
const overrides = require('./physics-topic-overrides.json');

const PHYSICS_TOPICS = [
  {code: '1', name: 'Механика', children: [
    ['1.1', 'Кинематика'], ['1.2', 'Динамика'], ['1.3', 'Статика'],
    ['1.4', 'Законы сохранения'], ['1.5', 'Колебания и волны']
  ]},
  {code: '2', name: 'Молекулярная физика и термодинамика', children: [
    ['2.1', 'Молекулярная физика'], ['2.2', 'Термодинамика']
  ]},
  {code: '3', name: 'Электродинамика', children: [
    ['3.1', 'Электрическое поле'], ['3.2', 'Постоянный ток'], ['3.3', 'Магнитное поле'],
    ['3.4', 'Электромагнитная индукция'], ['3.5', 'Электромагнитные колебания и волны'], ['3.6', 'Оптика']
  ]},
  {code: '4', name: 'Квантовая физика', children: [
    ['4.1', 'Корпускулярно-волновой дуализм'], ['4.2', 'Физика атома'], ['4.3', 'Физика атомного ядра']
  ]}
];
const topics = PHYSICS_TOPICS.flatMap(group => [
  {code: group.code, name: group.name}, ...group.children.map(([code, name]) => ({code, name}))
]);
const topicMap = new Map(topics.map(topic => [topic.code, Object.freeze(topic)]));
const classifications = new WeakMap();

function physicsTopicInfo(code) {
  return topicMap.get(code) || null;
}

function conditionSha256(contentHtml) {
  return createHash('sha256').update(contentHtml).digest('hex');
}

function sourceTopicCodes(codes) {
  return [...new Set(codes.map(code => {
    const child = String(code).split('.').slice(0, 2).join('.');
    return physicsTopicInfo(child)?.code || physicsTopicInfo(String(code).split('.')[0])?.code;
  }).filter(Boolean))];
}

function physicsClassification(task) {
  if (!task) return {primaryTopic: null, secondaryTopics: [], topicCodes: [], sourceCodes: [], reviewStatus: 'source'};
  if (classifications.has(task)) return classifications.get(task);
  const sourceCodes = [...(task.codes || [])];
  const override = overrides[String(task.id || '').toUpperCase()];
  // Не применять ручную разметку к изменившемуся условию или новой исходной метке.
  // Аудит запрещает публикацию такого снимка; сайт до повторной проверки использует источник.
  const current = override && JSON.stringify(sourceCodes) === JSON.stringify(override.sourceCodes)
    && typeof task.contentHtml === 'string' && conditionSha256(task.contentHtml) === override.conditionSha256;
  const topicCodes = current ? [override.primaryTopic, ...override.secondaryTopics] : sourceTopicCodes(sourceCodes);
  const result = Object.freeze({
    primaryTopic: topicCodes[0] || null,
    secondaryTopics: Object.freeze(topicCodes.slice(1)),
    topicCodes: Object.freeze(topicCodes),
    sourceCodes: Object.freeze(sourceCodes),
    reviewStatus: current ? 'reviewed' : override ? 'stale' : 'source'
  });
  classifications.set(task, result);
  return result;
}

function taskMatchesTopic(task, code) {
  return Boolean(physicsTopicInfo(code)) && physicsClassification(task).topicCodes
    .some(value => value === code || value.startsWith(code + '.'));
}

function taskPhysicsTopic(task) {
  return physicsTopicInfo(physicsClassification(task).primaryTopic);
}

module.exports = {PHYSICS_TOPICS, topics, overrides, physicsTopicInfo, physicsClassification,
  sourceTopicCodes, conditionSha256, taskMatchesTopic, taskPhysicsTopic};
