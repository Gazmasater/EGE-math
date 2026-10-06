const assert=require('node:assert/strict');
const {records}=require('./physics-thermodynamics-gas');
const v=id=>Number(records[id].answer.replace(',','.'));
const near=(a,b,label)=>assert.ok(Math.abs(a-b)<1e-9*Math.max(1,Math.abs(b)),`${label}: ${a} != ${b}`);
function verifyPhysics(){
 // Golden answers transcribed independently from the original task conditions.
 const expected={F23045:.75,'25664A':4,BA6EFF:2200,'14FBF5':400,'5AD1F4':150,
  '3F5FFF':15,'7AC008':1.5,F9F879:3,'100178':300,'934673':1,FD8CBF:100,
  '7D3CB8':.5,A35ABE:100,'8AD2B8':50,'116C13':5,A7A816:1,F98025:4,
  EE9D27:30,'64852A':5,'663E2C':2,D6DCD9:.75,'3EE6DF':200,B95F58:30,
  ED2C58:900,'7F7CAA':5,'71B5A3':50,'5952A5':20,'5297C0':.5,'8EED94':1.5,
  '10B1E8':4,C091EC:2,BF0465:600,'976338':5,'832D3B':20,'25EC8A':60,
  ED9C80:3,'8AEB86':30,'67A91B':2000,'426924':40,'0E8CD8':5000,EE7CA0:2.7,FDCBE2:20};
 assert.deepEqual(Object.keys(records).sort(),Object.keys(expected).sort());
 for(const[id,result]of Object.entries(expected))near(v(id),result,id);
 // Conservation with independent signed data: Q - A = ΔU.
 near(1700+500,v('BA6EFF'),'received heat plus external work');
 near(300-v('14FBF5'),-100,'cooling while performing positive work');
 near(-v('5AD1F4')+500,350,'heat rejected during compression');
 near(300-v('FD8CBF'),200,'engine energy');
 near(100+v('A35ABE'),200,'external work inferred');
 near(-v('116C13')-35,-40,'kJ and heat rejection');
 near(75-v('EE9D27'),45,'helium work');
 near(300-v('3EE6DF'),100,'positive internal energy');
 near(v('7F7CAA')+30,35,'compression and heat receipt');
 near(100-80,v('5952A5'),'increase of U');
 near(v('10B1E8')+12,16,'kJ compression');
 near(900-1500,-v('BF0465'),'sum across both stages');
 near(-v('25EC8A')+30,-30,'compression with decrease of U');
 // Work areas from manually read graph endpoints, independent of case arrays.
 near(v('F23045')*(4*2),(4+2)*2/2,'rectangle then trapezoid');
 near(v('7AC008')*(2*2),(4+2)*2/2,'trapezoid then rectangle');
 near(v('8EED94')*4,6,'second variant work areas');
 near(v('7D3CB8')*((1+3)*2/2),1*2,'rising trapezoid');
 near(v('D6DCD9')*(2*2),(4+2)*1/2,'unequal volume intervals');
 near(v('934673')*(1e5*(2-1)*1e-3),.5e5*(3-1)*1e-3,'both arrows right');
 near(v('5297C0')*(.6e5*(4-1)*1e-3),.3e5*(5-2)*1e-3,'litres to cubic metres');
 near(v('C091EC')*(.4e5*(40-10)*1e-3),.8e5*(50-20)*1e-3,'positive external work ratio');
 near(v('ED2C58')/3000,.4-.1,'external work inverse volume');
 near(v('3F5FFF')*1*1,3*5,'endpoint temperature products');
 // Temperature invariance, isochoric zero work, and units.
 for(const[id,Q,A]of[['25664A',4,4],['8AD2B8',-50,-50],['64852A',-5,-5],['71B5A3',50,50],['976338',-5,-5],['ED9C80',3,3]]){
  near(Q-A,0,id+': ΔU');near(v(id),Math.abs(Q),id+': heat/work magnitude');
 }
 near(4*1,1*4,'976338 endpoint pV equality');
 for(const[id,U]of[['F9F879',3],['100178',300],['B95F58',-30],['832D3B',20],['8AEB86',-30]])near(v(id),Math.abs(U),id+': Q=U at fixed volume');
 near(2/2,1/1,'832D3B p/T unchanged');
 near(v('67A91B')+1.5*v('67A91B'),5000,'monoatomic first law');
 near(v('426924')+1.5*v('426924'),100,'helium first law');
 near(-v('0E8CD8')+2000,-3000,'compression heat and U');
 near(v('EE7CA0')*1000/(1.5*.6),3000,'rigid pressure back-substitution');
 near(2.5*v('FDCBE2')*1000*.6,30000,'argon pressure inverse heat');
 // Qualitative figure choices also require signs and actual labels in the explanation.
 assert.ok(records.A7A816.solution.includes('A₂=0'));
 assert.ok(records.F98025.solution.includes('процессах 2 и 3 газ сжимается'));
 assert.ok(records['663E2C'].solution.includes('процессы 3 и 4 — сжатия'));
 assert.ok(records['976338'].solution.includes('p₁V₁=p₂V₂'));
}
module.exports={verifyPhysics};
