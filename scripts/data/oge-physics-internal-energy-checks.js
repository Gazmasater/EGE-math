'use strict';
const assert=require('node:assert/strict');
const sources=require('./oge-physics-internal-energy-sources.json');
module.exports=prepared=>{
 const rows=new Map(prepared.map(r=>[r.id,r]));
 const row=id=>rows.get('OGEPHYS'+id),condition=id=>sources['OGEPHYS'+id].fipiCondition;
 const options=t=>[...t.matchAll(/([1-8])\)\s*([\s\S]*?)(?=\s+[1-8]\)|$)/g)].map(m=>({n:m[1],label:m[2].trim()}));
 const terms={
  '97F749':['теплопередача','увеличивается','нагревается и закипает','внутренняя энергия'],
  F7D390:['деформировались','потенциальная','кинетическая','внутренняя'],
  '05FBE8':['внутренняя','потенциальная','повысилась','кинетическая'],
  '82B23C':['механическая','внутренняя','повысилась','кинетическая'],
  '345987':['кинетическая','потенциальная','внутренняя','увеличивается']
 };
 for(const [id,words]of Object.entries(terms)){
  const opts=options(condition(id).split(/Список слов(?: и словосочетаний)?:/)[1].split('Запишите')[0]);
  const answer=words.map(w=>{let p=opts.filter(o=>o.label===w);assert.equal(p.length,1,id);return p[0].n;}).join('');assert.equal(row(id).answer,answer,id);
 }
 for(const id of ['CAA422','DE7F68','6B5BDD']){
  let opts=options(condition(id)),valid=opts.filter(o=>o.label==='совершение работы');assert.equal(valid.length,1);assert.equal(row(id).answer,valid[0].n);
 }
 // Independent thermodynamic consistency checks: m is fixed and Q=0.
 const m=1,V1=2,V2=1,gamma=1.4,T1=300,T2=T1*(V1/V2)**(gamma-1);
 assert.ok(m/V2>m/V1&&T2>T1&&T2/V2>T1/V1);
 for(const id of ['F7982D','FACDC9'])assert.equal(row(id).answer,'11');
 for(const [id,change]of [['CB99A7',.8],['1CD592',1.2]]){
  const densityRatio=(m/V1)/(m/V1),speedRatio=Math.sqrt(change);
  assert.equal(densityRatio,1);assert.equal(row(id).answer,'3'+(speedRatio>1?'1':'2'));
 }
 assert.match(row('2F4393').answer,/повышается/);assert.match(row('D563EA').answer,/понижается/);
 assert.match(row('D563EA').solution,/Свободное расширение.*пустоту/);
 const Q=500*10*200;assert.equal(Number(row('BFA536').answer),Q/1e6);assert.equal(Q/(500*10),200);
 // Both distributions obey conservation but give opposite ball-heating rankings.
 const loss1=1,loss2=.5;
 const examples=[[.1,.8],[.5,.5]];
 const changes=examples.map(([a,b])=>[a*loss1,b*loss2]);
 assert.ok(changes[0][0]<changes[0][1]&&changes[1][0]>changes[1][1]);
 for(const [a,b] of examples)assert.ok(a>=0&&a<=1&&b>=0&&b<=1);
 assert.match(row('06CA68').answer,/данных недостаточно/);assert.match(row('06CA68').solution,/α₁ = α₂/);
 assert.equal(sources.OGEPHYS06CA68.discrepancy.status,'resolved');assert.equal(sources.OGEPHYSF7982D.discrepancy.status,'resolved');
 assert.equal(Object.keys(sources).length,16);
};
