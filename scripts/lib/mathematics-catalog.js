// Read the saved FIPI bank without starting HTTP or changing SQLite.
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const assert = require('node:assert/strict');
const {conditionText} = require('../../lib/seo-text');

function readMathematicsCatalog(root = path.resolve(__dirname, '../..')) {
  const tasks = new Map();
  const files = fs.readdirSync(root).filter(name => /^mathematics-\d+\.raw\.html$/.test(name))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
  assert.ok(files.length, 'Saved mathematics bank is missing');
  for (const file of files) {
    const html = new TextDecoder('windows-1251').decode(fs.readFileSync(path.join(root, file)));
    const starts = [...html.matchAll(/<div\s+class=['"][^'"]*\bqblock\b[^'"]*['"]\s+id=['"]q([A-Z0-9]+)['"][^>]*>/gi)];
    const bodyEnd = html.search(/<\/body\s*>/i);
    for (const [index, match] of starts.entries()) {
      const id = match[1].toUpperCase();
      assert.ok(!tasks.has(id), `${id}: duplicate mathematics task`);
      const fragment = html.slice(match.index, starts[index + 1]?.index ?? (bodyEnd < 0 ? html.length : bodyEnd));
      const metaOffset = fragment.search(new RegExp(`<div\\s+id=['"]i${id}['"][^>]*>`, 'i'));
      assert.ok(metaOffset >= 0, `${id}: missing metadata`);
      const contentHtml = fragment.slice(0, metaOffset), metaHtml = fragment.slice(metaOffset);
      const answerType = (metaHtml.match(/Тип ответа:<\/td><td>([^<]+)/)?.[1] || '').trim();
      const codes = [...metaHtml.matchAll(/<div>\s*([1-7](?:\.\d+)*)\s/gi)].map(m => m[1]);
      const images = [...new Set([...contentHtml.matchAll(/(?:src=["']|ShowPictureQ\(["'])([^"']+)/g)].map(m => m[1]))];
      tasks.set(id, {id, file, contentHtml, answerType, codes, images,
        text: conditionText(contentHtml).replace(/^Впишите правильный ответ\.\s*/, ''),
        sourceHash: createHash('sha256').update(contentHtml).digest('hex')});
    }
  }
  return tasks;
}

module.exports = {readMathematicsCatalog};
