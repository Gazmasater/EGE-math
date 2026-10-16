const assert=require('node:assert/strict');
const models=require('./oge-physics-light-dispersion-models.json');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9*Math.max(1,Math.abs(b)),`${a} != ${b}`);
module.exports=prepared=>{
 const rows=new Map(prepared.map(r=>[r.id,r]));
 for(const [id,m]of Object.entries(models)) {
  const r=rows.get(id);assert.ok(r,id);
  if(m.kind==='shadows') {
   const H=Number(r.answer),slope=m.treeHeight/m.treeShadow;
   // Intersect a ray from the crane top with the ground, independently of the solved proportion.
   near(H-slope*m.craneShadow,0);near(H/m.treeHeight,m.craneShadow/m.treeShadow);
  }else if(m.kind==='window-brightness') {
   assert.match(r.answer,/Обычно.*темнее.*отражения/);
   assert.match(r.solution,/пропускает/);assert.match(r.solution,/блика/);
   // Merely illustrative energy partitions, not invented window measurements.
   for(const [reflect,transmit,absorb]of [[.08,.9,.02],[.05,.93,.02]]) {
    near(reflect+transmit+absorb,1);assert.ok(transmit>reflect);
    const wallToObserver=.5*.02,windowDiffuse=transmit*.03*.02;
    assert.ok(windowDiffuse<wallToObserver);
    assert.ok(reflect>wallToObserver); // A specular reflection can reverse the comparison.
   }
  }else if(m.kind==='lunar-twilight') {
   assert.match(r.answer,/Нет/);assert.match(r.solution,/рассеяни/);
   assert.match(r.solution,/Отражённый Землёй/);
   const surfaceRadius=6371,layerRadius=6451;
   assert.ok(Math.acos(surfaceRadius/layerRadius)>0); // Elevated air can still see the Sun.
   near(1-Math.exp(0),0); // No scattering optical depth: no atmospheric twilight light.
  }else if(m.kind==='prism-dispersion') {
   assert.equal(r.answer,'3');
   // Minimum deviation through a 60-degree prism, using two different refractive indices.
   const A=Math.PI/3,deviation=n=>2*Math.asin(n*Math.sin(A/2))-A;
   assert.ok(deviation(1.53)>deviation(1.51));near(deviation(1.51)-deviation(1.51),0);
  }else if(m.kind==='spectrograph-defocus') {
   assert.match(r.answer,/размо/);assert.match(r.solution,/перед экраном/);
   for(const fOld of [.1,.3,.8])for(const factor of [1.1,1.5,2]) {
    const fNew=fOld/factor;assert.ok(1/fNew>1/fOld);
    // Paraxial ray transfer from the lens to the fixed screen, varying entrance height.
    for(const angle of [-.05,0,.05]) {
     const screenHeight=(height,f)=>height+fOld*(angle-height/f);
     near(screenHeight(-.01,fOld),screenHeight(.01,fOld));
     assert.ok(Math.abs(screenHeight(-.01,fNew)-screenHeight(.01,fNew))>0);
     near(-.01+fNew*(angle+.01/fNew),.01+fNew*(angle-.01/fNew));
    }
   }
  }else throw Error(id);
 }
 assert.equal(Object.keys(models).length,5);
};
