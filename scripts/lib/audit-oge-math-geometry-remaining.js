const fs=require('node:fs'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {conditionText}=require('../../lib/seo-text');
const pinFile=require.resolve('../data/oge-math-geometry-remaining-reviewed.json');
assert.equal(createHash('sha256').update(fs.readFileSync(pinFile)).digest('hex'),'72f5a1ca30d75925ea32a8dce080e08f25242cdee03cc14d3a4a4565d9689c00');
const pins=require(pinFile),checkedSnapshots=new Set();
function test(t,g,answer){
 const n=[...t.text.matchAll(/\d+(?:,\d+)?/g)].map(m=>Number(m[0].replace(',','.')));
 const rat=s=>s.includes('/')?s.split('/').map(Number).reduce((a,b)=>a/b):Number(s);
 const parse=s=>/^⟦/.test(s)?s.slice(1,-1).split('¦').map(Number).reduce((a,b)=>a/b):Number(s.replace(',','.').replace('−','-'));
 const a=parse(answer),near=(x,y)=>assert.ok(Math.abs(x-y)<1e-7*Math.max(1,Math.abs(x),Math.abs(y)),`${t.id} group${g}: ${x} != ${y}`);
 assert.ok(Number.isFinite(a)&&a>0,t.id+': positive finite answer');
 const image=kind=>t.imageData.find(x=>x.kind===kind),sq=v=>v.reduce((s,x)=>s+x*x,0);
 if(g===1||g===12)near(a+n[0],90);
 else if([2,4,7].includes(g)){
  const p=image('grid-polygon').points;let area=0;
  for(let i=0;i<p.length;i++){const q=p[(i+1)%p.length];area+=p[i][0]*q[1]-q[0]*p[i][1];}
  near(2*a,Math.abs(area));
 } else if(g===3)near(a+n[1],n[0]);
 else if(g===6)near(a-n[0],n[1]);
 else if(g===5||g===20)near(2*a,n[0]*n[1]);
 else if(g===8)near(Math.sqrt(a)/2,n[0]);
 else if(g===9)near(2*a/n[0],n[2]);
 else if(g===10)near(2*a+n[0],180);
 else if(g===11)near(a+n[0],180);
 else if(g===13){near(2*a/(n[0]*n[1]),n[2]/n[3]);assert.ok(n[2]<=n[3]);}
 else if(g===14||g===15){near(a*a+n[1]*n[1],4*n[0]*n[0]);assert.ok(a<2*n[0]);}
 else if(g===16)near(n[1]+a,n[0]+n[2]);
 else if(g===17)near(2*a,n[0]);
 else if(g===18){const d=image('parallelogram-height');near(a/d.height,d.baseParts[0]+d.baseParts[1]);assert.ok(d.baseParts.some(x=>Math.abs(x*x+d.height*d.height-d.side*d.side)<1e-8));}
 else if(g===19)near(a+2*n[0],180);
 else if(g===21)near(2*a,n[0]);
 else if(g===22){const d=image('grid-circles');near(a*sq(d.smallRadiusVector),sq(d.largeRadiusVector));assert.ok(a>1);}
 else if(g===23){const k=rat(image('inradius-root3').coefficient);near(a*a/12,3*k*k);}
 else if(g===24){const half=n[0]/2,other=half*rat(image('tangent').value);near(1/(a*a),1/(half*half)+1/(other*other));}
 else if(g===25||g===29){const sine=g===25?n[0]:rat(image('sine').value),d=n.at(-1);near(a*a,d**4*sine*sine*(1-sine*sine));assert.ok(sine>0&&sine<1&&a<=d*d/2+1e-8);}
 else if(g===28)near(a*a,sq(image('grid-distance').delta));
 else if(g===36){
  const [big,small,angle,leg]=n;assert.equal(angle,90);
  const ta=leg/(1-small/big),tb=ta-leg,centerY=Math.sqrt(ta*tb);
  // Put the intersecting leg lines on perpendicular coordinate axes. A circle
  // tangent to the vertical axis has center (R,y); both given vertices must lie on it.
  near((ta-a)**2+centerY**2,a*a);near((tb-a)**2+centerY**2,a*a);near(tb/ta,small/big);
 } else if(g===37){
  const [ao,d,r]=n,h=d+r,base=a/h,semiperimeter=a/(2*r),tangent=semiperimeter-base;
  assert.ok(tangent>0&&d>r);near(tangent*tangent+r*r,ao*ao);
  // Independently reconstruct a triangle from the half-angle at A and its
  // opposite line through the incircle contact, checking its base and altitude.
  const cos=tangent/ao,sin=r/ao,normalX=(h-r)/ao;
  assert.ok(normalX>0&&normalX<1);const normalY=Math.sqrt(1-normalX*normalX);
  const ab=h/(normalX*cos+normalY*sin),ac=h/(normalX*cos-normalY*sin);
  assert.ok(ab>0&&ac>0);near(Math.sqrt((ab-ac)**2*cos*cos+(ab+ac)**2*sin*sin),base);
 } else throw new Error('No numeric audit group '+g);
}

function auditGeometryRemaining(task,source,record){
 const pin=pins[task.id];assert.ok(pin,'Unreviewed geometry task');
 assert.equal(pin.sourceHash,source.sourceHash);assert.equal(source.model.group,pin.group);assert.deepEqual(source.model.imageData,pin.imageData);
 assert.equal(source.url,'https://math-oge.sdamgia.ru/problem?id='+pin.externalSourceId);assert.equal(source.externalSnapshotSha256,pin.externalSnapshotSha256);
 if(!checkedSnapshots.has(source.externalSnapshot)){assert.equal(createHash('sha256').update(fs.readFileSync(source.externalSnapshot)).digest('hex'),pin.externalSnapshotSha256);checkedSnapshots.add(source.externalSnapshot);}
 assert.ok(record.solution.length>=400 && record.solution.endsWith('Ответ: '+record.answer+'.'));assert.ok(!/[\/<>]|undefined/.test(record.solution));
 const t={id:task.id,text:conditionText(task.fragment),imageData:pin.imageData};
 if(pin.proofSha256){assert.equal(record.answer,'Доказано');assert.match(t.text,/Докажите/);assert.equal(createHash('sha256').update(record.solution).digest('hex'),pin.proofSha256,'Changed reviewed proof');return;}
 test(t,pin.group,record.answer);
}
module.exports={auditGeometryRemaining};
