const assert=require('node:assert/strict');
const expected={ADA046:18,E9E545:7,A9DBFB:200,'992AF2':30,'3484FF':10,'006900':12,'02CE71':.06,B34015:10,CF941A:45.36,'97E216':1.5,DFF32B:200,'6F9C25':.4,'7998DB':.25,'77CDD1':10,A700D9:.8,CF0AD6:20,'354CDE':0,BD865C:4,'1C4DA4':.5,'1F9FAE':6,B41DCC:1500,'225EC6':20,DB66C7:50,D593C1:.875,'343CC0':.08,'415D9E':80,'2C8C91':20,C36B96:2.5,A437EB:.6,ACEFE9:.1,CCF8E4:15,'6C32ED':10,'4C1063':48,BBF36E:.9,'525C6A':1.5,'59B436':.4,E88C88:25,F1AFB8:50,'36EBB6':12,B3B917:1600,'72C721':2,'2785A3':.2,AD1398:50};
const close=(a,b,id)=>assert.ok(Math.abs(a-b)<1e-8,id+': '+a+' != '+b);
function verifyPhysics(){
 const {records}=require('./physics-energy');assert.deepEqual(Object.keys(records).sort(),Object.keys(expected).sort());
 for(const[id,n]of Object.entries(expected))close(Number(records[id].answer.replace(',','.')),n,id);
 // Reverse energy balances independently reconstructed from the primary numbers.
 for(const[id,m,h]of [['A9DBFB',1,20],['992AF2',.3,10],['02CE71',.03,.2],['97E216',.05,3],['343CC0',.04,.2],['4C1063',.6,8]])close(expected[id]/m/10,h,id+' reverse height');
 for(const[id,m,K]of [['3484FF',.2,20],['006900',.2,24],['6F9C25',.01,.04],['A700D9',.02,.16],['CF0AD6',1.5,300],['2C8C91',1,200]])close(m*10*expected[id],K,id+' restored energy');
 for(const[id,m,v,factor]of [['CF941A',.28,18,1],['DFF32B',1000,20,1000],['DB66C7',1000,10,1000],['E88C88',500,10,1000],['C36B96',.05,10,1],['BBF36E',.2,3,1]])close(Math.sqrt(2*expected[id]*factor/m),v,id+' reverse velocity');
 close(.1*10*expected.E9E545-1,6,'loss-height');close(expected['415D9E']+20,.1*10*100,'loss-energy');close(expected.A437EB*10*10-10,50,'loss-mass');
 close(10*Math.sin(Math.PI/6),5,'slope geometry');close(expected['77CDD1']**2/2/10,5,'slope speed');close(expected.B34015*Math.sin(Math.PI/6),10**2/2/10,'slope length');close(expected.BD865C**2/2/10,.8,'down speed');
 close(expected.ACEFE9*2**2/2,.2,'hill mass from v');close(expected.CCF8E4*10*3,450,'hill mass');
 close(expected['7998DB']*4,1,'mass ratio');close(expected.B41DCC*3,4500,'bridge');
 close(expected['225EC6']*50,1000,'work');close(expected['6C32ED']*50,500,'work horizontal');
 close((.1*10*2.5-.1*10*1),expected['525C6A'],'potential change');close(10-10,expected['354CDE'],'closed gravity work');
 const kA=2*6/.03**2,kD=2*2/.02**2;close(kA*.06**2/2-6,expected.ADA046,'spring growth');close(2-kD*.015**2/2,expected.D593C1,'spring decrease');
 close((40*.01**2/2)/(20*.02**2/2),expected['1C4DA4'],'spring ratio');close(Math.sqrt(2*expected['1F9FAE']/7500),.04,'spring deformation');
 close(18*expected['59B436']**2,2.88,'Mercury reverse force ratio');
 close(100*expected.F1AFB8,50*10*10,'friction work');close(expected['2785A3']*50,10,'coefficient');close(.2*expected.AD1398,10,'distance');close(200/(2*2),50,'independent braking kinematics');
 const V=Math.sqrt(2*expected['36EBB6']/24);close(V,1,'cart velocity');close(24*V,6*8*Math.cos(Math.PI/3),'cart impulse');assert.ok(expected['36EBB6']<6*8**2/2);
 close(expected.B3B917*.05**2/2,.1*10*2,'gun energy');
 const massExact=.2/100.2;close(massExact*10**2/2+massExact*10*.01,2000*.01**2/2,'vertical spring full balance');close(Math.round(massExact*1000),expected['72C721'],'rounded grams');assert.ok(Math.abs(massExact-.002)/massExact<=.00200001);
 assert.ok(records['72C721'].solution.includes('mgx')&&records['72C721'].solution.includes('округляем'));
 assert.ok(records['225EC6'].solution.includes('cosθ'));assert.equal(require('./physics-type-reviews.json')['59B436'].type,'dynamics.gravity');
 return true;
}
module.exports={verifyPhysics};
