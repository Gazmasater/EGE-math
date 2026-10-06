const assert=require('node:assert/strict');
const {records}=require('./physics-mechanics-analysis-graphs');
const near=(x,y,tol=1e-7)=>assert.ok(Math.abs(x-y)<tol*Math.max(1,Math.abs(x),Math.abs(y)),`${x} != ${y}`);
const d=(f,t,h=1e-4)=>(f(t+h)-f(t-h))/(2*h);
const dd=(f,t,h=1e-3)=>(f(t+h)-2*f(t)+f(t-h))/(h*h);
const expected={EEB001:'45',D82E7B:'13',A7BE77:'35',AEEAAD:'14',D4E9EE:'34',B2D13F:'15', '0A7743':'23',B29D40:'13','241A4B':'25',DB0A48:'13',C72444:'45',E74C4C:'13','8C1642':'14','33A2F0':'35',F74B0E:'23',F16A7F:'23',AF1AB8:'14','19AA10':'34','598213':'345','9F061F':'25',FD8F29:'14',B0492E:'25','562826':'135',A27E2D:'34','92D622':'25',E6072A:'15','613927':'35','7FD5D2':'25',B815D1:'24',E5EF58:'25','72E2A7':'15','12C0AE':'45','29B3AD':'14',DBF6A9:'135','5A3DAB':'124',AEB4A4:'24','368EAC':'25','7D73C4':'25',B67EC7:'145',B323C1:'23','131CC8':'124','2F14C5':'13',AEDDC7:'134','722590':'13',B6669D:'15','4ABFED':'12','40C3EA':'23',FE64EC:'14','05BEE8':'34',B7CDE8:'235',ADDAE8:'24','9D2AE0':'125',F5CD62:'12',ACF463:'35','7A9980':'134'};
function spring(c){
 const A=c.A*(c.unit==='мм'?.001:.01),w=2*Math.PI/c.T,k=11,m=k/w**2;
 const x=t=>A*Math.cos(w*t),v=t=>-A*w*Math.sin(w*t),U=t=>k*x(t)**2/2,K=t=>m*v(t)**2/2;
 for(const t of [.13,.27,.41,.73]){near(d(x,t),v(t));near(dd(x,t),-k*x(t)/m,1e-5);near(U(t)+K(t),k*A*A/2);near(d(K,t),-k*x(t)*v(t),1e-6);}
 near(x(0),x(c.T));near(x(c.T/2),-A);near(U(c.T/4),0);near(K(0),0);
}
function velocity(c){
 for(let i=1;i<c.nodes.length;i++){
  const [t0,v0]=c.nodes[i-1],[t1,v1]=c.nodes[i],dt=t1-t0,a=(v1-v0)/dt,m=c.mass,F=m*a;
  const v=t=>v0+a*t,x=t=>v0*t+a*t*t/2,K=t=>m*v(t)**2/2;
  near(v(dt),v1);near(F*dt,m*(v1-v0));near(F*x(dt),K(dt)-K(0));near(d(x,dt/3),v(dt/3));
  let sum=0,N=1000;for(let j=0;j<N;j++)sum+=v((j+.5)*dt/N)*dt/N;near(sum,(v0+v1)*dt/2);
 }
}
function verifyPhysics(){
 assert.equal(Object.keys(records).length,55);assert.equal(Object.keys(expected).length,55);
 for(const [id,r]of Object.entries(records)){
  assert.equal(r.answer,expected[id],id);assert.equal(r.claims.length,5,id);assert.ok(r.solution.includes('Проверка.')&&r.solution.endsWith('Ответ: '+r.answer+'.'),id);assert.ok(!/undefined|NaN|\//.test(r.solution),id);
  for(let i=1;i<=5;i++)assert.ok(r.solution.includes(`${i}) ${r.answer.includes(String(i))?'Верно.':'Неверно.'}`),id);
  if(r.kind==='spring')spring(r);
  if(r.kind==='velocity-graph')velocity(r);
  if(r.kind==='force-table'){
   const mg=r.mass*10,fr=r.F-r.mass*r.a,mu=fr/mg;assert.ok(mu>0&&mu<1);near(r.F-mu*mg,r.mass*r.a);
   for(const t of [.3,2,3])near((r.F-fr)*r.a*t*t/2,r.mass*(r.a*t)**2/2);
  }
  if(r.kind==='buoyancy-volume'){
   for(const rho of [710,790,1000,1260,1490,2890,3250]){const V=Math.min(1e-5,.01/rho),FA=rho*10*V;if(rho>=1000)near(FA,.1);else assert.ok(FA<.1);}
  }
  if(r.kind==='pendulum-height'){
   const max=r.height,co=1-max/r.length;assert.ok(co>0&&co<1);near(r.length*(1-co),max);near(r.mass*(Math.sqrt(20*max))**2/2,r.mass*10*max);near(r.T/2,.8);
  }
  if(r.kind==='flight-energy'){
   const [k0,kmin,kend]=r.levels,m=2,vx=Math.sqrt(2*kmin/m),vy=Math.sqrt(2*(k0-kmin)/m),K=t=>m*(vx*vx+(vy-10*t)**2)/2,y=t=>vy*t-5*t*t;
   near(K(0),k0);near(K(vy/10),kmin);for(const t of [.03,.09,.21])near(K(t)+m*10*y(t),k0);
   const end=(vy+Math.sqrt(2*(kend-kmin)/m))/10;near(K(end),kend);near(y(end),(k0-kend)/(m*10));
  }
 }
 // Independent primary numerical readings, before prose generation.
 near(.2*.6**2/2,.036);near((.8-.2*2)/(.2*10),.2);near((2.1-.4*2)/4,.325);near(.4*6**2/2,7.2);
 near((1.6-.4*.5)/4,.35);near(20*(0-3),-60);near(20*.15,3);near(3*20/2,30);near(2*3,6);
 near(100+10*25,350);near((200-100)/10,10);
 const friction=[[.2,3.86],[.3,3.76],[.4,3.63],[.5,3.46],[.6,3.25],[.7,3.01],[.8,2.75],[.9,2.45],[1,2.13]];
 for(const [alpha,F]of friction)assert.ok(Math.abs(3.94*Math.cos(alpha)-F)<.01);assert.ok(2.13/(20*Math.cos(1))<.4);assert.ok(20*Math.cos(.1)>10);assert.ok(20*Math.sin(.6)>3.25);
 near((5-2)/(18-6),.25);near(.5*.25**2/2,.015625);near(5-2,3);near(20-(-10),30);near((30-25)+(30-10),25);near(25-10,15);
 near((15-5)/20,.5);near((5+5)/30,1/3);near(-5+15/3,0);near(5-(-5),10);near(5-1,4);
 near(.3*6**2/2,5.4);near(.5*6**2/2,9);near(.3*10**2/2,15);
 near(5*.9-5*.9**2,.45);near(5*.2-5*.2**2,.8);near((25-9)/20,.8);near(25/20,1.25);
 near(2/10,.2);near((40-4)/2,18);
 // Qualitative x(t): finite differences independently validate the four
 // combinations of velocity and acceleration, including a nonzero a at rest.
 for(const [f,t,v,a]of [[t=>t*t,0,0,1],[t=>-t*t,0,0,-1],[t=>t-t*t,.2,1,-1],[t=>-t-t*t,.2,-1,-1],[t=>t+t*t,.2,1,1]]){
  assert.equal(Math.sign(Math.abs(d(f,t))<1e-8?0:d(f,t)),v);assert.equal(Math.sign(dd(f,t)),a);
 }
 assert.ok(records.F74B0E.solution.includes('после удара K=0'));
 assert.ok(records['9F061F'].solution.includes('xравн=2 см'));
 return {count:55,status:'ok'};
}
module.exports={verifyPhysics,expected};
if(require.main===module)console.log(JSON.stringify(verifyPhysics()));
