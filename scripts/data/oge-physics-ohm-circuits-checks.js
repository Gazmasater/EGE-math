const assert=require('node:assert/strict');
const models=require('./oge-physics-ohm-circuits-models.json');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const num=s=>Number(s.replace(',','.').replace('−','-'));
const change=(before,after)=>Math.abs(before-after)<1e-9?'3':after>before?'1':'2';
// Solve node potentials for a one-volt supply. No series/parallel reduction is used.
function circuit(edges,end) {
 const count=end-1,A=Array.from({length:count},()=>Array(count).fill(0)),b=Array(count).fill(0);
 for(const [u,v,R] of edges) for(const [a,z] of [[u,v],[v,u]]) if(a!==0&&a!==end) {
  A[a-1][a-1]+=1/R;
  if(z===0)b[a-1]+=1/R;else if(z!==end)A[a-1][z-1]-=1/R;
 }
 for(let i=0;i<count;i++) {
  let pivot=i;for(let j=i+1;j<count;j++)if(Math.abs(A[j][i])>Math.abs(A[pivot][i]))pivot=j;
  [A[i],A[pivot]]=[A[pivot],A[i]];[b[i],b[pivot]]=[b[pivot],b[i]];
  const k=A[i][i];assert.ok(Math.abs(k)>1e-12);
  for(let j=i;j<count;j++)A[i][j]/=k;b[i]/=k;
  for(let j=0;j<count;j++)if(j!==i){const s=A[j][i];for(let c=i;c<count;c++)A[j][c]-=s*A[i][c];b[j]-=s*b[i];}
 }
 const V=[1,...b,0],current=edges.map(([u,v,R])=>(V[u]-V[v])/R);
 const input=edges.reduce((s,[u,v],i)=>s+(u===0?current[i]:v===0?-current[i]:0),0);
 const dissipation=edges.reduce((s,[u,v,R])=>s+(V[u]-V[v])**2/R,0);near(input,dissipation);
 return {R:1/input,V,current,input};
}
const networks={
 AFDA75:[[[0,1,2],[0,1,2],[1,2,6],[1,2,6]],2],
 CDE099:[[[0,1,8],[0,1,8],[1,2,10],[1,2,10]],2],
 '85E41C':[[[0,1,5],[1,2,2],[1,2,2]],2],
 E264DF:[[[0,1,1],[1,2,10],[1,2,10],[2,3,1]],3],
 '226DA5':[[[0,1,3],[0,1,3],[1,2,4]],2],
 '46E193':[[[0,1,6],[0,1,6],[1,2,3],[2,3,5]],3],
 '1ADDEA':[[[0,1,2],[1,2,4],[2,3,10],[2,3,10]],3],
 '11283D':[[[0,1,10],[0,1,10],[1,2,2],[2,3,2]],3]
};
module.exports=prepared=>{
 const rows=new Map(prepared.map(r=>[r.id,r]));
 for(const [id,m]of Object.entries(models)) {
  const row=rows.get(id),key=id.slice(7);assert.ok(row,id);const ans=num(row.answer);
  if(m.kind==='ohm-change'){near(m.U1/m.I1,m.U2/ans);}
  else if(m.kind==='two-factors'){
   const oldR=6,oldU=12,newR=oldR*m.rFactor,newU=oldU*m.uFactor,oldI=oldU/oldR,newI=newU/newR;
   near(ans,m.increase?newI/oldI:oldI/newI);near(newI*newR,newU);
  }else if(m.kind==='table-gap'){
   const U=m.unknown==='U'?ans:m.value,I=m.unknown==='I'?ans:m.value;near(U*m.I,I*m.U);
  }else if(m.kind==='table-resistance'){for(const [U,I]of m.pairs)near(I*ans,U);}
  else if(m.kind==='parallel-equal'){near(m.n/m.R,1/ans);}
  else if(m.kind==='network'){near(ans,circuit(...networks[key]).R);}
  else if(m.kind==='voltmeters'){
   const potential={left:m.U1,right:0,middle:m.U2};
   near(ans,potential.left-(m.target==='lamp'?potential.right:potential.middle));
  }else if(m.kind==='ammeters'){
   const layouts={common:[m.I1-m.I2,m.I2,m.I1], 'lamp-branch':[m.I1,m.I2,m.I1+m.I2],sum:[m.I1,m.I2,ans],difference:[m.I1,ans,m.I2]};
   const [a,b,total]=layouts[m.layout];near(a+b,total);assert.ok(a>=0&&b>=0);
   if(m.layout==='common')near(ans,total);if(m.layout==='lamp-branch')near(ans,a);
  }else if(m.kind==='series-current'){near(ans*m.R1+ans*m.R2,m.U);}
  else if(m.kind==='rheostat'||m.kind==='rheostat-branch'){
   const r0=8,r1=m.decrease?4:12;
   const before=circuit([[0,1,r0],[1,2,3],[2,3,6],[2,3,4]],3),after=circuit([[0,1,r1],[1,2,3],[2,3,6],[2,3,4]],3);
   const a=change(before.R,after.R),b=m.kind==='rheostat-branch'?change(before.current[2],after.current[2]):change(before.input,after.input);
   assert.equal(row.answer,a+b);near(after.current[2]+after.current[3],after.input);
  }else if(m.kind==='switch'){
   let before,after,first,second;
   if(m.layout==='bypass'){
    before=circuit([[0,1,4],[1,2,6]],2);after=circuit([[0,1,4]],1);first=change(before.input,after.input);second=change(before.R,after.R);
   }else if(m.layout==='add-branch'){
    before=circuit([[0,1,4],[1,2,6]],2);after=circuit([[0,1,4],[1,2,6],[0,2,3]],2);first=change(before.input,after.input);second=change(before.R,after.R);
   }else if(m.layout==='add-parallel'){
    before=circuit([[0,1,2],[1,2,4]],2);after=circuit([[0,1,2],[1,2,4],[1,2,6]],2);first=change(4,circuit([[0,1,4],[0,1,6]],1).R);second=change(before.input,after.input);
   }else{
    before=circuit([[0,1,4],[1,2,4]],2);
    after=m.layout==='parallel-common'?circuit([[0,1,4],[1,2,4],[1,2,4]],2):circuit([[0,1,4]],1);
    first=change(before.R,after.R);second=change(before.input,m.layout==='short-branch'?0:after.input);
   }
   assert.equal(row.answer,first+second);
  }else if(m.kind==='remove-lamps'){
   const R=[5,6,8,10,12],before=R.reduce((s,r)=>s+1/r,0),after=R.slice(0,2).reduce((s,r)=>s+1/r,0);
   assert.equal(row.answer,change(1/before,1/after)+change(before,after));
  }else if(m.kind==='lamp-text'){
   const U=12,R=6,oldP=U*U/R,c=m.layout==='series'?circuit([[0,1,R],[1,2,R]],2):circuit([[0,1,R],[0,1,R]],1);
   const totalP=U*U/c.R,individualP=(U*c.current[0])**2*R;
   if(m.layout==='series'){near(totalP/oldP,.5);near(individualP/oldP,.25);assert.equal(row.answer,'4157');}
   else{near(totalP/oldP,2);near(individualP/oldP,1);assert.equal(row.answer,key==='69DFC0'?'5146':'3276');}
  }else if(m.kind==='branch-voltage'){
   const c=circuit([[0,1,m.R1],[1,2,m.R2],[1,2,m.R3]],2),supply=m.I3/c.current[2];near(ans,supply*(1-c.V[1]));
  }else if(m.kind==='divider'){
   const c=circuit([[0,1,m.R1],[1,2,m.R2]],2);near(ans,m.U*(m.target==='AB'?1-c.V[1]:c.V[1]));
  }else if(m.kind==='series-power'){
   const c=circuit([[0,1,m.R1],[1,2,m.R2]],2),supply=m.total?m.U:m.U/c.V[1];
   near(ans,m.total?supply*supply/c.R:(supply*c.current[0])**2*m.R1);
  }else if(m.kind==='rated-lamps'){
   const R=m.powers.map(P=>m.ratedU*m.ratedU/P),c=circuit(R.map((r,i)=>[i,i+1,r]),3),P=c.current.map((i,k)=>(m.U*i)**2*R[k]);
   near(ans,P[m.target-1]);near(P.reduce((a,b)=>a+b),m.U*m.U*c.input);near(c.V[2]*m.U,110);
  }else throw Error(id+': unknown model '+m.kind);
 }
 assert.equal(Object.keys(models).length,49);
};
