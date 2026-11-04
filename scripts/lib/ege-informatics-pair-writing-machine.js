'use strict';
const assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),path=require('node:path');
const {conditionText}=require('../../lib/seo-text');
function model(text){
 let m;
 if(text.includes('a_(i) > a_(j)'))m={kind:'ordered-sum',modulus:Number(text.match(/m = (\d+)/u)[1])};
 else if(text.includes('различные остатки'))m={kind:'different-remainders',modulus:Number(text.match(/d = (\d+)/u)[1]),prime:Number(text.match(/p = (\d+)/u)[1])};
 else if(text.includes('разность которых чётна'))m={kind:'even-difference',divisor:Number(text.match(/(?:p = |делится на )(\d+)/u)[1])};
 else if(text.includes('расстоянии не меньше'))m={kind:'distant-product',gap:Number(text.match(/расстоянии не меньше чем (\d+)/u)[1]),prime:Number(text.match(/произведение элементов делится на (\d+)/u)[1])};
 else {m={kind:'product-count',modulus:Number(text.match(/произведение элементов делится (?:без остатка )?на (\d+)/u)[1])};m.prime=m.modulus/2;}
 if(['product-count','distant-product'].includes(m.kind)){assert.ok(m.prime>2);for(let i=2;i*i<=m.prime;i++)assert.notEqual(m.prime%i,0,'not prime');}
 const ex=text.match(/Пример входных данных: ([\d ]+) Пример выходных данных[^:]*: ([\d ]+)/u);assert.ok(ex);const values=ex[1].trim().split(/\s+/u).map(Number);assert.equal(values.shift(),values.length);m.example={input:values,output:ex[2].trim().split(/\s+/u).map(Number)};return m;
}
function compatible(x,y,i,j,m){
 switch(m.kind){
 case 'ordered-sum':return x>y&&(x+y)%m.modulus===0;
 case 'different-remainders':return x%m.modulus!==y%m.modulus&&(x%m.prime===0||y%m.prime===0);
 case 'even-difference':return (x-y)%2===0&&(x%m.divisor===0||y%m.divisor===0);
 case 'distant-product':return j-i>=m.gap&&x*y%m.prime===0;
 case 'product-count':return x*y%m.modulus===0;
 default:assert.fail('kind');
 }
}
function solve(a,m){let count=0,best=[0,0];for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++)if(compatible(a[i],a[j],i,j,m)){count++;if(a[i]+a[j]>best[0]+best[1])best=[a[i],a[j]];}return ['product-count','distant-product'].includes(m.kind)?[count]:best;}
function verify(a,got,want,m){
 if(['product-count','distant-product'].includes(m.kind)){assert.deepEqual(got,want);return;}
 assert.equal(got.length,2);assert.equal(got[0]+got[1],want[0]+want[1]);if(want[0]===0){assert.deepEqual(got,[0,0]);return;}
 let valid=false;for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++)if(a[i]===got[0]&&a[j]===got[1]&&compatible(a[i],a[j],i,j,m))valid=true;assert.ok(valid,'invalid pair positions');
}
function compute(task,data){
 const text=conditionText(task.fragment);assert.equal(text,data.condition,'changed condition');const m=model(text),saved={...data.model};delete saved.id;delete saved.sourceHash;delete saved.condition;assert.deepEqual(m,saved,'condition-derived model');assert.ok(data.cases.length>=100);
 const inputs=data.cases.map(c=>c.input);for(const a of inputs){assert.ok(a.length>= (m.gap|| (m.kind==='product-count'?1:2)) && a.length<= (m.kind==='ordered-sum'?12000:['product-count','distant-product'].includes(m.kind)?1000:10000));assert.ok(a.every(x=>Number.isInteger(x)&&x>0&&x<=10000));if(['product-count','distant-product'].includes(m.kind))assert.equal(new Set(a).size,a.length);}
 const results=JSON.parse(execFileSync('/usr/bin/python3',[path.join(__dirname,'run-pair-program.py')],{input:JSON.stringify({code:data.code,inputs}),encoding:'utf8',timeout:30000,maxBuffer:3000000}));assert.equal(results.length,inputs.length);
 let maxDataBytes=0;
 for(let i=0;i<inputs.length;i++){const want=solve(inputs[i],m);assert.deepEqual(data.cases[i].expected,want,'independent expected');if(m.kind==='ordered-sum')assert.ok(want[0]>0,'guaranteed pair absent');verify(inputs[i],results[i].output,want,m);assert.deepEqual(results[i].output,data.cases[i].actual,'changed execution');maxDataBytes=Math.max(maxDataBytes,results[i].explicitDataBytes);}
 assert.ok(maxDataBytes<(m.kind==='ordered-sum'?4096:1024),'explicit data memory budget');
 return {kind:m.kind,cases:inputs.length,maxDataBytes,answer:'Программа на Python 3 приведена в решении'};
}
module.exports={model,compatible,solve,verify,compute};
