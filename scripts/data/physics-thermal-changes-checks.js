const assert=require('node:assert/strict');
const {cases,records}=require('./physics-thermal-changes');
const catalog=require('./physics-completion-catalog.json');
const code=(a,b)=>Math.abs(a-b)<1e-10*Math.max(1,Math.abs(a),Math.abs(b))?'3':b>a?'1':'2';
// Ручной эталон получен непосредственно из условий и всех 17 первичных растров.
const golden={F5A444:'31','298FF1':'32',C427F7:'32',C775FB:'14','4F400B':'13',FB5B0D:'13','1D2B0A':'32','28120C':'33',F0D87A:'21','70D177':'32','71D77C':'13',DD4F7F:'13','921B74':'32','352D7E':'22','0A7BB6':'13',B313B2:'11','2F8DB4':'11','1ED71B':'23','2D4D17':'33',BB4D24:'32',C6FF20:'11','9D022C':'22','41FED2':'22','4466D2':'32','987D51':'22','4EE1A0':'23',F434C4:'11',F12DCD:'11','0D4FC9':'12',B635CA:'12','72EF92':'11',C17D9F:'245','24F2EB':'13','4B8B6B':'22','8B2869':'33','8E3266':'22','77F13C':'23','757439':'11','135B3C':'22','85E437':'32','11818F':'22','95688F':'11','3BDF8F':'21','3DED80':'11'};
// Независимые допустимые состояния (p,V) при νR=1. Числа безразмерны;
// если оси не размечены, проверяют законы и направления, а не масштаб рисунка.
const graphStates={
 F5A444:[[1,1],[2,1],[4,.5]],'4F400B':[[1,1],[2,1]],
 F0D87A:[[1,1],[1,3],[2,3]],'921B74':[[1,4],[1,1]],
 '2F8DB4':[[1,1],[1,3],[2,1.5]],'1ED71B':[[2,3],[2,1],[1,1]],
 '4466D2':[[1,1],[2,1],[4,.5]],'4EE1A0':[[2,3],[2,1],[1,1]],
 F12DCD:[[1,3],[3,1],[3,.5]],B635CA:[[2,3],[2,1],[1,1]],
 '24F2EB':[[1,1],[1,3],[2,3]],'8B2869':[[1,1],[2,1],[2,3]],
 '757439':[[1,1],[3,3],[1,2]]
};
function verifyPhysics(){
 assert.deepEqual(Object.keys(cases).sort(),catalog.filter(t=>t.type==='thermal-change.changes').map(t=>t.id).sort());
 assert.equal(Object.keys(cases).length,44);
 for(const[id,c]of Object.entries(cases)){
  assert.equal(c.answer,golden[id],id+': manual original check');assert.equal(records[id].answer,golden[id]);
  let answer;
  if(c.kind==='graph'){
   const states=graphStates[id].map(([p,V])=>({p,V,T:p*V,U:1.5*p*V,n:1/V,rho:1/V}));
   answer=c.order.map(k=>{const[,v,a,b]=k.match(/^(.*)(\d)(\d)$/);return code(states[a-1][v],states[b-1][v]);}).join('');
   for(const s of states){assert.equal(s.p*s.V,s.T);assert.equal(s.n*s.V,1);}
   if(id==='757439'){assert.equal(states[1].T/states[0].T,9);assert.equal(states[0].n/states[2].n,2);}
  }else if(c.kind==='mixture'){
   const initial=c.initial,end=initial.map((v,i)=>.5*v+c.added[i]);
   const p=(v)=>v*8.31*300/.01;
   answer=code(p(initial[0]),p(end[0]))+code(initial.reduce((a,b)=>a+p(b),0),end.reduce((a,b)=>a+p(b),0));
   assert.ok(Math.abs(end.reduce((a,b)=>a+p(b),0)-p(end[0]+end[1]))<1e-7);
  }else if(c.kind==='carnot'){
   // Перебираем диапазон допустимых изменений, а не только один пример.
   for(const delta of [10,30,60]){
    const Th0=600,Tc0=300,Qc0=150,Qh0=300;
    let Th=Th0,Tc=Tc0,Qc=Qc0,Qh=Qh0;
    if(c.driver==='hot')Th+=c.direction*delta;
    if(c.driver==='cold')Tc+=c.direction*delta;
    if(c.driver==='hotHeat'){Qh+=delta;Th=Tc*Qh/Qc;}
    else if(c.fixed==='coldHeat')Qh=Qc*Th/Tc;
    else Qc=Qh*Tc/Th;
    const eta=1-Tc/Th,A=Qh-Qc;
    assert.ok(Math.abs(eta*Qh-A)<1e-9);assert.ok(Math.abs(Qc/Qh-Tc/Th)<1e-9);
    answer=code(.5,eta)+code(c.request==='hotHeat'?Qh0:Qh0-Qc0,c.request==='hotHeat'?Qh:A);
    assert.equal(answer,golden[id],id+': finite Carnot variation');
   }
  }else{
   // Отдельные балансы для качественных задач: [до,после] для каждого поля.
   const pairs={
    '298FF1':[[100,100],[10,5]],C427F7:[[4*300/4,2*300/2],[4*300,2*300]],
    '1D2B0A':[[1,1],[100,100-20]],'28120C':[[2300,2300],[2300/(1.38e-23*293),2300/(1.38e-23*293)]],
    '70D177':[[4200,4200],[1,.8]],DD4F7F:[[300/2,300/1],[1.5*300,1.5*300]],
    '2D4D17':[[100,100],[2/2,1/1]],BB4D24:[[100,100],[100/300,100/600]],
    '0D4FC9':[[1.5*100*1,1.5*100*2],[1/1,1/2]],'72EF92':[[1,1.1],[1.5*300,1.5*330]],
    '8E3266':[[2/1,1/1],[2,1]],'135B3C':[[300,300/Math.pow(2,.4)],[1/1,1/2]],
    '3BDF8F':[[1,2/3],[1.5*1*300,1.5*(2/3)*900]]
   };
   if(c.kind==='statements'){
    const p0=100000,M=2,g=10,S=.01,p=p0+M*g/S;
    assert.equal(p*S,p0*S+M*g);
    assert.ok(p0+(M+1)*g/S>p);
    const A=p*(-.001),external=-A;assert.ok(external>0&&A<0);
    const truth=id==='C775FB'?[true,false,false,true,false]:[false,true,false,true,true];
    answer=truth.map((v,i)=>v?String(i+1):'').join('');
   }else answer=pairs[id].map(([a,b])=>code(a,b)).join('');
  }
  assert.equal(answer,golden[id],id+': independent physical calculation');
 }
 assert.ok(records['28120C'].solution.includes('конденсируется'));
 assert.ok(records['3BDF8F'].solution.includes('две трети'));
 assert.ok(records.C17D9F.solution.includes('Q=A<0'));
 assert.ok(records['1D2B0A'].solution.includes('Q_газ=−Q_отд'));
 return true;
}
module.exports={verifyPhysics};
