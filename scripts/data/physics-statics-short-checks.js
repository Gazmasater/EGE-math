const assert=require('node:assert/strict');
const {records}=require('./physics-statics-short');
const close=(a,b,label)=>assert.ok(Math.abs(a-b)<1e-9,label+': '+a+' != '+b);
function verifyPhysics(){
 const expected={F120FE:1.8,'5E50FD':8,'97B7FB':12,'176001':100,'109B0A':2,C7E001:10,B0907A:.4,D52A7D:.3,A74573:160,ED57BF:215,'43BD11':30,'0EFE20':16,'0BA328':100,E2FE2C:1.44,'3FFC2F':20,'97B3DA':6,'05875D':320,'99BD56':60,'92E953':8,'84D25A':.01,'2EF7AF':.2,A55FAE:.75,EB02A8:.08,'12CCC3':13.6,'2A56CC':12,'8093C0':100,'2A8C90':7.5,'17FFEA':.27,'7C4D6D':18.5,A34464:1.6,'77CD33':1500,B08038:40,'16C3B9':800,D795BB:300,'37D2BB':5,'523C36':30};
 assert.equal(Object.keys(records).length,36);
 for(const[id,value]of Object.entries(expected)){
  assert.equal(Number(records[id].answer.replace(',','.')),value,id);
  for(const required of ['ось','сил','Проверка','Ответ:'])assert.ok(records[id].solution.toLowerCase().includes(required.toLowerCase()),id+' '+required);
 }
 // Independent primary data and reverse balances; no generated case data reused.
 for(const[id,F,l,M]of [['5E50FD',expected['5E50FD'],.15,12*.1],['97B7FB',expected['97B7FB'],.1,8*.15],['C7E001',expected.C7E001,.16,8*.2],['A74573',expected.A74573,.2,40*.8],['3FFC2F',expected['3FFC2F'],.8,40*.4],['99BD56',expected['99BD56'],.4,20*1.2],['8093C0',expected['8093C0'],.3,50*.6]])close(F*l,M,id+' torque');
 close(60*expected.B0907A,120*.2,'left arm');close(5*expected.A34464,20*.4,'right arm');
 close(2/expected['109B0A'],1,'doubled mass');close(expected.D52A7D*2,.2*3,'count divisions');close(expected.A55FAE*4,1*3,'fish diagram');close(.5*expected['97B3DA'],.2*15,'masses and centimetres');
 close(80*expected['43BD11']/100,30*.8,'stick torque');close(expected['0BA328']*.5,50,'moment');
 close(expected.F120FE*1000/1000/10,(20-2)/100,'water height');close(expected['12CCC3']*1000/13600/10,.1,'mercury height');close(expected['2A56CC']*1000/800/10,1.5,'kerosene depth');close(expected.B08038*1000*10,4e5,'lake');close(expected['0EFE20']/(10e-4),800*10*2,'patch area');
 close(expected['176001'],10*10,'floating ball');assert.ok(expected['176001']/1000/10<15e-3);close(expected.ED57BF*10,2150,'boat');
 close(expected.E2FE2C/900/10,160e-6,'oil displacement');close(expected['84D25A']/1000/10,1e-6,'aluminium volume');close(expected.EB02A8/1000/10,.02**3,'wood cube');close(expected['17FFEA']/1000/10,.03**3,'copper cube');close(expected['2EF7AF']*10,2,'displaced mass');
 close(expected['05875D']*1e-4*1250,4*10,'brick area');close(expected['7C4D6D']*10,2500*740e-4,'stone mass');close(expected['77CD33']*300e-4,4.5*10,'brick pressure');
 close(10-.2*10-expected['92E953'],0,'bottom tether sign');close(12+expected['16C3B9']*10*.001,2*10,'top tether');
 close(expected['2A8C90']+2.5,10,'opposite forces');assert.notEqual(expected['2A8C90'],10+2.5);
 close(expected.D795BB*4,80*10*1+20*10*2,'massive rod');close(700+expected.D795BB,1000,'rod force balance');
 close(expected['37D2BB']*Math.cos(Math.PI/4),1*10*.5*Math.sin(Math.PI/4),'angle from vertical');close(expected['523C36']*10*.15,75*.6,'shaft radius');
 assert.ok(records['92E953'].solution.includes('T вниз'));assert.ok(records['2A8C90'].solution.includes('P=F₁−F₂'));assert.ok(records['37D2BB'].solution.includes('Lcosα'));assert.ok(records.A34464.unit==='м');
 return true;
}
module.exports={verifyPhysics};
