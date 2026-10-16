const assert=require('node:assert/strict');
const {decodeEntities}=require('../../lib/seo-text');
// Exact arithmetic independent of the Python/SymPy generator. Each task uses
// rational numbers or a single quadratic field, a + b*sqrt(r).
const abs=a=>a<0n?-a:a;
const gcd=(a,b)=>{a=abs(a);b=abs(b);while(b)[a,b]=[b,a%b];return a;};
function Q(n,d=1n){assert.notEqual(d,0n);if(d<0n){n=-n;d=-d;}const g=gcd(n,d);return [n/g,d/g];}
const qa=(a,b)=>Q(a[0]*b[1]+b[0]*a[1],a[1]*b[1]);
const qm=(a,b)=>Q(a[0]*b[0],a[1]*b[1]);
const qn=a=>Q(-a[0],a[1]);
const qd=(a,b)=>Q(a[0]*b[1],a[1]*b[0]);
const F=(a,b=Q(0n),r=0n)=>({a,b,r:b[0]?r:0n});
const z=F(Q(0n)),one=F(Q(1n));
function field(a,b){assert.ok(!a.r||!b.r||a.r===b.r);return a.r||b.r;}
const add=(a,b)=>F(qa(a.a,b.a),qa(a.b,b.b),field(a,b));
const neg=a=>F(qn(a.a),qn(a.b),a.r);
const sub=(a,b)=>add(a,neg(b));
function mul(a,b){const r=field(a,b);return F(qa(qm(a.a,b.a),qm(qm(a.b,b.b),Q(r))),qa(qm(a.a,b.b),qm(a.b,b.a)),r);}
function div(a,b){const norm=qa(qm(b.a,b.a),qn(qm(qm(b.b,b.b),Q(b.r))));assert.notEqual(norm[0],0n);return mul(a,F(qd(b.a,norm),qn(qd(b.b,norm)),b.r));}
function sqroot(a){assert.equal(a.r,0n);assert.ok(a.a[0]>=0n);if(!a.a[0])return z;let r=a.a[0]*a.a[1],n=1n;for(let p=2n;p*p<=r;p++)while(r%(p*p)===0n){r/=p*p;n*=p;}return r===1n?F(Q(n,a.a[1])):F(Q(0n),Q(n,a.a[1]),r);}
function sign(a){const sa=a.a[0]<0n?-1:a.a[0]>0n?1:0,sb=a.b[0]<0n?-1:a.b[0]>0n?1:0;if(!sb)return sa;if(!sa||sa===sb)return sb;const d=qa(qm(a.a,a.a),qn(qm(qm(a.b,a.b),Q(a.r))));assert.notEqual(d[0],0n);return d[0]>0n?sa:sb;}
const eq=(a,b)=>sign(sub(a,b))===0,cmp=(a,b)=>sign(sub(a,b));
const scalar=n=>F(Q(BigInt(n)));
const key=a=>[...a.a,...a.b,a.r].map(String).join(':');
const unique=xs=>[...new Map(xs.map(v=>[key(v),v])).values()].sort(cmp);
function decimal(s){const [w,f='']=s.replace(',','.').split('.');return F(Q(BigInt(w+f),10n**BigInt(f.length)));}
const trim=p=>{while(p.length>1&&!sign(p.at(-1)))p.pop();return p;};
const padd=(a,b)=>trim(Array.from({length:Math.max(a.length,b.length)},(_,i)=>add(a[i]||z,b[i]||z)));
const pn=a=>a.map(neg),psub=(a,b)=>padd(a,pn(b));
function pmul(a,b){const p=Array.from({length:a.length+b.length-1},()=>z);for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++)p[i+j]=add(p[i+j],mul(a[i],b[j]));return trim(p);}
const peval=(p,v)=>p.reduceRight((a,c)=>add(mul(a,v),c),z);
function divideRoot(p,r){const q=Array(p.length-1);q[q.length-1]=p.at(-1);for(let i=q.length-2;i>=0;i--)q[i]=add(p[i+1],mul(r,q[i+1]));assert.ok(!sign(add(p[0],mul(r,q[0]))));return trim(q);}
function roots(poly){
 let p=trim([...poly]),out=[];assert.ok(p.some(sign),'Identically zero polynomial needs explicit handling');
 while(p.length>1&&!sign(p[0])){out.push(z);p=p.slice(1);}
 if(p.length>3){
  assert.ok(p.every(v=>!v.r));let den=1n;for(const v of p)den=den*v.a[1]/gcd(den,v.a[1]);const a=p.map(v=>v.a[0]*(den/v.a[1]));
  const divisors=n=>{n=abs(n);const out=[];for(let i=1n;i*i<=n;i++)if(n%i===0n){out.push(i);if(i*i!==n)out.push(n/i);}return out;};
  for(const n of divisors(a[0]))for(const d of divisors(a.at(-1)))for(const sg of [-1n,1n]){const r=F(Q(sg*n,d));while(p.length>1&&!sign(peval(p,r))){out.push(r);p=divideRoot(p,r);}}
 }
 assert.ok(p.length<=3,'Unproved polynomial root completeness');
 if(p.length===2)out.push(div(neg(p[0]),p[1]));
 if(p.length===3){const [c,b,a]=p,D=sub(mul(b,b),mul(scalar(4),mul(a,c)));if(sign(D)>=0){const s=sqroot(D),d=mul(scalar(2),a);out.push(div(sub(neg(b),s),d),div(add(neg(b),s),d));}}
 return unique(out);
}
const rf=n=>({n,d:[one],excluded:[]});
function combine(a,b,op){
 const excluded=[...a.excluded,...b.excluded];
 if(op==='+')return {n:padd(pmul(a.n,b.d),pmul(b.n,a.d)),d:pmul(a.d,b.d),excluded};
 if(op==='-')return {n:psub(pmul(a.n,b.d),pmul(b.n,a.d)),d:pmul(a.d,b.d),excluded};
 if(op==='*')return {n:pmul(a.n,b.n),d:pmul(a.d,b.d),excluded};
 assert.equal(op,'/');return {n:pmul(a.n,b.d),d:pmul(a.d,b.n),excluded:[...excluded,b.n]};
}
function normalize(s){return s.replace(/\s/g,'').replaceAll('х','x').replace(/[−–]/g,'-').replaceAll('²','^2').replaceAll('³','^3').replaceAll('⁴','^4').replace(/[·⋅]/g,'*').replace(/√\((\d+)\)/g,'sqrt($1)').replace(/√(\d+)/g,'sqrt($1)');}
function parse(s){
 s=normalize(s);const ts=s.match(/sqrt|\d+(?:[.,]\d+)?|[x()+*\/^\-]/g)||[];assert.equal(ts.join(''),s,s);let i=0;
 function atom(){const t=ts[i++];if(t==='('){const a=sum();assert.equal(ts[i++],')');return a;}if(t==='sqrt'){assert.equal(ts[i++],'(');const a=sum();assert.equal(ts[i++],')');assert.equal(a.n.length,1);assert.equal(a.d.length,1);return rf([sqroot(div(a.n[0],a.d[0]))]);}if(t==='x')return rf([z,one]);assert.match(t,/^\d+(?:[.,]\d+)?$/);return rf([decimal(t)]);}
 function power(){let a=atom();if(ts[i]==='^'){i++;const b=unary();assert.equal(b.n.length,1);assert.equal(b.d.length,1);const e=div(b.n[0],b.d[0]);assert.equal(e.r,0n);assert.equal(e.a[1],1n);assert.ok(e.a[0]>=0n&&e.a[0]<=4n);let p=rf([one]);for(let j=0n;j<e.a[0];j++)p=combine(p,a,'*');a=p;}return a;}
 function unary(){if(ts[i]==='-'){i++;const a=unary();return {...a,n:pn(a.n)};}if(ts[i]==='+'){i++;return unary();}return power();}
 function product(){let a=unary();while(true){const t=ts[i];if(t==='*'||t==='/'){i++;a=combine(a,unary(),t);}else if(t&&/^(?:sqrt|x|\(|\d)/.test(t))a=combine(a,unary(),'*');else break;}return a;}
 function sum(){let a=product();while(ts[i]==='+'||ts[i]==='-'){const op=ts[i++];a=combine(a,product(),op);}return a;}
 const out=sum();assert.equal(i,ts.length);return out;
}
function constant(s){let old;do{old=s;s=s.replace(/⟦([^⟦⟧¦]+)¦([^⟦⟧¦]+)⟧/g,'(($1)/($2))');}while(s!==old);const p=parse(s);assert.equal(p.n.length,1);assert.equal(p.d.length,1);return div(p.n[0],p.d[0]);}
function inequality(s){const a=s.split(/([<>≤≥])/);assert.equal(a.length,3);const p=combine(parse(a[0]),parse(a[2]),'-');const excluded=unique(p.excluded.flatMap(roots));const critical=unique([...roots(p.n),...roots(p.d),...excluded]);return {p,op:a[1],excluded,critical};}
function truth(c,v){if(c.excluded.some(a=>eq(a,v)))return false;const d=peval(c.p.d,v);if(!sign(d))return false;const s=sign(peval(c.p.n,v))*sign(d);return c.op==='<'?s<0:c.op==='>'?s>0:c.op==='≤'?s<=0:s>=0;}
function intervalSet(s){
 s=s.replace(/\s/g,'');if(s==='∅'||s==='нетрешений')return [];
 return s.split('∪').map(part=>{
  if(part.startsWith('{'))return {point:constant(part.slice(1,-1))};
  assert.match(part,/^[([]/);assert.match(part,/[)\]]$/);const ends=part.slice(1,-1).split(';');assert.equal(ends.length,2);
  const bound=v=>v==='−∞'||v==='-∞'?-Infinity:v==='+∞'||v==='∞'?Infinity:constant(v);
  const left=bound(ends[0]),right=bound(ends[1]);assert.ok(left!==Infinity&&right!==-Infinity);if(typeof left!=='number'&&typeof right!=='number')assert.ok(cmp(left,right)<0);if(left===-Infinity)assert.equal(part[0],'(');if(right===Infinity)assert.equal(part.at(-1),')');
  return {left,right,leftOpen:part[0]==='(',rightOpen:part.at(-1)===')'};
 });
}
const endpoints=set=>set.flatMap(p=>p.point?[p.point]:[p.left,p.right].filter(v=>typeof v!=='number'));
const contains=(set,v)=>set.some(p=>p.point?eq(p.point,v):(p.left===-Infinity||cmp(v,p.left)>(p.leftOpen?0:-1))&&(p.right===Infinity||cmp(v,p.right)<(p.rightOpen?0:1)));
function probes(points){const a=unique(points),out=[...a];if(!a.length)return [z];out.push(sub(a[0],one),add(a.at(-1),one));for(let i=1;i<a.length;i++)out.push(div(add(a[i-1],a[i]),scalar(2)));return out;}
function checkSet(set,cs){const ps=probes([...endpoints(set),...cs.flatMap(c=>c.critical)]);return ps.every(v=>contains(set,v)===cs.every(c=>truth(c,v)));}
function math(markup){
 const root={name:'root',children:[]},stack=[root];
 for(const token of markup.match(/<[^>]*>|[^<]+/g)||[]){if(!token.startsWith('<')){const s=decodeEntities(token).replace(/\s/g,'');if(s)stack.at(-1).children.push(s);continue;}const m=token.match(/^<(\/?)(?:m:)?([\w-]+)/i);assert.ok(m);if(m[1])assert.equal(stack.pop().name,m[2].toLowerCase());else{const node={name:m[2].toLowerCase(),children:[],tag:token};stack.at(-1).children.push(node);if(!token.endsWith('/>'))stack.push(node);}}
 assert.equal(stack.length,1);
 function render(n){if(typeof n==='string')return n;const a=n.children.map(render);if(n.name==='msup'||n.name==='mfrac'){assert.equal(a.length,2);return '(('+a[0]+')'+(n.name==='msup'?'^':'/')+'('+a[1]+'))';}if(n.name==='msqrt')return 'sqrt('+a.join('')+')';if(n.name==='mfenced'){const attr=k=>n.tag.match(new RegExp(k+'="([^"]*)"'))?.[1];return (attr('open')||'(')+a.join(attr('separators')||',')+(attr('close')||')');}if(n.name==='mtable')return a.map(s=>s.replace(/[.,;]$/,'')).join(';')+'}';assert.ok(['root','math','mstyle','semantics','mrow','mn','mi','mo','mtext','mtr','mtd'].includes(n.name));return a.join('');}
 return render(root).replace(/\.$/,'');
}
function primary(task,evidence){
 const cells=[...task.fragment.matchAll(/<td\b[^>]*class=["'][^"']*\bcell_0\b[^"']*["'][^>]*>([\s\S]*?)<\/td>/gi)];assert.equal(cells.length,1,task.id);
 const options=[...task.fragment.matchAll(/<tr\b[^>]*class=["'][^"']*\bactive-distractor\b[^"']*["'][^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>[...m[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].at(-1)[1]);
 const images=new Map((evidence?.assets||[]).map(a=>[a.src,a.text]));if(images.size)assert.equal(evidence.reviewed,true);
 function formula(html){
  html=html.replace(/<script\b[^>]*>\s*ShowPictureQ\(\s*(['"])([^'"]+)\1[^)]*\)\s*;?\s*<\/script>/gi,(_,q,file)=>'<img src="/fipi/oge/'+file+'">');const list=[];
  html=html.replace(/<(?:m:)?math\b[^>]*>[\s\S]*?<\/(?:m:)?math>|<img\b[^>]*>/gi,m=>{if(m.startsWith('<img')){const src=m.match(/\bsrc=["']([^"']+)["']/)[1];assert.ok(images.has(src),task.id+': unreviewed image');list.push(images.get(src));}else list.push(math(m));return '';});
  if(!list.length){assert.match(decodeEntities(html.replace(/<[^>]*>/g,'')),/нет\s*решений/);return 'нет решений';}assert.equal(list.length,1,task.id);return list[0];
 }
 return {condition:formula(cells[0][1]),choices:options.map(formula),select:/решение которого изображено/.test(cells[0][1])};
}
function checkInequalities(task,record,evidence){
 const p=primary(task,evidence);let cs;
 if(p.select){assert.equal(p.choices.length,4);const target=intervalSet(p.condition),matches=p.choices.flatMap((s,i)=>checkSet(target,[inequality(s)])?[String(i+1)]:[]);assert.deepEqual(matches,[record.answer],task.id+': graph option');return 'select-inequality';}
 cs=(p.condition.startsWith('{')?p.condition.slice(1,-1).split(';'):[p.condition]).map(inequality);
 if(p.choices.length){assert.equal(p.choices.length,4);const matches=p.choices.flatMap((s,i)=>checkSet(intervalSet(s),cs)?[String(i+1)]:[]);assert.deepEqual(matches,[record.answer],task.id+': unique interval option');}
 else assert.ok(checkSet(intervalSet(record.answer),cs),task.id+': full set, isolated points and original domain');
 return cs.length>1?'system':cs[0].excluded.length?'rational':'polynomial';
}
function auditInequalities(task,source,record){checkInequalities(task,record,source.imageTranscriptions);assert.ok(source.methodSource?.reviewed&&source.methodSource.steps.length>80);}
module.exports={checkInequalities,auditInequalities,primary,
 exactArithmetic:{Q,F,z,one,add,sub,mul,div,neg,sign,eq,cmp,scalar,key,unique,decimal,trim,padd,psub,pmul,peval,divideRoot,roots,rf,combine,parse,constant,intervalSet,endpoints,contains,probes,math}};
