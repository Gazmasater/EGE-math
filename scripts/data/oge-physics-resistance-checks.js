const assert = require('node:assert/strict');
const models = require('./oge-physics-resistance-models.json');
const sources = require('./oge-physics-resistance-sources.json');
const near = (a,b) => assert.ok(Math.abs(a-b)<1e-9*Math.max(1,Math.abs(b)), `${a} != ${b}`);
const number = text => Number(text.match(/^[-−\d,.]+/)[0].replace('−','-').replace(',','.'));
const selection = values => values.flatMap((v,i)=>v?[i+1]:[]).join('');
module.exports = prepared => {
 const rows = new Map(prepared.map(r=>[r.id,r]));
 for(const [id,m] of Object.entries(models)) {
  const row=rows.get(id),short=id.slice(7),source=sources[id];assert.ok(row,id);
  if(m.kind==='wire-order') {
   // Arbitrary dimensions respecting every ordering in the primary illustration.
   const values=[[.016,1,4],[.017,1,1],[.1,1.5,1],[.028,1.5,1]].map(([rho,l,S])=>rho*l/S);
   const selected=m.maximum?Math.max(...values):Math.min(...values);
   assert.equal(row.answer,String(values.indexOf(selected)+1));
   assert.ok(.1>.028&&.028>.017&&.017>.016);
  } else if(m.kind==='graph') {
   const result=number(row.answer);near(result*m.I,m.U);near((2*m.U)/(2*m.I),result);
  } else if(m.kind==='control-pair') {
   const rods=[['Cu',2,1],['Al',2,1],['Cu',2,4],['Al',1,1]],choices=[[0,1],[0,2],[1,2],[1,3]];
   const matched=choices.map(([a,b])=>rods[a][0]===rods[b][0]&&rods[a][1]===rods[b][1]&&rods[a][2]!==rods[b][2]);
   assert.equal(row.answer,selection(matched));
  } else if(m.kind==='shorten') {
   const oldR=.4*10/.5,newR=.4*7/.5,U=24;
   const oldValue=m.power?U*U/oldR:U/oldR,newValue=m.power?U*U/newR:U/newR;
   assert.equal(row.answer,(newR<oldR?'2':'1')+(newValue>oldValue?'1':'2'));
  } else if(m.kind==='table') {
   // Every expression evaluates the corresponding PRIMARY statement numerically.
   const tables={
    CD3142:[10.5<7.8,.016<Math.min(.1,.5,.07,.4,1.1),8.4===8.4&&.07!==1.1,.1/4===.4,.5*5===.4*4],
    '6FD942':[.028<.016,.017<.016,8.4===8.4,1.1===.4,.1*4===.4*1],
    '93A3B3':[8.4>8.9&&.07<.017,.016>1.1,.5===.4,1.1>.4,.4/.1===4],
    '064FD7':[2.7<8.9&&.028>.017,1.1===.07,8.8!==8.8,1.1<.4,.5*4===.4*5],
    A8D134:[2.7>8.9,1.1!==.07,8.8!==8.8,1.1>.4,.1*1===.4*4]
   };
   assert.equal(row.answer,selection(tables[short]));
  } else if(m.kind==='experiment-table') {
   const controlled={length:[],area:[],material:[]};
   for(let a=0;a<m.rows.length;a++)for(let b=a+1;b<m.rows.length;b++) {
    const [sa,la,ra]=m.rows[a],[sb,lb,rb]=m.rows[b],same=m.material[a]===m.material[b];
    if(same&&sa===sb&&la!==lb)controlled.length.push([la,lb,ra,rb]);
    if(same&&la===lb&&sa!==sb)controlled.area.push([sa,sb,ra,rb]);
    if(!same&&sa===sb&&la===lb)controlled.material.push([ra,rb]);
   }
   const length=controlled.length.some(([a,b,ra,rb])=>(a-b)*(ra-rb)>0);
   const area=controlled.area.some(([a,b,ra,rb])=>(a-b)*(ra-rb)<0);
   const material=controlled.material.some(([a,b])=>a!==b);
   assert.equal(row.answer,selection(short==='679141'?[length,false,material,area,false]:[false,length,material,area,false]));
   for(let n=0;n<4;n++){const [S,l,R]=m.rows[n];near(R*S/l,n===3?1.2:.4);}
  } else if(m.kind==='power') {
   const current=m.U*m.S/(m.rho*m.l);near(number(row.answer),current*current*(m.rho*m.l/m.S));
  } else if(m.kind==='length') {
   const length=number(row.answer),resistance=m.rho*length/m.S;near(resistance*m.I,m.U);
  } else if(m.kind==='ratio') {
   const oldR=.4*8/2,newR=1.2*(8*m.factor)/2;near(number(row.answer),newR/oldR);
  } else if(m.kind==='wire-voltage') {
   near(number(row.answer)/(m.rho*m.l/m.S),m.I);
  } else if(m.kind==='area') {
   const result=number(row.answer);
   for(const [U,I] of m.pairs)near(U,I*m.rho*m.l/result);
  } else if(m.kind==='power-voltage') {
   const u=number(row.answer);near(u*u*m.S/(m.rho*m.l),m.P);
  } else if(m.kind==='density-mass') {
   const value=number(row.answer),density=m.densityMode?value:m.density,mass=m.densityMode?m.mass:value;
   const volume=mass/density,length=volume/(m.S*1e-6),resistance=m.rho*length/m.S;
   near(m.I*resistance,m.U);
  } else if(m.kind==='lab') {
   const conditionI=source.fipiCondition.match(/силу тока ([\d,]+) А/);assert.ok(conditionI,id);
   near(Number(conditionI[1].replace(',','.')),m.I);
   const voltageError=source.fipiCondition.match(/погрешность измерения напряжения равна ±([\d,]+) В/);assert.ok(voltageError,id);
   near(Number(voltageError[1].replace(',','.')),m.du);
   near(m.exampleR*m.I,m.exampleU);
   assert.match(row.answer,/требуется измерить напряжение/);
   assert.match(row.solution,/Только как пример/);
   assert.match(row.solution,/не даны в условии/);
   assert.equal(row.sketch.type,'resistance-circuit');
   const lowR=(m.exampleU-m.du)/(m.I+.02),highR=(m.exampleU+m.du)/(m.I-.02);
   assert.ok(lowR<m.exampleR&&m.exampleR<highR);
  } else throw Error(id+': unknown model');
 }
 assert.equal(Object.keys(models).length,34);
};
