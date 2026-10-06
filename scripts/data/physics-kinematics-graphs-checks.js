const assert=require('node:assert/strict');
const {records}=require('./physics-kinematics-graphs');
const expected={ '008243':35,BBFB41:-8,'277542':0,'6EC247':150,'38F045':25,'428CFB':2,'41FCF3':32.5,B51AF2:5,EDB1FA:4.5,'259807':-2,E01406:5,F5E57D:225,'081272':2,'78FE70':-10,'7FDF75':-.5,D5307D:10,'65EA74':40,C013BD:-16,C5B0B3:4,E0C5B4:-2,E650BC:16,'424A13':10,B61411:-16,'2A0F1F':4,ECE218:160,'371718':-2,BD0C23:30,EA992E:-5,'4DDEDB':-5,'715DD2':0,B9A0DF:2,'2336DF':16,DAA0DF:32.5,D109D1:200,DA7AD2:12,AA3BD8:5,C297D4:0,'6ADAD4':250,FDE15C:-1,'2E3953':-5,A24553:300,CC405D:25,'788CAE':3,D359AA:100,FCB3C2:5,'09B5CD':8,'0E7CCE':25,'3F1CCC':25,F9D994:-5,D5639B:5,'87FF90':-8,F97EE2:350,'2818ED':0,EF04E1:16,'06B062':5,'535663':4,CE6D67:325,'89DC6C':-2.5,'7CFB3E':1,'58C03A':12,C85E34:7.5,'61A437':25,'873033':-4,F1008A:2,'7D4E89':-4,D1B58A:1.5};
const near=(a,b,id,tol=1e-6)=>assert.ok(Math.abs(a-b)<tol,`${id}: ${a} ≠ ${b}`);
// Independent graph model: solve each line as y=k*t+c, then integrate using
// midpoint quadrature. It does not reuse solution interval splitting or areas.
function at(points,t){const pair=points.slice(1).map((p,i)=>[points[i],p]).find(([a,b])=>a[0]<=t&&t<=b[0]);assert.ok(pair,'point outside domain');const[[a,u],[b,v]]=pair,k=(v-u)/(b-a);return k*t+u-k*a;}
function integral(r,absolute){const[a,b]=r.interval,N=24000,dt=(b-a)/N;let sum=0;for(let i=0;i<N;i++){const v=at(r.points,a+(i+.5)*dt);sum+=(absolute?Math.abs(v):v)*dt;}return sum;}
function verifyPhysics(){assert.equal(Object.keys(records).length,66);assert.deepEqual(Object.keys(records).sort(),Object.keys(expected).sort());
 for(const [id,r]of Object.entries(records)){
  const answer=Number(r.answer.replace('−','-').replace(',','.'));near(answer,expected[id],id);
  const[a,b]=r.interval;let result;
  if(['acceleration','velocity'].includes(r.kind)){
   const slopes=[];
   for(let i=1;i<r.points.length;i++){const[l,u]=r.points[i-1],[h,v]=r.points[i];if(l<b&&h>a)slopes.push((v-u)/(h-l));}
   assert.ok(slopes.length);for(const s of slopes)near(s,answer,id);result=slopes[0];
   near(at(r.points,a)+result*(b-a),at(r.points,b),id+': reverse');
  }else if(r.kind==='path')result=integral(r,true);
  else if(r.kind==='displacement-magnitude'){result=Math.abs(integral(r,false));near(integral(r,true),10,id+': path differs');}
  else if(r.kind==='acceleration-ratio'){const d1=at(r.points,b)-at(r.points,a),d2=at(r.secondPoints,b)-at(r.secondPoints,a);assert.ok(d1<0&&d2>0);result=Math.abs(d1/d2);}
  else if(r.kind==='coordinate-parabola'){result=1;for(const[t,x]of r.points)near(r.initialCoordinate+r.initialVelocity*t+result*t*t/2,x,id);}
  else{const relative=Math.abs(at(r.points,b)-at(r.points,a))*1000/((b-a)*60);result=r.kind==='relative-speed'?relative:r.kind==='closing-other-speed'?relative-r.knownSpeed:r.knownSpeed-relative;assert.ok(result>0);if(r.kind==='separating-other-speed')assert.ok(result<r.knownSpeed);}
  if(r.kind==='path'&&!r.condition.includes('проекции')){assert.ok(!r.solution.includes('Δx'),id+': speed magnitude does not determine displacement');assert.ok(!JSON.stringify(r.stages).includes('Δx'),id);}
  near(result,answer,id,1e-4);assert.ok(r.solution.length>700,id);assert.ok(r.solution.includes('Проверка.'),id);assert.ok(!r.solution.includes('/'),id);assert.equal(r.stages.length,3,id);
 }
 // Independently hand-summed areas pin the graph scales and sign handling.
 near(5*3+(5+15)*2/2,expected['008243'],'008243 rectangles');
 near(15*3/2+10*2/2,expected['41FCF3'],'41FCF3 reversal');
 near(20*4+20*8/2,expected.ECE218,'ECE218 scale');
 near((15+5)*10/2+(5+20)*10/2+20*10/2,expected.CE6D67,'CE6D67');
 near((25-(-25))/2,expected['0E7CCE'],'0E7CCE tick size');
 near((0-(-9))/2,expected.EDB1FA,'EDB1FA tick size');
 return true;
}
module.exports={verifyPhysics};
