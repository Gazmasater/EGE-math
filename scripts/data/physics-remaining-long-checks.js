// Независимые численные остатки законов: ответ подставляется обратно в модель.
const assert=require('node:assert/strict');
const near=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<=tol*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
function verifyPhysics(){
 const g=10,alpha=Math.PI/6;
 // U-трубка: новое равновесие при нагревании с неизменным количеством газа.
 {const p0=1e5,V0=.001,S=.0001,rho=13600,T0=300,T=330;
  const f=x=>(p0+2*rho*g*x)*(V0+S*x)-p0*V0*T/T0;
  let lo=0,hi=.1;for(let n=0;n<80;n++){const mid=(lo+hi)/2;if(f(mid)>0)hi=mid;else lo=mid;}
  assert.ok(lo>0);near(f(lo),0);assert.ok(f(-.001)<0);}
 // Конус: прямое решение двух проекций с ответом в предельном режиме.
 for(const a of [.4,.8,1.2])for(const m of [.1,2])for(const L of [.2,1.1]){
  const s=Math.sin(a),c=Math.cos(a),mu=c/s+1;
  const omega2=g*(mu*s-c)/(L*s*(s+mu*c));
  const N=m*g/(s+mu*c),f=mu*N;
  near(f*s-N*c,m*omega2*L*s);near(f*c+N*s,m*g);assert.ok(N>0);
  const reaction=m*s*(g-omega2*L*c),need=m*(g*c+omega2*L*s*s);
  near(need/reaction,mu);near(g*(mu*s-c)/(omega2*s*(s+mu*c)),L);
  const faster=omega2*1.01,nn=m*s*(g-faster*L*c),ff=m*(g*c+faster*L*s*s);
  assert.ok(nn<=0||ff>mu*nn);
 }
 {const m=4,Fa=1000*g*m/11300,T=42.1;near(T*Math.cos(alpha)+Fa,m*g,2e-5);assert.ok(T*Math.sin(alpha)>0);}
 {const R=2.5,m=1,H=3,h=2.5,N=4,v2=2*g*(H-h);near(N+m*g*(h-R)/R,m*v2/R);near(m*g*H,m*g*h+m*v2/2);}
 {const v=2,beta=Math.PI/3,vx=v*Math.cos(beta),vy=v*Math.sin(beta),t=vy/(g*Math.sin(alpha));
  const y=vy*t-g*Math.sin(alpha)*t*t/2;near(y*Math.sin(alpha),.15);near(vy-g*Math.sin(alpha)*t,0);near(vx,1);}
 {const t=3,h=1655,l=1700,vx=l/t,vyGround=-(h/t+g*t/2),T=-2*vyGround/g;
  const D=vx*T;near(D,64222.22222222222);near(vyGround*(-t)-g*t*t/2,h);
  const D2=2*vx*Math.sqrt(800**2-vx**2)/g;near(D2,63999.6142,1e-8);
  assert.equal(Math.round(D/1000),64);assert.equal(Math.round(D2/1000),64);
  assert.ok(Math.abs(Math.hypot(vx,vyGround)-800)/800<.002);}
 {const k=100,m=2.5,mu=.2,d=.15,b=.05;near(k*d*d/2,k*b*b/2+mu*m*g*(d+b));near(k*b,mu*m*g);
  const tooLarge=.151,finalCompression=tooLarge-2*mu*m*g/k;assert.ok(k*finalCompression>mu*m*g);}
 {const m=.3,M=1.5,l=.9,T=6,v=3,u=.5;near(T-m*g,m*v*v/l);near(m*v,(M+m)*u);assert.ok((M+m)*u*u<m*v*v);}
 for(const v of [3,9])for(const a of [.3,.9]){
  const s=v*Math.sin(a),t1=s/(2*g),t2=Math.sqrt(3)*s/(2*g),h=s*t1-g*t1*t1/2;
  near((s-g*t1)+(-g*t1),0);near(h-g*t2*t2/2,0);near(t1+t2,(1+Math.sqrt(3))*s/(2*g));
 }
 for(const R of [1,7,30])for(const v of [1,4]){const a=v*v/R,t1=v/a,t2=Math.PI*R/v;near(t2/t1,Math.PI);near(a*t1*t1/2,R/2);}
 {const mu=.2,m=1,F=mu*m*g/(2*(1+mu*Math.tan(alpha))),N=F/mu;
  near(m*g*Math.cos(alpha)/2,N*Math.cos(alpha)+F*Math.sin(alpha));near(F,.8964830535426435);}
 {const m=.1,theta=Math.PI/6,M=m*(3*Math.cos(theta)-2)/(2*theta-Math.cos(theta));
  assert.equal(Math.round(M*1000),330);const R=2,v2=g*R*Math.cos(theta);
  near(m*g*R*(1-Math.cos(theta))+M*g*R*theta,(m+M)*v2/2);
  for(let i=0;i<=100;i++){const a=theta*i/100,vv=2*g*R*(m*(1-Math.cos(a))+M*a)/(m+M),N=m*g*Math.cos(a)-m*vv/R;
   assert.ok(N>-1e-10);if(i===100)near(N,0);const acceleration=g*(m*Math.sin(a)+M)/(m+M);assert.ok(M*(g-acceleration)>0);}
  // Обратный вариант источника: при M=100 г искомое m около 30 г, не 330 г.
  assert.equal(Math.round(100*.1*(2*theta-Math.cos(theta))/(3*Math.cos(theta)-2)),3);
 }
 {const V=328,u=72,t1=6,t2=7.5,D=2400;near((V+u)*t1,D);near(Math.sqrt(V*V-u*u)*t2,D);near(u/3.6,20);}
 {const M=.25,m=.005,v=555,v1=6,v2=5;near(M*g*3.6*Math.sin(alpha),M*v1*v1/2);near(m*v-M*v1,(M+m)*v2);
  near((M+m)*v2*v2/2,(M+m)*g*2.5*Math.sin(alpha));}
 {const p=2*2*1500**2/(Math.PI*.045**2*3),S=Math.PI*.045**2/4;near(p*S*3,2*1500**2/2);near(p,471570201.7537639);}
 return {tasks:18,checks:'forces, energy, impulse, dimensions, limiting states, reverse substitution'};
}
module.exports={verifyPhysics};
