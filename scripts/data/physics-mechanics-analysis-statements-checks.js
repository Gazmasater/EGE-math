const assert=require('node:assert/strict');
const {records}=require('./physics-mechanics-analysis-statements');
const expected={'3A9974':'35',BF0C66:'35','3EF97F':'12','91A222':'25','245462':'34',F64C40:'12','9F9A86':'34',ACFD5A:'45','1CC443':'12','664373':'23','7552E3':'34',EEB120:'35','6CED45':'25','5E23A7':'45','7D140C':'45','698D8C':'23',E5C0B9:'14','74CD5F':'34',A85550:'14',C1C6AE:'15'};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
function verifyPhysics(){
 assert.equal(Object.keys(records).length,20);
 for(const [id,r]of Object.entries(records)){
  assert.equal(r.answer,expected[id],id);assert.equal(r.claims.length,5,id);assert.ok(!/undefined|NaN|\//.test(r.solution),id);
  assert.ok(r.solution.includes('Проверка.')&&r.solution.endsWith('Ответ: '+expected[id]+'.'),id);
  for(let k=1;k<=5;k++)assert.ok(r.solution.includes(`${k}) ${expected[id].includes(String(k))?'Верно.':'Неверно.'}`),id);
 }
 // Three distinct numerical bridge conditions, checked through radial dynamics.
 for(const [m,v,R,a,N]of [[10000,72/3.6,80,5,50000],[500,72/3.6,80,5,2500],[2000,36/3.6,40,2.5,15000]]){
  near(v*v/R,a);near(m*10-N,m*a);assert.ok(N>0&&N<m*10);near((m*10-N)/m,v*v/R);
 }
 // Elliptic orbit: conservation of angular momentum and energy, not circular speed.
 const mu=24,rp=2,ra=6,ell=(rp+ra)/2,vp=Math.sqrt(mu*(2/rp-1/ell)),va=Math.sqrt(mu*(2/ra-1/ell));
 near(rp*vp,ra*va);near(vp*vp/2-mu/rp,va*va/2-mu/ra);assert.ok(vp>va&&mu/rp**2>mu/ra**2);assert.ok(-mu/rp < -mu/ra);assert.ok(Math.abs(vp-Math.sqrt(mu/rp))>.1);
 // Float equilibrium and reserves, using displaced mass rather than copied prose.
 const rho=1000,S=.04,H=.05,m=1;near(2*m*10,rho*10*S*H);near(2*m/(S*2*H),500);
 for(const [payload,h]of [[.5,.0625],[.7,.0675],[1.5,.0875]]){near(rho*S*h,2*m+payload);assert.ok(h<2*H);}
 for(const [extra,dh]of [[1,.025],[2,.05],[3,.075]])near((2+extra)*m/(rho*S)-H,dh);
 for(const other of [800,900]){assert.ok(2*m/(other*S)>H);near(other*10*S*(2*m/(other*S)),20);}
 near(1000*(1/30)*.03,1);near(2/(1000*(1/30))-.03,.03);near(1/((1/30)*.06),500);
 // Pendulum phase: next minimum is half a period after release.
 for(const [nu,T,quarter,half]of [[2,.5,.125,.25],[.5,2,.5,1]]){
  near(1/nu,T);near(Math.cos(2*Math.PI*quarter/T),0);near(Math.cos(2*Math.PI*half/T),-1);near(Math.cos(2*Math.PI*T/T),1);
  const K=t=>Math.sin(2*Math.PI*t/T)**2;near(K(quarter),1);near(K(half),0);near(K(T),0);
  const theta=.2;assert.ok(Math.cos(theta)<1);assert.ok(1+2*(1-Math.cos(theta))>Math.cos(theta));
 }
 near((120-10*10)/10,2);near((90-100)/10,-1);near((102-100)/10,.2);
 // Collision: check each final momentum and energy as well as total balance.
 const u=.2*3/1.2;near(u,.5);near(1.2*u,.6);near(.5*u*u,.125);near(.5*.2*u*u,.025);near(.5*.2*3**2-.5*1.2*u*u,.75);
 // Same tanks in two orientations: equal volume, unequal pressures, equal forces.
 for(const a of [.1,.6,2]){const h1=a,h2=2*a,S1=2*a*a,S2=a*a;near(h1*S1,h2*S2);near(h2/h1,2);near(1000*10*h1*S1,1000*10*h2*S2);near(S2/S1,.5);near((11/10-1)*100,10);}
 // Ballistic pendulum: horizontal impulse during collision, energy afterwards.
 for(const M of [.1,1,10]){const m=.01,v0=2,l=1,g=10,u=m*v0/(M+m),omega=Math.sqrt(g/l),A=u/omega;
  near((M+m)*u,m*v0);near(.5*(M+m)*u*u,.5*(M+m)*g*A*A/l);near(2*Math.PI/omega,2*Math.PI*Math.sqrt(l/g));
  const larger=m*v0/(2*M+m)/omega;assert.ok(larger<A);
 }
 // Equal periods but different phases and amplitudes on the two original curves.
 const w=2*Math.PI/4,x1=t=>.02*Math.sin(w*t),x2=t=>.01*Math.cos(w*t);
 near(x1(1),x1(5));near(x2(0),x2(4));near(x1(1),.02);near(x2(0),.01);near(.02**2/.01**2,4);
 assert.ok(records.ACFD5A.solution.includes('K=E+'));assert.ok(records.A85550.solution.includes('горизонтальной проекции'));assert.ok(records['7D140C'].solution.includes('из покоя'));
 return{count:20,status:'ok'};
}
module.exports={verifyPhysics,expected};if(require.main===module)console.log(JSON.stringify(verifyPhysics()));
