'use strict';
const assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {ogeSourceSignature}=require('../../lib/oge-classification');
const proofs=require('../data/ege-informatics-number-sequence-proofs.json');
const machine=require('./ege-informatics-number-sequence-machine');
function auditNumberSequence(task,record,source){
  const proof=proofs[task.id];assert.ok(proof,'missing number-sequence proof');
  assert.equal(ogeSourceSignature(task),proof.sourceHash,'changed primary condition');
  assert.equal(source.fipiCondition,proof.data.condition);
  const result=machine.compute(task,proof.data);
  assert.equal(record.answer,result.answer,'answer');assert.equal(proof.answer,result.answer);
  assert.equal(createHash('sha256').update(record.solution).digest('hex'),proof.solutionHash,'changed checked sequence explanation');
  assert.deepEqual(record.solution.split('\n').filter(Boolean),proof.lines);
  return {answer:result.answer,kind:result.kind,elements:result.elements,threshold:result.threshold,pairs:result.count,lines:proof.lines,rejectedEdits:0};
}
module.exports={auditNumberSequence};
