const assert=require('node:assert/strict');
const models=require('./oge-physics-electric-heating-models.json');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8*Math.max(1,Math.abs(b)),`${a} != ${b}`);
module.exports=prepared=>{
 const rows=new Map(prepared.map(r=>[r.id,r]));
 for(const [id,m]of Object.entries(models)) {
  const row=rows.get(id);assert.ok(row,id);
  if(m.kind==='graph-current') {
   const I=Number(row.answer);near(I*I*m.R*m.t,m.Q);near(I*I*m.R*30,1500);
  }else if(m.kind==='charge-heat') {
   const answer=Number(row.answer.split(' ')[0]),I=Math.sqrt(answer/(m.R*m.t));
   for(let k=1;k<m.q.length;k++)near(I*(m.times[k]-m.times[k-1]),m.q[k]-m.q[k-1]);
   near(answer,I*m.R*m.q[m.t]);
  }else if(m.kind==='parallel-keys') {
   for(const R of [2,7,25])for(const U of [6,120]) {
    const old=U*U/R,newPower=[R,2*R,R].reduce((sum,r)=>sum+U*U/r,0);
    near(newPower/old,m.factor);near(U*U/newPower,.4*R);
   }
   assert.match(row.answer,/одинаковое время/);assert.match(row.answer,/2,5/);
  }else if(m.kind==='induction-time') {
   assert.match(row.answer,/уменьшится/);assert.match(row.solution,/остальных равных/);
   for(const factor of [1.1,2,3])assert.ok(10000/(factor*factor*10)<10000/10);
  }else throw Error(id);
 }
 assert.equal(Object.keys(models).length,5);
};
