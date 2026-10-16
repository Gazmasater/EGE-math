const assert=require('node:assert/strict');
const {decodeEntities}=require('../../lib/seo-text');
const trim=a=>{while(a.length>1&&a.at(-1)===0n)a.pop();return a;};
const add=(a,b)=>trim(Array.from({length:Math.max(a.length,b.length)},(_,i)=>(a[i]||0n)+(b[i]||0n)));
const neg=a=>a.map(x=>-x);
const mul=(a,b)=>{const r=Array(a.length+b.length-1).fill(0n);a.forEach((x,i)=>b.forEach((y,j)=>r[i+j]+=x*y));return trim(r);};
function primaryExpression(fragment){
 const blocks=fragment.match(/<(?:m:)?math\b[^>]*>[\s\S]*?<\/(?:m:)?math>/gi)||[];assert.equal(blocks.length,1);
 const root={tag:'root',children:[]},stack=[root];
 for(const token of blocks[0].match(/<[^>]*>|[^<]+/g)||[]){
  if(!token.startsWith('<')){const t=decodeEntities(token).replace(/\s+/g,'');if(t)stack.at(-1).children.push(t);continue;}
  const m=token.match(/^<(\/?)(?:m:)?([\w-]+)/);assert.ok(m);
  if(m[1])assert.equal(stack.pop().tag,m[2]);
  else{const n={tag:m[2],children:[]};stack.at(-1).children.push(n);if(!token.endsWith('/>'))stack.push(n);}
 }
 assert.equal(stack.length,1);
 const render=n=>{
  if(typeof n==='string')return n;
  if(n.tag==='annotation')return '';
  if(n.tag==='msup'){assert.equal(n.children.length,2);return '('+render(n.children[0])+')^'+render(n.children[1]);}
  assert.ok(['root','math','mstyle','semantics','mrow','mn','mo','mi','mtext'].includes(n.tag),n.tag);
  return n.children.map(render).join('');
 };
 return render(root).replaceAll('−','-');
}
function polynomial(s){
 s=s.replace(/([0-9x)])(?=[x(])/g,'$1*');
 const tokens=s.match(/\d+|[x()+*^=-]/g)||[];assert.equal(tokens.join(''),s);let i=0;
 function atom(){
  if(tokens[i]==='-'){i++;return neg(atom());}
  if(tokens[i]==='+'){i++;return atom();}
  let a;
  if(tokens[i]==='('){i++;a=sum();assert.equal(tokens[i++],')');}
  else if(tokens[i]==='x'){i++;a=[0n,1n];}
  else{assert.match(tokens[i],/^\d+$/);a=[BigInt(tokens[i++])];}
  if(tokens[i]==='^'){i++;const p=Number(tokens[i++]);assert.ok(Number.isInteger(p)&&p>=0&&p<=4);const base=a;a=[1n];for(let j=0;j<p;j++)a=mul(a,base);}
  return a;
 }
 function product(){let a=atom();while(tokens[i]==='*'){i++;a=mul(a,atom());}return a;}
 function sum(){let a=product();while(['+','-'].includes(tokens[i])){const op=tokens[i++],b=product();a=add(a,op==='-'?neg(b):b);}return a;}
 const left=sum();assert.equal(tokens[i++],'=');const right=sum();assert.equal(i,tokens.length);return add(left,neg(right));
}
function divide(a,root){
 const r=Array(a.length-1).fill(0n);r[r.length-1]=a.at(-1);
 for(let i=r.length-2;i>=0;i--)r[i]=a[i+1]+root*r[i+1];
 assert.equal(a[0]+root*r[0],0n,'Root must divide polynomial exactly');return trim(r);
}
function checkPolynomials(task,record){
 const p=polynomial(primaryExpression(task.fragment));
 const roots=record.answer.split(';').map(s=>{s=s.trim().replace('−','-');assert.match(s,/^-?\d+$/);return BigInt(s);});
 assert.equal(new Set(roots.map(String)).size,roots.length);
 for(let i=1;i<roots.length;i++)assert.ok(roots[i]>roots[i-1]);
 for(const root of roots){let value=0n;for(let i=p.length-1;i>=0;i--)value=value*root+p[i];assert.equal(value,0n,task.id+': direct substitution');}
 let kind;
 if(p.length===4){
  kind='grouped-cubic';assert.equal(roots.length,3);
  const factored=roots.reduce((q,r)=>mul(q,[-r,1n]),[p.at(-1)]);
  assert.deepEqual(p,factored,task.id+': exact factorization proves all roots');
 }else{
  kind='sum-of-squares';assert.equal(p.length,5);assert.equal(roots.length,1);
  const q=divide(divide(p,roots[0]),roots[0]);assert.equal(q.length,3);
  assert.ok(q[2]>0n&&q[1]*q[1]-4n*q[2]*q[0]<0n,task.id+': remaining quadratic has no real roots');
 }
 return kind;
}
function auditPolynomials(task,source,record){
 assert.equal(checkPolynomials(task,record),source.model.kind);
 assert.equal(source.match,'exact');
 const external=source.externalCondition.replace('Решите уравнение','')
  .replaceAll('левая круглая скобка','(').replaceAll('правая круглая скобка',')')
  .replaceAll('в квадрате','^2').replaceAll('в кубе','^3')
  .replaceAll('плюс','+').replaceAll('минус','-').replaceAll('−','-')
  .replace(/\s+/g,'').replace(/^:/,'').replace(/\.$/,'');
 assert.deepEqual(polynomial(external),polynomial(primaryExpression(task.fragment)),task.id+': external equation');
 const externalRoots=source.externalAnswerRaw.replace(/^Ответ:\s*/,'').replace(/\.$/,'')
  .replaceAll('−','-').split(/[;,]/).map(s=>{s=s.trim();assert.match(s,/^-?\d+$/);return BigInt(s);})
  .sort((a,b)=>a<b?-1:a>b?1:0);
 assert.deepEqual(externalRoots,record.answer.split(';').map(s=>BigInt(s.trim().replace('−','-'))),task.id+': external roots');
 assert.ok(source.methodSource?.reviewed&&source.methodSource.steps.length>80);
 assert.ok(record.solution.includes('все действительные')||record.solution.includes('действительные значения'));
}
module.exports={auditPolynomials,checkPolynomials,primaryExpression,polynomial};
