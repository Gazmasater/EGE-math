const assert=require('node:assert/strict');
const close=(a,b,label)=>assert.ok(Math.abs(a-b)<1e-8,`${label}: ${a} ≠ ${b}`);
function verifyPhysics(){
 const g=10,s=.5,c=Math.sqrt(3)/2;
 // Подстановки в исходные законы и ограничения. Ни один расчёт не читает готовые тексты.
 for(const id of ['04DCB4','087023'])for(const [M,m,F] of [[2,.75,10],[3,1,8]]){const a=F/(M+4*m),T=2*m*a;close(F-2*T,M*a,id);close(T,m*(2*a),id);}
 for(const [id,m] of [['170B54',.4],['36B168',.3]])for(const F of [0,1,3,4,8,10]){const N=Math.max(m*g-F,0),a=Math.max((F-m*g)/m,0);close(N+F-m*g,m*a,id);assert.ok(N>=0);}
 for(const id of ['1A1FBB','746AB3']){const m=.2,V=.0004,rho=id==='1A1FBB'?1260:1000,k=30,l0=.2,l1=l0-m*g/k,l2=l0+(rho*V-m)*g/k;assert.ok(l1<l0&&l2>l0,id);close(k*(l0-l1),m*g,id);close(k*(l2-l0)+m*g,rho*V*g,id);close(0-m*g,m*(-g),id);}
 for(const id of ['24D9C3','8CF4D1']){const a=(9*c-5-.3*(10-9*s))/1.5,T=.5*(g+a),N=10-9*s,L=id==='24D9C3'?.4:.32;close(9*c-T-.3*N,a,id);close(T-5,.5*a,id);if(id==='24D9C3')close(a*Math.sqrt(2*L/a)**2/2,L,id);else close(Math.sqrt(2*a*L)**2/(2*a),L,id);assert.ok(N>0&&a>0&&T>0);}
 for(const [id,m1,rho,V] of [['2593A8',.7,800,.0002],['82C08B',.5,1000,.00015]]){const m2=m1-rho*V,a=rho*V*g/(2*m1-rho*V),T=m2*(g+a);close(m1*g-T,m1*a,id);close(m2*g+rho*V*g,m1*g,id);assert.ok(a>0&&a<g&&m2>0);}
 for(const id of ['309C22','89181B']){const M=.45,m=.05,a=2,T=m*(g-a);close(T+m*g,M*a,id);close(M/m,9,id);}
 for(const [id,M,P] of [['3B6EAD',.2,.8],['E068D9',.5,10/11]]){const m=.1,a=m*g/(2*M+m),T=M*(g+a);close(m*(g-a),P,id);close(M*g+P-T,M*a,id);}
 {const m=.1,M=.2,v=2,u=2/3,k=30,L=.1,t=.3+Math.PI*.1;close(m*v,(m+M)*u,'3ECDA4 impulse');close(t,2*L/u+Math.PI*Math.sqrt((m+M)/k),'3ECDA4 time');}
 {const m=.2,k=30,L=.2,w=2*Math.PI,r=6.6/(30-.2*w*w);close(k*(r-L)-.3*m*g,m*w*w*r,'0DDE03 radial');assert.ok(r>L);assert.ok(Math.abs((k-m*w*w)*(r+.001)-k*L)>.3*m*g);}
 for(const w of [2,1.5])assert.ok(w*w*.8<.4*g,'45157D no slip');
 {const m=.5,N=m*g*c,mu=Math.hypot(1.7,2.5)/N;close((mu*N)**2,1.7**2+2.5**2,'45D010');const F=m*g*Math.sqrt(.7**2*c*c-s*s);close(F*F+2.5**2,(.7*N)**2,'9F9E6D');}
 {const w=20*Math.PI,T=.2*w*w*.12;close(T,.3*w*w*.08,'48129F same tension');close(.12+.08,.2,'48129F length');}
 for(const id of ['4F0963','873381']){const a=4,T=14,M=7/3;close(T-10,a,id);close(M*g-T,M*a,id);close(a*1,4,id);close(Math.sqrt(2*a*2),4,id);}
 {const M=.25,m=.25,a=2,T=2;close(T-1-.2*M*g,M*a,'566D54');close(m*g-T,m*a,'566D54');}
 {const R=.14,h=.18,m=.01,E=.02,v2=2*(E-m*g*h)/m;close(v2,g*(h-R),'582E9A detach');for(const y of [0,.05,.14,.179])assert.ok(2*E/R+m*g-3*m*g*y/R>0);close(2*E/R+m*g-3*m*g*h/R,0,'582E9A N=0');}
 {const M=1,mu=.3,m=M*(s-mu*c);close(m*g+mu*M*g*c,M*g*s,'5D4738 equilibrium');assert.ok(m>0);}
 for(const angle of [.1,.5,1,1.5]){const h1=4*Math.sin(angle)**2/(2*g),h2=4/(2*g);assert.ok(h2>h1,'6E569C');close(2*g*h1,4*Math.sin(angle)**2,'6E569C vertical');}
 {const ax=2*g*(c-.5),ay=-g*s,T=ax+g*c;assert.ok(ax>0&&ay<0&&T>0);close(T-g*c,ax,'6F1007 radial');assert.ok(-ax*s+ay*c<0&&ax*c+ay*s>0);}
 for(const [id,M,m,L,l,k,a] of [['6F7274',.8,.4,.13,.1,80,4],['AB0C38',.6,.2,.14,.12,72,2.8]]){const spring=k*(L-l),T=M*a+.2*M*g;close(m*g-spring,m*a,id);close(m*g+spring-T,m*a,id);assert.ok(L>l&&T>0);}
 for(const [id,L,l] of [['8D9256',.15,.12],['FBCBC5',.18,.15]]){const spring=100*(L-l),a=7,T=6;close(spring-.25*g*s,.25*a,id);close(T-spring-.25*g*s,.25*a,id);close(2*g-T,2*a,id);}
 for(const id of ['93393A','DB33E7']){const M=.8,m=.2,a=1,F=6,f1=1,f2=3,T=1.2;close(f1-T,-m*a,id);close(F-T-f1-f2,M*a,id);}
 {const a=1/3,F=1.2,f=.4,T=11/15,t=Math.sqrt(1.5);close(F-T-f,.2*a,'C6A611 block');close(f-T,-a,'C6A611 board');close(a*t*t,.5,'C6A611 relative');}
 close(18-10,2*4,'7DEBA4');close(10,2.5*4,'7DEBA4');
 {const f=.1*g/(Math.SQRT1_2+.1*Math.SQRT1_2),a=f*(c+.1*s)-1,N=g-f*s;close(f*c-.1*N,a,'A0A0B3');assert.ok(a>0&&N>0);}
 {const mu=.6,N=.2*g/(c+mu*s),f=mu*N,a=g*(mu*c-s)/(c+mu*s);close(N*c+f*s,2,'AB0739 vertical');close(-N*s+f*c,.2*a,'AB0739 horizontal');assert.ok(a>0);}
 close(.4*g,4**2*.25,'AB3A90');close(.2*g-100*.015,.2*2.5,'C961A9');
}
module.exports={verifyPhysics};
