'use strict';
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {solve}=require('./ege-informatics-divisor-machine');
const supers=n=>String(n).replace(/\d/gu,d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)]);
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function witness(mask,n){
 const raw=String(n),extra=raw.length-mask.replace('*','').length,qs=[];let pos=0,star;
 for(const c of mask){if(c==='*'){star=raw.slice(pos,pos+extra);pos+=extra;}else if(c==='?')qs.push(raw[pos++]);else assert.equal(raw[pos++],c);}
 assert.equal(pos,raw.length);const out=[];
 if(qs.length)out.push('значения «?» слева направо: '+qs.join(', '));
 if(star!==undefined)out.push('«*» = '+(star===''?'пустая строка':'«'+star+'»'));
 return out.join('; ');
}
function auditDivisors(task,record,source){
 const result=solve(task),{parameters:p,hits,checked,answer,output}=result,s=record.solution,lines=[];
 assert.equal(record.answer,answer,task.id+': answer');
 const has=line=>{assert(s.includes(line),task.id+': Missing or changed proof: '+line);lines.push(...line.split('\n').filter(Boolean));};
 const exact=line=>{assert(s.split('\n').includes(line),task.id+': Missing proof line: '+line);lines.push(line);};
 const kind=p.kind;
 if(kind==='mask'){
  const fixed=p.mask.replace('*','').length,q=[...p.mask].filter(c=>c==='?').length,maxstar=p.exponent-fixed;
  has(`Ищем все натуральные n, удовлетворяющие маске ${p.mask}, ограничению n ≤ 10${supers(p.exponent)} и делимости на ${p.divisor}.`);
  has('Каждый знак «?» заменяется ровно одной десятичной цифрой. Звёздочка допускает пустую строку и строки с нулями в начале: эти нули находятся внутри записи числа и должны сохраняться.');
  has(`Без звёздочки в маске ${fixed} позиций, из них ${q} обозначены знаком «?». Граница 10${supers(p.exponent)} отдельно проверяется по маске и ей не соответствует. Все остальные допустимые числа содержат не более ${p.exponent} цифр.`);
  if(p.mask.includes('*')){
   has(`Поэтому длина замены «*» принимает все целые значения от 0 до ${maxstar}. При длине k имеется 10${supers(q)} · 10ᵏ подстановок.`);
   const counts=Array.from({length:maxstar+1},(_,k)=>10**(q+k));assert.equal(counts.reduce((a,b)=>a+b),checked);
   has('Общее число подстановок: '+counts.join(' + ')+` = ${checked}.`);
  }else has(`Звёздочки нет, поэтому перебираем 10${supers(q)} = ${checked} подстановок.`);
  has('Первый символ маски — фиксированная ненулевая цифра. Подстановки дают натуральные числа без ведущего нуля; различные наборы замен дают разные записи. Перебор длин и всех цифр охватывает каждое допустимое число.');
  has(`Для каждого кандидата вычисляем частное и остаток при делении на ${p.divisor}. Оставляем ровно те числа, у которых остаток равен нулю, затем упорядочиваем их по числовому значению.`);
  has('Найденные числа и проверка каждой строки:');
  for(const h of hits){has(`n = ${h.n}: ${witness(p.mask,h.n)}.`);has(`${p.divisor} · ${h.value} = ${h.n}; остаток 0.`);}
  has(`Проверены все ${checked} подстановок и отдельно верхняя граница; найдено ${hits.length} подходящих чисел. Других замен маски в допустимом диапазоне нет.`);
 }else{
  has(`Требуются первые пять чисел, строго больших ${p.start}. Начинаем с ${p.start+1} и рассматриваем целые n подряд в порядке возрастания.`);
  if(kind==='prime-extremes'){
   has('Разложим n на простые множители. Каждый простой делитель записываем один раз, независимо от степени. Само n исключаем: если n простое, допустимых простых делителей нет и M = 0.');
   has('Пусть p — наименьший, q — наибольший из оставшихся простых делителей. Тогда M = p + q. Если простой делитель только один, минимум и максимум совпадают, поэтому M равняется удвоенному делителю; такой случай нельзя отбрасывать.');
   has('При разложении последовательно делим остаток на каждый найденный простой множитель до исчезновения его степени. Если после проверки всех p с p² ≤ остатку остаётся число больше 1, оно простое: составное число обязательно имело бы делитель не больше своего квадратного корня.');
   if(p.test==='square')has(`Проверяем строгое ограничение M больше ${p.threshold}. Для целого r = ⌊√M⌋ число M является полным квадратом тогда и только тогда, когда r² = M.`);
   else if(p.test==='palindrome')has(`После проверки M больше ${p.threshold} сравниваем десятичную запись M с той же записью в обратном порядке. Равенство этих строк в точности означает палиндром.`);
   else if(p.test==='suffix-count')has('Окончание 63 означает остаток 63 при делении M на 100. Пусть k — количество различных простых делителей n; дополнительно нужен нулевой остаток при делении M на k. Для простого n значение M = 0 не проходит проверку окончания.');
   else{
    has(`Проверяем три условия одновременно: M больше ${p.threshold}, M простое, запись M содержит «${p.pattern}» ровно один раз. Простоту проверяем отсутствием простого делителя от 2 до ⌊√M⌋.`);
    has('Здесь M простое и больше 2, значит оно нечётное. Сумма двух нечётных простых чётна, поэтому наименьший простой делитель подходящего n равен 2. Это дополнительно проверяет все найденные строки. Перебор программы всё равно включает и чётные, и нечётные n.');
   }
   for(const h of hits){
    const ps=h.primeDivisors,m=h.value;
    has(`n = ${h.n} = `+h.factors.map(([q,k])=>q+(k===1?'':supers(k))).join(' · ')+'.');
    has('Различные простые делители: '+ps.join(', ')+'.');has(`M = ${ps[0]} + ${ps.at(-1)} = ${m}.`);
    if(p.test==='square')has(`${m} больше ${p.threshold}; ${h.root}² = ${m}.`);
    else if(p.test==='palindrome')has(`${m} больше ${p.threshold}; прямая запись «${m}» совпадает с обратной «${[...String(m)].reverse().join('')}».`);
    else if(p.test==='suffix-count')has(`${m} = 100 · ${Math.floor(m/100)} + 63; k = ${ps.length}; ${m} = ${ps.length} · ${m/ps.length}.`);
    else{assert.equal(ps[0],2);has(`${m} больше ${p.threshold}; «${p.pattern}» встречается ровно один раз. Среди простых чисел от 2 до ${Math.floor(Math.sqrt(m))} делителей M нет, поэтому M простое.`);}
   }
   assert(hits.at(-1).n<10**10);
   has('В программе решето строит простые числа до 100000. Перебор ограничен сверху 10¹⁰, чей квадратный корень равен 100000, поэтому списка достаточно для полного разложения каждого проверяемого n и проверки простоты M. Ниже показано, что все пять результатов найдены раньше этой границы; после пятого программа сразу завершается.');
  }else{
   has('Для каждого целого d от 2 до ⌊√n⌋ проверяем остаток при делении n на d. При нулевом остатке добавляем d и парный делитель ⟦n¦d⟧. Множество устраняет повторение в случае d² = n.');
   has('Это полный список делителей без 1 и n: в любой паре сомножителей хотя бы один не больше √n. Поэтому каждую пару находим, в том числе пары с большим вторым делителем.');
   if(kind==='extremes'){
    has('Если список пуст, M = 0. Иначе берём его минимум p и максимум q, получаем M = p + q. Дополнительная проверка: q = ⟦n¦p⟧, поскольку при увеличении положительного делителя парный сомножитель уменьшается. Для квадрата простого числа минимум и максимум равны и складываются дважды.');
    has(`Требуемое условие: остаток от деления M на ${p.mod} равен ${p.remainder}.`);
    for(const h of hits){has(`n = ${h.n}: минимальный делитель ${h.minimum}, максимальный ${h.maximum}; ${h.minimum} · ${h.maximum} = ${h.n}.`);has(`M = ${h.minimum} + ${h.maximum} = ${h.value}; ${h.value} = ${p.mod} · ${Math.floor(h.value/p.mod)} + ${p.remainder}.`);}
   }else if(kind==='ending-divisor'){
    has(`Из полного списка оставляем делители с остатком ${p.digit} при делении на 10 и исключаем само число ${p.digit}. Число n уже исключено при построении списка. Если подходящих делителей несколько, нужен наименьший, а не первый найденный парный сомножитель.`);
    for(const h of hits){const d=h.value;has(`n = ${h.n}: все разрешённые делители — `+h.eligible.join(', ')+'.');has(`Минимум равен ${d}; ${d} · ${h.n/d} = ${h.n}; ${d} = 10 · ${Math.floor(d/10)} + ${p.digit}.`);has(`${d} отличается от ${p.digit} и от ${h.n}.`);}
   }else{
    has(p.includeEnds?'В сумму R входят все различные делители, включая 1 и n. Поэтому к списку нетривиальных делителей добавляем эти два числа.':'В сумму R входят только различные делители без 1 и n. Каждый элемент найденного множества учитываем ровно один раз.');
    has(`Проверяем, что остаток от деления R на 10 равен ${p.digit}.`);
    for(const h of hits){has(`n = ${h.n}.`);has('R = '+h.selected.join(' + ')+` = ${h.value}.`);has(`${h.value} = 10 · ${Math.floor(h.value/10)} + ${p.digit}.`);}
   }
  }
  has(`Полный последовательный перебор от ${p.start+1} до ${hits.at(-1).n} включительно проверяет ${checked} чисел. Условие выполняется ровно для пяти перечисленных n. Все меньшие допустимые кандидаты проверены, поэтому это именно первые пять чисел.`);
 }
 exact('Проверка результата.');exact('Воспроизводимая программа Python:');
 const blocks=[...s.matchAll(/```python\n([\s\S]+?)\n```/gu)];assert.equal(blocks.length,1,'Program block count');
 const code=blocks[0][1]+'\n';
 // Bind the listing to the independently executed Python program and bind its
 // recorded stdout to the answer recomputed here from the original condition.
 assert.equal(source.programCheck.status,'ok');assert.equal(hash(code),source.programCheck.sha256,'Changed executed program');
 assert.equal(hash(output),source.programCheck.outputSha256,'Program output differs from independent calculation');
 assert.equal(source.programCheck.rows,hits.length);
 lines.push(...code.split('\n').filter(Boolean));
 const label=kind==='mask'?'частное':kind==='divisor-sum'?'R':kind==='ending-divisor'?'делитель':'M';
 exact(`Результат: в каждой строке слева n, справа ${label}.`);
 const table=hits.map(h=>h.n+' — '+h.value);assert.equal((s.match(/^\d+ — \d+$/gmu)||[]).length,hits.length,'Missing or extra output row');
 for(const line of table)exact(line);exact('Ответ: '+answer+'.');
 return {answer,kind,iterations:result.iterations,rows:hits.length,lines};
}
module.exports={auditDivisors,solve};
