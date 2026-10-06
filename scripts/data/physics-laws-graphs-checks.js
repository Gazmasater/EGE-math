const assert=require('node:assert/strict');
const {records,laws}=require('./physics-laws-graphs');
// Independent readings of FIPI's five original graphs, made before generating prose.
const expected={A89B4F:'545',F85DF4:'433',E671F2:'511','57590E':'233','614F00':'335','721E76':'241',B6C579:'353','2AD478':'114','335A75':'425',CDBA10:'435','289626':'542','7C01DB':'255','1CB25E':'531',C86C59:'125','4A43A1':'153','14E6CD':'413','8AD1C3':'324','6A5190':'424',A1B4ED:'131','3B5AE2':'421','4DE163':'235',FE9B69:'433','561D34':'135','13AF81':'333'};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
function verifyPhysics(){
 assert.deepEqual(Object.keys(records).sort(),Object.keys(expected).sort());
 for(const r of Object.values(records)){
  assert.equal(r.answer,expected[r.id],r.id);assert.equal(r.images.length,5);assert.equal(r.stages.length,3);
  assert.equal(new Set(r.shapes).size,5);assert.ok(r.solution.length>1000);
  assert.ok(!/undefined|NaN|\//.test(r.solution),r.id);
 }
 // Physical scaling independently distinguishes similar rising and falling curves.
 for(const k of[.3,2,7])for(const x of[.2,1,4]){
  const spring=y=>.5*k*y*y,gravity=r=>k/(r*r),resistance=s=>k/s;
  near(spring(2*x)/spring(x),4);near(gravity(2*x)/gravity(x),.25);near(resistance(2*x)/resistance(x),.5);
  const period=m=>2*Math.PI*Math.sqrt(m/k);near(period(4*x)/period(x),2);
  const photon=p=>3*p;near(photon(2*x)/photon(x),2);
  const decay=t=>100*2**(-t/k);near(decay(0),100);near(decay(x+k)/decay(x),.5);
 }
 // Distinguish physical thresholds, finite intercepts and origin-passing lines.
 const kinetic=(h,nu,work)=>h*nu-work;near(kinetic(2,3,6),0);assert.ok(kinetic(2,2,6)<0);
 const vy=t=>20-10*t;near(vy(0),20);near(vy(2),0);assert.ok(vy(3)<0);
 const coordinate=t=>10-2*t*t;near((coordinate(.001)-coordinate(0))/.001,-.002);near(10-coordinate(2),4*(10-coordinate(1)));
 const T=300,states=[1,2,4].map(V=>({T,V,p:600/V}));for(const s of states){near(s.T,T);near(s.p*s.V,600);}
 // No swap of process axes: fixed ordinate is horizontal, fixed abscissa vertical.
 assert.deepEqual(laws.volumeIsochoric.slice(0,3),['c','T','V']);
 assert.deepEqual(laws.volumeIsothermal.slice(0,3),['v','T','V']);
 assert.deepEqual(laws.pressureIsochoric.slice(0,3),['v','V','p']);
 assert.notEqual(laws.nucleiTime[0],laws.photonMomentumWavelength[0]);
 assert.ok(records['614F00'].solution.includes('φ<100%'));
 assert.ok(records['721E76'].solution.includes('v_0x≠0'));
 return true;
}
module.exports={verifyPhysics};
