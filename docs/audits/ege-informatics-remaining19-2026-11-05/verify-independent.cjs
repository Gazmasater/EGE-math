#!/usr/bin/env node
/* Independent direct scan of all allocations; linear character scan for pairs.
 * Usage: node verify-independent.cjs python-review.json > independent-review.json
 * Requires Node.js, unrar and 7zz (or SEVEN_ZIP=/path/to/7z). No production writes.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const root = __dirname;
const report = JSON.parse(fs.readFileSync(process.argv[2] || path.join(root, 'python-review.json')));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json')));
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
assert.equal(sha(fs.readFileSync(path.join(root, manifest.crossLinkedAttachment.sameBytesAs))),
  manifest.crossLinkedAttachment.archiveSha256);
assert.equal(sha(fs.readFileSync(path.join(root, manifest.crossLinkedAttachment.conditionFragment))),
  manifest.crossLinkedAttachment.conditionFragmentSha256);
const seven = process.env.SEVEN_ZIP || '7zz';
const files = {};
for (const item of manifest.attachments) {
  const archive = path.join(root, item.path);
  const b = fs.readFileSync(archive);
  assert.equal(b.length, item.bytes);
  assert.equal(sha(b), item.sha256);
  const rar = b.subarray(0, 4).toString() === 'Rar!';
  cp.execFileSync(rar ? 'unrar' : seven, rar ? ['t', '-inul', archive] : ['t', archive], {stdio: 'pipe'});
  const members = {};
  for (const m of item.members) {
    const data = cp.execFileSync(rar ? 'unrar' : seven,
      rar ? ['p', '-inul', archive, m.name] : ['x', '-so', archive, m.name], {maxBuffer: 32 * 1024 * 1024});
    assert.equal(data.length, m.bytes);
    assert.equal(sha(data), m.sha256);
    members[m.name] = data.toString('utf8').replace(/^\uFEFF/, '');
  }
  files[item.id.slice(6)] = members;
}

function allocate(capacity, records) {
  const ends = Array(capacity).fill(0);
  let accepted = 0, lastStart = -1, lastCell = null;
  const trace = [];
  for (const [start, finish, row] of records) {
    const free = ends.findIndex(end => end < start);
    if (free < 0) {
      trace.push([row, 0]);
      continue;
    }
    ends[free] = finish;
    accepted++;
    if (start > lastStart) lastCell = free + 1;
    else lastCell = Math.min(lastCell, free + 1);
    lastStart = start;
    trace.push([row, free + 1]);
  }
  return {answer: [accepted, lastCell], lastStart, traceSha256: sha(JSON.stringify(trace))};
}

const arrivals = {};
for (const [id, expected] of Object.entries(report.arrivals)) {
  const lines = Object.values(files[id])[0].trim().split(/\r?\n/).map(s => s.trim().split(/\s+/).map(Number));
  assert.equal(lines[0].length, 1);
  assert.equal(lines[1].length, 1);
  const k = lines[0][0], n = lines[1][0];
  const rows = lines.slice(2).map((p, i) => {
    assert.equal(p.length, 2);
    assert(p.every(Number.isSafeInteger) && 0 < p[0] && p[0] < p[1] && p[1] <= 1440);
    return [...p, i + 1];
  });
  assert.equal(rows.length, n);
  assert.equal(k, expected.capacity);
  assert.equal(n, expected.requests);
  const stable = rows.slice().sort((a, b) => a[0] - b[0] || a[2] - b[2]);
  const swapped = stable.map(r => r.slice());
  const [i, j] = expected.singleSwap.requestIndices.map(id => swapped.findIndex(r => r[2] === id));
  assert.equal(j, i + 1);
  assert.equal(swapped[i][0], swapped[j][0]);
  assert.equal(swapped[i][0], expected.singleSwap.minute);
  [swapped[i], swapped[j]] = [swapped[j], swapped[i]];
  const orders = {
    'file-order': stable,
    'end-ascending': rows.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]),
    'end-descending': rows.slice().sort((a, b) => a[0] - b[0] || b[1] - a[1] || a[2] - b[2]),
    'single-tie-swap': swapped,
  };
  const actual = {};
  for (const [name, order] of Object.entries(orders)) {
    assert(order.every((r, index) => index === 0 || order[index - 1][0] <= r[0]));
    actual[name] = allocate(k, order);
    assert.deepEqual(actual[name], expected.variants[name]);
  }
  assert.notDeepEqual(actual['file-order'].answer, actual['single-tie-swap'].answer);
  arrivals[id] = actual;
}

function scanPairs(text, consonants, vowels) {
  let current = 0, best = {pairs: 0, start: null, end: null, text: ''};
  let position = 0;
  while (position + 1 < text.length) {
    if (consonants.includes(text[position]) && vowels.includes(text[position + 1])) {
      current++;
      if (current > best.pairs) {
        const start = position + 2 - 2 * current;
        best = {pairs: current, start: start + 1, end: position + 2,
          text: text.slice(start, position + 2)};
      }
      position += 2;
    } else {
      current = 0;
      position++;
    }
  }
  return best;
}
const text = files.CE2CF3['320_24.txt'].trim();
assert.equal([...new Set(text)].sort().join(''), 'ACDEF');
const pairs = {
  actualAlphabetCV: scanPairs(text, 'CDF', 'AE'),
  literalDeclaredSetsCV: scanPairs(text, 'BCD', 'AU'),
};
for (const [key, value] of Object.entries(pairs)) {
  assert.deepEqual(value, report.attachmentDiagnostics.CE2CF3[key]);
}
assert(!/^\d+\s*$/.test(files['1F25B2']['331_24.txt'].split(/\r?\n/)[0]));
for (const [name, s] of Object.entries(files['7F1EAA'])) {
  const lines = s.trim().split(/\r?\n/);
  assert(lines.slice(1).every(line => /^\d+$/.test(line.trim())));
  assert.equal(lines[0], report.attachmentDiagnostics['7F1EAA'].files[name].header);
  assert.equal(lines.length - 1, report.attachmentDiagnostics['7F1EAA'].files[name].bodyLines);
}
for (const [name, s] of Object.entries(files['327EB5'])) {
  const header = s.split(/\r?\n/)[0];
  assert.equal(header.trim().split(/\s+/).length, 2);
  assert.equal(header, report.attachmentDiagnostics['327EB5'].headers[name]);
}
assert.deepEqual(allocate(1, [[1, 2, 1], [2, 3, 2], [3, 4, 3]]).answer, [2, 1]);
assert.deepEqual(allocate(2, [[1, 2, 1], [1, 3, 2]]).answer, [2, 1]);
console.log(JSON.stringify({status: 'ok', archiveAndMemberHashes: 'all matched',
  independentAlgorithms: ['JavaScript direct scan vs Python two heaps: every assignment',
    'JavaScript linear character scan vs Python regular expression: maxima and positions'],
  arrivals, pairs, attachmentFormatChecks: 'all four discrepancies reproduced',
  publishedAnswersAdded: 0}, null, 2));
