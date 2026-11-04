'use strict';
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { ogeSourceSignature } = require('../../lib/oge-classification');
const proofs = require('../data/ege-informatics-plane-executors-proofs.json');
const machine = require('./ege-informatics-plane-machine');
const cache = new Map();
function auditPlane(task, record, source) {
  const proof = proofs[task.id]; assert.ok(proof, task.id + ': missing checked derivation');
  const signature = ogeSourceSignature(task); assert.equal(signature, proof.sourceHash, task.id + ': changed primary condition');
  if (proof.data.kind === 'maze') {
    assert.deepEqual(proof.data.walls, source.primaryImageReview.transcription.blockedEdges);
    assert.equal(source.primaryImageReview.files[0].sha256, source.primaryImageReview.transcription.imageSha256);
  }
  if (!cache.has(signature)) {
    const result = machine.compute(task, proof.data);
    assert.deepEqual(result, proof.data, task.id + ': changed coordinates or trace');
    cache.set(signature, result);
  }
  const result = cache.get(signature); assert.equal(proof.answer, result.answer, 'certified answer');
  assert.equal(record.answer, result.answer, 'answer');
  assert.equal(createHash('sha256').update(record.solution).digest('hex'), proof.solutionHash, task.id + ': changed verified plane derivation');
  assert.deepEqual(record.solution.split('\n').filter(Boolean), proof.lines);
  return { answer: result.answer, kind: result.kind, lines: proof.lines, rejectedEdits: 0 };
}
module.exports = { auditPlane };
