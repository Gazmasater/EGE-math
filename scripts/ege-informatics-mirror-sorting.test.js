'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const machine=require('./lib/ege-informatics-mirror-sorting-machine'),models=require('./data/ege-informatics-mirror-sorting-models.json'),tasks=require('./data/ege-informatics-mirror-sorting-tasks.json'),proofs=require('./data/ege-informatics-mirror-sorting-proofs.json'),{conditionText}=require('../lib/seo-text');
test('sorting: 5461 exhaustive independent small-case references cover both priorities and edge intervals',()=>{
 const fixtures=require('./data/ege-informatics-mirror-sorting-small-fixtures.json');assert.equal(fixtures.length,5461);
 for(const f of fixtures)assert.deepEqual(machine.solve(f.header,f.rows,f.model),f.answer);
});
test('sorting: all 27 models are derived from full primary conditions and files satisfy declared formats',()=>{
 for(const task of tasks){const p=proofs[task.id];assert.deepEqual(machine.model(conditionText(task.fragment)),models[task.id]);
  const read=f=>fs.readFileSync(f);assert.equal(machine.compute(task,p.data,read).answer,p.answer);
  const bad=structuredClone(p.data);bad.model.family='unknown';assert.throws(()=>machine.compute(task,bad,read));
  assert.throws(()=>machine.compute(task,p.data,()=>Buffer.from('1\n0\n')));
 }
 assert.equal(tasks.length,27);
});
test('sorting: material counterexample and admission ties, complete groups, partial groups and scholarship boundary',()=>{
 assert.deepEqual(machine.solve([4,4],[[10,0],[9,1],[5,0],[1,1]],{family:'coloured-boxes'}),[3,1]);
 const people=[[4,80,80,80,0],[7,50,80,100,10],[11,80,80,70,10],[10,100,100,100,2],[6,90,90,90,9],[2,70,80,80,8]];
 assert.deepEqual(machine.solve([6,4],people,{family:'astronauts'}),[6,3]);
 assert.deepEqual(machine.solve([6,2],people,{family:'astronauts'}),[6,0]);
 assert.deepEqual(machine.solve([6,5],people,{family:'astronauts'}),[4,0]);
 assert.deepEqual(machine.solve([6,6],people,{family:'astronauts'}),[2,0]);
 const students=[[4,4,4,4,4],[7,5,5,5,2],[10,3,4,4,5],[1,4,4,4,3],[6,3,5,5,3],[2,2,2,2,2],[13,2,2,2,3],[3,3,3,3,3]];
 assert.deepEqual(machine.solve([8],students,{family:'students'}),[6,13]);
});
test('sorting: malformed data cannot silently change dimensions, materials, identifiers or product tie order',()=>{
 assert.throws(()=>machine.validate([1,2,3],[[3,1]],{family:'prefix-pair',largest:true}));
 assert.throws(()=>machine.validate([2],[[4]],{family:'boxes',gap:3}));
 assert.throws(()=>machine.validate([1,3],[[4,2]],{family:'coloured-boxes'}));
 assert.throws(()=>machine.validate([2],[[1,2],[3,2]],{family:'products',above:false}));
 assert.throws(()=>machine.validate([1],[[5,5]],{family:'events',gap:true}));
 assert.throws(()=>machine.validate([2,1],[[1,0,0,0,0],[1,100,100,100,10]],{family:'astronauts'}));
 assert.throws(()=>machine.validate([1,1],[[3]],{family:'cargo'}));
});
