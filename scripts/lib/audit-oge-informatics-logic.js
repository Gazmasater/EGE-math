'use strict';

const assert = require('node:assert/strict');
const { conditionText } = require('../../lib/seo-text');

// Independent exhaustive verification: shunting-yard parsing of the original
// condition, then evaluation of every number in a mathematically complete range.
function auditLogic(task, record) {
  const text = conditionText(task.fragment).replace(/ё/gu, 'е').replace(/\b[XХх]\b/gu, 'x');
  const start = text.search(/НЕ\s*\(|\(/u);
  const header = text.slice(0, start).toLowerCase();
  const formula = text.slice(start).split(/[.?]/u)[0].trim();
  // JavaScript's word boundaries are ASCII; split Russian operators explicitly.
  const parts = formula.split(/(\(|\)|НЕ(?=\s|\()|ИЛИ|И(?=\s|\())/u).map(t => t.trim()).filter(Boolean);
  const postfix = [], operators = [];
  const priority = { ИЛИ: 1, И: 2, НЕ: 3 };
  for (const token of parts) {
    if (token === '(') operators.push(token);
    else if (token === ')') {
      while (operators.at(-1) !== '(') { assert.ok(operators.length); postfix.push(operators.pop()); }
      operators.pop();
    } else if (priority[token]) {
      while (priority[operators.at(-1)] > priority[token] || (token !== 'НЕ' && priority[operators.at(-1)] === priority[token])) postfix.push(operators.pop());
      operators.push(token);
    } else postfix.push({ atom: token });
  }
  while (operators.length) postfix.push(operators.pop());
  const subject = (name, n) => name === 'x' || name === 'число' ? n
    : name === 'первая цифра' ? Number(String(n)[0])
    : name === 'последняя цифра' ? n % 10
    : [...String(n)].reduce((sum, c) => sum + Number(c), 0);
  function predicate(source, n) {
    const s = source.toLowerCase().replace(/^х\b/u, 'x');
    let m = s.match(/^(?:x|число)\s*([<>=≤≥≠])\s*(\d+)$/u);
    if (m) {
      const v = Number(m[2]);
      return ({ '<': n < v, '>': n > v, '=': n === v, '≠': n !== v, '≤': n <= v, '≥': n >= v })[m[1]];
    }
    m = s.match(/^(x|число|первая цифра|последняя цифра|сумма цифр)\s+(нечет\S*|чет\S*)$/u);
    if (m) return subject(m[1], n) % 2 === (m[2].startsWith('не') ? 1 : 0);
    m = s.match(/^(x|число|сумма цифр)\s+(?:кратно|кратна|делится на)\s+(\d+)$/u);
    if (m) return subject(m[1], n) % Number(m[2]) === 0;
    m = s.match(/^x оканчивается на (\d)$/u);
    if (m) return n % 10 === Number(m[1]);
    assert.fail(task.id + ': unknown predicate ' + s);
  }
  function evaluate(n) {
    const stack = [];
    for (const item of postfix) {
      if (typeof item === 'object') stack.push(predicate(item.atom, n));
      else if (item === 'НЕ') { assert.ok(stack.length); stack.push(!stack.pop()); }
      else {
        assert.ok(stack.length >= 2); const b = stack.pop(), a = stack.pop();
        stack.push(item === 'И' ? a && b : a || b);
      }
    }
    assert.equal(stack.length, 1); return stack[0];
  }
  const desired = !header.includes('ложно');
  const mode = header.includes('количество') ? 'count' : header.includes('наименьшее') ? 'min' : header.includes('наибольшее') ? 'max' : 'single';
  const choiceMatch = text.match(/Дано четыре числа:\s*([\d, ]+)\./u);
  let lower = /двузнач/u.test(header) ? 10 : /трехзнач/u.test(header) ? 100 : 1;
  let upper = /двузнач/u.test(header) ? 99 : /трехзнач/u.test(header) ? 999 : null;
  for (const [, word, value] of header.matchAll(/(большее|меньшее)\s+(\d+)/gu)) {
    if (word === 'большее') lower = Math.max(lower, Number(value) + 1);
    else upper = Math.min(upper ?? Infinity, Number(value) - 1);
  }
  const gcd = (a, b) => b ? gcd(b, a % b) : a;
  let period = 10;
  for (const [, number] of formula.matchAll(/(?:кратно|кратна|делится на)\s+(\d+)/gu)) period = period * Number(number) / gcd(period, Number(number));
  const threshold = Math.max(lower, ...[...formula.matchAll(/\d+/gu)].map(m => Number(m[0]))) + 1;
  if (upper === null && !choiceMatch) assert.ok(!/цифр/u.test(formula), 'Unbounded digit predicate needs a separate proof');
  const limit = upper ?? threshold + period;
  const domain = choiceMatch ? choiceMatch[1].match(/\d+/gu).map(Number) : Array.from({ length: limit - lower + 1 }, (_, i) => lower + i);
  const accepted = domain.filter(n => evaluate(n) === desired).sort((a, b) => a - b);
  assert.ok(accepted.length, task.id + ': no answer');
  if (upper === null && !choiceMatch && mode !== 'min') {
    // Beyond every comparison threshold, only modular predicates can vary.
    // One full period without a match proves there are no omitted larger values.
    for (let n = threshold; n < threshold + period; n++) assert.notEqual(evaluate(n), desired, task.id + ': unbounded answer set');
  }
  if (mode === 'single') assert.equal(accepted.length, 1);
  const expected = String(mode === 'count' ? accepted.length : mode === 'max' ? accepted.at(-1) : accepted[0]);
  assert.equal(record.answer, expected, task.id + ': independent logical answer');
  return { testedValues: domain.length, acceptedValues: accepted.length, period, threshold,
    rejectedEdits: domain.length - accepted.length };
}

module.exports = { auditLogic };
