'use strict';
const assert=require('node:assert/strict');
const {conditionText}=require('../../lib/seo-text');
const {read,parse,execute}=require('./ege-informatics-array-machine');
const cache=new Map();
const words={'<':'меньше','>':'больше','<=':'не больше','>=':'не меньше','==':'равно'};
function number(e,env){
 if(e.op==='num')return e.value;if(e.op==='var')return env[e.name];if(e.op==='array')return env[e.name][number(e.index,env)];if(e.op==='neg')return -number(e.a,env);
 const a=number(e.a,env),b=number(e.b,env);return {'+':()=>a+b,'-':()=>a-b,'*':()=>a*b,'/':()=>Math.trunc(a/b),'%':()=>a%b}[e.op]();
}
function form(e,env){
 if(e.op==='num')return String(e.value);if(e.op==='var')return env?String(env[e.name]):e.name;
 if(e.op==='array')return env?String(number(e,env)):e.name+'['+form(e.index)+']';if(e.op==='neg')return '−'+form(e.a,env);
 const a=form(e.a,env),b=form(e.b,env);if(e.op==='/')return '⌊⟦'+a+'¦'+b+'⟧⌋';if(e.op==='%')return 'ост('+a+'; '+b+')';
 return a+({'*':' · ','+':' + ','-':' − '}[e.op]||' '+words[e.op]+' ')+b;
}
function assignment(n){const target=form(n.target);return target+' ← '+(n.op==='='?form(n.value):target+({'++':' + ','--':' − ','+=':' + ','-=':' − ','*=':' · '}[n.op])+(n.value?form(n.value):'1'))+'.';}
function nodes(n){return n.kind==='block'?n.nodes:[n];}
function commandLines(n,solution){
 const list=nodes(n),out=[];
 for(let i=0;i<list.length;i++){
  const a=list[i],b=list[i+1],c=list[i+2];
  if(a.kind==='assign'&&a.target.op==='var'&&a.target.name==='t'&&b?.kind==='assign'&&c?.kind==='assign'&&a.op===b.op&&b.op===c.op&&a.op==='='&&c.value.op==='var'&&c.value.name==='t'){
   assert.equal(form(a.value),form(b.target));assert.equal(form(b.value),form(c.target));
   const tuple=form(c.target)+', '+form(b.target)+' ← '+form(b.target)+', '+form(c.target)+'.';
   const reverse=form(b.target)+', '+form(c.target)+' ← '+form(c.target)+', '+form(b.target)+'.';
   if(solution.includes(tuple)){out.push(tuple);i+=2;continue;}
   if(solution.includes(reverse)){out.push(reverse);i+=2;continue;}
  }
  assert.equal(a.kind,'assign');out.push(assignment(a));
 }
 return out;
}
const array=a=>'['+a.join('; ')+']';
const sum=(old,delta,value)=>old+(delta<0?' − '+(-delta):' + '+delta)+' = '+value;
function equation(e,env){const a=form(e),b=form(e,env),v=String(number(e,env));return a+' = '+b+(b===v?'':' = '+v);}
function flatten(n){return n.kind==='block'?n.nodes.flatMap(flatten):[n];}
function solve(task){
 if(cache.has(task.fragment))return cache.get(task.fragment);const c=conditionText(task.fragment);let out;
 if(c.includes('одномерный целочисленный массив A с индексами от 0')){
  const p=read(task),result=execute(p.program,p.initial),top=flatten(p.program),loops=top.filter(n=>['for','while'].includes(n.kind));
  out={...p,...result,top,loops,answer:String(result.final[p.variable]),kind:loops[0].kind==='while'?'while':nodes(loops[0].body)[0].kind==='if'?'branch':'telescoping'};
 }else{
  const options=[...c.matchAll(/([1-4])\)\s*(\d+)/gu)].map(m=>({id:m[1],value:Number(m[2])}));assert.equal(options.length,4);
  if(c.includes('двумерного')){
   const size=c.match(/размера (\d+)×(\d+)/u).slice(1).map(Number);assert.deepEqual(size,[7,7]);assert(c.includes('B[n, k]:=k–n;'));
   const count=size[0]*(size[0]-1)/2;out={kind:'matrix',size,count,answer:options.find(o=>o.value===count).id};
  }else{
   const N=Number(c.match(/A\[1\.\.(\d+)\]/u)[1]);const text=c.replace(/[–−]/gu,'-');
   const a=text.match(/A\[n\]\s*:=\s*([^;]+);/u)[1].replace(/\s/gu,''),b=text.match(/B\[n\]\s*:=\s*(.+?)(?= нц|$)/u)[1].replace(/\s/gu,'');
   let lo,hi,A,B,key;
   if(a==='n+100'&&b==='2*A[n]-500'){key='linear-positive';lo=151;hi=N;A=n=>n+100;B=n=>2*n-300;}
   else if(a==='n-10'&&b==='A[n]*n'){key='quadratic';lo=11;hi=N;A=n=>n-10;B=n=>n*(n-10);}
   else{assert.equal(a,'100-n');assert.equal(b,'2*A[n]+1');key='linear-negative';lo=1;hi=Math.min(N,100);A=n=>100-n;B=n=>201-2*n;}
   const count=hi-lo+1;assert(count>0);for(let n=1;n<=N;n++)assert.equal(B(n)>0,n>=lo&&n<=hi);
   out={kind:'formula',N,key,lo,hi,A,B,count,answer:options.find(o=>o.value===count).id};
  }
 }
 cache.set(task.fragment,out);return out;
}
function auditArrays(task,record){
 const p=solve(task),s=record.solution,lines=[];assert.equal(record.answer,p.answer,task.id+': answer');
 const has=line=>{assert(s.includes(line),task.id+': Missing or changed proof: '+line);lines.push(...line.split('\n'));};
 if(['branch','while','telescoping'].includes(p.kind)){
  has('Индексы массива идут от 0 до '+(p.initial.length-1)+'.');has('A = '+array(p.initial)+'.');has('Нужно найти итоговое значение переменной '+p.variable+'.');
  has('Читаем команды в указанном порядке: каждое следующее действие использует уже изменённые значения.');has('Правая часть присваивания вычисляется до записи результата; знак ← ниже обозначает присваивание.');
  if(p.code.includes('%')){has('Обозначение ост(x; y) означает остаток от деления x на положительное целое y.');has('ост(7; 3) = 1, поскольку 7 = 3 · 2 + 1.');}
  if(p.code.includes('/')){assert(p.trace.every(r=>r.before.A.every(x=>x>0)));has('Скобки ⌊ ⌋ обозначают целую часть частного.');has('Все делимые и делители в этой задаче положительны, поэтому целочисленное деление отбрасывает дробную часть.');}
  const initial=p.top.filter(n=>n.kind==='assign');for(const n of initial)has((p.kind==='while'&&n===p.top.at(-1)&&p.variable==='t'?'После циклов: ':'Начальная команда: ')+assignment(n));
  if(p.kind==='telescoping'){
   const N=p.initial.length-1;assert.equal(p.trace.length,N);assert.deepEqual(p.trace.map(r=>r.index),Array.from({length:N},(_,i)=>i));assert.deepEqual(p.final.A,p.initial);
   has('Цикл перебирает i от 0 до '+(N-1)+' включительно.');has('На каждом проходе прибавляется разность A[i] − A[i + 1]. Сам массив не меняется.');
   has('s = (A[0] − A[1]) + (A[1] − A[2]) + … + (A['+(N-1)+'] − A['+N+']).');
   has('Каждый внутренний элемент A[1], …, A['+(N-1)+'] встречается один раз со знаком минус и один раз со знаком плюс.');
   has('s = A[0] − A['+N+'] = '+p.initial[0]+' − '+p.initial.at(-1)+' = '+p.answer+'.');
   for(const r of p.trace){const i=r.index,delta=p.initial[i]-p.initial[i+1];has('i = '+i+': прибавляем '+p.initial[i]+' − '+p.initial[i+1]+' = '+delta+'; s = '+sum(r.before.s,delta,r.after.s)+'.');}
   has('Выполнено '+N+' проходов, последний использует A['+(N-1)+'] и A['+N+'].');
  }else{
   let tests=[];
   if(p.kind==='branch'){
    assert.equal(p.loops.length,1);const loop=p.loops[0],branch=nodes(loop.body)[0];assert.equal(branch.kind,'if');tests=p.trace.map(()=>branch.test);
    has('Цикл перебирает '+p.trace[0].variable+' от '+p.trace[0].index+' до '+p.trace.at(-1).index+' включительно; число проходов — '+p.trace.length+'.');
    has('Проверяем условие: '+form(branch.test)+'. Если оно верно, выполняем по порядку:\n'+commandLines(branch.yes,s).join('\n'));
    if(branch.no)has('Если условие неверно, выполняем:\n'+commandLines(branch.no,s).join('\n'));
    else has('Если условие неверно, тело ветвления пропускается: массив и накопитель на этом проходе не меняются.');
   }else{
    for(const [i,loop] of p.loops.entries())has('Цикл '+(i+1)+': пока '+form(loop.test)+', выполняем:\n'+commandLines(loop.body,s).join('\n'));
    let j=0;for(const r of p.trace){tests.push(p.loops[j].test);if(r.stopped)j++;}assert.equal(j,p.loops.length);
    has('Отдельно показываем последнюю, уже ложную проверку каждого цикла: именно она завершает цикл.');
   }
   const traceStart=s.indexOf('Полная трассировка.'),tail=s.slice(traceStart),labels=[...tail.matchAll(/^(?:[ij] = \d+:|Проверка \d+,)/gmu)];assert.equal(labels.length,p.trace.length,'Missing or extra trace rows');
   for(const [i,r] of p.trace.entries()){
    const e=tests[i],a=r.before,b=r.after,c=r.conditions[0],label=p.kind==='branch'?r.variable+' = '+r.index:'Проверка '+(i+1)+', '+['i','j'].filter(k=>Object.hasOwn(a,k)).map(k=>k+' = '+a[k]).join(', ');
    const row=[label+': '+equation(e.a,a)+'; '+equation(e.b,a)+'.','Условие '+c.left+' '+words[c.op]+' '+c.right+' — '+(c.value?'верно.':'неверно.')];
    if(r.stopped)row.push('Тело цикла не выполняется; переходим к следующей команде программы.');
    else{
     if(['s','c'].includes(p.variable))row.push(p.variable+' = '+sum(a[p.variable],b[p.variable]-a[p.variable],b[p.variable])+'.');
     else row.push('После прохода: '+['i','j'].filter(k=>Object.hasOwn(b,k)).map(k=>k+' = '+b[k]).join(', ')+'.');
     row.push('Текущий массив: '+array(b.A)+'.');
    }
    has(row.join('\n'));
   }
   if(p.kind==='branch'){
    const chosen=p.trace.filter(r=>r.conditions[0].value).map(r=>r.index),deltas=p.trace.map(r=>r.after[p.variable]-r.before[p.variable]);
    has('Проверка: условие выполнено при '+p.trace[0].variable+' = '+chosen.join(', ')+'.');
    has('Сумма всех приращений '+p.variable+': '+deltas.map(x=>x<0?'('+x+')':String(x)).join(' + ')+' = '+p.answer+'.');
    const same=p.trace.every(r=>JSON.stringify([...r.after.A].sort((a,b)=>a-b))===JSON.stringify([...p.initial].sort((a,b)=>a-b)));
    has(same?'Набор чисел и их количества в конечном массиве совпадают с исходными; обмен равных значений тоже выполняется, если условие истинно.':'Ветвь иначе может изменять само значение элемента массива.');
    has('Все '+p.trace.length+' допустимых значений индекса рассмотрены по одному разу.');
   }else{
    has('Проверка: все обращения к массиву были внутри допустимого диапазона; каждая выполненная итерация продвигает индекс в указанном направлении.');
    has('Для каждого цикла найдена ложная проверка, поэтому выполнение останавливается без выхода за границы.');
    if(p.variable==='t')has('После циклов i = '+p.final.i+', j = '+p.final.j+'. Поэтому t = A[i] − A[j] = '+p.final.A[p.final.i]+' − '+p.final.A[p.final.j]+' = '+p.answer+'.');
    else has('Последнее значение индекса: j = '+p.answer+'. Последняя проверка уже ложна, поэтому дальнейшего уменьшения j не происходит.');
   }
  }
 }else if(p.kind==='matrix'){
  has('Два вложенных цикла независимо перебирают n и k от 1 до 7 включительно.');has('всего ячеек 7 · 7 = 49.');has('B[n, k] = k − n.');has('Положительное значение получается тогда и только тогда, когда k больше n.');
  for(let n=1;n<=7;n++){const k=Array.from({length:7-n},(_,i)=>n+1+i);has('n = '+n+': '+(k.length?'k = '+k.join(', '):'подходящих k нет')+'; количество — '+k.length+'.');}
  has('6 + 5 + 4 + 3 + 2 + 1 + 0 = 21.');has('на главной диагонали семь нулей.');has('49 − 7 = 42');has('Их значения k − n и n − k противоположны, поэтому в каждой паре ровно одно значение положительное.');has('⟦42¦2⟧ = 21');has('Значение 21 находится в варианте 3.');
 }else{
  has('Оба цикла перебирают все целые индексы n от 1 до '+p.N+' включительно.');
  if(p.key==='linear-positive'){
   has('A[n] = n + 100.');has('B[n] = 2 · A[n] − 500 = 2 · (n + 100) − 500 = 2n − 300.');has('2n − 300 больше 0.');has('получаем n больше 150.');has('допустимы n от 151 до 200.');has('При n = 150 получается нуль, который не включается.');
  }else if(p.key==='quadratic'){
   has('A[n] = n − 10.');has('B[n] = A[n] · n = (n − 10) · n.');has('Все допустимые n положительны, поэтому знак произведения совпадает со знаком n − 10.');has('при n больше 10.');has('n от 11 до 100.');has('При n = 10 значение равно нулю, а при n от 1 до 9 оно отрицательно.');
  }else{
   has('A[n] = 100 − n.');has('B[n] = 2 · A[n] + 1 = 2 · (100 − n) + 1 = 201 − 2n.');has('201 − 2n больше 0, то есть 2n меньше 201.');has('Для целого n это равносильно n ≤ 100.');has('подходят ровно n от 1 до 100.');has('При n = 101 значение уже отрицательно, а затем только уменьшается.');
  }
  has('Число целых индексов на найденном включительном отрезке: '+p.hi+' − '+p.lo+' + 1 = '+p.count+'.');
  for(const n of [...new Set([1,p.lo-1,p.lo,p.hi,p.hi+1,p.N])].filter(n=>n>=1&&n<=p.N).sort((a,b)=>a-b))has('n = '+n+': A[n] = '+p.A(n)+', B[n] = '+p.B(n)+'.');
  has('Получено '+p.count+' положительных элементов. В условии нужно выбрать номер ответа: это вариант '+p.answer+', в котором записано '+p.count+'.');
 }
 has('Ответ: '+p.answer+'.');return {answer:p.answer,kind:p.kind,iterations:p.trace?.length||0,lines};
}
module.exports={auditArrays,solve};
