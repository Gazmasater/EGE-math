const assert=require('node:assert/strict');
const {cases}=require('./physics-nucleus-cases');
const {records}=require('./physics-nucleus-solutions');
// Ответы получены при ручном чтении условий, таблиц и всех исходных графиков.
// Этот независимый эталон не вычисляется генератором решений.
const expected={
 '2B1449':'50; 69','BA68F8':'109; 78','23190A':'47; 61','2DC278':'30; 35','A3ED17':'38','025229':'83',
 'EFD052':'26; 29','443DAA':'26; 30','4BE6E6':'17; 18','1B27E1':'79; 118','EC8EE5':'49; 60','208C3C':'79','7DBD83':'143','BBF494':'83; 129',
 'B00348':'31; 38','10ACF0':'3; 4','1182F1':'29; 36','A773F6':'29','832908':'20','FCC0BD':'12; 13',
 '9D0120':'19; 20','46CBD4':'31; 40','B4965C':'12; 12','114583':'4','291E83':'20; 24',
 '51A14C':'88','51C0F9':'4; 8','6E1C06':'56; 139','73F87D':'7','018DD9':'8','4E8A5D':'5','A21154':'92',
 'F3BEA3':'1; 3','1FCCAC':'7; 14','2787C9':'2; 4','9CE5C3':'6; 12','6791CC':'92; 235','AC25E0':'7; 3',
 'EDE5E5':'36; 94','4E4A6F':'14; 7','783A63':'9; 4','EF2E6D':'4','DBDB89':'2; 3','526485':'38; 94',
 '2B6FF4':'82; 210','8217F2':'254; 99','7DBC2D':'89; 222','6DA0D0':'82','CCF155':'76','7C1C92':'77; 195',
 '27B09D':'86; 222','AE1495':'91','E0F59A':'89; 229','7F9E81':'81','BF9E88':'228; 89','A2B69D':'81; 127',
 '4C2E4A':'15 мг','29EB4C':'3,5 мг','E42042':'4 раза','17ABFD':'25 %','F60603':'4 раза','CEDB0C':'1 мкмоль',
 'E8F305':'0,125 мкмоль','DCA275':'75 %','382D7A':'1,5 мкмоль','AB2CB2':'0,875 моль','0AE41E':'0,25 мкмоль',
 '23065B':'87,5 %','225158':'0,025 моль','9758C9':'0,05 моль','38C6C8':'0,05 моль','3D189C':'0,5 мкмоль',
 '727DED':'25 %','11ADE6':'0,5 мкмоль','CE6369':'5 мг','CFDA37':'26 мг','4E738E':'0,2 мкмоль','E47D8A':'75 %',
 '8F0C7B':'25 с','09F656':'50 с','FBBB96':'2,5 с','89D780':'20 с','B31CD6':'42 ч','E423E8':'78 лет','BCED39':'3 года',
 '453BF5':'5 мин','E416F3':'25 мин','8F8B26':'5 мин','B212D5':'192 ч','7428AB':'5 ч','FA1532':'50 с',
 'B7393B':'50 с','371D5C':'4 мкс','B41DCE':'30 мин','1EFF0B':'3','8B060E':'2','72EC29':'1','1D5FAF':'3'
};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9*Math.max(1,Math.abs(b)),`${a} != ${b}`);
function verifyPhysics(){
 const catalog=require('./physics-completion-catalog.json');
 assert.deepEqual(Object.keys(expected).sort(),catalog.filter(t=>t.type==='quantum.nucleus'&&t.part===1).map(t=>t.id).sort());
 assert.deepEqual(Object.keys(records).sort(),Object.keys(expected).sort());
 for(const [id,c]of Object.entries(cases)){
  assert.equal(records[id].answer,expected[id],id);
  const numbers=expected[id].match(/\d+(?:,\d+)?/g).map(x=>Number(x.replace(',','.')));
  if(c.kind==='count'){
   const v={};[...c.order].forEach((k,i)=>v[k]=numbers[i]);
   if(v.p!==undefined)assert.equal(v.p,c.Z);if(v.e!==undefined)assert.equal(v.e,c.Z);
   if(v.n!==undefined)assert.equal(v.n+c.Z,c.A);
  }else if(c.kind==='reaction'){
   const v={};[...c.order].forEach((k,i)=>v[k]=numbers[i]);
   if(c.order==='pn'){v.Z=v.p;v.A=v.p+v.n;}
   for(const [key,index]of [['A',1],['Z',2]])if(v[key]!==undefined){
    const totals=[c.left,c.right].map(a=>a.reduce((s,t)=>s+t[index]*(t[3]||1),0));
    totals[c.side==='left'?0:1]+=v[key];assert.equal(totals[0],totals[1],id+': '+key);
   }
  }else if(c.kind==='decay'){
   let remaining=c.mode==='factor'?c.initial/numbers[0]:['helium','decayed'].includes(c.mode)?c.initial-numbers[0]:numbers[0];
   if(c.atomsNumber)near(c.initial*6e23,c.atomsNumber);
   near(Math.log2(c.initial/remaining)*c.T,c.t);assert.ok(remaining>0&&remaining<c.initial);
  }else if(c.kind==='lambda')near(2**(-c.lambda*numbers[0]),.5);
  else if(c.kind==='time')near(c.find==='time'?2**(numbers[0]/c.T):2**(c.t/numbers[0]),c.factor);
  else if(c.kind==='graph')assert.equal(numbers[0],c.T);
  else if(c.kind==='points'){
   const hits=c.points.map(([t,n],i)=>{const remain=c.product?c.N0-n:n;return remain>0&&Math.abs(Math.log2(c.N0/remain)*c.T-t)<1e-8?i+1:0;}).filter(Boolean);
   assert.deepEqual(hits,numbers,id);
  }
 }
 return {tasks:98,checks:'manual answers and ordering; independent balances and inverse decay; every plotted point'};
}
module.exports={verifyPhysics,expected};
