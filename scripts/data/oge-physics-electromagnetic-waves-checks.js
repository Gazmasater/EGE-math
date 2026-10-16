const assert=require('node:assert/strict');
const models=require('./oge-physics-electromagnetic-waves-models.json');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const C=3e8;
module.exports=prepared=>{
 const rows=new Map(prepared.map(r=>[r.id,r]));
 for(const [id,m] of Object.entries(models)) {
  const row=rows.get(id);assert.ok(row,id);
  if(m.kind==='boundary') {
   for(const frequency of [4.5e14,6e14,7e14]) {
    const v1=C/m.n1,v2=C/m.n2,before={v:v1,f:frequency,lambda:v1/frequency},after={v:v2,f:frequency,lambda:v2/frequency};
    const answer=m.quantities.map(k=>after[k]===before[k]?'3':after[k]>before[k]?'1':'2').join('');
    assert.equal(row.answer,answer);near(after.lambda/before.lambda,m.n1/m.n2);
   }
  } else if(m.kind==='radio') {
   const answer=Number(row.answer.replace(',','.'));
   if(m.frequency) {
    if(id==='OGEPHYS9E249C') {
     assert.ok((answer-.005)*m.frequency<C&&(answer+.005)*m.frequency>C);
     assert.equal(answer,Math.round(C/m.frequency*100)/100);
    }else near(answer*m.frequency,C);
   }else near(answer*(m.unit==='МГц'?1e6:1e3)*m.wavelength,C);
  } else if(m.kind==='band') {
   const numbered=['radio','infrared','ultraviolet','xray','gamma'];
   assert.equal(row.answer,String(numbered.indexOf(m.band)+1));
   const sample=[1e8,1e13,1e15,1e18,1e21].map(f=>C/f);
   assert.ok(sample.every((v,i)=>i===0||v<sample[i-1]));
  } else if(m.kind==='statements') {
   const first=['first','second'].includes(m.version);
   const f=first?(m.version==='first'?3000e3:300e3):3e3*1e9;
   // Intervals are read from this particular primary diagram, including overlap.
   const radio=v=>v<=1e13,infrared=v=>v>=1e12&&v<4e14,visible=v=>v>=4e14&&v<=8e14;
   const flags=first?[radio(f)&&!infrared(f),false,visible(1e5*1e9),false,C/(6e14)/1e-6<1]:
    [m.version==='third'?infrared(f)&&!radio(f):radio(f)&&!infrared(f),infrared(5e4*1e9),false,radio(C/1),false];
   assert.equal(row.answer,flags.flatMap((yes,i)=>yes?[i+1]:[]).join(''));
   if(first){assert.ok(infrared(1e14));assert.match(row.solution,/10¹⁴ Гц/);}
  } else if(m.kind==='recognition') {
   const expected={'infrared':'1','earth-thermal':'1','xray':'3','gamma':'3'}[m.phenomenon];
   assert.equal(row.answer,expected);
   if(m.phenomenon==='earth-thermal') {
    // Cloud back-radiation lowers the net outward power at fixed surface T.
    const surface=400,clearDown=200,cloudDown=300;
    assert.ok(surface-cloudDown<surface-clearDown);
   } else if(m.phenomenon==='infrared') {
    // Wien's law is used only in this independent audit, not required of pupils.
    for(const T of [273,300,350])assert.ok(2.9e-3/T>700e-9);
   }
  } else if(m.kind==='galileo') {
   const D=1000,t=2*D/C;near(t,6.666666666666667e-6);
   assert.ok(.1/t>10000);assert.match(row.answer,/время/);
  } else if(m.kind==='welding') {
   assert.ok(m.peakNm[0]>=100&&m.peakNm[0]<400);assert.equal(m.peakNm[1],400);
   assert.match(row.answer,/Ультрафиолет/);
  } else if(m.kind==='glass') {
   assert.ok(m.targetNm>=315&&m.targetNm<400&&m.transmission>.8);
   assert.match(row.answer,/не защищает/);
  } else if(m.kind==='luminescence') {
   const possible=m.excitationNm.map(lambda=>m.emissionNm>lambda);
   if(possible.length===2){assert.deepEqual(possible,[false,true]);assert.match(row.answer,/второго/);}
   else {assert.deepEqual(possible,[true]);assert.match(row.answer,/Да/);}
  } else if(m.kind==='solar') {
   const coarsePeak=m.minimumYear+m.period/2;
   assert.ok(coarsePeak>=2025&&coarsePeak<=2026);assert.match(row.solution,/грубой оценки/);
   assert.match(row.solution,/не позволяет предсказать точную/);
  } else throw Error(id);
 }
 assert.equal(Object.keys(models).length,28);
};
