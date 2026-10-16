const assert=require('node:assert/strict');
const models=require('./oge-physics-electric-work-power-models.json');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const number=s=>Number(s.match(/^[\d,.]+/)[0].replace(',','.'));
module.exports=prepared=>{
 const rows=new Map(prepared.map(r=>[r.id,r]));
 for(const [id,m]of Object.entries(models)) {
  const row=rows.get(id);assert.ok(row,id);const answer=number(row.answer);
  if(m.kind==='six') {
   // Recover every current from the submitted power, then test node conservation
   // and the supply voltage along complete paths through the primary diagram.
   const branch=Math.sqrt(answer/m.values[m.target-1]);
   const total=branch*(m.target===6?1:m.target===4?2:3);
   const currents=[total/3,total/3,total/3,total/2,total/2,total];
   const voltage=currents.map((I,k)=>I*m.values[k]);
   near(currents[0]+currents[1]+currents[2],total);near(currents[3]+currents[4],total);
   for(let a=0;a<3;a++)for(let b=3;b<5;b++)near(voltage[a]+voltage[b]+voltage[5],m.U);
   near(currents.reduce((sum,I,k)=>sum+I*I*m.values[k],0),m.U*total);
  }else if(m.kind==='five') {
   const branch=Math.sqrt(answer/m.values[m.target-1]),total=branch*(m.target===4?4:2);
   const currents=[total,total/2,total/2,total/4,total/4],V=currents.map((I,k)=>I*m.values[k]);
   near(currents[0],currents[1]+currents[2]);near(currents[2],currents[3]+currents[4]);
   near(V[1],V[2]+V[3]);near(V[1],V[2]+V[4]);near(V[0]+V[1],m.U);
   near(currents.reduce((sum,I,k)=>sum+I*I*m.values[k],0),m.U*total);
  }else if(m.kind==='unknown-resistance') {
   const I=m.U/(m.R1+answer);near(I*I*m.R1,m.P1);assert.ok(answer>0);
  }else if(m.kind==='appliances') {
   const U=220,P1=U*U/100,P2=U*U/200;
   const before=m.added?P1:P1+P2,after=m.added?P1+P2:P1;
   const rb=U*U/before,ra=U*U/after;
   assert.equal(row.answer,(ra>rb?'1':'2')+(after>before?'1':'2'));
  }else throw Error(id+': unknown kind');
 }
 assert.equal(Object.keys(models).length,10);
};
