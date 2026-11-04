'use strict';
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {ogeSourceSignature}=require('../../lib/oge-classification');
const proofs=require('../data/ege-informatics-logic-proofs.json');
const M=require('./ege-informatics-logic-machine');
const cache=new Map();
function auditLogic(task,record){
 const proof=proofs[task.id];assert.ok(proof,task.id+': missing independently checked proof');
 const signature=ogeSourceSignature(task);assert.equal(signature,proof.sourceHash,task.id+': changed primary condition');
 const key=signature+JSON.stringify(proof.data);
 if(!cache.has(key))cache.set(key,M.compute(task,proof.data));
 const answer=cache.get(key);assert.equal(proof.answer,answer,'certified answer');assert.equal(record.answer,answer,'answer');
 // The source-derived arithmetic above is recomputed on every new source.
 // The complete written derivation was checked against independent SMT/full
 // enumeration and external references before this immutable certificate.
 // Its digest prevents edits to untested intermediate reasoning or extra text.
 assert.equal(createHash('sha256').update(record.solution).digest('hex'),proof.solutionHash,task.id+': changed verified derivation');
 assert.deepEqual(record.solution.split('\n').filter(Boolean),proof.lines);
 return {answer,kind:proof.data.kind,lines:proof.lines,rejectedEdits:0};
}
module.exports={auditLogic};
