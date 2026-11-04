'use strict';
const assert=require('node:assert/strict');
const {conditionText,seoPlainText}=require('../../lib/seo-text');
function tables(fragment){return [...fragment.matchAll(/<table\b[^>]*>(?:(?!<table\b)[\s\S])*?<\/table>/gi)].map(t=>[...t[0].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(r=>[...r[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(c=>seoPlainText(c[1].replace(/<br\s*\/?>/gi,' ').replace(/<\/?(?:span|b|i|font|strong|em)\b[^>]*>/gi,'')).replace(/\s+/gu,' ').trim())));}
function model(task){
 const text=conditionText(task.fragment);
 if(text.includes('Рассматривается множество')){
  const limits=text.match(/\[([\d ]+); ([\d ]+)\]/u);assert.ok(limits);const common={lo:Number(limits[1].replaceAll(' ','')),hi:Number(limits[2].replaceAll(' ','')),extreme:text.includes('минимальное')?'min':'max'},rem=text.match(/на (\d+) равен (\d+)/u);
  if(rem){const ex=text.match(/не делятся ни на (\d+), ни на (\d+)/u);return {kind:'remainder',divisor:Number(rem[1]),remainder:Number(rem[2]),exclude:ex.slice(1).map(Number),...common};}
  const inc=text.match(/делятся на (\d+) или (\d+)/u),ex=text.match(/не делятся на (\d+), (\d+), (\d+)/u);assert.ok(inc&&ex);return {kind:'union',include:inc.slice(1).map(Number),exclude:ex.slice(1).map(Number),...common};
 }
 const grid=tables(task.fragment),move=text.match(/Из ячейки ([A-Z]\d+) в ячейку ([A-Z]\d+)/u);
 if(move){const rows=grid.find(r=>r.length===5&&r.every(a=>a.length===6));assert.ok(rows);const cells={};for(let y=1;y<=4;y++)for(let x=1;x<=5;x++)cells[String.fromCharCode(64+x)+y]=rows[y][x];const source=move[1],target=move[2],formula=cells[source].replace(/\s+/gu,'');assert.equal(cells[target],'');assert.ok(formula.startsWith('='));return {kind:text.includes('Какова сумма')?'sum':'value',source,target,formula,cells:Object.fromEntries(Object.entries(cells).filter(([,v])=>v&&!v.trim().startsWith('=')).map(([k,v])=>{assert.match(v,/^\d+$/u);return [k,Number(v)];}))};}
 const match=text.match(/ячейке ([A-Z]\d+) записана формула\s*(=[^.]+)\./u),target=text.match(/скопируют в ячейку ([A-Z]\d+)/u);assert.ok(match&&target);const opts=grid.find(r=>r.length===4&&r.every(a=>a.length===3));assert.ok(opts);return {kind:'choice',source:match[1],target:target[1],formula:match[2].replace(/\s+/gu,''),cells:{},options:opts.map(r=>r[2].replace(/\s+/gu,''))};
}
const coordinates=s=>[s.charCodeAt(0)-65,Number(s.slice(1))];
function shift(formula,source,target){
 const a=coordinates(source),b=coordinates(target);
 // A relative reference stores its displacement from the formula cell, while
 // an absolute component stores a coordinate. Resolve that at the destination.
 return formula.replace(/(\$?)([A-Z])(\$?)(\d+)/gu,(_,colFixed,col,rowFixed,row)=>{
  const x=col.charCodeAt(0)-65,y=Number(row),encodedX=colFixed?x:x-a[0],encodedY=rowFixed?y:y-a[1];
  const nx=colFixed?encodedX:b[0]+encodedX,ny=rowFixed?encodedY:b[1]+encodedY;assert.ok(nx>=0&&ny>=1);return colFixed+String.fromCharCode(65+nx)+rowFixed+ny;
 });
}
function value(formula,cells){
 const refs=formula.slice(1).replace(/\$/gu,'').match(/[A-Z]\d+|\d+|[+*\-]/gu);assert.equal(refs.join(''),formula.slice(1).replace(/\$/gu,''));
 const terms=[],ops=[];for(let i=0;i<refs.length;i++){if(i%2){assert.ok(['+','-','*'].includes(refs[i]));ops.push(refs[i]);}else {const v=/^\d+$/u.test(refs[i])?Number(refs[i]):cells[refs[i]];assert.ok(Number.isFinite(v));terms.push(v);}}
 for(let i=0;i<ops.length;)if(ops[i]==='*'){terms.splice(i,2,terms[i]*terms[i+1]);ops.splice(i,1);}else i++;
 return ops.reduce((n,op,i)=>op==='+'?n+terms[i+1]:n-terms[i+1],terms[0]);
}
function solve(m){
 if(['remainder','union'].includes(m.kind)){
  // Build arithmetic progressions, independently from a full-interval scan.
  const candidates=new Set();
  if(m.kind==='remainder'){let n=m.lo+((m.remainder-m.lo)%m.divisor+m.divisor)%m.divisor;for(;n<=m.hi;n+=m.divisor)candidates.add(n);}
  else for(const d of m.include)for(let n=Math.ceil(m.lo/d)*d;n<=m.hi;n+=d)candidates.add(n);
  const passed=[...candidates].filter(n=>m.exclude.every(d=>n%d!==0)).sort((a,b)=>a-b);assert.ok(passed.length);
  return {answer:`${passed.length} ${m.extreme==='min'?passed[0]:passed.at(-1)}`,count:passed.length,minimum:passed[0],maximum:passed.at(-1),first:passed.slice(0,5),last:passed.slice(-5)};
 }
 const copiedFormula=shift(m.formula,m.source,m.target);assert.equal(shift(copiedFormula,m.target,m.source),m.formula);
 if(m.kind==='choice'){const hits=m.options.flatMap((v,i)=>v===copiedFormula?[i+1]:[]);assert.equal(hits.length,1);return {answer:String(hits[0]),copiedFormula};}
 const originalValue=value(m.formula,m.cells),copiedValue=value(copiedFormula,m.cells);return {answer:String(m.kind==='sum'?originalValue+copiedValue:copiedValue),copiedFormula,originalValue,copiedValue};
}
function compute(task,data){assert.equal(conditionText(task.fragment),data.condition,'changed condition');const derived=model(task);assert.deepEqual(derived,data.model,'changed model');const calculated=solve(derived);assert.deepEqual(calculated,data.calculated,'changed calculation');return calculated;}
module.exports={tables,model,shift,value,solve,compute};
