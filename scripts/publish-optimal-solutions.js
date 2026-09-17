const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const projectRoot = path.join(__dirname, '..');
const text = (...parts) => parts.join('\n\n');

const solutions = {
  E1812B: ['10', text(
    'За три года завод должен принести не менее 78 млн рублей, значит наибольшая годовая прибыль должна быть не меньше 26 млн рублей. Для некоторого x>0 требуется px−(0,5x²+2x+6)≥26.',
    'Отсюда p≥⟦0,5x²+2x+32¦x⟧=0,5x+2+⟦32¦x⟧. По неравенству между средним арифметическим и средним геометрическим 0,5x+⟦32¦x⟧≥2√16=8, поэтому p≥10.',
    'При p=10 максимум достигается при x=8: прибыль равна −0,5(x−8)²+26 и не превосходит 26 млн рублей в год. За три года получится 78 млн рублей, поэтому p=10 подходит. Ответ: 10.'
  )],
  '262AEA': ['100', text(
    'Пусть первый завод произведёт x единиц товара, а второй — y единиц, где x,y≥0. Тогда работники трудятся соответственно x² и y² часов, поэтому затраты удовлетворяют неравенству 200x²+300y²≤1 200 000.',
    'По неравенству Коши: (x+y)²=(√200·x·⟦1¦√200⟧+√300·y·⟦1¦√300⟧)²≤(200x²+300y²)(⟦1¦200⟧+⟦1¦300⟧)≤10 000. Значит, x+y≤100.',
    'При x=60 и y=40 затраты равны 200·60²+300·40²=1 200 000, а количество товара равно 60+40=100. Верхняя граница достигается. Ответ: 100.'
  )]
};

function filterOptimalHtml(html) {
  const chunks = html.split(/(?=<div\s+class=['"]qblock)/i);
  const prefix = chunks.shift() || '';
  const selected = chunks.filter(chunk => {
    const sourceText = chunk.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').toLowerCase();
    const optimization = /(наибольш|наименьш|максимальн|минимальн).{0,1600}(прибыл|выруч|затрат|окуп|производств|завод|фирм|предприят)|(?:прибыл|выруч|затрат|окуп|производств|завод|фирм|предприят).{0,1600}(наибольш|наименьш|максимальн|минимальн)/.test(sourceText);
    return optimization && !/кредит|банк|вклад|за[её]м|долг|плат[её]ж/.test(sourceText);
  });
  return `${prefix}${selected.join('')}`;
}

const source = filterOptimalHtml(Array.from({ length: 5 }, (_, index) =>
  new TextDecoder('windows-1251').decode(fs.readFileSync(path.join(projectRoot, `optimal-all-${index + 1}.raw.html`)))
).join('\n'));
const sourceTaskIds = new Set(Array.from(source.matchAll(/<div\s+class=['"][^'"]*\bqblock\b[^'"]*['"]\s+id=['"]q([A-Za-z0-9]+)['"]/gi), match => match[1].toUpperCase()));
const taskIds = Object.keys(solutions);

if (taskIds.length !== 2 || sourceTaskIds.size !== 2) throw new Error('Состав раздела «Оптимальный выбор» изменился; требуется ручная проверка.');
for (const taskId of taskIds) {
  const [answer, solution] = solutions[taskId];
  if (!sourceTaskIds.has(taskId)) throw new Error(`Задача ${taskId} отсутствует в разделе «Оптимальный выбор».`);
  if (!answer || !solution.includes('Ответ:') || solution.includes('/')) throw new Error(`Некорректное решение ${taskId}.`);
}

const db = new DatabaseSync(path.join(projectRoot, 'storage', 'solutions.sqlite'));
const save = db.prepare("INSERT INTO solutions (task_id, answer, solution, diagram_svg, diagram_caption, published, created_at, updated_at) VALUES (?, ?, ?, '', '', 1, ?, ?) ON CONFLICT(task_id) DO UPDATE SET answer=excluded.answer, solution=excluded.solution, diagram_svg='', diagram_caption='', published=1, updated_at=excluded.updated_at");
const now = new Date().toISOString();
db.exec('BEGIN');
try {
  for (const taskId of taskIds) {
    const [answer, solution] = solutions[taskId];
    save.run(taskId, answer, solution, now, now);
  }
  db.exec('COMMIT');
} catch (error) {
  db.exec('ROLLBACK');
  throw error;
}

const published = db.prepare(`SELECT COUNT(*) AS total FROM solutions WHERE published = 1 AND task_id IN (${taskIds.map(() => '?').join(',')})`).get(...taskIds).total;
if (published !== taskIds.length) throw new Error(`Опубликовано ${published} из ${taskIds.length}.`);
console.log(JSON.stringify({ published, taskIds }));
