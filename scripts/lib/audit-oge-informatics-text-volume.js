'use strict';

const assert = require('node:assert/strict');
const { conditionText } = require('../../lib/seo-text');

// Independently rebuild the whole quoted text for every possible edit. This
// deliberately does not consume the generator's word lengths or model fields.
function auditTextVolume(task, record) {
  const text = conditionText(task.fragment);
  const quote = text.match(/«([^»]+)»/u)?.[1];
  assert.ok(quote, task.id + ': quoted text');
  const tail = text.slice(text.indexOf('»') + 1);
  const bits = Number(text.match(/каждый символ кодируется (\d+) бит/u)?.[1]);
  assert.ok([8, 16].includes(bits), task.id + ': unsupported encoding');
  assert.ok(!/[\uD800-\uDFFF]/u.test(quote), task.id + ': non-BMP source requires review');
  const delta = Number(tail.match(/на (\d+) байт/u)?.[1]);
  const add = tail.includes('два раза подряд');
  assert.equal(add, tail.includes('больше'), task.id + ': direction');
  const isList = /запятую и пробел/u.test(tail);
  const bytes = s => Buffer.byteLength(s, bits === 16 ? 'utf16le' : 'latin1');
  const originalBytes = bytes(quote);
  const edits = [];
  if (isList) {
    const start = quote.includes(': ') ? quote.indexOf(': ') + 2 : 0;
    const dash = quote.search(/ [–—] /u);
    const end = dash < 0 ? quote.length : dash;
    const prefix = quote.slice(0, start), suffix = quote.slice(end);
    const items = quote.slice(start, end).split(', ');
    assert.ok(items.length > 1);
    items.forEach((answer, index) => {
      const modified = items.slice();
      if (add) modified.splice(index, 0, answer);
      else modified.splice(index, 1);
      edits.push({ answer, changed: prefix + modified.join(', ') + suffix });
    });
  } else {
    assert.match(tail, /пробел/u);
    for (const match of quote.matchAll(/[А-ЯЁа-яё]+/gu)) {
      const answer = match[0], start = match.index, end = start + answer.length;
      let changed;
      if (add) changed = quote.slice(0, start) + answer + ' ' + quote.slice(start);
      else if (quote[start - 1] === ' ') changed = quote.slice(0, start - 1) + quote.slice(end);
      else {
        assert.equal(quote[end], ' ', task.id + ': initial word separator');
        changed = quote.slice(0, start) + quote.slice(end + 1);
      }
      edits.push({ answer, changed });
    }
  }
  const results = edits.map(e => ({ ...e, byteDelta: bytes(e.changed) - originalBytes }));
  const expectedDelta = add ? delta : -delta;
  const matching = [...new Set(results.filter(e => e.byteDelta === expectedDelta).map(e => e.answer))];
  assert.deepEqual(matching, [record.answer], task.id + ': independently reconstructed answer');
  return { originalBytes, changedBytes: bytes(results.find(e => e.answer === record.answer).changed),
    byteDelta: expectedDelta, rejectedEdits: results.filter(e => e.byteDelta !== expectedDelta).length };
}

module.exports = { auditTextVolume };
