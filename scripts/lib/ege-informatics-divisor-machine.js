'use strict';
const assert=require('node:assert/strict');
const {conditionText}=require('../../lib/seo-text');
const supers='⁰¹²³⁴⁵⁶⁷⁸⁹';
function parse(text){
  if(text.includes('Назовём маской')){
    const mask=text.match(/соответствующие маске ([0-9?*]+)/)[1];
    const exponent=Number([...text.match(/не превышающих 10([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/)[1]].map(c=>supers.indexOf(c)).join(''));
    return {kind:'mask',mask,limit:10**exponent,divisor:Number(text.match(/делящиеся на (?:число )?(\d+)/)[1]),exponent};
  }
  const start=Number(text.match(/перебирает целые числа,[^,]*?([\d][\d ]*), в порядке/)[1].replaceAll(' ',''));
  if(text.includes('простых натуральных')){
    if(text.includes('полным квадратом'))return {start,kind:'prime-extremes',test:'square',threshold:Number(text.match(/M больше ([\d ]+)/)[1].replaceAll(' ',''))};
    if(text.includes('палиндромом'))return {start,kind:'prime-extremes',test:'palindrome',threshold:Number(text.match(/M больше ([\d ]+)/)[1].replaceAll(' ',''))};
    if(text.includes('кратно общему количеству'))return {start,kind:'prime-extremes',test:'suffix-count',suffix:63};
    return {start,kind:'prime-extremes',test:'prime-pattern',threshold:Number(text.match(/М больше ([\d ]+)/)[1].replaceAll(' ','')),pattern:text.match(/последовательность цифр (\d+)/)[1]};
  }
  if(text.includes('у которых есть натуральный делитель'))return {start,kind:'ending-divisor',digit:Number(text.match(/оканчивающийся на цифру (\d)/)[1])};
  if(text.includes('Пусть R'))return {start,kind:'divisor-sum',digit:Number(text.match(/оканчивается на (?:цифру )?(\d)/)[1]),includeEnds:text.includes('всех различных')};
  return {start,kind:'extremes',mod:text.includes('при делении на 7')?7:10,remainder:text.includes('при делении на 7')?3:Number(text.match(/оканчивается на (\d)/)[1])};
}
function factors(n){
  const out=[];
  for(let d=2;d*d<=n;d=d===2?3:d+2){
    if(n%d!==0)continue;
    let k=0;do{n/=d;k++;}while(n%d===0);out.push([d,k]);
  }
  if(n!==1)out.push([n,1]);return out;
}
function divisorsFromFactors(f){
  let out=[1];
  for(const [p,k] of f){const previous=out.slice();let power=1;for(let j=1;j<=k;j++){power*=p;for(const v of previous)out.push(v*power);}}
  return out.sort((a,b)=>a-b);
}
function prime(n){if(n<2)return false;if(n%2===0)return n===2;for(let d=3;d*d<=n;d+=2)if(n%d===0)return false;return true;}
function evaluate(n,p){
  const f=factors(n);let value,ok,extra;
  if(p.kind==='prime-extremes'){
    const ps=f.map(x=>x[0]).filter(x=>x!==n);value=ps.length?ps[0]+ps.at(-1):0;
    if(p.test==='square'){const root=Math.floor(Math.sqrt(value));ok=value>p.threshold&&root*root===value;extra={root};}
    else if(p.test==='palindrome')ok=value>p.threshold&&String(value)===[...String(value)].reverse().join('');
    else if(p.test==='suffix-count')ok=value%100===p.suffix&&value%f.length===0;
    else {let count=0;for(let i=0;i+p.pattern.length<=String(value).length;i++)if(String(value).slice(i,i+p.pattern.length)===p.pattern)count++;ok=value>p.threshold&&prime(value)&&count===1;}
    extra={factors:f,primeDivisors:ps,...extra};
  }else{
    const ds=divisorsFromFactors(f),proper=ds.slice(1,-1);
    if(p.kind==='ending-divisor'){
      const eligible=proper.filter(d=>d%10===p.digit&&d!==p.digit);value=eligible[0]??0;ok=eligible.length!==0;extra={divisors:ds,eligible};
    }else if(p.kind==='divisor-sum'){
      const sigma=f.reduce((product,[q,k])=>product*((q**(k+1)-1)/(q-1)),1);
      value=p.includeEnds?sigma:sigma-n-1;ok=value%10===p.digit;
      extra={divisors:ds,selected:p.includeEnds?ds:proper};assert.equal(extra.selected.reduce((a,b)=>a+b,0),value);
    }else{
      const d=f[0][0];value=d===n?0:d+n/d;ok=value%p.mod===p.remainder;
      extra={divisors:ds,minimum:proper[0]??null,maximum:proper.at(-1)??null};
    }
  }
  return {value,ok,extra};
}

const cache=new Map();
function solve(task){
 const text=conditionText(task.fragment);if(cache.has(text))return cache.get(text);
 const p=parse(text),hits=[];let checked=0,iterations=0;
 if(p.kind==='mask'){
  const re=new RegExp('^'+p.mask.replaceAll('?', '[0-9]').replaceAll('*','[0-9]*')+'$');
  const prefix=p.mask.match(/^\d+/)[0],minLength=p.mask.replace('*','').length;
  const maxLength=p.mask.includes('*')?String(p.limit).length:minLength;
  for(let length=minLength;length<=maxLength;length++){
   const scale=10**(length-prefix.length),lo=Number(prefix)*scale,hi=Math.min((Number(prefix)+1)*scale-1,p.limit);
   for(let n=Math.ceil(lo/p.divisor)*p.divisor;n<=hi;n+=p.divisor){iterations++;if(re.test(String(n)))hits.push({n,value:n/p.divisor});}
  }
  hits.sort((a,b)=>a.n-b.n);
  for(let length=minLength;length<=p.exponent;length++){
   if(!p.mask.includes('*')&&length!==minLength)continue;
   checked+=10**([...p.mask].filter(c=>c==='?').length+length-minLength);
  }
  assert(!re.test(String(p.limit)));assert(hits.length>0);
 }else{
  let n=p.start;
  while(hits.length!==5){n++;const {value,ok,extra}=evaluate(n,p);checked++;if(ok)hits.push({n,value,...extra});assert(checked<=1000000);}
  iterations=checked;
 }
 const answer=hits.map(h=>'('+h.n+'; '+h.value+')').join(', '),output=hits.map(h=>h.n+' '+h.value).join('\n');
 const result={parameters:p,hits,checked,iterations,answer,output};cache.set(text,result);return result;
}
module.exports={parse,evaluate,factors,prime,divisorsFromFactors,solve};
