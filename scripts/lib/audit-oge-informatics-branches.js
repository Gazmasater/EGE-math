'use strict';

const assert = require('node:assert/strict');
const { conditionText } = require('../../lib/seo-text');

// Parse the Russian algorithmic-language condition, independently of the
// generator's Python AST. No supplied program text is executed.
function compile(expression) {
  const tokens = expression.match(/mod|или|не|и|[stkA]|-?\d+|>=|<=|[><=(),]/gu) || [];
  assert.equal(tokens.join(''), expression.replace(/\s/gu, ''));
  let position = 0;
  const take = token => { if (tokens[position] !== token) return false; position++; return true; };
  function value() {
    if (take('mod')) {
      assert.ok(take('(')); const left = value(); assert.ok(take(',')); const right = value(); assert.ok(take(')'));
      return env => left(env) % right(env);
    }
    const token = tokens[position++];
    if (/^-?\d+$/u.test(token)) return () => Number(token);
    assert.match(token, /^[stkA]$/u); return env => env[token];
  }
  function atom() {
    if (take('не')) { const inner = atom(); return env => !inner(env); }
    if (take('(')) { const inner = or(); assert.ok(take(')')); return inner; }
    const left = value(), operation = tokens[position++], right = value();
    const operations = { '>': (a,b) => a > b, '<': (a,b) => a < b, '>=': (a,b) => a >= b, '<=': (a,b) => a <= b, '=': (a,b) => a === b };
    assert.ok(operations[operation]); return env => operations[operation](left(env), right(env));
  }
  function and() {
    let left = atom();
    while (take('и')) { const previous = left, right = atom(); left = env => previous(env) && right(env); }
    return left;
  }
  function or() {
    let left = and();
    while (take('или')) { const previous = left, right = and(); left = env => previous(env) || right(env); }
    return left;
  }
  const result = or(); assert.equal(position, tokens.length); return result;
}

function auditBranches(task, record) {
  const text = conditionText(task.fragment).normalize('NFC').replace(/А/gu, 'A').replace(/[–−—]/gu, '-');
  const expression = text.match(/если (.+?) то вывод/u)?.[1];
  assert.ok(expression, task.id + ': algorithmic condition');
  const condition = compile(expression);
  const tail = text.split('Было проведено')[1];
  const pairs = [...tail.matchAll(/\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/gu)].map(m => [Number(m[1]), Number(m[2])]);
  assert.equal(pairs.length, Number(tail.match(/^\s*(\d+)/u)[1]));
  const question = tail.split(/Укажите|Сколько/u).at(-1);
  const target = question.match(/[«"](YES|NO)[»"]/u)?.[1]; assert.ok(target);
  const evaluate = A => pairs.map(([s,t]) => condition({ s, t, k: t, A }) ? 'YES' : 'NO');
  const count = A => evaluate(A).filter(value => value === target).length;
  assert.match(record.answer, /^-?\d+$/u, task.id + ': integer answer');
  let expected, tested = 0, valid = null;
  if (!expression.includes('A')) expected = count(0);
  else {
    const word = question.match(/[»"]\s+(\w+|[а-я]+)\s+раз/u)[1];
    const wanted = /^\d+$/u.test(word) ? Number(word) : ({ один:1, два:2, три:3, четыре:4, пять:5, шесть:6, семь:7, восемь:8, девять:9 })[word];
    assert.ok(Number.isInteger(wanted));
    // All A-dependent comparisons are s>A or t>A. Their truth values can
    // change only at an input coordinate, so both outer tails are constant.
    assert.match(expression, /^s > (?:A|\d+) или t > (?:A|\d+)$/u);
    const low = Math.min(...pairs.flat()) - 2, high = Math.max(...pairs.flat()) + 2;
    valid = [];
    for (let A = low; A <= high; A++) { tested++; if (count(A) === wanted) valid.push(A); }
    assert.ok(valid.length);
    if (question.includes('наименьшее')) { assert.notEqual(valid[0], low); expected = valid[0]; }
    else if (question.includes('наибольшее')) { assert.notEqual(valid.at(-1), high); expected = valid.at(-1); }
    else if (question.includes('количество')) { assert.notEqual(valid[0], low); assert.notEqual(valid.at(-1), high); expected = valid.length; }
    else { assert.equal(count(Number(record.answer)), wanted, task.id + ': parameter answer'); expected = Number(record.answer); }
    const example = record.solution.match(/Подставим A = ([−\d]+)/u); assert.ok(example);
    const A = Number(example[1].replace('−', '-'));
    assert.equal(count(A), wanted);
    const printed = [...record.solution.matchAll(/^Запуск (\d+): \(([−\d]+); ([−\d]+)\) — вывод (YES|NO)\.$/gmu)];
    assert.equal(printed.length, pairs.length);
    const actual = evaluate(A);
    printed.forEach((m,i) => { assert.equal(Number(m[1]), i+1); assert.deepEqual([m[2],m[3]].map(x => Number(x.replace('−','-'))), pairs[i]); assert.equal(m[4], actual[i]); });
  }
  assert.equal(record.answer, String(expected), task.id + ': independently evaluated answer');
  if (!expression.includes('A')) {
    const printed = [...record.solution.matchAll(/^Запуск (\d+): \(([−\d]+); ([−\d]+)\)\..* — вывод (YES|NO)\.$/gmu)];
    assert.equal(printed.length, pairs.length);
    const actual = evaluate(0);
    printed.forEach((m,i) => { assert.equal(Number(m[1]),i+1); assert.deepEqual([m[2],m[3]].map(x => Number(x.replace('−','-'))),pairs[i]); assert.equal(m[4],actual[i]); });
  }
  return { answer: expected, testedValues: tested, validParametersInFiniteScan: valid, rejectedEdits: valid ? tested-valid.length : pairs.length-expected };
}

module.exports = { auditBranches };
