'use strict';
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { ogeSourceSignature } = require('../../lib/oge-classification');
const proofs = require('../data/ege-informatics-mirror-databases-proofs.json');
const machine = require('./ege-informatics-mirror-databases-machine');
function auditMirrorDatabases(task, record, source, readFile) {
  const p = proofs[task.id];
  assert.ok(p);
  assert.equal(ogeSourceSignature(task), p.sourceHash, 'changed primary condition');
  assert.equal(source.fipiCondition, p.data.condition);
  assert.equal(record.answer, p.answer, 'answer');
  assert.equal(createHash('sha256').update(record.solution).digest('hex'), p.solutionHash, 'changed explanation');
  assert.deepEqual(record.solution.split('\n').filter(Boolean), p.lines);
  const result = machine.compute(task, p.data, readFile);
  assert.equal(String(result.answer), record.answer, 'answer');
  return { answer: record.answer, kind: 'joined-database', elements: result.matches.length, lines: p.lines, rejectedEdits: 0 };
}
module.exports = { auditMirrorDatabases };
