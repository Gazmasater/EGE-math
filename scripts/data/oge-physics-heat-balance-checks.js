const assert=require('node:assert/strict');
const models=require('./oge-physics-heat-balance-models.json');
const sources=require('./oge-physics-heat-balance-sources.json');
const close=(a,b,label)=>assert.ok(Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(b)),`${label}: ${a} != ${b}`);
module.exports=prepared=>{
 const records=new Map(prepared.map(r=>[r.id,r]));let count=0;
 for(const [short,d] of Object.entries(models)){
  const r=records.get('OGEPHYS'+short);assert.ok(r,short);count++;
  const number=Number(r.answer.match(/-?\d+(?:[.,]\d+)?/)?.[0]?.replace(',','.'));
  const answer=(expected,tolerance=0)=>assert.ok(Math.abs(number-expected)<=Math.max(tolerance,1e-8*Math.abs(expected)),`${r.id}: ${r.answer} != ${expected}`);
  assert.ok(sources[r.id].fipiCondition.length>40);
  if(d.kind==='ice-ratio')answer(d.latent/(d.c*d.delta),.005);
  else if(d.kind==='mix-loss'){
   const q=4200*(d.hotMass*(d.hotT-d.finalT)-d.coldMass*(d.finalT-d.coldT));answer(q);close(q,d.Qloss,r.id);assert.ok(q>0);
  }else if(d.kind==='fuel'){
   close(d.fuelMass*d.q,4200*d.waterMass*d.delta,r.id);
   answer(d.find==='fuel'?4200*d.waterMass*d.delta/d.q*1000:d.fuelMass*d.q/4200/d.delta);
  }else if(d.kind==='spoon'){
   const x=920*d.alMass*(d.waterT-d.alT)/(4200*d.waterMass+920*d.alMass);answer(x,.005);
   close(4200*d.waterMass*x,920*d.alMass*(d.waterT-d.alT-x),r.id);
  }else if(d.kind==='impact'){
   assert.ok(d.cLead<d.cCopper);assert.equal(r.answer,'Свинцовое тело.');assert.match(r.solution,/ma_y = mg − N/);assert.match(r.solution,/изменением внутренней энергии Земли пренебрегают/);
  }else if(d.kind==='body-water'){
   close(d.cBody*d.bodyMass*d.bodyDelta,4200*d.waterMass*d.waterDelta,r.id);
   answer(d.find==='water'?d.cBody*d.bodyMass*d.bodyDelta/(4200*d.waterDelta):4200*d.waterMass*d.waterDelta/(d.bodyMass*d.bodyDelta));
  }else if(d.kind==='mix')answer((d.hotMass*d.hotT+d.coldMass*d.coldT)/(d.hotMass+d.coldMass));
  else if(d.kind==='mix-mass')answer(d.hotMass*(d.hotT-d.finalT)/(d.finalT-d.coldT));
  else if(d.kind==='copper-ice')answer(d.latent*d.iceMass/(d.cCopper*d.delta)*1000);
  else if(d.kind==='electric-vessel'){
   const C=4200*d.waterMass+920*d.alMass;close(C*d.delta,d.eta*d.P*d.time,r.id);
   if(d.U!==null)close(d.P,d.U*d.U/d.R,r.id);
   answer(d.find==='time'?C*d.delta/(d.eta*d.P):d.find==='delta'?d.eta*d.P*d.time/C:d.eta*d.U*d.U*d.time/(C*d.delta));
  }else if(d.kind==='two-power'){
   const p=d.series?d.p0/2:2*d.p0;close(p*d.time,4200*d.m*d.delta,r.id);
   answer(d.find==='time'?4200*d.m*d.delta/p:d.find==='mass'?p*d.time/(4200*d.delta):p*d.time/(4200*d.m));
  }else if(d.kind==='electric-ui'){
   const q=4200*d.m*d.delta;close(q,d.eta*d.U*d.I*d.time,r.id);answer(d.find==='voltage'?q/(d.eta*d.I*d.time):q/(d.eta*d.U*d.I));
  }else if(d.kind==='steel'){
   const q=d.m*(d.c*d.delta+d.latent);close(q,d.power*d.time,r.id);answer(d.find==='mass'?d.power*d.time/(d.c*d.delta+d.latent):d.find==='time'?q/d.power:q/d.time/1000);
  }else if(d.kind==='low-voltage'){
   close(d.R,d.u0*d.u0/d.p0,r.id);const p=d.U*d.U/d.R;close(p,600,r.id);close(4200*d.m*d.delta,d.eta*p*d.time,r.id);
   answer(d.find==='mass'?d.eta*p*d.time/(4200*d.delta):4200*d.m*d.delta/(d.eta*p));
  }else if(d.kind==='boil'){
   const h=d.c*d.delta+d.latent;close(d.m*h,d.eta*d.U*d.U*d.time/d.R,r.id);
   answer(d.find==='mass'?d.eta*d.U*d.U*d.time/d.R/h:d.find==='resistance'?d.eta*d.U*d.U*d.time/(d.m*h):100*d.R*d.m*h/(d.U*d.U*d.time),d.find==='mass'?.005:.05);
   assert.match(r.solution,/Q₁ \+ Q₂/);
  }else if(d.kind==='initial-temperature'){
   const R=d.series?2*d.R:d.R/2,C=4200*d.mw+920*d.ma;answer(d.finalT-d.U*d.U*d.time/(R*C),.05);
  }else if(d.kind==='series-efficiency'){
   const q=4200*d.m*d.delta;
   answer(d.find==='resistance'?d.eta*d.U*d.U*d.time/(2*q):Math.sqrt(2*d.R*q/(d.eta*d.time)),d.find==='resistance'?.05:.5);
  }else if(d.kind==='parallel-each')answer(4200*d.m*d.delta/(2*d.time));
  else if(d.kind==='ambiguous-power'){
   const p=4200*d.m*d.delta/d.time;answer(p/2);close(p/2,d.actualEach,r.id);close(2*p,d.aloneEach,r.id);
   assert.match(r.answer,/800 Вт/);assert.match(r.solution,/номинальная/);assert.equal(sources[r.id].discrepancy.status,'resolved');
  }else if(d.kind==='electric-power')answer(d.eta*d.power*d.time/(4200*d.delta));
  else if(d.kind==='milk')answer(d.c*d.m*d.delta*d.R/(d.U*d.U));
  else throw new Error('Unknown heat-balance model '+d.kind);
 }
 assert.equal(count,43);
};
