'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{select,solve,temperature}=require('./lib/ege-informatics-mirror-spreadsheets-machine');
function all(n,max,visit,a=[]){if(!n)return visit(a);for(let x=1;x<=max;x++)all(n-1,max,visit,[...a,x]);}
test('All short four-number rows: three partitions, polygon bound, and exact multiplicities',()=>{
 all(4,5,a=>{const sum=a.reduce((s,x)=>s+x,0),bound=a.every(x=>x<sum-x),pairs=[[0,1],[0,2],[0,3]],eq=pairs.some(p=>p.reduce((s,i)=>s+a[i],0)*2===sum),unique=new Set(a).size,frequencies=[...new Set(a)].map(x=>a.filter(y=>y===x).length);
  for(const[k,expected]of Object.entries({'quad-equal-pairs':bound&&eq,'quad-no-equal-pairs':bound&&!eq,'quad-one-pair':bound&&unique===3&&Math.max(...frequencies)===2,'quad-distinct':bound&&unique===4}))assert.equal(select(a,{kind:k}),expected,JSON.stringify([k,a]));
 });
});
test('Repeated extreme values remove only one occurrence; strict and inclusive comparisons',()=>{
 all(5,4,a=>{const b=a.slice(),lo=b.splice(b.indexOf(Math.min(...b)),1)[0],hi=b.splice(b.indexOf(Math.max(...b)),1)[0];assert.equal(select(a,{kind:'extremes-square'}),(lo+hi)**2>b.reduce((s,x)=>s+x*x,0));});
 assert.equal(select([1,2,4,5,6],{kind:'distinct-twice-extreme-sum-le'}),false);
 assert.equal(select([1,2,3,5,9],{kind:'distinct-triple-extreme-sum-ge'}),true);
 assert.equal(select([1,1,2],{kind:'max-square'}),true);
});
test('Two pairs reject triples; different squared criteria and first-index answer are preserved',()=>{
 for(const kind of ['two-pairs-single-mean-gt','two-pairs-max-single','two-pairs-mean-lt-max-single','two-pairs-single-mean-le-all'])assert.equal(select([1,1,2,2,100,100,100],{kind}),false);
 assert.equal(select([5,5,5,1,2,8],{kind:'triple-square'}),true); // 75 > 69
 assert.equal(select([5,5,5,1,2,9],{kind:'triple-square'}),false); // 75 < 86, though 15² > 12²
 const rows=[[1,1,2,2,100,100,100],[2,2,3,3,4,5,6],[2,2,3,3,4,5,7]];assert.equal(solve({sheet:rows},{kind:'two-pairs-single-mean-gt',width:7,select:'first-index'}).answer,'2');assert.equal(solve({sheet:rows},{kind:'two-pairs-single-mean-gt',width:7,select:'count'}).answer,'2');
});
test('Exact temperature arithmetic, selected hours, inclusive endpoints and earliest ties',()=>{
 const header=[null,...Array.from({length:24},(_,h)=>String(h).padStart(2,'0')+':00:00')],r=(date,x,y)=>{const a=[date,...Array(24).fill(100)];a[12]=x;a[13]=y;return a;},rows=[header,r('2018-04-30',100,0),r('2018-05-01',10,7.4),r('2018-05-02',20,17.4),r('2018-06-01',100,0)],m={kind:'delta',month:5,hours:[11,12],direction:-1};
 const v=temperature(rows,m);assert.equal(v.answer,'2');assert.deepEqual(v.value,{numerator:'13',denominator:'5'});assert.deepEqual(v.winningDates,['2018-05-01','2018-05-02']);assert.equal(v.selectedCells.length,4);assert.equal(temperature(rows,{...m,kind:'day'}).answer,'1');
 const day=[header,['2018-06-01',...Array(24).fill(0)]];day[1].splice(6,4,20,21,22,24);assert.equal(temperature(day,{kind:'daily-mean',month:6,hours:[5,6,7,8],minimum:false}).answer,'21');
 const weather={sheet:[['date','max','min','mean','humidity'],['2019-01-01',3,-1,2,null],['2019-02-01',7,1,5,null]]};assert.equal(solve(weather,{kind:'monthly-mean-difference',months:[2,1],column:3}).answer,'3');
 const missing=structuredClone(weather);missing.sheet[1][3]=null;assert.throws(()=>solve(missing,{kind:'monthly-mean-difference',months:[2,1],column:3}),/missing numeric/);
});
