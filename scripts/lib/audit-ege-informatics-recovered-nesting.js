'use strict';
const assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {ogeSourceSignature}=require('../../lib/oge-classification'),proofs=require('../data/ege-informatics-recovered-nesting-proofs.json'),machine=require('./ege-informatics-recovered-nesting-machine');
function auditRecoveredNesting(task,record,source,readFile){
 const p=proofs[task.id];assert.ok(p);assert.equal(ogeSourceSignature(task),p.sourceHash,'changed primary condition');assert.equal(source.fipiCondition,p.data.condition);assert.equal(record.answer,p.answer,'answer');assert.equal(createHash('sha256').update(record.solution).digest('hex'),p.solutionHash,'changed explanation');assert.deepEqual(record.solution.split('\n').filter(Boolean),p.lines);
 const result=machine.compute(task,p.data,readFile);assert.equal(result.answer,record.answer);return {answer:result.answer,kind:'nesting',elements:result.chain.length,lines:p.lines,rejectedEdits:0};
}
module.exports={auditRecoveredNesting};
