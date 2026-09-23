// Чтение исходного снимка без загрузки сервера и без записи в рабочую базу.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

function readPhysicsCatalog(root = path.resolve(__dirname, '../..'), options = {}) {
  const tasks = new Map();
  const files = fs.readdirSync(root).filter(name => /^physics-\d+\.raw\.html$/.test(name))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
  for (const file of files) {
    const html = new TextDecoder('windows-1251').decode(fs.readFileSync(path.join(root, file)));
    const starts = [...html.matchAll(/<div\s+class=['"][^'"]*\bqblock\b[^'"]*['"]\s+id=['"]q([A-Z0-9]+)['"][^>]*>/gi)];
    const bodyEnd = html.search(/<\/body\s*>/i);
    for (const [index, match] of starts.entries()) {
      const id = match[1].toUpperCase();
      const fragment = html.slice(match.index, starts[index + 1]?.index ?? (bodyEnd < 0 ? html.length : bodyEnd));
      const metaOffset = fragment.search(new RegExp(`<div\\s+id=['"]i${id}['"][^>]*>`, 'i'));
      const contentHtml = metaOffset < 0 ? fragment : fragment.slice(0, metaOffset);
      const metaHtml = metaOffset < 0 ? '' : fragment.slice(metaOffset);
      const answerType = (metaHtml.match(/class=['"]param-name['"][^>]*>\s*Тип ответа:\s*<\/td>\s*<td[^>]*>\s*([^<]+)/i)?.[1] || '').trim();
      if (!options.allAnswerTypes && answerType !== 'Развернутый ответ') continue;
      assert.ok(!tasks.has(id), `${id}: дубликат в исходном каталоге`);
      const codes = [...metaHtml.matchAll(/<div>\s*([1-5](?:\.\d+)*)\s/gi)].map(m => m[1]);
      tasks.set(id, {id, file, contentHtml, codes, answerType});
    }
  }
  return tasks;
}

module.exports = {readPhysicsCatalog};
