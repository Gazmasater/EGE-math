const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const files = fs.readdirSync(root)
  .map(name => ({ name, match: name.match(/^mathematics-(\d+)\.raw\.html$/i) }))
  .filter(item => item.match)
  .sort((left, right) => Number(left.match[1]) - Number(right.match[1]));

if (!files.length) throw new Error('Файлы mathematics-*.raw.html не найдены. Запустите npm run fetch:math.');

const expectedNumbers = files.map((_, index) => index + 1);
const actualNumbers = files.map(item => Number(item.match[1]));
if (actualNumbers.some((number, index) => number !== expectedNumbers[index])) {
  throw new Error(`Нарушена последовательность страниц: ${actualNumbers.join(', ')}`);
}

const decoder = new TextDecoder('windows-1251');
const taskIds = new Set();
const duplicateIds = new Set();
const answerTypes = new Map();
const topicCounts = new Map();
const pageCounts = [];
const assetPaths = new Set();
const knownTopicCodes = new Set([
  '1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '1.8', '1.9',
  '2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7', '2.8', '2.9', '2.10', '2.11',
  '3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', '3.8',
  '4.1', '4.2', '4.3', '5.1', '5.2', '6.1', '6.2', '6.3',
  '7.1', '7.2', '7.3', '7.4', '7.5'
]);

for (const { name } of files) {
  const html = decoder.decode(fs.readFileSync(path.join(root, name)));
  const starts = Array.from(html.matchAll(/<div\s+class=['"][^'"]*\bqblock\b[^'"]*['"]\s+id=['"]q([0-9A-Z]+)['"][^>]*>/gi));
  pageCounts.push(starts.length);
  for (const [index, match] of starts.entries()) {
    const id = match[1].toUpperCase();
    if (taskIds.has(id)) duplicateIds.add(id);
    taskIds.add(id);
    const end = starts[index + 1]?.index ?? html.search(/<\/body\s*>/i);
    const fragment = html.slice(match.index, end >= 0 ? end : html.length);
    const answerType = fragment.match(/Тип ответа:<\/td><td>([^<]+)<\/td>/i)?.[1]?.trim() || '';
    answerTypes.set(answerType, (answerTypes.get(answerType) || 0) + 1);
    const codes = new Set(fragment.match(/\b[1-7]\.\d+(?:\.\d+)*\b/g) || []);
    for (const code of codes) {
      if (!knownTopicCodes.has(code)) continue;
      topicCounts.set(code, (topicCounts.get(code) || 0) + 1);
    }
  }
  for (const match of html.matchAll(/(?:src|href)=["']\.\.\/\.\.\/([^"'?#]+)(?:\?[^"']*)?["']/gi)) assetPaths.add(match[1]);
  for (const match of html.matchAll(/["'](docs\/[^"']+)["']/gi)) assetPaths.add(match[1]);
}

if (duplicateIds.size) throw new Error(`Повторяются номера заданий: ${Array.from(duplicateIds).slice(0, 20).join(', ')}`);
if (pageCounts.slice(0, -1).some(count => count !== 100) || pageCounts.at(-1) < 1 || pageCounts.at(-1) > 100) {
  throw new Error(`Неполная последовательность страниц ФИПИ: ${pageCounts.join(', ')}`);
}
const allowedAnswerTypes = new Set(['Краткий ответ', 'Развернутый ответ']);
const unknownAnswerTypes = Array.from(answerTypes.keys()).filter(type => !allowedAnswerTypes.has(type));
if (unknownAnswerTypes.length) throw new Error(`Неизвестные типы ответа: ${unknownAnswerTypes.map(type => type || '(пусто)').join(', ')}`);
for (const required of allowedAnswerTypes) {
  if (!answerTypes.get(required)) throw new Error(`В выгрузке нет заданий типа «${required}»`);
}

const assetRoot = path.resolve(root, 'fipi-assets');
const missingAssets = [];
for (const relativePath of assetPaths) {
  const target = path.resolve(assetRoot, ...relativePath.split('/'));
  if (!target.startsWith(`${assetRoot}${path.sep}`) || !fs.existsSync(target)) missingAssets.push(relativePath);
}
if (missingAssets.length) throw new Error(`Не найдены ресурсы ФИПИ: ${missingAssets.slice(0, 20).join(', ')}`);

console.log(JSON.stringify({
  pages: files.length,
  tasks: taskIds.size,
  answerTypes: Object.fromEntries(answerTypes),
  activeTopics: topicCounts.size,
  assets: assetPaths.size,
  missingAssets: missingAssets.length
}, null, 2));
