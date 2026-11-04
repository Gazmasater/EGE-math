'use strict';
const assert=require('node:assert/strict');
const {conditionText,seoPlainText}=require('../../lib/seo-text');
function tokenize(code){
 const text=code.replace(/[–−]/gu,'-'),tokens=[];let at=0;
 while(at<text.length){const s=text.slice(at),m=s.match(/^\s+|^(?:[A-Za-z_]\w*|\d+|\+\+|--|\+=|-=|\*=|<=|>=|==|!=|[{}()[\];,+*\/%<>=-])/u);assert(m,'Unknown token '+s.slice(0,30));at+=m[0].length;if(m[0].trim())tokens.push(m[0]);}
 return tokens;
}
function parse(code){
 const tokens=tokenize(code);let at=0;
 const peek=()=>tokens[at],take=x=>{const t=tokens[at++];if(x)assert.equal(t,x);return t;};
 function atom(){
  if(peek()==='-'){take();return {op:'neg',a:atom()};}
  if(peek()==='('){take();const a=expression();take(')');return a;}
  const t=take();assert(t,'Unexpected end');if(/^\d+$/u.test(t))return {op:'num',value:Number(t)};
  assert(/^[A-Za-z]\w*$/u.test(t));if(peek()==='['){take();const index=expression();take(']');return {op:'array',name:t,index};}return {op:'var',name:t};
 }
 function chain(next,ops){let a=next();while(ops.includes(peek()))a={op:take(),a,b:next()};return a;}
 const product=()=>chain(atom,['*','/','%']),sum=()=>chain(product,['+','-']),expression=()=>chain(sum,['<','>','<=','>=','==','!=']);
 function assignment(){
  if(['++','--'].includes(peek())){const op=take(),target=atom();assert.equal(target.op,'var');return {kind:'assign',target,op,value:null};}
  if(peek()==='int')take();const target=atom();assert(['var','array'].includes(target.op));const op=take();assert(['=','+=','-=','*=','++','--'].includes(op));return {kind:'assign',target,op,value:['++','--'].includes(op)?null:expression()};
 }
 function statement(){
  if(peek()==='{'){take();const nodes=[];while(peek()!=='}'){assert(peek());nodes.push(statement());}take('}');return {kind:'block',nodes};}
  if(peek()==='for'){take();take('(');const start=assignment();take(';');const test=expression();take(';');const step=assignment();take(')');return {kind:'for',start,test,step,body:statement()};}
  if(peek()==='while'){take();take('(');const test=expression();take(')');return {kind:'while',test,body:statement()};}
  if(peek()==='if'){take();take('(');const test=expression();take(')');const yes=statement();let no=null;if(peek()==='else'){take();no=statement();}return {kind:'if',test,yes,no};}
  const node=assignment();take(';');return node;
 }
 const nodes=[];while(at<tokens.length)nodes.push(statement());return {kind:'block',nodes};
}
const copy=x=>JSON.parse(JSON.stringify(x));
function execute(program,initial){
 const env={A:[...initial]},trace=[];let operations=0;
 function get(e){
  if(e.op==='num')return e.value;
  if(e.op==='var'){assert(Object.hasOwn(env,e.name),'Uninitialized '+e.name);return env[e.name];}
  if(e.op==='array'){const a=env[e.name],i=get(e.index);assert(Array.isArray(a)&&Number.isInteger(i)&&i>=0&&i<a.length,'Array index');return a[i];}
  if(e.op==='neg')return -get(e.a);
  const a=get(e.a),b=get(e.b);if(['%','/'].includes(e.op))assert.notEqual(b,0);
  const v={'+':()=>a+b,'-':()=>a-b,'*':()=>a*b,'/':()=>Math.trunc(a/b),'%':()=>a%b,'<':()=>a<b,'>':()=>a>b,'<=':()=>a<=b,'>=':()=>a>=b,'==':()=>a===b,'!=':()=>a!==b}[e.op]();assert(typeof v==='boolean'||Number.isSafeInteger(v));return v;
 }
 function set(e,v){if(e.op==='var')env[e.name]=v;else{const i=get(e.index);assert(i>=0&&i<env[e.name].length);env[e.name][i]=v;}}
 function test(e){return {left:get(e.a),right:get(e.b),value:get(e),op:e.op};}
 function run(n,conditions){
  assert(++operations<10000,'Execution limit');
  if(n.kind==='block'){for(const x of n.nodes)run(x,conditions);return;}
  if(n.kind==='assign'){
   const old=n.op==='='?null:get(n.target),v=n.value?get(n.value):1;set(n.target,{'=':()=>v,'+=':()=>old+v,'-=':()=>old-v,'*=':()=>old*v,'++':()=>old+1,'--':()=>old-1}[n.op]());return;
  }
  if(n.kind==='if'){const c=test(n.test);conditions.push(c);const b=c.value?n.yes:n.no;if(b)run(b,conditions);return;}
  if(n.kind==='for'){
   run(n.start,conditions);while(get(n.test)){const row={kind:'for',variable:n.start.target.name,index:get(n.start.target),before:copy(env),conditions:[]};run(n.body,row.conditions);row.after=copy(env);trace.push(row);run(n.step,conditions);}return;
  }
  assert.equal(n.kind,'while');while(true){const c=test(n.test),row={kind:'while',before:copy(env),conditions:[c]};if(!c.value){row.after=copy(env);row.stopped=true;trace.push(row);break;}run(n.body,row.conditions);row.after=copy(env);trace.push(row);}
 }
 run(program,[]);return {final:env,trace};
}
function read(task){
 const c=conditionText(task.fragment),cells=[...task.fragment.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/giu)].map(m=>seoPlainText(m[1]));
 const cpp=cells.filter(x=>/\b(?:for|while)\s*\(/u.test(x)&&x.includes(';'));assert.equal(cpp.length,1);
 const top=Number(c.match(/индексами от 0 до (\d+)/u)[1]),m=c.match(/Значения элементов равны ([\d, ]+) соответственно/u)||c.match(/в массиве находились числа ([\d, ]+), т\.е\./u);
 let initial;if(m)initial=m[1].split(',').map(Number);else{const a=c.match(/A\[i\] ([\d ]+) Определите/u);assert(a);initial=a[1].trim().split(/\s+/u).map(Number);}
 assert.equal(initial.length,top+1);const variable=c.match(/значение переменной ([scjt])/iu)[1];return {initial,variable,code:cpp[0],program:parse(cpp[0])};
}
module.exports={parse,execute,read};
