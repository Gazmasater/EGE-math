const assert=require('node:assert/strict');
const {records,model}=require('./physics-electro-statements');
const expected={'7D9E2D':'34','E5F230':'45','F59A48':'34','063141':'12','56DF4A':'45','9B8945':'23','DE93F5':'245','5CA9FB':'134','BD8B0A':'35','2AD80D':'12','235F0D':'23','4E567B':'45','B6C47E':'24','D30076':'145','02A8BA':'25','7402BC':'123','33EE1B':'245','3BE118':'12','242928':'24','896222':'12','5624D7':'34','410957':'45','44CF5D':'45','D35251':'13','F32AAC':'23','BC0DA8':'12','2786AC':'25','E412A6':'25','F70AC5':'45','07A6C6':'12','AFC0C2':'23','602ECA':'35','3E42C2':'123','CCEC9D':'15','08ACE4':'25','56B6ED':'234','968CE5':'35','B83F61':'34','BA756E':'12','937960':'24','26CC36':'14','D23139':'12','9D383A':'45','019E82':'12','1B008A':'14','1D068A':'13'};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
function verifyPhysics(){
 assert.deepEqual(Object.keys(records).sort(),Object.keys(expected).sort());
 for(const r of Object.values(records)){
  const m=model(r);assert.equal(m.answer,expected[r.id],r.id);assert.equal(r.claims.length,5);assert.ok(r.solution.length>1400,r.id);assert.ok(r.solution.includes('Проверка.'));assert.ok(!/undefined|NaN|\//.test(r.solution),r.id);assert.equal(r.stages.length,3);
  if(r.kind==='beads'){
   for(const a of[.2,1,7]){const at=(x,q0,p)=>q0*(p-x)/Math.abs(p-x)**3;const qa=r.qa,qb=r.qb,EA=at(-a,qa,0),EB=at(a,qb,0),fa=qa*at(a,qb,-a),fb=qb*at(-a,qa,a);near(fa,-fb);near(EA+EB,(qa-qb)/a**2);assert.equal(Math.sign(fa),m.facts.FA);assert.equal(Math.sign(EA+EB),m.facts.E);
    if(r.flip){const next=at(-a,r.flip==='A'?-qa:qa,0)+at(a,r.flip==='B'?-qb:qb,0);near(Math.abs(next/(EA+EB)),m.facts.flipRatio);}
   }
  }else if(r.kind==='plate'){
   for(const E of[2,5]){const sA=1,sB=1,sC=3,phi=s=>10-E*s;near(phi(sA),phi(sB));assert.ok(phi(sA)>phi(sC));for(const q of[-3,2]){near(q*(phi(sA)-phi(sB)),0);near(q*(phi(sA)-phi(sC)),q*E*(sC-sA));}}
  }else if(r.kind==='coils'){
   const b1=r.top?-1:1,R0=5,R1=r.left?3:7,U=12,I0=U/R0,I1=U/R1,dPhi=b1*(I1-I0),emf=-dPhi;assert.equal(Math.sign(I1-I0),m.facts.I);assert.equal(emf>0,m.facts.B2toward);assert.equal(emf<0,m.facts.I2clockwise);assert.ok(emf*dPhi<0);
  }else if(r.kind==='ampere'){
   // Current is along -z; Bx = +/- B. Left-hand-rule y component is Iz*Bx.
   const Iz=-2,Bx=r.northRight?-3:3,Fy=Iz*Bx;assert.equal(Fy>0,r.northRight);
   const U=12,R0=5,R1=r.left?3:7,I0=U/R0,I1=U/R1,B=2,l=.3,weight=20,sign=Math.sign(Fy),fa0=B*I0*l,fa1=B*I1*l,T0=(weight-sign*fa0)/2,T1=(weight-sign*fa1)/2;
   near(2*T0+sign*fa0-weight,0);near(2*T1+sign*fa1-weight,0);assert.ok(T1>T0);assert.equal(Math.sign(fa1-fa0),m.facts.FA);
  }else if(r.kind==='capacitor'){
   for(const d of[.5,1,3])for(const eps of[1,2.1]){
    const baseC=2,U0=3,q0=baseC*U0,C=baseC*eps/d,q=r.connected?C*U0:q0,U=q/C,E=U/d,W=.5*q*U;
    near(W,q*q/(2*C));near(W,C*U*U/2);if(r.connected){near(U,U0);near(E,U0/d);near(W/(.5*baseC*U0**2),eps/d);}else{near(q,q0);near(E,q0/(baseC*eps));near(W/(q0*q0/(2*baseC)),d/eps);}
   }
  }else if(r.kind==='sphere'){
   const R=2,kQ=36*(2*R)**2,field=x=>x<R?0:kQ/x**2,potential=x=>kQ/Math.max(x,R);
   near(field(R/2),0);near(field(2*R),36);near(field(R),144);near(potential(R/2),potential(R));near(potential(R),2*potential(2*R));
  }else if(r.kind==='conductor'){
   const E=3,induced=-E;near(E+induced,0);assert.ok(-E<0);assert.ok(m.facts.insideEZero);assert.equal(m.facts.phiAC,0);assert.equal(m.facts.negativeD,false);
  }else if(r.kind==='cubes'){
   for(const moved of[1,4,9]){const q3=-moved,q4=moved;near(q3+q4,0);assert.equal(Math.sign(q3),m.facts.q3);assert.equal(Math.sign(q4),m.facts.q4);}assert.equal(m.facts.glassTotal,0);
  }else if(r.kind==='rings'){
   const dFlux=r.approach?1:-1,emf=-dFlux;assert.ok(emf*dFlux<0);assert.equal(m.facts.I1,r.approach);assert.equal(m.facts.I2,!r.approach);assert.equal(m.facts.attract2,!r.approach);
  }else if(r.kind==='shuttle'){
   const E=5;assert.ok(2*E>0&&-2*E<0);const C=3,Q0=9,Q1=7;assert.ok(Q1/C<Q0/C);assert.equal(m.facts.C,0);assert.equal(m.facts.harmonic,false);
  }else if(r.kind==='lc-constants'){
   for(const L of[.2,2])for(const C of[.3,3]){const qmax=4,w=1/Math.sqrt(L*C),T=2*Math.PI/w;near(T,2*Math.PI*Math.sqrt(L*C));for(const phase of[0,.2,1,2,3]){const q=qmax*Math.cos(phase),i=-w*qmax*Math.sin(phase);near(q*q/(2*C)+L*i*i/2,qmax*qmax/(2*C));near(L*(-w*w*q)+q/C,0);}}
  }else throw Error('Unchecked '+r.kind);
 }
 assert.ok(records['019E82'].solution.includes('также в диэлектрике'));
 assert.ok(records['410957'].solution.includes('φ_B<φ_A<φ_C'));
 assert.ok(records['602ECA'].solution.includes('=3'));
 return true;
}
module.exports={verifyPhysics};
