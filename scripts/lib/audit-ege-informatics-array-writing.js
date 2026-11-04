'use strict';
const assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {ogeSourceSignature}=require('../../lib/oge-classification');
const proofs=require('../data/ege-informatics-array-writing-proofs.json');
const machine=require('./ege-informatics-array-writing-machine');
function auditArrayWriting(task,record,source){
 const proof=proofs[task.id];assert.ok(proof,'missing array-writing proof');
 assert.equal(ogeSourceSignature(task),proof.sourceHash,'changed primary condition');assert.equal(source.fipiCondition,proof.data.condition);
 assert.equal(record.answer,proof.answer,'answer');
 assert.equal(createHash('sha256').update(record.solution).digest('hex'),proof.solutionHash,'changed checked array-writing explanation');
 assert.deepEqual(record.solution.split('\n').filter(Boolean),proof.lines);
 const result=machine.compute(task,proof.data);assert.equal(record.answer,result.answer,'answer');
 return {answer:result.answer,kind:result.kind,lines:proof.lines,rejectedEdits:0};
}
module.exports={auditArrayWriting};
