const assert=require('node:assert/strict');
const {cases}=require('./physics-quantum-matching-cases');
const {records}=require('./physics-quantum-matching');
const cat=require('./physics-completion-catalog.json');
function verifyPhysics(){
 assert.deepEqual(Object.keys(cases).sort(),cat.filter(t=>t.type==='quantum-change.matching').map(t=>t.id).sort());
 for(const[id,c]of Object.entries(cases)){
  let answer;
  if(c.kind==='levels'){
   // Неравные отрицательные уровни: порядок результата не зависит от расстояний.
   for(const energy of [[-10,-6,-3,-1,-.3],[-100,-99,-30,-20,-1],[-9,-8,-7,-6,-5]]){
    answer=c.queries.map(([process,extreme,value])=>{
     const candidates=c.arrows.map(([a,b],i)=>({a,b,i,delta:energy[b]-energy[a]})).filter(x=>process==='abs'?x.delta>0:x.delta<0);
     for(const x of candidates){const photon=Math.abs(x.delta);x.value=value==='wave'?1/photon:photon;}
     candidates.sort((a,b)=>a.value-b.value);const selected=candidates[extreme==='min'?0:candidates.length-1];
     return c.output==='energy'?String(Math.max(selected.a,selected.b)):String(selected.i+1);
    }).join('');assert.equal(answer,c.expected,id+': independent energy ranking');
   }
  }else if(c.kind==='reaction'){
   const [A,Z,a,z]=c.alphaData,[B,Q,b,q]=c.betaData;
   assert.equal(A,a+4);assert.equal(Z,z+2);assert.equal(B,b);assert.equal(Q,q-1);
   answer=String(c.alpha)+c.beta;
  }else if(c.kind==='formula'){
   const h=7,nu=3,c0=11,E=h*nu,p=E/c0,wave=c0/nu;
   const options=id==='7D7448'?[p/h,h/p,E/p,E/h]:[h/wave,h*wave/c0,c0/wave,c0*wave];
   const values={wave,nu,p};answer=c.order.map(k=>String(options.findIndex(v=>Math.abs(v-values[k])<1e-10)+1)).join('');
   assert.ok(Math.abs(p*wave-h)<1e-12);
  }else{
   // Гипербола фотона Eλ=hc; линейный фотоэффект K=hν−A выше порога.
   const photon=lambda=>6/lambda,K=nu=>2*nu-4;
   assert.equal(photon(4),photon(2)/2);assert.equal(K(2),0);assert.equal(K(5)-K(4),K(4)-K(3));
   answer=id==='D4FFF9'?'23':'21';
  }
  assert.equal(answer,c.expected,id);assert.equal(records[id].answer,c.expected);
 }
 return Object.keys(cases).length;
}
module.exports={verifyPhysics};
