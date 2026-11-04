'use strict';
const assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {ogeSourceSignature}=require('../../lib/oge-classification');
const proofs=require('../data/ege-informatics-graph-models-proofs.json');
const machine=require('./ege-informatics-graph-models-machine'),cache=new Map();
function auditGraphModels(task,record,source){
 const proof=proofs[task.id];assert.ok(proof,'missing graph model proof');
 const signature=ogeSourceSignature(task);assert.equal(signature,proof.sourceHash,'changed primary condition');
 assert.deepEqual(proof.data.graphs,source.primaryImageReview.transcriptions);
 const key=signature+JSON.stringify(proof.data);
 if(!cache.has(key))cache.set(key,machine.compute(task,proof.data));
 const result=cache.get(key);assert.equal(proof.answer,result.answer);assert.equal(record.answer,result.answer,'answer');
 // The independent machine validates all candidate refinements, every branch,
 // the complete set of isomorphisms, distance updates, bounds and routes.
 // Keep every reviewed line tied to that checked derivation.
 assert.equal(createHash('sha256').update(record.solution).digest('hex'),proof.solutionHash,'changed checked explanation');
 assert.deepEqual(record.solution.split('\n').filter(Boolean),proof.lines);
 return {answer:result.answer,kind:proof.data.kind,lines:proof.lines,rejectedEdits:0};
}
module.exports={auditGraphModels};
