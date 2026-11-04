'use strict';

const assert = require('node:assert/strict');
const { conditionText, seoPlainText } = require('../../lib/seo-text');
const cache = new Map();

// A strict reader for the C/C++ listings. This is independent of the Python
// AST interpreter used to prepare the explanations.
function readC(fragment) {
  const cells = [...fragment.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/giu)]
    .map(m => seoPlainText(m[1])).filter(s => s.includes('void F'));
  assert.equal(cells.length, 1);
  const code = cells[0].replace(/\s+/gu, '').replace(/[−–]/gu, '-');
  let pos = 0;
  function consume(re) { const m = code.slice(pos).match(re); if (m) pos += m[0].length; return m; }
  function statement() {
    if (consume(/^\{/u)) { const nodes = []; while (code[pos] !== '}') nodes.push(statement()); pos++; return { kind: 'block', nodes }; }
    let m = consume(/^if\(n(>=|>)(\d+)\)/u);
    if (m) return { kind: 'if', op: m[1], limit: Number(m[2]), body: statement() };
    if (consume(/^(?:std::cout<<n|printf\("%d",n\));/u)) return { kind: 'print', value: 'n' };
    if (consume(/^printf\("\*"\);/u)) return { kind: 'print', value: '*' };
    m = consume(/^([FG])\(n([-\/])(\d+)\);/u);
    assert.ok(m, 'Unknown C statement at ' + code.slice(pos, pos + 60));
    return { kind: 'call', function: m[1], op: m[2], amount: Number(m[3]) };
  }
  const functions = {};
  while (pos < code.length) {
    const m = consume(/^void([FG])\(intn\)/u); assert.ok(m, 'Unknown C declaration');
    if (consume(/^;/u)) continue;
    assert.ok(!functions[m[1]], 'Repeated C definition'); functions[m[1]] = statement();
  }
  assert.ok(functions.F); return functions;
}

function runC(functions, start) {
  const output = [], calls = [], stack = [{ kind: 'invoke', function: 'F', n: start }];
  let operations = 0;
  while (stack.length) {
    assert.ok(++operations < 100000, 'C execution limit');
    const frame = stack.pop(), n = frame.n;
    if (frame.kind === 'invoke') { calls.push([frame.function, n]); stack.push({ kind: 'execute', node: functions[frame.function], n }); continue; }
    const node = frame.node; assert.ok(node);
    if (node.kind === 'block') for (const child of [...node.nodes].reverse()) stack.push({ kind: 'execute', node: child, n });
    else if (node.kind === 'if') { if (node.op === '>=' ? n >= node.limit : n > node.limit) stack.push({ kind: 'execute', node: node.body, n }); }
    else if (node.kind === 'print') output.push(node.value === 'n' ? n : '*');
    else { const next = node.op === '-' ? n - node.amount : Math.trunc(n / node.amount); stack.push({ kind: 'invoke', function: node.function, n: next }); }
  }
  return { output, calls };
}

