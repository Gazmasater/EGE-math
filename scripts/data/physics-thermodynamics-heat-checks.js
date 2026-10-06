const assert=require('node:assert/strict');
const {records}=require('./physics-thermodynamics-heat');
const value=id=>Number(records[id].answer.replace(',','.'));
const near=(a,b,label)=>assert.ok(Math.abs(a-b)<1e-8*Math.max(1,Math.abs(b)),label+': '+a+' != '+b);
function verifyPhysics(){
 // Independently transcribed answers; do not import the cases as an oracle.
 const expected={'5D804A':250,AD5049:4600,F45AFF:900,'217002':30,DAFE0A:30,
  '8DC80E':500,'002BBE':5000,'772CBF':1.5,'48A1DF':750,E5F0D5:6080,'72BC5A':10,
  '2AAC5D':150,'1F08A5':600,'5745AB':5,'154098':240,'687697':20,'52B560':216,
  A19065:600,'8AB566':50,D13E36:200,'137B85':200,'3ABA89':400,CDB542:295,
  C5D4F1:.4,DE8578:.8,'5F7074':42,'90F3B1':30,'2C5924':168,A9E423:216,
  BC2CD5:.4,'6A33DF':330,'7C455F':50.2,'1B1B5D':10,C62953:46.4,'66DF52':84,
  '6C915C':30,C6FFCA:45,E62F93:16,'4FD162':200,C5D78B:15};
 assert.deepEqual(Object.keys(records).sort(),Object.keys(expected).sort());
 for(const[id,answer]of Object.entries(expected))near(value(id),answer,id);
 // Back-substitution against manually read original graph endpoints (joules).
 for(const[id,m,start,end]of[
  ['5D804A',2,100000,600000],['217002',.5,5000,20000],['48A1DF',.4,100000,400000],
  ['1F08A5',.5,100000,400000],['A19065',.5,100000,400000],['D13E36',1.5,200000,500000],
  ['137B85',2,400000,800000],['3ABA89',1.5,200000,800000]
 ])near(value(id)*1000*m+start,end,id+': plateau');
 near(value('F45AFF')*2*(293-273),(136-100)*1000,'F45AFF slope');
 near(value('8DC80E')*2*(360-300),60000,'8DC80E slope');
 near(value('72BC5A')*360*(200-100),360000,'72BC5A slope');
 near(value('DAFE0A')/30,60/(380-320),'DAFE0A linear scaling');
 near(value('5745AB')*(15-5)*60,3000,'seconds, not minutes');
 near(value('002BBE')/(15-5),500,'energy per minute');
 near(value('2AAC5D')+(-23+273),400,'Kelvin conversion');
 // Material constants and SI conversions in independent heat balances.
 near(value('E5F0D5'),380*.4*(80-40),'copper uses exam value 380');
 near(value('154098')*500*(450-80),44400*1000,'cast iron kJ');
 near(value('772CBF')*900*(120-40),108000,'unknown mass');
 near(value('687697')*130*.1,260,'lead heating');
 near(value('52B560')*1000,900*6*40,'aluminium 6 kg');
 near(value('A9E423')*1000,900*3*80,'aluminium 3 kg');
 near(value('8AB566')*1000,25000*2,'lead fusion');
 near(value('AD5049')*1000,2300000*2,'water vaporization');
 for(const[id,t,q,m]of[['C5D4F1',47,46400,.4],['BC2CD5',37,47700,.4],['7C455F',37,50200,.5],['C62953',47,46400,.4]]){
  near(130*(327-t)+25000*m,q,id+': two-stage energy');assert.ok(m>0&&m<1);
  if(id==='C5D4F1'||id==='BC2CD5')near(value(id),m,id);else near(value(id)*1000,q,id);
 }
 near(value('DE8578')*100000*2.5,200000,'neon first law');
 near(value('90F3B1')*1000,1.5*100000*.2,'helium internal energy');
 near(1.5*value('1B1B5D')*1000*.4,6000,'neon pressure');
 for(const[id,water]of[['5F7074',.23],['66DF52',.46]])near(value(id)/1000*2300000,water*4200*100,id+': condensation balance');
 near(value('2C5924')/1000*(330000+4200*5),.351*4200*(45-5),'ice and meltwater heating');
 assert.equal(Math.round(.075*4200*50/(330000+4200*5)*1000),value('C6FFCA'));
 near(value('6A33DF')/1000*4200*10,.042*330000,'initial water mass');
 near(value('6C915C')*1.1*4200,.42*330000,'partial melting 420 g');
 near(value('C5D78B')*1.1*4200,.21*330000,'partial melting 210 g');
 near((36-value('E62F93'))*525,.5*4200*(41-36),'bottle complete heat capacity');
 assert.equal(Math.round((.2*4200+.1*460)*(30-23)/(.3*(100-30))),value('CDB542'));
 assert.equal(Math.round(4*.008*(330000+4200*15)/(4200*(30-15))*1000),value('4FD162'));
 // Regression guards for physically necessary stages, not merely a numeric oracle.
 assert.ok(records.CDB542.solution.includes('322 Дж'));
 for(const id of ['2C5924','C6FFCA','4FD162'])assert.ok(records[id].solution.includes('талой вод'));
 for(const id of ['1F08A5','3ABA89'])assert.ok(records[id].solution.includes('кристаллизац'));
}
module.exports={verifyPhysics};
