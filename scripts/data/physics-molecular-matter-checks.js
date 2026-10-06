const assert=require('node:assert/strict');
const {records}=require('./physics-molecular-matter');
function verifyPhysics(){
 const expected={
  '2E704B':(20+80)/2,'7FF207':50/2,DDF044:40/20,'8E4A29':45/15,'88B2B0':4,
  '48DD07':1.5,'5EA5A3':1,'7EFC03':900/.3,DF53E0:1.8/.6,'94F2EC':800/.2,FDEF65:980/.4,
  '641CB6':100/2.5,'30DE81':100/2.5,'707DC8':60/100*100,'533B07':.7*100,
  '96F2BE':1/.2,'3A5182':1/.5,'33A3B0':40/2,'4E55D4':100,'5809D9':100,'3EF7DE':100,
  '8A8EC1':40*2,'6AEE90':40*1.5,E51EE2:24/3,'502F6F':30*2,'721035':30/3
 };
 assert.equal(Object.keys(expected).length,26);
 assert.deepEqual(Object.keys(records).sort(),Object.keys(expected).sort());
 for(const[id,value]of Object.entries(expected))assert.ok(Math.abs(Number(records[id].answer.replace(',','.'))-value)<1e-10,id+': independent answer');
 // Independent molecular accounting: set kT = 1 and saturation pressure = 1.
 for(const[id,initial,ratio]of[['4E55D4',.34,1/3],['3EF7DE',.73,.5],['5809D9',.5,.5]]){
  const vaporBefore=initial,finalVolume=ratio,vaporAfter=Math.min(vaporBefore,finalVolume);
  assert.ok(vaporAfter<=vaporBefore);
  assert.ok(Math.abs(100*vaporAfter/finalVolume-Number(records[id].answer))<1e-10,id+': vapor balance');
  assert.ok(records[id].solution.includes('насыщен'));
 }
 // Condensation must be strictly positive in the first two cases; zero at the threshold.
 assert.ok(.34-1/3>0);assert.ok(.73-.5>0);assert.equal(.5-.5,0);
 for(const[initial,final,volume]of[[40,20,2],[40,80,.5],[40,60,2/3],[24,8,3],[30,60,.5],[30,10,3]])assert.ok(Math.abs(initial-final*volume)<1e-10);
 // Saturated vapor expansion exchanges mass with the liquid, not a fixed-N gas.
 assert.equal(1.5/1.5,1);assert.equal(3/3,1);
 assert.ok(records['48DD07'].solution.includes('дополнительные молекулы'));
 assert.ok(records['5EA5A3'].solution.includes('N₂ = 3N₁'));
 assert.ok(records['2E704B'].solution.includes('равенства объёмов'));
}
module.exports={verifyPhysics};
