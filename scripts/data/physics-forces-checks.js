const assert=require('node:assert/strict');
const expected={'2CB64F':.15,'2622F3':2,'242172':32,'249978':10,'1E061B':3,'19872D':63,'41AB52':1.5,'414B58':180,EC6256:6,C6B6AB:80,'64F9A6':70,'9B55C6':5,'82C6CD':6,'4D1B9A':24,F65695:6,'12E192':2,C644EA:.5,'19F564':2,E24869:8,'5E2935':3,'973C3C':16,'1DEB4C':1,'150AE7':6};
const close=(a,b,id)=>assert.ok(Math.abs(a-b)<1e-9,id+': '+a+' != '+b);
function verifyPhysics(){
 const {records}=require('./physics-forces');assert.deepEqual(Object.keys(records).sort(),Object.keys(expected).sort());
 for(const[id,v]of Object.entries(expected))close(Number(records[id].answer.replace(',','.')),v,id);
 // Обратная подстановка в независимые численные модели первого и второго опыта.
 const comparisons={
  '2CB64F':[[10,.6],[20,.15],.5],'2622F3':[[8,2],[4,.5],.125],
  '242172':[[8,2],[32,1],2],'249978':[[8,5],[10,4],1],
  '19872D':[[10,7],[9,7],.9],'41AB52':[[3,3],[1.5,12],2],
  '414B58':[[5,10],[9,20],3.6],EC6256:[[12,2],[2,6],.5],
  C6B6AB:[[5,10],[8,10],1.6],'64F9A6':[[10,10],[10,7],.7],
  '82C6CD':[[3,8],[6,2],.5],F65695:[[5,10],[6,10],1.2],
  C644EA:[[4,2],[.5,8],.5],'19F564':[[5,3],[7.5,2],1],
  E24869:[[8,5],[5,8],1],'973C3C':[[10,4],[5,16],2]
 };
 for(const[id,[[m0,a0],[m,a],rf]]of Object.entries(comparisons))close((m*a)/(m0*a0),rf,id+' inverse force ratio');
 const vectors={'1E061B':[[-3,-2],[0,2]],'9B55C6':[[4,0],[0,-2],[0,5]],'12E192':[[-2,0],[0,3],[0,-3],[4,0]],'5E2935':[[3,2],[0,-2]]};
 for(const[id,v]of Object.entries(vectors)){assert.deepEqual(records[id].vectors,v);const x=v.reduce((s,a)=>s+a[0],0),y=v.reduce((s,a)=>s+a[1],0);close(Math.hypot(x,y),expected[id],id+' vector sum');}
 close(24*.25,6,'graph endpoint');close(24*.125,3,'graph midpoint');
 close((12-4)/2,4,'leading body acceleration');close(4/1,4,'trailing body acceleration');close(12/(2+1),4,'whole pair');
 const M=1,T=6,m=3/7;close((M*10-T)/M,4,'left down');close((T-m*10)/m,4,'right up');close((M-m)*10/(M+m),4,'Atwood independent');
 close(4*1,4,'velocity after 1 s');assert.ok(T>0&&T<M*10&&M>m);
 return true;
}
module.exports={verifyPhysics};
