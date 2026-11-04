'use strict';
const assert=require('node:assert/strict');
const M=require('./ege-informatics-truth-machine');
const cache=new Map();
function auditTruth(task,record){
 const data=M.source(task),key=JSON.stringify(data);
 if(!cache.has(key))cache.set(key,M.solve(data));
 const s=cache.get(key),answer=s.answer,lines=[];
 assert.equal(record.answer,answer,'answer');
 const show=f=>M.subexpressions(f).expression;
 if(s.kind==='choice'){
  lines.push('Нужно выбрать выражение, совпадающее со всеми указанными строками. Совпадения на одной строке недостаточно.','Перепишем исходный фрагмент в порядке X, Y, Z, F:');
  s.rows.forEach((r,i)=>lines.push(`Строка ${i+1}: ${r.join(' ')}.`));
  s.options.forEach((f,k)=>{
   lines.push(`Вариант ${k+1}: ${show(f)}.`);
   s.rows.forEach((r,i)=>{const sub=f.replace(/[XYZ]/gu,c=>r['XYZ'.indexOf(c)]).split('').join(' ');lines.push(`Подстановка строки ${i+1}: ${sub} = ${s.values[k][i]}; требуется ${r[3]}.`);});
   const wrong=s.values[k].flatMap((v,i)=>v===s.rows[i][3]?[]:[i+1]);
   lines.push(wrong.length?'Не совпадают строки: '+wrong.join(', ')+'. Вариант исключается.':'Совпадают все три значения.');
  });
  lines.push(`Проверка: только вариант ${answer} даёт последовательность значений F: ${s.rows.map(r=>r[3]).join(', ')}.`, 'Все четыре варианта рассмотрены, поэтому выбор однозначен. В ответе указывается номер выражения, а не его запись.');
 }else{
  const t=s.target,sub=M.subexpressions(s.formula);
  assert.ok((sub.op==='∨'&&t===0)||(sub.op==='∧'&&t===1));
  lines.push(`Пустая клетка означает неизвестное значение, а не нуль. Во всех трёх строках требуется F = ${t}, причём строки должны быть различными.`, 'Логическая функция: F = '+sub.expression+'.','1. Найдём все допустимые наборы переменных.',t===0?'Дизъюнкция равна 0, только если каждая её часть равна 0.':'Конъюнкция равна 1, только если каждая её часть равна 1.', 'Поэтому одновременно должны выполняться условия:');
  sub.parts.forEach(p=>lines.push(p.expression+' = '+t+'.'));
  lines.push('Для полной проверки переберём 2⁴ = 16 наборов. В следующих двух строках тройки (x, y, z) идут в порядке 000, 001, 010, 011, 100, 101, 110, 111.');
  for(const w of [0,1])lines.push(`При w = ${w} значения F: ${s.truth.filter(r=>r[0]===w).map(r=>r[4]).join(', ')}.`);
  lines.push('Остаются ровно три набора. Обозначим их A, B, C; внутри каждого набора порядок переменных всегда w, x, y, z:');
  s.valid.forEach((r,i)=>{const d=Object.fromEntries([... 'wxyz'].map((v,j)=>[v,r[j]]));const vals=sub.parts.map(p=>M.evaluate(p.code,d));assert.ok(vals.every(v=>v===t));lines.push(`${'ABC'[i]} = (${r.join('; ')}); значения частей выражения: ${vals.join(', ')}; F = ${t}.`);});
  lines.push('Других подходящих наборов нет: все остальные из 16 дают противоположное значение функции. Значит, три различные строки исходной таблицы — это A, B, C в некотором порядке.','2. Сопоставим наборы строкам и восстановим столбцы.','Сначала сохраним исходные клетки. Знаком «?» обозначен пропуск; порядок: столбцы 1, 2, 3, 4 и F.');
  s.rows.forEach((r,i)=>lines.push(`Исходная строка ${i+1}: ${r.map(c=>c===null?'?':c).join(' ')}.`));
  lines.push('Есть 3 · 2 · 1 = 6 способов расположить A, B, C по строкам. Например, ABC означает: первая строка — A, вторая — B, третья — C. Для каждого способа сравним известные клетки каждого столбца со значениями переменных в этих трёх наборах.','Ниже для столбцов 1, 2, 3, 4 перечислены допустимые буквы. «Нет» означает, что ни одна переменная не подходит. Одну букву нельзя назначить двум столбцам.');
  for(const r of s.roworders)lines.push(r.labels+': ['+r.columns.map(c=>c?[...c].join(', '):'нет').join('; ')+']; '+(r.orders.length?'порядок букв '+r.orders.join(', '):'взаимно однозначного назначения нет')+'.');
  lines.push('Остаётся единственный порядок столбцов: '+[...answer].join(', ')+'.','При нём полная таблица в исходном порядке строк имеет вид:');
  s.completed.forEach((r,i)=>lines.push(`Заполненная строка ${i+1}: ${r.join(' ')}.`));
  lines.push('Проверка: все заданные клетки сохранены; заполненные строки попарно различны. После перестановки столбцов каждая из них совпадает с одним из трёх допустимых наборов A, B, C, поэтому во всех строках получается требуемое F = '+t+'.','Перебраны все шесть порядков трёх различных наборов и все допустимые назначения букв, поэтому другой ответ невозможен. Буквы записываем подряд в порядке столбцов слева направо.');
 }
 lines.push('Ответ: '+answer+'.');
 for(const line of lines)assert.ok(record.solution.split('\n').includes(line),task.id+': missing or corrupted derivation '+line);
 return {answer,kind:s.kind,lines,rejectedEdits:0};
}
module.exports={auditTruth};
