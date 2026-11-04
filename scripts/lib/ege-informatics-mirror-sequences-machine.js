'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{conditionText}=require('../../lib/seo-text');
const root=path.resolve(__dirname,'../..');
function model(text){
 assert(text.includes('В данной задаче под')&&text.includes('идущих подряд элемента последовательности'));
 const window=text.includes('под тройкой')?3:2,extreme=text.includes('минимальную из сумм')?'min':'max',signed=!text.includes('натуральных'),mod=text.match(/деления (?:обоих элементов на |на |хотя бы одного из элементов на )(\d+)/u);
 if(mod)return {kind:text.includes('сумма остатков')?'remainder-sum':'remainder-any',window,divisor:Number(mod[1]),extreme,signed};
 if(text.includes('количества чисел'))return {kind:'negative-pair',window,divisor:Number(text.match(/кратных (\d+)/u)[1]),extreme,signed};
 if(text.includes('минимального положительного'))return {kind:'positive-multiple-bound',window,divisor:Number(text.match(/кратного (\d+)/u)[1]),extreme,absoluteAnswer:true,signed};
 const digits=text.includes('четырёхзначным')?4:text.includes('трёхзначным')||text.includes('трёхзначными')?3:text.includes('двузначным')||text.includes('двузначных')?2:null;assert(digits);
 const ending=Number(text.match(/оканчивающ(?:егося|емуся) на (\d+)/u)[1]),count=text.includes('ровно два')?2:text.includes('только одно')||text.includes('только один')?1:'any';
 if(window===2){assert(text.includes('сумма элементов пары кратна минимальному трёхзначному'));return {kind:'digit-pair',window,digits,count,ending,extreme,signed};}
 const comparison=text.includes('не больше')?'<=':text.includes('не меньше')?'>=':text.includes('меньше максимального')?'<':'>';assert(comparison!=='>'||text.includes('больше максимального'));
 return {kind:'digit-triples',window,digits,count,ending,comparison,signed,power:text.includes('квадрат суммы')?2:1,extreme};
}
function solve(a,m){
 assert(a.length>=m.window&&a.every(x=>Number.isSafeInteger(x)&&x>=(m.signed?-100000:1)&&x<=100000));assert([2,3].includes(m.window));assert(['min','max'].includes(m.extreme));
 const hasDigits=x=>10**(m.digits-1)<=Math.abs(x)&&Math.abs(x)<10**m.digits;let threshold;
 if(m.kind.startsWith('remainder-'))threshold=a.reduce((b,x)=>Math.min(b,x));
 else if(m.kind==='negative-pair')threshold=a.filter(x=>x%m.divisor===0).length;
 else {const eligible=a.filter(x=>m.kind==='positive-multiple-bound'?x>0&&x%m.divisor===0:m.kind==='digit-pair'?hasDigits(x)&&Math.abs(x)%10===m.ending:Math.abs(x)%100===m.ending);assert(eligible.length,'missing threshold');threshold=eligible.reduce((b,x)=>m.kind==='digit-triples'?Math.max(b,x):Math.min(b,x));}
 const selected=[];
 for(let i=0;i<=a.length-m.window;i++){
  const values=a.slice(i,i+m.window),sum=values.reduce((s,x)=>s+x,0);let ok;
  if(m.kind==='remainder-sum')ok=values.reduce((s,x)=>s+x%m.divisor,0)===threshold;
  else if(m.kind==='remainder-any')ok=values.some(x=>x%m.divisor===threshold);
  else if(m.kind==='negative-pair')ok=values.some(x=>x<0)&&sum<threshold;
  else if(m.kind==='positive-multiple-bound')ok=sum<threshold;
  else {const n=values.filter(hasDigits).length,digitsOk=m.count==='any'?n>=1:n===m.count;
   if(m.kind==='digit-pair')ok=digitsOk&&sum%threshold===0;
   else {assert.equal(m.kind,'digit-triples');assert([1,2].includes(m.power));const value=sum**m.power;ok=digitsOk&&(m.comparison==='<'?value<threshold:m.comparison==='<='?value<=threshold:m.comparison==='>'?value>threshold:value>=threshold);}
  }
  if(ok)selected.push({index:i+1,values,sum});
 }
 const extreme=selected.length?selected.reduce((best,w)=>m.extreme==='min'?Math.min(best,w.sum):Math.max(best,w.sum),selected[0].sum):null;
 return {elements:a.length,minimum:a.reduce((b,x)=>Math.min(b,x)),maximum:a.reduce((b,x)=>Math.max(b,x)),threshold,count:selected.length,extreme,answer:extreme===null?null:`${selected.length} ${m.absoluteAnswer?Math.abs(extreme):extreme}`,selected,extremeWitnesses:selected.filter(w=>w.sum===extreme)};
}
const caches=new WeakMap();
function compute(task,data,readFile=fs.readFileSync){
 const text=conditionText(task.fragment);assert.equal(text,data.condition,'changed primary condition');const m=model(text);assert.deepEqual(m,data.model,'changed sequence model');
 const links=[...task.fragment.matchAll(/href=["'](\/fipi\/ege-informatics\/docs\/restored-sequences\/EGEINF[A-F\d]{6}\.txt)["']/g)].map(x=>x[1]);assert.deepEqual(links,[data.url]);
 const f=path.resolve(root,'fipi-assets',data.url.slice('/fipi/'.length));assert(f.startsWith(root+'/fipi-assets/ege-informatics/docs/restored-sequences/'));const bytes=readFile(f),sha=createHash('sha256').update(bytes).digest('hex');assert.equal(sha,data.fileSha256,'changed data file');
 let cache=caches.get(readFile);if(!cache){cache=new Map();caches.set(readFile,cache);}const key=JSON.stringify([sha,m]);let result=cache.get(key);
 if(!result){const raw=bytes.toString('utf8').replace(/^\uFEFF/u,'').trim();assert.match(raw,/^-?\d+(?:\s+-?\d+)*$/u);result={...solve(raw.split(/\s+/u).map(Number),m),fileSha256:sha};assert(result.answer!==null,'no qualifying windows');cache.set(key,result);}
 assert.deepEqual(result,data.result,'changed result');return result;
}
module.exports={model,solve,compute};
