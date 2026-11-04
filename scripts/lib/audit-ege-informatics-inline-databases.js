'use strict';
const assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {ogeSourceSignature}=require('../../lib/oge-classification');
const proofs=require('../data/ege-informatics-inline-databases-proofs.json'),machine=require('./ege-informatics-inline-databases-machine');
function auditInlineDatabases(task,record,source){
 const proof=proofs[task.id];assert.ok(proof);assert.equal(ogeSourceSignature(task),proof.sourceHash,'changed primary condition');assert.equal(source.fipiCondition,proof.data.condition);
 assert.equal(record.answer,proof.answer,'answer');assert.equal(createHash('sha256').update(record.solution).digest('hex'),proof.solutionHash,'changed reviewed explanation');assert.deepEqual(record.solution.split('\n').filter(Boolean),proof.lines);
 const calculated=machine.compute(task,proof.data);assert.equal(calculated.answer,record.answer,'answer');return {...calculated,lines:proof.lines,rejectedEdits:0};
}
module.exports={auditInlineDatabases};
