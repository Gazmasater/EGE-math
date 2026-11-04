'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {conditionText}=require('../../lib/seo-text');
const root=path.resolve(__dirname,'../..');
function model(text){
 if(text.includes('только один из элементов является двузначным')){
  assert.ok(text.includes('сумма элементов пары кратна максимальному двузначному'));
  return {kind:'one-two-digit',window:2};
 }
 if(text.includes('хотя бы одно число делится на минимальный элемент')){
  const match=text.match(/минимальный элемент последовательности, кратный (\d+)/u);assert.ok(match);
  return {kind:'divisible-by-minimum',window:2,divisor:Number(match[1])};
 }
 assert.ok(text.includes('все числа одного знака')&&text.includes('произведение минимального и максимального элементов тройки больше квадрата'));
 const match=text.match(/оканчивается на (\d+) и является трёхзначным/u);assert.ok(match);
 return {kind:'signed-triples',window:3,ending:Number(match[1])};
}
function solve(a,m){
 assert.ok(a.length>=m.window&&a.every(Number.isSafeInteger));
 assert.ok(a.every(x=>x>= (m.kind==='signed-triples'?-100000:1)&&x<=100000));
 let eligible;
 if(m.kind==='one-two-digit')eligible=a.filter(x=>x>=10&&x<=99);
 else if(m.kind==='divisible-by-minimum')eligible=a.filter(x=>x%m.divisor===0);
 else eligible=a.filter(x=>Math.abs(x)>=100&&Math.abs(x)<=999&&Math.abs(x)%100===m.ending);
 assert.ok(eligible.length,'missing threshold');
 const threshold=eligible.reduce((best,x)=>m.kind==='one-two-digit'?Math.max(best,x):Math.min(best,x),eligible[0]);
 const selected=[];
 for(let i=0;i<=a.length-m.window;i++){
  const values=a.slice(i,i+m.window);let ok,value;
  if(m.kind==='one-two-digit'){
   value=values[0]+values[1];ok=values.filter(x=>x>=10&&x<=99).length===1&&value%threshold===0;
  }else if(m.kind==='divisible-by-minimum'){
   value=values[0]+values[1];ok=values.some(x=>x%threshold===0);
  }else{
   const lo=Math.min(...values),hi=Math.max(...values);value=lo*hi;ok=(lo>0||hi<0)&&value>threshold*threshold;
  }
  if(ok)selected.push({index:i+1,values,value});
 }
 assert.ok(selected.length,'no selected windows');
 const extreme=selected.reduce((best,w)=>m.kind==='signed-triples'?Math.min(best,w.value):Math.max(best,w.value),selected[0].value);
 return {kind:m.kind,elements:a.length,threshold,count:selected.length,extreme,selected,answer:`${selected.length} ${extreme}`};
}
function compute(task,data,readFile=fs.readFileSync){
 const text=conditionText(task.fragment);assert.equal(text,data.condition,'changed primary condition');
 const links=[...task.fragment.matchAll(/href=["'](\/fipi\/ege-informatics\/docs\/official-open\/[^"']+\.txt)["']/g)].map(m=>m[1]);assert.deepEqual(links,[data.url]);
 const file=path.resolve(root,'fipi-assets',data.url.slice('/fipi/'.length));assert.ok(file.startsWith(root+'/fipi-assets/ege-informatics/docs/official-open/'));
 const bytes=readFile(file);assert.equal(createHash('sha256').update(bytes).digest('hex'),data.fileSha256,'changed official data');
 const raw=bytes.toString('utf8').replace(/^\uFEFF/u,'').trim();assert.match(raw,/^-?\d+(?:\s+-?\d+)*$/u);
 const result=solve(raw.split(/\s+/u).map(Number),model(text));assert.deepEqual(result,data.result,'changed sequence calculation');return result;
}
module.exports={model,solve,compute};
