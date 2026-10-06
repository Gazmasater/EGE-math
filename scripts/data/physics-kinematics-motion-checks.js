const assert=require('node:assert/strict'),{records}=require('./physics-kinematics-motion');
function verifyPhysics(){
 const expected={'8A3445':2,B5CFF9:2,'913207':2,'3CF615':-4,'5E532C':50,B5F7C7:2,A32BC5:20};
 const got={'8A3445':Math.sqrt(2*2),B5CFF9:1/(.5**2*2),'913207':Math.sqrt(4),'3CF615':(23+5*2-2*4)-2*(23+5-2)+23,'5E532C':50*30/(50-20),B5F7C7:2*20/(5+3*5),A32BC5:(15+5)*2/2};
 for(const[id,n]of Object.entries(expected)){assert.equal(got[id],n,id);assert.equal(Number(records[id].answer.replace('−','-')),n,id);}
 assert.equal(5+5*got.B5F7C7,15);assert.equal(5*2+.5*5*4,20);
 assert.equal(15-5*2,15/3);assert.equal(15*2-.5*5*4,got.A32BC5);
 assert.equal(50*1,30+20*1);
 for(const u of [1,3,5])for(const R of [1,2,5])assert.equal((2*u)**2/(4*R),u*u/R);
 return true;
}
module.exports={verifyPhysics};
