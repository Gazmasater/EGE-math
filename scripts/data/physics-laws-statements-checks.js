const assert=require('node:assert/strict');
const {records,laws}=require('./physics-laws-statements');
// Independently solved from the archived FIPI wording before creating the explanations.
const expected={
 '0FDA4F':'134','A11646':'24','C2CF4D':'145','826D45':'35','2449F3':'145','C578FC':'45','EB01F1':'25','8213F0':'135','703275':'35','AD5973':'125','E70C7D':'124','A1CBB8':'124','024D10':'34','A24315':'145','46BA23':'125','2D8929':'23','D1BB2D':'125','9F4E22':'35','970E28':'145','EEAE26':'24','E66028':'345','4B89D5':'35','0210D3':'124','7163D1':'25','1413DE':'134','AA8BDA':'124','6CBC57':'35','1310AB':'25','D92DAA':'134','F6F1C5':'35','20FDCD':'234','027C91':'235','5A149B':'45','623596':'34','368BED':'35','3CB5E8':'45','777063':'13','B2096F':'145','19DE61':'25','9E0663':'134','51433E':'24','4AE181':'45','87EE89':'34'
};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
function verifyPhysics(){
 assert.deepEqual(Object.keys(records).sort(),Object.keys(expected).sort());
 for(const r of Object.values(records)){
  assert.equal(r.answer,expected[r.id],r.id);assert.equal(r.claims.length,5);assert.equal(r.stages.length,5);
  assert.ok(r.solution.length>1500,r.id);assert.ok(!/undefined|NaN|\//.test(r.solution),r.id);
  for(const c of r.claims)assert.ok(laws[c.law]&&c.statement.length>30,r.id);
 }
 // Numerical counterexamples to the misleading proportionalities and conservation claims.
 for(const x of[.2,1,3])for(const k of[2,5]){
  const spring=y=>.5*k*y*y;near(spring(2*x)/spring(x),4);
  const L=k,C=x,I=2*x,q=3*x,wl=i=>.5*L*i*i,wc=c=>q*q/(2*c);
  near(wl(2*I)/wl(I),4);near(wc(2*C)/wc(C),.5);
  const period=(l,c)=>2*Math.PI*Math.sqrt(l*c);
  near(period(4*L,C)/period(L,C),2);near(period(L,4*C)/period(L,C),2);
  const force=(q1,q2,r,eps=1)=>q1*q2/(eps*r*r);
  near(force(k,x,2*x)/force(k,x,x),.25);near(force(2*k,x,x)/force(k,x,x),2);
  near(force(k,x,x,2)/force(k,x,x),.5);
 }
 // Uniform versus accelerated displacement; acceleration does not change.
 const position=(v,a,t)=>v*t+.5*a*t*t;
 for(const a of[0,2,-3]){const d1=position(5,a,1)-position(5,a,0),d2=position(5,a,2)-position(5,a,1);near(d2-d1,a);}
 // Electrostatic and gravitational work depends only on endpoints.
 for(const path of[[0,2],[0,4,-1,2],[0,.2,1,2]]){
  let work=0;for(let i=1;i<path.length;i++)work+=3*5*(path[i]-path[i-1]);near(work,30);
 }
 // Refraction, gas laws and induction.
 for(const n of[1,1.5,2]){const frequency=7,speed=9/n,wavelength=speed/frequency;near(wavelength*frequency,speed);}
 const pressure=(T,V)=>T/V;near(pressure(600,2)/pressure(300,2),2);near(pressure(300,4)/pressure(300,2),.5);
 for(const rate of[-4,2]){const emf=-rate;assert.ok(emf*rate<0);near(Math.abs(2*emf)/Math.abs(emf),2);}
 // Alpha and beta conservation, and a neutral atom with unequal proton/neutron numbers.
 for(const[Z,A]of[[6,14],[92,238]]){near((Z-2)+2,Z);near((A-4)+4,A);near((Z+1)-1,Z);}
 assert.notEqual(14-6,6);
 // Interference: zero minimum only for equal amplitudes, total redistribution conserved.
 for(const phase of[0,Math.PI]){const intensity=2+2*Math.cos(phase);near(intensity,phase===0?4:0);}
 near(2**2+1**2-2*2*1,1);
 // Short circuit depends on both source EMF and internal resistance.
 near((12/2)/(6/2),2);near((12/4)/(12/2),.5);
 // The all-true conjunction rule catches the partially correct adiabatic statement.
 assert.equal(records['826D45'].claims[1].verdict,false);
 assert.ok(records['AA8BDA'].solution.includes('При неравных амплитудах'));
 assert.ok(records['8213F0'].solution.includes('Реальная масса'));
 assert.ok(records['51433E'].solution.includes('и от ЭДС'));
 return true;
}
module.exports={verifyPhysics};
