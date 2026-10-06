const assert=require('node:assert/strict');
const expected={'9F5549':80,'5E7E7C':.36,'3FB779':36,'9AE31E':6,'AC8852':2.25,'A129A4':.2,'41BBCF':2,'FE45CD':48,'166494':40,'D9079D':2,'379C9D':64,'BA66EA':30,'C0B561':2.7};
function close(a,b,label){assert.ok(Math.abs(a-b)<1e-10,label);}
function verifyPhysics(){
 const {records}=require('./physics-gravity');assert.deepEqual(Object.keys(records).sort(),Object.keys(expected).sort());
 for(const [id,value]of Object.entries(expected)){
  const r=records[id];close(Number(r.answer.replace(',','.')),value,id);
  if(r.kind==='force'){
   const G=6.674e-11,ma=4,mb=r.r0?7:4,d=1.2;
   const F0=G*ma*mb/d**2,F=G*(ma*r.masses[0])*(mb*r.masses[1])/(d*r.distance)**2;
   close(r.initial*F/F0,value,id+': independent physical substitution');
   close(F/F0*(r.distance**2)/(r.masses[0]*r.masses[1]),1,id+': inverse');
  }
 }
 close(2*2/(80/40)**2,1,'9F5549');close(36/6**2,1,'3FB779');close(1/6**2,1/36,'9AE31E');
 close((1/2**2)/(1/3**2),2.25,'AC8852 height versus center');close(120/2**2,30,'BA66EA center');
 assert.ok(records['9AE31E'].images.length===1);
 assert.ok(records.FE45CD.solution.includes('m_A₀·m_B₀')&&records['166494'].solution.includes('m_A₀·m_B₀'));
 return true;
}
module.exports={verifyPhysics};
