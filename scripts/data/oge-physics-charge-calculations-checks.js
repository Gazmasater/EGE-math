const assert=require('node:assert/strict');
const models=require('./oge-physics-charge-calculations-models.json');
const sources=require('./oge-physics-charge-calculations-sources.json');
module.exports=prepared=>{
 const rows=new Map(prepared.map(r=>[r.id.slice(7),r]));
 const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
 const sum=xs=>xs.reduce((s,x)=>s+x,0);
 const contact=(charges,a,b)=>{
  const next=[...charges],total=sum(charges),equilibrium=(charges[a]+charges[b])/2;
  next[a]=equilibrium;next[b]=equilibrium;
  close(sum(next),total);close(next[a],next[b]);return next;
 };
 let count=0;
 for(const [id,m]of Object.entries(models)){
  count++;const r=rows.get(id),source=sources['OGEPHYS'+id];assert.ok(r,id);
  const actual=Number(r.answer.replace(',','.').replace('−','-'));
  if(m.kind==='coulomb'){
   assert.match(source.fipiCondition,new RegExp('зарядов увеличить в '+m.a+' раза'));
   assert.match(source.fipiCondition,new RegExp('расстояние между ними '+(m.b<1?'уменьшить':'увеличить')+' в 2 раза'));
   for(const [q1,q2,distance]of [[1e-9,3e-9,.2],[-2e-9,5e-9,.7],[3e-9,-4e-9,1]]){
    const force=(a,b,r)=>9e9*Math.abs(a*b)/(r*r),initial=force(q1,q2,distance),final=force(q1*m.a,q2*m.a,distance*m.b);
    close(final/initial,actual);assert.ok(final>initial);
   }
   assert.equal(source.match,'method');
  }else if(m.kind==='pair'){
   const final=contact(m.initial,0,1);close(actual,final[m.target-1]);
   assert.equal(Math.sign(actual),Math.sign(sum(m.initial)));assert.match(r.solution,/не модули/);
  }else{
   const first=contact(m.initial,0,1),last=contact(first,0,2);
   close(last[1],first[1]);close(sum(last),sum(m.initial));
   if(m.kind==='sequence')close(actual,last[m.target-1]);
   else if(m.kind==='ratio-sequence'){
    close(actual,Math.abs(m.initial[m.target-1]/last[m.target-1]));assert.ok(first[0]<0);assert.equal(source.discrepancy.status,'resolved');
   }else throw new Error('Unknown charge calculation '+m.kind);
   assert.match(r.solution,/второй шарик|шарик 2/);
  }
 }
 assert.equal(count,21);
};