function auditPrint(task, record) {
  const c = conditionText(task.fragment), functions = readC(task.fragment);
  const starts = [...c.matchAll(/(?:вызова|вызове) F\((\d+)\)/gu)]; assert.equal(starts.length, 1);
  const start = Number(starts[0][1]), result = runC(functions, start), star = c.includes('звёздочка');
  const answer = star ? String(result.output.filter(v => v === '*').length) : result.output.join('');
  assert.equal(record.answer, answer, task.id + ': answer');
  assert.ok(record.solution.includes('Начальный вызов: F(' + start + ').'));
  const descriptions = [...record.solution.matchAll(/^Процедура ([FG]): (.+)\.$/gmu)];
  assert.equal(descriptions.length, Object.keys(functions).length);
  for (const row of descriptions) {
    const tests = [], operations = [];
    function inspect(node) {
      if (node.kind === 'block') node.nodes.forEach(inspect);
      else if (node.kind === 'if') { tests.push(node.limit + Number(node.op === '>')); inspect(node.body); }
      else operations.push(node.kind === 'print' ? 'print' : node.function + ':' + node.op + ':' + node.amount);
    }
    inspect(functions[row[1]]);
    assert.deepEqual([...row[2].matchAll(/при n ≥ (\d+)/gu)].map(m => Number(m[1])), tests, 'Printed C boundary');
    const written = [...row[2].matchAll(/печать (?:n|звёздочки)|вызов ([FG])\((?:n − (\d+)|⌊⟦n¦(\d+)⟧⌋)\)/gu)]
      .map(m => m[1] ? m[1] + ':' + (m[2] ? '-' : '/') + ':' + (m[2] || m[3]) : 'print');
    assert.deepEqual(written, operations, 'Printed C command order');
  }
  assert.ok(record.solution.includes('все ' + result.calls.length + ' вызовов и ' + result.output.length + ' операций печати'));
  let rowsChecked = 0;
  if (star) {
    const printed = [...record.solution.matchAll(/^\d+\. ([FG])\((-?\d+)\)(.*)$/gmu)];
    assert.deepEqual(printed.map(m => [m[1], Number(m[2])]), result.calls, task.id + ': call order');
    for (const m of printed) assert.equal(m[3].includes('печатается *'), m[1] === 'G');
    assert.ok(record.solution.includes('Получаем ' + result.output.join('') + ', число символов равно ' + answer));
    rowsChecked = printed.length;
  } else {
    const args = [...new Set(result.calls.map(c => c[1]))].sort((a, b) => a - b);
    const rows = [...record.solution.matchAll(/^S\((-?\d+)\) = (.+)\.$/gmu)];
    assert.deepEqual(rows.map(m => Number(m[1])), args, 'Missing output argument');
    for (const row of rows) {
      const n = Number(row[1]), want = runC(functions, n).output.join('');
      const sides = row[2].split(' = ');
      for (const side of sides) {
        const chunks = side.split(' ⧺ '), actual = chunks.map(chunk => {
          if (chunk === 'ε') return '';
          if (/^«-?\d+»$/u.test(chunk)) return chunk.slice(1, -1);
          const m = chunk.match(/^S\((-?\d+)\)$/u); assert.ok(m, 'Unknown concatenation chunk');
          return runC(functions, Number(m[1])).output.join('');
        }).join('');
        assert.equal(actual, want, task.id + ': output expansion');
      }
      rowsChecked++;
    }
    assert.ok(record.solution.includes(result.output.join(' → ') + '.'), 'Printed output order');
  }
  return { answer, rowsChecked, calls: result.calls.length, rejectedEdits: 0 };
}

function gcd(a, b) { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; }
function Q(a, b = 1n) { a = BigInt(a); b = BigInt(b); assert.notEqual(b, 0n); if (b < 0n) { a = -a; b = -b; } const d = gcd(a, b); return [a / d, b / d]; }
const add = (a,b) => Q(a[0]*b[1]+b[0]*a[1], a[1]*b[1]);
const sub = (a,b) => Q(a[0]*b[1]-b[0]*a[1], a[1]*b[1]);
const mul = (a,b) => Q(a[0]*b[0], a[1]*b[1]);
const div = (a,b) => Q(a[0]*b[1], a[1]*b[0]);
const number = a => { assert.equal(a[1], 1n); return Number(a[0]); };
const string = a => a[1] === 1n ? String(a[0]) : a[0] + '/' + a[1];

