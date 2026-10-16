const fs=require('node:fs'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {conditionText}=require('../../lib/seo-text');
const pinFile=require.resolve('../data/oge-math-quadrilaterals-reviewed.json');
assert.equal(createHash('sha256').update(fs.readFileSync(pinFile)).digest('hex'),'13709ddd7d0ccd0f80ccf960951b805125265a8ecb730e028b1ed0146fbbb4d4');
const pins=require(pinFile),checkedSnapshots=new Set();
function test(t,g,answer){
 const n=Array.from(t.text.matchAll(/\d+(?:,\d+)?/g),m=>Number(m[0].replace(',','.')));const z=Number(answer.replace(',','.'));assert(Number.isFinite(z));
 const eq=(x,y)=>assert(Math.abs(x-y)<1e-8*Math.max(1,Math.abs(x),Math.abs(y)),`${t.id} group ${g}: ${x} != ${y}`);
 let [u,v,w]=n;
 switch(g){
 case 1:case 10:case 21:case 23:case 26:case 30:case 33:case 39:eq(z+u,180);assert([1,21,23,30].includes(g)?z>90:z<90);break;
 case 2:eq(2*z,v);break;
 case 3:eq(z*z,2*u*u*v);break;
 case 4:eq(2*z,Math.max(u,v));break;
 case 5:eq(z,Math.max(...t.imageData[0].diagonals));break;
 case 6:eq(z/u,Math.sin(v*Math.PI/180));break;
 case 7:case 14:eq(z+u,180);break;
 case 8:eq(z,(u+v)/2);break;
 case 9:eq(4*z*z,2*u*u*v);break;
 case 11:eq(z/2,u);assert(z<90);break;
 case 12:eq(2*z,t.imageData[0].bases.reduce((a,x)=>a+x,0));break;
 case 13:case 16:case 24:eq(z/2,u);break;
 case 15:eq(z,Math.min(u+v,180-u-v));break;
 case 17:eq(2*z,u);break;
 case 18:eq(2*z*z,4*u*u*v);break;
 case 19:eq(z,Math.pow(u/4,2)*Math.sin(v*Math.PI/180));break;
 case 20:eq(2*z+u,180);break;
 case 22:assert(z<90);eq(Math.abs(Math.cos(z*Math.PI/180)),Math.abs(Math.cos(2*u*Math.PI/180)));break;
 case 25:eq(z/w,(u+v)/2);break;
 case 27:eq(z*z,8*u*u*v);break;
 case 28:eq(z+v,u+w);break;
 case 29:eq(z*Math.min(v,w),u);break;
 case 31:case 58:eq(z+2*Math.min(u,v),u+v);break;
 case 32:case 34:eq(2*(180-z),u);assert(g===32?z<90:z>90);break;
 case 35:eq(z,t.imageData[0].diagonals.reduce((a,x)=>a*x,1)/2);break;
 case 36:eq(z,Math.max(u+v,180-u-v));break;
 case 37:eq(z*Math.max(v,w),u);break;
 case 38:eq(z/2,u);break;
 case 40:eq(z/(v+w)*2,Math.tan(u*Math.PI/180));break;
 case 42:case 64:{const tangent=g===42?Number(t.imageData[0].value):v;const secondDiagonal=2*z/u;eq(secondDiagonal/u,tangent);break;}
 case 44:{const x=Math.min(u,v),y=Math.max(u,v);eq(z+(z-x)+y,180);assert(z<90&&z>x);break;}
 case 46:eq(z+u+u/2,180);break;
 case 47:eq(z+v,u);break;
 case 49:case 70:eq(z+v+u,180);break;
 case 48:case 56:case 69:case 72:{const r2=g===48?u*u:g===56?u*u*v:g===69?u/(v*v):u;eq(z+z/4,r2);break;}
 case 82:{
   // Reconstruct both bases from candidate intersection height, then all original constraints.
   const sum=u/2,h=2*v/sum,small=sum*z/h,big=sum-small,x=(big-small)/2,leg=Math.hypot(x,h);
   assert(small>0&&small<big&&z<h/2);eq(sum+2*leg,u);eq(sum*h/2,v);eq(sum,2*leg);
   const O=[big/2,h-z],C=[(big+small)/2,h];eq(O[0]*C[1],O[1]*C[0]);break;
 }
 case 83:{
   // Infer the unknown base from the candidate area; independently reconstruct the trapezoid.
   const ad=2*z/u-w,q=ad-w,B=[0,u],C=[w,u],D=[ad,0],M=[0,u/2];
   eq(Math.hypot(C[0]-D[0],C[1]-D[1]),v);
   const distance=Math.abs((C[0]-D[0])*(M[1]-D[1])-(C[1]-D[1])*(M[0]-D[0]))/v;
   eq(distance,M[1]);assert(ad>w&&q>0);break;
 }
 default:throw Error('Unhandled numeric group '+g);
 }
 assert(z>0,'Nonpositive length/angle');
}

function auditQuadrilaterals(task,source,record){
 const pin=pins[task.id];assert.ok(pin,'Unreviewed quadrilateral');
 assert.equal(pin.sourceHash,source.sourceHash);assert.equal(source.model.group,pin.group);assert.deepEqual(source.model.imageData,pin.imageData);
 assert.equal(source.url,'https://math-oge.sdamgia.ru/problem?id='+pin.externalSourceId);assert.equal(source.externalSnapshotSha256,pin.externalSnapshotSha256);
 if(!checkedSnapshots.has(source.externalSnapshot)){assert.equal(createHash('sha256').update(fs.readFileSync(source.externalSnapshot)).digest('hex'),pin.externalSnapshotSha256);checkedSnapshots.add(source.externalSnapshot);}
 assert.ok(record.solution.length>=400 && record.solution.endsWith('Ответ: '+record.answer+'.'));assert.ok(!/[\/<>]|undefined/.test(record.solution));
 const t={id:task.id,text:conditionText(task.fragment),imageData:pin.imageData};
 if(pin.proofSha256){assert.equal(record.answer,'Доказано');assert.match(t.text,/Докажите/);assert.equal(createHash('sha256').update(record.solution).digest('hex'),pin.proofSha256,'Changed reviewed proof');return;}
 test(t,pin.group,record.answer);
}
module.exports={auditQuadrilaterals};
