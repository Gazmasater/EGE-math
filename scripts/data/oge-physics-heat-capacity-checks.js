const assert=require('node:assert/strict');
const models=require('./oge-physics-heat-capacity-models.json');
const sources=require('./oge-physics-heat-capacity-sources.json');
const close=(a,b,label)=>assert.ok(Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(b)),`${label}: ${a} != ${b}`);
const number=s=>Number(s.match(/-?\d+(?:[.,]\d+)?/)[0].replace(',','.'));
module.exports=prepared=>{
 const byId=new Map(prepared.map(r=>[r.id,r]));let count=0;
 const num=(r,x,tolerance=0)=>{const a=number(r.answer);assert.ok(Math.abs(a-x)<=Math.max(tolerance,Math.abs(x)*1e-10),r.id+': calculated answer '+x+' != '+r.answer);};
 const options=(r,values)=>assert.equal(r.answer,values.map((v,i)=>v?i+1:'').join(''),r.id+': primary option mapping');
 for(const [short,d] of Object.entries(models)){
  const r=byId.get('OGEPHYS'+short);assert.ok(r,short);count++;
  const s=sources[r.id].fipiCondition;
  assert.ok(s.length>40);assert.ok(r.solution.includes('Проверка'));
  if(d.kind==='sensible'){
   const delta=Math.abs(d.t2-d.t1),q=d.c*d.m*delta;close(q,d.Q,r.id);
   const x=d.find==='m'?d.Q/d.c/delta:d.find==='delta'?d.Q/d.c/d.m:q/(d.answerUnit==='кДж'?1000:1);num(r,x);
   if(['D1E5CD','502B30','D9EE45','D8BCC1'].includes(short))assert.match(r.solution,/не (?:нужна|добавляем|требуется)|без теплоты|не входит|не прибавляем|не нужна|не требуется|не добавляем/);
  }else if(d.kind==='graph-c'){num(r,d.Q/d.m/d.delta);close(d.c*d.m*d.delta,d.Q,r.id);}
  else if(d.kind==='graph-m'){num(r,d.Q/d.c/d.delta);}
  else if(d.kind==='ratio'){num(r,d.q2/d.q1);assert.ok(d.q2>d.q1);}
  else if(d.kind==='cooling-stages'){
   const energies={water:4200*1*20,freeze:330000*1,ice:2100*1*20};num(r,d.stages.reduce((sum,k)=>sum+energies[k],0)/1000);
  }else if(d.kind==='drop'){options(r,[false,920>130,false,false]);assert.ok(920/130>7&&920/130<7.2);assert.match(r.solution,/ma_y = mg − N/);}
  else if(d.kind==='mix-loss'){const t=(d.eta*d.mh*d.th+d.mc*d.tc)/(d.eta*d.mh+d.mc);num(r,t);close(d.mc*(t-d.tc),d.eta*d.mh*(d.th-t),r.id);assert.ok(t>d.tc&&t<d.th);}
  else if(d.kind==='ice-mix'){
   const mw=330000*d.melt/(4200*40-2*2100*10),mi=2*mw;num(r,(d.question==='воды'?mw:mi)*1000);assert.ok(d.melt<mi);close(4200*mw*40,2100*mi*10+330000*d.melt,r.id);
  }else if(d.kind==='wet-snow'){
   const ice=4200*(d.hot*(d.Thot-d.T)-d.snow*d.T)/330000;num(r,(d.questionWater?d.snow-ice:ice)*1000,.5);assert.ok(ice>0&&ice<d.snow);close(4200*d.hot*(d.Thot-d.T),330000*ice+4200*d.snow*d.T,r.id);
  }else if(d.kind==='fuel-evap'){
   const useful=d.eta*46000000*d.fuelMass,heat=4200*d.waterMass*80,m=(useful-heat)/2300000;num(r,m*1000,.5);assert.ok(m>0&&m<d.waterMass);close(heat+2300000*m,useful,r.id);
  }else if(d.kind==='phase-cool'){
   const q=d.m*(d.latent+d.c*d.delta);close(q,d.Q,r.id);num(r,d.findMass?d.Q/(d.latent+d.c*d.delta)*1000:q/1000);
  }else if(d.kind==='compound'){num(r,(920*d.ma+4200*d.mw)*d.delta/1000);}
  else if(d.kind==='spoons'){assert.match(r.answer,/Алюминиевая/);close(number(r.answer),920/400,r.id);}
  else if(d.kind==='fuel-heat'){num(r,4200*d.mw*d.delta/d.q*1000);}
  else if(d.kind==='phase-time'){
   const ratio=330000/(2100*d.delta),x=d.findMelt?d.knownMinutes*ratio:d.knownMinutes/ratio;num(r,x,.05);close(x,d.resultMinutes,r.id);
  }else if(d.kind==='electrical-efficiency'){
   const q=4200*d.m*d.delta+2300000*d.evap,A=d.I*d.I*d.R*d.seconds;num(r,100*q/A,.5);assert.ok(q<A);close(q,d.Q,r.id);close(A,d.A,r.id);
  }else if(d.kind==='electrical-evap'){
   const q=d.eta*d.U*d.U*d.seconds/d.R,m=(q-4200*d.m*d.delta)/2300000;num(r,m*1000,.5);assert.ok(m>0&&m<d.m);
  }else if(d.kind==='electrical-efficiency-ui'){
   const q=4200*d.m*d.delta,A=d.U*d.I*d.seconds;num(r,100*q/A,.5);assert.ok(q<A);
  }else if(d.kind==='electrical-compound'){num(r,d.eta*d.U*d.U*d.seconds/d.R/(920*d.ma+4200*d.mw),.05);}
  else if(d.kind==='graph-energy'){num(r,d.qReference*d.delta/d.deltaReference/1000);}
  else if(d.kind==='choice'){
   const state={heatStart:'solid',heatMiddle:'mixture',heatEnd:'liquid',coolStart:'liquid',coolMiddle:'mixture',coolEnd:'solid'};
   let v;
   if(d.table==='cooling'){
    const al=[72,62,55,50,46],pl=[72,65,60.5,56.7,53.3];
    const drops=a=>a.slice(1).map((t,i)=>a[i]-t),a=drops(al),p=drops(pl),slowing=a.every((x,i)=>i===0||x<a[i-1]),fast=a.every((x,i)=>x>p[i]);
    assert.deepEqual(d.al,al);if(d.plastic)assert.deepEqual(d.plastic,pl);
    const inverse=al[1]*5===al[2]*10,direct=al[0]===0,evapMeasured=false,roomReached=false;
    v={F06DF8:[al.at(-1)===46,a[0]===a[1],direct,evapMeasured,slowing],
     '6A34B6':[roomReached,a[0]>a[1],inverse,slowing,evapMeasured],
     '6CA903':[al.at(-1)===53.3,a[0]===p[0],fast,slowing&&p.every((x,i)=>i===0||x<p[i-1]),evapMeasured],
     EDFC22:[al[0]-al.at(-1)>pl[0]-pl.at(-1),roomReached,slowing,al[0]-al[2]===55,evapMeasured],
     '7C2DD3':[pl.at(-1)===53.3,a[0]>a[1],inverse,!fast,evapMeasured],
     '05D595':[al.at(-1)===46&&pl.at(-1)===46,a[0]===a[1],direct,fast,slowing]}[short];
   }else if(d.table==='cylinders'){
    const q=[10,10,24,13].map(dt=>4200*.1*dt);v=[q[2]===q[3],q[0]!==q[3],q[0]===q[1],q[2]===Math.min(...q),false];
   }else if(d.table==='liquid-heat'){
    const dt1=d.final1-d.initial,dt2=d.final2-d.initial,c1Less=dt1>dt2;
    v={E7317D:[dt1===2*dt2,c1Less,false,false,false],'5C7855':[dt2===1.5*dt1,c1Less,false,false,true],'2B938C':[false,c1Less,false,false,true]}[short];
   }else if(d.graph==='heat-boil'){
    // Primary t(Q): solid rise is gentler than the liquid rise; plateaus are melting then boiling.
    const solidCGreater=true;
    v={'658302':[!solidCGreater,false,state.heatStart==='liquid',true,true],'1921BB':[solidCGreater,false,state.heatEnd==='liquid',false,false],DA30ED:[!solidCGreater,false,state.heatEnd==='liquid',true,false]}[short];
   }else if(d.graph==='cool-one')v=short==='6839B5'?[state.coolEnd==='solid',false,false,false,true]:[state.coolStart==='solid',true,false,false,true];
   else if(d.graph==='heat-one')v=short==='0CAB57'?[state.heatStart==='liquid',true,false,false,true]:[state.heatStart==='solid',false,false,false,true];
   else if(d.graph==='heat-cool-cycle')v=short==='2C146F'?[false,false,true,state.coolMiddle==='mixture',state.coolEnd==='liquid']:[true,false,false,state.coolMiddle==='liquid',true];
   else if(d.graph==='lead-Q'){
    const qm=(128-78)*1000,mass=78000/130/(327-27);close(mass,qm/25000,r.id);
    v=short==='F91211'?[qm===128000,mass===2,true,false,false]:[qm===50000,mass===1,false,false,true];
   }else if(d.graph==='lead-time'){
    const q=130*1*(127-27);v=short==='6F393D'?[q===13000,state.heatStart==='liquid',327===327,false,false]:[q===16510,state.heatStart==='solid',327===27,true,false];
   }else if(d.graph==='calorimeter-Q')v=[d.T===50,false,false,d.qD+d.qE===800,false];
   else if(d.graph==='cool-two')v=[false,true,!d.latent1Greater,d.c1Greater,false];
   else if(d.graph==='heat-two')v=[!d.latent1Greater,d.c1Greater,d.equalEndQ,false,false];
   else if(d.graph==='boil-two')v=[true,!d.c1Less,!d.latent1Less,true,false];
   else if(d.graph==='ice-earlier')v=[true,false,d.equilibrium==='Б',false,false];
   else if(d.graph==='ice-simultaneous')v=[false,false,d.equilibrium==='Б',false,true];
   else if(d.graph==='water-earlier')v=[false,false,d.equilibrium==='В',false,true];
   else if(d.graph==='water-two')v=[true,false,d.equilibriumTemp==='t₂',false,false];
   assert.ok(v,short+': untested choice type');options(r,v);
  }else throw new Error('Unknown heat-capacity model '+d.kind);
 }
 assert.equal(count,86);
};
