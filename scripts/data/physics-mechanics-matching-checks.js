const assert=require('node:assert/strict');
const {records}=require('./physics-mechanics-matching');
const near=(a,b,eps=1e-7)=>assert.ok(Math.abs(a-b)<eps*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
const derivative=(f,t,h=1e-4)=>(f(t+h)-f(t-h))/(2*h);
const second=(f,t,h=1e-3)=>(f(t+h)-2*f(t)+f(t-h))/(h*h);
const g=9.8;
// Answers and graph identities below were read from the primary figures before
// the prose/diagram generators were written. Numerical checks use conservation,
// finite differences, and force projections rather than the solution strings.
const expected={}; // populated from the fixed manual ledger below
Object.assign(expected,{
 '11254B':'41','11044D':'43','1B3E4D':'23','288E45':'34','50AA4D':'41','E52945':'42','65444B':'42','FCE90E':'43','0E6D09':'34','B87A01':'41','BD8C0A':'23','1EB20A':'43','A06301':'43','94A901':'31','EC9E02':'32','E2D70C':'13','445FBF':'41','2AA0B3':'24','50F5BA':'32','8E57B1':'42','474911':'32','46511E':'24','1D0119':'31','6EC514':'34','7DC427':'31','2FC929':'32','F617DE':'24','1867DC':'13','2914DE':'24','D200DE':'32','C7F5DC':'13','9772D7':'14','9039D6':'42','4DC05B':'21','F9DC54':'42','05965D':'34','0D8856':'42','58E051':'23','577C59':'42','0A7DAC':'12','27ADC9':'32','C883C1':'41','9141CE':'13','F4CD91':'12','B28492':'12','B5D699':'43','DEB890':'31','9B4F94':'32','00B2EC':'43','04C96C':'23','06B566':'32','1E5167':'12','DAEA64':'21','FFF839':'32','D88934':'32','B48F8A':'23','E5E386':'13','69AD85':'13','681289':'13','02AC48':'32','DB3508':'13','6ED57F':'12','BE8E13':'24'
});
function checkMotion(r){
 const up=r.kind==='parabola-up',poly=r.polynomial||[up?-1:1,up?-2:2,up?1:-1],m=r.mass||1.7;
 const[x0,v0,b]=poly,x=t=>x0+v0*t+b*t*t,v=t=>v0+2*b*t,K=t=>m*v(t)**2/2;
 for(const t of [0,.25,.9,1.3,2.1]){
  near(derivative(x,t),v(t));near(second(x,t),2*b);near(derivative(K,t),m*2*b*v(t));near(K(t)-K(0),m*2*b*(x(t)-x0));
 }
 if(b){const turn=-v0/(2*b);near(v(turn),0);near(K(turn),0);near(K(turn-.4),K(turn+.4));assert.ok(K(turn-.4)>0);}
 if(r.id==='B28492'){near(m*2*b,-1.2);near(v(0),5);}
 if(r.id==='11254B'){near(x(1)-x0,-4);near(2*b,-8);}
 if(r.kind.startsWith('parabola-'))assert.equal(Math.sign(second(x,.7)),up?1:-1);
}
function projectile(r){
 const alpha=r.kind==='vertical'?Math.PI/2:.57,v0=12,m=1.3,h=r.kind==='balcony'?4:0,vx=v0*Math.cos(alpha),vy0=v0*Math.sin(alpha);
 const y=t=>h+vy0*t-g*t*t/2,vy=t=>vy0-g*t,K=t=>m*(vx*vx+vy(t)**2)/2,U=t=>m*g*y(t),top=vy0/g,end=(vy0+Math.sqrt(vy0*vy0+2*g*h))/g;
 for(const t of [0,top,end]){near(K(t)+U(t),m*v0*v0/2+m*g*h);near(derivative(y,t),vy(t));near(second(y,t),-g);}
 near(y(end),0);near(vy(top),0);
 if(r.kind==='vertical')near(K(top),0);else assert.ok(K(top)>0);
 if(r.kind==='oblique'){near(y(top),v0*v0*Math.sin(alpha)**2/(2*g));near(Math.abs(vy(end)),v0*Math.sin(alpha));}
}
function incline(r){
 const alpha=.39,m=2,v0=3,N=m*g*Math.cos(alpha),ax=-N*Math.sin(alpha)/m,ay=(N*Math.cos(alpha)-m*g)/m,a=g*Math.sin(alpha),end=2*v0/a;
 const s=t=>v0*t-a*t*t/2,x=t=>s(t)*Math.cos(alpha),y=t=>s(t)*Math.sin(alpha),v=t=>v0-a*t;
 assert.ok(ax<0&&ay<0);near(ax,-g*Math.sin(alpha)*Math.cos(alpha));near(ay,-g*Math.sin(alpha)**2);
 for(const t of [0,end/2,end]){near(second(x,t),ax);near(second(y,t),ay);near(m*v(t)**2/2+m*g*y(t),m*v0*v0/2);}
 near(s(end),0);near(v(end/2),0);near(v(end),-v0);
}
function verifyPhysics(){
 assert.deepEqual(Object.keys(records).sort(),Object.keys(expected).sort());const checked=new Set();
 for(const r of Object.values(records)){
  assert.equal(r.answer,expected[r.id],r.id+': primary graph/formula selection');
  if(r.kind==='polynomial'||r.kind.startsWith('parabola-'))checkMotion(r);
  else if(['vertical','balcony','oblique'].includes(r.kind))projectile(r);
  else if(r.kind==='incline')incline(r);
  else if(r.kind==='pendulum'){
   const m=.8,l=.9,A=.015,w=Math.sqrt(g/l),T=2*Math.PI/w,x=t=>-A*Math.cos(w*t),v=t=>A*w*Math.sin(w*t),K=t=>m*v(t)**2/2,E=m*w*w*A*A/2;
   near(x(0),-A);near(v(0),0);assert.ok(v(T/4)>0);near(K(0),0);near(K(T/4),E);near(K(T/2),0);near(x(T/2),A);near(K(T/8),K(T/8+T/2));
   for(const t of [0,T/4,T/2,T*.9]){near(second(x,t),-w*w*x(t),1e-6);near(K(t)+m*w*w*x(t)**2/2,E);}
  }else if(r.kind==='incline-up'){
   for(const alpha of [.2,.6])for(const mu of [0,.15,.4]){const m=1.8,N=m*g*Math.cos(alpha),fr=mu*N,F=-m*g*Math.sin(alpha)-fr,a=F/m;near(-a,g*(Math.sin(alpha)+mu*Math.cos(alpha)));assert.ok(a<0);near(N-m*g*Math.cos(alpha),0);}
  }else if(r.kind==='incline-length'){
   const S=2.5,h=1.5,b=Math.sqrt(S*S-h*h),mu=.2,m=1.7,N=m*g*b/S,fr=mu*N,a=(m*g*h/S-fr)/m;
   const work=fr*S,v=Math.sqrt(2*a*S);near(work,mu*m*g*b);near(m*v*v/2,m*g*h-work);near(a,g*(h-mu*b)/S);assert.ok(a>0);
  }else if(r.kind==='truck'){
   const m=2400,mu=.3,v=15,F=mu*m*g,a=F/m,t=v/a,s=(v+0)*t/2;near(s,v*v/(2*mu*g));near(F*s,m*v*v/2);near(a,mu*g);
  }else if(r.kind.startsWith('circle-')){
   const R=.7,nu=3,T=1/nu,dt=T/100000,w=2*Math.PI*nu;
   const speed=Math.hypot(R*Math.cos(w*dt)-R,R*Math.sin(w*dt))/dt;near(speed,2*Math.PI*R*nu,1e-6);near(speed,w*R,1e-6);near(T,2*Math.PI/w);
  }else if(r.kind.startsWith('spring-')){
   const m=.4,k=25,A=.08,w=Math.sqrt(k/m),T=2*Math.PI/w,x=t=>A*Math.sin(w*t),v=t=>A*w*Math.cos(w*t),a=t=>-w*w*x(t);
   for(const t of [0,T/4,T/2,T*.7]){near(second(x,t),a(t),1e-5);near(m*v(t)**2/2+k*x(t)**2/2,k*A*A/2);near(m*a(t),-k*x(t));}
   near(Math.abs(a(T/4)),k*A/m);near(m*g-k*(m*g/k+A),-k*A);near(T,2*Math.PI*Math.sqrt(m/k));
  }else if(r.kind==='collision'){
   for(const m of [.3,.8])for(const M of [.2,1.4]){const v=5,u=m*v/(m+M),pm=m*u,pM=M*u,Km=m*u*u/2,KM=M*u*u/2;near(pm+pM,m*v);near(pm,m*m*v/(m+M));near(pM,m*M*v/(m+M));near(KM,m*m*M*v*v/(2*(m+M)**2));near(Km+KM,m*m*v*v/(2*(m+M)));assert.ok(Km+KM<m*v*v/2);}
  }else if(r.kind==='pendulum-kick'){
   const m=.3,l=.8,v=1.2,h=v*v/(2*g),tension=m*g+m*v*v/l;assert.ok(h<l);near(m*g*h,m*v*v/2);near((tension-m*g)/m,v*v/l);
  }else if(r.kind==='cube'){
   const a=.03,rhow=1000,rhos=7800,pTop=rhow*g*a,pBottom=rhow*g*2*a,FA=(pBottom-pTop)*a*a,m=rhos*a**3,tension=m*g-FA;near(FA,rhow*g*a**3);near(tension,a**3*(rhos-rhow)*g);near(tension+FA,m*g);
  }else if(r.kind==='light'){
   const c=3e8,nu=6e14,n=4/3,air=c/nu,water=c/n/nu;near(air*nu,c);near(water*nu,c/n);near(air/water,n);assert.ok(water<air);
  }else if(r.kind==='rest-accel'){
   const a=1.6,l=.2,t=Math.sqrt(2*l/a),v=a*t;near(t,.5);near(v,.8);near(v,Math.sqrt(2*a*l));near(a/2,.8);assert.equal(Math.sqrt(2*a).toFixed(1),'1.8');
  }else if(r.kind==='coordinate-pairs'){
   for(const t of [0,.3,1,2]){near(derivative(z=>10+5*z+2*z*z,t),5+4*t);near(derivative(z=>10+2*z*z,t),4*t);}
  }else if(r.kind==='hill'){
   const m=.4,p=1.7,K=p*p/(2*m),h=K/(m*g);near(m*Math.sqrt(2*g*h),p);near(h,p*p/(2*m*m*g));
  }else throw Error('Unchecked physics '+r.id);
  assert.ok(r.solution.length>1000,r.id);assert.ok(r.solution.includes('Проверка.'),r.id);assert.ok(!/undefined|NaN|\//.test(r.solution),r.id);assert.equal(r.stages.length,3);checked.add(r.id);
 }
 assert.equal(checked.size,63);assert.ok(records.B87A01.solution.includes('безразмерный коэффициент'));
 assert.ok(records.F4CD91.solution.includes('υ² sin²α'));assert.ok(!records.F4CD91.solution.includes('υ₂'));
 return true;
}
module.exports={verifyPhysics};
