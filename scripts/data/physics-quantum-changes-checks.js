const assert=require('node:assert/strict');
const {cases}=require('./physics-quantum-changes-cases');
const {records}=require('./physics-quantum-changes');
const catalog=require('./physics-completion-catalog.json');
const code=(a,b)=>Math.abs(a-b)<1e-10?'3':b>a?'1':'2';
function verifyPhysics(){
 assert.ok(records['7A8110'].solution.includes('Импульс фотона p'));
 assert.ok(!records['7A8110'].solution.includes('Число протонов'));
 assert.deepEqual(Object.keys(cases).sort(),catalog.filter(t=>t.type==='quantum-change.changes').map(t=>t.id).sort());
 for(const [id,c]of Object.entries(cases)){
  let before,after;
  if(c.kind==='nucleus'){
   const Z=c.isotope?.Z||40,N=(c.isotope?.A||100)-Z;
   let p=Z,n=N;
   switch(c.mode){
    case'beta-':n--;p++;break;case'beta+':p--;n++;break;
    case'alpha':p-=2;n-=2;break;case'alpha-capture':p+=2;n+=2;break;
    case'electron-capture':p--;n++;break;case'neutron-capture':n++;break;
    case'isotope-lighter':n--;break;case'gamma':break;default:assert.fail(c.mode);
   }
   const state=(p,n)=>({A:p+n,nuc:p+n,p,n,q:p,el:p});
   before=state(Z,N);after=state(p,n);
   assert.equal(after.A,after.p+after.n);
   if(c.mode==='beta-')assert.equal(after.q-1,before.q);
   if(c.mode==='beta+')assert.equal(after.q+1,before.q);
   if(c.mode==='alpha')assert.equal(after.A+4,before.A);
   if(c.mode==='alpha-capture')assert.equal(after.A,before.A+4);
   if(c.mode==='electron-capture')assert.equal(after.q,before.q-1);
  }else{
   // Безразмерные h=c=e=m=1. Оба состояния лежат выше порога E>A.
   const state=(E,I)=>({E,nu:E,wave:1/E,p:E,K:E-2,U:E-2,v:Math.sqrt(2*(E-2)),work:2,limit:.5,c:1,photonRate:I/E,electronRate:I/E});
   before=state(5,10);
   const E=c.driver==='I'?5:c.driver==='wave'?1/(.2+c.direction*.02):5+c.direction;
   after=state(E,c.driver==='I'?10+c.direction*2:10);
   assert.ok(after.K>0);assert.equal(after.E,after.work+after.K);
   assert.ok(Math.abs(after.nu*after.wave-1)<1e-12);
   assert.ok(Math.abs(after.v**2/2-after.K)<1e-12);
   if(c.transition){
    const colors=['красный','оранжевый','жёлтый','зелёный','синий','фиолетовый','ультрафиолетовый'];
    const sign=Math.sign(colors.indexOf(c.transition[1])-colors.indexOf(c.transition[0]));
    assert.equal(Math.sign(after.nu-before.nu),sign,id+': color order');
   }
  }
  const answer=c.order.map(k=>code(before[k],after[k])).join('');
  assert.equal(answer,c.expected,id+': independently computed changes');
  assert.equal(records[id].answer,c.expected,id+': manual key');
  assert.ok(records[id].solution.includes('Проверка'));
 }
 return Object.keys(cases).length;
}
module.exports={verifyPhysics};
