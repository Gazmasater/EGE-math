const assert=require('node:assert/strict');
const models=require('./oge-physics-joule-lenz-models.json');
const sources=require('./oge-physics-joule-lenz-sources.json');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const number=s=>Number(s.match(/[\d,.]+/)[0].replace(',','.'));
const fmt=n=>String(n).replace('.',',');
module.exports=prepared=>{
 const rows=new Map(prepared.map(r=>[r.id,r]));
 for(const [id,m]of Object.entries(models)) {
  const row=rows.get(id);assert.ok(row,id);
  if(m.kind==='voltage') {const charge=m.I*m.t;near(number(row.answer)*charge,m.E);}
  else if(m.kind==='lamp-ratio') {near(number(row.answer)*m.after,m.before);}
  else if(m.kind==='lamp-power') {
   const power=number(row.answer)/(m.total?m.n:1),current=power/m.U;
   near(current*m.R,m.U);
  }else if(m.kind==='energy-resistance') {
   const voltage=m.I*number(row.answer);near(voltage*m.I*m.t,m.E);
  }else if(m.kind==='power-ratio') {
   near(m.U2*m.U2/number(row.answer),m.U1*m.U1/m.P1);
  }else if(m.kind==='energy') {near(number(row.answer)*1000/m.t,m.P);}
  else if(m.kind==='efficiency') {
   const percent=number(row.answer);assert.ok(Math.abs(percent-100*m.useful/(m.U*m.I))<=.5);
   assert.ok(m.U*m.I-m.useful>0);assert.match(row.answer,/≈/);
  }else if(m.kind==='locomotive') {
   const v=m.findv?number(row.answer):m.v,I=m.findv?m.I:number(row.answer);
   const input=m.U*I,output=m.F*v;near(output/input,m.eta);assert.ok(input>output);
   for(const term of ['Ox','Oy','F_тяги − F_сопр = maₓ','N − mg = 0'])assert.ok(row.solution.includes(term),id+': forces');
  }else if(m.kind==='switch-time') {
   // Independent sample circuit: each resistance 6 ohms, supply 12 V.
   const currentsSeries=[12/18,12/18,12/18],currentsParallel=[12/6,12/6,12/6];
   const power=currents=>currents.reduce((p,I)=>p+I*I*6,0);
   const before=power(m.seriesfirst?currentsSeries:currentsParallel),after=power(m.seriesfirst?currentsParallel:currentsSeries);
   near(before*m.told,after*number(row.answer));
  }else if(m.kind==='six'||m.kind==='five') {
   const targetCurrent=Math.sqrt(number(row.answer)/m.values[m.target-1]);
   const total=targetCurrent*(m.kind==='six'?(m.target===1?3:2):(m.target===3?2:4));
   const currents=m.kind==='six'?[total/3,total/3,total/3,total/2,total/2,total]:[total,total/2,total/2,total/4,total/4];
   const V=currents.map((i,k)=>i*m.values[k]);
   if(m.kind==='six') {
    near(currents[0]+currents[1]+currents[2],total);near(currents[3]+currents[4],total);
    for(let a=0;a<3;a++)for(let b=3;b<5;b++)near(V[a]+V[b]+V[5],m.U);
   }else {
    near(currents[0],currents[1]+currents[2]);near(currents[2],currents[3]+currents[4]);
    near(V[1],V[2]+V[3]);near(V[1],V[2]+V[4]);near(V[0]+V[1],m.U);
   }
   near(currents.reduce((sum,I,k)=>sum+I*I*m.values[k],0),m.U*total);
  }else if(m.kind==='lab') {
   assert.match(row.answer,/требуется измерить напряжение/);assert.match(row.solution,/Только условный пример/);
   assert.ok(row.solution.includes(`I = (${fmt(m.I)} ± 0,02) А`));
   assert.ok(row.solution.includes(`U = (U_изм ± ${fmt(m.du)}) В`));
   const R=m.exampleU/m.I;near(m.exampleValue,m.I*m.I*R*m.t);
   assert.ok(row.answer.includes(`${fmt(m.I)} А`));
   if(m.work)assert.ok(row.answer.includes(`${m.t} с`));
   assert.equal(sources[id].discrepancy.status,'resolved');
   // Positive measurement bounds contain the example; no nominal R is asserted.
   const low=(m.exampleU-m.du)*(m.I-.02)*m.t,high=(m.exampleU+m.du)*(m.I+.02)*m.t;
   assert.ok(low<m.exampleValue&&high>m.exampleValue);
  }else if(m.kind==='brightness') {
   for(const p1 of [20,40,60])for(const p2 of [75,100,150]) {
    const r1=220**2/p1,r2=220**2/p2,I=220/(r1+r2);assert.ok(I*I*r1>I*I*r2);
   }
   assert.match(row.answer,/меньшей номинальной/);
  }else if(m.kind==='qualitative') {
   // Numerical checks over varied positive loads, independent of prose answer.
   const direction=(a,b)=>a>b?'1':a<b?'2':'3';
   for(const r1 of [4,11,30])for(const r2 of [3,17,50]) {
    const U=120;let before,after;
    if(m.change==='rheostat') {before=r1+r2;after=r1+2*r2;}
    if(m.change==='add-resistor') {before=8+r1;after=8+1/(1/r1+1/r2);}
    if(m.change==='remove-lamps') {before=1/(1/r1+1/r2+1/8+1/13+1/21);after=1/(1/8+1/13+1/21);}
    if(m.change==='add-appliance') {before=r1;after=1/(1/r1+1/r2);}
    assert.ok(before>0&&after>0);
    const first=m.change==='add-appliance'?direction(U/after,U/before):direction(after,before);
    assert.equal(row.answer,first+direction(U*U/after,U*U/before));
   }
  }else throw Error(id+': unknown model');
 }
 assert.equal(Object.keys(models).length,34);
};
