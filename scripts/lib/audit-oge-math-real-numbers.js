const assert = require('node:assert/strict');
const { decodeEntities, conditionText } = require('../../lib/seo-text');
const { mathExpression, evaluate, decimal, cmp } = require('./audit-oge-math-arithmetic');

// Independently transcribed from the primary figures. Values are bounds or
// ordering facts, never coordinates measured from pixels.
const signs = {
  '453B45': ['x', 'y', 'x'], '9BFC49': ['y', 'x', 'y'],
  '6F944F': ['b', 'a', 'a'], F79579: ['x', 'y', 'y'],
  B59F1A: ['a', 'b', 'a'], F08D22: ['y', 'x', 'x'],
  '9995D6': ['a', 'b', 'b'], '6985CA': ['y', 'x', 'x'],
  '819E97': ['b', 'a', 'b'], '762769': ['b', 'a', 'b'],
  '9FB83E': ['a', 'b', 'b'], '13FF81': ['x', 'y', 'x']
};
const single = { A796FE:6, '8A5E07':4, BBB673:5, A04F76:6, F9B223:5,
  '9DBC28':6, CBA7D0:7, '8FDDC0':4, '7F3494':5, B71988:7 };
const rootBounds = { '9444BA':13, '35275B':11, B4A1A7:14, '2B21CA':13,
  '0A0A91':10, '236B9E':13, '94BE98':11, '0835E0':12, BEC0E9:10, '1A0438':8 };
const rootTicks = { '9DCF4D':5, C257F8:7, '63AD19':7, '6BFAAA':6,
  '0CCA9A':9, '671B9A':5, '1C1FEB':7, '088A64':8 };

function primaryOptions(fragment) {
  const math = fragment.match(/<(?:m:)?math\b[^>]*>[\s\S]*?<\/(?:m:)?math>/gi) || [];
  return math.slice(-4).map(html => {
    const value = html.replace(/<(?:m:)?msup\b[^>]*>([\s\S]*?)<\/(?:m:)?msup>/gi, (_, inner) => {
      const s = decodeEntities(inner.replace(/<[^>]*>/g, '')).replace(/\s+/g, '');
      assert.match(s, /^[abxy]2$/); return s[0]+'²';
    });
    // Decode only after removing markup, so a literal less-than remains text.
    return decodeEntities(value.replace(/<[^>]*>/g, '')).replace(/\s+/g, '').replaceAll('−','-');
  });
}

