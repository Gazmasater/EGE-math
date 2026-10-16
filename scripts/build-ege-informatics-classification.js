'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {readOgeCatalog} = require('./lib/oge-catalog');
const {ogeSourceSignature} = require('../lib/oge-classification');
const {classifyEgeInformatics} = require('./lib/ege-informatics-classifier');
const {types, catalogueSource} = require('../lib/ege-informatics-types');
const {tasks} = readOgeCatalog(undefined, 'ege-informatics');
const assignments = {};
const counts = Object.fromEntries(types.map(type => [type.code, 0]));
for (const task of tasks) {
  const assignment = classifyEgeInformatics(task);
  assert.ok(Object.hasOwn(counts, assignment.type), task.id);
  counts[assignment.type]++;
  assignments[task.id] = {sourceSignature: ogeSourceSignature(task), sourceCodes: task.ogeCodes, ...assignment};
}
const file = path.join(__dirname, '../lib/ege-informatics-classification.json');
const comparison = 'Сопоставлены учебные навыки и семейства условий с основными и дополнительными рубриками «Решу ЕГЭ» на 17.10.2026. Стабильные названия групп не задают номера экзаменационных заданий. Тождество каждой внешней задачи и её ответа не утверждается. Ответы и решения не копируются.';
const notes = [
  'Каталог источника меняет нумерацию: сети — 10, программы исполнителя — 13; поиск текста вынесен в Д29. Названия групп сайта не зависят от этих номеров.',
  'Старинные задачи о кратчайших и длиннейших маршрутах объединены по навыку анализа графов; не каждый вариант тождествен современному типу 1.',
  'Игры объединяют основные 19–21 и развёрнутые Д26; общие условия сохранены у всех вопросов блока.',
  'Файловая система — смежный навык дополнительных рубрик; четыре задачи на имена каталогов не объявляются точными аналогами восстановления URL.',
  'В программировании отделены анализ, исправление ошибок, написание программы, файлы с данными, сортировка и кластеризация.',
];
if (process.argv.includes('--write')) {
  fs.writeFileSync(file, JSON.stringify({schemaVersion:1,checkedAt:'2026-10-17',catalogueSource,comparison,notes,count:tasks.length,tasks:assignments},null,2)+'\n');
  const dir = path.join(__dirname, '../docs/audits/ege-informatics-types-2026-10-17');
  fs.mkdirSync(dir,{recursive:true});
  const groups = types.map(type => ({...type,count:counts[type.code],taskIds:tasks.filter(t=>assignments[t.id].type===type.code).map(t=>t.id)}));
  const report = {checkedAt:'2026-10-17',catalogueSource,comparison,notes,total:tasks.length,groups};
  fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify(report,null,2)+'\n');
  const escape = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  fs.writeFileSync(path.join(dir,'index.html'),`<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Сверка типов ЕГЭ по информатике</title><style>body{font:16px/1.5 system-ui;max-width:1100px;margin:40px auto;padding:0 18px}table{border-collapse:collapse;width:100%}td,th{padding:10px;border:1px solid #ddd;text-align:left}a{color:#1769aa}details{margin:8px 0}code{overflow-wrap:anywhere}</style><h1>ЕГЭ по информатике: ${tasks.length} заданий</h1><p>${escape(comparison)}</p><p><a href="${catalogueSource}">Каталог сверки</a> · <a href="report.json">Все идентификаторы (JSON)</a></p><ul>${notes.map(n=>`<li>${escape(n)}</li>`).join('')}</ul><table><thead><tr><th>Учебная группа</th><th>Заданий</th><th>Рубрики сверки</th></tr></thead><tbody>${groups.map(g=>`<tr><td>${escape(g.name)}</td><td>${g.count}</td><td>${g.sourceTypes.join(', ')}<details><summary>Ссылки</summary>${g.sources.map(u=>`<div><a href="${escape(u)}">${escape(u)}</a></div>`).join('')}</details></td></tr>`).join('')}</tbody></table></html>`);
} else {
  const saved = JSON.parse(fs.readFileSync(file,'utf8'));
  assert.equal(saved.count,tasks.length);
  assert.deepEqual(saved.tasks,assignments,'Условия или распределение изменились: требуется новая сверка');
}
console.log(JSON.stringify({tasks:tasks.length,groups:Object.keys(counts).length,counts,errors:0},null,2));
