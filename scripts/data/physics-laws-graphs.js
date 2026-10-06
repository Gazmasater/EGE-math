const assert=require('node:assert/strict');
const cases=require('./physics-laws-graphs-cases.json');
const laws=require('./physics-laws-graphs-laws');
const letters=['А','Б','В'];
const records={};
for(const c of cases){
 const selected=c.terms.map(key=>c.shapes.indexOf(laws[key][0])+1);
 assert.ok(selected.every(n=>n>0),c.id);
 const answer=selected.join('');assert.equal(answer,c.manualAnswer,c.id);
 const intro='Для каждой зависимости считаем неизменными остальные параметры, указанные в условии. Сначала запишем физический закон, затем определим форму графика и его начальное значение. Горизонтальная ось показывает аргумент, вертикальная — зависящую от него величину; в графиках процессов возможна также вертикальная прямая.';
 const steps=c.terms.map((key,i)=>{
  const [shape,x,y,formula,derivation,check]=laws[key];
  return `${letters[i]}) По горизонтальной оси — ${x}, по вертикальной — ${y}. ${derivation} Этой зависимости соответствует график ${selected[i]}.\n\nПроверка пункта ${letters[i]}. ${check}`;
 });
 const final=`Записываем номера в порядке А, Б, В: ${selected.join(', ')}. Номера могут повторяться: разные физические величины способны иметь одинаковую функциональную зависимость. Ответ: ${answer}.`;
 records[c.id]={...c,answer,selected,title:'Законы и виды графиков',solution:[intro,...steps,final].join('\n\n'),
  stages:c.terms.map((key,i)=>[`${letters[i]} — график ${selected[i]}`,`По горизонтали: ${laws[key][1]}; по вертикали: ${laws[key][2]}.`,laws[key][3]]),
  diagramCaption:`Исходные пять графиков ФИПИ сохранены. Соответствие: ${selected.map((n,i)=>letters[i]+' — '+n).join('; ')}. Ответ: ${answer}.`};
}
module.exports={records,laws};
