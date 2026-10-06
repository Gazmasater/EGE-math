const assert=require('node:assert/strict');
const {records,cases}=require('./physics-electricity-circuits');
const number=s=>Number(s.replace(',','.'));
const close=(a,b,id)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<1e-8,`${id}: ${a} ≠ ${b}`);
// Независимый узловой расчёт: задаём входящий ток 1 А, потенциал B=0.
// Рёбра соответствуют резисторам исходной схемы; нулевые рёбра — замкнутые ключи.
function network(edges,input='A',ground='B'){
 const parent={};const find=x=>parent[x]===undefined?(parent[x]=x):parent[x]===x?x:(parent[x]=find(parent[x]));
 for(const[a,b,r]of edges){find(a);find(b);if(r===0)parent[find(a)]=find(b);}
 input=find(input);ground=find(ground);
 const nodes=[...new Set(edges.flatMap(e=>e.slice(0,2)).map(find))].filter(n=>n!==ground),index=Object.fromEntries(nodes.map((n,i)=>[n,i])),N=nodes.length;
 const m=Array.from({length:N},()=>Array(N+1).fill(0));m[index[input]][N]=1;
 for(const[aa,bb,r]of edges){const a=find(aa),b=find(bb);if(!r||a===b)continue;
  for(const[x,y]of[[a,b],[b,a]])if(x!==ground){m[index[x]][index[x]]+=1/r;if(y!==ground)m[index[x]][index[y]]-=1/r;}
 }
 for(let k=0;k<N;k++){
  let pivot=k;for(let j=k+1;j<N;j++)if(Math.abs(m[j][k])>Math.abs(m[pivot][k]))pivot=j;
  [m[k],m[pivot]]=[m[pivot],m[k]];assert.ok(Math.abs(m[k][k])>1e-12,'connected network');
  const p=m[k][k];for(let j=k;j<=N;j++)m[k][j]/=p;
  for(let i=0;i<N;i++)if(i!==k){const a=m[i][k];for(let j=k;j<=N;j++)m[i][j]-=a*m[k][j];}
 }
 const V=n=>find(n)===ground?0:m[index[find(n)]][N];
 // Проверяем каждый узел и энергетический баланс.
 for(const node of nodes){let sum=0;for(const[a,b,r]of edges)if(r){if(find(a)===node)sum+=(V(a)-V(b))/r;if(find(b)===node)sum+=(V(b)-V(a))/r;}close(sum,node===input?1:0,'Kirchhoff '+node);}
 const power=edges.reduce((p,[a,b,r])=>p+(r?(V(a)-V(b))**2/r:0),0);close(power,V(input),'network power');
 return{V,R:V(input)};
}
function switchEdges(shape,R,closed){
 const edges={
  'shunt-pair':[['A','X',R],['X','B',R],['X','B',R]],
  'shunt-common':[['A','X',R],['X','B',R],['X','B',R]],
  triangle:[['A','X',R],['X','B',R],['A','B',R]],
  'unequal-triangle':[['A','X',R],['X','B',R],['A','B',2*R]],
  'three-to-two':[['A','X',R],['A','X',R],['X','B',R]],
  selector:closed?[['A','X',R],['X','B',R],['X','B',R]]:[['A','X',R],['X','Y',R],['Y','B',R]]
 }[shape];
 if(closed&&shape==='three-to-two')edges.push(['A','X',R]);
 else if(closed&&shape!=='selector')edges.push(shape==='shunt-pair'?['X','B',0]:['A','X',0]);
 return edges;
}
function verifyPhysics(){
 assert.equal(Object.keys(records).length,59);
 for(const[id,c]of Object.entries(cases)){
  const expected=number(c.answer);let actual;
  if(c.kind==='constant-charge'){actual=c.I*c.t;close(expected/c.t,c.I,id+' reverse');}
  else if(c.kind==='charge-slope'){actual=c.q/c.t;close(expected*c.t,c.q,id+' reverse');}
  else if(c.kind==='resistance-graph'){actual=c.U/c.I;close(c.I*expected,c.U,id+' reverse');}
  else if(c.kind==='lamp-current'){actual=c.P/c.U;close(expected*c.U,c.P,id+' power');}
  else if(c.kind==='fuse-power'){actual=c.I*c.U;close(expected/c.U,c.I,id+' current');}
  else if(c.kind==='work-resistance'){actual=270000/(3*3*60);close(3*expected*3*60,270000,id+' work');}
  else if(c.kind==='nonlinear-power'){actual=1.5*20;close(expected/1.5,20,id+' coordinate');}
  else if(c.kind==='current-area'){
   actual=0;for(let j=1;j<c.points.length;j++){
    const[a,Ia]=c.points[j-1],[b,Ib]=c.points[j];if(a<c.start||b>c.end)continue;
    // Суммируем прямоугольник и треугольник, независимо от формулы трапеции в решении.
    actual+=Math.min(Ia,Ib)*(b-a)+Math.abs(Ib-Ia)*(b-a)/2;
   }
   const currents=c.points.filter(([t])=>t>=c.start&&t<=c.end).map(p=>p[1]),average=expected/(c.end-c.start);
   assert.ok(average>=Math.min(...currents)&&average<=Math.max(...currents),id+' average');
  }else if(c.kind==='branch-ammeter'){
   const {V}=network([['A','X',1],['X','Y',1],['Y','Z',1],['Z','B',1],['X','B',1]]);actual=c.I*V('X');
  }else if(c.kind==='five-voltmeter'){
   const R=c.R,{V}=network([['A','X',R],['X','Y',R],['Y','B',R],['X','Z',R],['Z','B',R]]);actual=c.I*V('Z');
  }else if(c.kind==='eight-voltmeter'){
   const {V}=network([['A','X',1],['X','T',1],['T','B',1],['X','L',1],['L','U',1],['U','B',1],['L','D',1],['D','B',1]]);
   actual=c.I*(c.part==='first'?V('X')-V('L'):c.part==='half'?V('L')-V('D'):V('X')-V('D'));
  }else if(c.kind==='equivalent-resistance'){
   const R=c.R,edges={
    'half-plus-double':[['A','X',R/2],['X','B',2*R],['X','Y',R],['Y','B',R]],
    unequal:[['A','X',2],['X','B',6],['X','B',3]],
    'pair-plus-two':[['A','X',R],['A','X',R],['X','Y',R],['Y','B',R]],
    'one-plus-two-one':[['A','X',R],['X','Y',R],['Y','B',R],['X','B',R]]
   }[c.network];actual=network(edges).R;
  }else if(c.kind==='switch'){
   const opened=network(switchEdges(c.shape,c.R,false)).R,closed=network(switchEdges(c.shape,c.R,true)).R;
   close(opened,c.ro,id+' open');close(closed,c.rc,id+' closed');actual=['open-final','position2'].includes(c.action)?opened:opened-closed;
  }else if(c.kind==='parallel-voltage'){const {V}=network([['A','X',5],['X','B',3],['X','B',1]]);const scaledCurrent=1/(V('X')/3);actual=scaledCurrent*V('X');}
  else if(c.kind==='photo-voltage'){actual=c.U*c.Rtarget/c.Rknown;close(expected/c.Rtarget,c.U/c.Rknown,id+' same current');}
  else if(c.kind==='photo-resistance'){actual=1.6/.8;close(.8*(1+expected+3),4.8,id+' whole chain');}
  else if(c.kind==='two-three-divider'){
   const {V}=network([['A','T',100],['T','B',100],['A','L',100],['L','M',100],['M','B',100]]);actual=12/V('T')*(V('A')-V('L'));
  }else if(c.kind==='emf-meter'){
   const {V}=network([['A','X',1],['X','Y',c.R1],['Y','B',c.R2]]),meter=c.meter===1?V('X')-V('Y'):V('Y');actual=2/meter*V('A');
  }else if(c.kind==='full-voltmeter'){const {V}=network([['A','X',1],['X','Y',3],['Y','B',2]]);actual=6/V('A')*(V('X')-V('Y'));}
  else if(c.kind==='terminal-voltage'){actual=24-2*1;close(24/(expected/2+1),2,id+' full circuit');}
  else throw Error(id+': unchecked '+c.kind);
  close(actual,expected,id);
  assert.equal(c.answer,String(Number(actual.toPrecision(12))).replace('.',','),id+': canonical numeric answer');
 }
 return true;
}
module.exports={verifyPhysics};
