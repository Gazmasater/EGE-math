const assert = require('node:assert/strict');
const { decodeEntities } = require('../../lib/seo-text');
const E = require('./audit-oge-math-inequalities').exactArithmetic;
const {z,one,add,sub,mul,div,neg,sign,eq,cmp,scalar,unique,trim,padd,psub,pmul,peval,divideRoot,roots,rf,combine,parse,constant,intervalSet,endpoints,contains,probes,math}=E;
const zero=p=>p.every(v=>!sign(v));
const finiteRoots=p=>zero(p)?[]:roots(p);
const value=(f,x)=>div(peval(f.n,x),peval(f.d,x));

// Parse original MathML independently of the Python generator, preserving the
// row/column distinction in the several FIPI encodings of piecewise functions.
function tree(markup){
 const root={name:'root',children:[]},stack=[root];
 for(const token of markup.match(/<[^>]*>|[^<]+/g)||[]){
  if(!token.startsWith('<')){const t=decodeEntities(token).replace(/\s/g,'');if(t)stack.at(-1).children.push(t);continue;}
  const m=token.match(/^<(\/?)(?:m:)?([\w-]+)/i);assert.ok(m);
  if(m[1])assert.equal(stack.pop().name,m[2].toLowerCase());
  else {const n={name:m[2].toLowerCase(),children:[],tag:token};stack.at(-1).children.push(n);if(!token.endsWith('/>'))stack.push(n);}
 }
 assert.equal(stack.length,1);return root;
}
const kids=(n,name)=>n.children.filter(c=>typeof c!=='string'&&(!name||c.name===name));
function find(n,name){if(n.name===name)return n;for(const c of kids(n)){const got=find(c,name);if(got)return got;}return null;}
function render(n){
 if(typeof n==='string')return n;const a=n.children.map(render);
 if(n.name==='mfrac'||n.name==='msup'){assert.equal(a.length,2);return '(('+a[0]+')'+(n.name==='mfrac'?'/':'^')+'('+a[1]+'))';}
 if(n.name==='msqrt')return 'sqrt('+a.join('')+')';
 if(n.name==='munderover'){assert.equal(a.join(''),'');return '';}
 if(n.name==='mtable'){assert.equal(a.join(''),'','Unexpected nonempty nested table');return '';}
 assert.ok(['root','math','mstyle','semantics','mrow','mn','mi','mo','mtext','mtd','mtr'].includes(n.name),n.name);
 return a.join('');
}
function original(task){
 const body=task.fragment.split('КЭС:')[0];
 const formulas=[...body.matchAll(/<(?:m:)?math\b[^>]*>[\s\S]*?<\/(?:m:)?math>/gi)].map(m=>tree(m[0]));
 const text=decodeEntities(body.replace(/<[^>]*>/g,'')).replace(/\s/g,'');
 return {formulas,text};
}
const blankBound=v=>v===Infinity||v===-Infinity;
const inDomain=(d,v)=>(d.left===-Infinity||cmp(v,d.left)>(d.leftOpen?0:-1))&&(d.right===Infinity||cmp(v,d.right)<(d.rightOpen?0:1));
function bound(s){return constant(s.replace(/[.,]+$/,''));}
function domain(raw){
 raw=raw.replace(/[.,]+$/,'');let m=raw.match(/^x([<>≤≥])(.+)$/);
 if(m){const v=bound(m[2]);return ['<','≤'].includes(m[1])?{left:-Infinity,right:v,leftOpen:true,rightOpen:m[1]==='<'}:{left:v,right:Infinity,leftOpen:m[1]==='>',rightOpen:true};}
 m=raw.match(/^(.+)([<≤])x([<≤])(.+)$/);assert.ok(m,raw);
 return {left:bound(m[1]),right:bound(m[4]),leftOpen:m[2]==='<',rightOpen:m[3]==='<'};
}
function simplify(f){
 let n=[...f.n],d=[...f.d];const excluded=unique([...f.excluded.flatMap(finiteRoots),...finiteRoots(d)]);
 for(const r of finiteRoots(d))while(d.length>1&&!sign(peval(d,r))&&!sign(peval(n,r))){n=divideRoot(n,r);d=divideRoot(d,r);}
 return {n,d,excluded};
}
function pieces(n){
 const table=find(n,'mtable');assert.ok(table);const rows=kids(table,'mtr');let pairs;
 if(rows.length===1){
  const cells=kids(rows[0],'mtd');assert.equal(cells.length,3);
  const columns=[cells[0],cells[2]].map(c=>kids(find(c,'mtable'),'mtr').map(render));assert.equal(columns[0].length,columns[1].length);
  pairs=columns[0].map((s,i)=>[s,columns[1][i]]);
 }else pairs=rows.map(r=>render(r).split(/при|если/));
 return pairs.map(pair=>{assert.equal(pair.length,2);return {...simplify(parse(pair[0].replace(/[.,]+$/,''))),domain:domain(pair[1])};});
}
function splitAbs(raw){
 const args=[...raw.matchAll(/\|([^|]+)\|/g)].map(m=>parse(m[1]));assert.equal((raw.match(/\|/g)||[]).length,args.length*2);
 let cuts=unique(args.flatMap(a=>[...finiteRoots(a.n),...finiteRoots(a.d)]));
 function intervals(points){const a=[-Infinity,...points,Infinity];return a.slice(0,-1).map((l,i)=>({left:l,right:a[i+1],leftOpen:true,rightOpen:true}));}
 const sample=d=>d.left===-Infinity?sub(d.right,one):d.right===Infinity?add(d.left,one):div(add(d.left,d.right),scalar(2));
 function at(v){return simplify(parse(raw.replace(/\|([^|]+)\|/g,(_,a)=>{const f=parse(a);return '('+(sign(value(f,v))<0?'-':'')+'('+a+'))';})));}
 if(!cuts.length)cuts=[z]; // also separates the sign domains of rational poles
 let branches=intervals(cuts).map(d=>({...at(sample(d)),domain:d}));
 cuts=unique([...cuts,...branches.flatMap(a=>a.excluded)]);
 branches=intervals(cuts).map(d=>{
  const f=at(sample(d));d.leftOpen=d.left===-Infinity||f.excluded.some(r=>eq(r,d.left));
  return {...f,domain:d};
 });
 return branches;
}
function derivative(p){return trim(p.slice(1).map((c,i)=>mul(c,scalar(i+1))));}
function parameterCritical(branches,parameter){
 const critical=[];
 for(const b of branches){
  const f=parameter==='k'?simplify({...b,d:pmul(b.d,[z,one]),excluded:[]}):b;
  for(const edge of [b.domain.left,b.domain.right]){
   if(blankBound(edge)){
    if(f.n.length<f.d.length)critical.push(z);
    else if(f.n.length===f.d.length)critical.push(div(f.n.at(-1),f.d.at(-1)));
   }else if(sign(peval(f.d,edge)))critical.push(value(f,edge));
  }
  const dp=psub(pmul(derivative(f.n),f.d),pmul(f.n,derivative(f.d)));
  for(const r of finiteRoots(dp))if(inDomain(b.domain,r)&&sign(peval(f.d,r)))critical.push(value(f,r));
 }
 return unique(critical);
}
function intersectionCount(branches,v,parameter){
 const candidates=[];
 for(const b of branches){
  const p=psub(b.n,pmul(b.d,parameter==='k'?[z,v]:[v]));assert.ok(!zero(p),'A whole branch coincides with the line');
  for(const r of roots(p))if(inDomain(b.domain,r)&&!b.excluded.some(a=>eq(a,r))&&sign(peval(b.d,r)))candidates.push(r);
 }
 // Roots belonging to different quadratic fields need no ordering here.
 // The exact canonical keys distinguish them without floating-point tests.
 return new Set(candidates.map(E.key)).size;
}
function answerSet(raw){
 raw=raw.trim().replace(/^[mk]\s*∈\s*/,'');
 raw=raw.replace(/\{([^{}]+)\}/g,(_,body)=>body.split(';').map(v=>'{'+v+'}').join(' ∪ '));
 return intervalSet(raw);
}
function graphModel(f){
 if(f==='sqrt(x)'||/^sqrt\(\(?x\)?\)$/.test(f))return {kind:'sqrt'};
 const p=simplify(parse(f));
 if(p.d.length===1){
  assert.ok(p.n.length<=3);const a=p.n.map(v=>div(v,p.d[0]));
  if(a.length===3)return {kind:'quadratic',aSign:sign(a[2]),cSign:sign(a[0])};
  return {kind:'linear',k:a[1]||z,b:a[0],kSign:sign(a[1]||z),bSign:sign(a[0])};
 }
 assert.equal(p.n.length,1);assert.equal(p.d.length,2);assert.equal(sign(p.d[0]),0);
 return {kind:'reciprocal',kSign:sign(div(p.n[0],p.d[1]))};
}
function compatible(f,g){
 if(f.kind!==g.kind)return false;
 for(const k of ['aSign','cSign','kSign','bSign'])if(k in g&&f[k]!==g[k])return false;
 if(g.points)return g.points.every(([px,py])=>eq(add(mul(f.k,constant(String(px))),f.b),constant(String(py))));
 return true;
}
function checkMatching(task,record,graphs){
 assert.equal(graphs.length,3);const {formulas,text}=original(task);let fs,first;
 if(text.includes('знакамикоэффициентов')){
  const pairs=[...text.matchAll(/a([<>])0,c([<>])0/g)];assert.equal(pairs.length,3);
  fs=pairs.map(p=>({kind:'quadratic',aSign:p[1]==='>'?1:-1,cSign:p[2]==='>'?1:-1}));
  first=text.indexOf('КОЭФФИЦИЕНТЫ')<text.indexOf('ГРАФИКИ');
 }else{
  assert.equal(formulas.length,3);fs=formulas.map(n=>graphModel(render(n).replace(/^y=/,'')));
  first=text.indexOf('ГРАФИКИ')>text.indexOf(text.includes('ФУНКЦИИ')?'ФУНКЦИИ':'ФОРМУЛЫ');
 }
 const valid=['123','132','213','231','312','321'].filter(p=>[0,1,2].every(i=>first?compatible(fs[i],graphs[+p[i]-1]):compatible(fs[+p[i]-1],graphs[i])));
 assert.deepEqual(valid,[record.answer],task.id+': complete matching from original formulas and reviewed graphs');
}
function checkPlots(task,record){
 const {formulas,text}=original(task);const n=formulas[0];
 const branches=find(n,'mtable')?pieces(n):splitAbs(render(n).replace(/^y=/,''));
 const parameter=formulas.map(n=>find(n,'mtable')?'':render(n)).includes('y=kx')?'k':'m';
 const critical=parameterCritical(branches,parameter);
 if(text.includes('наибольшеечисло')){
  const maximum=Math.max(...probes(critical).map(v=>intersectionCount(branches,v,parameter)));
  assert.equal(record.answer,String(maximum),task.id+': maximum proved across all critical values');
  return;
 }
 const targets=text.includes('неимеет')?[0]:text.includes('однуилидве')?[1,2]:text.includes('триобщие')?[3]:text.includes('двеобщие')?[2]:[1];
 const answers=targets.length===1?[record.answer]:record.answer.split('; две точки — ').map((p,i)=>i===0?p.replace(/^одна точка — /,''):p);
 assert.equal(answers.length,targets.length);
 for(let i=0;i<targets.length;i++){
  const set=answerSet(answers[i]);
  for(const v of probes([...critical,...endpoints(set)]))assert.equal(contains(set,v),intersectionCount(branches,v,parameter)===targets[i],task.id+': complete parameter set with excluded endpoints');
 }
}
function checkFunctions(task,record,graphs){if(graphs)checkMatching(task,record,graphs);else checkPlots(task,record);}
function auditFunctions(task,source,record){
 checkFunctions(task,record,source.graphReadings);
 assert.ok(source.methodSource?.reviewed&&source.methodSource.steps.length>80);
 if(!source.graphReadings)assert.match(record.diagram_svg,/<svg\b/);
}
module.exports={checkFunctions,checkMatching,checkPlots,auditFunctions};
