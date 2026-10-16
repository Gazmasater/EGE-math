const assert=require('node:assert/strict');
const models=require('./oge-physics-evaporation-models.json');
const sources=require('./oge-physics-evaporation-sources.json');
module.exports=prepared=>{
 const records=new Map(prepared.map(r=>[r.id,r]));
 const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9*Math.max(1,Math.abs(b)),`${a} != ${b}`);
 let count=0;
 for(const [short,d] of Object.entries(models)){
  const r=records.get('OGEPHYS'+short);assert.ok(r,short);count++;
  assert.ok(sources[r.id].fipiCondition.length>40);
  const answer=x=>assert.equal(r.answer,String(x).replace('.',','),r.id);
  if(d.kind==='latent'){
   near(d.Q,d.L*d.m);
   answer(d.find==='mass'?d.Q/d.L:d.L*d.m/1000);
  }else if(d.kind==='ratio')answer(d.q2/d.q1);
  else if(d.kind==='phase-change'){
   // At equilibrium and constant pressure the temperature, hence molecular
   // mean kinetic energy, stays constant. Latent heat changes internal energy.
   answer('3'+(d.boiling?'1':'2'));
   assert.match(r.solution,/давлен/);assert.match(r.solution,/всю исходную массу/);
  }else if(d.kind==='choice'){
   const physicalOptions={
    '9EDA06':['condensation',3],'AD2455':['evaporation',3],
    '2AB4C2':['evaporation',1],'A07867':['condensation',3],
    'BD443F':['condensation',1],'BE1836':['evaporation',1]
   };
   const [process,option]=physicalOptions[short];
   assert.equal(d.phenomenon,process);answer(option);
   assert.match(r.solution,process==='evaporation'?/испар/:/конденс/);
  }else if(d.kind==='experiment'){
   // Both experiments establish evaporation at room temperature; the second
   // controlled variable is either free-surface area or the liquid's identity.
   answer(d.area?'13':'14');
   assert.match(sources[r.id].fipiCondition,d.area?/площади её поверхности/:/эфир/);
  }else if(d.kind==='boiling-table'){
   const {pressures:p,temperatures:t}=d;
   assert.equal(p.length,7);assert.equal(t.length,7);
   assert.ok(t.every((v,i)=>i===0||v>t[i-1]));
   assert.notEqual(t[0]/p[0],t[2]/p[2]);
   const normal=t[p.indexOf(760)];near(normal,d.second?78.15:78.2);
   assert.ok(normal<100);answer(d.second?'14':'15');
  }else if(d.kind==='balance'){
   // A representative positive escaped mass makes the weights' torque larger.
   const m0=1,dm=.01,g=10,arm=.2;
   assert.ok((m0-dm)*g*arm<m0*g*arm);
   assert.equal(r.answer,'Нет. Чаша с гирями опустится.');
   assert.match(r.solution,/M₁ < M₂/);
  }else if(d.kind==='humidity'){
   assert.equal(r.answer,'В сухом климате.');assert.match(r.solution,/Q = LΔm/);
   assert.equal(sources[r.id].discrepancy.status,'resolved');
  }else if(d.kind==='wet-cloth'){
   assert.match(r.answer,/Во втором сосуде/);assert.match(r.solution,/капилляр/);
  }else if(d.kind==='phase-diagram'){
   assert.equal(d.direction,d.start==='A'?'down':'up');
   assert.equal(d.boundary,d.start==='A'?'в':'б');
   assert.match(r.answer,d.start==='A'?/Уменьшить давление/:/Повысить давление/);
   assert.match(r.solution,new RegExp('«'+d.boundary+'»'));
   assert.match(r.solution,/температур/);
   if(d.start==='A')assert.equal(sources[r.id].discrepancy.status,'resolved');
  }else if(d.kind==='nucleation'){
   assert.match(r.answer,/В первом сосуде/);assert.match(r.solution,/микропузырьк/);
   assert.match(r.solution,/комнатную температуру/);
  }else throw new Error('Unknown evaporation model: '+d.kind);
 }
 assert.equal(count,25);
};
