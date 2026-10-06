const assert=require('node:assert/strict');
const {records}=require('./physics-oscillations-short');
const close=(a,b,s)=>assert.ok(Math.abs(a-b)<1e-9,s+': '+a+' != '+b);
function verifyPhysics(){
 const expected={C36A4C:3,A784FF:2720,'3F1DFE':1,B86809:1600,'58600D':3,'62230B':.25,'582672':.2,'6DEE76':1,'1B36B0':.1,'1BF6BB':2,A29DBB:.5,'86B9BA':.5,'184319':85,'991714':100,'925813':5,E77512:.5,E92D12:.005,E17F18:125,'4D1A28':2,'04652B':.04,'581129':4000,'4E8F5A':.17,AEAD5B:1.5,C480A8:2.25,C95CC8:.4,FF9DEF:.125,'85F7E0':2000,'0A7D69':500,'9DE065':3,'66AE6D':.45,'8FA66F':200,'407C39':4,F7403B:4,'584536':2,D2EF85:.64,C33B81:400,'39CA85':3,'8C8B86':1.6,BC821C:2};
 assert.equal(Object.keys(records).length,39);
 for(const[id,v]of Object.entries(expected)){assert.equal(Number(records[id].answer.replace(',','.')),v,id);assert.ok(records[id].solution.includes('Проверка.'),id);assert.ok(records[id].solution.length>=700,id);}
 // Primary values and independently reconstructed cycles, not generated case data.
 close(expected.C36A4C,Math.sqrt(9),'pendulum frequency');close(expected['58600D'],Math.sqrt(9),'pendulum mass cancels');close(expected['9DE065'],Math.sqrt(9),'pendulum period');close(expected['8C8B86'],1.6,'pendulum unchanged');
 close(Math.sqrt(400/expected.B86809),.5,'spring k400');close(Math.sqrt(50/expected['8FA66F']),.5,'spring k50');
 close(Math.sqrt(expected['1B36B0']/.4),.5,'m0.4');close(Math.sqrt(expected['04652B']/.16),.5,'m0.16');close(Math.sqrt(expected.C33B81/100),2,'mass grams');close(Math.sqrt(.16/expected.D2EF85),.5,'half frequency');close(Math.sqrt(expected.C480A8),1.5,'ratio square');close(expected.F7403B/2,Math.sqrt(4),'T with m4');close(expected['6DEE76']/.5,Math.sqrt(2/.5),'T m2 khalf');close(expected['1BF6BB']/4,1/Math.sqrt(4),'nu m4');
 for(const[id,T]of [['62230B',1],['86B9BA',2],['E77512',2],['66AE6D',1.8],['582672',.8]]){close(Math.cos(2*Math.PI*expected[id]/T)**2,0,id+' energy');assert.ok(expected[id]>0&&expected[id]<T/2);}
 close(Math.cos(2*Math.PI*expected.FF9DEF)**2,.5,'half U');close(Math.sin(2*Math.PI*expected.C95CC8/1.6),1,'first amplitude');close(1/expected.BC821C/2,.25,'2A path');close(.1*(1-Math.cos(2*Math.PI*expected.BC821C*.25)),.2,'spring travelled distance');
 close(expected.E17F18*8e-3,1,'milliseconds');assert.notEqual(expected.E17F18,.125);close(expected['4D1A28'],4/2,'nu2 to nu1');close(expected['584536'],4/2,'nu1 to nu2');
 close(expected.A29DBB*12,6,'crest spacing');close(expected.E92D12*1000,5,'wave period');close(expected['581129']*1.25,5000,'steel');close(expected['85F7E0']*.75,1500,'water centimetres');close(expected['0A7D69']*.68,340,'string');close(expected['4E8F5A']*2000,340,'kilohertz');close(expected['991714'],6000/60,'range');close(expected['407C39'],320/80,'voice');
 close(expected.A784FF/340,8,'thunder');close(expected.AEAD5B*340,510,'pile');close(expected['3F1DFE']*340,2*170,'shaft170');close(expected['184319']*2/340,.5,'shaft echo depth');close(expected['925813']*340,2*850,'hunter echo');close(expected['39CA85'],(1+2)*1,'tree halfway');
 assert.ok(records['582672'].solution.includes('cos²'));assert.ok(records.E77512.solution.includes('sin'));assert.ok(records.FF9DEF.solution.includes('гравитационной'));assert.ok(records.E17F18.solution.includes('10⁻³'));assert.equal(records.C33B81.unit,'г');
 return true;
}
module.exports={verifyPhysics};
