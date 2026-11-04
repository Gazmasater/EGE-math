'use strict';const assert=require('node:assert/strict'),path=require('node:path'),{execFileSync}=require('node:child_process');const {conditionText}=require('../../lib/seo-text');
function model(text){
 const n=Number(text.match(/(?:из |размером )(20|30) элементов/u)[1]),signed=/[–−-]\s?10 000/u.test(text);const m={n,signed};
 if(text.startsWith('Опишите'))m.kind=text.includes('суммы произведений')?'pair-sum-products':text.includes('произведение которых')?'pair-max-product':'pair-max-sum';
 else if(text.includes('оба числа являются чётными'))m.kind='pair-count-even';
 else{
  m.kind=text.includes('а затем')?'transform':'aggregate';const first=text.split('а затем')[0].split('Исходные данные')[0];m.aggregate=first.includes('количество элементов')?'count':first.includes('сумму элементов')?'sum':first.includes('минимум')?'min':'max';m.operation=text.includes('а затем увеличивает')?'add':'replace';const ps=[];let a;
  if((a=first.match(/(не меньших|не больших|больших|меньших) (\d+)/u)))ps.push({kind:'bound',comparison:{'не меньших':'>=','не больших':'<=','больших':'>','меньших':'<'}[a[1]],value:Number(a[2])});
  if((a=first.match(/(?:не делящихся нацело на|НЕ делятся на|НЕ делится на|не кратных) (\d+)/u)))ps.push({kind:'mod',comparison:'!=',value:Number(a[1]),remainder:0});
  else if((a=first.match(/(?:кратных|делящихся нацело на) (\d+)/u)))ps.push({kind:'mod',comparison:'==',value:Number(a[1]),remainder:0});
  else if(first.includes('нечётное значение'))ps.push({kind:'mod',comparison:'!=',value:2,remainder:0});
  else if(first.includes('чётное значение'))ps.push({kind:'mod',comparison:'==',value:2,remainder:0});
  else {assert.ok(first.includes('оканчивающихся на 0'));ps.push({kind:'mod',comparison:'==',value:10,remainder:0});}
  m.predicates=ps;
 }
 m.testLower=signed||m.kind.startsWith('pair-max')||m.kind==='pair-sum-products'?-10000:text.includes('натуральные')?1:0;m.testUpper=10000;return m;
}
function selected(x,ps){return ps.every(p=>{const a=p.kind==='mod'?x%p.value:x,b=p.kind==='mod'?p.remainder:p.value;return {'>':a>b,'>=':a>=b,'<':a<b,'<=':a<=b,'==':a===b,'!=':a!==b}[p.comparison];});}
function solve(a,m){
 const kind=m.kind;
 if(kind==='pair-sum-products'){assert.equal(a.length%2,0);let s=0;for(let i=0;i<a.length;i+=2)s+=a[i]*a[i+1];return [s];}
 if(kind==='pair-count-even'){let count=0;for(let i=1;i<a.length;i++)if(a[i-1]%2===0&&a[i]%2===0)count++;return [count];}
 if(kind.startsWith('pair-max')){const values=a.slice(1).map((x,i)=>kind.endsWith('product')?a[i]*x:a[i]+x);return [values.indexOf(Math.max(...values))+1];}
 const chosen=a.filter(x=>selected(x,m.predicates));if(['min','max'].includes(m.aggregate)||kind==='transform')assert.ok(chosen.length,'guaranteed selection');
 const value={min:()=>Math.min(...chosen),max:()=>Math.max(...chosen),count:()=>chosen.length,sum:()=>chosen.reduce((s,x)=>s+x,0)}[m.aggregate]();
 return kind==='aggregate'?[value]:a.map(x=>selected(x,m.predicates)?m.operation==='add'?x+value:value:x);
}
function compute(task,data){
 const text=conditionText(task.fragment);assert.equal(text,data.condition,'changed condition');const m=model(text),saved={...data.model};delete saved.id;delete saved.condition;delete saved.sourceHash;assert.deepEqual(m,saved,'condition-derived model');assert.ok(data.cases.length>=100);
 const inputs=data.cases.map(c=>c.input);for(const a of inputs)assert.ok(a.length>=2&&a.length<=m.n&&a.every(x=>Number.isSafeInteger(x)&&x>=m.testLower&&x<=m.testUpper));
 const actual=JSON.parse(execFileSync('/usr/bin/python3',[path.join(__dirname,'run-informatics-array-fragment.py')],{input:JSON.stringify({code:data.code,inputs}),encoding:'utf8',timeout:30000,maxBuffer:3000000}));assert.equal(actual.length,inputs.length);
 for(let i=0;i<inputs.length;i++){const expected=solve(inputs[i],m);assert.deepEqual(expected,data.cases[i].expected,'independent expected output');assert.deepEqual(actual[i].output,expected,'executed program output');assert.deepEqual(actual[i].array,m.kind==='transform'?expected:inputs[i],'array mutation');}
 return {kind:m.kind,cases:inputs.length,answer:'Фрагмент программы на Python 3 приведён в решении'};
}
module.exports={model,selected,solve,compute};
