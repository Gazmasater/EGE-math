const assert = require('node:assert/strict');
const {decodeEntities} = require('../../lib/seo-text');

// Independent of the Python/SymPy solution generator: evaluate the original
// MathML using exact BigInt rationals and single quadratic radicals.
const abs = n => n < 0n ? -n : n;
function gcd(a,b) { a=abs(a);b=abs(b);while(b)[a,b]=[b,a%b];return a; }
function isqrt(n) {
  assert.ok(n>=0n);if(n<2n)return n;
  let x=n,y=(x+1n)/2n;while(y<x){x=y;y=(x+n/x)/2n;}return x;
}
function value(n,d=1n,r=1n) {
  assert.notEqual(d,0n);assert.ok(r>0n);
  if(d<0n){n=-n;d=-d;}if(n===0n)return {n:0n,d:1n,r:1n};
  // Radicals arise only from the small, explicitly supplied variable values.
  for(let p=2n;p*p<=r;p++)while(r%(p*p)===0n){n*=p;r/=p*p;}
  const g=gcd(n,d);return {n:n/g,d:d/g,r};
}
const negate=a=>value(-a.n,a.d,a.r);
function add(a,b){if(a.n===0n)return b;if(b.n===0n)return a;assert.equal(a.r,b.r);return value(a.n*b.d+b.n*a.d,a.d*b.d,a.r);}
const multiply=(a,b)=>value(a.n*b.n,a.d*b.d,a.r*b.r);
const divide=(a,b)=>{assert.notEqual(b.n,0n);return value(a.n*b.d,a.d*b.n*b.r,a.r*b.r);};
function power(a,b){assert.equal(b.d,1n);assert.equal(b.r,1n);assert.ok(abs(b.n)<=200n);let out=value(1n);for(let i=0n;i<abs(b.n);i++)out=multiply(out,a);return b.n<0n?divide(value(1n),out):out;}
function sqrt(a) {
  assert.equal(a.r,1n);assert.ok(a.n>=0n);
  const n=isqrt(a.n),d=isqrt(a.d);
  if(n*n===a.n&&d*d===a.d)return value(n,d);
  assert.equal(a.d,1n);assert.ok(a.n<100n,'Only small irrational variable assignments are expected');return value(1n,1n,a.n);
}
function parseMath(markup,mixed=false) {
  const root={name:'root',children:[]},stack=[root];
  for(const token of markup.match(/<[^>]*>|[^<]+/g)||[]) {
    if(!token.startsWith('<')){const s=decodeEntities(token).trim();if(s)stack.at(-1).children.push(s);continue;}
    const m=token.match(/^<(\/?)(?:m:)?([\w-]+)/i);assert.ok(m);
    if(m[1])assert.equal(stack.pop().name,m[2].toLowerCase());
    else {const node={name:m[2].toLowerCase(),children:[]};stack.at(-1).children.push(node);if(!token.endsWith('/>'))stack.push(node);}
  }
  assert.equal(stack.length,1);
  function render(node) {
    if(typeof node==='string')return node.replace(/\s+/g,'');
    if(node.name==='annotation')return '';
    if(node.name==='mfrac'||node.name==='msup') {
      assert.equal(node.children.length,2);return '(('+render(node.children[0])+')'+(node.name==='mfrac'?'/':'^')+'('+render(node.children[1])+'))';
    }
    if(node.name==='msqrt')return 'sqrt('+node.children.map(render).join('')+')';
    assert.ok(['root','math','mstyle','semantics','mrow','mn','mi','mo','mtext'].includes(node.name),node.name);
    return node.children.map((child,i)=> (mixed && child.name==='mfrac' && node.children[i-1]?.name==='mn' ? '+' : '')+render(child)).join('');
  }
  return render(root).replaceAll('−','-').replace(/[⋅·]/g,'*').replace(/[:÷]/g,'/').replace(/\.$/,'');
}
function evaluate(expression,variables={}) {
  const s=expression.replace(/\s+/g,'');const tokens=s.match(/sqrt|\d+(?:[,.]\d+)?|[abxy()+*\/^\-]/g)||[];
  assert.equal(tokens.join(''),s,'Unexpected primary expression '+s);let i=0;
  function atom(){
    const t=tokens[i++];
    if(t==='('){const x=sum();assert.equal(tokens[i++],')');return x;}
    if(t==='sqrt'){assert.equal(tokens[i++],'(');const x=sum();assert.equal(tokens[i++],')');return sqrt(x);}
    if(/^[abxy]$/.test(t)){assert.ok(variables[t],t);return variables[t];}
    assert.match(t,/^\d+(?:[,.]\d+)?$/);const [whole,fraction='']=t.split(/[,.]/);return value(BigInt(whole+fraction),10n**BigInt(fraction.length));
  }
  function exponent(){let a=atom();if(tokens[i]==='^'){i++;a=power(a,unary());}return a;}
  function unary(){if(tokens[i]==='-'){i++;return negate(unary());}if(tokens[i]==='+'){i++;return unary();}return exponent();}
  function product(){let a=unary();while(true){const t=tokens[i];if(t==='*'||t==='/'){i++;const b=unary();a=t==='*'?multiply(a,b):divide(a,b);}else if(t && (/^(?:sqrt|[abxy(]|\d)/.test(t)))a=multiply(a,unary());else break;}return a;}
  function sum(){let a=product();while(tokens[i]==='+'||tokens[i]==='-'){const t=tokens[i++],b=product();a=add(a,t==='+'?b:negate(b));}return a;}
  const result=sum();assert.equal(i,tokens.length);return result;
}
function checkPowers(task,record) {
  const maths=task.fragment.match(/<(?:m:)?math\b[^>]*>[\s\S]*?<\/(?:m:)?math>/gi)||[];assert.ok(maths.length);
  const vars={};for(const m of maths.slice(1)){
    const assignment=parseMath(m,true).match(/^([abxy])=(.+)$/);assert.ok(assignment,task.id);assert.ok(!vars[assignment[1]]);vars[assignment[1]]=evaluate(assignment[2]);
  }
  const expression=parseMath(maths[0]);const actual=evaluate(expression,vars);
  assert.equal(actual.r,1n,task.id);assert.equal(actual.d,1n,task.id);assert.equal(String(actual.n),record.answer,task.id+': exact MathML calculation');
  return expression.includes('sqrt(')?'root':Object.keys(vars).length?'power-variable':'power-numeric';
}
function auditPowers(task,source,record) {
  const kind=checkPowers(task,record);assert.equal(source.model.kind.startsWith('root-')?'root':source.model.kind,kind);
  assert.ok(source.methodSource?.reviewed&&source.methodSource.steps.length>80);
}
module.exports={checkPowers,auditPowers,parseMath,evaluate};
