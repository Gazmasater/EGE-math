'use strict';
const assert=require('node:assert/strict');
const {conditionText}=require('../../lib/seo-text');
const pascal=require('./ege-informatics-program-machine');
function prime(n){if(n<2||!Number.isSafeInteger(n))return false;if(n%2===0)return n===2;for(let d=3;d*d<=n;d+=2)if(n%d===0)return false;return true;}
function pairs(bound,pattern,column,end){
 assert.ok(Number.isSafeInteger(bound)&&bound>0&&Number.isSafeInteger(end)&&end>bound&&end-bound<100000);
 assert.match(pattern,/^[0-9]{1,2}$/u);assert.ok(['min','max'].includes(column));
 const once=n=>String(n).split(pattern).length===2,rows=[];
 for(let p=2;p*p<=end;p++)if(once(p)&&prime(p))for(let q=Math.max(p,Math.floor(bound/p)+1);q<=Math.floor(end/p);q++)if(once(q)&&prime(q))rows.push({n:p*q,p,q,value:column==='max'?q:p});
 return rows.sort((a,b)=>a.n-b.n);
}
function cubeBounds(target){assert.ok(Number.isInteger(target)&&target>=2);return {lower:Math.ceil(((target-1)**3+target**3)/2),upper:Math.ceil((target**3+(target+1)**3)/2)-1};}
function compute(task,data){
 const text=conditionText(task.fragment);assert.equal(text,data.condition,'changed condition');const c=data.result;let result;
 if(c.kind==='semiprime'){
  assert.ok(text.includes('произведения ровно двух простых множителей'));
  const bound=Number(text.match(/бо́?льшие ([\d ]+),/u)[1].replaceAll(' ','')),pattern=text.match(/ровно одну цифру (\d)/u)?.[1]||text.match(/в своей записи (\d+) \(/u)[1],column=text.includes('наибольший')?'max':'min';
  assert.equal(bound,c.bound);assert.equal(pattern,c.pattern);assert.equal(column,c.column);assert.equal(c.rows.length,5);
  const rows=pairs(bound,pattern,column,c.rows.at(-1).n);assert.deepEqual(rows,c.rows);assert.equal(rows.length,5);
  result={kind:c.kind,answer:rows.map(r=>r.n+' '+r.value).join('; '),rows};
 }else{
  const program=pascal.parse(pascal.read(task));
  if(c.kind==='minimum-scan'){
   const actual=pascal.execute(program);assert.equal(actual.output.length,1);assert.equal(actual.final.m,c.M);assert.equal(actual.final.r,c.R);
   assert.deepEqual(actual.trace.map(t=>({t:t.index,F:pascal.execute({functions:program.functions,body:{kind:'output',args:[{op:'call',name:'f',args:[{op:'num',n:t.index}]}]}}).output[0]})),c.values);
   const min=Math.min(...c.values.map(r=>r.F)),minimizers=c.values.filter(r=>r.F===min).map(r=>r.t);assert.deepEqual(minimizers,c.minimizers);
   result={kind:c.kind,answer:String(actual.output[0]),M:actual.final.m,R:actual.final.r,minimizers};
  }else{
   assert.equal(c.kind,'cube-rounding');const input=Number(text.match(/k = (\d+)/u)[1]);assert.equal(input,c.input);
   const target=pascal.execute(program,input).output[0];assert.equal(target,c.target);const {lower,upper}=cubeBounds(target),selected=[];
   for(let k=lower-1;k<=upper+1;k++){const actual=pascal.execute(program,k).output[0];if(actual===target)selected.push(k);else assert.ok(k===lower-1||k===upper+1);}
   assert.deepEqual(selected,c.selected);for(const row of c.trace)assert.equal(pascal.execute(program,row.k).output[0],row.output);
   result={kind:c.kind,answer:String(upper-lower+1),target,lower,upper};
  }
 }
 assert.equal(result.answer,c.answer,'computed answer');return result;
}
module.exports={prime,pairs,cubeBounds,compute};
