const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const taskId = '92FD74';
const databaseFile = path.join(__dirname, '..', 'storage', 'solutions.sqlite');

const intervalStart = -2 * Math.PI;
const intervalEnd = -Math.PI / 2;
const graphStart = intervalStart - Math.PI / 6;
const graphEnd = intervalEnd + Math.PI / 6;
const equationRoots = [-7 * Math.PI / 4, -5 * Math.PI / 4];

function fraction(x, numerator, denominator, topY, extraClass = '') {
  const halfWidth = Math.max(String(numerator).length, String(denominator).length) * 4.8 + 4;
  return `<g transform="translate(${x} 0)" class="${extraClass}">
    <text x="0" y="${topY}" text-anchor="middle" class="fraction">${numerator}</text>
    <line x1="${-halfWidth}" y1="${topY + 4}" x2="${halfWidth}" y2="${topY + 4}" class="fraction-line"/>
    <text x="0" y="${topY + 21}" text-anchor="middle" class="fraction">${denominator}</text>
  </g>`;
}

function createGraphSvg() {
  const width = 900;
  const topChart = { x: 92, y: 150, width: 744, height: 170, min: -1.2, max: 1.2 };
  const xAt = value => topChart.x + (value - graphStart) / (graphEnd - graphStart) * topChart.width;
  const yAt = (value, chart) => chart.y + (chart.max - value) / (chart.max - chart.min) * chart.height;
  const polyline = (fn, chart, count = 960) => Array.from({ length: count + 1 }, (_, index) => {
    const x = graphStart + (graphEnd - graphStart) * index / count;
    return `${xAt(x).toFixed(2)},${yAt(fn(x), chart).toFixed(2)}`;
  }).join(' ');
  const grid = (chart, values) => values.map(value => {
    const y = yAt(value, chart).toFixed(2);
    const className = value === 0 ? 'zero-axis' : 'grid';
    const label = String(value).replace('-', '−').replace('.', ',');
    return `<line x1="${chart.x}" y1="${y}" x2="${chart.x + chart.width}" y2="${y}" class="${className}"/>
      <text x="${chart.x - 12}" y="${Number(y) + 5}" text-anchor="end" class="scale">${label}</text>`;
  }).join('');
  const tickLabels = `
    <text x="${xAt(intervalStart).toFixed(2)}" y="347" text-anchor="middle" class="axis-label">−2π</text>
    ${fraction(xAt(intervalEnd).toFixed(2), '−π', '2', 347)}`;
  const intervalShade = chart => `<rect x="${xAt(intervalStart).toFixed(2)}" y="${chart.y}" width="${(xAt(intervalEnd) - xAt(intervalStart)).toFixed(2)}" height="${chart.height}" class="interval-shade"/>`;
  const intervalBoundaries = chart => [intervalStart, intervalEnd].map(value => `<line x1="${xAt(value).toFixed(2)}" y1="${chart.y}" x2="${xAt(value).toFixed(2)}" y2="${chart.y + chart.height}" class="interval-boundary"/>`).join('');
  const rootDots = equationRoots.map(root => `<circle cx="${xAt(root).toFixed(2)}" cy="${yAt(Math.sin(root), topChart).toFixed(2)}" r="6" class="root-dot"/>`).join('');
  const rootLabels = equationRoots.map((root, index) => {
    const x = xAt(root).toFixed(2);
    const numerator = index === 0 ? '7π' : '5π';
    const boxX = index === 0 ? -98 : 14;
    const textX = boxX + 11;
    const fractionX = boxX + 57;
    const lineStart = index === 0 ? boxX + 84 : boxX;
    const lineEnd = index === 0 ? -7 : 7;
    return `<g transform="translate(${x} 0)">
      <rect x="${boxX}" y="158" width="84" height="47" rx="7" class="root-label-box"/>
      <line x1="${lineStart}" y1="181" x2="${lineEnd}" y2="${yAt(Math.sin(root), topChart).toFixed(2)}" class="root-label-line"/>
      <text x="${textX}" y="184" class="root-label-text">x=−</text>
      <text x="${fractionX}" y="176" text-anchor="middle" class="root-label-text">${numerator}</text>
      <line x1="${fractionX - 13}" y1="180" x2="${fractionX + 13}" y2="180" class="root-label-line"/>
      <text x="${fractionX}" y="198" text-anchor="middle" class="root-label-text">4</text>
    </g>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 440" role="img" aria-labelledby="title description">
    <title id="title">Графическое решение пункта б задания 92FD74</title>
    <desc id="description">Построены график синуса и горизонтальный уровень, соответствующий корням уравнения. На заданном отрезке отмечены две точки их пересечения.</desc>
    <style>
      .title { fill: #183153; font: 700 24px Arial, sans-serif; }
      .subtitle { fill: #183153; font: 700 18px Arial, sans-serif; }
      .formula { fill: #40566d; font: 17px 'Cambria Math', 'STIX Two Math', serif; }
      .axis-label, .fraction { fill: #40566d; font: 15px 'Cambria Math', 'STIX Two Math', serif; }
      .scale { fill: #60758b; font: 12px Arial, sans-serif; }
      .grid { stroke: #dbe5ef; stroke-width: 1; }
      .zero-axis { stroke: #526f89; stroke-width: 1.5; }
      .frame { fill: #fff; stroke: #cbd7e4; stroke-width: 1.2; }
      .curve { fill: none; stroke: #176b83; stroke-width: 3; stroke-linejoin: round; stroke-linecap: round; }
      .solution-level { stroke: #9a5c00; stroke-width: 2; stroke-dasharray: 7 4; }
      .interval-shade { fill: #d9ebf7; opacity: .58; }
      .interval-boundary { stroke: #1a5f8e; stroke-width: 2; stroke-dasharray: 7 5; }
      .root-dot { fill: #176b83; stroke: #fff; stroke-width: 2.5; }
      .root-label-box { fill: #fff; stroke: #176b83; stroke-width: 1.2; }
      .root-label-text { fill: #124c5c; font: 600 15px 'Cambria Math', 'STIX Two Math', serif; }
      .root-label-line { stroke: #124c5c; stroke-width: 1.1; }
      .fraction-line { stroke: #40566d; stroke-width: 1.1; }
      .legend { fill: #40566d; font: 14px Arial, sans-serif; }
    </style>
    <rect width="900" height="440" fill="#fff"/>
    <rect x="24" y="20" width="852" height="396" rx="12" fill="#f8fbfe" stroke="#cbd7e4"/>
    <text x="56" y="58" class="title">Графическое решение на заданном отрезке</text>

    <text x="56" y="94" class="subtitle">1. График уравнения</text>
    <text x="56" y="119" class="formula">y=sin x;  y=</text>
    ${fraction(170, '√2', '2', 111)}
    <rect x="${topChart.x}" y="${topChart.y}" width="${topChart.width}" height="${topChart.height}" class="frame"/>
    ${intervalShade(topChart)}
    ${grid(topChart, [-1, -0.5, 0, 0.5, 1])}
    ${intervalBoundaries(topChart)}
    <polyline points="${polyline(Math.sin, topChart)}" class="curve"/>
    <line x1="${topChart.x}" y1="${yAt(Math.SQRT1_2, topChart).toFixed(2)}" x2="${topChart.x + topChart.width}" y2="${yAt(Math.SQRT1_2, topChart).toFixed(2)}" class="solution-level"/>
    ${rootLabels}
    ${rootDots}
    ${tickLabels}
    <text x="56" y="405" class="legend">Голубая полоса — заданный отрезок; синими пунктирами показаны его границы.</text>
  </svg>`;
}

const diagramSvg = createGraphSvg();
const caption = 'Графики y=sin x и y=√2, делённый на 2. На голубом отрезке отмечены две точки пересечения.';

const db = new DatabaseSync(databaseFile);
const record = db.prepare('SELECT solution FROM solutions WHERE task_id = ? AND published = 1').get(taskId);
if (!record) throw new Error(`Не найдено опубликованное решение ${taskId}.`);

const oldBlock = `б) На отрезке [−2π;−⟦π¦2⟧] получаем
x=−⟦7π¦4⟧; −⟦5π¦4⟧.

Ответ пункта б): −⟦7π¦4⟧; −⟦5π¦4⟧.`;
const newBlock = `б) На графиках y=sin x и y=⟦√2¦2⟧ на отрезке [−2π;−⟦π¦2⟧] видны две точки пересечения:
x=−⟦7π¦4⟧; −⟦5π¦4⟧.

Для обеих этих точек подлогарифмическое выражение
3^(2x)+5√2sin x−6cos²x−2
равно 3^(2x)=9^x>0, так как выражение 5√2sin x−6cos²x−2 равно нулю. Поэтому условие области определения выполнено.

Ответ пункта б): −⟦7π¦4⟧; −⟦5π¦4⟧.`;
const previousGraphBlock = `б) Графический отбор на отрезке [−2π;−⟦π¦2⟧] показан на схеме: на верхней оси отмечены все корни, на нижней — точный заданный отрезок. Их пересечение:
x=−⟦7π¦4⟧; −⟦5π¦4⟧.

Для этих значений подлогарифмическое выражение равно 9^x>0, поэтому условие области определения выполнено.

Ответ пункта б): −⟦7π¦4⟧; −⟦5π¦4⟧.`;
const previousSineBlock = `б) На графиках y=sin x и y=⟦√2¦2⟧ на отрезке [−2π;−⟦π¦2⟧] видны две точки пересечения:
x=−⟦7π¦4⟧; −⟦5π¦4⟧.

Для обеих этих точек выражение после логарифма равно 3^(2x)=9^x>0, поэтому условие области определения выполнено.

Ответ пункта б): −⟦7π¦4⟧; −⟦5π¦4⟧.`;
const previousOpening = `Так как log₉(A)=x, подлогарифмическое выражение равно 9^x=3^(2x). Поэтому слагаемые 3^(2x) сокращаются:
5√2sin x−6cos²x−2=0.`;
const newOpening = `Обозначим подлогарифмическое выражение через A(x):
A(x)=3^(2x)+5√2sin x−6cos²x−2.

Из log₉(A(x))=x следует A(x)=9^x=3^(2x). Следовательно,
3^(2x)+5√2sin x−6cos²x−2=3^(2x),
5√2sin x−6cos²x−2=0.`;
let solution = record.solution.replace(previousOpening, newOpening);
if (solution.includes(previousSineBlock)) {
  solution = solution.replace(previousSineBlock, newBlock);
} else if (solution.includes(previousGraphBlock)) {
  solution = solution.replace(previousGraphBlock, newBlock);
} else if (solution.includes(oldBlock)) {
  solution = solution.replace(oldBlock, newBlock);
}

const result = db.prepare(`
  UPDATE solutions
  SET solution = ?, diagram_svg = ?, diagram_caption = ?, updated_at = ?
  WHERE task_id = ? AND published = 1
`).run(solution, diagramSvg, caption, new Date().toISOString(), taskId);

if (result.changes !== 1) throw new Error(`Не удалось обновить решение ${taskId}.`);
console.log(JSON.stringify({ taskId, changes: result.changes, diagramBytes: Buffer.byteLength(diagramSvg), textUpdated: solution !== record.solution }));
