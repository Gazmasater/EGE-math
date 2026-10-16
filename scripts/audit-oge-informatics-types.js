'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { readOgeCatalog } = require('./lib/oge-catalog');
const { ogeTopicCodes, ogeTaskMatchesTopic } = require('../lib/oge-catalog');
const { reviewedOgeAssignment } = require('../lib/oge-classification');
const { types, catalogueSource } = require('../lib/oge-informatics-types');
const review = require('../lib/oge-informatics-classification.json');
const section = 'oge-informatics';
const {tasks} = readOgeCatalog(undefined, section);
assert.equal(review.count, tasks.length);
const rows = tasks.map(task => {
  const assignment = reviewedOgeAssignment(task, section);
  assert.ok(assignment, `${task.id}: требуется сверка изменённого условия`);
  const type = types.find(type => type.code === assignment.type);
  assert.ok(type, `${task.id}: неизвестный тип`);
  assert.deepEqual(ogeTopicCodes(task, section), assignment.topics);
  assert.equal(types.filter(type => ogeTaskMatchesTopic(task, type.code, section)).length, 1);
  return { id: task.id, sourceId: task.sourceId, originalTopics: task.ogeCodes, topics: assignment.topics,
    type: assignment.type, reason: assignment.rule, sourceTypes: assignment.sourceTypes || type.sourceTypes,
    comparison: 'skill-family', sourceSignature: assignment.sourceSignature };
});
const changed = rows.filter(row => row.originalTopics.join() !== row.topics.join()).length;
const summary = types.map(type => ({...type, count: rows.filter(row => row.type === type.code).length,
  exampleIds: rows.filter(row => row.type === type.code).slice(0,3).map(row => row.id)}));
const report = { checkedAt: review.checkedAt, catalogueSource, section, total: tasks.length, changed,
  comparison: review.comparison, types: summary, tasks: rows };
if (process.argv.includes('--write')) {
  const output = path.join(__dirname, '../docs/audits/oge-informatics-types-2026-10-17');
  fs.mkdirSync(output, {recursive:true});
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  const escape = text => String(text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
  fs.writeFileSync(path.join(output, 'index.html'), `<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Сверка типов информатики ОГЭ — 17.10.2026</title><style>body{max-width:1100px;margin:32px auto;padding:0 20px;font:16px/1.5 system-ui;color:#20324a}table{border-collapse:collapse;width:100%}td,th{padding:10px;border:1px solid #ccd6e2;text-align:left}a{color:#1769aa}.table{overflow:auto}</style><h1>Сверка типов информатики ОГЭ</h1><p>17 октября 2026. Проверены ${rows.length} условий ФИПИ, ${types.length} учебных групп, уточнены темы ${changed} заданий. Исходные КЭС сохранены.</p><p>Основа сравнения — <a href="${catalogueSource}">каталог «Решу ОГЭ»</a> и условия примеров в его рубриках. Это сопоставление навыков и семейств условий: оно не подтверждает совпадение каждого задания, рисунка и ответа. Дополнительные типы Д13 и Д19 не выдаются за текущий номер в экзамене. Решения не копировались и не публиковались.</p><div class="table"><table><thead><tr><th>Учебная группа</th><th>Типы источника</th><th>ФИПИ</th><th>Примеры ФИПИ</th><th>Рубрики для сверки</th></tr></thead><tbody>${summary.map(row => `<tr><td>${escape(row.name)}</td><td>${row.sourceTypes.join(', ')}</td><td>${row.count}</td><td>${row.exampleIds.map(id=>`<a href="https://ege-fipi.ru/tasks/${id}">${id}</a>`).join('<br>')}</td><td>${row.sources.map((url,i)=>`<a href="${escape(url)}">Источник ${i+1}</a>`).join('<br>')}</td></tr>`).join('')}</tbody></table></div><h2>Уточнения</h2><ul><li>150 задач о системах счисления: исходная тема 2.7 → учебная тема 2.6.</li><li>85 логических задач: исходная тема 2.8 → учебная тема 2.7.</li><li>169 задач на обработку потока данных: исходная тема 3.2 → учебная тема 3.5. Анализ ветвления и задача о двух границах остаются в 3.2.</li><li>79 задач об объёме текста дополнительно отнесены к кодированию 2.1; тема 2.2 сохранена.</li><li>103 задачи на составление последовательности команд соответствуют дополнительному типу Д13; основной тип 5 использован как близкая учебная группа, а не как подтверждение позиции в варианте.</li><li>Системы счисления объединяют перевод, сравнение и арифметику. Для арифметических вариантов подтверждён общий навык, не тождество конкретному внешнему заданию.</li></ul><p>Полная таблица по каждому ID: <a href="report.json">report.json</a>. Изменение условия делает его прежнюю классификацию недействительной и останавливает аудит.</p></html>\n`);
}
console.log(JSON.stringify({tasks: rows.length, types: types.length, changed, errors: 0}));
