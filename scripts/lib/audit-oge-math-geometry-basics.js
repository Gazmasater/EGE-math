const assert = require('node:assert/strict');
const fs = require('node:fs');
const {createHash} = require('node:crypto');
const {conditionText} = require('../../lib/seo-text');
const registryFile = require.resolve('../data/oge-math-geometry-statements-reviewed.json');
// Human-reviewed proofs and counterexamples, independent of the answer generator.
assert.equal(createHash('sha256').update(fs.readFileSync(registryFile)).digest('hex'),
  '5736ed17a20539e18080f09a85f1ad421e2025448a8e695dd1fccb84d12c9222');
const registry = require(registryFile);
const norm = s => s.replace(/бо�ьш/g,'больш').replace(/ё/g,'е').replace(/[º°]/g,' градусов').replace(/[^а-яa-z0-9]/gi,'').toLowerCase();
const byText = new Map();
for (const r of registry) {
  const key=norm(r.statement),group=byText.get(key)||[];
  assert.ok(group.every(v=>v.true===r.true));group.push(r);byText.set(key,group);
}
const checkedFiles = new Set();
function checkFile(file,hash) {
  const key = file+' '+hash;
  if (!checkedFiles.has(key)) {
    assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'),hash);
    checkedFiles.add(key);
  }
}
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1]], dot=(a,b)=>a[0]*b[0]+a[1]*b[1];
const length=a=>Math.hypot(...a), distance=(a,b)=>length(sub(a,b));
const det=(a,b)=>a[0]*b[1]-a[1]*b[0];
const close=(a,b,tolerance=0.0001)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
const lineDistance=(p,a,b)=>Math.abs(det(sub(p,a),sub(b,a)))/distance(a,b);
function bisects(vertex,p,a,b) {
  const u=sub(a,vertex),v=sub(b,vertex),w=sub(p,vertex);
  const sum=[u[0]/length(u)+v[0]/length(v),u[1]/length(u)+v[1]/length(v)];
  close(det(sum,w)/length(w),0); assert.ok(dot(sum,w)>0,'internal bisector ray');
}
function parseStatements(text) {
  const positions=[...text.matchAll(/(?:^|\s)([123])\)\s*/g)];
  assert.equal(positions.length,3,'three primary statements');
  return positions.map((m,i)=>{
    assert.equal(Number(m[1]),i+1);
    return text.slice(m.index+m[0].length,positions[i+1]?.index)
      .split(/В ответ|Если утверждений/)[0].trim();
  });
}
function auditGeometryBasics(task,source,record) {
  const text=conditionText(task.fragment), compact=text.replace(/\s/g,'');
  if (/утверждени/.test(text)) {
    const statements=parseStatements(text);let answer='';
    statements.forEach((statement,i)=>{
      const group=byText.get(norm(statement));assert.ok(group,'Unreviewed statement: '+statement);
      const proof=group.find(p=>record.solution.includes(p.proof));assert.ok(proof,'Changed reviewed proof');
      assert.equal(proof.reviewed,true);assert.ok(proof.proof.length>100);
      assert.equal(proof.true,proof.evidence.truth);
      checkFile(proof.evidence.snapshot,proof.evidence.snapshotSha256);
      checkFile(proof.evidence.methodSnapshot,proof.evidence.methodSnapshotSha256);
      assert.ok(record.solution.includes(proof.proof),'Changed reviewed proof');
      if(proof.true)answer+=String(i+1);
    });
    if (/истинным высказыванием|Какое из/.test(text)) assert.equal(answer.length,1);
    assert.equal(record.answer,answer,'True statements in primary order');
    return;
  }
  // Reconstruct actual rendered geometry. Never trust the generator's model,
  // answer or hidden coordinate metadata for these calculations.
  const points={};
  for(const match of record.diagram_svg.matchAll(/<circle\b[^>]*data-point="([A-Z])"[^>]*cx="([\d.-]+)"[^>]*cy="([\d.-]+)"[^>]*>/g)) {
    assert.ok(!points[match[1]],'Duplicate diagram point');points[match[1]]=[+match[2],+match[3]];
  }
  const {A,B,C,D,K,H,M,L}=points;
  assert.ok(A&&B&&C,'Missing rendered vertices');
  const value=Number(record.answer.replace(',','.'));
  assert.ok(Number.isFinite(value)&&value>0);
  if (text.includes('периметр параллелограмма')) {
    const u=+compact.match(/BK=(\d+)/)[1],v=+compact.match(/CK=(\d+)/)[1];
    assert.ok(K&&D);const scale=(u+v)/distance(B,C);
    close(distance(B,K)*scale,u);close(distance(C,K)*scale,v);
    close(distance(B,K)+distance(K,C),distance(B,C));bisects(A,K,B,D);
    close(A[0]+C[0],B[0]+D[0]);close(A[1]+C[1],B[1]+D[1]);
    const perimeter=[distance(A,B),distance(B,C),distance(C,D),distance(D,A)].reduce((x,y)=>x+y,0)*scale;
    close(value,perimeter);assert.equal(value,4*u+2*v);
  } else if (text.includes('площадь параллелограмма')) {
    const base=+compact.match(/BC=(\d+)/)[1],d=+compact.match(/равно(\d+)/)[1];
    assert.ok(D&&K&&H&&M&&L);const scale=base/distance(B,C);
    close(A[0]+C[0],B[0]+D[0]);close(A[1]+C[1],B[1]+D[1]);
    bisects(A,K,B,D);bisects(B,K,A,C);
    for(const [foot,a,z] of [[L,A,B],[H,A,D],[M,B,C]]) {
      close(lineDistance(foot,a,z),0,0.002);
      close(dot(sub(K,foot),sub(z,a))/(distance(K,foot)*distance(z,a)),0);
      close(distance(K,foot)*scale,d);
    }
    close(distance(H,K)+distance(K,M),distance(H,M));
    const vertices=[A,B,C,D];
    const area=Math.abs(vertices.reduce((sum,p,i)=>sum+det(p,vertices[(i+1)%4]),0))/2*scale*scale;
    close(value,area);assert.equal(value,2*base*d);
  } else {
    assert.ok(text.includes('радиус окружности')&&text.includes('считая от точки B'));
    const [,p,q]=compact.match(/отношении(\d+):(\d+)/).map(Number),side=+compact.match(/BC=(\d+)/)[1];
    assert.ok(H&&M&&p>q);const scale=side/distance(B,C);
    close(lineDistance(H,A,C),0,0.002);close(lineDistance(M,B,H),0,0.002);
    close(dot(sub(B,H),sub(C,A))/(distance(B,H)*distance(C,A)),0);
    close(distance(B,M)/distance(M,H),p/q);close(distance(B,M)+distance(M,H),distance(B,H));bisects(A,M,B,C);
    // Solve the two perpendicular-bisector equations for the circumcentre.
    const u=sub(B,A),v=sub(C,A),rhs1=dot(u,u)/2,rhs2=dot(v,v)/2,den=det(u,v);
    assert.ok(Math.abs(den)>1);const centre=[(rhs1*v[1]-u[1]*rhs2)/den,(u[0]*rhs2-rhs1*v[0])/den];
    close(value,length(centre)*scale);close(length(centre),distance(centre,u));close(length(centre),distance(centre,v));
    assert.equal(4*value*value*(p*p-q*q),side*side*p*p,'Exact squared circumradius');
  }
}
module.exports={auditGeometryBasics,parseStatements};
