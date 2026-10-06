const assert=require('node:assert/strict');
const {records}=require('./physics-electro-matching');
const near=(a,b,e=1e-7)=>assert.ok(Math.abs(a-b)<e*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
const derivative=(f,t,h=1e-5)=>(f(t+h)-f(t-h))/(2*h);
// Fixed selections read from primary FIPI figures/formulas before prose generation.
const expected={
'4EAC46':'14','15274C':'41','FDFAF7':'32','E435F2':'12','5A6679':'42','695D7E':'23','BD62B3':'32','0FA319':'12','81AD11':'42','0A5E21':'14','10C527':'14','1FA129':'21','D71C20':'21','DDF127':'41','626E20':'14','35EB29':'12','663659':'23','571AAB':'41','AE92AD':'12','9CDCC5':'13','120891':'23','9EA592':'43','646A9F':'42','CB6FE8':'23','EFF8E5':'21','141062':'32','D96868':'14','5BC26A':'41','AF4F67':'34','BB603A':'23','14018E':'41','586301':'43','AE8774':'42','B1EDB2':'31','D0C61D':'43','D1DB28':'31','7133D6':'21','D91D57':'14','5C7354':'31','CB965A':'24','92635E':'31','415292':'23','4B8D92':'24','73643D':'43','433A84':'32','DF5187':'14'};
const graphSamples={
'E435F2':[[0,-1,0,1,0],[0,1,0,1,0]],'5A6679':[[0,1,0,1,0],[1,0,1,0,1]],'695D7E':[[0,1,0,1,0],[1,0,-1,0,1]],'81AD11':[[1,0,1,0,1],[0,1,0,-1,0]],'0A5E21':[[1,0,1,0,1],[-1,0,1,0,-1]],'9CDCC5':[[0,1,0,1,0],[-1,0,1,0,-1]],'9EA592':[[1,0,1,0,1],[-1,0,1,0,-1]],'646A9F':[[1,0,1,0,1],[0,1,0,-1,0]],'141062':[[-1,0,1,0,-1],[0,1,0,-1,0]],'5BC26A':[[1,0,1,0,1],[0,1,0,1,0]],'7133D6':[[0,1,0,-1,0],[0,1,0,1,0]],'5C7354':[[-1,0,1,0,-1],[1,0,1,0,1]],'92635E':[[-1,0,1,0,-1],[0,1,0,1,0]],'73643D':[[1,0,1,0,1],[-1,0,1,0,-1]]};
function verifyPhysics(){
 assert.deepEqual(Object.keys(records).sort(),Object.keys(expected).sort());
 for(const r of Object.values(records)){
  assert.equal(r.answer,expected[r.id],r.id);
  if(r.kind==='ohm'){
   for(const R of[.5,3,8])for(const I of[.2,2,5]){const U=I*R,P=U*I;near(U/R,I);near(U*U/P,R);near(U/I,R);near(P/I,U);near(U*U/R,P);near(I*R,U);near(Math.sqrt(P*R),U);near(I*I*R,P);near(P/U,I);}
  }else if(r.kind==='circuit'||r.kind==='circuit-series'||r.kind==='circuit-lamp'){
   for(const R of[2,7])for(const extra of[3,9])for(const internal of[0,.5,2]){
    const E=12,I=E/(R+extra+internal),U=I*R,Uextra=I*extra;
    near(U+Uextra+I*internal,E);near(Uextra*R/extra,U);near(Uextra*(R+extra+internal)/extra,E);near(I*(R+extra),E-I*internal);
    if(r.kind==='circuit-lamp'){const U0=U+Uextra;near((U0-Uextra)/I,R);near((U0-Uextra)*I,I*I*R);near((U0-Uextra)*I+Uextra*I,U0*I);}
   }
  }else if(r.kind==='switch'){
   for(const R of[2,5])for(const internal of[0,1,3]){const E=9,closed=E/(R+internal),open=E/(2*R+internal);assert.ok(closed>open);near(closed*(R+internal),E);near(open*(2*R+internal),E);near(E/(1/(1/R+1/R)),2*E/R);}
  }else if(r.kind==='parallel-power'){
   for(const R of[2,5,11])for(const internal of[0,1,3]){const E=12,v=E*R/(R+2*internal),branch=v/R,I=2*branch,p1=v*branch,pint=I*I*internal;
    near(p1,E*E*R/(R+2*internal)**2);near(pint,4*E*E*internal/(R+2*internal)**2);near(2*p1+pint,E*I);near(2*p1,I*I*R/2);near(p1,I*I*R/4);}
  }else if(r.kind==='lens'){
   for(const a of(r.near?[.25,.5,.8]:[1.1,1.5,1.9]))for(const f of[1,-1]){
    const b=1/(1/f-1/a),mag=-b/a;near(1/a+1/b,1/f);
    if(f<0){assert.ok(b<0&&mag>0&&mag<1);}else if(r.near){assert.ok(b<0&&mag>1);}else assert.ok(b>2&&mag< -1);
    const h=.2,parallelAtImage=h-h*b/f,centralAtImage=-h*b/a;near(parallelAtImage,centralAtImage);near(centralAtImage,mag*h);
   }
  }else if(r.kind==='light'){
   for(const n of[1,1.33,1.5]){const c=3e8,nu=5e14,air=c/nu,v=c/n,water=v/nu;near(air*nu,c);near(water*nu,v);near(c*water/v,air);near(air/water,n);near(c/v,n);}
  }else if(r.kind==='cyclotron'){
   for(const m of[1,3])for(const q of[.5,2])for(const B of[.3,1.2]){const v=4,F=q*v*B,a=F/m,R=v*v/a,T=2*Math.PI*R/v;near(R,m*v/(q*B));near(T,2*Math.PI*m/(q*B));near(1/T,q*B/(2*Math.PI*m));near(v*T,2*Math.PI*R);}
  }else if(r.kind==='trajectory'){
   const m=2,q=3,E=4,v=5;
   if(r.id==='DDF127')for(const t of[0,.5,2]){const x=v*t,y=q*E*t*t/(2*m);near(y,q*E*x*x/(2*m*v*v));near(q*v*4*Math.sin(Math.PI),0);}
   else{
    const stop=m*v/(q*E),vel=t=>v-q*E*t/m;near(vel(stop),0);assert.ok(vel(stop/2)>0&&vel(stop*2)<0);
    // v along +x, B along -z: positive-charge force +y; negative charge reverses it.
    const charge=-2,Bz=-3,Fy=charge*(-v*Bz);assert.ok(Fy<0);near(Fy,-30);
   }
  }else if(r.kind==='induction-ring'){
   // On the near side z>0, upward current gives magnetic moment toward -x.
   const z=1,iy=1,momentX=-z*iy;assert.ok(momentX<0);
   for(const speed of[-1,1]){const fluxDerivative=speed,emf=-fluxDerivative;assert.ok(emf*fluxDerivative<0);}
  }else if(r.kind==='lc-formula'){
   if(r.id==='1FA129'){const C=50e-6,qm=4e-4;near(qm/C,8);near(qm*qm/(2*C),.0016);near(C*8,qm);near(C*64/2,.0016);}
   else for(const L of(r.id==='35EB29'?[400e-6]:[.03,.2])){
    const w=r.id==='35EB29'?2.5e6:31,U=r.id==='35EB29'?100:8,C=1/(L*w*w),Im=C*U*w;
    near(Im,U/(w*L));near(L*Im*Im/2,U*U/(2*L*w*w));
    if(r.id==='35EB29'){near(Im,.1);near(L*Im*Im/2,2e-6,1e-12);near(C,4e-10,1e-14);}
    for(const phase of[0,.7,1.57,3]){const u=U*Math.sin(phase),i=Im*Math.cos(phase);near(C*u*u/2+L*i*i/2,C*U*U/2,1e-10);}
   }
  }else if(r.kind==='lc-graph'){
   const current=r.mode==='current',s=r.leftSign,dir=r.currentDirection==='dischargeLeft'?-1:1;
   const q=t=>current?Math.sin(2*Math.PI*t):s*Math.cos(2*Math.PI*t),i=t=>current?Math.cos(2*Math.PI*t):-dir*s*Math.sin(2*Math.PI*t);
   for(const t of[0,.125,.25,.5,.75,1]){near(derivative(q,t)/(2*Math.PI),dir*i(t));near(q(t)**2+i(t)**2,1);}
   const funcs={WC:t=>q(t)**2,WL:t=>i(t)**2,qleft:q,qright:t=>-q(t),i,u:q};
   r.pair.forEach((key,j)=>[0,.25,.5,.75,1].forEach((t,k)=>near(funcs[key](t),graphSamples[r.id][j][k])));
   const eps=1e-5,energySlope=Math.cos(2*Math.PI*(.25+eps))**2/eps,absSlope=Math.abs(Math.cos(2*Math.PI*(.25+eps)))/eps;
   assert.ok(energySlope<.001&&absSlope>6);
  }else throw Error('Unchecked kind '+r.kind);
  assert.ok(r.solution.length>950,r.id);assert.ok(r.solution.includes('Проверка.'),r.id);assert.ok(!/undefined|NaN|\//.test(r.solution),r.id);assert.equal(r.stages.length,3);
 }
 assert.ok(records['4EAC46'].solution.includes('концам резистора R'));
 assert.ok(records['D1DB28'].solution.includes('полюсам источника'));
 assert.ok(records['AF4F67'].solution.includes('W обозначает мощность'));
 assert.ok(records['D91D57'].solution.includes('северным полюсом N'));
 return true;
}
module.exports={verifyPhysics};
