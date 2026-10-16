const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const {createHash}=require('node:crypto');
const {conditionText}=require('../../lib/seo-text');
const pinFile=require.resolve('../data/oge-math-triangles-reviewed.json');
assert.equal(createHash('sha256').update(fs.readFileSync(pinFile)).digest('hex'),'3e09f91b273d64962cc7b6cb91e8dc42ead2368ff3bf500cc5961d7e089fdae4');
const pins=require(pinFile),checkedSnapshots=new Set();
function number(s){
 s=s.trim().replaceAll('−','-').replaceAll(',','.');
 const rat=s.match(/^⟦(.+)¦(.+)⟧$/);if(rat)return number(rat[1])/number(rat[2]);
 const root=s.match(/^(-?\d*(?:\.\d+)?)√(\d+)$/);if(root)return (root[1]===''?1:root[1]==='-'?-1:Number(root[1]))*Math.sqrt(Number(root[2]));
 assert.match(s,/^-?\d+(?:\.\d+)?$/);return Number(s);
}
const eq=(a,b,label)=>assert.ok(Math.abs(a-b)<=1e-9*Math.max(1,Math.abs(a),Math.abs(b)),`${label}: ${a} != ${b}`),sin=a=>Math.sin(a*Math.PI/180),cos=a=>Math.cos(a*Math.PI/180);
const proofGroups=new Set([38,42,58,62,68,69,71,72,73,74,75,76,77,78]);
function audit(t,r,g){
 const n=[...t.text.matchAll(/\d+(?:,\d+)?/g)].map(m=>Number(m[0].replace(',','.'))),im=kind=>t.imageData.find(d=>d.kind===kind),[u,v,w,z]=n;
 assert.ok(r.solution.length>400 && r.solution.endsWith('Ответ: '+r.answer+'.'));
 assert.ok(!/[\/<>]|undefined/.test(r.solution));
 if(proofGroups.has(g)){
  assert.equal(r.answer,'Доказано');assert.match(r.solution,/подобн|вписанн/);
  if(g===38){eq(u*v,w*w,t.id);assert.match(r.solution,/C ↔ B, B ↔ D, D ↔ A/);}
  return;
 }
 if(g===54){assert.equal(r.answer,'60° и 120°');eq(v,4*u,t.id);return;}
 if(g===81){
  const m=r.answer.match(/^AB = (.+), BC = (.+), AC = (.+)$/);assert.ok(m);const [ab,bc,ac]=m.slice(1).map(number);
  // Reconstruct a triangle from its three sides. Check median length,
  // bisector length, division ratio and their dot product independently.
  const A=[0,0],C=[ac,0],B=[(ab*ab+ac*ac-bc*bc)/(2*ac),0];B[1]=Math.sqrt(ab*ab-B[0]*B[0]);
  const D=[(B[0]+C[0])/2,B[1]/2],E=[ac*ab/(ab+bc),0];
  eq(Math.hypot(...D),u,t.id+' median');eq(Math.hypot(E[0]-B[0],B[1]),u,t.id+' bisector');eq(D[0]*(E[0]-B[0])-D[1]*B[1],0,t.id+' perpendicular');return;
 }
 if(g===84){const sides=r.answer.split(' и ').map(number).sort((a,b)=>a-b);assert.equal(sides.length,2);eq((sides[0]+sides[1])/2,Math.max(w,z),t.id);eq((sides[1]-sides[0])/2,Math.min(w,z),t.id);eq(u+v,90,t.id);return;}
 const a=number(r.answer);assert.ok(a>0);
 const check=(x,y)=>eq(x,y,t.id+' group '+g);
 if([1,2,5,6,7,16,21,23,24,31].includes(g)){
  // Area/semiperimeter and sine theorem independently reconstruct radii.
  let side,height,inradius,circumradius;
  if([1,2,16,24,31].includes(g))side=a;else side=u*Math.sqrt(3);
  height=Math.sqrt(side*side-(side/2)**2);inradius=(side*height/2)/(3*side/2);circumradius=side/(2*sin(60));
  if(g===1)check(inradius,u*Math.sqrt(3));else if(g===24)check(circumradius,u*Math.sqrt(3));else if([2,16,31].includes(g))check(height,u*Math.sqrt(3));else if(g===5)check(a,circumradius);else if(g===7)check(a,inradius);else check(a,height);
 }else if(g===3)check(a*a,u*u+v*v);
 else if(g===4)check(a*a+u*u,v*v);
 else if(g===8)check(a,Math.max(...im('grid-right').legs));
 else if(g===9||g===22)check(a*w,v);
 else if(g===10||g===34||g===35){const d=im('trapezoid');check(g===34?(d.bigBase-a):(a-d.smallBase),2*d.height);}
 else if(g===11)check(a*2,im('grid-midline').AC);
 else if(g===12)check(a+u,180);
 else if(g===13){check(a+u+v,180);assert.ok(a>u+v);}
 else if(g===14)check(2*a+u,180);
 else if(g===15)check(2*a,u);
 else if(g===17)check(2*a*sin(u),v*Math.sqrt(w));
 else if(g===18||g===26||g===30)check(a*w,z*v);
 else if(g===19||g===20)check(a+u,90);
 else if(g===25)check(a+u+v,180);
 else if(g===27)check(a*v,w);
 else if(g===28)check((2*a)**2,u*u+v*v);
 else if(g===29)check(a*2,u);
 else if(g===32)check(a*2,w);
 else if(g===33){const h=(v-u)/2;check(a,u*h+h*h);}
 else if(g===36)check(2*a*sin(u),v);
 else if(g===37)check(Math.hypot(a,u),u+v);
 else if(g===39)check((w-a)*v,a*u);
 else if(g===40||g===41)check(a,u);
 else if(g===43)check(a*a,u*u+v*v);
 else if(g===44)check((a-v)*z,(u-a)*w);
 else if(g===45)check(sin(a/2),sin(u));
 else if(g===46||g===65){const d=im('grid-similar');check(a*d.full,d.base*d.part);}
 else if(g===47)check(a*sin(u),w*sin(v));
 else if(g===48)check(a*a/v,u);
 else if(g===49||g===50){const d=im('grid-ratio'),sides={[d.segment1]:d.projection1,[d.segment2]:d.projection2},f=t.inlineFormulas;const first=sides[f.at(-2)],second=sides[f.at(-1)];assert.ok(g===49?first<second:first>second,t.id+' question direction');check(g===49?a*first:a*second,g===49?second:first);}
 else if(g===51||g===56)check(a*v,u);
 else if(g===52)check(2*a+u,180);
 else if(g===53)check(a/(a+w),u/v);
 else if(g===55)check(a+im('inline-angle').C,90);
 else if(g===57)check((a-u/2)**2,v*v+(u/2)**2);
 else if(g===59)check(cos(a),sin((180-u)/2));
 else if(g===60)check((v-a/2)**2,u*u+(a/2)**2);
 else if(g===61)check(a*a+(v/2)**2,w*w+(u/2)**2);
 else if(g===63)check(a*Math.hypot(u,v),u*v);
 else if(g===64)check(a/(2*w),sin(180-u-v));
 else if(g===66)check(a+3*im('inline-angle').C,180);
 else if(g===67)check(a*v,u*Math.sqrt(v*v-u*u));
 else if(g===70)check((a/2)**2+w*w,(u/2)**2+v*v);
 else if(g===79){
  // Choose unequal base parts with product MD², then intersect the altitude
  // from B with the line AD using the actual coordinates.
  const x=v*.8,y=v/0.8;const hx=0,hy=x*y/u;check(u-hy,a);
 }
 else if(g===80){
  // A=(0,0)=E, D=(AD,0), circle center=(AD/2,0).
  // Pick C with x=BC on the same circle; compute point-to-line distance.
  const cy=Math.sqrt(u*v-v*v); // circle through A,D: y²=AD*BC−BC²
  const distance=u*cy/Math.hypot(u-v,cy);check(distance,a);
 }
 else if(g===82){const d=u+v,normalX=(u-v)/d;const xAB=u*normalX,xCD=d+v*normalX;check(xCD-xAB,a);}
 else if(g===83)check((Math.asin(u/(2*a))+Math.asin(v/(2*a)))*180/Math.PI,w);
 else if(g===85||g===87){
  const c=g===85?Math.sqrt(w)/z:w*Math.sqrt(z)/n[4],s=Math.sqrt(1-c*c),at=Math.sqrt(u*v),tx=at*c,ty=at*s,ox=(u+v)/2,oy=(at-ox*c)/s;
  check(Math.hypot(ox-u,oy),a);check(Math.hypot(ox-v,oy),a);check(Math.hypot(ox-tx,oy-ty),a);check((ox-tx)*c+(oy-ty)*s,0);assert.ok(at>0);
 }
 else if(g===86){
  // A=(0,0), C=(AC,0), choose B=(AB*cos60,AB*sin60).
  // Circumcenter O is equidistant from A,B,C; BD perpendicular to AO.
  const bx=u*cos(60),by=u*sin(60),ox=v/2,oy=(u*u/2-ox*bx)/by,dx=v-a;
  check(ox*(dx-bx)-oy*by,0);assert.ok(dx>0&&dx<v);
 }
 else if(g===88){
  // Central angle BMC from the two specified quadrilateral angles.
  const baseAngle=v+w-180,central=180-2*baseAngle;check(2*(a/2)*sin(central/2),u);
 }
 else throw Error('Unchecked group '+g);
}
function auditTriangles(task,source,record){
 const pin=pins[task.id];assert.ok(pin,'Unreviewed triangle task');
 assert.equal(pin.sourceHash,source.sourceHash);
 assert.equal(source.model.group,pin.group);
 assert.deepEqual(source.model.imageData,pin.imageData);
 assert.equal(source.url,'https://math-oge.sdamgia.ru/problem?id='+pin.externalSourceId);
 assert.equal(source.externalSnapshotSha256,pin.externalSnapshotSha256);
 if(!checkedSnapshots.has(source.externalSnapshot)){
  assert.equal(createHash('sha256').update(fs.readFileSync(source.externalSnapshot)).digest('hex'),pin.externalSnapshotSha256);
  checkedSnapshots.add(source.externalSnapshot);
 }
 if(pin.proofSha256)assert.equal(createHash('sha256').update(record.solution).digest('hex'),pin.proofSha256,'Changed reviewed proof');
 audit({id:task.id,text:conditionText(task.fragment),imageData:pin.imageData,inlineFormulas:pin.inlineFormulas},record,pin.group);
}
module.exports={auditTriangles};
