'use strict';
const assert=require('node:assert/strict');
const {conditionText,seoPlainText}=require('../../lib/seo-text');
const normalize=s=>s.replaceAll('/\\','∧').replaceAll('\\/','∨').replaceAll('х','x').replace(/\s+/gu,'');
const priority={'≡':1,'→':2,'∨':3,'∧':4,'¬':5};
function compile(expression){
 const out=[],stack=[];const s=normalize(expression);assert.match(s,/^[wxyzXYZ01¬∧∨→≡()]+$/u);
 for(const c of s){
  if(/[wxyzXYZ01]/u.test(c))out.push(c);
  else if(c==='(')stack.push(c);
  else if(c===')'){while(stack.at(-1)!=='('){assert.ok(stack.length);out.push(stack.pop());}stack.pop();}
  else {while(stack.length&&stack.at(-1)!=='('&&priority[stack.at(-1)]>priority[c])out.push(stack.pop());stack.push(c);}
 }
 while(stack.length){assert.notEqual(stack.at(-1),'(');out.push(stack.pop());}
 return out;
}
function evaluate(code,variables){
 const s=[];
 for(const c of code){
  if(/[wxyzXYZ]/u.test(c)){assert.ok(c in variables);s.push(variables[c]);}
  else if(c==='0'||c==='1')s.push(Number(c));
  else if(c==='¬')s.push(1-s.pop());
  else {const b=s.pop(),a=s.pop();assert.ok(a!==undefined&&b!==undefined);s.push(c==='∧'?Number(a&&b):c==='∨'?Number(a||b):c==='→'?Number(a<=b):Number(a===b));}
 }
 assert.equal(s.length,1);return s[0];
}
function permutations(list){if(!list.length)return [[]];return list.flatMap((v,i)=>permutations(list.filter((_,j)=>i!==j)).map(p=>[v,...p]));}
function rowsFromHtml(html){
 const stack=[],leaves=[];
 for(const m of html.matchAll(/<\/?table\b[^>]*>/giu)){
  if(!m[0].startsWith('</')&&!m[0].startsWith('</'.toUpperCase())) {if(stack.length)stack.at(-1).child=true;stack.push({start:m.index+m[0].length,child:false});}
  else {const t=stack.pop();if(t&&!t.child)leaves.push(html.slice(t.start,m.index));}
 }
 for(const table of leaves){
  const rows=[...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/giu)].map(m=>[...m[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/giu)].map(c=>seoPlainText(c[1]).trim()));
  const data=rows.filter(r=>[4,5].includes(r.length)&&r.every(c=>['','0','1'].includes(c))&&['0','1'].includes(r.at(-1)));
  if(data.length)return data.map(r=>r.map(c=>c===''?null:Number(c)));
 }
 throw Error('No numeric table');
}
function source(task){
 const text=conditionText(task.fragment),rows=rowsFromHtml(task.fragment);assert.equal(rows.length,3);
 if(rows[0].length===4){const tail=text.split('Какое выражение соответствует F?')[1];assert.ok(tail);const options=tail.split(/[1-4]\)/u).slice(1).map(s=>normalize(s.trim()));assert.equal(options.length,4);return {kind:'choice',rows,options};}
 const m=text.match(/(?:функции\s*(?:F\s*)?|выражением\s*)([^,.]+)/u);assert.ok(m);const formula=normalize(m[1]);assert.equal(new Set(rows.map(r=>r.at(-1))).size,1);return {kind:'permutation',rows,formula};
}
function solve(data){
 const {rows}=data;
 if(data.kind==='choice'){
  const values=data.options.map(f=>rows.map(r=>evaluate(compile(f),Object.fromEntries([... 'XYZ'].map((v,i)=>[v,r[i]])))));
  const good=values.map((v,i)=>v.every((x,j)=>x===rows[j][3])?String(i+1):null).filter(Boolean);assert.equal(good.length,1);return {...data,values,answer:good[0]};
 }
 const code=compile(data.formula),truth=Array.from({length:16},(_,n)=>{const v=[3,2,1,0].map(i=>(n>>i)&1);return [...v,evaluate(code,Object.fromEntries([... 'wxyz'].map((c,i)=>[c,v[i]])))];});
 const target=rows[0][4],valid=truth.filter(r=>r[4]===target).map(r=>r.slice(0,4));assert.equal(valid.length,3);
 // Independent of matching truth rows: enumerate every blank cell, evaluate
 // every variable permutation, and reject repeated completed input rows.
 const blanks=rows.flatMap((r,i)=>r.slice(0,4).flatMap((c,j)=>c===null?[[i,j]]:[])),solutions=[];
 for(let mask=0;mask<2**blanks.length;mask++){
  const filled=rows.map(r=>[...r]);blanks.forEach(([i,j],k)=>filled[i][j]=(mask>>k)&1);
  if(new Set(filled.map(r=>r.slice(0,4).join(''))).size!==3)continue;
  for(const order of permutations([... 'wxyz'])){
   if(filled.every(r=>evaluate(code,Object.fromEntries(order.map((v,j)=>[v,r[j]])))===r[4]))solutions.push({answer:order.join(''),completed:filled});
  }
 }
 assert.equal(solutions.length,1,'unique variable order and completed rows');
 const roworders=permutations([0,1,2]).map(indices=>{
  const columns=[0,1,2,3].map(c=>[... 'wxyz'].filter((v,j)=>rows.every((r,k)=>r[c]===null||r[c]===valid[indices[k]][j])).join(''));
  const orders=permutations([... 'wxyz']).filter(p=>p.every((v,i)=>columns[i].includes(v))).map(p=>p.join(''));
  return {labels:indices.map(i=>'ABC'[i]).join(''),columns,orders};
 });
 return {...data,target,truth,valid,roworders,...solutions[0]};
}
function subexpressions(expression){
 const stack=[];
 for(const t of compile(expression)){
  if(/[wxyzXYZ01]/u.test(t))stack.push({expression:t,op:null,code:[t]});
  else {const b=stack.pop();if(t==='¬')stack.push({expression:'¬'+(b.op?'('+b.expression+')':b.expression),op:t,children:[b],code:[...b.code,t]});else {const a=stack.pop();stack.push({expression:'('+a.expression+' '+t+' '+b.expression+')',op:t,children:[a,b],code:[...a.code,...b.code,t]});}}
 }
 const root=stack[0];const flat=n=>n.op===root.op?n.children.flatMap(flat):[n];return {op:root.op,expression:root.expression,parts:flat(root)};
}
module.exports={normalize,compile,evaluate,permutations,rowsFromHtml,source,solve,subexpressions};
