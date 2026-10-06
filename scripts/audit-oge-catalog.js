const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { readOgeCatalog } = require('./lib/oge-catalog');
const { OGE_TOPICS, ogeTopicStats } = require('../lib/oge-catalog');
const { conditionText } = require('../lib/seo-text');

const root = path.resolve(__dirname, '..');
const { tasks, pages, assets } = readOgeCatalog(root);
assert.ok(pages.every((page, index) => page.number === index + 1), 'Нарушена последовательность страниц ОГЭ');
assert.ok(pages.slice(0, -1).every(page => page.count === 100), 'Неполная промежуточная страница ФИПИ');
assert.ok(pages.at(-1).count > 0 && pages.at(-1).count <= 100, 'Неверная последняя страница ФИПИ');
assert.ok(pages.every(page => page.reportedTotal === tasks.length), 'Число заданий не совпало со счётчиком ФИПИ');
const ids = new Set(tasks.map(task => task.id));
assert.equal(ids.size, tasks.length, 'Повторяются идентификаторы ОГЭ');
const types = new Map();
const allowedTypes = new Set(['Краткий ответ', 'Развернутый ответ', 'Выбор ответа из предложенных вариантов', 'Выбор ответов из предложенных вариантов', 'Установление соответствия']);
const knownCodes = new Set(OGE_TOPICS.flatMap(group => [group.code, ...group.children.map(([code]) => code)]));
for (const task of tasks) {
  assert.ok(conditionText(task.fragment), `${task.id}: пустое условие`);
  assert.ok(allowedTypes.has(task.answerType), `${task.id}: неизвестный тип ответа ${task.answerType}`);
  types.set(task.answerType, (types.get(task.answerType) || 0) + 1);
  for (const code of task.ogeCodes) {
    assert.ok(knownCodes.has(code) || knownCodes.has(code.split('.').slice(0, 2).join('.')), `${task.id}: неизвестный КЭС ${code}`);
  }
}
assert.ok(types.get('Краткий ответ') && types.get('Развернутый ответ'), 'Один из основных типов ответа отсутствует');
const assetRoot = path.join(root, 'fipi-assets', 'oge');
for (const relative of assets) {
  const target = path.resolve(assetRoot, ...relative.split('/'), ...(relative.endsWith('/') ? ['index.html'] : []));
  assert.ok(target.startsWith(`${assetRoot}${path.sep}`), `Некорректный путь ресурса: ${relative}`);
  assert.ok(fs.existsSync(target) && fs.statSync(target).size > 0, `Отсутствует ресурс: ${relative}`);
  if (/\.(?:png|gif|jpe?g)$/i.test(relative)) {
    const bytes = fs.readFileSync(target);
    assert.ok(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      || bytes.subarray(0, 3).toString() === 'GIF' || (bytes[0] === 255 && bytes[1] === 216), `Некорректный файл рисунка: ${relative}`);
  }
}
for (const file of fs.readdirSync(root).filter(name => name.endsWith('.raw.html') && !name.startsWith('oge-'))) {
  const html = new TextDecoder('windows-1251').decode(fs.readFileSync(path.join(root, file)));
  for (const match of html.matchAll(/<div\s+class=['"][^'"]*\bqblock\b[^'"]*['"]\s+id=['"]q([A-Z0-9]+)['"]/gi)) {
    assert.ok(!ids.has(match[1].toUpperCase()), `Идентификатор совпал с заданием ЕГЭ: ${match[1]}`);
  }
}
const stats = ogeTopicStats(tasks);
assert.ok(tasks.every(task => task.ogeCodes.length || stats.counts.unclassified), 'Задание потеряно вне тематического меню');
console.log(JSON.stringify({ pages: pages.length, tasks: tasks.length, answerTypes: Object.fromEntries(types), assets: assets.size, ...stats }, null, 2));
