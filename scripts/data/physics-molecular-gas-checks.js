const assert=require('node:assert/strict');
const {records}=require('./physics-molecular-gas');
function verifyPhysics(){
 const checked=new Set();
 const close=(x,y,label)=>assert.ok(Math.abs(x-y)<1e-8*Math.max(1,Math.abs(y)),label+': '+x+' ≠ '+y);
 const answer=(id,value)=>{assert.ok(!checked.has(id),id+': duplicate check');checked.add(id);close(Number(records[id].answer.replace(',','.')),value,id);};
 // Independent algebra from FIPI numerical data, not the generation parameters.
 for(const[id,n]of Object.entries({
  '2A4D4B':400/2,DC7C46:600/(4-1),AD774B:2*2,A15641:280/140,
  '9D4F49':180/3*2,'9B7E46':5/2,'0F98F4':2*2,C306FD:200*3,
  '3845F2':3,'8E16FE':20*3*2,FB590C:(1600000-400000)/6/1000,
  '767F05':300*2/3,'575105':500/2.5,'03BD78':3*2/6/2,
  '54C671':5**2,AB117F:300/(2-1),'625778':16,'38447B':1*2/2,
  CA98BA:(1+3)/1/2,'3AB2B2':5/2,'8CBF1A':600/2,'497121':3/2,
  '1B362C':600/(4-1),'530821':273*3,A0FBDF:3*2/2/3,'473250':630*3,
  B5155F:1*2*1200/(6*800),D2BF5C:250*2,'5F4252':250*40/20,A6655C:600/150,
  A71656:4,'66BE55':4*2,'7D6DA1':2*2,'772AAE':150*3*2,D4E1A5:1.4,
  A11EAF:5,'63F2AD':6/2,'4BADC2':600/3,F0E1C0:5*2,'8BADC9':3/(3-2)*2,
  '87FFC6':4/2,'4D0A9D':6/2,'02219A':Math.sqrt(4),'7DA290':(200000-50000)/.5/1000,
  '199792':3/(3-1)*2,A1DD9C:300*(3-.6)/3,'349197':(127+273)/(227+273),
  '4B93E3':1.5*6/3*.5/.5,B0ADE8:1000/2/2,EBBFEA:450/3,'6F15E5':4*2*300/(4*600),
  '6F45EE':60/3*1.5,'7F8167':100*450/300,'7EA666':4*3/(3*1),B1BE6D:4.5/1.5,
  B86966:100/4,C7526A:3,'6AB76B':1*4*600/(.5*300),'67AF6A':75/(2-1),
  '0A2D3E':150*3,'5B8A38':4,CFC43F:270*.3/.2,'9BE634':250*2,'918F36':3**2,
  '3C0734':6/3,CCB480:6/2,'302781':160*2/4,'85478A':600/(3-1)*3,'7ABC47':150*2/3,
  '79B504':Math.round(20000*.25/(8.31*300)),'0BFF12':300/(2-1),
  '7C8A5D':300*(4000+8000)*.7/(4000*1.5),'4C6FA1':(177+273)/(27+273),
  '0771EE':Math.round(6000*.1/(8.31*300)*100)/100,'192F48':33000/330000,
  '5311FD':2*4/(4*1)
 }))answer(id,n);
 // Saturation must cap pressure only after the condensation threshold.
 for(const[id,p,compression]of[['480A51',40,3],['82225A',40,4],['8C933B',60,3],['890891',20,4]]){
  const final=Math.min(p*compression,100);answer(id,final);
  const vaporFraction=final/(p*compression);assert.ok(vaporFraction>0&&vaporFraction<=1);
  if(final<100)close(vaporFraction,1,id+': no condensation');else assert.ok(vaporFraction<1);
 }
 // Equilibrium forces and the molecular kinetic equation, in arbitrary consistent units.
 for(const[id,n1,n2,E1,E2]of[['0A3E4F',1,3,6,2],['2B4653',4,4,7,7]]){
  close(2*n1*E1/3,2*n2*E2/3,id+': equal pressure');answer(id,E1/E2);
 }
 const k=1.380649e-23;
 assert.ok(records['480A51'].solution.includes('⟦5¦6⟧'),'Steam mass fraction must stay exact');
 assert.ok(records['8C933B'].solution.includes('⟦5¦3⟧')&&records['8C933B'].solution.includes('⟦5¦9⟧'),'Steam threshold and mass fraction must stay exact');
 const pistonN1=240000/(k*400),pistonN2=240000/(k*400);answer('51DB62',pistonN1/pistonN2);
 answer('95F351',(2/3*4*6)/(2/3*4*6));
 // Read the arrows and axes independently. The numbers name segments, not endpoints.
 const vt=[{id:1,T1:1,T2:1,V1:3,V2:1},{id:2,T1:1,T2:2,V1:1,V2:1},{id:3,T1:2,T2:3,V1:1,V2:2},{id:4,T1:3,T2:3,V1:2,V2:3}];
 answer('8E6063',vt.find(x=>x.T1===x.T2&&x.V2<x.V1).id);
 const pt=vt.map(({id,T1,T2,V1,V2})=>({id,T1,T2,p1:V1,p2:V2}));
 answer('6D9B38',pt.find(x=>x.T1===x.T2&&x.T2/x.p2>x.T1/x.p1).id);
 // Back substitutions and edge cases protect the graph readings and unit scales.
 close(.5*1e5*6e-3/1200,1e5*2e-3/800,'B5155F table');
 close(1e5*4e-3/300,4e5*2e-3/600,'6F15E5 table');
 close(1e5*4e-3/300,.5e5*16e-3/600,'6AB76B table');
 close(4000*1.5/300,12000*.7/420,'7C8A5D graph');
 const ratios=[[300,.1],[600,.1],[300,.05],[600,.05]].map(([T,V])=>T/V);
 assert.equal(Math.min(...ratios),3000);assert.deepEqual(ratios.map(n=>n/3000),[1,2,2,4]);
 assert.ok(Math.abs(2*8.31*300/.25/20000-1)<.01,'79B504 rounded value');
 assert.ok(records.A71656.solution.includes('T₂ = ⟦T₁¦4⟧'));
 assert.ok(!records.A71656.solution.includes('400 К'),'Do not invent absolute temperatures');
 assert.ok(records['95F351'].solution.includes('неподвижность не требует равенства давлений'));
 assert.ok(records['199792'].solution.includes('уменьшится в 3 раза'));
 assert.equal(checked.size,86);assert.deepEqual([...checked].sort(),Object.keys(records).sort());
}
module.exports={verifyPhysics};
