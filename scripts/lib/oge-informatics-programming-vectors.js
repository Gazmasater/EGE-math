'use strict';

// Independently decode the original condition; do not reuse solution-generator models.
const assert = require('node:assert/strict');
const { conditionText } = require('../../lib/seo-text');
const story={A367FD:'weather-mean','5A5C7A':'grades',C3AEB5:'even-range',C681D5:'weather-min','59429F':'regatta','41E9E1':'quiz',DB34E2:'race','87A333':'passed-mean'};
function programmingVectors(task){
 const text=conditionText(task.fragment).replaceAll('ё','е');const head=text.split(/Программа получает|На вход/)[0];let kind=story[task.sourceId];let fits=()=>true;const zeroEnded=/признак окончания/.test(text);const tests=[];
 const precision=/точностью до десятых/.test(text)?1:null;
 if(!kind){
  kind=/среднее арифметическое/.test(head)?'mean':/минималь|наименьш/.test(head)?'minimum':/максималь|наибольш/.test(head)?'maximum':/сумму и количество/.test(head)?'sum-count':/сумму/.test(head)?'sum':'count';
  const base=Number(head.match(/основанием (\d+)/)?.[1]||(/шестнадцатеричной/.test(head)?16:/восьмеричной/.test(head)?8:10));
  const length=['однозначн','двузначн','трехзначн','четырехзначн'].findIndex(w=>head.includes(w))+1;
  const ds=head.match(/кратн[а-я]+ (\d+)(?: или (\d+))?/);const divisors=ds?ds.slice(1).filter(Boolean).map(Number):[];
  const digit=head.match(/оканчива[а-я]+ (?:на )?(?:цифр[а-я]+ )?([\dA-F]|ноль|единицу)(?![а-я])/);
  const last=digit?({'ноль':'0','единицу':'1'}[digit[1]]||digit[1]).toLowerCase():null;
  const odd=/нечетн/.test(head), even=!odd&&/четн/.test(head);
  fits=x=>{
   const repr=Math.abs(x).toString(base),tail=repr.at(-1),tailNumber=parseInt(tail,base);
   return (!length||repr.length===length)&&(!divisors.length||divisors.some(d=>Number.isInteger(x/d)))&&(!last||tail===last)&&(!odd||tailNumber%2===1)&&(!even||(head.includes('систем')?tailNumber:Math.abs(x))%2===0);
  };
  const bound=text.match(/(?:числа|чисел)(?: по модулю)?(?:,)? не превыша(?:ют|ющих) ([\d ]+)/);const cap=bound?Number(bound[1].replaceAll(' ','')):30000;
  assert.ok(cap>=1&&cap<=30000,task.id+' cap');
  const signed=/последовательности целых|на вход целые/.test(text);
  const candidates=[...new Set([1,2,3,4,5,6,7,8,9,10,11,12,15,16,17,18,19,20,25,30,49,50,63,64,99,100,101,125,127,128,255,256,257,299,300,511,512,513,999,1000,1001,4095,4096,cap-1,cap])].filter(x=>x>0&&x<=cap);
  for(let pow=1;pow<=4;pow++)for(let offset=-2;offset<=2;offset++){const x=base**pow+offset;if(x>0&&x<=cap)candidates.push(x);}
  if(signed)candidates.push(...candidates.map(x=>-x));
  const yes=candidates.filter(fits),no=candidates.filter(x=>!fits(x));
  if(!yes.length)for(let x=1;x<=cap;x++)if(fits(x)){yes.push(x);break;}
  assert.ok(yes.length,task.id+' matching witness');
  const minN=Number(text.match(/([1-3])\s*≤\s*N/)?.[1]||1);
  function add(values){
   if(!zeroEnded)while(values.length<minN)values.push(values[0]||1);
   if(['minimum','maximum'].includes(kind)&&!text.includes('NO')&&!values.some(fits))values.push(yes[0]);
   tests.push(values);
  }
  add([yes[0]]);add([yes.at(-1),yes[0],yes.at(-1)]);if(no.length)add([no[0],no.at(-1)]);
  for(let i=0;i<candidates.length;i+=10)add(candidates.slice(i,i+10));
  if(zeroEnded&&(!['minimum','maximum'].includes(kind)||text.includes('NO')))add([]);
 }else if(kind==='even-range')for(const a of [1,2,3,10,29999,30000])for(const b of [a,Math.min(30000,a+1),Math.min(30000,a+12)])tests.push([a,b]);
 else if(kind==='regatta')tests.push([[3,25],[2,50]],[[0,59],[1,0],[0,58]],[[12,0],[11,59]],[[0,0]],[[2,30],[2,30]]);
 else if(kind==='race')tests.push([[18,29],[18,30],[18,31]],[[17,59]],[[19,0]],[[0,0],[18,30]]);
 else if(kind==='weather-mean')tests.push([-4,12,-2,8],[1,1,1,1,0],[1,1,1,1,1],[-15],[0],Array(31).fill(2));
 else if(kind==='weather-min')tests.push([101],[-15],[-16],[-14,0,1],[0],[-20,5,-19],Array(31).fill(-15));
 else if(kind==='grades')tests.push([0,4,5,9,10],[5],[10],[4],Array(30).fill(10));
 else if(kind==='quiz')tests.push([0,1,20],[20],[0,1],[1,1],Array(50).fill(1));
 else if(kind==='passed-mean')tests.push([0,7,8,9,12],[8],[12],[7,9,10],Array(30).fill(8));
 function oracle(values){
  const sum=a=>a.reduce((s,x)=>s+x,0), mean=a=>sum(a)/a.length;
  if(kind==='even-range')return [Math.floor(values[1]/2)-Math.floor((values[0]-1)/2)];
  if(kind==='regatta'){const best=[...values].sort((a,b)=>a[0]-b[0]||a[1]-b[1])[0];return best;}
  if(kind==='race')return [values.filter(([m,s])=>m<18||m===18&&s<=30).length];
  if(kind==='weather-mean')return [mean(values),values.filter(x=>x>0).length>=5?'YES':'NO'];
  if(kind==='weather-min')return [Math.min(...values),values.some(x=>x< -15)?'YES':'NO'];
  if(kind==='grades')return [values.filter(x=>x<5).length,values.includes(10)?'YES':'NO'];
  if(kind==='quiz')return [Math.max(...values),values.includes(0)?'YES':'NO'];
  if(kind==='passed-mean'){const a=values.filter(x=>x>=8);return [a.length,mean(a)];}
  const a=values.filter(fits);
  if(!a.length&&text.includes('NO'))return ['NO'];
  return kind==='mean'?[mean(a)]:kind==='sum'?[sum(a)]:kind==='sum-count'?[sum(a),a.length]:kind==='count'?[a.length]:kind==='minimum'?[Math.min(...a)]:[Math.max(...a)];
 }
 return {kind,tests:tests.map(values=>({input:(kind==='even-range'?values:zeroEnded?[...values,0]:[values.length,...values.flat()]).join('\n')+'\n',expected:oracle(values),precision}))};
}
module.exports = { programmingVectors };
