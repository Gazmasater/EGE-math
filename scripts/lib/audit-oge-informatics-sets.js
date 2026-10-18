'use strict';

const assert = require('node:assert/strict');
const { conditionText, seoPlainText } = require('../../lib/seo-text');

// Exact rational arithmetic keeps the independent feasible-region audit free
// from floating-point tolerances. At most seven Venn regions are involved.
const gcd = (a, b) => b ? gcd(b, a % b) : (a < 0n ? -a : a);
const fraction = (n, d = 1n) => { const g = gcd(n, d); return d < 0n ? [-n / g, -d / g] : [n / g, d / g]; };
const add = (a, b) => fraction(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
const neg = a => [-a[0], a[1]];
const mul = (a, b) => fraction(a[0] * b[0], a[1] * b[1]);
const div = (a, b) => fraction(a[0] * b[1], a[1] * b[0]);
const equal = (a, b) => a[0] === b[0] && a[1] === b[1];
const zero = () => [0n, 1n];

function reduce(matrix, columns) {
  const a = matrix.map(row => row.map(x => [...x]));
  let rank = 0;
  for (let col = 0; col < columns; col++) {
    const pivot = a.findIndex((row, index) => index >= rank && row[col][0] !== 0n);
    if (pivot < 0) continue;
    [a[pivot], a[rank]] = [a[rank], a[pivot]];
    const scale = a[rank][col];
    a[rank] = a[rank].map(x => div(x, scale));
    for (let row = 0; row < a.length; row++) if (row !== rank && a[row][col][0]) {
      const factor = a[row][col];
      a[row] = a[row].map((x, j) => add(x, neg(mul(factor, a[rank][j]))));
    }
    rank++;
  }
  return { matrix: a, rank };
}

function queryVector(query, labels) {
  const tokens = query.split(/([&|()])/u).map(x => x.trim()).filter(Boolean);
  const output = [], operators = [], priority = { '|': 1, '&': 2 };
  for (const token of tokens) {
    if (labels.includes(token)) output.push(token);
    else if (token === '(') operators.push(token);
    else if (token === ')') {
      while (operators.at(-1) !== '(') { assert.ok(operators.length); output.push(operators.pop()); }
      operators.pop();
    } else {
      assert.ok(priority[token], 'Unknown query token ' + token);
      while (priority[operators.at(-1)] >= priority[token]) output.push(operators.pop());
      operators.push(token);
    }
  }
  while (operators.length) output.push(operators.pop());
  return Array.from({ length: (1 << labels.length) - 1 }, (_, i) => {
    const stack = [];
    for (const token of output) {
      if (labels.includes(token)) stack.push(Boolean((i + 1) & (1 << labels.indexOf(token))));
      else { const b = stack.pop(), a = stack.pop(); assert.equal(typeof a, 'boolean'); stack.push(token === '&' ? a && b : a || b); }
    }
    assert.equal(stack.length, 1);
    return Number(stack[0]);
  });
}

function auditSets(task, record) {
  const text = conditionText(task.fragment);
  const rows = [];
  for (const row of task.fragment.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/giu)) {
    const cells = Array.from(row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/giu), m => seoPlainText(m[1]));
    if (cells.length === 2 && /^\d+$/u.test(cells[1])) rows.push([cells[0], Number(cells[1])]);
  }
  assert.ok(rows.length === 3 || rows.length === 6, task.id + ': primary table');
  const targetMatch = /(?:будет найдено по запросу|по следующему запросу:)\s*(.*?)(?=\?|, если| Укажите| Считается)/u.exec(text);
  assert.ok(targetMatch, task.id + ': requested query');
  const extras = [];
  if (text.includes(', если')) for (const m of text.split(', если')[1].matchAll(/по запросу (.*?) (?:было найдено |[–—-]\s*)(\d+)/gu)) extras.push([m[1].trim(), Number(m[2])]);
  const known = [...rows, ...extras];
  const labels = [...new Set(known.flatMap(([query]) => query.split(/[&|()]/u).map(x => x.trim()).filter(Boolean)))];
  assert.ok(labels.length === 2 || labels.length === 3);
  const vectors = known.map(([query]) => queryVector(query, labels));
  const target = queryVector(targetMatch[1].trim(), labels);
  const values = known.map(([, value]) => fraction(BigInt(value)));
  // Regions absent from every known query cannot affect a determined answer.
  const active = target.map((_, i) => i).filter(i => vectors.some(v => v[i]));
  for (let i = 0; i < target.length; i++) if (!active.includes(i)) assert.equal(target[i], 0);
  const matrix = vectors.map((v, i) => [...active.map(j => fraction(BigInt(v[j]))), values[i]]);
  const reduced = reduce(matrix, active.length);
  for (const row of reduced.matrix.slice(reduced.rank)) assert.equal(row.at(-1)[0], 0n, task.id + ': consistent rows');
  const rank = reduced.rank, feasible = [];
  let attempted = 0;
  function choose(selected, next) {
    if (selected.length === rank) {
      attempted++;
      const small = matrix.map(row => [...selected.map(j => row[j]), row.at(-1)]);
      const solved = reduce(small, rank);
      if (solved.rank !== rank || solved.matrix.slice(rank).some(row => row.at(-1)[0] !== 0n)) return;
      const assignment = Array.from({ length: active.length }, zero);
      selected.forEach((j, i) => { assignment[j] = solved.matrix[i].at(-1); });
      if (assignment.some(x => x[0] < 0n)) return;
      for (let i = 0; i < matrix.length; i++) {
        const sum = assignment.reduce((sum, x, j) => add(sum, mul(x, matrix[i][j])), zero());
        assert.ok(equal(sum, values[i]));
      }
      const result = assignment.reduce((sum, x, j) => add(sum, mul(x, fraction(BigInt(target[active[j]])))), zero());
      feasible.push({ assignment, result });
      return;
    }
    for (let j = next; j <= active.length - (rank - selected.length); j++) choose([...selected, j], j + 1);
  }
  choose([], 0);
  assert.ok(feasible.length, task.id + ': feasible nonnegative region sizes');
  // Every active region occurs in a nonnegative finite count constraint, so
  // this polytope is bounded. A linear target is determined iff all vertices agree.
  const answer = feasible[0].result;
  assert.ok(feasible.every(v => equal(v.result, answer)), task.id + ': uniquely determined result');
  assert.equal(answer[1], 1n);
  assert.equal(record.answer, String(answer[0]), task.id + ': answer');
  const totalMatch = /состоит из (\d+) сайтов/u.exec(text);
  if (totalMatch) assert.ok(feasible.some(v => {
    const sum = v.assignment.reduce(add, zero()); return sum[0] <= BigInt(totalMatch[1]) * sum[1];
  }), task.id + ': total sites admits a feasible assignment');
  const unit = text.includes('в сотнях тысяч') ? 'в сотнях тысяч страниц' : text.includes('в тысячах') ? 'в тысячах страниц' : 'в сайтах';
  assert.ok(record.solution.includes(unit));
  const compact = query => query.split(/([&|()])/u).map(x => x.trim()).filter(Boolean).map(x => labels.includes(x) ? 'ABC'[labels.indexOf(x)] : x === '&' ? '∩' : x === '|' ? '∪' : x).join(' ').replace(/\( /gu, '(').replace(/ \)/gu, ')');
  known.forEach(([q, v]) => assert.ok(record.solution.includes(`N(${compact(q)}) = ${v}.`), task.id + ': displayed input'));
  // Read the actual printed formula, without using generator coefficients.
  const goal = `N(${compact(targetMatch[1].trim())})`;
  const formula = record.solution.split('\n').find(line => line.startsWith(goal + ' = N('));
  assert.ok(formula, task.id + ': symbolic formula');
  const terms = Array.from(formula.slice((goal + ' = ').length).matchAll(/(^| \+ | − )N\((.*?)\)(?= \+ | − |\.$)/gu));
  assert.ok(terms.length);
  const printed = Array(target.length).fill(0);
  for (const term of terms) {
    const q = term[2].replace(/[ABC]/gu, c => labels['ABC'.indexOf(c)]).replace(/∩/gu, '&').replace(/∪/gu, '|');
    const vector = queryVector(q, labels), sign = term[1].includes('−') ? -1 : 1;
    vector.forEach((v, i) => { printed[i] += sign * v; });
  }
  for (const vertex of feasible) {
    const sum = vertex.assignment.reduce((sum, x, j) => add(sum, mul(x, fraction(BigInt(printed[active[j]])))), zero());
    assert.ok(equal(sum, answer), task.id + ': printed formula');
  }
  const calculations = Array.from(record.solution.matchAll(/^N\(.+\) = ([\d +−]+) = (\d+)\.$/gmu));
  assert.equal(calculations.length, 2, task.id + ': calculation and reverse check');
  for (const line of calculations) {
    const tokens = line[1].match(/\d+|[+−]/gu);
    assert.equal(tokens.length % 2, 1);
    let sum = Number(tokens[0]);
    for (let i = 1; i < tokens.length; i += 2) sum += (tokens[i] === '+' ? 1 : -1) * Number(tokens[i + 1]);
    assert.equal(sum, Number(line[2]), task.id + ': displayed arithmetic');
  }
  assert.equal(calculations[0][2], record.answer);
  return { answer: record.answer, vertices: feasible.length, checkedBases: attempted, rejectedEdits: attempted - feasible.length };
}

module.exports = { auditSets };
