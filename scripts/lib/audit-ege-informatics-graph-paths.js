'use strict';
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { ogeSourceSignature } = require('../../lib/oge-classification');
const proofs = require('../data/ege-informatics-graph-paths-proofs.json');
const machine = require('./ege-informatics-graph-paths-machine');
const cache = new Map();

function auditGraphPaths(task, record, source) {
  const proof = proofs[task.id];
  assert.ok(proof, task.id + ': missing checked graph derivation');
  const signature = ogeSourceSignature(task);
  assert.equal(signature, proof.sourceHash, task.id + ': changed primary condition');
  assert.deepEqual(proof.data.adjacency, source.primaryImageReview.transcription.adjacency);
  assert.equal(proof.data.imageHash, source.primaryImageReview.files[0].sha256);
  const key = signature + JSON.stringify(proof.data);
  if (!cache.has(key)) cache.set(key, machine.compute(task, proof.data));
  const result = cache.get(key);
  assert.equal(proof.answer, result.answer, 'certified answer');
  assert.equal(record.answer, result.answer, 'answer');
  // Every written recurrence was checked against recomputed predecessor and
  // successor sets before certification. Protect the entire reviewed proof,
  // including the arguments about required/forbidden cities and first return.
  assert.equal(createHash('sha256').update(record.solution).digest('hex'), proof.solutionHash, task.id + ': changed verified graph derivation');
  assert.deepEqual(record.solution.split('\n').filter(Boolean), proof.lines);
  return { answer: result.answer, kind: result.kind, lines: proof.lines, rejectedEdits: 0 };
}
module.exports = { auditGraphPaths };
