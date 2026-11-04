'use strict';
const assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {ogeSourceSignature}=require('../../lib/oge-classification');
const proofs=require('../data/ege-informatics-final-writing-proofs.json');
const machine=require('./ege-informatics-final-writing-machine');
function auditFinalWriting(task,record,source){
 const proof=proofs[task.id];assert.ok(proof,'missing final-writing proof');
 assert.equal(ogeSourceSignature(task),proof.sourceHash,'changed primary condition');assert.equal(source.fipiCondition,proof.data.condition);
 assert.equal(record.answer,proof.answer,'answer');
 assert.equal(createHash('sha256').update(record.solution).digest('hex'),proof.solutionHash,'changed checked final-writing explanation');
 assert.deepEqual(record.solution.split('\n').filter(Boolean),proof.lines);
 const blocks=[...record.solution.matchAll(/```python\n([\s\S]*?)\n```/gu)];assert.equal(blocks.length,1);assert.equal(blocks[0][1],proof.data.code.trim(),'published code differs from executed code');
 const result=machine.compute(task,proof.data);
 return {answer:record.answer,kind:result.kind,lines:proof.lines,rejectedEdits:0};
}
module.exports={auditFinalWriting};
