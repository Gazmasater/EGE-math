'use strict';
const assert=require('node:assert/strict');

function runs(s){const a=[];for(const c of s){if(a.length&&a.at(-1)[0]===c)a.at(-1)[1]++;else a.push([c,1]);}return a;}
function find(a,p){
 for(let i=0;i<a.length;i++){
  if(a[i][0]!==p[0][0]||a[i][1]<p[0][1])continue;
  if(p.length===1)return [i,0,i,p[0][1]];
  let ok=true;for(let j=1;j<p.length;j++){const b=a[i+j],q=p[j];if(!b||b[0]!==q[0]||(j===p.length-1?b[1]<q[1]:b[1]!==q[1])){ok=false;break;}}
  if(ok)return [i,a[i][1]-p[0][1],i+p.length-1,p.at(-1)[1]];
 }
 return null;
}
function replace(a,p,b){const hit=find(a,p);if(!hit)return a;const [i,off,j,end]=hit;
 const pieces=[...a.slice(0,i),...(off?[[a[i][0],off]]:[]),...b,...(a[j][1]>end?[[a[j][0],a[j][1]-end]]:[]),...a.slice(j+1)],out=[];
 for(const [c,n] of pieces){if(out.length&&out.at(-1)[0]===c)out.at(-1)[1]+=n;else out.push([c,n]);}return out;
}
function compile(condition){
 let s=condition.slice(condition.indexOf('НАЧАЛО'));s=s.slice(0,s.indexOf('КОНЕЦ ПОКА КОНЕЦ')+'КОНЕЦ ПОКА КОНЕЦ'.length);
 const first=s.indexOf('ЕСЛИ'),guard=[...s.slice(0,first).matchAll(/нашлось\s*\(([>\d]+)\)/g)].map(m=>runs(m[1]));assert(guard.length);
 const body=s.slice(first,s.indexOf('КОНЕЦ ПОКА'));
 const re=/ЕСЛИ\s+нашлось\s*\(([>\d]+)\)\s+ТО|заменить\s*\(([>\d]+),\s*([>\d]+)\)|ИНАЧЕ|КОНЕЦ ЕСЛИ/g;
 const code=[],stack=[];let last=0;
 for(const m of body.matchAll(re)){
  assert(!body.slice(last,m.index).trim());last=m.index+m[0].length;
  if(m[1]){stack.push({test:code.length});code.push({op:'test',p:runs(m[1]),jump:null});}
  else if(m[2])code.push({op:'replace',p:runs(m[2]),to:runs(m[3])});
  else if(m[0]==='ИНАЧЕ'){const frame=stack.at(-1);assert(frame&&frame.skip===undefined);frame.skip=code.length;code.push({op:'jump',jump:null});code[frame.test].jump=code.length;}
  else{const frame=stack.pop();assert(frame);code[frame.skip??frame.test].jump=code.length;}
 }
 assert(!body.slice(last).trim());assert(!stack.length);return {guard,code};
}
function execute(program,initial,details=false){let a=runs(initial),cycles=0;const trace=details?[initial]:null,counts={};
 while(program.guard.some(p=>find(a,p))){
  let pc=0;
  while(pc<program.code.length){const c=program.code[pc];if(c.op==='test')pc=find(a,c.p)?pc+1:c.jump;else if(c.op==='jump')pc=c.jump;else{if(details&&find(a,c.p)){const key=word(c.p)+'→'+word(c.to);counts[key]=(counts[key]||0)+1;}a=replace(a,c.p,c.to);pc++;}}
  assert(++cycles<100000);if(details)trace.push(word(a));
 }
 return {text:a.map(([c,n])=>c.repeat(n)).join(''),sum:a.reduce((s,[c,n])=>s+(c==='>'?0:Number(c)*n),0),cycles,...(details?{trace,counts}:{})};
}
const strip=s=>s.replace(/<[^>]+>/g,'').replace(/&nbsp;|&#160;/g,'').replace(/&lambda;/g,'λ').replace(/\s/g,'');
function turing(task){
 const tables=[...task.fragment.matchAll(/<table\b[^>]*>(?:(?!<table\b)[\s\S])*?<\/table>/gi)].map(m=>[...m[0].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(r=>[...r[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(c=>strip(c[1]))));
 const table=tables.find(t=>JSON.stringify(t[0])===JSON.stringify(['','λ','0','1']));assert(table,task.id);const number=Number(task.condition.match(/представление числа (\d+)/)[1]),initial=number.toString(2),tape=Array(10).fill('λ').concat([...initial],Array(10).fill('λ'));let p=10+initial.length,state='q0',steps=0;const trace=[];
 while(true){const row=table.find(r=>r[0]===state),col=table[0].indexOf(tape[p]);assert(row&&col>0&&row[col]);const [symbol,move,next]=row[col].split(',');trace.push([steps,p-10,state,tape[p],symbol,move,next]);tape[p]=symbol;steps++;if(move==='S')break;p+=move==='L'?-1:1;state=next;assert(steps<1000);}
 const final=tape.join('').replace(/^λ+|λ+$/g,'');assert(!final.includes('λ'));return {answer:String(parseInt(final,2)),final,steps,table,number,initial,trace};
}
function params(task){const s=task.condition;
 if(s.includes('Исполнитель МТ'))return {kind:'turing'};
 if(s.includes('начинающаяся с символа')){const m=s.match(/содержащая (\d+) цифр\w* 1, (\d+) цифр\w* 2 и (\d+) цифр\w* 3/u)||s.match(/содержащая (\d+) цифр[а-я]* 1, (\d+) цифр[а-я]* 2 и (\d+) цифр[а-я]* 3/u);assert(m);return {kind:'marker',counts:m.slice(1).map(Number)};}
 if(s.includes('расположенных в произвольном порядке')){const m=s.match(/по (\d+) цифр (\d), (\d) и (\d)/),p=s.match(/на (\d+)-м, (\d+)-м и (\d+)-м местах/);return {kind:'sorting',counts:m.slice(2).map(d=>[d,Number(m[1])]),positions:p.slice(1).map(Number)};}
 if(s.includes('содержащая n')||s.includes('содержащий n')){const m=s.match(/с цифры «(\d)», а затем содержащ[а-я]+ n цифр «(\d)»/u);assert(m);const u=s.replace(/10 000/g,'10000').match(/n < (\d+)/);let target='sum',digit,value;
  if(s.includes('останутся только')){target='only';digit=s.match(/только цифры «(\d)»/)[1];value=true;}
  else if(s.includes('количество цифр')){target='count';const k=s.match(/количество цифр «(\d)» равно (\d+)/);digit=k[1];value=Number(k[2]);}
  else if(!s.includes('наибольшее'))value=Number(s.match(/равна (\d+)/)[1]);
  return {kind:s.includes('наибольшее')?'max-sum':'min-n',first:m[1],repeat:m[2],upper:u?Number(u[1]):null,target,digit,value};
 }
 const z=s.match(/за которой следуют (\d+) нулей/);if(z)return {kind:'zeros',initial:'1'+'0'.repeat(Number(z[1]))};
 const m=s.match(/из (\d+) идущ[а-я]+ подряд цифр[а-я]* (\d)/u);assert(m,task.id);return {kind:'fixed',initial:m[2].repeat(Number(m[1])),sum:s.includes('Чему равна сумма')};
}

const word=a=>a.map(([c,n])=>c.repeat(n)).join('');
module.exports={compile,execute,turing,params,word,runs,find};
