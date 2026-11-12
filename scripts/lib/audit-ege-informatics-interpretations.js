'use strict';
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const {ogeSourceSignature} = require('../../lib/oge-classification');
const proofs = require('../data/ege-informatics-interpretations-proofs.json');
const {compute} = require('./ege-informatics-interpretations-machine');

function auditInterpretations(task, record, source, readFile) {
  const p = proofs[task.id];
  assert.ok(p, 'unreviewed interpretation');
  assert.equal(ogeSourceSignature(task), p.sourceHash, 'changed primary condition');
  assert.equal(source.fipiCondition, p.data.condition);
  assert.equal(source.answerStatus, 'conditional', 'conditional answer must stay labelled');
  assert.equal(record.answer, p.answer, 'answer');
  assert.equal(createHash('sha256').update(record.solution).digest('hex'), p.solutionHash, 'changed explanation');
  assert.deepEqual(record.solution.split('\n').filter(Boolean), p.lines);
  const result = compute(task, p.data, readFile);
  assert.equal(result.answer, record.answer, 'answer');
  return {answer: result.answer, kind: p.data.model.kind, lines: p.lines, rejectedEdits: 0};
}
module.exports = {auditInterpretations};
