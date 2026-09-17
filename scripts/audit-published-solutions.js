const path = require('node:path');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const { DatabaseSync } = require('node:sqlite');
const { collectEquationDefinitions } = require('./audit-equation-roots');

const databaseFile = path.join(__dirname, '..', 'storage', 'solutions.sqlite');
const db = new DatabaseSync(databaseFile);
const parameterTaskIds = new Set(Array.from(
  new TextDecoder('windows-1251').decode(fs.readFileSync(path.join(__dirname, '..', 'parameters.raw.html')))
    .matchAll(/<div\s+class=['"][^'"]*\bqblock\b[^'"]*['"]\s+id=['"]q([A-Z0-9]+)['"][^>]*>/gi),
  match => match[1].toUpperCase()
));
const rows = db.prepare(`
  SELECT task_id, answer, solution, diagram_svg, diagram_caption
  FROM solutions
  WHERE published = 1
  ORDER BY task_id
`).all();

const errors = [];
for (const row of rows) {
  if (!row.answer.trim()) errors.push(`${row.task_id}: не указан ответ.`);
  if (!row.solution.trim()) errors.push(`${row.task_id}: отсутствует текст решения.`);
  if (row.answer.includes('/') || row.solution.includes('/')) {
    errors.push(`${row.task_id}: дробь записана через /. Используйте ⟦числитель¦знаменатель⟧.`);
  }
  if (/выражение после логарифма/i.test(row.solution)) {
    errors.push(`${row.task_id}: подлогарифмическое выражение названо неточно.`);
  }
  if (row.diagram_svg) {
    const svg = row.diagram_svg.trim();
    if (!svg.startsWith('<svg') || !svg.endsWith('</svg>') || !/\bviewBox=/.test(svg)) {
      errors.push(`${row.task_id}: SVG-схема имеет неверную структуру.`);
    }
    if (!row.diagram_caption.trim()) errors.push(`${row.task_id}: у SVG-схемы нет подписи.`);
  }
}

const task92 = rows.find(row => row.task_id === '92FD74');
if (task92) {
  const requiredParts = [
    'A(x)=3^(2x)+5√2sin x−6cos²x−2',
    'A(x)=9^x=3^(2x)',
    'подлогарифмическое выражение',
    '3^(2x)=9^x>0'
  ];
  for (const part of requiredParts) {
    if (!task92.solution.includes(part)) errors.push(`92FD74: отсутствует обязательное обоснование «${part}».`);
  }
  if (!task92.diagram_svg.includes('y=sin x') || !task92.diagram_svg.includes('solution-level')) {
    errors.push('92FD74: график должен показывать синусоиду и уровень y=√2/2.');
  }
}

const taskFda = rows.find(row => row.task_id === 'FDA042');
if (taskFda) {
  const requiredParts = [
    'Область допустимых значений: sin x>0',
    'Значение sin x=0 не входит в область допустимых значений',
    'На верхнем графике построены y=cos x и уровень y=⟦√2¦2⟧',
    'Нижний график y=sin x показывает ОДЗ',
    'условие sin x>0 исключает x=⟦15π¦4⟧'
  ];
  for (const part of requiredParts) {
    if (!taskFda.solution.includes(part)) errors.push(`FDA042: отсутствует обязательное обоснование «${part}».`);
  }
  if (!taskFda.diagram_svg.includes('y=cos x') || !taskFda.diagram_svg.includes('y=√2/2') || !taskFda.diagram_svg.includes('y=sin x') || !taskFda.diagram_svg.includes('sine-positive')) {
    errors.push('FDA042: сверху должны быть cos x и уровень √2/2, снизу — график sin x для ОДЗ.');
  }
}

const taskF22045 = rows.find(row => row.task_id === 'F22045');
if (taskF22045) {
  const requiredParts = [
    '⟦3¦2⟧=log₄(4^(⟦3¦2⟧))=log₄8',
    'log₄5<log₄8=⟦3¦2⟧',
    '(⟦3¦2⟧)²=⟦9¦4⟧<3',
    'log₄5<⟦3¦2⟧<√3'
  ];
  for (const part of requiredParts) {
    if (!taskF22045.solution.includes(part)) errors.push(`F22045: не доказана принадлежность ответа интервалу («${part}»).`);
  }
}

const intervalProofChecks = {
  EE74FD: [
    'log₅2<log₅√5=⟦1¦2⟧<log₅20',
    'log₅20<log₅25=2'
  ],
  D1D574: [
    'log₇4<log₇7=1<log₇16',
    '(7√7)²=343>256=16²',
    'log₇16<log₇(7√7)=⟦3¦2⟧'
  ],
  '0BD320': [
    '(⟦1¦2⟧)²=⟦1¦4⟧<3',
    '√3<2=log₂4<log₂5'
  ]
};
for (const [taskId, requiredParts] of Object.entries(intervalProofChecks)) {
  const row = rows.find(item => item.task_id === taskId);
  if (!row) {
    errors.push(`${taskId}: не найдено решение для проверки интервала.`);
    continue;
  }
  for (const part of requiredParts) {
    if (!row.solution.includes(part)) errors.push(`${taskId}: не доказана принадлежность ответа интервалу («${part}»).`);
  }
}

