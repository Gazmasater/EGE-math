'use strict';
const assert=require('node:assert/strict');
const {seoPlainText}=require('../../lib/seo-text');
function read(t){const cells=[...t.fragment.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/giu)].map(x=>seoPlainText(x[1]));const code=cells.filter(x=>/\bvar\b/iu.test(x)&&/\bbegin\b/iu.test(x)&&/\bend\./iu.test(x));assert.equal(code.length,1,t.id);if(t.id==='EGEINF733329'){assert.match(code[0],/Q := 6 L := 0/u);return code[0].replace('Q := 6 L := 0','Q := 6; L := 0');}return code[0];}
function parse(raw){
 const code=raw.replace(/[–−]/gu,'-').replace(/\{[^}]*\}/gu,'').toLowerCase();const ts=[];let pos=0;
 while(pos<code.length){const m=code.slice(pos).match(/^\s+|^(?:[a-z_]\w*|\d+|:=|<=|>=|<>|[()\[\];:,.+*<>=-])/u);assert(m,code.slice(pos,pos+60));pos+=m[0].length;if(m[0].trim())ts.push(m[0]);}
 let at=0;const peek=()=>ts[at],take=x=>{const v=ts[at++];if(x)assert.equal(v,x,ts.slice(at-3,at+5).join(' '));return v;};
 function atom(){if(peek()==='-'){take();return {op:'neg',a:atom()};}if(peek()==='('){take();const a=expr();take(')');return a;}const t=take();assert(t);if(/^\d+$/u.test(t))return {op:'num',n:Number(t)};assert(/^[a-z_]\w*$/u.test(t));if(peek()==='('){take();const args=[];if(peek()!==')'){args.push(expr());while(peek()===','){take();args.push(expr());}}take(')');return {op:'call',name:t,args};}return {op:'var',name:t};}
 function chain(next,ops){let a=next();while(ops.includes(peek()))a={op:take(),a,b:next()};return a;}
 const product=()=>chain(atom,['*','div','mod']),sum=()=>chain(product,['+','-']),cmp=()=>chain(sum,['<','>','<=','>=','=','<>']),and=()=>chain(cmp,['and']),expr=()=>chain(and,['or']);
 function statement(){
  if(peek()==='begin'){take();const nodes=[];while(peek()!=='end'){nodes.push(statement());if(peek()===';')take();else assert.equal(peek(),'end');}take('end');return {kind:'block',nodes};}
  if(peek()==='while'){take();const test=expr();take('do');return {kind:'while',test,body:statement()};}
  if(peek()==='for'){take();const variable=take();take(':=');const low=expr();take('to');const high=expr();take('do');return {kind:'for',variable,low,high,body:statement()};}
  if(peek()==='if'){take();const test=expr();take('then');const yes=statement();let no=null;if(peek()==='else'){take();no=statement();}return {kind:'if',test,yes,no};}
  const name=take();if(['readln','read','writeln','write'].includes(name)){take('(');const args=[expr()];while(peek()===','){take();args.push(expr());}take(')');return {kind:name.startsWith('read')?'input':'output',args};}
  take(':=');return {kind:'assign',name,value:expr()};
 }
 const functions={};if(peek()==='var'){take();while(!['begin','function'].includes(peek())){assert(peek());take();}}
 while(peek()==='function'){take();const name=take();take('(');const variable=take();take(':');assert(['integer','longint'].includes(take()));take(')');take(':');assert(['integer','longint'].includes(take()));take(';');const body=statement();take(';');functions[name]={variable,body};}
 const body=statement();take('.');assert.equal(at,ts.length);return {functions,body};
}
function execute(program,input,record=true){let steps=0,loop=0;const env={},output=[],trace=[];
 function get(n,e){if(n.op==='num')return n.n;if(n.op==='var'){assert(Object.hasOwn(e,n.name),'uninitialized '+n.name);return e[n.name];}if(n.op==='neg')return -get(n.a,e);if(n.op==='call'){const args=n.args.map(x=>get(x,e));if(n.name==='abs'){assert.equal(args.length,1);return Math.abs(args[0]);}const f=program.functions[n.name];assert(f);assert.equal(args.length,1);const local={[f.variable]:args[0]};run(f.body,local);return local[n.name];}
  const a=get(n.a,e);if(n.op==='and'&&!a)return false;if(n.op==='or'&&a)return true;const b=get(n.b,e);if(['div','mod'].includes(n.op))assert.notEqual(b,0);const value={'+':()=>a+b,'-':()=>a-b,'*':()=>a*b,'div':()=>Math.trunc(a/b),'mod':()=>a%b,'<':()=>a<b,'>':()=>a>b,'<=':()=>a<=b,'>=':()=>a>=b,'=':()=>a===b,'<>':()=>a!==b,'and':()=>Boolean(a&&b),'or':()=>Boolean(a||b)}[n.op]();assert(typeof value==='boolean'||Number.isSafeInteger(value));return value;}
 function run(n,e){assert(++steps<100000,'step limit');if(n.kind==='block'){for(const x of n.nodes)run(x,e);return;}if(n.kind==='assign'){e[n.name]=get(n.value,e);return;}if(n.kind==='input'){assert.equal(n.args.length,1);assert.equal(n.args[0].op,'var');e[n.args[0].name]=input;return;}if(n.kind==='output'){output.push(...n.args.map(x=>get(x,e)));return;}if(n.kind==='if'){const yes=get(n.test,e);if(yes)run(n.yes,e);else if(n.no)run(n.no,e);return;}if(n.kind==='while'){const index=loop++;while(true){const before={...e},value=get(n.test,e);if(value)run(n.body,e);if(record)trace.push({loop:index,before,value,after:{...e},...(!value?{stopped:true}:{})});if(!value)break;}return;}assert.equal(n.kind,'for');const lo=get(n.low,e),hi=get(n.high,e);for(let i=lo;i<=hi;i++){e[n.variable]=i;const before={...e};run(n.body,e);if(record)trace.push({for:n.variable,index:i,before,after:{...e}});}}
 run(program.body,env);return {output,trace,final:env};
}
module.exports={read,parse,execute};

