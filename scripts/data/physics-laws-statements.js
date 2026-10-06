const cases=require('./physics-laws-statements-cases.json');
const laws=require('./physics-laws-statements-laws');
const records={};
for(const c of cases){
 const answer=c.claims.flatMap((s,i)=>s.verdict?[i+1]:[]).join('');
 const statements=c.claims.map((s,i)=>`${i+1}) ${s.verdict?'Верно':'Неверно'}. ${laws[s.law][1]}`);
 // Keep the direction of the Coulomb force explicit, in addition to Newton's third law.
 if(c.id==='D92DAA')statements[2]+=' Для точечных неподвижных зарядов обе силы направлены вдоль прямой, соединяющей заряды.';
 if(c.id==='1413DE')statements[2]+=' Поверхность и весь объём проводящего материала имеют один потенциал: перемещение заряда вдоль поверхности не требует работы электростатического поля.';
 const selected=c.claims.flatMap((s,i)=>s.verdict?[String(i+1)]:[]);
 const rejected=c.claims.flatMap((s,i)=>!s.verdict?[String(i+1)]:[]);
 const intro='Проверим каждое утверждение в отдельности. Используем школьные модели, указанные в условии: идеальный газ, точечные заряды, электростатическое равновесие и идеальный колебательный контур там, где это требуется. При сравнении зависимостей остальные параметры считаем неизменными.';
 const check=`Проверка. Верны пункты ${selected.join(', ')}; пункты ${rejected.join(', ')} противоречат приведённым определениям или формулам. Если в одном пункте соединено несколько высказываний, для его выбора должны выполняться все: одного верного фрагмента недостаточно. Записываем номера верных утверждений по возрастанию: ${answer}.`;
 const stages=c.claims.map((s,i)=>[`Пункт ${i+1} — ${s.verdict?'выбираем':'отвергаем'}`,laws[s.law][0]]);
 if(c.id==='1413DE')stages[2][1]='Электростатическое равновесие: φ = const.';
 records[c.id]={...c,answer,title:'Проверка физических утверждений',solution:[intro,...statements,check,`Ответ: ${answer}.`].join('\n\n'),stages,
  diagramCaption:`Проверка пяти утверждений: ${c.claims.map((s,i)=>`${i+1} — ${s.verdict?'верно':'неверно'}`).join('; ')}. Ответ: ${answer}.`};
}
module.exports={records,laws};
