const assert = require('node:assert/strict');
const {conditionText} = require('../../lib/seo-text');
const {decimal,cmp} = require('./audit-oge-math-arithmetic');
// Read directly from all twenty primary formula images, in condition order.
const cooling = {
 AC63F5:[6,-7], '5F9E7C':[9,-5], '219613':[5,-8], '58DB2C':[8,-6],
 '912224':[5,-9], '02ABD8':[9,-6], BF8E53:[7,-7], '4093C4':[8,-6],
 '0BBBCB':[6,-9], D1616D:[7,-8]
};
const ordinal = new Map('первом втором третьем четвёртом пятом шестом седьмом восьмом девятом десятом одиннадцатом двенадцатом тринадцатом'.split(' ').map((s,i)=>[s,i+1]));
const number = s => {const [a,b]=decimal(s.replace('−','-'));assert.equal(a%b,0n);return Number(a/b);};
const tenths = s => {const [a,b]=decimal(s);assert.equal(10n*a%b,0n);return 10n*a/b;};
const capture = (s,re) => {const m=s.match(re);assert.ok(m,s);return m;};
function checkProgressions(task,record){
 const s=conditionText(task.fragment);let kind,expected;
 if(s.includes('В амфитеатре')){
  const rows=Number(capture(s,/амфитеатре (\d+) ряд/)[1]);
  if(s.includes('одно и то же')){
   kind='seats-infer';
   const pairs=[...s.matchAll(/(?:В|в) (\S+) ряду (\d+) мест/g)].map(m=>[ordinal.get(m[1]),Number(m[2])]);
   assert.equal(pairs.length,2);const [[i,ai],[j,aj]]=pairs;assert.ok(i<j&&j<=rows);
   const candidates=[];
   for(let first=1;first<=ai;first++)for(let difference=1;difference<=aj;difference++){
    const places=Array.from({length:rows},(_,k)=>first+k*difference);
    if(places[i-1]===ai&&places[j-1]===aj)candidates.push(places.at(-1));
   }
   assert.equal(candidates.length,1);expected=[BigInt(candidates[0]),1n];
  }else{
   const first=Number(capture(s,/первом ряду (\d+)/)[1]);const difference=Number(capture(s,/следующем на (\d+)/)[1]);
   const places=[first];while(places.length<rows)places.push(places.at(-1)+difference);
   if(s.includes('Сколько всего')){kind='seats-sum';expected=[BigInt(places.reduce((a,b)=>a+b,0)),1n];}
   else{kind='seats-term';const n=ordinal.get(capture(s,/Сколько мест в (\S+) ряду/)[1]);assert.ok(n>=1&&n<=rows);expected=[BigInt(places[n-1]),1n];}
  }
 }else if(s.includes('изотопа')||s.includes('Петри')){
  kind=s.includes('изотопа')?'decay':'growth';
  const period=Number(capture(s,/каждые (\d+) минут/)[1]),end=Number(capture(s,/через (\d+) минут/)[1]);assert.equal(end%period,0);
  const initial=BigInt(capture(s,/(?:составляла|массой) (\d+) мг/)[1]);
  let numerator=initial,denominator=1n;
  for(let time=period;time<=end;time+=period){if(kind==='decay')denominator*=2n;else numerator*=BigInt(capture(s,/увеличивается в (\d+) раз/)[1]);}
  expected=[numerator,denominator];
 }else if(cooling[task.id]){
  kind='cooling';const [drop,initial]=cooling[task.id],end=Number(capture(s,/через (\d+) минут/)[1]);assert.ok(end>=0&&end<=10);
  let value=initial;for(let minute=0;minute<end;minute++)value-=drop;expected=[BigInt(value),1n];
 }else if(s.includes('мячик')){
  kind='bounce';const height=tenths(capture(s,/подпрыгнул на ([\d,]+) м/)[1])*10n;
  const divisor=s.includes('в два раза')?2n:3n;assert.ok(s.includes('в два раза')||s.includes('в три раза'));
  const limit=BigInt(capture(s,/высоты (\d+) см/)[1]);const n=number(record.answer);assert.ok(n>1);
  // Exact crossing of the strict threshold proves this is the FIRST bounce.
  assert.ok(height<limit*divisor**BigInt(n-1));
  assert.ok(height>=limit*divisor**BigInt(n-2));expected=[BigInt(n),1n];
 }else if(s.includes('Поезд')){
  kind='train';let value=tenths(capture(s,/сдвинулся на ([\d,]+) м/)[1]);
  const difference=tenths(capture(s,/проходил на ([\d,]+) м/)[1]),count=Number(capture(s,/первые (\d+) секунд/)[1]);
  let total=0n;for(let second=0;second<count;second++){total+=value;value+=difference;}expected=[total,10n];
 }else{
  assert.ok(s.includes('Водитель'));kind=s.includes('полной остановки')?'brake-stop':'brake-time';
  let value=BigInt(capture(s,/проехал (\d+) м/)[1]);const decrease=BigInt(capture(s,/проезжал на (\d+) м/)[1]);
  const count=kind==='brake-stop'?null:Number(capture(s,/первые (\d+) секунд/)[1]);let total=0n,second=0;
  while(kind==='brake-stop'?value>0n:second<count){assert.ok(value>0n);total+=value;value-=decrease;second++;assert.ok(second<100);}
  if(kind==='brake-stop')assert.equal(value,0n);expected=[total,1n];
 }
 assert.equal(cmp(decimal(record.answer.replace('−','-')),expected),0,task.id+': independent recurrence or threshold');
 return kind;
}
function auditProgressions(task,source,record){
 assert.equal(checkProgressions(task,record),source.model.kind);
 assert.ok(source.methodSource?.reviewed&&source.methodSource.steps.length>80);
 if(cooling[task.id])assert.ok(source.visualReview?.reviewed);
}
module.exports={checkProgressions,auditProgressions};
