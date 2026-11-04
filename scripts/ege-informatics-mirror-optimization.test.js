'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const m=require('./lib/ege-informatics-mirror-optimization-machine'),fixtures=require('./data/ege-informatics-mirror-optimization-small-fixtures.json'),conditions=require('./data/ege-informatics-mirror-optimization-condition-texts.json'),models=require('./data/ege-informatics-mirror-optimization-models.json');
test('300 independently brute-forced fixtures cover all ten optimization families',()=>{
 const kinds=new Set();for(const f of fixtures){kinds.add(f.model.kind);if(f.answer===null)assert.throws(()=>m.solve(f.data,f.model));else assert.equal(m.solve(f.data,f.model).answer,String(f.answer));}assert.equal(kinds.size,10);
 assert.equal(m.solve({N:3,K:1,columns:[[10000000,10000000,10000000]]},{kind:'gap-triple',operation:'max-product'}).answer,'1000000000000000000000');
});
test('all 29 source conditions bind extrema, direction, parity, capacities and modulus',()=>{
 for(const [id,text]of Object.entries(conditions))assert.deepEqual(m.conditionModel(text),models[id]);
 for(const [id,from,to]of [
  ['EGEINF952F46','положительна и чётна','положительна и нечётна'],
  ['EGEINFBDD715','0 < L < M < R – 1','0 < L < M < R'],
  ['EGEINFF13E1D','произведение этих трёх чисел было максимально возможным','произведение этих трёх чисел было минимально возможным'],
  ['EGEINF12C4CF','не более 12 штук','не более 13 штук'],
  ['EGEINF377100','кратна k = 53','кратна k = 59']
 ]){assert.ok(conditions[id].includes(from));try{assert.notDeepEqual(m.conditionModel(conditions[id].replace(from,to)),models[id]);}catch(e){if(e.code==='ERR_ASSERTION'&&e.operator==='notDeepStrictEqual')throw e;}}
});
test('strict data validation and hash-bound upper-limit exception preserve original integers',()=>{
 const model={kind:'gap-pair',operation:'max-sum',minimum:0,maximum:100000},d=m.parse(Buffer.from('1\n3\n1\n100001\n2\n'),model);
 assert.throws(()=>m.validate(d,model,null,'a'));
 const certificate={sha256:'a',declaredMaximum:100000,actualMinimum:1,actualMaximum:100001,valuesAboveDeclaredMaximum:1};
 assert.equal(m.validate(d,model,certificate,'a').maximum,100001);assert.throws(()=>m.validate(d,model,certificate,'b'));
 assert.throws(()=>m.validate(d,model,{...certificate,valuesAboveDeclaredMaximum:2},'a'));
 for(const input of ['1\n3\n1\n2\n','1\n3\n1\n2\n3\n4\n','1\n3\n1\nNaN\n2\n'])assert.throws(()=>m.parse(Buffer.from(input),model));
 assert.throws(()=>m.validate({N:3,K:0,columns:[[1,2,3]]},model,null,''));
});
test('certificate checks reject invalid gap witnesses and transport costs',()=>{
 const d={N:6,K:2,columns:[[6,7,8,2,3,5]]},model={kind:'gap-triple',operation:'max-sum'};
 m.verifyWitness(d,model,{indices:[1,3,6],values:[6,8,5],K:2,answer:19});assert.throws(()=>m.verifyWitness(d,model,{indices:[2,3,6],values:[7,8,5],K:2,answer:20}));
 const linear={N:3,columns:[[1,3,7],[2,3,2]]},lm={kind:'linear-cost',capacity:2};
 const c={N:3,kind:'linear-cost',capacity:2,row:2,point:3,totalContainers:4,leftContainers:1,rightContainers:1,centerContainers:2,answer:6};
 m.verifyExtra(linear,lm,c);assert.throws(()=>m.verifyExtra(linear,lm,{...c,point:7}));assert.throws(()=>m.verifyExtra(linear,lm,{...c,answer:7}));
});