const {conditionText}=require('../../lib/seo-text');
const lower=o=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k.toLowerCase(),v]));
function numeric(n,e){if(n.op==='num')return n.n;if(n.op==='var')return e[n.name];if(n.op==='neg')return -numeric(n.a,e);const a=numeric(n.a,e),b=numeric(n.b,e);return {'+':()=>a+b,'-':()=>a-b,'*':()=>a*b,'div':()=>Math.trunc(a/b),'mod':()=>a%b}[n.op]();}
function affine(n,e){if(n.op==='num')return [0,n.n];if(n.op==='var')return e[n.name];if(n.op==='neg')return affine(n.a,e).map(v=>-v);const [a,b]=affine(n.a,e),[c,d]=affine(n.b,e);if(n.op==='+')return [a+c,b+d];if(n.op==='-')return [a-c,b-d];if(n.op==='*'){assert.equal(a*c,0);return [a*d+b*c,b*d];}assert.equal(n.op,'div');assert.equal(a,0);assert.equal(c,0);return [0,Math.trunc(b/d)];}
function inputBounds(program,data){
 const nodes=program.body.nodes,loop=nodes.find(n=>n.kind==='while'),first=data.trace[0].before,e=Object.fromEntries(Object.entries(lower(first)).map(([k,v])=>[k,[0,v]]));e.s=[1,0];
 assert.equal(loop.test.a.op,'var');assert.equal(loop.test.a.name,'s');assert.equal(loop.test.b.op,'num');const h=loop.test.b.n;let low=-Infinity,high=Infinity;
 const opposites={'<':'>=','<=':'>','>':'<=','>=':'<'};
 for(let j=0;j<=data.iterations;j++){
  assert.deepEqual(e.s.slice(0,1),[1]);const offset=e.s[1],op=j===data.iterations?opposites[loop.test.op]:loop.test.op;
  if(op==='<')high=Math.min(high,h-offset-1);else if(op==='<=')high=Math.min(high,h-offset);else if(op==='>')low=Math.max(low,h-offset+1);else {assert.equal(op,'>=');low=Math.max(low,h-offset);}
  if(j===data.iterations)break;
  for(const node of loop.body.nodes){assert.equal(node.kind,'assign');e[node.name]=affine(node.value,e);}
  assert.equal(e.n[0],0);if(j<data.iterations-1)assert.notEqual(e.n[1],data.output[0]);
 }
 assert.equal(e.n[1],data.output[0]);assert(Number.isFinite(low)&&Number.isFinite(high)&&low<=high);
 const transforms=nodes.slice(0,nodes.indexOf(loop)).filter(n=>n.kind==='assign'&&n.name==='s');let divisor=1,shift=0;
 if(transforms.length){assert.equal(transforms.length,1);const v=transforms[0].value;assert.equal(v.op,'div');assert.equal(v.b.op,'num');divisor=v.b.n;assert(divisor>0);const [a,b]=affine(v.a,{s:[1,0]});assert.equal(a,1);shift=b;}
 return [divisor*low-shift,divisor*(high+1)-1-shift];
}
function computeProgram(task,data){
 const source=conditionText(task.fragment),code=read(task),p=parse(code),result=execute(p,data.kind==='fixed'?undefined:Number(data.answer));
 assert.deepEqual(result.output,data.output,'source-derived outputs');assert.deepEqual(result.final,lower(data.final),'final state');assert.equal(result.trace.length,data.trace.length);
 for(let i=0;i<result.trace.length;i++){const a=result.trace[i],b=data.trace[i];assert.deepEqual(a.before,lower(b.before),'trace before');assert.deepEqual(a.after,lower(b.after),'trace after');if('value'in a)assert.equal(a.value,b.value);if('index'in a)assert.equal(a.index,b.index);}
 if(data.kind==='fixed')return String(result.output[0]);
 if(data.kind==='input-iterations'){
  assert.equal(data.output[0],Number(source.match(/выведет число (\d+)/u)[1]));const bounds=inputBounds(p,data);assert.deepEqual(bounds,data.bounds);return String(source.includes('наименьшем')?bounds[0]:bounds[1]);
 }
 if(data.kind==='same-output'){
  const given=Number(source.match(/k = (\d+)/u)[1]);assert.equal(given,data.given);const value=execute(p,given,false).output[0];assert.deepEqual(data.output,[value]);const compact=code.toLowerCase().replace(/\s/gu,''),f=p.functions.f,evalF=n=>numeric(f.body.nodes.find(x=>x.kind==='assign').value,{n});let bounds;
  if(/f:=n\*n-\d+/u.test(compact)){assert(value>0);bounds=[evalF(value),evalF(value+1)-1];}
  else{assert(compact.includes('f:=n*n*n'));assert(/g:=2\*n\+\d+/u.test(compact));const g=p.functions.g,expr=g.body.nodes.find(x=>x.kind==='assign').value,c=numeric(expr,{n:0}),a=numeric(expr,{n:1})-c;assert.equal(a,2);bounds=[Math.floor((evalF(value-1)-c)/a)+1,Math.floor((evalF(value)-c)/a)];}
  assert.deepEqual(bounds,data.bounds);return String(source.includes('наименьшем')?bounds[0]:bounds[1]);
 }
 const compact=code.toLowerCase().replace(/\s/gu,''),pair=source.match(/сначала (\d+), а потом (\d+)/u);let target,low,high;
 if(pair){target=pair.slice(1).map(Number);assert.deepEqual(target,data.target);}
 if(data.kind==='digit-count'){const base=Number(compact.match(/x:=xdiv(\d+)/u)[1]);assert(compact.includes('m:=m+1'));low=base**(target[1]-1);high=base**target[1]-1;}
 else if(data.kind==='digit-sum-product'){const base=Number(compact.match(/x:=xdiv(\d+)/u)[1]);assert(compact.includes('p:=p+n'));low=1;high=base**target[1]-1;}
 else if(data.kind==='quotient-remainder'){const q=Number(compact.match(/q:=(\d+)/u)[1]);low=1;high=q*(Math.max(...target)+1)-1;}
 else if(data.kind==='two-loops'){const q=Number(compact.match(/q:=(\d+)/u)[1]),step=Number(compact.match(/p:=(\d+)/u)[1]);assert.equal(step,10);low=101-step*target[0];high=Math.max(100+step,q*(target[1]+1));}
 else if(data.kind==='decimal-count-sum'){low=10**(target[0]-1);high=10**target[0]-1;}
 else if(data.kind==='digit-sum-maximum'){low=1;high=Number(data.answer);assert.equal(data.searchedThrough,high);}
 else{assert.equal(data.kind,'reverse');assert.match(source,/двузначное число/u);assert.match(source,/9/u);low=1;high=999;}
 if(data.kind!=='digit-sum-maximum')assert.deepEqual([low,high],data.domain);
 const good=[];for(let x=low;x<=high;x++){const output=execute(p,x,false).output;const ok=data.kind==='reverse'?10<=output[0]&&output[0]<100&&output[0]%10===9:JSON.stringify(output)===JSON.stringify(target);if(ok)good.push(x);}
 assert.deepEqual(good,data.good,'all admissible inputs');assert(good.length);return String(source.includes('наибольшее')?good.at(-1):good[0]);
}
function sourceOptions(source){return [...source.matchAll(/(?:^|\s)([1-4])\)\s+(.+?)(?=\s+[1-4]\)|$)/gu)].map(m=>[Number(m[1]),m[2].trim()]);}
function computeOther(task,data){
 const source=conditionText(task.fragment);let value;
 if(data.kind==='assignments'){
  const codes=[...task.fragment.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/giu)].map(m=>seoPlainText(m[1])).filter(x=>/^a\s*:=/iu.test(x)&&/;\s*b\s*:=/iu.test(x)&&/\b(?:div|mod)\s+\d/iu.test(x));assert.equal(codes.length,1);const statements=codes[0].replace(/\{[^}]*\}/gu,'').split(';').map(x=>x.trim()).filter(Boolean);assert.equal(statements.length,3);
  const trace=statements.map((x,i)=>{const r=execute(parse('begin '+statements.slice(0,i+1).join(';')+' end.'));return {a:r.final.a,b:r.final.b??null};});assert.deepEqual(trace,data.trace);value=[trace.at(-1).a,trace.at(-1).b];assert.deepEqual(value,data.value);
 }else if(data.kind==='string-extract'){
  const step=Number(source.match(/k\s*:=\s*(\d+)/iu)[1]),word=source.match(/переменной a было\s*‘([^’]+)’/u)[1],prefix=source.match(/b\s*:=\s*‘([^’]+)’/u)[1],suffix=source.match(/b\s*:=\s*Склеить\s*\(b,\s*‘([^’]+)’\)/u)?.[1]||'';assert.match(source,/i\s*:=\s*i\s*[–−-]\s*k/u);assert.match(source,/пока i\s*>\s*0/u);assert.match(source,/c\s*:=\s*Извлечь\s*\(a, i\)/u);let b=prefix,trace=[];for(let i=word.length;i>0;i-=step){const c=word[i-1];b+=c;trace.push({i,c,b});}assert.deepEqual(trace,data.trace);value=b+suffix;assert.equal(value,data.value);
 }else if(data.kind==='string-recursion'){
  assert.match(source,/дважды записывается/u);assert.match(source,/в конец приписывается/u);const n={седьмой:7,восьмой:8,девятой:9}[source.match(/в (седьмой|восьмой|девятой) строке/u)[1]],pos=source.match(/на (\d+)-м месте/u);let word='1';for(let k=2;k<=n;k++)word=word+word+k;assert.equal(word,data.word);value=pos?Number(word[Number(pos[1])-1]):[...word].filter(c=>Number(c)%2===(source.includes('нечетные')?1:0)).length;
 }else{
  assert.equal(data.kind,'flowchart');const a=data.primaryImageReview.transcription;const init=Object.entries(a.initial).map(([k,v])=>k+':='+v).join(';'),body=a.branch?`if ${a.branch} then ${a.yes} else ${a.no}`:a.body.join(';');const code=`begin ${init}; while ${a.stop.replace('=','<>')} do begin ${body} end end.`;const r=execute(parse(code));assert.deepEqual([a.initial,...r.trace.filter(x=>x.value).map(x=>x.after)],data.trace);const variable=source.match(/переменной ([maс]) после/u)[1].replace('с','c');value=r.final[variable];assert.equal(value,data.value);
 }
 if(data.options){const options=sourceOptions(source);assert.deepEqual(options,data.options.map(([i,s])=>[i,s.replace(/\s+/gu,' ').trim()]),'primary answer choices');const valid=options.filter(([i,text])=>Array.isArray(value)?JSON.stringify([...text.matchAll(/\d+/gu)].map(x=>+x[0]))===JSON.stringify(value):typeof value==='number'?Number(text)===value:text.includes(value));assert.equal(valid.length,1);return String(valid[0][0]);}
 return String(value);
}
function auditPrimaryImage(task,source,root){
 const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto'),review=source.primaryImageReview;assert(review?.reviewed);const urls=[...task.fragment.split('КЭС:')[0].matchAll(/<img\b[^>]*src="([^"]+)"/gu)].map(m=>m[1]);assert.equal(urls.length,1);assert.deepEqual(review.files.map(x=>x.src),urls);
 for(const file of review.files){assert(file.src.startsWith('/fipi/ege-informatics/'));const local=path.resolve(root,'fipi-assets',decodeURIComponent(file.src.slice('/fipi/'.length)));assert(local.startsWith(path.resolve(root,'fipi-assets/ege-informatics')+path.sep));assert.equal(createHash('sha256').update(fs.readFileSync(local)).digest('hex'),file.sha256,'changed source flowchart');}
}
module.exports={read,parse,execute,compute:(task,data)=>data.python?computeProgram(task,data):computeOther(task,data),auditPrimaryImage};
