'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { count, scope, model } = require('./lib/ege-informatics-local-documents-machine');
test('whole words exclude hyphenated components and inflections, preserve case and ё', () => {
  const text = 'все Все всё всем все-таки все‑таки ВСЕ; —все—';
  const r = count(text, { terms: ['все', 'Все'], wholeOnly: true });
  assert.equal(r.answer, 3);
  assert.deepEqual(r.caseCounts, { все: 2, Все: 1 });
});
test('embedded matches include compound words, with dash punctuation kept separate', () => {
  const r = count('при При приказ Прибыть при-этом —при— припри', { terms: ['при', 'При'], wholeOnly: false });
  assert.equal(r.answer, 5);
  assert.equal(r.wholeWords, 3);
});
test('scope stops at next heading and rejects duplicate chapter headings', () => {
  assert.deepEqual(scope(['I', 'до', 'II', 'и', 'И', 'III', 'после'], 'II'), { startParagraph: 2, endParagraph: 5, text: 'и\nИ' });
  assert.throws(() => scope(['II', 'и', 'II', 'И'], 'II'), /ambiguous/);
});
test('model distinguishes separate words from only embedded occurrences', () => {
  assert.equal(model('сочетание «при» или «При» только в составе других слов, но не как отдельное слово, главы VII повести Куприна «Поединок»').wholeOnly, false);
  assert.equal(model('отдельное слово «вы» или «Вы» главы V повести Куприна «Поединок»').wholeOnly, true);
});
