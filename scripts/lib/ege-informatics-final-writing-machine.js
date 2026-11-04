'use strict';
const assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),path=require('node:path');
const {conditionText}=require('../../lib/seo-text');
function model(t){
 if(t.includes('неравенство «ax+b>0»'))return 'inequality';
 if(t.includes('уравнение «ax+b=0»'))return 'equation';
 if(t.includes('трех лучших по среднему баллу'))return 'pupils';
 if(t.includes('порядке уменьшения частоты'))return 'frequency';
 if(t.includes('в ближайшие 2 часа'))return 'luggage';
 assert.ok(t.includes('На спутнике «Восход»')&&t.includes('R делится на 26'));return 'satellite';
}
function solve(text,kind){
 const lines=text.trim().split('\n');
 if(kind==='inequality'||kind==='equation'){
  const [a,b]=lines[0].split(/\s+/u).map(Number);
  if(a===0)return kind==='inequality'?(b>0?'любое число':'нет решений'):(b===0?'любое число':'нет решений');
  return 'x '+(kind==='equation'?'=':a>0?'>':'<')+' '+(-b/a);
 }
 if(kind==='frequency'){
  const prefix=text.split('.')[0];assert.ok(/^[a-z]*$/u.test(prefix));const counts=new Map();for(const c of prefix)counts.set(c,(counts.get(c)||0)+1);return [...counts.keys()].sort((a,b)=>counts.get(b)-counts.get(a)||a.localeCompare(b,'en')).join('');
 }
 if(kind==='pupils'){
  const n=Number(lines.shift());assert.equal(lines.length,n);assert.ok(n>=10&&n<=100);
  const rows=lines.map(line=>{const [surname,name,...grades]=line.split(' ');assert.equal(grades.length,3);const nums=grades.map(Number);assert.ok(nums.every(x=>x>=1&&x<=5));return {name:surname+' '+name,sum:nums.reduce((a,b)=>a+b,0)};});
  return rows.filter(r=>rows.filter(x=>x.sum>r.sum).length<3).map(r=>r.name).join('\n');
 }
 if(kind==='luggage'){
  const minute=s=>{const [h,m]=s.split(':').map(Number);assert.ok(h>=0&&h<=23&&m>=0&&m<=59);return 60*h+m;};const now=minute(lines.shift()),n=Number(lines.shift());assert.equal(lines.length,n);assert.ok(n>=3&&n<=1000);
  const r=lines.map((line,i)=>{const [name,time]=line.split(' ');const t=minute(time);return {name,i,time:t<now?t+1440:t};});return r.filter(x=>x.time<=now+120).sort((a,b)=>a.time-b.time||a.i-b.i).map(x=>x.name).join('\n');
 }
 const n=Number(lines.shift());assert.equal(lines.length,n+1);assert.ok(n>=1&&n<=100000);const control=Number(lines.pop()),a=lines.map(Number);assert.ok(a.every(x=>Number.isInteger(x)&&x>0&&x<=1000));let best=0;
 for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){const v=a[i]*a[j];if(v%26===0)best=Math.max(best,v);}
 return (best?'Вычисленное контрольное значение: '+best+'\n':'')+(best>0&&best===control?'Контроль пройден':'Контроль не пройден');
}
function compare(actual,expected,kind){
 if(['inequality','equation'].includes(kind)&&expected.startsWith('x ')){
  const a=actual.split(' '),b=expected.split(' ');assert.equal(a.length,3);assert.deepEqual(a.slice(0,2),b.slice(0,2));assert.ok(Number(a[2])===Number(b[2]));
 }else assert.equal(actual,expected);
}
function compute(task,data){
 const text=conditionText(task.fragment);assert.equal(text,data.condition,'changed condition');const kind=model(text);assert.ok(data.cases.length>=49);
 const rows=JSON.parse(execFileSync('/usr/bin/python3',[path.join(__dirname,'run-final-program.py')],{input:JSON.stringify({code:data.code,inputs:data.cases.map(c=>c.input)}),encoding:'utf8',timeout:30000,maxBuffer:4000000}));assert.equal(rows.length,data.cases.length);
 for(let i=0;i<rows.length;i++){const c=data.cases[i],expected=solve(c.input,kind);compare(c.expected,expected,kind);compare(rows[i].output,expected,kind);assert.equal(rows[i].output,c.actual,'changed executed output');if(kind==='satellite')assert.ok(rows[i].explicitScalarBytes<1024);}
 return {kind,cases:rows.length,scalarBytes:Math.max(...rows.map(r=>r.explicitScalarBytes))};
}
module.exports={model,solve,compare,compute};
