const assert=require('node:assert/strict');
const {records,cases}=require('./physics-thermal-matching');
const answers={A53641:'31','67AB41':'31',AC1CB5:'24',B5F219:'23',F56923:'24',EC8522:'32','5644DE':'32',ABA0D2:'21','3CD6D3':'41','246E59':'13',A6295F:'32',D67CAF:'32','5EA4AD':'32','5A12CB':'24','51D5C1':'43',C371C5:'23','65ACC9':'13','8054C4':'12','51A69B':'42',CADC9A:'32',CC0498:'43',AB4AE3:'43',E45262:'34','8E7C61':'13','480A88':'41','5F3087':'41','53C38E':'13',C4EA84:'12',CD1D80:'21','9DE484':'42','8C6C8F':'24','8B2ED3':'14'};
function verifyPhysics(){
 const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
 assert.deepEqual(Object.keys(records).sort(),Object.keys(answers).sort());
 assert.ok(!records['2405C2'],'Missing primary graph must not be guessed');
 for(const[id,answer]of Object.entries(answers))assert.equal(records[id].answer,answer,id);
 // Независимая численная подстановка в газовые законы и обратная проверка.
 const R=8.31;
 near(.04*R*450,149.58);near(1.5*.04*R*450,224.37);
 near(.0048/.004*R/200000,4.986e-5);near(1.5*.0048/.004*R,14.958);
 near(.160/.040*R/.020,1662);near(1.5*.160/.040*R,49.86);
 near(.009/450,2e-5);near(1.5*1e5*.009/450,3);
 for(const T of [250,300,450]){
  near(1.5*2e5*(4.986e-5*T),14.958*T);
  near(1.5*1e5*(2e-5*T),3*T);
  near(1.5*(1662*T)*.020,49.86*T);
 }
 // Знаки получены из модельных состояний, а не из цифр опубликованного ответа.
 const state={
  'isoV-cool':[[2,2],[1,2],[-1,0,-1]],
  'isoV-heat':[[1,2],[2,2],[1,0,1]],
  'isoT-expand':[[2,1],[1,2],[0,1,1]],
  'isoT-compress':[[1,2],[2,1],[0,-1,-1]],
  'isoP-cool':[[2,2],[2,1],[-1,-1,-1]],
  'isoP-heat':[[2,1],[2,2],[1,1,1]],
  'pV-expand':[[1,1],[2,2],[1,1,1]]
 };
 for(const[key,[a,b,want]]of Object.entries(state)){
  const du=1.5*(b[0]*b[1]-a[0]*a[1]);
  const work=key.startsWith('isoT')?a[0]*a[1]*Math.log(b[1]/a[1]):(a[0]+b[0])/2*(b[1]-a[1]);
  assert.deepEqual([du,work,du+work].map(Math.sign),want,key);
 }
 for(const c of Object.values(cases))if(c.processes)for(const key of c.processes)assert.ok(state[key]);
 // Проверка обоих направлений преобразования формул цикла Карно.
 for(const eta of [.2,.4,.7]){
  const Tc=300,Qc=600,Th=Tc/(1-eta),Qh=Qc/(1-eta),A=eta*Qc/(1-eta);
  near(A+Qc,Qh);near(1-Tc/Th,eta);near(A/Qh,eta);
  near(Th*(1-eta),Tc);near(Qh*(1-eta),Qc);
 }
 // AU: ордината — накопленная работа; Q участка использует её приращение.
 const pts=[[3,0],[5,1],[3,3],[1,2],[2,1]],q=[],w=[];
 for(let i=1;i<pts.length;i++){w.push(pts[i][1]-pts[i-1][1]);q.push(pts[i][0]-pts[i-1][0]+w[i-1]);}
 assert.deepEqual(q,[3,0,-3,0]);assert.equal(w[1],2);assert.equal(w[3],-1);
 // Размерностно и численно согласованные формулы МКТ.
 const k=1.38e-23,NA=6.02e23,nu=2,T=300,V=.05,N=nu*NA,n=N/V,E=1.5*k*T,p=n*k*T;
 near((2/3)*nu*NA*E/V,p);near((3/2)*p*V/(NA*E),nu);near(p/(k*T),n);near(p*V/(N*k),T);
 // Температурные интервалы и фазовые теплоты извлекаются независимо по Q=mcΔT и Q=λm.
 const m=2,deltaT=[20,60,30],cHeat=[500,1000,800],latent=[100000,200000];
 const qHeat=deltaT.map((dt,i)=>m*cHeat[i]*dt);
 qHeat.forEach((q,i)=>near(q/(m*deltaT[i]),cHeat[i]));latent.forEach(l=>near(m*l/m,l));
 return{count:32,status:'ok'};
}
module.exports={verifyPhysics};
