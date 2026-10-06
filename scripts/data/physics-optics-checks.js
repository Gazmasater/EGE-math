const assert=require('node:assert/strict');const {records}=require('./physics-optics');
const close=(a,b,s)=>assert.ok(Math.abs(a-b)<1e-8*Math.max(1,Math.abs(b)),s+': '+a+' != '+b);
function verifyPhysics(){
 const answers={'1732F3':60,'2DB2F4':2,AA77F8:40,C771F4:30,'6D59F8':1,'47960C':70,'4D7B06':75,'758809':6,'19F401':44,'99C905':40,EB6D0A:90,'8BB009':3,F3157E:50,D43C7F:90,'56A371':4,'36FCBB':150,'49A315':2,'7BC113':6,'50081F':4,C51412:65,'75F429':.4,CCFF23:2,FF63D6:4,D044DF:40,'31B2DA':30,'330ADE':80,D43150:4,'0439A7':.6,BCB2C7:3,'16F3CC':.6,'217B9D':1,'6B2A9E':3,'84149B':50,'1E75EB':20,'8D29EA':60,'2F5680':68,'9D9E8B':8,'343D86':2,'507D42':90,'5453F0':6250,C274FA:9,AC9F7A:24,B81EB6:24,'6018BE':10,F0FC26:36,'402B55':3,AF195E:.6,'9BA851':30,'97F253':1.5,B86CEB:3,'1BA8ED':19,'078B39':4.4,'0E9287':750};
 assert.equal(Object.keys(records).length,53);for(const[id,a]of Object.entries(answers)){assert.equal(Number(records[id].answer.replace(',','.')),a,id);assert.ok(records[id].solution.length>800,id);}
 // Independent law-of-reflection calculation, including signed rotation of the normal.
 for(const[id,a]of Object.entries({'1732F3':30,AA77F8:20,'19F401':22,'99C905':20,D044DF:20,'31B2DA':15,'1E75EB':10}))close(2*a,answers[id],id);
 for(const[id,a]of Object.entries({C771F4:60,C51412:25,'8D29EA':30}))close(90-a,answers[id],id);
 close(90-30/2,answers['4D7B06'],'surface 30');close(90-44/2,answers['2F5680'],'surface 44');
 for(const[id,initial,rotation]of[['47960C',25,10],['EB6D0A',30,15],['330ADE',30,10],['84149B',35,-10]])close(2*(initial+rotation),answers[id],id);
 for(const[id,d,a,total]of[['758809',2,3,false],['FF63D6',3,-2,false],['F3157E',75,-25,false],['9D9E8B',25,4,false],['D43C7F',80,-35,true],['36FCBB',30,45,true]])close(total?2*(d+a):Math.abs(2*(d+a)-2*d),answers[id],id);
 close(2*(1.2-answers['0439A7']),2*1.2/2,'mirror half');close(2*(.9-answers['16F3CC']),2*.9/3,'mirror third');
 // Reconstruct candidate regions from thin-lens equation in units of F.
 for(const[d,f]of[[3,1.5],[1.5,3],[.5,-1]])close(1/d+1/f,1,'lens region');
 const selections={'6D59F8':['right','above','between',1],'8BB009':['left','axis','beyond',3],'56A371':['right','above','inside',4],'49A315':['left','above','beyond',2],'50081F':['left','above','beyond',4],CCFF23:['right','axis','beyond',2],D43150:['right','above','beyond',4],BCB2C7:['left','below','between',3],'6B2A9E':['right','above','beyond',3],'343D86':['left','below','beyond',2]};
 for(const[id,[side,height,region,number]]of Object.entries(selections)){const r=records[id];assert.deepEqual([r.side,r.height,r.region,Number(r.answer)],[side,height,region,number]);}
 close(3*2,answers['7BC113'],'three grid cells');close(1/30+1/15,1/answers['6018BE'],'grid 20 cm = four cells');
 close(1/.3+1/.6,5,'lens D 5');close(.6/.3,2,'magnification 2');close((.3+.6)*100,answers['507D42'],'total distance');
 close(1/answers.AC9F7A-1/60,1/40,'virtual collecting');close(16/48,1/3,'reduction');close(1/48-1/16,-1/answers.B81EB6,'diverging');
 close(1/.6+1/.3,5,'image height lens');close(6*.3/.6,answers['402B55'],'image height');
 close(1/answers.AF195E+1/(5*answers.AF195E),1/.5,'object from magnification');
 close(1/(answers['9BA851']/100)+1/.15,10,'object D10');close(1/3+1/answers['97F253'],1,'image D1');
 close(.5*.0002*2**2*1000,answers['75F429'],'coil millijoules');
 // Reverse substitutions into grating maximum and wavelength-frequency laws.
 close(.2*500e-9/(answers['5453F0']*1e-9),.016,'period nanometres');
 const period=.21*(3e8/8e14)/.018;assert.equal(Number((period*1e6).toFixed(1)),answers['078B39']);
 for(const[id,d,lambda,all]of[['C274FA',2e-6,420e-9,true],['1BA8ED',4e-6,420e-9,true],['B86CEB',1e-3/500,550e-9,false]]){let k=0;while((k+1)*lambda<d)k++;assert.ok(k*lambda<d&&(k+1)*lambda>d);assert.equal(all?2*k+1:k,answers[id]);}
 close(50e-6*(answers.F0FC26/1000)/1.5,2*.6e-6,'second order displacement');
 const wave=3e8/(answers['0E9287']*1e12);close(.2*wave/5e-6,.016,'frequency teraHertz');
 return true;
}
module.exports={verifyPhysics};
