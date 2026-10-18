'use strict';

const assert = require('node:assert/strict');
const { conditionText } = require('../../lib/seo-text');

function auditExecutor(task, record) {
  const text = conditionText(task.fragment).normalize('NFC');
  const rawCommands = text.match(/1\. (.+?) 2\. (.+?) Первая/u);
  assert.ok(rawCommands, task.id + ': commands');
  const operations = rawCommands.slice(1).map(raw => {
    const number = raw.match(/\d+/u);
    const k = number && BigInt(number[0]);
    if (/возведи в квадрат/u.test(raw)) return x => x ** 2n;
    if (/^выч(?:ти|есть) /u.test(raw)) { assert.ok(k); return x => x - k; }
    if (/^прибав(?:ь|ить) /u.test(raw)) { assert.ok(k); return x => x + k; }
    if (/^умножь на /u.test(raw)) { assert.ok(k); return x => x * k; }
    if (raw === 'удвоить') return x => x * 2n;
    if (/^приписать /u.test(raw)) {
      assert.ok(k !== null && k >= 0n && k <= 9n);
      return x => x < 0n ? null : BigInt(String(x) + String(k));
    }
    if (raw === 'зачеркни справа') return x => x < 10n ? null : BigInt(String(x).slice(0, -1));
    if (raw === 'зачеркни слева') return x => {
      if (x < 10n) return null;
      let place = 1n;
      while (place * 10n <= x) place *= 10n;
      return x % place;
    };
    throw new Error('Unknown primary operation: ' + raw);
  });
  const endpoints = text.match(/из числа (\d+) числа (\d+), содержащий не более (\d+|пяти) команд/u);
  assert.ok(endpoints, task.id + ': input/output/limit');
  const start = BigInt(endpoints[1]), end = BigInt(endpoints[2]);
  const limit = endpoints[3] === 'пяти' ? 5 : Number(endpoints[3]);
  const natural = /только с натуральными числами/u.test(text);
  const allowed = value => value !== null && (!natural || value > 0n);
  assert.match(record.answer, /^[12]+$/u, task.id + ': program answer');
  assert.ok(record.answer.length <= limit, task.id + ': answer length');
  const chain = [start];
  for (const digit of record.answer) {
    const value = operations[Number(digit) - 1](chain.at(-1));
    assert.ok(allowed(value), task.id + ': answer domain');
    chain.push(value);
  }
  assert.equal(chain.at(-1), end, task.id + ': executed answer');
  const shown = record.solution.match(/Цепочка значений: ([−\d →]+)\./u);
  assert.ok(shown);
  assert.deepEqual(shown[1].replace(/−/gu, '-').split(' → ').map(BigInt), chain);
  const steps = [...record.solution.matchAll(/^Шаг (\d+)\. Команда ([12]): .+(?: = |, получаем )([−\d]+)\.$/gmu)];
  assert.equal(steps.length, record.answer.length);
  steps.forEach((step, index) => {
    assert.equal(Number(step[1]), index + 1);
    assert.equal(step[2], record.answer[index]);
    assert.equal(BigInt(step[3].replace('−', '-')), chain[index + 1]);
  });
  // Aggregate all programs ending at the same state; exact BigInt arithmetic
  // also covers branches with five consecutive squarings without rounding.
  let frontier = new Map([[start, 1]]), rejected = 0;
  const levels = [...record.solution.matchAll(/^Длина (\d+): допустимых программ — (\d+), различных конечных значений — (\d+)\. (.+)$/gmu)];
  assert.equal(levels.length, record.answer.length);
  for (let length = 1; length <= record.answer.length; length++) {
    const next = new Map();
    for (const [value, count] of frontier) for (const operation of operations) {
      const result = operation(value);
      if (allowed(result)) next.set(result, (next.get(result) || 0) + count);
    }
    const count = [...next.values()].reduce((sum, value) => sum + value, 0);
    const line = levels[length - 1];
    assert.equal(Number(line[1]), length);
    assert.equal(Number(line[2]), count);
    assert.equal(Number(line[3]), next.size);
    if (length < record.answer.length) assert.ok(!next.has(end), task.id + ': claimed unsuccessful shorter programs');
    else assert.ok(next.has(end));
    rejected += count - (next.get(end) || 0);
    frontier = next;
  }
  return { program: record.answer, values: chain.map(String), rejectedEdits: rejected };
}

module.exports = { auditExecutor };
