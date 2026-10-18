'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { conditionText, seoPlainText } = require('../../lib/seo-text');
const { programmingVectors } = require('./oge-informatics-programming-vectors');
const { ogeSourceSignature } = require('../../lib/oge-classification');
const primaryImages = require('../data/oge-informatics-programming-images.json');

function auditProgrammingImages(task) {
  const entry = primaryImages[task.id];
  assert.ok(entry?.reviewed, task.id + ': unreviewed programming image');
  assert.equal(entry.sourceHash, ogeSourceSignature(task));
  const srcs = [...task.fragment.matchAll(/<img\b[^>]*src="([^"]+)"/gu)].map(m => m[1]);
  assert.deepEqual(srcs, entry.images.map(i => i.src));
  for (const item of entry.images) {
    assert.ok(item.reviewed && item.src.startsWith('/fipi/') && !item.src.includes('..'));
    const file = path.join(__dirname, '../../fipi-assets', item.src.slice('/fipi/'.length));
    assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'), item.sha256);
  }
  return entry.images;
}

function programmingSamples(task) {
  const result = [];
  for (const table of task.fragment.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/giu)) {
    const rows = [...table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/giu)];
    if (!rows.length || !/Входные.*Выходные/u.test(seoPlainText(rows[0][1]))) continue;
    for (const row of rows.slice(1)) {
      const cells = [...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/giu)].map(m =>
        seoPlainText(m[1]).replace(/[−–]/gu, '-').replace(/-\s+(?=\d)/gu, '-')
      );
      assert.equal(cells.length, 2, task.id + ': sample columns');
      result.push({ input: cells[0], output: cells[1] });
    }
  }
  assert.ok(result.length, task.id + ': missing original sample');
  return result;
}

function auditProgramming(task, record) {
  assert.equal(record.answer, 'Программа приведена в шаге 3', task.id + ': answer');
  const blocks = [...record.solution.matchAll(/^```python\n([\s\S]*?)\n```[ \t]*(?:\n|$)/gm)];
  assert.equal(blocks.length, 1, task.id + ': program block');
  const code = blocks[0][1] + '\n';
  assert.ok(!record.solution.replace(blocks[0][0], '').includes('```'), 'Unexpected code fence');
  const vectors = programmingVectors(task);
  const samples = programmingSamples(task);
  const precision = /точностью до десятых/u.test(conditionText(task.fragment)) ? 1 : null;
  const tests = [...vectors.tests];
  for (const [i, sample] of samples.entries()) {
    assert.ok(record.solution.includes('Пример ' + (i + 1) + '. Входные числа: ' + sample.input + '.'), task.id + ': printed input');
    assert.ok(record.solution.includes('Вывод: ' + sample.output + '.'), task.id + ': printed output');
    tests.push({ input: sample.input + '\n', expected: sample.output.split(/\s+/u).map(x => Number.isFinite(Number(x)) ? Number(x) : x), precision });
  }
  // Disable the selection predicate, preserving termination and input handling.
  const filter = code.match(/^    if (?!x == 0:)([^\n]+):$/m);
  const mutant = filter ? code.replace(filter[0], '    if False:') : code.replace('print(', 'print("WRONG", ');
  assert.notEqual(mutant, code);
  const tested = JSON.parse(execFileSync('python3', [path.join(__dirname, 'check-informatics-python.py')], {
    input: JSON.stringify({ code, mutant, tests }), encoding: 'utf8', timeout: 10000, maxBuffer: 1024 * 1024
  }));
  return { kind: vectors.kind, samples: samples.length, tests: tested.tests,
    programHash: createHash('sha256').update(code).digest('hex'), rejectedEdits: tested.rejectedMutationCases };
}

module.exports = { auditProgramming, programmingSamples, auditProgrammingImages };
