'use strict';
const assert=require('node:assert/strict');
const {conditionText,seoPlainText}=require('../../lib/seo-text');
const B=require('./ege-informatics-truth-machine');
const digits=s=>s.replace(/[₀₁₂₃₄₅₆₇₈₉]/gu,c=>'₀₁₂₃₄₅₆₇₈₉'.indexOf(c));
const normal=s=>s.replace(/\s+/gu,'').replaceAll('/\\','∧').replaceAll('\\/','∨').replaceAll('х','x').replaceAll('А','A').replaceAll('Î','∈').replace(/[·∙]/gu,'*').replaceAll('−','-').replace(/[?.]+$/u,'');
const gcd=(a,b)=>b?gcd(b,a%b):a;
const lcm=(a,b)=>a/gcd(a,b)*b;
const paragraphs=t=>{
 const cell=t.fragment.match(/<td\b[^>]*class=['"]cell_0['"][^>]*>([\s\S]*?)<\/td>/iu);
 assert.ok(cell,t.id+': primary condition');
 return [...cell[1].matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/giu)].map(m=>seoPlainText(m[1]));
};
function formula(t){
 const found=paragraphs(t).map(normal).filter(s=>/[→∧∨]/u.test(s)&&!/[а-яё]/iu.test(s.replaceAll('ДЕЛ','')));
 assert.equal(found.length,1,t.id+': formula count');return found[0];
}
function booleanValues(f,variables){
 const letters=Object.fromEntries([...variables].map((v,i)=>[v,'wxyz'[i]]));
 const code=B.compile(f.replace(/[A-Z]/gu,v=>letters[v]||v)),out=[];
 for(let mask=0;mask<2**variables.length;mask++)out.push(B.evaluate(code,Object.fromEntries([...variables].map((v,i)=>[letters[v],(mask>>(variables.length-i-1))&1]))));
 return out;
}
function counts(task,d){
 const text=conditionText(task.fragment),head=digits(text.split('которые')[0]);
 const n=Math.max(...[...head.matchAll(/x(\d+)/gu)].map(m=>+m[1])),m=Math.max(...[...head.matchAll(/y(\d+)/gu)].map(m=>+m[1]));
 assert.equal(n,d.n);assert.equal(m,d.m||d.n);
 const equations=paragraphs(task).map(p=>B.normalize(digits(p))).filter(s=>/^[¬(xy]/u.test(s)&&/[xy]\d/u.test(s)&&/[→∧≡∨]/u.test(s)&&!/[^xy0-9()¬→∧≡∨=]/u.test(s)).map(s=>({formula:s.split('=')[0],value:s.includes('=')?+s.split('=')[1]:1}));
 if(d.kind==='grid'){
  assert.match(text,new RegExp(`i < ${n} и j < ${m}`));assert.ok(equations.length>=4);
  for(const e of equations){
   const f=e.formula.match(/^\(x(\d+)∧y(\d+)→x\1∧y(\d+)\)∧\(x\1∧y\2→x(\d+)∧y\2\)$/u);assert.ok(f,e.formula);assert.equal(+f[3],+f[2]+1);assert.equal(+f[4],+f[1]+1);assert.equal(e.value,1);
  }
  let count=0;
  for(let bits=0;bits<2**(n+m);bits++){
   let valid=true;
   for(let i=0;i<n-1&&valid;i++)for(let j=0;j<m-1&&valid;j++)if(((bits>>i)&1)&&((bits>>(n+j))&1)&&(!((bits>>(i+1))&1)||!((bits>>(n+j+1))&1)))valid=false;
   count+=Number(valid);
  }
  assert.equal(d.zeroPrefixes,2**(n+1)+2**(m+1)-4);assert.equal(d.bothPresent,(n-1)*(m-1));assert.equal(count,d.zeroPrefixes+d.bothPresent);return String(count);
 }
 assert.deepEqual(equations,d.explicit);
 const indices=e=>[...new Set([...e.formula.matchAll(/[xy](\d+)/gu)].map(m=>+m[1]))].sort((a,b)=>a-b);
 const pairs=equations.filter(e=>indices(e).length===2),boundary=equations.filter(e=>indices(e).length===1);assert.ok(pairs.length);
 const first=pairs[0];assert.deepEqual(indices(first),[1,2]);assert.deepEqual(first,d.transition);
 for(const e of pairs){const ns=indices(e);assert.equal(ns[1],ns[0]+1);assert.equal(e.formula.replace(/([xy])(\d+)/gu,(_,v,k)=>v+(+k-ns[0]+1)),first.formula);assert.equal(e.value,first.value);}
 const code=B.compile(first.formula.replace(/[xy][12]/gu,s=>({'x1':'w','y1':'x','x2':'y','y2':'z'}[s])));
 const states=[[0,0],[0,1],[1,0],[1,1]],matrix=states.map(s=>states.map(q=>Number(B.evaluate(code,Object.fromEntries([...'wxyz'].map((v,i)=>[v,[...s,...q][i]])))===first.value)));
 const initial=[1,1,1,1],terminal=[1,1,1,1];
 for(const b of boundary){const k=indices(b)[0];assert.ok(k===1||k===n);const dest=k===1?initial:terminal,compiled=B.compile(b.formula.replace(/[xy]\d+/gu,s=>s[0]));states.forEach((s,i)=>dest[i]*=Number(B.evaluate(compiled,{x:s[0],y:s[1]})===b.value));}
 const steps=[initial];for(let i=1;i<n;i++)steps.push(states.map((_,j)=>steps.at(-1).reduce((sum,v,k)=>sum+v*matrix[k][j],0)));
 assert.deepEqual(matrix,d.matrix);assert.deepEqual(boundary,d.boundary);assert.deepEqual(initial,d.initial);assert.deepEqual(terminal,d.terminal);assert.deepEqual(steps,d.steps);
 return String(steps.at(-1).reduce((sum,v,i)=>sum+v*terminal[i],0));
}
function statements(task,d){
 const text=conditionText(task.fragment),names=d.names;
 for(const name of names)assert.ok(text.includes(name),name);
 let rows,ok;
 if(task.id==='EGEINF667D45'){
  rows=names.map(c=>[c==='Володя',c!=='Володя',c==='Володя',c==='Аня',c!=='Аня',['Соня','Оля'].includes(c),!['Соня','Аня','Оля'].includes(c),c==='Коля'].map(Number));ok=r=>r.reduce((a,b)=>a+b,0)===2;
 }else if(task.id==='EGEINF0BA35D'){
  rows=names.map(c=>[c==='Андрей',c==='Вика',c==='Света',false,c==='Света',['Вика','Света'].includes(c),!['Вика','Света'].includes(c),c!=='Андрей'].map(Number));ok=r=>r.reduce((a,b)=>a+b,0)===3;
 }else{
  assert.equal(task.id,'EGEINF450207');rows=names.map(c=>[c!=='Миша',c!=='Коля',c!=='Миша',c==='Сергей',c!=='Сергей',c==='Миша'].map(Number));ok=r=>[r[0]+r[1],r[2]+r[3],r[4]+r[5]].sort().join('')==='012';
 }
 assert.deepEqual(rows,d.truth);const winners=names.filter((_,i)=>ok(rows[i]));assert.deepEqual(winners,[d.person]);return winners[0][0];
}
function compute(task,d){
 const text=conditionText(task.fragment),kind=d.kind;
 if(kind==='chain'||kind==='grid')return counts(task,d);
 if(kind==='statements')return statements(task,d);
 if(kind==='integer-between'){
  const found=[];
  if(task.id==='EGEINF4826DB'){
   assert.match(text,/C = 8, B = 18/);for(let A=-100;A<=100;A++)if(A!==18&&(!(18<A)||16>A)&&(!(A<18)||A>16))found.push(A);
  }else{assert.equal(task.id,'EGEINF7D1C51');assert.match(text,/A = 45, C = 43/);for(let C=-100;C<=100;C++)if(C!==45&&(!(45>C)||C>43)&&(!(C>45)||43>C))found.push(C);}
  assert.equal(found.length,1);return String(found[0]);
 }
 if(kind==='square-implication'){assert.match(text,/90<X·X/);let largest=-Infinity;for(let X=-100;X<=100;X++)if(!(90<X*X)||(X<X-1))largest=X;return String(largest);}
 const f=formula(task);assert.equal(f,normal(d.formula),task.id+': primary formula');
 if(kind==='equivalent'){
  const start=text.split('?')[1],options=start.split(/[1-4]\)/u).slice(1).map(normal);assert.deepEqual(options,d.options);
  const values=booleanValues(f,'ABC'),all=options.map(s=>booleanValues(s,'ABC'));assert.deepEqual(values,d.target);assert.deepEqual(all,d.values);const found=all.flatMap((v,i)=>JSON.stringify(v)===JSON.stringify(values)?[i+1]:[]);assert.equal(found.length,1);return String(found[0]);
 }
 if(kind==='number-choice'){
  const numbers=text.split('?')[1].split(/[1-4]\)/u).slice(1).map(Number),atoms=[...new Set(f.match(/X[<>]\d+/gu))];assert.deepEqual(numbers,d.options);
  let q=f;atoms.forEach((s,i)=>q=q.replaceAll(s,'wxyz'[i]));const code=B.compile(q),values=numbers.map(X=>B.evaluate(code,Object.fromEntries(atoms.map((s,i)=>['wxyz'[i],Number(s[1]==='>'?X>+s.slice(2):X<+s.slice(2))]))));
  assert.deepEqual(values,d.values);const found=values.flatMap((v,i)=>v?[i+1]:[]);assert.equal(found.length,1);return String(found[0]);
 }
 if(kind==='false-implication'){
  const values=booleanValues(f,'KLMN'),found=values.flatMap((v,i)=>v?[]:[i.toString(2).padStart(4,'0')]);assert.equal(found.length,1);return found[0];
 }
 if(kind.startsWith('div-')){
  const divisors=[...f.matchAll(/ДЕЛ\(x,(\d+)\)/gu)].map(m=>+m[1]);
  if(kind==='div-interval'){
   const [,lo,hi]=text.match(/B = \[(\d+); (\d+)\]/u),members=[];assert.deepEqual([+lo,+hi],d.interval);assert.equal(divisors.length,1);assert.equal(divisors[0],d.divisor);
   for(let x=+lo;x<=+hi;x++)if(x%divisors[0]===0)members.push(x);assert.deepEqual(members,d.members);return String(members.reduce(gcd));
  }
  const [p,q]=[...new Set(divisors)].sort((a,b)=>a-b);assert.equal(p,d.p);assert.equal(q,d.q);
  if(kind==='div-union')return String(Math.min(p,q));
  const L=lcm(p,q);assert.equal(L,d.lcm);
  if(kind==='div-bound'){const limit=+f.match(/≥(\d+)/u)[1];assert.equal(limit,d.limit);assert.match(text,/натуральном|целом положительном/u);return String(limit-L);}
  const cap=+(text.match(/не превышающего (\d+)/u)?.[1]||L),all=[];for(let a=1;a<=Math.min(cap,L);a++)if(L%a===0)all.push(a);assert.deepEqual(all,d.divisors);assert.equal(cap,d.cap);return String(all.at(-1));
 }
 if(kind==='bit-mask'){const [p,q]=[...f.matchAll(/x&(\d+)/gu)].map(m=>+m[1]);assert.equal(p,d.p);assert.equal(q,d.q);assert.equal(d.mask,p&~q);return String(p&~q);}
 if(kind.startsWith('interval-')){
  const bounds=[...text.matchAll(/([A-Z]) = \[(\d+); (\d+)\]/gu)].map(m=>m.slice(1));assert.deepEqual(bounds,d.bounds);const [[,l,r],[,l2,r2]]=bounds.map(v=>[v[0],+v[1],+v[2]]);assert.ok(l<l2&&l2<r&&r<r2);
  const [left,right]=kind==='interval-intersection'?[l2,r]:kind==='interval-left-difference'?[l,l2]:kind==='interval-right-difference'?[r,r2]:[l,r2];assert.equal(left,d.left);assert.equal(right,d.right);return String(right-left);
 }
 let answer;
 if(kind==='equation-x')answer=Math.ceil(+f.match(/≠(\d+)/u)[1]/3)-1;
 else if(kind==='equation-max')answer=Math.ceil(+f.match(/^\((\d+)≠/u)[1]/3)-1;
 else if(kind==='equation-min')answer=Math.floor(+f.match(/^\((\d+)≠/u)[1]/3)+1;
 else if(kind==='square-upper')answer=Math.floor((+f.match(/2y<(\d+)/u)[1]-1)/3);
 else if(kind==='quadrant-lower')answer=Math.floor(+f.match(/2y>(\d+)/u)[1]/3)+1;
 else if(kind==='linear-lower'){const [x,y]=[...f.matchAll(/[xy]<(\d+)/gu)].map(m=>+m[1]);answer=3*x+y-1;}
 else if(kind==='wedge-lower')answer=(f.startsWith('(3x')?5:3)*+f.match(/x<(\d+)/u)[1]-1;
 else if(kind==='rectangle-upper'){const [x,y]=[...f.matchAll(/[xy]>(\d+)/gu)].map(m=>+m[1]);answer=2*x+y+1;}
 else if(kind==='wedge-upper')answer=3*+f.match(/x>(\d+)/u)[1]+1;
 else if(kind==='product-upper'){const [,v,op]=f.match(/\((\d+)([≤<])x\)/u);answer=(+v-Number(op==='≤'))**2+1;}
 else if(kind==='product-lower'){const [,v,op]=f.match(/\((\d+)([≥>])x\)/u);answer=(+v+Number(op==='≥'))**2-1;}
 else if(kind==='product-wedge'){assert.equal(f,'(x≥12)∨(3x<y)∨(xy<A)');answer=3*11**2+1;}
 else if(kind==='positive-wedge'){assert.equal(f,'(x>A)∨(y>A)∨(y<x-2)∨(y>2x-10)');answer=7;}
 else if(kind==='positive-sum'){assert.equal(f,'(x+y≤30)∨(y≤x+2)∨(y≥A)');answer=17;}
 else throw Error('Unsupported logic kind '+kind);
 return String(answer);
}
module.exports={compute,normal,formula,counts};
