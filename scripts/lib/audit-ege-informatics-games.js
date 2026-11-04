'use strict';
const assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {ogeSourceSignature}=require('../../lib/oge-classification');
const proofs=require('../data/ege-informatics-games-proofs.json');
const machine=require('./ege-informatics-games-machine'),cache=new Map();
function auditGames(task,record,source){
 const proof=proofs[task.id];assert.ok(proof,'missing game proof');
 const signature=ogeSourceSignature(task);assert.equal(signature,proof.sourceHash,'changed primary condition');
 assert.equal(source.fipiCondition,proof.data.condition);
 if(!cache.has(signature))cache.set(signature,machine.compute(task,proof.data));
 const result=cache.get(signature);assert.equal(proof.answer,result.answer);assert.equal(record.answer,result.answer,'answer');
 assert.equal(createHash('sha256').update(record.solution).digest('hex'),proof.solutionHash,'changed checked explanation');
 assert.deepEqual(record.solution.split('\n').filter(Boolean),proof.lines);
 const tableRows=machine.validateTables(record.solution,proof.data.calculation);
 return {answer:result.answer,kind:result.kind,checkedBranches:result.checkedBranches,checkedPositions:result.checkedPositions,tableRows,lines:proof.lines,rejectedEdits:0};
}
module.exports={auditGames};
