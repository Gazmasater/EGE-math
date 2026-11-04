'use strict';

const assert = require('node:assert/strict');
const { conditionText } = require('../../lib/seo-text');

function readTransform(task) {
  const text = conditionText(task.fragment).replace(/\s+/gu, ' ');
  if (text.includes('Требовалось написать программу')) return { kind: 'debug', text };
  let kind;
  if (text.includes('трёхзначное число')) kind = 'decimal';
  else if (/заменяются на 10/u.test(text)) kind = 'replace';
  else if (/троичн/u.test(text)) kind = /слева к нему приписывается/u.test(text) ? 'ternary-prefix' : 'ternary-tail';
  else if (/три последние двоичные/u.test(text)) kind = 'binary-tail';
  else if (/сумма цифр его двоичной/u.test(text)) kind = 'weight';
  else if (/справа и слева дописываются по две единицы/u.test(text)) kind = 'wrap-even';
  else if (/в начало числа \(слева\) дописываются по две единицы/u.test(text)) kind = 'wrap-odd';
  else if (/слева дописывается 10/u.test(text)) kind = 'prefix10';
  else if (/остаток от деления суммы/u.test(text)) kind = 'parity';
  else if (/справа дописываются две единицы/u.test(text)) kind = 'suffix00';
  else if (/если N нечётное, в конец/u.test(text)) kind = 'suffix-odd01';
  else if (/если N чётное, в конец/u.test(text)) kind = 'suffix-even01';
  assert.ok(kind, 'unrecognized primary transformation');
  const question = text.slice(text.lastIndexOf('Укажите'));
  const limit = Number(question.match(/\d+/u)?.[0]);
  assert.ok(limit > 0);
  let objective = /минимальное|наименьшее|наименьшим/u.test(question) ? 'min' : 'max';
  objective += kind === 'decimal' || /число N/u.test(question) ? 'N' : 'R';
  if (/число R является наименьшим/u.test(question)) objective = 'minRreturnN';
  if (/N не больше/u.test(question)) objective = 'maxRlimitN';
  const comparison = /не меньше/u.test(question) ? '>=' : /не превыша/u.test(question) ? '<=' : /(?:^|\s)меньш(?:е|ее)(?:\s|,)/u.test(question) ? '<' : '>';
  return { kind, text, question, limit, objective, comparison };
}

function digits(n, radix) {
  const out = [];
  do { out.push(n % radix); n = Math.floor(n / radix); } while (n);
  return out.reverse();
}
function weight(n) { let count = 0; while (n) { count += n % 2; n = Math.floor(n / 2); } return count; }
function powerAbove(n, radix) { let p = radix; while (p <= n) p *= radix; return p; }

// Arithmetic implementation independent from the preparation script's string edits.
function compute(kind, n) {
  const p = powerAbove(n, kind.startsWith('ternary') ? 3 : 2), odd = n % 2, w = weight(n), rem = n % 3;
  switch (kind) {
    case 'parity': return 4 * n + 2 * (w % 2);
    case 'suffix00': return 4 * n + 3 * odd;
    case 'suffix-even01': return 4 * n + 1 + odd;
    case 'suffix-odd01': return 4 * n + 2 - odd;
    case 'wrap-even': return odd ? 4 * p + 4 * n : 12 * p + 4 * n + 3;
    case 'wrap-odd': return odd ? 12 * p + 4 * n + 3 : 2 * p + 2 * n;
    case 'prefix10': return odd ? 4 * p + 4 * n + 1 : 2 * p + n;
    case 'binary-tail': return rem === 1 ? 4 * n + 3 : rem === 2 ? 8 * n + 6 : n === 3 ? 15 : 8 * n + n % 8;
    case 'ternary-tail': return rem === 1 ? 9 * n + 5 : rem === 2 ? 27 * n + 10 : 9 * n + n % 9;
    case 'ternary-prefix': return rem === 1 ? 9 * n + 5 : rem === 2 ? 27 * n + 10 : 9 * p + 9 * n + 2;
    case 'weight': return odd ? powerAbove(w, 2) * n + w : 4 * p + 4 * n;
    case 'replace': return n === 1 ? 3 : (2 + w % 2) * (p / 2) + 2 * (n % (p / 4)) + w % 2;
    case 'decimal': {
      const a = Math.floor(n / 100), b = Math.floor(n / 10) % 10, c = n % 10;
      return Number(String(Math.min(a * b, b * c)) + String(Math.max(a * b, b * c)));
    }
  }
  throw new Error('unsupported transformation');
}
function accepts(value, model) {
  return model.comparison === '>' ? value > model.limit : model.comparison === '>=' ? value >= model.limit : model.comparison === '<' ? value < model.limit : value <= model.limit;
}
const LOWER = { parity: 4, suffix00: 4, 'suffix-even01': 4, 'suffix-odd01': 4, 'wrap-even': 8, 'wrap-odd': 4, prefix10: 3, 'binary-tail': 4, 'ternary-tail': 9, 'ternary-prefix': 9, weight: 2, replace: 1 };

