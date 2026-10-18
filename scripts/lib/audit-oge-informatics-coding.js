'use strict';

const assert = require('node:assert/strict');
const { conditionText, seoPlainText } = require('../../lib/seo-text');

// Read the original HTML table independently of the Python generator. Build all
// decoded prefixes from left to right, then apply the repetition constraint.
function auditCoding(task, record) {
  const text = conditionText(task.fragment);
  const start = task.fragment.search(/class=["']cell_0["']/u);
  assert.ok(start >= 0, task.id + ': primary question');
  const html = task.fragment.slice(start).split(/<div\s+id=["']i[A-Z0-9]+["']/u)[0];
  const table = html.match(/<table\b[^>]*>([\s\S]*?)<\/table>/u);
  assert.ok(table, task.id + ': primary code table');
  const compact = value => seoPlainText(value).replace(/\s|\u2060/gu, '').replace(/[−-]/gu, '–');
  const rows = [...table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gu)]
    .map(row => [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gu)].map(cell => compact(cell[1])));
  const codes = new Map();
  const alphabet = /номер.*алфавите/u.test(text);
  if (alphabet) {
    for (const row of rows) for (let i = 0; i < row.length; i += 2) if (row[i]) codes.set(row[i], row[i + 1]);
    assert.equal(codes.size, 33);
    assert.equal(codes.get('Ё'), '7');
  } else {
    assert.equal(rows.length, 2);
    assert.equal(rows[0].length, rows[1].length);
    rows[0].forEach((letter, i) => codes.set(({ A: 'А', C: 'С', K: 'К' })[letter] || letter, rows[1][i]));
  }
  assert.ok([...codes].every(([letter, code]) => /^[А-ЯЁ]$/u.test(letter) && code), task.id + ': table ' + JSON.stringify([...codes]));
  let chains;
  if (/Даны (?:три|четыре)/u.test(text)) {
    chains = text.split(/Даны (?:три|четыре)/u)[1].match(/\b\d{4,}\b/gu);
    assert.equal(chains.length, alphabet ? 4 : 3);
  } else {
    const symbols = new Set([...codes.values()].join(''));
    chains = [...html.replace(table[0], '').matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gu)]
      .map(p => compact(p[1])).filter(p => p.length >= 5 && [...p].every(c => symbols.has(c)));
    assert.equal(chains.length, 1);
  }
  const noRepeat = /не повторяются|ни одна буква/u.test(text);
  const repeatedAnswer = /более одного раза/u.test(text);
  const decoded = chains.map(chain => {
    const prefixes = Array.from({ length: chain.length + 1 }, () => new Set());
    prefixes[0].add('');
    for (let position = 0; position < chain.length; position++) {
      for (const [letter, code] of codes) {
        if (!chain.startsWith(code, position)) continue;
        for (const word of prefixes[position]) prefixes[position + code.length].add(word + letter);
      }
    }
    const all = [...prefixes.at(-1)];
    return { chain, all, allowed: all.filter(word => !noRepeat || new Set(word).size === word.length) };
  });
  const unique = decoded.filter(item => item.allowed.length === 1);
  assert.equal(unique.length, 1, task.id + ': unique chain');
  const word = unique[0].allowed[0];
  const repeated = [...new Set(word)].filter(letter => word.split(letter).length > 2).sort().join('');
  const expected = repeatedAnswer ? repeated : word;
  assert.equal(record.answer, expected, task.id + ': independent decoded answer');
  assert.equal([...word].map(letter => codes.get(letter)).join(''), unique[0].chain);
  assert.ok(record.solution.includes(word) && record.solution.includes(unique[0].chain));
  return { decodedWord: word, decodingCounts: decoded.map(item => item.allowed.length),
    rejectedEdits: decoded.reduce((n, item) => n + item.all.length, 0) - 1 };
}

module.exports = { auditCoding };
