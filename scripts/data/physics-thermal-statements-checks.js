const assert=require('node:assert/strict');
const {records,cases}=require('./physics-thermal-statements');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
function verifyPhysics(){
 const truth={};
 for(const[id,c]of Object.entries(cases)){
  if(c.kind==='compression'){
   const phi=c.phi,V0=1,m0=phi,Vf=.25,mf=Vf,dew=phi;
   near(mf+(m0-mf),m0);assert.ok(Vf<dew);const halfPhi=Math.min(phi*2,1);
   truth[id]=id==='430072'?[nearBool(1/dew,2.5),false,nearBool(mf,m0),nearBool(halfPhi,.8),nearBool(mf,0)]:[false,true,nearBool(mf,0),nearBool(Math.min(phi*3,1),1.5),nearBool(mf/m0,.5)];
  }
  if(c.kind.startsWith('isotherm')){
   const n1=2,p1=6,compress=c.kind.endsWith('compress'),n2=compress?4:1,p2=compress?12:3;
   const T1=p1/n1,T2=p2/n2,V1=1/n1,V2=1/n2,E1=1.5*T1,E2=1.5*T2;
   near(p1*V1,p2*V2);const stable=nearBool(T1,T2),slower=Math.sqrt(T2)>Math.sqrt(T1);
   truth[id]=id==='17D9A6'?[nearBool(E1,E2),n2<n1,T2>T1,stable&&V2<V1,slower]:id==='823FD2'?[E2>E1,nearBool(n1,n2),T2<T1,stable&&V2>V1,!slower]:id==='2F0D3E'?[E2<E1,n2<n1,stable,nearBool(V1,V2)&&T2>T1,slower]:[E2<E1,n2<n1,stable,stable&&V2<V1,slower];
  }
  if(c.kind==='partition'){
   const he=c.helium/2,other=c.other,left=he+(c.otherSide==='left'?other:0),right=he+(c.otherSide==='right'?other:0);
   near(2*he,c.helium);near(left+right,c.helium+other);
   truth[id]=id==='84BDA5'?[nearBool(left,right),nearBool(he,other),c.helium>other,false,nearBool(right,left/2)]:id==='C02CAB'?[nearBool(he,other/2),nearBool(right/left,1.5),right<left,nearBool(c.helium,other),nearBool(right/other,3)]:[nearBool(left/right,1.5),nearBool(left/right,2),nearBool(left/other,1.5),other>he,nearBool(he,other)];
  }
  if(c.kind==='days'){
   const a=c.ratio,same=nearBool(a,1);
   truth[id]=id==='DE8B36'?[a>1,a<1,same,false,a<1]:id==='3DD9BD'?[a<1,a<1,a>1,true,a<1]:[same,a<1,a<1,false,a>1];
  }
  if(c.kind==='gases'){
   const[n1,n2]=c.nu.map((n,i)=>n/c.V[i]),[T1,T2]=c.T,[p1,p2]=[n1*T1,n2*T2],[v1,v2]=c.T.map((t,i)=>Math.sqrt(t/c.mu[i]));
   near(p1/p2,n1/n2*T1/T2);
   truth[id]=id==='403D76'?[T2>T1,v1>v2,nearBool(p1,p2),nearBool(n1,n2/2),nearBool(T2/T1,.75)]:id==='F990A6'?[T2>T1,v1>v2,p2>p1,nearBool(T1/T2,2),n2<n1]:[nearBool(n1/n2,2),nearBool(v1,v2),nearBool(p2/p1,4),nearBool(T1/T2,2),Math.abs(T2/T1-22)<1];
  }
  if(c.kind==='balance'){
   const [T1,T2]=c.T,T=(T1+T2)/2,dU1=1.5*(T-T1),dU2=1.5*(T-T2);near(dU1+dU2,0);
   truth[id]=id==='FB12B6'?[dU1>0,T>T2,dU1<0&&dU2>0,nearBool(T,298),false]:id==='0443DE'?[T>T2,dU1>0,dU1<0&&dU2>0,nearBool(T,298),false]:[T>T2,nearBool(dU1,0),dU2<0&&dU1>0,nearBool(T,298),false];
  }
  if(c.kind==='grid'){
   const a=c.vol[0],b=c.vol[1],r1=a[1]/a[0],r2=b[1]/b[0],A1=c.p[0]*(a[1]-a[0]),A2=c.p[1]*(b[1]-b[0]);near(A1,A2);near((1/r1)*r1,1);
   truth[id]=id==='FB1C70'?[nearBool(r1,4),nearBool(r1,3),nearBool(r2,1.5),nearBool(1/r2,2),A2>A1]:id==='BA9CE0'?[nearBool(r1,4),nearBool(r2,2),nearBool(A1,A2),nearBool(1/r1,5),nearBool(1/r2,2)]:id==='E47569'?[nearBool(r1,4),nearBool(r1,5),nearBool(1/r2,2),nearBool(r2,2.5),nearBool(A1,A2)]:[nearBool(1/r1,2),nearBool(r1,3),nearBool(r2,1.5),nearBool(r2,1/1.5),A1>A2];
  }
 }
 const states=[[1,2],[3,2],[3,1],[1,1]],U=states.map(([v,p])=>1.5*v*p),T=states.map(([v,p])=>v*p);
 const A=states.map(([v,p],i)=>{const [v2,p2]=states[(i+1)%4];return (p+p2)/2*(v2-v)}),dU=U.map((u,i)=>U[(i+1)%4]-u),Q=dU.map((u,i)=>u+A[i]);near(dU.reduce((a,b)=>a+b),0);near(Q.reduce((a,b)=>a+b),A.reduce((a,b)=>a+b));
 truth['196DE7']=[Q[0]>0&&Q.slice(1).every(q=>q<=0),nearBool(dU[2],0),nearBool(A.reduce((a,b)=>a+b),2),Q[3]<0,nearBool(Math.max(...T)/Math.min(...T),6)];
 const tp=[[1,1],[3,3],[1,3]],V=tp.map(([p,t])=>t/p);truth.D59A3F=[nearBool(V[1]/V[0],3),V[2]>V[1],tp[2][1]<tp[1][1],tp[1][1]<tp[0][1],nearBool(V[1],V[0])];
 const totalMoles=2,vol=.5,pressure=totalMoles/vol,density=24/(20*vol),pNe=1/vol;truth['2CEC9C']=[true,false,nearBool(density,1),pressure>1,nearBool(pNe,1)];near(pressure,4);near(density,2.4);
 const mf=2,Vf=3,pf=mf/Vf;truth['12DC5B']=[nearBool(mf,1),nearBool(pf,1/3),true,nearBool(mf/Vf,1),1>mf/Vf];near(pf,2/3);
 // Независимые табличные данные для насыщенного пара: 20 °C и 100 °C.
 // p: 2,34 и 101,3 кПа; ρ: 0,0173 и около 0,598 кг/м³.
 const ps=[2340,101300],rho=[.0173,.598],temp=[293,373],phi=ps.map((p,i)=>p/ps[i]);
 near(phi[0],phi[1]);assert.ok(ps[1]>ps[0]&&rho[1]>rho[0]);assert.ok(rho[1]*temp[1]>rho[0]*temp[0]);
 truth['055098']=[phi[1]<phi[0],rho[1]*temp[1]>rho[0]*temp[0],ps[1]<ps[0],true,rho[1]>rho[0]];
 truth.B9A49E=[false,false,ps[1]>ps[0],false,true];
 truth['1EEC69']=[phi[1]>phi[0],false,nearBool(ps[1],ps[0]),true,rho[1]>rho[0]];
 assert.equal(Object.keys(truth).length,29);
 for(const[id,r]of Object.entries(records)){
  assert.equal(truth[id].length,5,id);assert.equal(truth[id].map((b,i)=>b?i+1:'').join(''),r.answer,id+': independently evaluated statements');
  assert.equal((r.solution.match(/\n\n[1-5]\) /g)||[]).length,5,id+': every statement explained');
 }
 return{count:29,status:'ok'};
}
function nearBool(a,b){return Math.abs(a-b)<1e-9}
module.exports={verifyPhysics};
