'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {execFileSync} = require('node:child_process');
const {conditionText} = require('../../lib/seo-text');
const root = path.resolve(__dirname, '../..');
const sha = b => createHash('sha256').update(b).digest('hex');
const superscript = n => String(n).replace(/\d/g, c => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(c)]);

function fraction(n, d) {
  let a = n < 0n ? -n : n, b = d;
  while (b) [a, b] = [b, a % b];
  n /= a; d /= a;
  return d === 1n ? String(n) : `${n}/${d}`;
}

function rateModel(text) {
  const capture = re => { const m = text.match(re); assert.ok(m, 'changed rate parameters'); return Number(m[1]); };
  assert.match(text, /А[.)] Сжать архиватором, передать архив по каналу связи, распаковать/u);
  assert.match(text, /Б[.)] Передать по каналу связи без использования архиватора/u);
  const literalRate = capture(/составляет (22[0-4]) бит/u);
  return {kind: 'rate', megabytes: capture(/Документ объёмом (\d+) Мбайт/u),
    percent: capture(/документа равен (\d+)%/u),
    packSeconds: capture(/на сжатие документа, – (\d+) секунд/u),
    unpackSeconds: capture(/на распаковку – (\d+) секунд/u),
    literalRate, hypothesizedExponent: literalRate - 200};
}

function rateTimes(m, speed) {
  const bits = BigInt(m.megabytes) * 8388608n, denominator = speed * 100n;
  const a = bits * BigInt(m.percent) + BigInt(m.packSeconds + m.unpackSeconds) * denominator;
  const b = bits * 100n, diff = b - a;
  assert.notEqual(diff, 0n);
  const differenceSeconds = fraction(diff < 0n ? -diff : diff, denominator);
  const faster = diff > 0n ? 'А' : 'Б';
  return {speedBitsPerSecond: Number(speed), secondsA: fraction(a, denominator),
    secondsB: fraction(b, denominator), faster, differenceSeconds,
    conditionalAnswer: faster + differenceSeconds};
}

function solveRates(m) {
  return {literal: rateTimes(m, BigInt(m.literalRate)),
    power: rateTimes(m, 2n ** BigInt(m.hypothesizedExponent))};
}

// Deliberately independent of the two-heap Python solution shown to readers.
function allocate(k, rows, order) {
  assert.ok(['end-ascending', 'file-order'].includes(order), 'unknown arrival order');
  const ordered = rows.map((r, i) => [...r, i + 1]);
  ordered.sort((a, b) => a[0] - b[0] || (order === 'end-ascending' ? a[1] - b[1] : 0) || a[2] - b[2]);
  const ends = Array(k).fill(0), trace = [];
  let count = 0, lastStart = -1, lastCell = null;
  for (const [start, end, index] of ordered) {
    const cell = ends.findIndex(t => t < start);
    trace.push([index, cell + 1]);
    if (cell < 0) continue;
    ends[cell] = end;
    count++;
    lastCell = start > lastStart ? cell + 1 : Math.min(lastCell, cell + 1);
    lastStart = start;
  }
  return {answer: [count, lastCell], lastStart, traceSha256: sha(JSON.stringify(trace))};
}

function formattedAnswer(data, result) {
  if (data.model.kind === 'rate') {
    const plain = result.literal.conditionalAnswer.replace(/(\d+)\/(\d+)/g, '⟦$1¦$2⟧');
    return `При v = ${data.model.literalRate}: ${plain}; при v = 2${superscript(data.model.hypothesizedExponent)}: ${result.power.conditionalAnswer}`;
  }
  return `При сортировке по началу и окончанию: ${result['end-ascending'].answer.join(' ')}`;
}

const cache = new Map();
function compute(task, data, readFile = fs.readFileSync) {
  assert.equal(conditionText(task.fragment), data.condition, 'changed primary condition');
  let result;
  if (data.model.kind === 'rate') {
    assert.deepEqual(rateModel(data.condition), data.model, 'changed rate model');
    result = solveRates(data.model);
  } else {
    assert.deepEqual(data.model, {kind: 'arrivals', order: 'end-ascending', reuse: 'strict-next-minute'});
    assert.match(data.condition, /со следующей минуты/u);
    assert.match(data.condition, /минимальным номером/u);
    const urls = [...task.fragment.matchAll(/class="fipi-attachment" href="([^"]+)"/g)].map(m => m[1]);
    assert.deepEqual(urls, [data.url], 'changed primary attachment');
    assert.match(data.url, /^\/fipi\/ege-informatics\/docs\/restored-sorting\/EGEINF[A-F0-9]{6}\.zip$/);
    const bytes = readFile(path.join(root, data.url.slice(1).replace(/^fipi\//, 'fipi-assets/')));
    assert.equal(sha(bytes), data.fileSha256, 'changed archive');
    const key = JSON.stringify([data.fileSha256, data.member, data.memberSha256]);
    let text = cache.get(key);
    if (!text) {
      const code = 'import sys,zipfile,io\nz=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read()))\nassert z.testzip() is None\nassert z.namelist()==[sys.argv[1]]\nsys.stdout.buffer.write(z.read(sys.argv[1]))';
      const extracted = execFileSync('python3', ['-c', code, data.member], {input: bytes, timeout: 10000, maxBuffer: 1000000});
      assert.equal(sha(extracted), data.memberSha256, 'changed data member');
      text = extracted.toString('utf8'); cache.set(key, text);
    }
    const lines = text.trim().split(/\r?\n/).map(line => line.trim().split(/\s+/).map(Number));
    assert.ok(lines.every(row => row.every(Number.isInteger)), 'invalid integers');
    assert.equal(lines[0].length, 1); assert.equal(lines[1].length, 1);
    const k = lines[0][0], n = lines[1][0], rows = lines.slice(2);
    assert.ok(k > 0 && k <= 1000); assert.equal(n, rows.length);
    assert.ok(n > 0 && n <= (data.condition.includes('МФЦ') ? 10000 : 1000));
    assert.ok(rows.every(r => r.length === 2 && r[0] > 0 && r[0] < r[1] && r[1] <= 1440));
    assert.equal(k, data.capacity); assert.equal(n, data.requests);
    result = Object.fromEntries(['end-ascending', 'file-order'].map(order => [order, allocate(k, rows, order)]));
  }
  assert.deepEqual(result, data.result, 'changed calculation');
  return {answer: formattedAnswer(data, result), result};
}

module.exports = {rateModel, solveRates, allocate, formattedAnswer, compute};
