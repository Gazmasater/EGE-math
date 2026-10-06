const assert=require('node:assert/strict');
const expected={'1CCC46':3,'FA9DFC':70,'BFF6B7':1.25,'D8CCBB':200,'ABF5BF':250,'1FB423':500,'702454':3,'C97E5E':250,'909F5C':100,'986AAC':250,'6CCCA0':9,'59C0CD':1.25,'A155CE':300,'401B9F':2,'453892':800,'26769F':9,'8CF69C':75,'18D1E8':1500,'377A36':15,'89A46D':1.5};
const close=(a,b,id)=>assert.ok(Math.abs(a-b)<1e-9,id+': '+a+' != '+b);
function verifyPhysics(){
 const {records}=require('./physics-elasticity');assert.deepEqual(Object.keys(records).sort(),Object.keys(expected).sort());
 const numeric={'1CCC46':.045*(6/9)*100,'BFF6B7':(.05*10)/(1/.025)*100,'59C0CD':(.05*10)/(1/.025)*100,'1FB423':20/.04,'702454':9/300*100,'6CCCA0':.06*6/4*100,'A155CE':15/.05,'401B9F':400/20000*100,'453892':600*.04/.03,'26769F':6*.045/.03,'8CF69C':(.5/.05)*.075/10*1000,'377A36':5*.06/.02,'89A46D':.2*(10-2*5/2**2)/100*100};
 for(const [id,v]of Object.entries(expected)){
  const r=records[id];close(Number(r.answer.replace(',','.')),v,id);
  if(id in numeric)close(numeric[id],v,id+' independent');
  if(r.kind==='graph'){const h=r.graph,scale=h.unit==='м'?1:.01;for(let i=0;i<h.x.length;i++)close(v*h.x[i]*scale,h.F[i],id+' inverse graph');}
 }
 for(const [x,F]of [[.01,2.5],[.02,5],[.04,10],[.05,12.5]])close(250*x,F,'table all columns');
 close(300*.03,600*.015,'series equal forces');close(600*.04,800*.03,'compressed equilibrium');
 const a=(.2*10-100*.015)/.2;close(a*2**2/2,5,'lift inverse path');assert.ok(a>0&&a<10);
 close(10*.075,.075*10,'dynamometer equilibrium');
 return true;
}
module.exports={verifyPhysics};
