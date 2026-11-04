'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { conditionText } = require('../../lib/seo-text');

// Coordinates are (a + b√2)/2. All coefficient products in this bank are
// exact safe integers. Boundary tests compare integer squares, not decimals.
const add = (x, y) => x.map((v, i) => v + y[i]);
const sub = (x, y) => x.map((v, i) => v - y[i]);
const mul = ([a, b], [c, d]) => [a * c + 2 * b * d, a * d + b * c];
const real = ([a, b]) => (a + b * Math.SQRT2) / 2;
function sign([a, b]) {
  assert.ok(Number.isSafeInteger(a * a) && Number.isSafeInteger(2 * b * b));
  if (!a) return Math.sign(b);
  if (!b || Math.sign(a) === Math.sign(b)) return Math.sign(a);
  return Math.sign(a) * Math.sign(a * a - 2 * b * b);
}
const compare = (a, b) => sign(sub(a, b));
const equalPoint = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const edgeKey = (a, b) => [JSON.stringify(a), JSON.stringify(b)].sort().join('|');
function parse(code) {
  const pattern = /Повтори|Вперёд|Назад|Направо|Налево|Поднять хвост|Опустить хвост|-?\d+|\[|\]/gu;
  assert.equal(code.replace(pattern, '').replace(/[\s.:]/gu, ''), '', 'unsupported turtle command');
  const tokens = code.match(pattern); let index = 0;
  function block(nested) {
    const commands = [];
    while (index < tokens.length) {
      const op = tokens[index++];
      if (op === ']') { assert.ok(nested); return commands; }
      if (op.endsWith('хвост')) { commands.push([op]); continue; }
      const n = Number(tokens[index++]); assert.ok(Number.isInteger(n));
      if (op === 'Повтори') {
        assert.ok(n > 0 && n < 100); assert.equal(tokens[index++], '[');
        commands.push([op, n, block(true)]);
      } else commands.push([op, n]);
    }
    assert.ok(!nested, 'unclosed command group'); return commands;
  }
  return block(false);
}
function execute(commands) {
  let point = [[0, 0], [0, 0]], heading = 2, pen = true;
  const paths = [[point]], trace = [];
  const directions = [[[2, 0], [0, 0]], [[0, 1], [0, 1]], [[0, 0], [2, 0]], [[0, -1], [0, 1]], [[-2, 0], [0, 0]], [[0, -1], [0, -1]], [[0, 0], [-2, 0]], [[0, 1], [0, -1]]];
  function run(cs) {
    for (const [op, n, body] of cs) {
      if (op === 'Повтори') { for (let i = 0; i < n; i++) run(body); continue; }
      if (op === 'Поднять хвост') pen = false;
      else if (op === 'Опустить хвост') { pen = true; paths.push([point]); }
      else if (op === 'Направо' || op === 'Налево') {
        assert.equal(n % 45, 0); heading = ((heading + (op === 'Налево' ? n : -n) / 45) % 8 + 8) % 8;
      } else {
        assert.ok(op === 'Вперёд' || op === 'Назад'); const k = op === 'Назад' ? -n : n;
        point = point.map((v, i) => add(v, directions[heading][i].map(x => x * k)));
        if (pen) paths.at(-1).push(point);
      }
      trace.push({ command: n === undefined ? [op] : [op, n], point, heading: heading * 45, pen });
    }
  }
  run(commands);
  const polygons = paths.map(points => {
    const end = points.findIndex((p, i) => i && equalPoint(p, points[0])); assert.ok(end >= 3);
    const edges = new Set(points.slice(0, end).map((p, i) => edgeKey(p, points[i + 1])));
    for (let i = 1; i < points.length; i++) assert.ok(edges.has(edgeKey(points[i - 1], points[i])), 'later stroke changes figure');
    return points.slice(0, end);
  });
  return { polygons, trace };
}
function inside(polygon, x, y, boundary) {
  const p = [[2 * x, 0], [2 * y, 0]]; let winding = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    const cross = sign(sub(mul(sub(b[0], a[0]), sub(p[1], a[1])), mul(sub(b[1], a[1]), sub(p[0], a[0]))));
    if (!cross && compare(p[0], a[0]) * compare(p[0], b[0]) <= 0 && compare(p[1], a[1]) * compare(p[1], b[1]) <= 0) return boundary;
    const ay = compare(a[1], p[1]), by = compare(b[1], p[1]);
    if (ay <= 0 && by > 0 && cross > 0) winding++;
    if (by <= 0 && ay > 0 && cross < 0) winding--;
  }
  return winding !== 0;
}
function compute(task, data = {}) {
  const s = conditionText(task.fragment); let result;
  if (s.includes('Черепахе был дан')) {
    assert.ok(s.includes('в начале координат') && s.includes('положительного направления оси ординат') && s.includes('хвост опущен'));
    const code = s.match(/Черепахе был дан.*?алгоритм[.:]?\s*(.*?)\s*Определите/u)[1].trim().replace(/\.$/u, '').trim();
    const commands = parse(code), { polygons, trace } = execute(commands);
    const boundary = s.includes('включая точки') && !s.includes('не включая точки');
    const operation = s.includes('пересечения') ? 'intersection' : s.includes('объединения') ? 'union' : 'single';
    const metric = s.includes('периметр') ? 'perimeter' : s.includes('Определите площадь') ? 'area' : 'points';
    const rectangles = []; let answer, rows = [];
    if (polygons.length === 2) {
      for (const poly of polygons) {
        assert.equal(poly.length, 4); assert.ok(poly.flat().every(([a, b]) => !b && a % 2 === 0));
        const xs = poly.map(p => p[0][0] / 2), ys = poly.map(p => p[1][0] / 2);
        const rect = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
        assert.deepEqual(new Set(poly.map(p => p.map(real).join(','))), new Set([0, 1].flatMap(i => [2, 3].map(j => [rect[i], rect[j]].join(',')))));
        rectangles.push(rect);
      }
      const [a, b] = rectangles, c = [Math.max(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.min(a[3], b[3])];
      assert.ok(c[0] < c[1] && c[2] < c[3]);
      if (metric === 'perimeter') { assert.equal(operation, 'intersection'); answer = 2 * (c[1] - c[0] + c[3] - c[2]); }
      if (metric === 'area') { assert.equal(operation, 'union'); const area = r => (r[1] - r[0]) * (r[3] - r[2]); answer = area(a) + area(b) - area(c); }
    }
    if (metric === 'points') {
      const all = polygons.flat(), xs = all.map(p => real(p[0])), ys = all.map(p => real(p[1])); answer = 0;
      for (let y = Math.floor(Math.min(...ys)) - 1; y <= Math.ceil(Math.max(...ys)) + 1; y++) {
        const row = [];
        for (let x = Math.floor(Math.min(...xs)) - 1; x <= Math.ceil(Math.max(...xs)) + 1; x++) {
          const hits = polygons.map(poly => inside(poly, x, y, boundary));
          if (operation === 'intersection' ? hits.every(Boolean) : hits.some(Boolean)) row.push(x);
        }
        if (row.length) { rows.push({ y, x: row, count: row.length }); answer += row.length; }
      }
    }
    assert.ok(Number.isSafeInteger(answer)); result = { kind: 'turtle', answer: String(answer), commands, code, polygons, trace, rectangles, boundary, operation, metric, ...(metric === 'points' ? { rows } : {}) };
  } else if (s.includes('Чертёжнику был дан')) {
    assert.match(s, /где.*?целые/u);
    const pairs = [...s.split('Чертёжнику был дан')[1].matchAll(/сместиться на\s*\(([–−-]?\d+),\s*([–−-]?\d+)\)/gu)].map(m => m.slice(1).map(v => Number(v.replace(/[–−]/gu, '-'))));
    assert.equal(pairs.length, 3); const requiredTotal = pairs[0].map((v, i) => -v - pairs[2][i]);
    let [a, b] = requiredTotal.map(Math.abs); while (b) [a, b] = [b, a % b]; assert.ok(a > 0);
    const unknown = requiredTotal.map((v, i) => v / a - pairs[1][i]);
    result = { kind: 'draftsman', answer: String(a), pairs, requiredTotal, repetitions: a, unknown };
  } else if (s.includes('правильный шестиугольник')) {
    const m = s.match(/Повтори (\d+) \[Вперед (\d+) Направо n\]/u); assert.ok(m); assert.equal(Number(m[1]), 7); assert.equal(Number(m[2]), 40);
    const turn = 360 / 6, options = [...s.matchAll(/([1-4])\)\s*(\d+)/gu)]; assert.equal(options.length, 4);
    const choice = options.filter(m => Number(m[2]) === turn); assert.equal(choice.length, 1);
    result = { kind: 'polygon-angle', answer: choice[0][1], sides: 6, turn, choice: Number(choice[0][1]), repetitions: Number(m[1]), length: Number(m[2]) };
  } else if (s.includes('Робот успешно выполнил программу')) {
    const word = s.match(/Робот успешно выполнил программу (\d+)/u)[1]; assert.match(s, /из трех команд/u);
    const moves = [[0, 1], [0, -1], [1, 0], [-1, 0]], edges = new Set(), walk = [[0, 0]];
    for (const c of word) { const p = walk.at(-1), q = p.map((v, i) => v + moves[Number(c) - 1][i]); edges.add(edgeKey(p, q)); walk.push(q); }
    const accepted = [];
    function visit(p, code) {
      if (code.length === 3) { if (p[0] === 0 && p[1] === 0) accepted.push(code); return; }
      moves.forEach((v, i) => { const q = p.map((n, j) => n + v[j]); if (edges.has(edgeKey(p, q))) visit(q, code + (i + 1)); });
    }
    visit(walk.at(-1), ''); assert.equal(accepted.length, 1); result = { kind: 'safe-return', answer: accepted[0], walk, accepted };
  } else {
    assert.equal(task.id, 'EGEINFB08376'); assert.ok(s.includes('ПОКА слева свободно ИЛИ сверху свободно ЕСЛИ сверху свободно ТО вверх ИНАЧЕ влево'));
    assert.ok(s.includes('(клетка А1)')); const walls = data.walls; assert.equal(walls.length, 8);
    const blocked = new Set(walls.map(([a, b]) => edgeKey(a, b))), traces = [];
    const free = (a, b) => b[0] >= 0 && b[0] < 6 && b[1] >= 1 && b[1] <= 6 && !blocked.has(edgeKey(a, b));
    for (let y = 1; y <= 6; y++) for (let x = 0; x < 6; x++) {
      const start = [x, y], route = [start]; let p = start;
      for (;;) { const up = [p[0], p[1] - 1], left = [p[0] - 1, p[1]]; if (free(p, up)) p = up; else if (free(p, left)) p = left; else break; route.push(p); }
      traces.push({ start, end: p, path: route });
    }
    result = { kind: 'maze', answer: String(traces.filter(t => t.end[0] === 0 && t.end[1] === 1).length), walls, traces };
  }
  return result;
}
function auditPrimaryImage(task, source, root) {
  const review = source.primaryImageReview; assert.ok(review && review.reviewed);
  const images = [...task.fragment.split('КЭС:')[0].matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/giu)].map(m => m[1]);
  assert.deepEqual(images, review.files.map(f => f.src)); assert.equal(images.length, 1);
  for (const f of review.files) { assert.ok(f.src.startsWith('/fipi/ege-informatics/')); const file = path.join(root, 'fipi-assets', f.src.slice('/fipi/'.length)); assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'), f.sha256); }
}
module.exports = { compute, auditPrimaryImage };