function expression(text, vars) {
  const supers = { 'ᵏ': 'k', 'ᵈ': 'd', '⁺': '+', '⁻': '-', '¹': '1', '²': '2' };
  text = text.replace(/[ᵏᵈ⁺⁻¹²]+/gu, s => '^(' + [...s].map(c => supers[c]).join('') + ')')
    .replace(/\s+/gu, '').replaceAll('·', '*').replaceAll('−', '-').replace(/(\d)([Npkdst])/gu, '$1*$2');
  const tokens = text.match(/mod|\d+|[Npkdst()+*^\-]/gu) || [];
  assert.equal(tokens.join(''), text, 'unsupported printed formula');
  let i = 0;
  function atom() {
    const t = tokens[i++];
    if (t === '(') { const a = add(); assert.equal(tokens[i++], ')'); return a; }
    if (t === '-') return -atom();
    if (/^\d+$/u.test(t)) return Number(t);
    assert.ok(Object.hasOwn(vars, t), 'unknown formula variable'); return vars[t];
  }
  function power() { let a = atom(); if (tokens[i] === '^') { i++; a **= power(); } return a; }
  function multiply() { let a = power(); while (['*', 'mod'].includes(tokens[i])) { const op = tokens[i++], b = power(); a = op === '*' ? a * b : a % b; } return a; }
  function add() { let a = multiply(); while (['+', '-'].includes(tokens[i])) { const op = tokens[i++], b = multiply(); a = op === '+' ? a + b : a - b; } return a; }
  const value = add(); assert.equal(i, tokens.length); return value;
}

function checkFormulas(model, solution) {
  const body = solution.match(/Общ(?:ая формула:|ие формулы:) ([^.]+)\./u)?.[1]
    || solution.match(/Тогда общая формула ([^.]+)\./u)?.[1];
  assert.ok(body, 'missing general formula');
  const formulas = body.split('; ').map(s => {
    const [rhs, qualifier = ''] = s.replace(/^R = /u, '').split(' при ');
    return { rhs, qualifier };
  });
  const radix = model.kind.startsWith('ternary') ? 3 : 2;
  for (let n = 1; n <= 128; n++) {
    if (model.kind === 'replace' && n === 1 || model.kind === 'binary-tail' && n === 3) continue;
    const w = weight(n), k = digits(n, radix).length;
    const matching = formulas.filter(({ qualifier: q }) => !q || q.startsWith('нечётном') ? !q || n % 2 === 1
      : q.startsWith('чётном') ? n % 2 === 0 : q.startsWith('остатке 1') ? n % 3 === 1 : q.startsWith('остатке 2') ? n % 3 === 2 : q.startsWith('кратном 3') ? n % 3 === 0 : false);
    assert.equal(matching.length, 1, 'ambiguous formula branch');
    const value = expression(matching[0].rhs, { N: n, k, s: w, p: w % 2, d: digits(w, 2).length, t: n % (2 ** (k - 2)) });
    assert.equal(value, compute(model.kind, n), 'incorrect printed general formula');
    assert.ok(value >= LOWER[model.kind] * n, 'incorrect bound');
  }
  return formulas.length;
}