// Positive p and q describe every pair with the indicated signs and strict
// ordering of absolute values. A polynomial with coefficients of one sign
// proves the claim on the whole region, without testing sample coordinates.
const plus = (a,b) => {
  const out={...a}; for(const [k,v] of Object.entries(b)) out[k]=(out[k]||0n)+v;
  return Object.fromEntries(Object.entries(out).filter(([,v])=>v!==0n));
};
const negative = a => Object.fromEntries(Object.entries(a).map(([k,v])=>[k,-v]));
const times = (a,b) => {
  const out={}; for(const [i,x] of Object.entries(a)) for(const [j,y] of Object.entries(b)) {
    const [ip,iq]=i.split(',').map(Number),[jp,jq]=j.split(',').map(Number),key=`${ip+jp},${iq+jq}`;
    out[key]=(out[key]||0n)+x*y;
  } return out;
};
function polynomial(expression,vars) {
  const terms=expression.match(/[+-]?[^+-]+/g); assert.equal(terms.join(''),expression);
  let result={};
  for(let term of terms) {
    const minus=term.startsWith('-');term=term.replace(/^[+-]/,'');
    const factors=term.match(/[abxy]²?/g);assert.ok(factors);assert.equal(factors.join(''),term);
    let product={'0,0':1n};
    for(const factor of factors){assert.ok(vars[factor[0]]);product=times(product,vars[factor[0]]);if(factor.endsWith('²'))product=times(product,vars[factor[0]]);}
    result=plus(result,minus?negative(product):product);
  }
  const coefficients=Object.values(result);assert.ok(coefficients.length);
  assert.ok(coefficients.every(x=>x>0n)||coefficients.every(x=>x<0n),'Indeterminate polynomial sign');
  return coefficients[0]>0n?1:-1;
}
function relation(option) {
  const m=option.match(/^(.+?)([<>≥])0$/);assert.ok(m,option);return [m[1],m[2]];
}
const isTrue=(s,r)=>r==='<'?s<0:s>0;
function checkRealNumbers(task,record) {
  const text=conditionText(task.fragment);let kind,good;
  if(signs[task.id]) {
    kind='two-numbers';const [pos,neg,dominant]=signs[task.id],vars={};
    for(const variable of [pos,neg]) {
      const v=variable===dominant?{'1,0':1n,'0,1':1n}:{'1,0':1n};
      vars[variable]=variable===neg?negative(v):v;
    }
    const opts=primaryOptions(task.fragment);assert.equal(opts.length,4);
    good=opts.flatMap((o,i)=>{const [e,r]=relation(o);return isTrue(polynomial(e,vars),r)?[i+1]:[];});
  } else if(Object.hasOwn(single,task.id)) {
    kind='single-number';const lo=single[task.id],hi=lo+1;
    good=primaryOptions(task.fragment).flatMap((o,i)=>{
      const [expression,r]=relation(o);assert.match(expression,/^(?:a-\d+|\d+-a)$/);
      const left=evaluate(expression.replace('a',String(lo))),right=evaluate(expression.replace('a',String(hi)));
      const a=cmp(left,[0n,1n]),b=cmp(right,[0n,1n]);assert.ok(a===b||a===0||b===0);
      return isTrue(a||b,r)?[i+1]:[];
    });
  } else if(Object.hasOwn(rootBounds,task.id)) {
    kind='root-choice';const n=rootBounds[task.id];
    const options=[...text.matchAll(/√\((\d+)\)/g)].slice(0,4).map(m=>Number(m[1]));assert.equal(options.length,4);
    good=options.flatMap((x,i)=>n*n<4*x&&4*x<(n+1)**2?[i+1]:[]);
  } else if(Object.hasOwn(rootTicks,task.id)) {
    kind='root-four-points';const n=Number(text.match(/√\((\d+)\)/)[1]),base=rootTicks[task.id];
    good=Array.from({length:4},(_,i)=>i).filter(i=>(2*base+i)**2<4*n&&4*n<(2*base+i+1)**2).map(i=>i+1);
  } else if(text.includes('Между какими числами')) {
    kind='root-between';const n=BigInt(text.match(/√\((\d+)\)/)[1]);
    const intervals=[...text.matchAll(/\d\) (\d+) и (\d+)/g)].map(m=>[BigInt(m[1]),BigInt(m[2])]);assert.equal(intervals.length,4);
    good=intervals.flatMap(([a,b],i)=>{assert.ok(a>=0n&&a<b);return a*a<n&&n<b*b?[i+1]:[];});
  } else {
    kind='fraction-interval';assert.ok(text.includes('Какому из данных промежутков'));
    const math=task.fragment.match(/<(?:m:)?math\b[^>]*>[\s\S]*?<\/(?:m:)?math>/gi).filter(s=>/<(?:m:)?mfrac\b/i.test(s));assert.equal(math.length,1);
    const x=evaluate(mathExpression(math[0]));
    const intervals=[...text.matchAll(/\[(\d+,\d+);(\d+,\d+)\]/g)].map(m=>[decimal(m[1]),decimal(m[2])]);assert.equal(intervals.length,4);
    good=intervals.flatMap(([a,b],i)=>cmp(a,x)<=0&&cmp(x,b)<=0?[i+1]:[]);
  }
  assert.deepEqual(good,[Number(record.answer)],task.id+': unique independently proven answer');
  return kind;
}
function auditRealNumbers(task,source,record) {
  assert.equal(checkRealNumbers(task,record),source.model.kind);
  assert.ok(source.methodSource?.reviewed&&source.methodSource.steps.length>80);
  if(signs[task.id]||Object.hasOwn(single,task.id)||Object.hasOwn(rootBounds,task.id)||Object.hasOwn(rootTicks,task.id))assert.ok(source.visualReview?.reviewed);
}
module.exports={checkRealNumbers,auditRealNumbers,primaryOptions};
