const assert=require('node:assert/strict');
const expected={B02B49:36,F579FA:1000,'72C7F7':2,C591F2:3,'568701':3,CDB87D:4,'8CAE7B':15,'72BBB5':32,'9BBABD':1.8,'107015':4,'24A417':3,DC8C1F:10,'3DC615':45,E7132C:4,'0804DD':1,'1BB6D6':6,DC2D53:72,A8FA51:50,E83B50:12,BDB0A9:30,'5286A9':256,'3A25A1':10,'730AC9':40,C54EC4:8,CC7EC8:105,'32DAC5':50,A8589E:.5,'9E3095':48,DEA9ED:3,'7F2D66':106,BF8368:2,'26C665':5,'478280':1.4,F46783:4500,'45B12B':800,'8CED26':3,'5E35A7':500,'8CC9AB':2,'2FB793':400,'434D31':6,FC2D8A:4};
const close=(a,b,id)=>assert.ok(Math.abs(a-b)<1e-8,id+': '+a+' != '+b);
function verifyPhysics(){
 const {records}=require('./physics-momentum');assert.deepEqual(Object.keys(records).sort(),Object.keys(expected).sort());
 for(const[id,n]of Object.entries(expected))close(Number(records[id].answer.replace(',','.')),n,id);
 // Independent initial/final momentum examples, including braking and uncertain direction.
 const impulses={B02B49:[12,3,10,46],'72BBB5':[8,4,60,92],'3DC615':[15,3,100,55],DC2D53:[24,3,100,172],E83B50:[1.5,8,20,8],'5286A9':[32,8,300,556],'730AC9':[10,4,90,50],'9E3095':[12,4,60,108]};
 for(const[id,[F,t,p0,p]]of Object.entries(impulses)){close(Math.abs(p-p0),F*t,id+' impulse balance');close(expected[id],Math.abs(p-p0),id+' absolute change');}
 const finals={'8CAE7B':[15,5,4,35],BDB0A9:[30,9,2,48],C54EC4:[8,6,8,56],A8FA51:[20,10,3,50],CC7EC8:[30,15,5,105],'32DAC5':[10,10,4,50],'7F2D66':[40,22,3,106]};
 for(const[id,[p0,F,t,p]]of Object.entries(finals))close(p0+F*t,p,id);
 for(const[id,F,D]of [['C591F2',8,24],['CDB87D',1.5,6],['26C665',2.5,12.5]])close(expected[id]*F,D,id+' time');
 close(4*2,8,'force 107015');close(6*4,24,'force 1BB6D6');close(4*3,2*6,'E7132C');
 close(6*2-4*3,0,'568701 stop');close(1*10,5*2,'3A25A1 start');close(100-30*2,40,'BF8368 braking');assert.ok(30/15<5&&40/22<3);
 close(3000*10/(1000*20),1.5,'F579FA');close(4500*(60/3.6)/(1500*(90/3.6)),2,'F46783');
 for(const[id,rm,rp]of [['72C7F7',2.5,5],['24A417',2,6],['DEA9ED',2,6],['A8589E',8,4]])close(expected[id]*rm,rp,id+' ratio inverse');
 close(1.8/6,.3,'9BBABD');close(1.4*2,2.8,'478280');
 close(Math.hypot(-6,-8),10,'DC8C1F');close(Math.hypot(-.6,-.8),1,'0804DD');
 close(1*800*.5,2*200,'45B12B x');close(400*Math.sqrt(3)-800*Math.sin(Math.PI/3),0,'45B12B y');
 close(1*400*.5,2*100,'8CC9AB x');close(200*Math.sqrt(3)-400*Math.sin(Math.PI/3),0,'8CC9AB y');
 close(400*1,2*200,'5E35A7 x');close(300-300,0,'5E35A7 y');close(Math.hypot(400,-300),500,'5E35A7 speed');
 close(200-400*Math.sin(Math.PI/6),0,'2FB793 y');close(2*100*Math.sqrt(3),400*Math.cos(Math.PI/6),'2FB793 x');
 close(3*1-1*1,(3+1)*.5,'8CED26');
 close(3*6*.5,(15+3)*.5,'434D31 impulse');close(.5*18*.5**2,2.25,'434D31 final energy');
 close(1*6+2*3,(1+2)*4,'FC2D8A numerical example');assert.equal(records.FC2D8A.answer,'4');assert.ok(records['730AC9'].solution.includes('знак приращения'));
 return true;
}
module.exports={verifyPhysics};
