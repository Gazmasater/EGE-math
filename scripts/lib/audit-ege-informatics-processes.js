'use strict';
const assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {ogeSourceSignature}=require('../../lib/oge-classification');
const proofs=require('../data/ege-informatics-processes-proofs.json');
const machine=require('./ege-informatics-processes-machine');
function auditProcesses(task,record,source){
 const proof=proofs[task.id];assert.ok(proof,'missing processes proof');
 assert.equal(ogeSourceSignature(task),proof.sourceHash,'changed primary condition');assert.equal(source.fipiCondition,proof.data.condition);
 assert.equal(record.answer,proof.answer,'answer');
 assert.equal(createHash('sha256').update(record.solution).digest('hex'),proof.solutionHash,'changed checked processes explanation');
 assert.deepEqual(record.solution.split('\n').filter(Boolean),proof.lines);
 const result=machine.compute(task,proof.data);assert.equal(record.answer,result.answer,'answer');
 return {answer:result.answer,kind:result.kind,total:result.total,lines:proof.lines,rejectedEdits:0};
}
module.exports={auditProcesses};
