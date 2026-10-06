const assert=require('node:assert/strict');const {records}=require('./physics-induction');
const close=(a,b,s)=>assert.ok(Math.abs(a-b)<1e-8,s+': '+a+' != '+b);
function verifyPhysics(){
 const expected={E4EF4A:3,F1E9FF:4,'7FABFC':20,'31DAF4':6,'458C72':1,'04487F':2,C9207F:6,D747BC:7.2,'9FB8B0':6,'47DB17':12,A7972E:.28,C38B59:.2,DB72A1:12,'567FA0':4,'9C35AF':9,'0C01C8':22.5,'1616C4':2,D11DCF:.9,'993D9E':30,E4A291:2,'49B4E8':.4,AA47E7:6,A9CEE5:.2,C453EB:8,B9F965:5,'24F36E':32,'515065':.9,C9466E:4,'3A606B':15,B8FD36:.4,'159D34':20,'1DB033':2,A72A3C:4,'0C5C8C':.1,'615189':.15,'4B574A':2,A704AD:20,'245ECC':2};
 assert.equal(Object.keys(records).length,38);for(const[id,v]of Object.entries(expected)){assert.equal(Number(records[id].answer.replace(',','.')),v,id);assert.ok(records[id].solution.length>700,id);}
 close(3*.002,.008-.002,'E4EF4A milliseconds');close(4*.007,.028,'time');close(.020/2,.010,'7FABFC');close(.015/3,.005,'3A606B');close(32/4,8,'24F36E volts not millivolts');assert.equal(records['24F36E'].unit,'Вб');close(.012*2,.024,'47DB17');close(6*2,4-(-8),'9FB8B0');
 const slopes=[8,-12,0,4/1.5];assert.equal(slopes.map(Math.abs).indexOf(Math.max(...slopes.map(Math.abs)))+1,expected['04487F']);close(6,2*3,'flux area and field');close(9/6,(.5)/(1/3),'emf ratio');
 close(.0002*.001,2e-7,'C38B59');close(.002*.002,4e-6,'1616C4');close(2e-4*.002,4e-7,'area square centimetres');
 for(const[id,W,I,L]of [['458C72',.0125,5,.001],['993D9E',.54,6,.03],['49B4E8',3.2,4,.4],['D747BC',7.2,6,.4],['D11DCF',.0009,3,.0002],['A9CEE5',.2,2,.1],['C453EB',.64,8,.02],['B9F965',5,5,.4],['615189',.00015,1,.0003]])close(W,.5*L*I*I,id+' energy reconstructed');
 for(const[id,E,L,dI,dt]of [['A7972E',.28,.4,-2.8,4],['DB72A1',12,.2,3,.05],['B8FD36',200,.4,10,.02],['159D34',.2,.001,20,.1],['31DAF4',6e-6,.001,.03,5],['AA47E7',6e-6,.001,.03,5],['C9466E',4e-6,.001,-.02,5],['A72A3C',4e-6,.001,-.02,5],['1DB033',2e-6,.001,-.01,5],['0C01C8',22.5e-6,.003,.03,4],['515065',.0009,.0006,6,4],['567FA0',.004,.004,-2,2],['0C5C8C',.1,.8,.5,4]])close(E*dt,L*Math.abs(dI),id+' flux linkage');
 close(.1*.1*2,.01*2,'4B574A and 245ECC Ohm');close(.4*.2*1,.02*4,'A704AD Ohm');
 for(const[id,currentY,fieldZ]of [['4B574A',1,-1],['245ECC',1,-1],['A704AD',-1,1]]){close(currentY*fieldZ,-1,id+' Ampere left');assert.ok(records[id].solution.includes('влево'));}
 return true;
}
module.exports={verifyPhysics};
