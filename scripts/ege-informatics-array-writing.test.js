'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {solve,selected}=require('./lib/ege-informatics-array-writing-machine');
const {execFileSync}=require('node:child_process'),path=require('node:path');
const records=require('./data/ege-informatics-array-writing-proofs.json');
const run=(code,inputs)=>JSON.parse(execFileSync('/usr/bin/python3',[path.join(__dirname,'lib/run-informatics-array-fragment.py')],{input:JSON.stringify({code,inputs}),encoding:'utf8'}));
test('maximum adjacent pairs preserve negative values, first ties and final pair',()=>{
 for(const [id,inputs,outputs] of [['EGEINFE586B2',[[-7,-5,-4,-3],[-4,-4,-4]],[3,1]],['EGEINF38240D',[[-8,5,-2,1],[-3,2,-3]],[3,1]]]){
  const d=records[id].data;for(let i=0;i<inputs.length;i++)assert.deepEqual(solve(inputs[i],d.model),[outputs[i]]);
  assert.deepEqual(run(d.code,inputs).map(x=>x.output),outputs.map(x=>[x]));
 }
});
test('overlapping even pairs include zero, but sum-products uses disjoint pairs',()=>{
 const even=records.EGEINF4AEAD2.data,sum=records.EGEINF77B382.data;
 assert.deepEqual(run(even.code,[[0,2,4,3,6,8]]).map(x=>x.output),[[3]]);
 assert.deepEqual(run(sum.code,[[1,2,3,4,5,6]]).map(x=>x.output),[[44]]);
});
test('transform uses aggregate of original array and does not revisit changed positions',()=>{
 const d=records.EGEINF1B43D2.data;
 assert.deepEqual(run(d.code,[[8,3,2,6]])[0],{output:[10,3,4,8],array:[10,3,4,8]});
});
test('signed maximum sentinel handles all negative values and last matching entry',()=>{
 const d=records.EGEINFC23C45.data;
 assert.deepEqual(run(d.code,[[-10000,-10000],[-3,-7,-9996]])[0].output,[-10000,-10000]);
 assert.deepEqual(run(d.code,[[-3,-7,-9996]])[0].output,[-3,-7,-9996]);
});
test('predicate boundary equality and independent count agree with executed code',()=>{
 const d=records.EGEINFA7E44C.data;
 assert.equal(selected(999,d.model.predicates),false);assert.equal(selected(1002,d.model.predicates),true);
 assert.deepEqual(run(d.code,[[999,1002,1003,1005]])[0].output,[999,2,1003,2]);
});
