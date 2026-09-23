const assert=require('node:assert/strict');
const close=(a,b,label='')=>assert.ok(Math.abs(a-b)<=(b===0?1e-11:1e-9*Math.max(1e-30,Math.abs(a),Math.abs(b))),`${label}: ${a} ≠ ${b}`);
function verifyPhysics(){
 const done=[];const check=(id,fn)=>{fn();done.push(id);};const g=10;
 check('E17A4E',()=>close(.02*4.5-.01*4.5,.03*1.5));
 for(const id of ['136E1B','30E296'])check(id,()=>{close(50*1+50*2,100*1.5);assert.ok(100*1.5**2/2<50*1**2/2+50*2**2/2);});
 check('3B9FD0',()=>close(3*1-1*1,4*.5));
 for(const[id,m,x0,x1,E]of [['17257D',1700,900,300,85000],['63FE2B',1750,300,900,87500]])check(id,()=>{close((x1-x0)/60,id==='17257D'?-10:10);close(m*((x1-x0)/60)**2/2,E);});
 check('49A293',()=>{const E=2+2;assert.ok(5>E&&3.8<E);});
 check('FA79E4',()=>{const v=Math.sqrt(5)/2;close(v**2,1**2+.5**2);close(2*1,2);close(2*.5,1);});
 check('2177EF',()=>close(.03*360,120*.09));
 check('24CD61',()=>close(20000*.01**2/2,.02*10**2/2));
 check('C594F9',()=>{close(3**2/2,g*.9*(1-.5));close(2**2/2,g*.9*(1-7/9));close(1*(3-2),1);});
 for(const id of ['338EF9','FDD351'])check(id,()=>{
  for(const a of [.2,.5,1.1])for(const v of [7,20,50]){const t1=v*Math.sin(a)/(2*g),h=v*Math.sin(a)*t1-g*t1*t1/2,tau=Math.sqrt(2*h/g),u=v*Math.cos(a)/2;
   close(v*Math.sin(a)-g*t1-g*t1,0);close(2*g*tau/(Math.sqrt(3)*Math.sin(a)),v);
   close(Math.sqrt(3)*v*v*Math.sin(2*a)/(8*g),u*tau);close(h-g*tau*tau/2,0);
  }
 });
 check('3D2308',()=>{const M=1,u=2,h=.8,v2=g*h;close(.01*200,M*u);close(u*u/2+g,v2/2+g*h);close(M*g*h-M*v2,0);assert.ok(M*(g-u*u)>0);});
 check('A5F07E',()=>{const H=200**2*Math.sin(Math.PI/3)**2/(2*g),t=Math.sqrt(2*H/g),u1=7000/t,u2=(6*100-2*u1)/4;close(H,1500);close(u2,-52.072594216369);close(2*u1+4*u2,600);close(u1*t,7000);assert.ok(u2<0);});
 check('2C62B8',()=>{const M=.04,u=1,L=.2;close(.01*4,M*u);close((M*g+M*u*u/L)/2,.3);assert.ok((M*g+M*u*u/.19)/2>.3);assert.ok((M+.01)*g/2<.3);});
 for(const id of ['60B2BE','58AC2F'])check(id,()=>{close(g*1**2/2,5);close(600*1,600);close(10*600,1000*6);close(1000*6**2/2/6,6000*1**2/2);});
 check('5BCC1F',()=>{const a=Math.PI/6,mu=(Math.sqrt(3)-1)/5,vB2=g*.4*Math.cos(a);close(16,vB2+2*g*1*Math.sin(a)+2*mu*g*1*Math.cos(a));assert.ok(mu>0);});
 for(const[id,M,E]of [['E7211F',4,500000],['037654',4,500000],['88406D',2,250000]])check(id,()=>{close(M*400,M/2*(900-100));close(M*(900**2+100**2)/4-M*400**2/2,E);});
 check('B46C29',()=>{const v2=2*g*(2-1),a=Math.PI/6;close(1+v2*Math.cos(2*a)**2/(2*g),1.25);assert.ok(Math.cos(2*a)>0);});
 check('B8E9D0',()=>{const a=Math.PI/6,L=.57*Math.sqrt(3),v2=g*L/Math.sin(2*a);close(.05*v2/2+.05*g*.5*Math.sin(a),.41);});
 check('7CF459',()=>{for(const a of [.2,.6,1.2]){const E=3,L=2,b=.7,m=2*E*Math.sin(2*a)/(g*L+2*g*b*Math.sin(a)*Math.sin(2*a)),v2=g*L/Math.sin(2*a);close(m*v2/2+m*g*b*Math.sin(a),E);}});
 for(const[id,M,m,v0]of [['0EA255',.23,.01,120],['EDA6E2',.25,.01,130]])check(id,()=>{const total=M+m,u=m*v0/total,l=.5;close(u*u,5*g*l);close(total*u*u/2,total*g*l/2+total*g*2*l);for(let theta=0;theta<=Math.PI;theta+=.05){const v2=u*u-2*g*l*(1-Math.cos(theta)),T=total*(v2/l+g*Math.cos(theta));assert.ok(T>=-1e-12);}});
 check('29FE54',()=>{const R=2.5,h=2*R/3,v2=2*g*R/3,w=Math.sqrt(v2)*Math.sqrt(5)/3,t=Math.sqrt(2*R/(27*g))*(Math.sqrt(23)-Math.sqrt(5));close(v2,g*h);close(v2/2+g*h,g*R);close(w*t+g*t*t/2,h);close(t,.3483396971899482);});
 check('BE3A9E',()=>{const Nc=5/3,Nd=10/3;close(Nc+Nd,5);close(Nc*.2+Nd*.8,.3*g*1);close(Nd,2*Nc);});
 check('DA269B',()=>{const m=.06,M=.14,mu=.3;close(m*g,mu*(M+m)*g);assert.ok(m*g>mu*(.13+m)*g);close(m*g*1-m*g*1,0);});
 check('049666',()=>{const m=.1,M=.2,v=3,u=m*v/(m+M),E=(m+M)*u*u/2,Q=m*v*v/2-E;close(Q/E,2);});
 check('030E68',()=>{const q=3.2e-19,m=1.5e-25,U=2000,B=.5,R=Math.sqrt(.0075),v=q*B*R/m;close(m*v*v/2,q*U);close(q*v*B,m*v*v/R);});
 check('01DB3F',()=>{const H=3.25,h=2.5,R=2,m=1,v2=2*g*(H-h);close(m*v2/R-m*g*(h-R)/R,5);assert.ok((2*H+R)/3>h);});
 check('888D31',()=>{close(1*5+4*2.5,5*3);close(5*(3**2-2**2)/2,.5*5*g*.5);close((3-2)/(.5*g)*(3+2)/2,.5);});
 check('587384',()=>{close(.5*g+.5*2.4**2/.8,8.6);close(.5*2.4,(.5+2.5)*.4);});
 check('AF318D',()=>{const m1=1,m2=1.5,l1=2.25,l2=1,a=.5,v1=Math.sqrt(2*g*l1*(1-Math.cos(a))),v2=Math.sqrt(2*g*l2*(1-Math.cos(a)));close(m1*v1,m2*v2);close(l1/l2,(m2/m1)**2);});
 assert.deepEqual(done.sort(),Object.keys(require('./conservation-catalog.json')).sort(),'Проверены все 36 физических моделей');
 return done;
}
module.exports={verifyPhysics};
