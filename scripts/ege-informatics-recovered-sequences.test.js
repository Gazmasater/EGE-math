'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{solve}=require('./lib/ege-informatics-recovered-sequences-machine');
test('exactly one two-digit value: overlapping windows count separately, both two-digit values do not',()=>{
 const r=solve([99,99,198,99,1,98],{kind:'one-two-digit',window:2});
 assert.equal(r.answer,'3 297');assert.deepEqual(r.selected.map(x=>x.index),[2,3,5]);
});
test('divisibility uses the found minimum, inclusive OR counts a pair only once',()=>{
 assert.equal(solve([38,1,57],{kind:'divisible-by-minimum',window:2,divisor:19}).answer,'1 39');
 const r=solve([19,38,1,114,57],{kind:'divisible-by-minimum',window:2,divisor:19});assert.equal(r.answer,'4 171');assert.deepEqual(r.selected.map(x=>x.index),[1,2,3,4]);
});
test('signed triples reject zero and threshold equality, retain negative minima and final window',()=>{
 const m={kind:'signed-triples',window:3,ending:15};
 const r=solve([-115,-115,-115,-116,-200,0,200,300,400],m);assert.equal(r.answer,'3 13340');assert.equal(r.threshold,-115);assert.deepEqual(r.selected.map(x=>x.index),[2,3,7]);
 const s=solve([115,116,117,0,-215,-216,-217],m);assert.equal(s.answer,'1 46655');assert.equal(s.threshold,-215);
});
