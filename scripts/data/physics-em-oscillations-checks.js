const assert=require('node:assert/strict');const {records}=require('./physics-em-oscillations');
const close=(a,b,s)=>assert.ok(Math.abs(a-b)<=1e-9*Math.max(1,Math.abs(b)),s+': '+a+' != '+b);
function verifyPhysics(){
 const expected={'468FFB':500,'50A1FE':2,CFDDFB:2,'91A3F0':1,'0A8805':1.5,'7CCC09':3,B3D908:.9,'8F8B08':4,'2C5B74':2,DCBA7F:.005,'003AB3':3,'8A97BF':.5,DEA818:3,'52BC1F':2,'1BC020':36,D9E022:2,'960CD5':2.25,FF285E:1,E8B859:6.25,'8F92A7':.002,'6713EB':8,D2EA3F:12,'2B1340':2,'93A417':.5,CBF6C6:3,'17CD9F':32,'5F286F':16,'445435':32};
 assert.equal(Object.keys(records).length,28);for(const[id,v]of Object.entries(expected)){assert.equal(Number(records[id].answer.replace(',','.')),v,id);assert.ok(records[id].solution.length>800,id);}
 close(500e3*2e-6,1,'frequency and period');for(const[T,w]of[[2e-6,1e6],[.005,400],[.002,1000]])close(T*w,2,'phase increment 2π');
 // Reconstruct LC and energy ratios independently of case fields.
 close(2**2,4,'energy-period ratio');for(const L of[1,4,5])close(.5*L*(1/Math.sqrt(L))**2,.5,'constant magnetic maximum');
 close((1/1.5)**2,4/9,'area and frequency');close((9e-8)/(3e-8),3,'same charge current ratio');close(4*.5**2,1,'same initial voltage');
 for(const[L2,L1,T2,T1]of[[.9,.1,3,1],[4,12,1,Math.sqrt(3)],[36,6,Math.sqrt(6),1],[2.25,1,1.5,1],[1/6.25,1,1/2.5,1]])close(L2/L1,(T2/T1)**2,'switch one coil');
 for(const[T2,T1,LC2,LC1]of[[2,4,1,4],[2,6,1,9],[8,4,4,1],[12,6,4,1],[2,1,4,1],[3,1,18,2],[.5,1,1,4]])close((T2/T1)**2,LC2/LC1,'Thomson reversed');
 const extrema=[1,3,5].map(t=>Math.abs(Math.sin(Math.PI*t/2)));assert.equal(extrema.filter(x=>Math.abs(x-1)<1e-12).length,3);for(const t of[0,2,4,6])close(Math.sin(Math.PI*t/2),0,'electric maximum at zero current');
 const t=[0,1,2,3,4,5,6,7,8,9],charges=[2,1.42,0,-1.42,-2,-1.42,0,1.42,2,1.42],currents=[4,2.83,0,-2.83,-4,-2.83,0,2.83,4,2.83];
 for(let j=0;j<t.length;j++){assert.ok(Math.abs(charges[j]-2*Math.cos(Math.PI*t[j]/4))<.006);assert.ok(Math.abs(currents[j]-4*Math.cos(Math.PI*t[j]/4))<.006);}
 const inductance=(8e-6/(2*Math.PI))**2/(50e-12),L=(8e-6/(2*Math.PI))**2/(405e-12);
 assert.equal(Math.round(inductance*1e3),32);assert.equal(Math.round(.5*L*currents[5]**2*1e3),16);assert.equal(Math.round(.5*L*Math.max(...currents)**2*1e3),32);
 close(2*Math.PI*Math.sqrt(L*405e-12),8e-6,'table reconstructed period');close(.5*L*.004**2/1e-9,32.02249754622,'nan joules');
 return true;
}
module.exports={verifyPhysics};
