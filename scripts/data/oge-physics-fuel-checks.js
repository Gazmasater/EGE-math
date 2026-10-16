const assert=require('node:assert/strict');
const models=require('./oge-physics-fuel-models.json'),sources=require('./oge-physics-fuel-sources.json');
module.exports=prepared=>{
 const records=new Map(prepared.map(r=>[r.id,r]));let count=0;
 const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8*Math.max(1,Math.abs(b)),`${a} != ${b}`);
 for(const [short,d] of Object.entries(models)){
  const r=records.get('OGEPHYS'+short);assert.ok(r);count++;
  const number=Number(r.answer.match(/\d+(?:[.,]\d+)?/)[0].replace(',','.'));
  if(d.kind==='efficiency'){
   const useful=d.eta*d.Q_MJ,other=d.Q_MJ-useful;
   close(useful+other,d.Q_MJ);assert.ok(useful>0&&other>0);
   close(number,(d.loss?other:useful)*(d.unit==='кДж'?1000:1));
  }else if(d.kind==='table'){
   // Primary table values in MJ/kg; statement numbering is independently
   // transcribed for each variant, without sharing the solution's text.
   const wood=10,peat=14,anthracite=30,charcoal=34,oil=44,gas=44,petrol=46,kerosene=46,alcohol=27;
   const mainlyHigher=[oil,petrol,kerosene,alcohol].filter(q=>q>Math.max(3.8,wood,peat,anthracite,27,charcoal)).length>2;
   const truths={
    B60B15:[wood>peat,5*petrol<6*charcoal,mainlyHigher,10*anthracite===30*wood,oil===4.4],
    '7A9E29':[charcoal>peat,5*oil<6*charcoal,alcohol*1000===270,peat===1.4*wood,!mainlyHigher],
    E23DD9:[charcoal>wood,5*oil<6*anthracite,alcohol>kerosene,5*anthracite===15*wood,!mainlyHigher],
    '32FD9C':[wood>charcoal,5*oil>6*gas,mainlyHigher,5*anthracite===15*wood,5*oil===5*peat]
   }[d.variant];
   assert.equal(r.answer,truths.flatMap((v,i)=>v?[i+1]:[]).join(''));
   assert.match(r.solution,/одинакового массового расхода/);
   assert.match(r.solution,/нельзя строго определить время нагрева/);
   assert.equal(sources[r.id].discrepancy.status,'resolved');
  }else if(d.kind==='maximum'){
   close(number,d.eta*d.q*d.m/1e6);
   for(const eta of [.1,.2,.3])assert.ok(eta*d.q*d.m<=number*1e6);
   assert.match(r.solution,/Фактическая работа может оказаться меньше/);
  }else if(d.kind==='flight'){
   const time=d.s_km/d.v_kmh*3600;
   close(number,d.P*time/(d.eta*d.q));close(d.eta*number*d.q/time,d.P);
  }else if(d.kind==='car'){
   const time=d.eta*d.q*d.m/d.P;
   close(number,d.v_kmh*time/3600);close(d.P*(number/d.v_kmh*3600)/(d.q*d.m),d.eta);
  }else throw new Error('Unknown fuel model '+d.kind);
 }
 assert.equal(count,13);
};