function solve(model) {
  const all = [];
  // All transformations preserve R >= N. Once a candidate R is found,
  // no N greater than it can yield a better minimum. For maxima use the cap.
  let stop = model.kind === 'decimal' ? 999 : model.objective.startsWith('max') ? model.limit : 100000;
  for (let n = model.kind === 'decimal' ? 100 : 1; n <= stop; n++) {
    const r = compute(model.kind, n);
    if (model.kind === 'decimal' ? r !== model.limit : model.objective !== 'maxRlimitN' && !accepts(r, model)) continue;
    all.push({ n, r });
    if (model.kind !== 'decimal' && model.objective === 'minN') break;
    if (model.kind !== 'decimal' && model.objective.startsWith('min')) stop = Math.min(stop, r);
  }
  assert.ok(all.length);
  const key = ['minN', 'maxN'].includes(model.objective) ? 'n' : 'r';
  all.sort((a, b) => (model.objective.startsWith('min') ? 1 : -1) * (a[key] - b[key]) || a.n - b.n);
  return { answer: String(model.objective === 'minRreturnN' ? all[0].n : all[0][key]), chosen: all[0], eligible: all };
}

function runDebug(n, digit, delta, output, equal) {
  let r = 0, d = 0;
  while (n > 0) { d = n % 10; if ((d === digit) === equal) r += delta === 'd' ? d : 1; n = Math.floor(n / 10); }
  return output === 'd' ? d : r;
}

function auditDebug(task, record, source) {
  const text = conditionText(task.fragment), compact = text.replace(/\s+/gu, '');
  const digit = Number(text.match(/количеству цифр (\d)/u)?.[1]);
  assert.ok([2, 4].includes(digit));
  const test = Number(text.match(/при вводе числа (\d+)/u)?.[1]);
  const four = digit === 4, increment = four ? 'd' : '1', output = four ? 'R' : 'd';
  const signature = `R=0;while(N>0){d=N%10;if(d!=${digit}){R=R+${increment};}N=N/10;}cout<<${output}<<endl;`;
  assert.ok(compact.includes(signature), 'primary C program differs');
  const example = Number(record.answer.match(/N = (\d+)/u)?.[1]);
  assert.ok(example >= 1 && example <= 1e9, 'debug answer example range');
  const original = runDebug(test, digit, increment, output, false);
  assert.equal(record.answer, `1) ${original}; 2) N = ${example}; 3) if d == ${digit}: и ${four ? 'R = R + 1' : 'print(R)'}`, 'debug answer');
  assert.equal(runDebug(example, digit, increment, output, false), String(example).split(String(digit)).length - 1, 'debug answer example');
  for (const line of [`Первая ошибочная строка: if d != ${digit}:`, `Правильная строка: if d == ${digit}:`, `Вторая ошибочная строка: ${four ? 'R = R + d' : 'print(d)'}`, `Правильная строка: ${four ? 'R = R + 1' : 'print(R)'}`]) assert.ok(record.solution.includes(line), 'incorrect debug correction');
  let traceN = test, traceR = 0;
  const traceLines = record.solution.split('\n').filter(s => /^N = \d+: d = /u.test(s));
  assert.equal(traceLines.length, digits(test, 10).length);
  for (const line of traceLines) {
    const d = traceN % 10;
    assert.ok(line.startsWith(`N = ${traceN}: d = ${d};`), 'incorrect debug trace');
    if (d === digit) assert.ok(line.includes(`R остаётся ${traceR}.`), 'incorrect unchanged count');
    else { const step = four ? d : 1; assert.ok(line.includes(`R = ${traceR} + ${step} = ${traceR + step}.`), 'incorrect trace addition'); traceR += step; }
    traceN = Math.floor(traceN / 10); assert.ok(line.endsWith(`Далее N = ${traceN}.`), 'incorrect next input');
  }
  assert.ok(record.solution.includes('ровно две ошибочные строки') && record.solution.includes('После обработки любых k последних цифр'), 'missing correction proof');
  let tested = 0;
  for (const n of [...Array(10000).keys()].slice(1).concat([1e9, 444444444, 222222222, 909090909])) {
    assert.equal(runDebug(n, digit, '1', 'R', true), String(n).split(String(digit)).length - 1);
    tested++;
  }
  if (source) {
    assert.equal(Number(source.externalAnswer), original);
    assert.equal(source.externalExample, four ? 401 : 3222);
    assert.equal(runDebug(source.externalExample, digit, increment, output, false), String(source.externalExample).split(String(digit)).length - 1);
    assert.deepEqual(source.externalCorrections, four ? ['if d = 4 then', 'R := R + 1;'] : ['if d = 2 then', 'writeln(R);']);
  }
  return { kind: four ? 'debug4' : 'debug2', expected: record.answer, tested, printedRows: 0, rejectedEdits: 0 };
}

