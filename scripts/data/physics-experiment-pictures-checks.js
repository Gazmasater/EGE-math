const assert=require('node:assert/strict');
const expected={'0B0CF0':'45','4CC40B':'14','A88C1A':'25','67CE1F':'13','7D4F20':'15','BE7727':'24','70B4D7':'12','E74BD4':'35','7C0D59':'23','9E32CF':'13','9C7FC3':'24','72FC30':'15','CC1C3E':'24','DADA8C':'23'};
function close(a,b,msg){assert.ok(Math.abs(a-b)<1e-10,msg);}
function verifyPhysics(){
 const {records}=require('./physics-experiment-pictures');
 const {diagrams}=require('./physics-experiment-pictures-diagrams');
 assert.deepEqual(Object.keys(records).sort(),Object.keys(expected).sort());
 for(const [id,answer]of Object.entries(expected)){
  const r=records[id];assert.equal(r.answer,answer,id);const pairs=[];
  for(let i=0;i<5;i++)for(let j=i+1;j<5;j++){
   const diff=r.fields.map((_,k)=>k).filter(k=>r.rows[i][k]!==r.rows[j][k]);
   if(diff.length===1&&diff[0]===r.changed)pairs.push(String(i+1)+String(j+1));
  }
  assert.deepEqual(pairs,[answer],id+': single controlled variable');
  for(const image of r.images)assert.ok(diagrams[id].includes(image),id+': original raster');
  assert.ok(r.solution.includes('Ответ: '+answer));
  assert.ok(!r.solution.includes('ρ_жgV'),id+': subscript boundary');
 }
 // Independent numerical checks use arbitrary physical parameters, not pixel sizes.
 const E=6,R=8,r=2,C=3e-6;
 function charge(e,internal,load){const I=e/(load+internal),U=e-I*internal;close(U,I*load,'voltage balance');return C*U;}
 close(charge(2*E,r,R)/charge(E,r,R),2,'4CC40B');
 close(charge(E,r,2*R)/charge(E,r,R),2*(R+r)/(2*R+r),'7D4F20');
 close(charge(2*E,r,2*R)/charge(2*E,2*r,2*R),(2*R+2*r)/(2*R+r),'7C0D59');
 close((E/(2*R+r))/(2*E/(2*R+r)),.5,'A88C1A');
 close((3*E/(4*R+2*r))/(3*E/(4*R+r)),(4*R+r)/(4*R+2*r),'BE7727');
 const T=(l,c)=>2*Math.PI*Math.sqrt(l*c);close(T(.01,2e-6)/T(.02,2e-6),Math.SQRT1_2,'70B4D7');close(T(.01,2e-6)/T(.01,4e-6),Math.SQRT1_2,'DADA8C');
 const cap=(eps,s,d)=>8.854e-12*eps*s/d;
 close(cap(2,.03,.004)/cap(2,.01,.004),3,'area indices not factors');
 close(cap(3,.02,.005)/cap(3,.02,.002),.4,'E74BD4');
 close(cap(3,.01,.002)/cap(3,.01,.005),2.5,'9C7FC3');
 const resist=(rho,l,s)=>rho*l/s;close(resist(1.7e-8,3,1e-6)/resist(1.7e-8,1.2,1e-6),2.5,'wire length');
 const mu=.1,alpha=Math.PI/6,g=10,m=.2,N=m*g*Math.cos(alpha);
 const a4=(m*g*Math.sin(alpha)-2*mu*N)/m,a5=(m*g*Math.sin(alpha)-mu*N)/m;
 close(a5-a4,mu*g*Math.cos(alpha),'slope force projections');
 function buoyancy(rho,V,rhoBody){const weight=rhoBody*V*g,Tension=weight-rho*V*g;close(Tension+rho*V*g-weight,0,'buoyancy equilibrium');return weight-Tension;}
 close(buoyancy(800,2e-5,8900)/buoyancy(1000,2e-5,8900),.8,'72FC30');
 close(buoyancy(800,2e-5,7800)/buoyancy(800,5e-5,7800),.4,'CC1C3E');
 return true;
}
module.exports={verifyPhysics};
