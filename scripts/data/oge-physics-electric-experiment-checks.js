const assert=require('node:assert/strict');
const models=require('./oge-physics-electric-experiment-models.json');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8*Math.max(1,Math.abs(b)),`${a} != ${b}`);
module.exports=prepared=>{
 const rows=new Map(prepared.map(r=>[r.id,r]));
 for(const [id,m] of Object.entries(models)) {
  const row=rows.get(id);assert.ok(row,id);
  if(m.kind==='rods') {
   // Geometry entries encode equal/different classes, not measured dimensions.
   const matches=m.options.flatMap((pair,k)=>{
    const [a,b]=pair.map(x=>m.labels.indexOf(x));
    return m.lengths[a]!==m.lengths[b]&&m.diameters[a]===m.diameters[b]?[k+1]:[];
   });
   assert.equal(matches.length,1);assert.equal(row.answer,String(matches[0]));
   const [a,b]=m.options[matches[0]-1].map(x=>m.labels.indexOf(x));
   for(const rho of [1,3,8]) {
    const resistance=i=>rho*m.lengths[i]/(Math.PI*m.diameters[i]**2/4);
    near(resistance(a)/resistance(b),m.lengths[a]/m.lengths[b]);
   }
  } else if(['power','work','resistance'].includes(m.kind)) {
   // Ideal ammeter and voltmeter read the same element; q and work independently
   // recover P=UI, R=U/I and A=UIt without assuming a lamp's constant resistance.
   for(const [U,I] of [[3,.2],[6,.4],[2,.7]]) {
    const t=m.kind==='work'?m.t:17,q=I*t,work=q*U;
    near(work/t,U*I);near(work/(I*I*t),U/I);
    if(m.kind==='work'){assert.equal(t,60);assert.match(row.answer,/60 с/);}
   }
   assert.equal(row.sketch.type,'electric-experiment-circuit');
   assert.match(row.solution,/параллельно только/);assert.match(row.solution,/Числовые показания.*отсутствуют/);
  } else if(m.kind==='dependence'||m.kind==='three-readings') {
   assert.equal(row.sketch.type,'resistance-circuit');
   for(const R of [4,7,10]) {
    const currents=m.currents||[.1,.25,.4],volts=currents.map(I=>I*R);
    for(let k=1;k<currents.length;k++)near((currents[k]-currents[k-1])/(volts[k]-volts[k-1]),1/R);
    if(m.kind==='three-readings') {
     assert.deepEqual(currents,[.3,.4,.5]);assert.equal(m.di,.02);assert.equal(m.du,.1);
     currents.forEach((I,k)=>{
      const lower=(volts[k]-m.du)/(I+m.di),upper=(volts[k]+m.du)/(I-m.di);
      assert.ok(lower<R&&R<upper);
     });
     assert.match(row.solution,/фактические числовые показания/);
    }
   }
  } else throw Error(id);
 }
 assert.equal(Object.keys(models).length,8);
};
