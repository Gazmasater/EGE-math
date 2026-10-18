'use strict';

const assert = require('node:assert/strict');
const { conditionText } = require('../../lib/seo-text');
const subs = '₀₁₂₃₄₅₆₇₈₉', supers = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const normal = (text, alphabet) => [...text].map(c => alphabet.indexOf(c)).join('');
function value(digits, base) {
  let result = 0n;
  for (const c of digits.toUpperCase()) {
    const d = '0123456789ABCDEF'.indexOf(c);
    assert.ok(d >= 0 && d < base, 'Invalid source digit');
    result = result * BigInt(base) + BigInt(d);
  }
  return result;
}
function binary(n) {
  if (!n) return '0';
  let weight = 1n;
  while (weight * 2n <= n) weight *= 2n;
  let bits = '';
  while (weight) {
    bits += n >= weight ? '1' : '0';
    if (n >= weight) n -= weight;
    weight /= 2n;
  }
  return bits;
}
// Numeric printed equalities, including bases and Unicode exponents. No eval.
function expression(text) {
  const tokens = text.replace(/\s/gu, '').match(/[0-9A-F]+[₀₁₂₃₄₅₆₇₈₉]*[⁰¹²³⁴⁵⁶⁷⁸⁹]*|[+−·]/gu);
  assert.ok(tokens && tokens.join('') === text.replace(/\s/gu, ''));
  const numbers = [], ops = [];
  for (let i = 0; i < tokens.length; i++) {
    if (i % 2) { assert.match(tokens[i], /^[+−·]$/u); ops.push(tokens[i]); }
    else {
      const m = tokens[i].match(/^([0-9A-F]+)([₀₁₂₃₄₅₆₇₈₉]*)([⁰¹²³⁴⁵⁶⁷⁸⁹]*)$/u);
      assert.ok(m);
      let n = value(m[1], m[2] ? Number(normal(m[2], subs)) : 10);
      if (m[3]) n **= BigInt(normal(m[3], supers));
      numbers.push(n);
    }
  }
  assert.equal(numbers.length, ops.length + 1);
  const terms = [numbers[0]], signs = [];
  for (let i = 0; i < ops.length; i++) {
    if (ops[i] === '·') terms[terms.length - 1] *= numbers[i + 1];
    else { signs.push(ops[i]); terms.push(numbers[i + 1]); }
  }
  return terms.reduce((a, n, i) => i ? a + (signs[i - 1] === '+' ? n : -n) : n, 0n);
}
function auditBases(task, record) {
  const text = conditionText(task.fragment), low = text.toLowerCase();
  let expected, bits, kind, values, numbers;
  if (/арифметического|среди чисел/u.test(text)) {
    numbers = [...text.matchAll(/([0-9A-Fa-f]+)\s*([₀₁₂₃₄₅₆₇₈₉]+)/gu)].map(m => ({ digits: m[1].toUpperCase(), base: Number(normal(m[2], subs)) }));
    assert.equal(numbers.length, 3);
    values = numbers.map(n => value(n.digits, n.base));
    if (low.includes('арифметического')) {
      const negative = /[−–-]/u.test(text.split('выражения:')[1].split('В ответе')[0]);
      expected = values[0] + values[1] + (negative ? -values[2] : values[2]);
      kind = negative ? 'subtract' : 'sum';
    } else {
      kind = low.includes('наибольшее') ? 'maximum' : 'minimum';
      expected = values.reduce((a, b) => (kind === 'maximum' ? a > b : a < b) ? a : b);
    }
    numbers.forEach(n => assert.ok(record.solution.includes(n.digits + [...String(n.base)].map(c => subs[Number(c)]).join(''))));
  } else {
    const digits = text.match(/[0-9]+/u)[0];
    if (/из десятичной|десятичное число/u.test(low)) {
      bits = binary(BigInt(digits));
      kind = low.includes('единиц') ? 'ones' : /нул|нол/u.test(low) ? 'zeros' : 'to-binary';
      expected = kind === 'to-binary' ? bits : [...bits].filter(c => c === (kind === 'ones' ? '1' : '0')).length;
    } else { bits = digits; kind = 'to-decimal'; expected = value(bits, 2); }
    assert.ok(record.solution.includes(bits), 'Missing binary representation');
    if (kind === 'zeros' || kind === 'ones') {
      const positions = [...bits].flatMap((c, i) => c === (kind === 'ones' ? '1' : '0') ? [i + 1] : []);
      assert.ok(record.solution.includes('позициях ' + positions.join(', ') + '.'));
    }
  }
  assert.equal(record.answer, String(expected), task.id + ': answer');
  let equations = 0;
  for (const match of record.solution.matchAll(/[0-9A-F][0-9A-F₀₁₂₃₄₅₆₇₈₉⁰¹²³⁴⁵⁶⁷⁸⁹ +−·]*=[0-9A-F₀₁₂₃₄₅₆₇₈₉⁰¹²³⁴⁵⁶⁷⁸⁹ +−·=]+/gu)) {
    const parts = match[0].split('=').map(s => s.trim());
    // Letter definitions A=10... are covered by value's digit table.
    if (parts.some(p => !/^[0-9]/u.test(p))) continue;
    const values = parts.map(expression);
    values.forEach(v => assert.equal(v, values[0], task.id + ': arithmetic ' + match[0]));
    equations++;
  }
  assert.ok(equations >= 7, 'Missing worked arithmetic');
  return { kind, equations, rejectedEdits: 0 };
}
module.exports = { auditBases };
