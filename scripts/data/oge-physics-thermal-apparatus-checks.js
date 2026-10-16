const assert=require('node:assert/strict');
const sources=require('./oge-physics-thermal-apparatus-sources.json');
module.exports=prepared=>{
 const rows=new Map(prepared.map(r=>[r.id.slice(7),r]));
 const row=id=>rows.get(id),condition=id=>sources['OGEPHYS'+id].fipiCondition;
 const choices=id=>[...condition(id).matchAll(/(\d)\)\s*([\s\S]*?)(?=\s\d\)|$)/g)];
 const select=(id,re)=>{const found=choices(id).filter(m=>re.test(m[2]));assert.equal(found.length,1);return found[0][1];};
 // Select the actual primary option by physical mechanism, not by external numbering.
 for(const [id,re]of [['4687C5',/^рассеяние света/],['7EE6CB',/^рассеяние световых лучей мелкими капельками воды/]]){
  assert.equal(row(id).answer,select(id,re));assert.match(row(id).solution,/капель жидкой воды/);
 }
 // Readings are independent observations of the original instrument figures.
 for(const [id,low,high,intervals,steps]of [['041346',39,40,10,6],['0737D7',39,40,10,3],['B56AE1',0,10,10,10]]){
  const division=(high-low)/intervals,value=low+steps*division;
  const measured=[...condition(id).matchAll(/(\d)\)\s*\(([\d,]+)\s*±\s*([\d,]+)\)/g)].map(m=>({n:m[1],v:[m[2],m[3]].map(x=>Number(x.replace(',','.')))}));
  const matching=measured.filter(x=>Math.abs(x.v[0]-value)<1e-9&&Math.abs(x.v[1]-division)<1e-9);
  assert.equal(matching.length,1);assert.equal(row(id).answer,matching[0].n);
  assert.ok(sources['OGEPHYS'+id].images.length);assert.match(row(id).solution,/Δt = (?:c = )?/);
 }
 const matching=[
  ['B21EAA',/^превращение внутренней энергии пара/,/^превращение химической энергии/],
  ['11D6E0',/^действие магнитного поля/,/^превращение внутренней энергии/],
  ['39E460',/^зависимость объёма жидкости/,/^уменьшение температуры жидкости при её испарении/],
  ['FF693E',/^электромагнитная индукция/,/^превращение внутренней энергии/],
 ];
 for(const [id,a,b]of matching)assert.equal(row(id).answer,select(id,a)+select(id,b));
 // First law for rapid expansion: work done by gas lowers U without compensating heat.
 for(const work of [5,20,100]){const heat=0,deltaU=heat-work;assert.ok(deltaU<0);assert.ok(deltaU/30<0);}
 const id='E0B4E0';assert.equal(row(id).answer,[/^теплопередача/,/^уменьшается/,/^понизилась/,/^совершает работу/].map(re=>select(id,re)).join(''));
 assert.match(row(id).solution,/без компенсирующего подвода теплоты/);assert.match(row(id).solution,/Q ≈ 0/);assert.match(row(id).solution,/конденсации/);
 assert.equal(Object.keys(sources).length,10);
};
