const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { collectEquationDefinitions } = require('./audit-equation-roots');

const root = path.join(__dirname, '..');
const databaseFile = path.join(root, 'storage', 'solutions.sqlite');
const graphMarker = 'Графическая проверка на заданном отрезке:';

function safeValue(fn, x) {
  try {
    const value = fn(x);
    return Number.isFinite(value) ? value : Number.NaN;
  } catch {
    return Number.NaN;
  }
}

function percentile(values, share) {
  const index = Math.max(0, Math.min(values.length - 1, Math.round((values.length - 1) * share)));
  return values[index];
}

function buildGraph(taskId, fn, interval, roots) {
  const [start, end] = interval;
  const width = 900;
  const height = 500;
  const chart = { x: 92, y: 138, width: 744, height: 240 };
  const sampleCount = 1800;
  const samples = Array.from({ length: sampleCount + 1 }, (_, index) => {
    const x = start + (end - start) * index / sampleCount;
    return { x, value: safeValue(fn, x) };
  });
  const finite = samples.map(sample => sample.value).filter(Number.isFinite).sort((left, right) => left - right);
  if (!finite.length) throw new Error(`${taskId}: на отрезке нет значений функции для графика.`);

  let lower = Math.min(0, percentile(finite, 0.02));
  let upper = Math.max(0, percentile(finite, 0.98));
  if (Math.abs(upper - lower) < 1e-8) {
    lower -= 1;
    upper += 1;
  }
  const padding = Math.max((upper - lower) * 0.12, 0.2);
  lower -= padding;
  upper += padding;

  const xAt = x => chart.x + (x - start) / (end - start) * chart.width;
  const yAt = y => chart.y + (upper - y) / (upper - lower) * chart.height;
  const zeroY = yAt(0);
  const visible = value => Number.isFinite(value) && value >= lower && value <= upper;
  const segments = [];
  let segment = [];
  let previousY = null;
  for (const sample of samples) {
    if (!visible(sample.value)) {
      if (segment.length > 1) segments.push(segment);
      segment = [];
      previousY = null;
      continue;
    }
    const y = yAt(sample.value);
    if (previousY !== null && Math.abs(y - previousY) > chart.height * 0.82) {
      if (segment.length > 1) segments.push(segment);
      segment = [];
    }
    segment.push(`${xAt(sample.x).toFixed(2)},${y.toFixed(2)}`);
    previousY = y;
  }
  if (segment.length > 1) segments.push(segment);

  const rootMarks = roots.map((rootValue, index) => {
    const x = xAt(rootValue).toFixed(2);
    const labelY = index % 2 ? chart.y + chart.height - 16 : chart.y + 22;
    const labelBaseline = index % 2 ? labelY : labelY;
    return `<line x1="${x}" y1="${chart.y}" x2="${x}" y2="${chart.y + chart.height}" class="root-guide"/>
      <circle cx="${x}" cy="${zeroY.toFixed(2)}" r="6" class="root-dot"/>
      <text x="${x}" y="${labelBaseline}" text-anchor="middle" class="root-label">x${index + 1}</text>`;
  }).join('');
  const zeroAxis = zeroY >= chart.y && zeroY <= chart.y + chart.height
    ? `<line x1="${chart.x}" y1="${zeroY.toFixed(2)}" x2="${chart.x + chart.width}" y2="${zeroY.toFixed(2)}" class="zero-axis"/>`
    : '';
  const curve = segments.map(points => `<polyline points="${points.join(' ')}" class="curve"/>`).join('');
  const rootLegend = roots.map((_, index) => `x${index + 1}`).join(', ');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title-${taskId} desc-${taskId}">
    <title id="title-${taskId}">Графическая проверка корней задания ${taskId}</title>
    <desc id="desc-${taskId}">График функции, равной разности левой и правой частей уравнения, на заданном отрезке. Синими точками отмечены корни из ответа.</desc>
    <style>
      .title { fill: #183153; font: 700 23px Arial, sans-serif; }
      .subtitle { fill: #40566d; font: 16px Arial, sans-serif; }
      .frame { fill: #fff; stroke: #cbd7e4; stroke-width: 1.2; }
      .interval { fill: #d9ebf7; opacity: .55; }
      .boundary { stroke: #1a5f8e; stroke-width: 2; stroke-dasharray: 7 5; }
      .zero-axis { stroke: #526f89; stroke-width: 1.5; }
      .curve { fill: none; stroke: #176b83; stroke-width: 3; stroke-linejoin: round; stroke-linecap: round; }
      .root-guide { stroke: #176b83; stroke-width: 1.4; stroke-dasharray: 5 5; opacity: .76; }
      .root-dot { fill: #176b83; stroke: #fff; stroke-width: 2.5; }
      .root-label { fill: #124c5c; font: 700 15px Arial, sans-serif; }
      .boundary-label { fill: #1a5f8e; font: 600 14px Arial, sans-serif; }
      .note { fill: #40566d; font: 14px Arial, sans-serif; }
    </style>
    <rect width="${width}" height="${height}" fill="#fff"/>
    <rect x="24" y="20" width="852" height="456" rx="12" fill="#f8fbfe" stroke="#cbd7e4"/>
    <text x="56" y="58" class="title">Графическая проверка корней на заданном отрезке</text>
    <text x="56" y="87" class="subtitle">f(x) — разность левой и правой частей уравнения; корни получаются при f(x)=0.</text>
    <rect x="${chart.x}" y="${chart.y}" width="${chart.width}" height="${chart.height}" class="frame"/>
    <rect x="${chart.x}" y="${chart.y}" width="${chart.width}" height="${chart.height}" class="interval"/>
    ${zeroAxis}
    <line x1="${chart.x}" y1="${chart.y}" x2="${chart.x}" y2="${chart.y + chart.height}" class="boundary"/>
    <line x1="${chart.x + chart.width}" y1="${chart.y}" x2="${chart.x + chart.width}" y2="${chart.y + chart.height}" class="boundary"/>
    ${curve}
    ${rootMarks}
    <text x="${chart.x}" y="${chart.y + chart.height + 30}" text-anchor="start" class="boundary-label">левая граница отрезка</text>
    <text x="${chart.x + chart.width}" y="${chart.y + chart.height + 30}" text-anchor="end" class="boundary-label">правая граница отрезка</text>
    <text x="56" y="450" class="note">Синие точки ${rootLegend} — корни, указанные в ответе. Пунктиры отмечают их значения x.</text>
  </svg>`;
}

function formatAxisValue(value) {
  const ratio = value / Math.PI;
  for (let denominator = 1; denominator <= 24; denominator += 1) {
    const numerator = Math.round(ratio * denominator);
    if (Math.abs(ratio - numerator / denominator) > 1e-6) continue;
    if (numerator === 0) return '0';
    const sign = numerator < 0 ? '−' : '';
    const absolute = Math.abs(numerator);
    if (denominator === 1) return `${sign}${absolute === 1 ? '' : absolute}π`;
    return `${sign}${absolute === 1 ? '' : absolute}π/${denominator}`;
  }
  if (Math.abs(value - Math.round(value)) < 1e-6) return String(Math.round(value));
  return value.toFixed(2).replace('.', ',');
}

function formatLevel(value) {
  const sign = value < 0 ? '−' : '';
  const absolute = Math.abs(value);
  const named = [
    [1, '1'],
    [1 / 2, '1/2'],
    [Math.SQRT1_2, '√2/2'],
    [Math.sqrt(3) / 2, '√3/2'],
    [1 / Math.sqrt(3), '√3/3'],
    [Math.sqrt(2), '√2'],
    [Math.sqrt(3), '√3']
  ];
  for (const [target, label] of named) {
    if (Math.abs(absolute - target) < 1e-6) return `${sign}${label}`;
  }
  return `${value.toFixed(3).replace(/\.0+$/, '').replace('.', ',')}`;
}

function inferReference(taskId, solution) {
  if (taskId === 'C19C6E') {
    return { fn: x => Math.cos(2 * x + Math.PI / 4), label: 'y=cos(2x+π/4)' };
  }
  const exponent = solution.match(/t=(\d+)ˣ/);
  if (exponent) {
    const base = Number(exponent[1]);
    return { fn: x => base ** x, label: `y=${base}^x` };
  }
  if (/tg x=|tan x=/.test(solution)) return { fn: Math.tan, label: 'y=tg x' };
  if (/sin x\s*[+−-]\s*cos x=0|sin x=cos x/.test(solution)) return { fn: Math.tan, label: 'y=tg x' };
  if (/sin x=/.test(solution)) return { fn: Math.sin, label: 'y=sin x' };
  if (/cos x/.test(solution)) return { fn: Math.cos, label: 'y=cos x' };
  return { fn: Math.sin, label: 'y=sin x' };
}

const intervalLabels = {
  F22045: ['log₄5', '√3'],
  EE74FD: ['log₅2', 'log₅20'],
  D1D574: ['log₇4', 'log₇16'],
  '0BD320': ['√3', 'log₂5']
};

function buildSolutionGraph(taskId, interval, roots, solution) {
  const reference = inferReference(taskId, solution);
  const [start, end] = interval;
  const width = 900;
  const height = 740;
  const chart = { x: 92, y: 142, width: 744, height: 210 };
  const domain = { x: 92, y: 468, width: 744, height: 116 };
  const levels = [...new Set(roots.map(root => Math.round(safeValue(reference.fn, root) * 1e8) / 1e8))]
    .filter(Number.isFinite)
    .sort((left, right) => left - right);
  const samples = Array.from({ length: 1801 }, (_, index) => {
    const x = start + (end - start) * index / 1800;
    return { x, value: safeValue(reference.fn, x) };
  });
  const finite = samples.map(sample => sample.value).filter(Number.isFinite).sort((left, right) => left - right);
  let lower = Math.min(0, percentile(finite, 0.02), ...levels);
  let upper = Math.max(0, percentile(finite, 0.98), ...levels);
  if (Math.abs(upper - lower) < 1e-8) {
    lower -= 1;
    upper += 1;
  }
  const padding = Math.max((upper - lower) * 0.12, 0.2);
  lower -= padding;
  upper += padding;
  const xAt = x => chart.x + (x - start) / (end - start) * chart.width;
  const yAt = y => chart.y + (upper - y) / (upper - lower) * chart.height;
  const zeroY = yAt(0);
  const visible = value => Number.isFinite(value) && value >= lower && value <= upper;
  const segments = [];
  let segment = [];
  let previousY = null;
  for (const sample of samples) {
    if (!visible(sample.value)) {
      if (segment.length > 1) segments.push(segment);
      segment = [];
      previousY = null;
      continue;
    }
    const y = yAt(sample.value);
    if (previousY !== null && Math.abs(y - previousY) > chart.height * 0.82) {
      if (segment.length > 1) segments.push(segment);
      segment = [];
    }
    segment.push(`${xAt(sample.x).toFixed(2)},${y.toFixed(2)}`);
    previousY = y;
  }
  if (segment.length > 1) segments.push(segment);
  const curve = segments.map(points => `<polyline points="${points.join(' ')}" class="curve"/>`).join('');
  const levelLines = levels.map((level, index) => {
    const y = yAt(level).toFixed(2);
    return `<line x1="${chart.x}" y1="${y}" x2="${chart.x + chart.width}" y2="${y}" class="level"/>
      <text x="${chart.x + 18}" y="${Number(y) - 8}" class="level-label">y=${formatLevel(level)}</text>`;
  }).join('');
  const rootMarks = roots.map((root, index) => {
    const x = xAt(root).toFixed(2);
    const y = yAt(reference.fn(root)).toFixed(2);
    const labelY = index % 2 ? Number(y) + 26 : Number(y) - 15;
    return `<line x1="${x}" y1="${y}" x2="${x}" y2="${zeroY.toFixed(2)}" class="guide"/>
      <circle cx="${x}" cy="${y}" r="6" class="solution-root"/>
      <text x="${x}" y="${labelY}" text-anchor="middle" class="root-label">${formatAxisValue(root)}</text>`;
  }).join('');
  const zeroAxis = zeroY >= chart.y && zeroY <= chart.y + chart.height
    ? `<line x1="${chart.x}" y1="${zeroY.toFixed(2)}" x2="${chart.x + chart.width}" y2="${zeroY.toFixed(2)}" class="axis"/>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title-${taskId} desc-${taskId}">
    <title id="title-${taskId}">Графическое решение задания ${taskId}</title>
    <desc id="desc-${taskId}">Сверху построен график ${reference.label} с уровнями из полученного решения. Снизу показана область допустимых значений: все действительные x на заданном отрезке.</desc>
    <style>
      .title { fill:#183153; font:700 23px Arial,sans-serif; }
      .subtitle { fill:#40566d; font:16px Arial,sans-serif; }
      .panel-title { fill:#183153; font:700 17px Arial,sans-serif; }
      .frame { fill:#fff; stroke:#cbd7e4; stroke-width:1.2; }
      .curve { fill:none; stroke:#176b83; stroke-width:3.2; stroke-linejoin:round; stroke-linecap:round; }
      .level { stroke:#8c5c10; stroke-width:2; stroke-dasharray:8 5; }
      .level-label { fill:#8c5c10; font:700 14px Arial,sans-serif; }
      .axis { stroke:#526f89; stroke-width:1.5; }
      .boundary { stroke:#1a5f8e; stroke-width:1.8; stroke-dasharray:7 5; }
      .guide { stroke:#176b83; stroke-width:1.4; stroke-dasharray:5 5; }
      .solution-root { fill:#176b83; stroke:#fff; stroke-width:2.5; }
      .root-label { fill:#124c5c; font:700 14px Arial,sans-serif; }
      .domain-fill { fill:#e6f4ea; }
      .domain-line { stroke:#287442; stroke-width:4; }
      .domain-label { fill:#287442; font:700 17px Arial,sans-serif; }
      .boundary-label { fill:#1a5f8e; font:600 14px Arial,sans-serif; }
      .note { fill:#40566d; font:14px Arial,sans-serif; }
    </style>
    <rect width="${width}" height="${height}" fill="#fff"/>
    <rect x="24" y="20" width="852" height="696" rx="12" fill="#f8fbfe" stroke="#cbd7e4"/>
    <text x="56" y="58" class="title">Графическое решение на заданном отрезке</text>
    <text x="56" y="87" class="subtitle">Уровни на верхнем графике взяты из полученного решения; точки пересечения отмечены синим.</text>
    <text x="92" y="122" class="panel-title">1. ${reference.label}</text>
    <rect x="${chart.x}" y="${chart.y}" width="${chart.width}" height="${chart.height}" class="frame"/>
    ${zeroAxis}
    ${levelLines}
    <line x1="${chart.x}" y1="${chart.y}" x2="${chart.x}" y2="${chart.y + chart.height}" class="boundary"/>
    <line x1="${chart.x + chart.width}" y1="${chart.y}" x2="${chart.x + chart.width}" y2="${chart.y + chart.height}" class="boundary"/>
    ${curve}
    ${rootMarks}
    <text x="92" y="448" class="panel-title">2. Область допустимых значений</text>
    <rect x="${domain.x}" y="${domain.y}" width="${domain.width}" height="${domain.height}" class="domain-fill"/>
    <rect x="${domain.x}" y="${domain.y}" width="${domain.width}" height="${domain.height}" class="frame"/>
    <line x1="${domain.x}" y1="${domain.y + domain.height / 2}" x2="${domain.x + domain.width}" y2="${domain.y + domain.height / 2}" class="domain-line"/>
    <line x1="${domain.x}" y1="${domain.y}" x2="${domain.x}" y2="${domain.y + domain.height}" class="boundary"/>
    <line x1="${domain.x + domain.width}" y1="${domain.y}" x2="${domain.x + domain.width}" y2="${domain.y + domain.height}" class="boundary"/>
    <text x="${domain.x + domain.width / 2}" y="${domain.y + domain.height / 2 - 15}" text-anchor="middle" class="domain-label">ОДЗ: x∈ℝ</text>
    <text x="${domain.x}" y="${domain.y + domain.height + 30}" text-anchor="start" class="boundary-label">${intervalLabels[taskId]?.[0] || formatAxisValue(start)}</text>
    <text x="${domain.x + domain.width}" y="${domain.y + domain.height + 30}" text-anchor="end" class="boundary-label">${intervalLabels[taskId]?.[1] || formatAxisValue(end)}</text>
    <text x="56" y="${height - 26}" class="note">Пунктиры проведены от решений до оси абсцисс; нижняя схема подтверждает, что весь заданный отрезок входит в ОДЗ.</text>
  </svg>`;
}

function buildCosineSineDomainGraph({
  taskId,
  start,
  end,
  domainStart,
  rejectedRoot,
  acceptedRoot,
  level,
  levelLabel,
  rejectedLabel,
  acceptedLabel,
  rejectedSineLabel,
  acceptedSineLabel,
  startLabel,
  domainStartLabel,
  endLabel
}) {
  const width = 900;
  const height = 830;
  const cosineChart = { x: 92, y: 142, width: 744, height: 210 };
  const sineChart = { x: 92, y: 488, width: 744, height: 210 };
  const lower = -1.25;
  const upper = 1.25;
  const xAt = x => cosineChart.x + (x - start) / (end - start) * cosineChart.width;
  const yAt = (chart, y) => chart.y + (upper - y) / (upper - lower) * chart.height;
  const points = (fn, from, to, chart) => Array.from({ length: 500 }, (_, index) => {
    const x = from + (to - from) * index / 499;
    return `${xAt(x).toFixed(2)},${yAt(chart, fn(x)).toFixed(2)}`;
  }).join(' ');
  const cosinePoints = Array.from({ length: 900 }, (_, index) => {
    const x = start + (end - start) * index / 899;
    return `${xAt(x).toFixed(2)},${yAt(cosineChart, Math.cos(x)).toFixed(2)}`;
  }).join(' ');
  const xDomainStart = xAt(domainStart).toFixed(2);
  const xRejected = xAt(rejectedRoot).toFixed(2);
  const xAccepted = xAt(acceptedRoot).toFixed(2);
  const xEnd = xAt(end).toFixed(2);
  const cosineZero = yAt(cosineChart, 0).toFixed(2);
  const sineZero = yAt(sineChart, 0).toFixed(2);
  const yLevel = yAt(cosineChart, level).toFixed(2);
  const rejectedSine = yAt(sineChart, -Math.abs(Math.sin(rejectedRoot))).toFixed(2);
  const acceptedSine = yAt(sineChart, Math.abs(Math.sin(acceptedRoot))).toFixed(2);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title-${taskId} desc-${taskId}">
    <title id="title-${taskId}">Графическая проверка cos x=${levelLabel} задания ${taskId}</title>
    <desc id="desc-${taskId}">Верхний график показывает y=cos x и уровень y=${levelLabel}. Нижний график y=sin x показывает область допустимых значений sin x больше нуля. Пунктиры связывают одинаковые абсциссы на обоих графиках.</desc>
    <style>
      .title { fill:#183153; font:700 23px Arial,sans-serif; }
      .subtitle { fill:#40566d; font:16px Arial,sans-serif; }
      .panel-title { fill:#183153; font:700 17px Arial,sans-serif; }
      .frame { fill:#fff; stroke:#cbd7e4; stroke-width:1.2; }
      .forbidden { fill:#fbe4e2; }
      .allowed { fill:#e6f4ea; }
      .axis { stroke:#526f89; stroke-width:1.5; }
      .boundary { stroke:#1a5f8e; stroke-width:1.8; stroke-dasharray:7 5; }
      .domain-edge { stroke:#8b4b4b; stroke-width:1.6; stroke-dasharray:5 5; }
      .curve { fill:none; stroke:#176b83; stroke-width:3.4; stroke-linecap:round; }
      .level { stroke:#8c5c10; stroke-width:2.2; stroke-dasharray:8 5; }
      .guide { stroke:#176b83; stroke-width:1.5; stroke-dasharray:5 5; }
      .guide-rejected { stroke:#b5483f; stroke-width:1.5; stroke-dasharray:5 5; }
      .sine-negative { fill:none; stroke:#b5483f; stroke-width:3.2; stroke-linecap:round; }
      .sine-positive { fill:none; stroke:#287442; stroke-width:3.4; stroke-linecap:round; }
      .root { fill:#176b83; stroke:#fff; stroke-width:2.5; }
      .rejected-root { fill:#fff; stroke:#b5483f; stroke-width:2.5; }
      .open { fill:#fff; stroke:#8b4b4b; stroke-width:2.2; }
      .label { fill:#124c5c; font:700 15px Arial,sans-serif; }
      .small { fill:#40566d; font:14px Arial,sans-serif; }
      .bad { fill:#8b4b4b; font:700 14px Arial,sans-serif; }
      .good { fill:#287442; font:700 14px Arial,sans-serif; }
    </style>
    <rect width="${width}" height="${height}" fill="#fff"/>
    <rect x="24" y="20" width="852" height="786" rx="12" fill="#f8fbfe" stroke="#cbd7e4"/>
    <text x="56" y="58" class="title">Графическая проверка: cos x=${levelLabel}</text>
    <text x="56" y="87" class="subtitle">Сначала находим пересечения, затем нижний график y=sin x оставляет только допустимую точку.</text>
    <text x="92" y="122" class="panel-title">1. Уравнение cos x=${levelLabel}</text>
    <rect x="${cosineChart.x}" y="${cosineChart.y}" width="${cosineChart.width}" height="${cosineChart.height}" class="frame"/>
    <line x1="${cosineChart.x}" y1="${cosineZero}" x2="${cosineChart.x + cosineChart.width}" y2="${cosineZero}" class="axis"/>
    <line x1="${cosineChart.x}" y1="${yLevel}" x2="${cosineChart.x + cosineChart.width}" y2="${yLevel}" class="level"/>
    <line x1="${cosineChart.x}" y1="${cosineChart.y}" x2="${cosineChart.x}" y2="${cosineChart.y + cosineChart.height}" class="boundary"/>
    <line x1="${xEnd}" y1="${cosineChart.y}" x2="${xEnd}" y2="${cosineChart.y + cosineChart.height}" class="boundary"/>
    <polyline points="${cosinePoints}" class="curve"/>
    <line x1="${xRejected}" y1="${yLevel}" x2="${xRejected}" y2="${rejectedSine}" class="guide-rejected"/>
    <line x1="${xAccepted}" y1="${yLevel}" x2="${xAccepted}" y2="${acceptedSine}" class="guide"/>
    <circle cx="${xRejected}" cy="${yLevel}" r="6" class="rejected-root"/>
    <circle cx="${xAccepted}" cy="${yLevel}" r="6" class="root"/>
    <text x="${xRejected}" y="${Number(yLevel) - 16}" text-anchor="middle" class="bad">${rejectedLabel}</text>
    <text x="${xAccepted}" y="${Number(yLevel) - 16}" text-anchor="middle" class="label">${acceptedLabel}</text>
    <text x="${cosineChart.x + 20}" y="${Number(yLevel) - 9}" class="label">y=${levelLabel}</text>
    <text x="680" y="322" class="label">y=cos x</text>
    <text x="92" y="468" class="panel-title">2. Проверка ОДЗ: sin x&gt;0</text>
    <rect x="${sineChart.x}" y="${sineChart.y}" width="${xDomainStart - sineChart.x}" height="${sineChart.height}" class="forbidden"/>
    <rect x="${xDomainStart}" y="${sineChart.y}" width="${sineChart.x + sineChart.width - xDomainStart}" height="${sineChart.height}" class="allowed"/>
    <rect x="${sineChart.x}" y="${sineChart.y}" width="${sineChart.width}" height="${sineChart.height}" class="frame"/>
    <line x1="${sineChart.x}" y1="${sineZero}" x2="${sineChart.x + sineChart.width}" y2="${sineZero}" class="axis"/>
    <line x1="${sineChart.x}" y1="${sineChart.y}" x2="${sineChart.x}" y2="${sineChart.y + sineChart.height}" class="boundary"/>
    <line x1="${xEnd}" y1="${sineChart.y}" x2="${xEnd}" y2="${sineChart.y + sineChart.height}" class="boundary"/>
    <line x1="${xDomainStart}" y1="${sineChart.y}" x2="${xDomainStart}" y2="${sineChart.y + sineChart.height}" class="domain-edge"/>
    <polyline points="${points(Math.sin, start, domainStart, sineChart)}" class="sine-negative"/>
    <polyline points="${points(Math.sin, domainStart, end, sineChart)}" class="sine-positive"/>
    <circle cx="${xDomainStart}" cy="${sineZero}" r="5.5" class="open"/>
    <circle cx="${xEnd}" cy="${sineZero}" r="5.5" class="open"/>
    <circle cx="${xRejected}" cy="${rejectedSine}" r="5.5" class="rejected-root"/>
    <circle cx="${xAccepted}" cy="${acceptedSine}" r="5.5" class="root"/>
    <text x="${(sineChart.x + Number(xDomainStart)) / 2}" y="${sineChart.y + 27}" text-anchor="middle" class="bad">sin x≤0: вне ОДЗ</text>
    <text x="${(Number(xDomainStart) + Number(xEnd)) / 2}" y="${sineChart.y + sineChart.height - 16}" text-anchor="middle" class="good">sin x&gt;0: ОДЗ</text>
    <text x="${xDomainStart}" y="${sineChart.y + sineChart.height + 30}" text-anchor="middle" class="label">${domainStartLabel}</text>
    <text x="${sineChart.x}" y="${sineChart.y + sineChart.height + 30}" text-anchor="start" class="label">${startLabel}</text>
    <text x="${xEnd}" y="${sineChart.y + sineChart.height + 30}" text-anchor="end" class="label">${endLabel}</text>
    <text x="56" y="${height - 42}" class="small">Пунктиры связывают пересечения верхнего графика с теми же значениями x на нижнем.</text>
    <text x="56" y="${height - 18}" class="small">${rejectedLabel} не подходит: sin(${rejectedLabel})=${rejectedSineLabel}&lt;0. Для ${acceptedLabel} имеем sin(${acceptedLabel})=${acceptedSineLabel}&gt;0.</text>
  </svg>`;
}

const cosineSineDomainGraphs = {
  FDA042: {
    taskId: 'FDA042', start: 7 * Math.PI / 2, end: 5 * Math.PI, domainStart: 4 * Math.PI,
    rejectedRoot: 15 * Math.PI / 4, acceptedRoot: 17 * Math.PI / 4, level: Math.SQRT1_2,
    levelLabel: '√2/2', rejectedLabel: '15π/4', acceptedLabel: '17π/4',
    rejectedSineLabel: '−√2/2', acceptedSineLabel: '√2/2',
    startLabel: '7π/2', domainStartLabel: '4π', endLabel: '5π'
  },
  A6BC58: {
    taskId: 'A6BC58', start: -13 * Math.PI / 2, end: -5 * Math.PI, domainStart: -6 * Math.PI,
    rejectedRoot: -37 * Math.PI / 6, acceptedRoot: -35 * Math.PI / 6, level: Math.sqrt(3) / 2,
    levelLabel: '√3/2', rejectedLabel: '−37π/6', acceptedLabel: '−35π/6',
    rejectedSineLabel: '−1/2', acceptedSineLabel: '1/2',
    startLabel: '−13π/2', domainStartLabel: '−6π', endLabel: '−5π'
  }
};

function buildSineDenominatorGraph({
  taskId,
  start,
  end,
  allowedStart,
  allowedEnd,
  levels,
  candidates,
  denominator,
  zeroes,
  startLabel,
  domainEndLabel,
  endLabel,
  title,
  subtitle,
  topPanelTitle = '1. Значения y=sin x из уравнения',
  domainPanelTitle = '',
  bottomPanelTitle = '2. Проверка знаменателя',
  allowedLabel = 'sin x&gt;0: ОДЗ',
  forbiddenLabel = 'sin x≤0: вне ОДЗ',
  domainNote = 'Синие точки удовлетворяют всем условиям; красная точка соответствует нулю знаменателя.',
  separateSolutionAndDomain = false
}) {
  const width = 900;
  const height = separateSolutionAndDomain ? 1140 : 830;
  const solutionChart = { x: 92, y: 142, width: 744, height: 210 };
  const sineChart = separateSolutionAndDomain
    ? { x: 92, y: 472, width: 744, height: 210 }
    : solutionChart;
  const denominatorChart = separateSolutionAndDomain
    ? { x: 92, y: 802, width: 744, height: 210 }
    : { x: 92, y: 488, width: 744, height: 210 };
  const sineLower = -1.25;
  const sineUpper = 1.25;
  const xAt = x => solutionChart.x + (x - start) / (end - start) * solutionChart.width;
  const solutionY = value => solutionChart.y + (sineUpper - value) / (sineUpper - sineLower) * solutionChart.height;
  const sineY = value => sineChart.y + (sineUpper - value) / (sineUpper - sineLower) * sineChart.height;
  const denominatorSamples = Array.from({ length: 1001 }, (_, index) => denominator.fn(start + (end - start) * index / 1000));
  let denominatorLower = Math.min(0, ...denominatorSamples);
  let denominatorUpper = Math.max(0, ...denominatorSamples);
  const denominatorPadding = Math.max((denominatorUpper - denominatorLower) * 0.12, 0.25);
  denominatorLower -= denominatorPadding;
  denominatorUpper += denominatorPadding;
  const denominatorY = value => denominatorChart.y
    + (denominatorUpper - value) / (denominatorUpper - denominatorLower) * denominatorChart.height;
  const points = (fn, chartY) => Array.from({ length: 900 }, (_, index) => {
    const x = start + (end - start) * index / 899;
    return `${xAt(x).toFixed(2)},${chartY(fn(x)).toFixed(2)}`;
  }).join(' ');
  const solutionPoints = points(Math.sin, solutionY);
  const sinePoints = separateSolutionAndDomain ? points(Math.sin, sineY) : solutionPoints;
  const denominatorPoints = points(denominator.fn, denominatorY);
  const solutionZero = solutionY(0).toFixed(2);
  const sineZero = sineY(0).toFixed(2);
  const denominatorZero = denominatorY(0).toFixed(2);
  const xAllowedStart = xAt(allowedStart).toFixed(2);
  const xAllowedEnd = xAt(allowedEnd).toFixed(2);
  const xEnd = xAt(end).toFixed(2);
  const topLevels = levels.map((level, index) => {
    const y = solutionY(level.value).toFixed(2);
    return `<line x1="${solutionChart.x}" y1="${y}" x2="${solutionChart.x + solutionChart.width}" y2="${y}" class="level level-${index}"/>
      <text x="${solutionChart.x + 18}" y="${Number(y) - 8}" class="level-label">${level.label}</text>`;
  }).join('');
  const connectors = candidates.map(candidate => {
    const x = xAt(candidate.x).toFixed(2);
    const upperY = solutionY(candidate.value).toFixed(2);
    const lowerY = denominatorY(denominator.fn(candidate.x)).toFixed(2);
    const pointClass = candidate.accepted ? 'accepted-point' : 'rejected-point';
    const guideClass = candidate.accepted ? 'guide' : 'guide-rejected';
    return `<line x1="${x}" y1="${upperY}" x2="${x}" y2="${lowerY}" class="${guideClass}"/>
      <circle cx="${x}" cy="${upperY}" r="6" class="${pointClass}"/>
      <circle cx="${x}" cy="${lowerY}" r="5.5" class="${pointClass}"/>
      <text x="${x}" y="${Number(upperY) - 16}" text-anchor="middle" class="${candidate.accepted ? 'accepted-label' : 'rejected-label'}">${candidate.label}</text>`;
  }).join('');
  const zeroMarks = zeroes.map(zero => {
    const x = xAt(zero.x).toFixed(2);
    return `<line x1="${x}" y1="${denominatorChart.y}" x2="${x}" y2="${denominatorChart.y + denominatorChart.height}" class="domain-edge"/>
      <circle cx="${x}" cy="${denominatorZero}" r="6" class="rejected-point"/>
      <text x="${x}" y="${Number(denominatorZero) + 22}" text-anchor="middle" class="rejected-label">${zero.label}: знаменатель 0</text>`;
  }).join('');
  const solutionDomainHighlights = separateSolutionAndDomain ? '' : `
    <rect x="${solutionChart.x}" y="${solutionChart.y}" width="${Number(xAllowedStart) - solutionChart.x}" height="${solutionChart.height}" class="forbidden"/>
    <rect x="${xAllowedStart}" y="${solutionChart.y}" width="${Number(xAllowedEnd) - Number(xAllowedStart)}" height="${solutionChart.height}" class="allowed"/>
    <rect x="${xAllowedEnd}" y="${solutionChart.y}" width="${solutionChart.x + solutionChart.width - Number(xAllowedEnd)}" height="${solutionChart.height}" class="forbidden"/>`;
  const domainPanel = separateSolutionAndDomain ? `
    <text x="92" y="452" class="panel-title">${domainPanelTitle}</text>
    <rect x="${sineChart.x}" y="${sineChart.y}" width="${Number(xAllowedStart) - sineChart.x}" height="${sineChart.height}" class="forbidden"/>
    <rect x="${xAllowedStart}" y="${sineChart.y}" width="${Number(xAllowedEnd) - Number(xAllowedStart)}" height="${sineChart.height}" class="allowed"/>
    <rect x="${xAllowedEnd}" y="${sineChart.y}" width="${sineChart.x + sineChart.width - Number(xAllowedEnd)}" height="${sineChart.height}" class="forbidden"/>
    <rect x="${sineChart.x}" y="${sineChart.y}" width="${sineChart.width}" height="${sineChart.height}" class="frame"/>
    <line x1="${sineChart.x}" y1="${sineZero}" x2="${sineChart.x + sineChart.width}" y2="${sineZero}" class="axis"/>
    <line x1="${sineChart.x}" y1="${sineChart.y}" x2="${sineChart.x}" y2="${sineChart.y + sineChart.height}" class="boundary"/>
    <line x1="${xEnd}" y1="${sineChart.y}" x2="${xEnd}" y2="${sineChart.y + sineChart.height}" class="boundary"/>
    <line x1="${xAllowedEnd}" y1="${sineChart.y}" x2="${xAllowedEnd}" y2="${sineChart.y + sineChart.height}" class="domain-edge"/>
    <polyline points="${sinePoints}" class="sine"/>
    <text x="${(Number(xAllowedStart) + Number(xAllowedEnd)) / 2}" y="${sineChart.y + sineChart.height - 16}" text-anchor="middle" class="good">${allowedLabel}</text>
    <text x="${(Number(xAllowedEnd) + Number(xEnd)) / 2}" y="${sineChart.y + sineChart.height - 16}" text-anchor="middle" class="bad">${forbiddenLabel}</text>` : '';
  const solutionDomainLabels = separateSolutionAndDomain ? '' : `
    <text x="${(Number(xAllowedStart) + Number(xAllowedEnd)) / 2}" y="${solutionChart.y + solutionChart.height - 16}" text-anchor="middle" class="good">${allowedLabel}</text>
    <text x="${(Number(xAllowedEnd) + Number(xEnd)) / 2}" y="${solutionChart.y + solutionChart.height - 16}" text-anchor="middle" class="bad">${forbiddenLabel}</text>`;
  const bottomTitleY = separateSolutionAndDomain ? 782 : 468;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title-${taskId} desc-${taskId}">
    <title id="title-${taskId}">${title}</title>
    <desc id="desc-${taskId}">${subtitle}</desc>
    <style>
      .title { fill:#183153; font:700 23px Arial,sans-serif; }
      .subtitle { fill:#40566d; font:16px Arial,sans-serif; }
      .panel-title { fill:#183153; font:700 17px Arial,sans-serif; }
      .frame { fill:#fff; stroke:#cbd7e4; stroke-width:1.2; }
      .allowed { fill:#e6f4ea; }
      .forbidden { fill:#fbe4e2; }
      .axis { stroke:#526f89; stroke-width:1.5; }
      .boundary { stroke:#1a5f8e; stroke-width:1.8; stroke-dasharray:7 5; }
      .domain-edge { stroke:#b5483f; stroke-width:1.5; stroke-dasharray:5 5; }
      .sine { fill:none; stroke:#176b83; stroke-width:3.4; stroke-linecap:round; }
      .denominator { fill:none; stroke:#6c4b99; stroke-width:3.2; stroke-linecap:round; }
      .level { stroke:#8c5c10; stroke-width:2; stroke-dasharray:8 5; }
      .level-1 { stroke:#bd6b1a; }
      .level-label { fill:#8c5c10; font:700 14px Arial,sans-serif; }
      .guide { stroke:#176b83; stroke-width:1.5; stroke-dasharray:5 5; }
      .guide-rejected { stroke:#b5483f; stroke-width:1.5; stroke-dasharray:5 5; }
      .accepted-point { fill:#176b83; stroke:#fff; stroke-width:2.5; }
      .rejected-point { fill:#fff; stroke:#b5483f; stroke-width:2.5; }
      .accepted-label { fill:#124c5c; font:700 15px Arial,sans-serif; }
      .rejected-label { fill:#8b4b4b; font:700 14px Arial,sans-serif; }
      .label { fill:#124c5c; font:700 15px Arial,sans-serif; }
      .note { fill:#40566d; font:14px Arial,sans-serif; }
      .good { fill:#287442; font:700 14px Arial,sans-serif; }
      .bad { fill:#8b4b4b; font:700 14px Arial,sans-serif; }
    </style>
    <rect width="${width}" height="${height}" fill="#fff"/>
    <rect x="24" y="20" width="852" height="${height - 44}" rx="12" fill="#f8fbfe" stroke="#cbd7e4"/>
    <text x="56" y="58" class="title">Графическая проверка с ОДЗ</text>
    <text x="56" y="87" class="subtitle">${subtitle}</text>
    <text x="92" y="122" class="panel-title">${topPanelTitle}</text>
    ${solutionDomainHighlights}
    <rect x="${solutionChart.x}" y="${solutionChart.y}" width="${solutionChart.width}" height="${solutionChart.height}" class="frame"/>
    <line x1="${solutionChart.x}" y1="${solutionZero}" x2="${solutionChart.x + solutionChart.width}" y2="${solutionZero}" class="axis"/>
    ${topLevels}
    <line x1="${solutionChart.x}" y1="${solutionChart.y}" x2="${solutionChart.x}" y2="${solutionChart.y + solutionChart.height}" class="boundary"/>
    <line x1="${xEnd}" y1="${solutionChart.y}" x2="${xEnd}" y2="${solutionChart.y + solutionChart.height}" class="boundary"/>
    <polyline points="${solutionPoints}" class="sine"/>
    ${solutionDomainLabels}
    ${domainPanel}
    <text x="92" y="${bottomTitleY}" class="panel-title">${bottomPanelTitle}</text>
    <rect x="${denominatorChart.x}" y="${denominatorChart.y}" width="${denominatorChart.width}" height="${denominatorChart.height}" class="frame"/>
    <line x1="${denominatorChart.x}" y1="${denominatorZero}" x2="${denominatorChart.x + denominatorChart.width}" y2="${denominatorZero}" class="axis"/>
    <line x1="${denominatorChart.x}" y1="${denominatorChart.y}" x2="${denominatorChart.x}" y2="${denominatorChart.y + denominatorChart.height}" class="boundary"/>
    <line x1="${xEnd}" y1="${denominatorChart.y}" x2="${xEnd}" y2="${denominatorChart.y + denominatorChart.height}" class="boundary"/>
    <polyline points="${denominatorPoints}" class="denominator"/>
    ${connectors}
    ${zeroMarks}
    <text x="${denominatorChart.x + 20}" y="${denominatorChart.y + 27}" class="label">${denominator.label}</text>
    <text x="${sineChart.x}" y="${sineChart.y + sineChart.height + 30}" text-anchor="start" class="label">${startLabel}</text>
    <text x="${xAllowedEnd}" y="${sineChart.y + sineChart.height + 30}" text-anchor="middle" class="label">${domainEndLabel}</text>
    <text x="${xEnd}" y="${sineChart.y + sineChart.height + 30}" text-anchor="end" class="label">${endLabel}</text>
    <text x="56" y="${height - 42}" class="note">Пунктиры связывают кандидаты на верхнем графике с теми же значениями x на нижнем.</text>
    <text x="56" y="${height - 18}" class="note">${domainNote}</text>
  </svg>`;
}

const sineDenominatorGraphs = {
  '638272': {
    taskId: '638272', start: 0, end: 3 * Math.PI / 2, allowedStart: 0, allowedEnd: Math.PI,
    levels: [{ value: 1, label: 'y=1' }, { value: 1 / 2, label: 'y=1/2' }],
    candidates: [
      { x: Math.PI / 6, value: 1 / 2, label: 'π/6', accepted: true },
      { x: Math.PI / 2, value: 1, label: 'π/2', accepted: true },
      { x: 5 * Math.PI / 6, value: 1 / 2, label: '5π/6', accepted: false }
    ],
    denominator: { fn: x => 2 * Math.cos(x) + Math.sqrt(3), label: 'y=2cos x+√3' },
    zeroes: [{ x: 5 * Math.PI / 6, label: '5π/6' }],
    startLabel: '0', domainEndLabel: 'π', endLabel: '3π/2',
    title: 'Проверка ОДЗ задания 638272',
    subtitle: 'Верхний график показывает решения sin x=1 и sin x=1/2; нижний — нуль знаменателя 2cos x+√3.'
  },
  B2FAAF: {
    taskId: 'B2FAAF', start: Math.PI / 2, end: 2 * Math.PI, allowedStart: Math.PI / 2, allowedEnd: Math.PI,
    levels: [{ value: 1, label: 'y=1' }, { value: 1 / 2, label: 'y=1/2' }],
    candidates: [
      { x: Math.PI / 2, value: 1, label: 'π/2', accepted: true },
      { x: 5 * Math.PI / 6, value: 1 / 2, label: '5π/6', accepted: true }
    ],
    denominator: { fn: x => 2 * Math.cos(x) - Math.sqrt(3), label: 'y=2cos x−√3' },
    zeroes: [{ x: 11 * Math.PI / 6, label: '11π/6' }],
    startLabel: 'π/2', domainEndLabel: 'π', endLabel: '2π',
    title: 'Проверка ОДЗ задания B2FAAF',
    subtitle: 'ОДЗ: sin x>0 и 2cos x−√3≠0; на [π/2; 2π] — [π/2; π).',
    topPanelTitle: '1. Решение уравнения: y=sin x',
    domainPanelTitle: '2. Первое условие ОДЗ: sin x>0',
    bottomPanelTitle: '3. Второе условие ОДЗ: знаменатель ≠0',
    allowedLabel: 'sin x>0: 1-е условие ОДЗ',
    forbiddenLabel: 'sin x≤0: вне ОДЗ',
    domainNote: 'ОДЗ — пересечение двух условий; на данном отрезке это [π/2; π).',
    separateSolutionAndDomain: true
  }
};

function solutionWithGraphSection(record, taskId) {
  if (taskId === 'FDA042') {
    const withoutOldGraphSection = record.solution.replace(/\n\nГрафическая проверка(?:(?: на заданном отрезке| ОДЗ))?:[\s\S]*$/, '');
    return `${withoutOldGraphSection}\n\nГрафическая проверка:\nНа верхнем графике построены y=cos x и уровень y=⟦√2¦2⟧. Они пересекаются при x=⟦15π¦4⟧ и x=⟦17π¦4⟧; пунктиры от точек пересечения проведены до оси абсцисс и нижнего графика. Нижний график y=sin x показывает ОДЗ: условие sin x>0 исключает x=⟦15π¦4⟧ и оставляет x=⟦17π¦4⟧.`;
  }
  if (taskId === 'A6BC58') {
    const withoutOldGraphSection = record.solution.replace(/\n\nГрафическая проверка(?:(?: на заданном отрезке| ОДЗ))?:[\s\S]*$/, '');
    return `${withoutOldGraphSection}\n\nГрафическая проверка:\nНа верхнем графике построены y=cos x и уровень y=⟦√3¦2⟧. Они пересекаются при x=−⟦37π¦6⟧ и x=−⟦35π¦6⟧; пунктиры от точек пересечения проведены до оси абсцисс и нижнего графика. Нижний график y=sin x показывает ОДЗ: условие sin x>0 исключает x=−⟦37π¦6⟧ и оставляет x=−⟦35π¦6⟧.`;
  }
  if (taskId === '638272') {
    const withoutOldGraphSection = record.solution.replace(/\n\nГрафическая проверка(?:(?: на заданном отрезке| ОДЗ))?:[\s\S]*$/, '');
    return `${withoutOldGraphSection}\n\nГрафическая проверка:\nНа верхнем графике y=sin x уровни y=1 и y=⟦1¦2⟧ дают кандидаты x=⟦π¦6⟧, x=⟦π¦2⟧ и x=⟦5π¦6⟧. Нижний график y=2cos x+√3 показывает, что при x=⟦5π¦6⟧ знаменатель равен нулю. Поэтому остаются x=⟦π¦6⟧ и x=⟦π¦2⟧.`;
  }
  if (taskId === 'B2FAAF') {
    const withoutOldGraphSection = record.solution.replace(/\n\nГрафическая проверка(?:(?: на заданном отрезке| ОДЗ))?:[\s\S]*$/, '');
    return `${withoutOldGraphSection}\n\nГрафическая проверка:\nОДЗ задаётся двумя условиями: sin x>0 и 2cos x−√3≠0. На верхнем графике первое условие на отрезке [⟦π¦2⟧; 2π] даёт [⟦π¦2⟧; π). На нижнем графике второе условие нарушается при x=⟦11π¦6⟧, но эта точка уже не входит в первое условие, так как sin⟦11π¦6⟧<0. Поэтому на данном отрезке пересечение двух условий ОДЗ равно [⟦π¦2⟧; π). Уровни y=1 и y=⟦1¦2⟧ дают x=⟦π¦2⟧ и x=⟦5π¦6⟧; обе точки принадлежат этому пересечению.`;
  }
  const withoutOldGraphSection = record.solution.replace(/\n\nГрафическая проверка(?:(?: на заданном отрезке| ОДЗ))?:[\s\S]*$/, '');
  return `${withoutOldGraphSection}\n\n${graphMarker}\nСверху построен график функции из полученного решения с уровнями соответствующих значений. Синими точками отмечены корни из пункта б). Снизу показано, что область определения содержит весь заданный отрезок.`;
}

const db = new DatabaseSync(databaseFile);
const getSolution = db.prepare(`
  SELECT task_id, solution, diagram_svg, diagram_caption
  FROM solutions WHERE task_id = ? AND published = 1
`);
const updateSolution = db.prepare(`
  UPDATE solutions
  SET solution = ?, diagram_svg = ?, diagram_caption = ?, updated_at = ?
  WHERE task_id = ? AND published = 1
`);
const selectedTaskId = process.env.TASK_ID;

let updated = 0;
let skipped = 0;
db.exec('BEGIN');
try {
  for (const definition of collectEquationDefinitions()) {
    if (definition.error) throw new Error(`${definition.taskId}: ${definition.error}`);
    if (selectedTaskId && definition.taskId !== selectedTaskId) {
      skipped += 1;
      continue;
    }
    if (definition.taskId === '92FD74') {
      skipped += 1;
      continue;
    }
    const record = getSolution.get(definition.taskId);
    if (!record) throw new Error(`${definition.taskId}: опубликованное решение не найдено.`);
    const solution = solutionWithGraphSection(record, definition.taskId);
    const cosineDomainGraph = cosineSineDomainGraphs[definition.taskId];
    const sineDenominatorGraph = sineDenominatorGraphs[definition.taskId];
    const graph = cosineDomainGraph
      ? buildCosineSineDomainGraph(cosineDomainGraph)
      : sineDenominatorGraph
        ? buildSineDenominatorGraph(sineDenominatorGraph)
        : buildSolutionGraph(definition.taskId, definition.interval, definition.expected, record.solution);
    const caption = definition.taskId === 'FDA042'
      ? 'Сверху: y=cos x и уровень y=√2/2. Снизу: y=sin x и ОДЗ sin x>0. Пунктиры связывают пересечения с нижним графиком.'
      : definition.taskId === 'A6BC58'
        ? 'Сверху: y=cos x и уровень y=√3/2. Снизу: y=sin x и ОДЗ sin x>0. Пунктиры связывают пересечения с нижним графиком.'
      : definition.taskId === '638272'
        ? 'Сверху: y=sin x и уровни y=1, y=1/2. Снизу: y=2cos x+√3; при 5π/6 знаменатель равен нулю.'
      : definition.taskId === 'B2FAAF'
        ? 'Сверху — решение: y=sin x и уровни y=1, y=1/2. Ниже — два условия ОДЗ: sin x>0 и 2cos x−√3≠0.'
      : 'Сверху — график функции из полученного решения с отмеченными корнями; снизу — ОДЗ: x∈ℝ на заданном отрезке.';
    updateSolution.run(solution, graph, caption, new Date().toISOString(), definition.taskId);
    updated += 1;
  }
  db.exec('COMMIT');
} catch (error) {
  db.exec('ROLLBACK');
  throw error;
}

console.log(JSON.stringify({ updated, skipped }));