const domainTaskIds = rows
  .filter(row => !parameterTaskIds.has(row.task_id) && /Область допустимых значений|ОДЗ/.test(row.solution))
  .map(row => row.task_id)
  .sort();
const expectedDomainTaskIds = ['638272', 'A6BC58', 'B2FAAF', 'FDA042'];
if (domainTaskIds.join(',') !== expectedDomainTaskIds.join(',')) {
  errors.push(`Задачи с ОДЗ требуют проверки графика: найдены ${domainTaskIds.join(', ') || 'нет'}.`);
}

const domainGraphChecks = {
  '638272': {
    solution: ['На верхнем графике y=sin x', 'Нижний график y=2cos x+√3', 'x=⟦5π¦6⟧ знаменатель равен нулю'],
    svg: ['y=sin x', 'y=2cos x+√3', '5π/6: знаменатель 0']
  },
  A6BC58: {
    solution: ['На верхнем графике построены y=cos x', 'Нижний график y=sin x показывает ОДЗ', 'x=−⟦37π¦6⟧'],
    svg: ['y=cos x', 'y=sin x', '−37π/6', '−13π/2', '−6π', '−5π']
  },
  B2FAAF: {
    solution: ['ОДЗ задаётся двумя условиями', 'На верхнем графике первое условие', 'На нижнем графике второе условие', 'пересечение двух условий ОДЗ равно [⟦π¦2⟧; π)'],
    svg: ['Первое условие ОДЗ: sin x>0', 'Второе условие ОДЗ: знаменатель ≠0', 'y=2cos x−√3', '11π/6: знаменатель 0']
  },
  FDA042: {
    solution: ['На верхнем графике построены y=cos x', 'Нижний график y=sin x показывает ОДЗ', 'x=⟦15π¦4⟧'],
    svg: ['y=cos x', 'y=√2/2', 'y=sin x']
  }
};
for (const [taskId, check] of Object.entries(domainGraphChecks)) {
  const row = rows.find(item => item.task_id === taskId);
  if (!row) {
    errors.push(`${taskId}: не найдено опубликованное решение с ОДЗ.`);
    continue;
  }
  for (const text of check.solution) {
    if (!row.solution.includes(text)) errors.push(`${taskId}: в решении не отражено условие «${text}».`);
  }
  for (const text of check.svg) {
    if (!row.diagram_svg.includes(text)) errors.push(`${taskId}: на графике не отражено «${text}».`);
  }
}

const specialEquationGraphs = new Set(['92FD74', ...Object.keys(domainGraphChecks)]);
const requiredIntervalLabels = {
  F22045: ['log₄5', '√3'],
  EE74FD: ['log₅2', 'log₅20'],
  D1D574: ['log₇4', 'log₇16'],
  '0BD320': ['√3', 'log₂5']
};
for (const definition of collectEquationDefinitions()) {
  if (definition.error) {
    errors.push(`${definition.taskId}: исходное уравнение не удалось разобрать для проверки графика.`);
    continue;
  }
  const row = rows.find(item => item.task_id === definition.taskId);
  if (!row) {
    errors.push(`${definition.taskId}: опубликованное решение не найдено.`);
    continue;
  }
  if (!row.diagram_svg) errors.push(`${definition.taskId}: отсутствует график.`);
  if (!/а\)\s*Общее решение:/.test(row.solution) || !/б\)\s*(?:Корни на заданном отрезке:|На графиках)/.test(row.solution)) {
    errors.push(`${definition.taskId}: должны быть отдельно указаны общее решение и корни на заданном отрезке.`);
  }
  if (specialEquationGraphs.has(definition.taskId)) continue;
  const markedRoots = (row.diagram_svg.match(/class="solution-root"/g) || []).length;
  if (markedRoots !== definition.expected.length) {
    errors.push(`${definition.taskId}: на графике отмечено ${markedRoots} корней вместо ${definition.expected.length}.`);
  }
  if (!row.diagram_svg.includes('Область допустимых значений') || !row.diagram_svg.includes('ОДЗ: x∈ℝ')) {
    errors.push(`${definition.taskId}: снизу должна быть показана ОДЗ на заданном отрезке.`);
  }
  for (const label of requiredIntervalLabels[definition.taskId] || []) {
    if (!row.diagram_svg.includes(label)) errors.push(`${definition.taskId}: на графике нет границы отрезка «${label}» из условия.`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`Проверено опубликованных решений: ${rows.length}. Формат, SVG-схемы и контрольные формулировки корректны.`);
execFileSync(process.execPath, [path.join(__dirname, 'audit-equation-roots.js')], { stdio: 'inherit' });
