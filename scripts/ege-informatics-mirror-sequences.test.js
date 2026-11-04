'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{solve,model}=require('./lib/ege-informatics-mirror-sequences-machine'),models=require('./data/ege-informatics-mirror-sequences-models.json');
function reference(a,m){
 const d=x=>String(x).replace('-','').length===m.digits;let eligible;
 if(m.kind.startsWith('remainder-'))eligible=a;
 else if(m.kind==='negative-pair')eligible=a.filter(x=>Number.isInteger(x/m.divisor));
 else if(m.kind==='positive-multiple-bound')eligible=a.filter(x=>x>0&&Number.isInteger(x/m.divisor));
 else if(m.kind==='digit-pair')eligible=a.filter(x=>d(x)&&String(x).endsWith(String(m.ending)));
 else eligible=a.filter(x=>String(x).endsWith(String(m.ending)));
 const t=m.kind==='negative-pair'?eligible.length:[...eligible].sort((a,b)=>m.kind==='digit-triples'?b-a:a-b)[0];assert(Number.isFinite(t));let selected=[];
 for(let lo=0;lo<a.length;lo++)for(let hi=lo;hi<a.length;hi++){
  if(hi-lo+1!==m.window)continue;const v=a.slice(lo,hi+1),s=v.reduce((a,b)=>a+b,0);let ok;
  if(m.kind==='remainder-sum')ok=v.map(x=>x-m.divisor*Math.floor(x/m.divisor)).reduce((a,b)=>a+b)===t;
  else if(m.kind==='remainder-any')ok=v.map(x=>x-m.divisor*Math.floor(x/m.divisor)).includes(t);
  else if(m.kind==='negative-pair')ok=v.some(x=>x<0)&&s<t;
  else if(m.kind==='positive-multiple-bound')ok=s<t;
  else{const n=v.filter(d).length;ok=m.count==='any'?n>0:n===m.count;if(m.kind==='digit-pair')ok=ok&&Number.isInteger(s/t);else {const z=m.power===2?s*s:s;ok=ok&&({'<':z<t,'<=':z<=t,'>':z>t,'>=':z>=t}[m.comparison]);}}
  if(ok)selected.push({index:lo+1,values:v,sum:s});
 }
 const sums=selected.map(r=>r.sum).sort((a,b)=>m.extreme==='min'?a-b:b-a),extreme=sums[0]??null;return {threshold:t,selected,extreme,count:selected.length,answer:extreme===null?null:`${selected.length} ${m.absoluteAnswer?Math.abs(extreme):extreme}`};
}
test('all 22 models: 11000 short sequences against independent exhaustive subarray enumeration',()=>{
 let seed=20261103,n=0;const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
 for(const m of Object.values(models)){
  const anchor=m.kind==='digit-triples'?100+m.ending:m.kind==='positive-multiple-bound'?m.divisor:m.kind==='digit-pair'?105:1;
  const pool=[-100000,-1000,-999,-100,-99,-10,-9,0,1,9,10,99,100,999,1000,9999,10000,100000,anchor,-anchor,33,-33,110,125].filter(x=>m.signed||x>0);
  for(let i=0;i<500;i++){const a=[anchor,...Array.from({length:3+next()%7},()=>pool[next()%pool.length])],r=solve(a,m),e=reference(a,m);for(const k of Object.keys(e))assert.deepEqual(r[k],e[k],JSON.stringify([m,a,k]));n++;}
 }assert.equal(n,11000);
});
test('overlapping pairs, both matches counted once, zero and negative sum extrema',()=>{
 const m={kind:'remainder-any',window:2,divisor:3,extreme:'min',signed:false};assert.equal(solve([1,4,7,10],m).answer,'3 5');
 const n={kind:'negative-pair',window:2,divisor:32,extreme:'max',signed:true};assert.equal(solve([-5,-4,-3],n).answer,'2 -7');assert.equal(solve([0,1,32],n).answer,null);assert.equal(solve([-1,1,32],n).threshold,1);
 const b={kind:'positive-multiple-bound',window:2,divisor:110,extreme:'max',absoluteAnswer:true,signed:true};assert.equal(solve([110,-200,-1],b).answer,'2 90');
});
test('signed digit boundaries, exact counts and strict square comparison',()=>{
 const m={kind:'digit-triples',window:3,digits:2,count:2,ending:33,comparison:'<',signed:true,power:2,extreme:'max'};
 assert.equal(solve([33,-10,0],m).answer,null);const a=[133,-99,10,89,-9,99,100];for(const cmp of ['<','<=','>','>='])for(const cnt of [1,2,'any']){const mm={...m,comparison:cmp,count:cnt};assert.deepEqual(solve(a,mm).selected,reference(a,mm).selected);}
 assert.throws(()=>solve([1,100001],{kind:'remainder-any',window:2,divisor:3,extreme:'max',signed:false}));
});
test('derive own predicate differences from the complete primary conditions',()=>{
 const fs=require('fs'),{conditionText}=require('../lib/seo-text'),tasks=require('./data/ege-informatics-mirror-sequences-tasks.json');for(const t of tasks)assert.deepEqual(model(conditionText(t.fragment)),models[t.id]);
 const t=tasks.find(t=>t.id==='EGEINF1F0F94'),text=conditionText(t.fragment),changed=model(text.replace('ровно два двузначных','хотя бы одно из чисел является двузначным').replace('меньше максимального','не больше максимального'));assert.equal(changed.count,'any');assert.equal(changed.comparison,'<=');
});
