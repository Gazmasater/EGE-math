'use strict';
const assert=require('node:assert/strict');
const models=require('./oge-physics-matter-colors-models.json');
const sources=require('./oge-physics-matter-colors-sources.json');
module.exports=prepared=>{
 const byId=new Map(prepared.map(r=>[r.id,r]));
 for(const [id,m] of Object.entries(models)){
  const r=byId.get(id);assert.ok(r,id);
  if(m.kind==='filter'){
   const observed=x=>x.map((v,i)=>v*m.filter[i]);
   const o=observed(m.object),p=observed(m.paper);
   const dark=o.every(v=>v===0),same=o.every((v,i)=>v===p[i]);
   assert.ok(p.some(v=>v>0));
   const text=sources[id].fipiCondition;
   const choices=[...text.matchAll(/([1-4])\)\s*([\s\S]*?)(?=\s+[1-4]\)|$)/g)];
   const match=choices.filter(x=>same?/Не удастся:.*просто лист красного/.test(x[2]):dark&&/чёрного цвета на листе (?:зелёного|красного)/.test(x[2]));
   assert.equal(match.length,1,id);assert.equal(r.answer,match[0][1],id);
   if(same)assert.match(r.solution,/яркост[ьи]/);
  }
  if(m.kind==='thermal-equilibrium'){
   // Positive expansion, equal heat capacities, insulated pair: common final T.
   const initialFluid=m.up?10:50,water=30,final=(initialFluid+water)/2;
   const deltaVolume=.001*100*(final-initialFluid);
   assert.equal(deltaVolume>0,m.up);assert.equal(initialFluid<water,m.up);
   assert.match(r.answer,m.up?/ниже/:/выше/);
  }
  if(m.kind==='plate-force'){
   const mg=2,surface=.4,Tdry=mg,Twet=mg+surface;
   assert.ok(Math.abs(Twet-mg-surface)<1e-12);assert.ok(Twet>Tdry);assert.equal(r.answer,'3');
   assert.ok(sources[id].images[0].annotations.some(a=>a.subscript==='вод'&&a.y2>a.y1));
  }
  if(m.kind==='film'){
   const volume=1e-9,diameter=2e-9,maximum=volume/diameter;
   for(const area of [maximum/2,maximum,maximum*2])assert.equal(volume/area>=diameter,area<=maximum);
   assert.match(r.answer,/не обязательно/);
  }
  if(m.kind==='scattering'){
   // An illustrative selective-scattering model, not primary measured data.
   const blue=1,red=.2,short=1,long=3;
   const surviving=(coefficient,distance)=>Math.exp(-coefficient*distance);
   assert.ok(surviving(red,short)>surviving(blue,short));
   assert.ok(surviving(red,long)/surviving(blue,long)>surviving(red,short)/surviving(blue,short));
   assert.ok(1-surviving(blue,short)>1-surviving(red,short));
   if(m.view==='side')assert.equal(r.answer,'2');
   else if(m.view==='long-path')assert.match(r.answer,/горизонта/);
   else assert.match(r.answer,/Красн/);
  }
  if(m.kind==='correlation'){
   assert.ok(m.coPeakPixels.every((x,i)=>m.mortalityPeakPixels[i]>x));
   assert.match(r.answer,/не доказывает причинность/);
   assert.equal(sources[id].discrepancy.status,'resolved');
  }
  if(m.kind==='adhesion'){
   assert.equal(r.answer,'1');assert.match(r.solution,/смачива/);
   if(!m.bothOil)assert.match(r.solution,/Несмешиваемость сама по себе не доказывает/);
  }
 }
 assert.equal(Object.keys(models).length,15);
};
