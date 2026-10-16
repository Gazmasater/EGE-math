const assert=require('node:assert/strict');
const sources=require('./oge-physics-heat-transfer-sources.json');
module.exports=prepared=>{
 const rows=new Map(prepared.map(r=>[r.id.slice(7),r]));
 const answer=id=>rows.get(id).answer,condition=id=>sources['OGEPHYS'+id].fipiCondition;
 const choices=id=>[...condition(id).matchAll(/(\d)\)\s*([\s\S]*?)(?=\s\d\)|Запишите|$)/g)].map(m=>({number:m[1],text:m[2]}));
 const select=(id,pattern)=>{const found=choices(id).filter(x=>pattern.test(x.text));assert.equal(found.length,1,id+': unique physical explanation');assert.equal(answer(id),found[0].number,id+': original option order');};
 for(const [id,pattern] of [
  ['97E1F4',/^чёрный, так как тепловое излучение/],
  ['8DA7FD',/^грязный снег, так как он поглощает/],
  ['B1A40C',/^Второй брусок нагревается медленнее/],
  ['62F40E',/^Деревянный шарик кажется холоднее, так как его теплопроводность меньше/],
  ['8BFD5D',/^Стальной шарик кажется холоднее, так как его теплопроводность больше/],
  ['FBE7BA',/^В чайнике, накрытом чехлом, чай будет остывать медленнее, так как чехол препятствует/],
  ['AAD1B0',/^Во втором\. Ткань чёрного цвета/],
  ['7B3216',/^Первый термометр показывает более высокую температуру/],
  ['67FA11',/^излучение\s*$/],
  ['450724',/^В чашке из стали, так как сталь обладает более высокой теплопроводностью/],
  ['F1C923',/^Блестящий слой позволяет уменьшить теплопередачу.*посредством излучения/],
  ['548BE8',/^В стакане, накрытом шерстяным шарфом, лёд будет таять медленнее/],
  ['B44462',/^Белого цвета/],
  ['0A683C',/^конвекция\s*$/],
  ['DA333E',/^Из керамической, так как теплопроводность керамики намного меньше/],
  ['CBFB37',/^теплопроводность\s*$/],
  ['754B89',/^Теплопроводность воздуха крайне мала/]
 ]) select(id,pattern);
 // Both original tables have the same order; opposite questions require opposite extrema.
 for(const [id,most] of [['E7CD23',false],['6D62C7',true]]){
  const table=[...condition(id).matchAll(/([1-4]) (Газобетон|Железобетон|Силикатный кирпич|Дерево) (\d+,\d+)/g)].map(m=>({number:m[1],lambda:Number(m[3].replace(',','.'))}));
  assert.equal(table.length,4);const extreme=(most?Math.max:Math.min)(...table.map(x=>x.lambda));
  assert.equal(answer(id),table.find(x=>x.lambda===extreme).number);
  assert.match(condition(id),most?/наибольшего/:/наименьшего/);
 }
 // Encode independently derived physical statements using each ORIGINAL word list.
 for(const [id,words] of [
  ['EEBAAF',['медленнее','теплопроводность','больше','оставаться внизу']],
  ['A19483',['во второй','конвекция','больше','опускаться']],
  ['017869',['теплопередача','меньшую','конвекция','теплопроводность']],
  ['3CFAC1',['низкая','плохой проводник тепла','замедляют','хороший проводник тепла']],
  ['E05E85',['высокая','плохой проводник тепла','замедляют','хороший проводник тепла']]
 ]){
  const dictionary=choices(id);const digits=words.map(word=>{const hit=dictionary.filter(x=>x.text.trim()===word);assert.equal(hit.length,1,id+': '+word);return hit[0].number;}).join('');
  assert.equal(answer(id),digits);
 }
 // Thermal resistance changes the rate, not the final equilibrium temperature or heat-flow direction.
 for(const [id,initial,room] of [['3CFAC1',0,25],['E05E85',85,10]]){
  const temperature=(k,t)=>room+(initial-room)*Math.exp(-k*t);
  const insulated=temperature(.1,2),bare=temperature(.7,2);
  assert.ok(Math.abs(insulated-initial)<Math.abs(bare-initial));
  assert.ok(initial<room?insulated<bare:insulated>bare);
  assert.equal(answer(id)[0],insulated>bare?'1':'2');
  assert.ok(Math.abs(temperature(.1,1000)-room)<1e-12);
 }
 // A simple contact model checks the reversed direction at frost and at 50 degrees.
 const skin=33,effusivity={skin:1200,wood:350,steel:13000};
 const contact=(object,e)=>(effusivity.skin*skin+e*object)/(effusivity.skin+e);
 for(const object of [-15,50]){
  const wood=contact(object,effusivity.wood),steel=contact(object,effusivity.steel);
  assert.ok(Math.abs(steel-skin)>Math.abs(wood-skin));
  assert.ok(object<skin?steel<wood:steel>wood);
 }
 assert.equal(answer('8BFD5D'),'3');assert.equal(answer('62F40E'),'1');
 // Conductive loss through equal slabs is proportional to lambda and inverse thickness.
 const flux=(lambda,thickness,delta)=>lambda*delta/thickness;
 assert.ok(flux(.1,.4,25)<flux(.1,.1,25));
 assert.match(answer('5B430B'),/выше.*меньше/);
 assert.match(rows.get('5B430B').solution,/одинаковыми грунтом/);
 assert.match(rows.get('B5CDC6').solution,/ненасыщенный воздух/);
 assert.match(answer('B5CDC6'),/сухое полотенце/);
 assert.match(rows.get('CD40D0').solution,/вода проводит теплоту лучше воздуха/);
 assert.match(answer('CD40D0'),/Влажная/);
 assert.match(answer('A1B8AC'),/полиэтиленовом пакете/);
 assert.equal(answer('37A7D0'),'Преимущественно излучением.');
 assert.equal(answer('EF3A5F'),'В тихую погоду.');
 // Radiation losses are greater for greater infrared emissivity in the stated kettle model.
 const net=(e,T,room)=>e*(T**4-room**4);
 assert.ok(net(.9,360,295)>net(.2,360,295));
 assert.match(rows.get('97E1F4').solution,/видимый цвет не задаёт однозначно/);
 assert.match(rows.get('AAD1B0').solution,/идеализированное/);
 const incident=100,reflectedBefore=20,reflectedAfter=35;
 assert.ok(reflectedAfter/incident>reflectedBefore/incident);
 assert.match(answer('0FF634'),/альбедо увеличивается/);
 assert.match(rows.get('0FF634').solution,/сульфатные аэрозоли/);
 assert.match(rows.get('0FF634').solution,/поглощающая сажа/);
 assert.equal(sources.OGEPHYS0FF634.discrepancy.status,'resolved');
 assert.match(answer('1B7240'),/50–100 мкм/);
 assert.match(condition('1B7240'),/длинноволновая \(50–100 мкм\)/);
 assert.match(rows.get('1B7240').solution,/нижний график/);
 assert.match(rows.get('1B7240').solution,/окна прозрачности/);
 assert.equal(Object.keys(sources).length,32);
};
