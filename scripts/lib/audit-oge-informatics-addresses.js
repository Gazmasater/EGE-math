'use strict';

const assert = require('node:assert/strict');
const { conditionText } = require('../../lib/seo-text');

function auditAddresses(task, record) {
  const text = conditionText(task.fragment);
  const data = /Доступ к файлу ([^,]+), находящемуся на сервере ([^,]+), осуществляется по протоколу (https?|ftp)\./u.exec(text);
  assert.ok(data, task.id + ': URL fields');
  const [filename, host, protocol] = data.slice(1).map(value => value.replace(/\s+/gu, ''));
  const entries = Array.from(text.matchAll(/([1-7])\)\s*(\S+)/gu), m => [m[1], m[2]]);
  assert.equal(entries.length, 7);
  assert.equal(new Set(entries.map(e => e[0])).size, 7);
  const raw = Object.fromEntries(entries), parts = { ...raw };
  const target = `${protocol}://${host}/${filename}`;
  const normalizedTypo = task.id === 'OGEINF5F44E5';
  if (normalizedTypo) {
    assert.equal(parts['4'], 'сom');
    assert.equal(filename, 'com.htm');
    assert.ok(record.solution.includes('кириллическая') && record.solution.includes('опечатка'));
    parts['4'] = 'com';
  }
  // Enumerate every permutation without consulting the generator's prefix search or model.
  const keys = Object.keys(parts), solutions = [];
  let checked = 0, literalMatches = 0;
  function permute(prefix, remaining) {
    if (!remaining.length) {
      checked++;
      if (prefix.map(k => raw[k]).join('') === target) literalMatches++;
      if (prefix.map(k => parts[k]).join('') === target) solutions.push(prefix.join(''));
      return;
    }
    remaining.forEach((k, index) => permute([...prefix, k], remaining.filter((_, i) => i !== index)));
  }
  permute([], keys);
  assert.equal(checked, 5040);
  assert.equal(solutions.length, 1, task.id + ': unique order');
  assert.equal(literalMatches, normalizedTypo ? 0 : 1);
  assert.equal(record.answer, solutions[0], task.id + ': answer');
  const url = new URL(target);
  assert.equal(url.protocol, protocol + ':');
  assert.equal(url.hostname, host);
  assert.equal(url.pathname, '/' + filename);
  const shown = Array.from(record.solution.matchAll(/(\d)-й фрагмент: (.*?) — код ([1-7])\./gu));
  assert.equal(shown.length, 7, task.id + ': displayed fragments');
  const describe = value => ({ '/': 'одна косая черта', '//': 'две косые черты', '://': 'двоеточие и две косые черты' }[value] || `«${value}»`);
  shown.forEach((m, index) => {
    assert.equal(Number(m[1]), index + 1);
    assert.equal(m[3], record.answer[index]);
    assert.equal(m[2], describe(parts[m[3]]));
  });
  for (const value of [filename, host, protocol]) assert.ok(record.solution.includes(value));
  assert.ok(record.solution.includes('Порядок кодов: ' + record.answer.split('').join(' → ') + '.'));
  return { answer: solutions[0], permutations: checked, literalMatches, normalizedTypo, rejectedEdits: checked - 1 };
}

module.exports = { auditAddresses };
