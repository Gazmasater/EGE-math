const assert = require('node:assert/strict');
const {parseMath} = require('./audit-oge-math-powers');

// An independent evaluator of the original MathML. A value is a sum of
// rational multiples of square-free radicals, with exact BigInt coefficients.
const abs=n=>n<0n?-n:n;
function gcd(a,b){a=abs(a);b=abs(b);while(b)[a,b]=[b,a%b];return a;}
function rat(n,d=1n){assert.notEqual(d,0n);if(d<0n){n=-n;d=-d;}const g=gcd(n,d);return {n:n/g,d:d/g};}
const plus=(a,b)=>rat(a.n*b.d+b.n*a.d,a.d*b.d);
const times=(a,b)=>rat(a.n*b.n,a.d*b.d);
function term(r,c=rat(1n)){
  assert.ok(r>=0n);if(!r||!c.n)return new Map();
  for(let p=2n;p*p<=r;p++)while(r%(p*p)===0n){r/=p*p;c=times(c,rat(p));}
  return new Map([[r,c]]);
}
const scalar=(n,d=1n)=>term(1n,rat(n,d));
function add(a,b){const out=new Map(a);for(const [r,c] of b){const v=plus(out.get(r)||rat(0n),c);if(v.n)out.set(r,v);else out.delete(r);}return out;}
const negate=a=>new Map([...a].map(([r,c])=>[r,rat(-c.n,c.d)]));
function multiply(a,b){let out=new Map();for(const [r,c] of a)for(const [s,d] of b)out=add(out,term(r*s,times(c,d)));return out;}
function rational(a){assert.ok(!a.size||(a.size===1&&a.has(1n)),'Expected rational');return a.get(1n)||rat(0n);}
function inverse(a){
  assert.ok(a.size,'Division by zero');
  if(a.size===1){const [[r,c]]=a;return term(r,rat(c.d,c.n*r));}
  assert.equal(a.size,2,'Only quadratic binomial denominators occur');assert.ok(a.has(1n));
  const conjugate=new Map([...a].map(([r,c])=>[r,r===1n?c:rat(-c.n,c.d)]));
  const norm=rational(multiply(a,conjugate));assert.notEqual(norm.n,0n);
  return multiply(conjugate,scalar(norm.d,norm.n));
}
const divide=(a,b)=>multiply(a,inverse(b));
function power(a,b){const exp=rational(b);assert.equal(exp.d,1n);assert.ok(abs(exp.n)<=100n);let out=scalar(1n);for(let i=0n;i<abs(exp.n);i++)out=multiply(out,a);return exp.n<0n?inverse(out):out;}
function sqrt(a){const q=rational(a);assert.ok(q.n>=0n);return term(q.n*q.d,rat(1n,q.d));}
function evaluate(expression){
  const s=expression.replace(/\s+/g,'');const tokens=s.match(/sqrt|\d+(?:[,.]\d+)?|[()+*\/^\-]/g)||[];assert.equal(tokens.join(''),s);let i=0;
  function atom(){const t=tokens[i++];if(t==='('){const x=sum();assert.equal(tokens[i++],')');return x;}if(t==='sqrt'){assert.equal(tokens[i++],'(');const x=sum();assert.equal(tokens[i++],')');return sqrt(x);}assert.match(t,/^\d+(?:[,.]\d+)?$/);const [w,f='']=t.split(/[,.]/);return scalar(BigInt(w+f),10n**BigInt(f.length));}
  function exponent(){let x=atom();if(tokens[i]==='^'){i++;x=power(x,unary());}return x;}
  function unary(){if(tokens[i]==='-'){i++;return negate(unary());}if(tokens[i]==='+'){i++;return unary();}return exponent();}
  function product(){let x=unary();while(true){const t=tokens[i];if(t==='*'||t==='/'){i++;x=t==='*'?multiply(x,unary()):divide(x,unary());}else if(t&&/^(?:sqrt|\(|\d)/.test(t))x=multiply(x,unary());else break;}return x;}
  function sum(){let x=product();while(tokens[i]==='+'||tokens[i]==='-'){const op=tokens[i++],y=product();x=add(x,op==='+'?y:negate(y));}return x;}
  const result=sum();assert.equal(i,tokens.length);return result;
}
function checkRoots(task,record){
  const maths=task.fragment.match(/<(?:m:)?math\b[^>]*>[\s\S]*?<\/(?:m:)?math>/gi)||[];assert.ok(maths.length);
  if(task.fragment.includes('Какое из чисел')){
    const roots=maths.slice(-4).map(m=>parseMath(m)).map(x=>{assert.match(x,/^sqrt\(\d+\)$/);return BigInt(x.match(/\d+/)[0]);});
    const bounds=maths.find(x=>/<(?:m:)?mfenced\b/.test(x));assert.ok(bounds,task.id);
    assert.match(bounds,/open="\["/);assert.match(bounds,/close="\]"/);
    const numbers=[...bounds.matchAll(/<(?:m:)?mn>(\d+)<\/(?:m:)?mn>/g)].map(m=>BigInt(m[1]));assert.equal(numbers.length,2);
    const [lo,hi]=numbers;assert.ok(lo>=0n&&hi>lo);
    const selected=roots.flatMap((r,i)=>lo*lo<=r&&r<=hi*hi?[String(i+1)]:[]);assert.deepEqual(selected,[record.answer],task.id+': unique closed interval option');
    return 'interval';
  }
  const actual=rational(evaluate(parseMath(maths[0])));const expected=rational(evaluate(record.answer.replace(',','.')));
  assert.deepEqual(actual,expected,task.id+': exact radical calculation');return 'expression';
}
function auditRoots(task,source,record){const kind=checkRoots(task,record);assert.equal(source.model.kind==='interval'?'interval':'expression',kind);assert.ok(source.methodSource?.reviewed&&source.methodSource.steps.length>80);}
module.exports={checkRoots,auditRoots,evaluate};
