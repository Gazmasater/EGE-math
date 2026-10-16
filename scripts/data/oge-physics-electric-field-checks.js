const assert=require('node:assert/strict');
const sources=require('./oge-physics-electric-field-sources.json');
module.exports=prepared=>{
 const rows=new Map(prepared.map(r=>[r.id.slice(7),r]));
 const choice=(id,re)=>{
  const all=[...sources['OGEPHYS'+id].fipiCondition.matchAll(/(\d)\)\s*([\s\S]*?)(?=\s\d\)|$)/g)].filter(m=>re.test(m[2]));assert.equal(all.length,1);return all[0][1];
 };
 const oersted='556141';assert.equal(rows.get(oersted).answer,[/^магнитная стрелка/,/^магнитное поле/,/^неподвижные/,/^движущиеся/].map(re=>choice(oersted,re)).join(''));assert.match(rows.get(oersted).solution,/системе отсчёта/);
 for(const [id,positive]of [['E6EE75',true],['D90A32',false]]){
  const deltaElectrons=positive?-10:10,netCharge=-deltaElectrons;
  assert.equal(netCharge>0,positive);
  const expected=[/^проводники/,positive?/^положительный/:/^отрицательный/,/^одноимённые/,positive?/^уменьшится/:/^увеличится/].map(re=>choice(id,re)).join('');
  assert.equal(rows.get(id).answer,expected);assert.match(rows.get(id).solution,/модуля/);
  const initialLeafCharge=2,finalLeafCharge=positive?1:3;
  assert.equal(finalLeafCharge**2>initialLeafCharge**2,!positive);
 }
 const alpha=rows.get('19BA45');
 // Positive Oy is upward. Original upper plate is negative, lower plate positive.
 const Ey=5,qAlpha=2,qElectron=-1;assert.ok(qAlpha*Ey>0);assert.ok(qElectron*Ey<0);
 assert.match(alpha.answer,/вверх.*отрицательно/);assert.match(alpha.solution,/нижняя отклоняющая пластина заряжена положительно, верхняя — отрицательно/);
 assert.match(alpha.solution,/не обязательную точку попадания/);assert.equal(sources.OGEPHYS19BA45.images.length,2);
 assert.equal(Object.keys(sources).length,4);
};
