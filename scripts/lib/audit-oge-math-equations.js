const assert=require('node:assert/strict');
const {parseMath}=require('./audit-oge-math-powers');
const {evaluate:exactRadical}=require('./audit-oge-math-roots');
const {conditionText}=require('../../lib/seo-text');
const abs=n=>n<0n?-n:n;
function q(n,d=1n){assert.notEqual(d,0n);if(d<0n){n=-n;d=-d;}let a=abs(n),b=d;while(b)[a,b]=[b,a%b];return [n/a,d/a];}
const z=q(0n),one=q(1n),neg=a=>q(-a[0],a[1]);
const add=(a,b)=>q(a[0]*b[1]+b[0]*a[1],a[1]*b[1]);
const mul=(a,b)=>q(a[0]*b[0],a[1]*b[1]);
const div=(a,b)=>q(a[0]*b[1],a[1]*b[0]);
const cmp=(a,b)=>a[0]*b[1]<b[0]*a[1]?-1:a[0]*b[1]>b[0]*a[1]?1:0;
const str=a=>a[1]===1n?String(a[0]):`(${a[0]}/${a[1]})`;
function decimal(s){s=s.trim().replaceAll('−','-').replace(',','.');assert.match(s,/^-?\d+(?:\.\d+)?$/);const sign=s[0]==='-'?-1n:1n;const [w,f='']=s.replace('-','').split('.');return q(sign*BigInt(w+f),10n**BigInt(f.length));}
function answerQ(s){s=s.trim();const m=s.match(/^⟦([−-]?\d+)¦(\d+)⟧$/);return m?q(BigInt(m[1].replace('−','-')),BigInt(m[2])):decimal(s);}
function sqrtQ(a){assert.ok(a[0]>=0n);const sq=n=>{if(n<2n)return n;let x=n,y=(x+1n)/2n;while(y<x){x=y;y=(x+n/x)/2n;}return x;};const n=sq(a[0]),d=sq(a[1]);assert.equal(n*n,a[0]);assert.equal(d*d,a[1]);return q(n,d);}
const trim=p=>{while(p.length>1&&!p.at(-1)[0])p.pop();return p;};
const pzero=p=>p.length===1&&!p[0][0];
const padd=(a,b)=>trim(Array.from({length:Math.max(a.length,b.length)},(_,i)=>add(a[i]||z,b[i]||z)));
const pscale=(a,c)=>trim(a.map(x=>mul(x,c)));
const psub=(a,b)=>padd(a,pscale(b,q(-1n)));
function pmul(a,b){const p=Array.from({length:a.length+b.length-1},()=>z);for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++)p[i+j]=add(p[i+j],mul(a[i],b[j]));return trim(p);}
function pdivide(a,b){assert.ok(!pzero(b));let r=[...a],out=Array.from({length:Math.max(1,a.length-b.length+1)},()=>z);while(!pzero(r)&&r.length>=b.length){const shift=r.length-b.length,c=div(r.at(-1),b.at(-1));out[shift]=add(out[shift],c);r=psub(r,[...Array.from({length:shift},()=>z),...pscale(b,c)]);}return [trim(out),r];}
const peval=(p,x)=>p.reduceRight((v,c)=>add(mul(v,x),c),z);
function pgcd(a,b){while(!pzero(b)){const r=pdivide(a,b)[1];a=b;b=r;}return pscale(a,div(one,a.at(-1)));}
function rf(n,d=[one]){assert.ok(!pzero(d));const g=pgcd(n,d);return {n:pdivide(n,g)[0],d:pdivide(d,g)[0]};}
const radd=(a,b)=>rf(padd(pmul(a.n,b.d),pmul(b.n,a.d)),pmul(a.d,b.d));
const rneg=a=>rf(pscale(a.n,q(-1n)),a.d);
const rmul=(a,b)=>rf(pmul(a.n,b.n),pmul(a.d,b.d));
const rdiv=(a,b)=>rf(pmul(a.n,b.d),pmul(a.d,b.n));
function syntax(s){
 s=s.replace(/\s/g,'').replace(/[−–]/g,'-').replaceAll('²','^2').replaceAll('³','^3').replaceAll('⁴','^4');const ts=s.match(/sqrt|\d+(?:[.,]\d+)?|[xy()+*\/^\-=]/g)||[];assert.equal(ts.join(''),s,s);let i=0;
 function atom(){const t=ts[i++];if(t==='('){const a=sum();assert.equal(ts[i++],')');return a;}if(t==='sqrt'){assert.equal(ts[i++],'(');const a=sum();assert.equal(ts[i++],')');return {op:'sqrt',a};}if(t==='x'||t==='y')return {op:t};assert.match(t,/^\d+(?:[.,]\d+)?$/);return {op:'number',value:decimal(t)};}
 function power(){let a=atom();if(ts[i]==='^'){i++;a={op:'^',a,b:unary()};}return a;}
 function unary(){if(ts[i]==='-'){i++;return {op:'neg',a:unary()};}if(ts[i]==='+'){i++;return unary();}return power();}
 function product(){let a=unary();while(true){const t=ts[i];if(t==='*'||t==='/'){i++;a={op:t,a,b:unary()};}else if(t&&/^(?:sqrt|[xy(]|\d)/.test(t))a={op:'*',a,b:unary()};else break;}return a;}
 function sum(){let a=product();while(ts[i]==='+'||ts[i]==='-'){const op=ts[i++];a={op,a,b:product()};}return a;}
 const a=sum();assert.equal(ts[i++],'=');const b=sum();assert.equal(i,ts.length);return [a,b];
}
function asRf(t){
 if(t.op==='number')return rf([t.value]);if(t.op==='x')return rf([z,one]);if(t.op==='neg')return rneg(asRf(t.a));
 const a=asRf(t.a),b=asRf(t.b);
 if(t.op==='+')return radd(a,b);if(t.op==='-')return radd(a,rneg(b));if(t.op==='*')return rmul(a,b);if(t.op==='/')return rdiv(a,b);
 assert.equal(t.op,'^');assert.equal(b.n.length,1);assert.equal(b.d.length,1);const exponent=div(b.n[0],b.d[0]);assert.equal(exponent[1],1n);assert.ok(exponent[0]>=0n&&exponent[0]<=4n);let out=rf([one]);for(let i=0n;i<exponent[0];i++)out=rmul(out,a);return out;
}
function rationalRoots(p){assert.ok(p.length===2||p.length===3);if(p.length===2)return [div(neg(p[0]),p[1])];const [c,b,a]=p,D=add(mul(b,b),neg(mul(q(4n),mul(a,c))));if(D[0]<0n)return [];const s=sqrtQ(D),den=mul(q(2n),a);return [...new Map([div(add(neg(b),neg(s)),den),div(add(neg(b),s),den)].map(v=>[str(v),v])).values()].sort(cmp);}
function noRealRoots(p){if(p.length===1){assert.ok(p[0][0]);return;}assert.equal(p.length,3);assert.ok(add(mul(p[1],p[1]),neg(mul(q(4n),mul(p[2],p[0]))))[0]<0n);}
function polynomial2(t){
 const plus=(a,b)=>{const out=new Map(a);for(const [k,v] of b){const c=add(out.get(k)||z,v);if(c[0])out.set(k,c);else out.delete(k);}return out;};
 const scale=(a,c)=>new Map([...a].map(([k,v])=>[k,mul(v,c)]).filter(([,v])=>v[0]));
 const times=(a,b)=>{let out=new Map();for(const [ka,va] of a)for(const [kb,vb] of b){const aa=ka.split(',').map(Number),bb=kb.split(',').map(Number);out=plus(out,new Map([[`${aa[0]+bb[0]},${aa[1]+bb[1]}`,mul(va,vb)]]));}return out;};
 function build(n){if(n.op==='number')return n.value[0]?new Map([['0,0',n.value]]):new Map();if(n.op==='x'||n.op==='y')return new Map([[n.op==='x'?'1,0':'0,1',one]]);if(n.op==='neg')return scale(build(n.a),q(-1n));const a=build(n.a);if(n.op==='^'){assert.equal(n.b.op,'number');assert.deepEqual(n.b.value,q(2n));return times(a,a);}const b=build(n.b);if(n.op==='+')return plus(a,b);if(n.op==='-')return plus(a,scale(b,q(-1n)));assert.equal(n.op,'*');return times(a,b);}
 return {p:build(t),plus,scale};
}
function univariate(p){assert.ok([...p.keys()].every(k=>k.endsWith(',0')));const length=Math.max(0,...[...p.keys()].map(k=>Number(k.split(',')[0])))+1;return trim(Array.from({length},(_,i)=>p.get(`${i},0`)||z));}
const pairsKey=pairs=>pairs.map(pair=>pair.map(str).join(';')).sort();
function formulae(task,imageEvidence){
 const blocks=task.fragment.match(/<(?:m:)?math\b[^>]*>[\s\S]*?<\/(?:m:)?math>/gi)||[];
 if(!blocks.length){assert.ok(imageEvidence?.reviewed&&imageEvidence.formula&&imageEvidence.imageSha256,task.id+': reviewed original image transcription required');return [imageEvidence.formula];}
 assert.equal(blocks.length,1);
 const rows=[...blocks[0].matchAll(/<(?:m:)?mtd\b[^>]*>([\s\S]*?)<\/(?:m:)?mtd>/gi)];
 if(rows.length){assert.equal(rows.length,2);return rows.map(m=>parseMath('<m:mrow>'+m[1]+'</m:mrow>').replace(/[.,]$/,''));}
 return [parseMath(blocks[0])];
}
function answerExpression(s){return s.replaceAll('−','-').replaceAll('²','^2').replaceAll('³','^3').replaceAll('⁴','^4').replace(/√(\d+)/g,'sqrt($1)').replace(/⟦([^⟦⟧¦]+)¦([^⟦⟧¦]+)⟧/g,'(($1)/($2))').replace(/\s/g,'');}
function substitution(eq,x,y){
 eq=eq.replaceAll('−','-').replaceAll('²','^2').replaceAll('³','^3').replaceAll('⁴','^4');
 eq=eq.replaceAll('x','('+x+')');if(y!==undefined)eq=eq.replaceAll('y','('+y+')');
 const [left,right]=eq.split('=');assert.deepEqual(exactRadical(left),exactRadical(right));
}
function checkSystem(eqs,record){
 const pairNodes=eqs.map(syntax),parsed=pairNodes.map(([a,b])=>{const built=polynomial2(a);return {...built,p:built.plus(built.p,built.scale(polynomial2(b).p,q(-1n)))};});
 const [first,second]=parsed;let expected;
 if(first.p.has('0,2')){
  assert.ok(second.p.has('0,2'));const factor=div(second.p.get('0,2'),first.p.get('0,2'));
  const reduced=univariate(first.plus(second.p,first.scale(first.p,neg(factor))));assert.equal(reduced.length,2);
  const [x]=rationalRoots(reduced);const p=new Map(first.p);const yc=p.get('0,2');p.delete('0,2');const square=div(neg(peval(univariate(p),x)),yc),y=sqrtQ(square);
  expected=[[x,neg(y)],[x,y]];
 }else{
  assert.ok(first.p.has('0,1')&&second.p.has('0,1'));const y1=first.p.get('0,1'),y2=second.p.get('0,1');
  const reduced=univariate(first.plus(first.scale(first.p,y2),first.scale(second.p,neg(y1))));
  const xs=rationalRoots(reduced);const p=new Map(first.p);p.delete('0,1');const rest=univariate(p);
  expected=xs.map(x=>[x,div(neg(peval(rest,x)),y1)]);
 }
 const matches=[...record.answer.matchAll(/\(([^();]+);\s*([^();]+)\)/g)];assert.equal(matches.map(m=>m[0]).join('; '),record.answer);
 const actual=matches.map(m=>[answerQ(m[1]),answerQ(m[2])]);assert.equal(new Set(pairsKey(actual)).size,actual.length);assert.deepEqual(pairsKey(actual),pairsKey(expected),record.id+': all system solutions');
 for(const [x,y] of actual)for(const eq of eqs)substitution(eq,str(x),str(y));return 'system';
}
function checkEquations(task,record,imageEvidence){
 const equations=formulae(task,imageEvidence);if(equations.length===2)return checkSystem(equations,record);
 const equation=equations[0];const [left,right]=syntax(equation);let reduced,hasRoot=false;
 if(equation.includes('sqrt(')){
  hasRoot=true;assert.equal(left.op,'+');assert.equal(right.op,'+');assert.equal(left.b.op,'sqrt');assert.equal(right.a.op,'sqrt');assert.deepEqual(left.b,right.a);
  reduced=radd(asRf(left.a),rneg(asRf(right.b)));
 }else reduced=radd(asRf(left),rneg(asRf(right)));
 const p=reduced.n;assert.ok(!pzero(p));const text=conditionText(task.fragment);
 if(text.startsWith('Впишите')){
  const roots=rationalRoots(p),actual=answerQ(record.answer);let expected;
  if(text.includes('меньший'))expected=roots[0];else if(text.includes('больший'))expected=roots.at(-1);else{assert.equal(roots.length,1);expected=roots[0];}
  assert.deepEqual(actual,expected,task.id+': selected root');for(const r of roots)substitution(equation,str(r));return 'short';
 }
 const answerParts=record.answer.split(';').map(s=>s.trim());assert.equal(new Set(answerParts).size,answerParts.length);
 for(const part of answerParts)substitution(equation,answerExpression(part));
 if(record.answer.includes('√')){
  assert.equal(answerParts.length,2);const first=answerParts[0].match(/^([−-]?\d+) − √(\d+)$/),last=answerParts[1].match(/^([−-]?\d+) \+ √(\d+)$/);assert.ok(first&&last);assert.equal(first[1],last[1]);assert.equal(first[2],last[2]);
  const center=decimal(first[1]),D=decimal(first[2]);assert.ok(D[0]>0n);const divisor=[add(mul(center,center),neg(D)),mul(q(-2n),center),one];const [remaining,rem]=pdivide(p,divisor);assert.ok(pzero(rem));noRealRoots(remaining);return 'irrational-pair';
 }
 const actual=answerParts.map(answerQ);assert.deepEqual([...actual].sort(cmp),actual);
 if(p.length<=3){
  let expected=rationalRoots(p);
  if(hasRoot)expected=expected.filter(r=>{try{substitution(equation,str(r));return true;}catch{return false;}});
  assert.deepEqual(actual,expected,task.id+': complete roots and domain');return hasRoot?'domain':'rational';
 }
 let remaining=p;
 for(const r of actual){assert.equal(peval(remaining,r)[0],0n);while(remaining.length>1&&peval(remaining,r)[0]===0n)remaining=pdivide(remaining,[neg(r),one])[0];}
 noRealRoots(remaining);return 'factored-polynomial';
}
function auditEquations(task,source,record){if(source.imageEquation){assert.equal(source.images.length,1);assert.equal(source.imageEquation.imageSha256,source.images[0].sha256);}checkEquations(task,record,source.imageEquation);assert.ok(source.methodSource?.reviewed&&source.methodSource.steps.length>80);}
module.exports={checkEquations,auditEquations};
