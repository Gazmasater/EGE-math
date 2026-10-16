const assert=require('node:assert/strict');
const sources=require('./oge-physics-thermal-properties-sources.json');
module.exports=prepared=>{
 const rows=new Map(prepared.map(r=>[r.id.slice(7),r]));
 const answer=id=>rows.get(id).answer;
 const condition=id=>sources['OGEPHYS'+id].fipiCondition;
 for(const id of ['62AC06','9F082C','2C9631','0D9588','ACF96F']){
  const choices=[...condition(id).matchAll(/(\d)\)\s*([\s\S]*?)(?=\s\d\)|$)/g)];
  const matches=choices.filter(m=>id==='ACF96F'?/^тепловое расширение воды/.test(m[2]):/^тепловое расширение/.test(m[2]));
  assert.equal(matches.length,1);assert.equal(answer(id),matches[0][1]);
 }
 // A fixed mass of alcohol receives heat and has positive thermal expansion.
 const c=2400,m=.02,deltaT=15,beta=.0011,V0=.000025;
 const deltaU=m*c*deltaT,deltaV=V0*beta*deltaT;
 assert.equal(answer('FB8774'),[deltaU,deltaV].map(x=>x>0?'1':'2').join(''));
 // Heat flows from either initially hot block to the thermostat until both temperatures equal it.
 for(const [id,room,t1,t2] of [['36C3CA',20,100,200],['78203C',25,200,100]]){
  const final=Number(answer(id));assert.equal(final,room);
  const heatFlows=[.7*(t1-room),1.3*(t2-room)];assert.ok(heatFlows.every(q=>q>0));
  const isolatedAverage=(5*t1+2*t2)/7;assert.notEqual(final,isolatedAverage);
  assert.equal(.7*(final-room)+1.3*(final-room),0);
  assert.match(condition(id),new RegExp('поддерживается равной '+room));
 }
 // Independently solve the balance for several measuring devices and water samples.
 for(const C of [50,200,800])for(const t0 of [10,25])for(const hot of [80,100]){
  const final=ct=>(C*hot+ct*t0)/(C+ct),small=final(5),big=final(30);
  assert.ok(t0<big && big<small && small<hot);
  assert.ok(Math.abs(C*(hot-big)-30*(big-t0))<1e-9);
  assert.ok(30*(big-t0)>5*(small-t0));
 }
 assert.match(answer('E244F1'),/Большой.*меньшую/);assert.match(rows.get('E244F1').solution,/внешними потерями теплоты пренебрегаем/);
 const angles={wax:120,mercuryGlass:140,waterGlass:2,paraffin:107};
 assert.ok(angles.wax>90);assert.match(answer('6FB920'),/уменьшится/);
 const menisci=['convex','concave'];const mercuryShape=angles.mercuryGlass>90?'convex':'concave';
 assert.equal(answer('A2020C'),'В сосуде '+(menisci.indexOf(mercuryShape)+1)+'.');
 assert.ok(angles.waterGlass<90);assert.match(condition('A2020C'),/парафин 107/);
 const table=[[0,76],[20,73],[50,68],[100,59]],g=9.8,neck=.006;
 for(let i=1;i<table.length;i++){
  const colder=table[i-1][1]*.001*neck/g,hotter=table[i][1]*.001*neck/g;
  assert.ok(colder>hotter);assert.ok(Math.abs(colder*g-table[i-1][1]*.001*neck)<1e-12);
 }
 assert.match(answer('59A4F0'),/увеличится/);assert.match(rows.get('59A4F0').solution,/F_пн − mg = 0/);
 assert.ok(sources.OGEPHYS59A4F0.sourceLimitation);
 // For equal volume, a sphere has less area than a cube; a cylindrical elongation also raises area.
 const volume=1,r=Math.cbrt(3*volume/(4*Math.PI)),sphereArea=4*Math.PI*r*r;
 assert.ok(sphereArea<6*Math.pow(volume,2/3));
 for(const cr of [.1,.2,.3]){const h=volume/(Math.PI*cr*cr);assert.ok(sphereArea<2*Math.PI*cr*(cr+h));}
 assert.match(answer('DC37AC'),/шарообразную/);assert.match(rows.get('DC37AC').solution,/свободного падения/);
 assert.equal(answer('0E5E08'),'Металлическую.');assert.match(rows.get('0E5E08').solution,/проводит теплоту значительно лучше дерева/);
 assert.equal(Object.keys(sources).length,14);
};