function normalize(s) {
  return s.replace(/[−–—]/gu, '-').replace(/[×·]/gu, '*').replace(/²/gu, '^2')
    .replace(/≥/gu, '>=').replace(/≤/gu, '<=').replace(/(?<=\d)\s+(?=\d)/gu, '')
    .replace(/(\d)\s*(?=[nFG])/gu, '$1*').replace(/\bn\s+(?=[FG]\()/gu, 'n*');
}
function expression(source) {
  const s = normalize(source).replace(/\s/gu, ''); let at = 0;
  function primary() {
    if (s[at] === '-') { at++; return { op: 'neg', a: primary() }; }
    if (s[at] === '(') { at++; const e = sum(); assert.equal(s[at++], ')'); return e; }
    if (s[at] === '⟦') { at++; const a = sum(); assert.equal(s[at++], '¦'); const b = sum(); assert.equal(s[at++], '⟧'); return { op: '/', a, b }; }
    if (/[FG]/u.test(s[at] || '')) { const f = s[at++]; assert.equal(s[at++], '('); const a = sum(); assert.equal(s[at++], ')'); return { op: 'call', f, a }; }
    if (s[at] === 'n' || s[at] === 'C') return { op: 'var', name: s[at++] };
    const m = s.slice(at).match(/^\d+/u); assert.ok(m, 'Unknown expression near ' + s.slice(at)); at += m[0].length; return { op: 'num', value: BigInt(m[0]) };
  }
  function power() { let e = primary(); if (s.slice(at, at + 2) === '^2') { at += 2; e = { op: '*', a: e, b: e }; } return e; }
  function product() { let e = power(); while (s[at] === '*' || s[at] === '/') { const op = s[at++]; e = { op, a: e, b: power() }; } return e; }
  function sum() { let e = product(); while (s[at] === '+' || s[at] === '-') { const op = s[at++]; e = { op, a: e, b: product() }; } return e; }
  const e = sum(); assert.equal(at, s.length, 'Trailing expression: ' + s.slice(at)); return e;
}
function evaluate(e, n, lookup, C = Q(1n)) {
  if (e.op === 'num') return Q(e.value);
  if (e.op === 'var') return e.name === 'C' ? C : Q(n);
  if (e.op === 'neg') return mul(Q(-1n), evaluate(e.a, n, lookup, C));
  if (e.op === 'call') return lookup(e.f, number(evaluate(e.a, n, lookup, C)));
  return ({ '+': add, '-': sub, '*': mul, '/': div }[e.op])(evaluate(e.a, n, lookup, C), evaluate(e.b, n, lookup, C));
}
function calls(e) { return e.op === 'call' ? [e] : [...(e.a ? calls(e.a) : []), ...(e.b ? calls(e.b) : [])]; }

function readMath(fragment) {
  const text = normalize(conditionText(fragment));
  const definition = text.split('соотношениями:')[1].split('Чему равно')[0].trim().replace(/\.$/u, '');
  const rules = definition.split(';').map(part => {
    const m = part.trim().match(/^([FG])\(n\)\s*=\s*(.*?)\s*(?:,?\s+(?:при|если)\s+(.+))?$/u); assert.ok(m, 'Unknown recurrence');
    const condition = m[3] || '', cm = condition.match(/n\s*(>=|<=|=|>|<)\s*(\d+)/u);
    const parity = condition.includes('нечётно') ? 1 : condition.includes('чётно') ? 0 : null;
    return { f: m[1], e: expression(m[2]), cm, parity, matches: n => {
      if (parity !== null && n % 2 !== parity) return false;
      if (!cm) return true; const b = Number(cm[2]);
      return ({ '=': n === b, '>': n > b, '<': n < b, '>=': n >= b, '<=': n <= b })[cm[1]];
    } };
  });
  const question = text.match(/Чему равно значение (?:выражения|функции) (.+?)\?/u); assert.ok(question);
  return { rules, question: expression(question[1]), floor: text.includes('целую часть') };
}

function mathExpected(task) {
  if (cache.has(task.fragment)) return cache.get(task.fragment);
  const parsed = readMath(task.fragment), { rules, question } = parsed;
  const targets = calls(question).map(c => number(evaluate(c.a, 0, () => { throw Error('Nested target'); })));
  const max = Math.max(...targets), min = Math.min(...targets), values = new Map();
  const recur = rules.filter(r => calls(r.e).length);
  const ratio = rules.length === 2 && recur.length === 1 && recur[0].e.op === '*' && calls(recur[0].e).length === 1 && question.op === '/';
  let lookup;
  if (ratio) {
    // Actual integer products, not the normalized coefficient calculation
    // used by the generator. Retain only the last step and requested terms.
    const r = recur[0], c = calls(r.e)[0], step = min - number(evaluate(c.a, min, () => {})); assert.ok(step > 0);
    let b = min; while (r.matches(b)) b -= step;
    const base = rules.find(x => x.matches(b)); assert.ok(base && !calls(base.e).length);
    let previous = evaluate(base.e, b, () => {}); assert.ok(previous[0] > 0n);
    for (let n = b + step; n <= max; n += step) {
      previous = evaluate(r.e, n, (f, arg) => { assert.equal(f, 'F'); assert.equal(arg, n - step); return previous; });
      if (n >= min) values.set('F:' + n, previous);
    }
    lookup = (f, n) => { const v = values.get(f + ':' + n); assert.ok(v, 'Unknown ratio argument'); return v; };
  } else {
    // Explicit dependency stack from requested values to their bases.
    for (const target of targets) {
      const stack = [['F', target, false]];
      while (stack.length) {
        assert.ok(stack.length < 300000, 'Recurrence stack limit');
        const [f, n, ready] = stack.pop(), key = f + ':' + n;
        if (values.has(key)) continue;
        const matched = rules.filter(r => r.f === f && r.matches(n)); assert.equal(matched.length, 1, key + ': rule'); const r = matched[0];
        if (!ready) {
          stack.push([f, n, true]);
          for (const c of calls(r.e)) stack.push([c.f, number(evaluate(c.a, n, () => {})), false]);
        } else values.set(key, evaluate(r.e, n, (fn, arg) => { const v = values.get(fn + ':' + arg); assert.ok(v, 'Missing dependency'); return v; }));
      }
    }
    // Table rows can include smaller, unused arguments; derive them lazily.
    lookup = (f, n) => {
      const key = f + ':' + n; if (values.has(key)) return values.get(key);
      const matched = rules.filter(r => r.f === f && r.matches(n)); assert.equal(matched.length, 1);
      const v = evaluate(matched[0].e, n, lookup); values.set(key, v); return v;
    };
  }
  const actual = evaluate(question, 0, lookup), answer = parsed.floor ? String(actual[0] / actual[1]) : string(actual);
  const anchor = ratio ? lookup('F', min) : Q(1n);
  const scaled = (f, n) => ratio ? div(lookup(f, n), anchor) : lookup(f, n);
  const result = { answer, actual, parsed, lookup: scaled, min, max, ratio, values };
  cache.set(task.fragment, result); return result;
}

function auditMath(task, record) {
  const expected = mathExpected(task); assert.equal(record.answer, expected.answer, task.id + ': answer');
  let rowsChecked = 0;
  const lines = record.solution.split('\n').filter(s => /^(?:[FG]\(\d+\)|R) = /u.test(s));
  for (const line of lines) {
    const sides = line.split('. ')[0].replace(/\.$/u, '').split(' = ');
    const results = sides.map(s => s === 'R' ? expected.actual : evaluate(expression(s), 0, expected.lookup));
    for (let i = 1; i < results.length; i++) assert.deepEqual(results[i], results[0], task.id + ': arithmetic in ' + line);
    rowsChecked++;
  }
  assert.ok(rowsChecked >= 2, 'No mathematical derivation');
  for (const row of record.solution.matchAll(/Для F\((\d+)\): h = (\d+), k = (\d+), b = (\d+) \+ (\d+) · (\d+) = (\d+)\./gu)) {
    const [a,h,k,start,times,step,b] = row.slice(1).map(Number);
    assert.equal(start,a); assert.equal(times,k); assert.equal(step,h); assert.equal(b,a+k*h);
    const base = expected.parsed.rules.find(r => r.f === 'F' && !calls(r.e).length);
    const rec = expected.parsed.rules.find(r => r.f === 'F' && calls(r.e).length);
    assert.ok(base.matches(b) && !base.matches(b-h), 'Upward stopping point');
    assert.equal(number(evaluate(calls(rec.e)[0].a,a,()=>{})),a+h);
  }
  for (const row of record.solution.matchAll(/Аргумент a = (\d+): h = (\d+), k = (\d+), b = (\d+) − (\d+) · (\d+) = (\d+)\./gu)) {
    const [a,h,k,start,times,step,b] = row.slice(1).map(Number);
    assert.equal(start,a); assert.equal(times,k); assert.equal(step,h); assert.equal(b,a-k*h);
    const base = expected.parsed.rules.find(r => r.f === 'G' && !calls(r.e).length);
    const rec = expected.parsed.rules.find(r => r.f === 'G' && calls(r.e).length);
    assert.ok(base.matches(b) && !base.matches(b+h), 'Mutual stopping point');
    assert.equal(number(evaluate(calls(rec.e)[0].a,a,()=>{})),a-h);
  }
  // Every displayed base/branch must agree with the source rule on sample
  // arguments, including the boundary and both parities.
  const printed = [...record.solution.matchAll(/^([FG])\(n\) = (.+?)(?: при (.+))?\.$/gmu)];
  assert.equal(printed.length, expected.parsed.rules.length);
  for (let i = 0; i < printed.length; i++) {
    const row = printed[i], r = expected.parsed.rules[i]; assert.equal(row[1], r.f);
    const pe = expression(row[2]);
    for (const n of [0,1,2,3,7,10,11,20,21,2024,2025,2026,expected.max]) {
      const fake = (f, a) => Q(BigInt(a * a + (f === 'F' ? 13 : 23)));
      assert.deepEqual(evaluate(pe, n, fake), evaluate(r.e, n, fake), task.id + ': rule expression');
      const cond = row[3] || '', cm = normalize(cond).match(/n (>=|<=|=) (\d+)/u);
      const odd = cond.includes('нечётно'), even = !odd && cond.includes('чётно');
      const cv = !cm || ({'>=':n>=Number(cm[2]),'<=':n<=Number(cm[2]),'=':n===Number(cm[2])})[cm[1]];
      assert.equal(Boolean(cv && (!odd || n%2===1) && (!even || n%2===0)), r.matches(n), task.id + ': rule boundary');
    }
  }
  return { answer: expected.answer, rowsChecked, rejectedEdits: 0 };
}

function auditRecursion(task, record) {
  return /void\s+F\s*\(/u.test(seoPlainText(task.fragment)) ? auditPrint(task, record) : auditMath(task, record);
}
module.exports = { auditRecursion, auditPrint, auditMath, readC, runC, readMath, mathExpected };
