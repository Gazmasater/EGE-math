const fs = require('node:fs');
const path = require('node:path');
const { ogeTaskCodes, normalizeOgeSourceHtml, ogeAssetPaths } = require('../../lib/oge-catalog');

function readOgeCatalog(root = path.resolve(__dirname, '../..')) {
  const files = fs.readdirSync(root).map(name => ({ name, number: Number(name.match(/^oge-(\d+)\.raw\.html$/i)?.[1]) }))
    .filter(file => file.number).sort((a, b) => a.number - b.number);
  if (!files.length) throw new Error('Банк ОГЭ не найден. Запустите npm run fetch:oge.');
  const decoder = new TextDecoder('windows-1251');
  const tasks = [];
  const pages = [];
  const assets = new Set();
  for (const { name, number } of files) {
    const raw = decoder.decode(fs.readFileSync(path.join(root, name)));
    const html = normalizeOgeSourceHtml(raw);
    const starts = [...html.matchAll(/<div\s+class=['"][^'"]*\bqblock\b[^'"]*['"]\s+id=['"]q([A-Z0-9]+)['"][^>]*>/gi)];
    pages.push({ name, number, count: starts.length, reportedTotal: Number(html.match(/setQCount\((\d+)/)?.[1]) });
    for (const [index, match] of starts.entries()) {
      const end = starts[index + 1]?.index ?? html.search(/<\/body\s*>/i);
      const fragment = html.slice(match.index, end >= 0 ? end : html.length);
      const task = { id: match[1].toUpperCase(), file: name, fragment };
      task.ogeCodes = ogeTaskCodes(task);
      task.answerType = fragment.match(/Тип ответа:<\/td>\s*<td[^>]*>([^<]+)<\/td>/i)?.[1]?.trim() || '';
      tasks.push(task);
    }
    for (const relative of ogeAssetPaths(raw)) assets.add(relative);
  }
  return { tasks, pages, assets };
}

module.exports = { readOgeCatalog };