function auditTransform(task, record, source) {
  const model = readTransform(task);
  if (model.kind === 'debug') return auditDebug(task, record, source);
  const expected = solve(model);
  assert.equal(record.answer, expected.answer, 'transformation answer');
  if (model.kind === 'decimal') {
    assert.deepEqual(expected.eligible.map(r => r.n).sort((a, b) => a - b), [237, 732]);
    assert.ok(record.solution.includes('Все допустимые входы: 237 и 732.'), 'incomplete decimal proof');
    for (const s of ['62 и 1', '6 и 21', '1 и 3', '237 и 732', 'от 100 до 999']) assert.ok(record.solution.includes(s), 'incomplete decimal proof');
    return { kind: model.kind, expected: expected.answer, tested: 900, printedRows: 0, rejectedEdits: 0 };
  }
  const formulas = checkFormulas(model, record.solution);
  const table = record.solution.split('В каждой паре сначала указан вход N, затем результат R:\n')[1]?.split('\n\n')[0];
  assert.ok(table, 'missing complete calculation table');
  const pairs = [...table.matchAll(/N = (\d+), R = (\d+)/gu)].map(m => ({ n: Number(m[1]), r: Number(m[2]) }));
  assert.ok(pairs.length > 0);
  for (let i = 0; i < pairs.length; i++) { assert.equal(pairs[i].n, i + 1, 'missing or reordered input'); assert.equal(pairs[i].r, compute(model.kind, i + 1), 'table arithmetic'); }
  const upper = pairs.length;
  if (model.objective === 'minN') assert.equal(upper, expected.chosen.n, 'minN bound');
  else if (model.objective === 'maxRlimitN') assert.equal(upper, model.limit, 'input bound');
  else {
    assert.ok(LOWER[model.kind] * (upper + 1) > (model.objective.startsWith('max') ? model.limit : expected.chosen.r), 'insufficient bound');
    assert.ok(record.solution.includes(`При N ≥ ${upper + 1} нижняя оценка даёт R ≥ ${LOWER[model.kind]} · ${upper + 1} = ${LOWER[model.kind] * (upper + 1)}`), 'incorrect printed bound');
  }
  const verification = record.solution.match(/Проверка выбранного входа: N = (\d+) = ([012]+)([₂₃])\./u);
  assert.ok(verification); const n = Number(verification[1]), radix = verification[3] === '₃' ? 3 : 2;
  assert.equal(verification[2], digits(n, radix).join(''), 'input numeral');
  assert.equal(n, expected.chosen.n, 'chosen input');
  const transformed = record.solution.match(/Преобразованная запись: ([012]+)([₂₃])\./u);
  assert.ok(transformed); assert.equal(transformed[2], verification[3]);
  assert.equal(transformed[1], digits(compute(model.kind, n), radix).join(''), 'output numeral');
  const sum = record.solution.match(/^R = ((?:\d+ \+ )*\d+) = (\d+)\.$/mu);
  assert.ok(sum);
  const expectedTerms = digits(compute(model.kind, n), radix).map((v, i, ds) => v * radix ** (ds.length - i - 1)).filter(Boolean);
  assert.deepEqual(sum[1].split(' + ').map(Number), expectedTerms, 'printed positional expansion');
  assert.equal(Number(sum[2]), compute(model.kind, n), 'printed final value');
  if (model.kind === 'binary-tail') assert.ok(record.solution.includes('1111₂ = 15') && record.solution.includes('11011₂ = 27'), 'small input clarification');
  return { kind: model.kind, expected: expected.answer, tested: upper, printedRows: pairs.length, formulas, rejectedEdits: 0 };
}

module.exports = { auditTransform, readTransform, compute, solve, auditDebug, runDebug };
