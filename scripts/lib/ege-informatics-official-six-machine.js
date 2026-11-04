'use strict';
const assert=require('node:assert/strict');
const SCALE=1e6;
function parseStars(text){return text.trim().split(/\r?\n/).map((line,i)=>{const cols=line.trim().split(/\s+/);assert.equal(cols.length,3);const [x,y,code]=cols;assert.match(code,/^(?:[OBAFGKM][0-9](?:I|II|III|IV|V|VI)|VII)$/);const micro=s=>{assert.match(s,/^-?\d+[,.]\d{6}$/);return Number(s.replace(/[,.]/,''));};return {index:i+1,x:micro(x),y:micro(y),code,type:code==='VII'?'VII':code[0]+code.slice(2)};});}
function squared(a,b){const q=(a.x-b.x)**2+(a.y-b.y)**2;assert.ok(Number.isSafeInteger(q));return q;}
function scaledDistance(q){assert.ok(Number.isSafeInteger(q)&&q>=0);const n=BigInt(q);let lo=0n,hi=n+1n;while(hi-lo>1n){const mid=(lo+hi)/2n;if(mid*mid<=n)lo=mid;else hi=mid;}return Number(lo/100n);}
function split(points,part,kind){const groups=Array.from({length:part==='A'?2:3},()=>[]);for(const p of points){const g=part==='A'?(p.y<14*SCALE?0:1):kind==='nearest'?(p.x>16*SCALE?2:p.y<30*SCALE?0:1):(p.x>21*SCALE?2:p.y<23*SCALE?0:1);groups[g].push(p);}assert.ok(groups.every(g=>g.length>1));return groups;}
function medoid(group){const sums=Array(group.length).fill(0);for(let i=0;i<group.length;i++)for(let j=i+1;j<group.length;j++){const d=Math.sqrt(squared(group[i],group[j]));sums[i]+=d;sums[j]+=d;}const order=group.map((_,i)=>i).sort((a,b)=>sums[a]-sums[b]);assert.ok(sums[order[1]]-sums[order[0]]>0.001,'nonunique/unstable center');return group[order[0]];}
function proveRectangles(groups,rectangles){assert.equal(groups.length,rectangles.length);for(let k=0;k<groups.length;k++){const [x0,x1,y0,y1]=rectangles[k];assert.equal(x1-x0,5500000);assert.equal(y1-y0,6000000);assert.ok(rectangles[k].every(Number.isSafeInteger));assert.ok(groups[k].every(p=>x0<=p.x&&p.x<=x1&&y0<=p.y&&p.y<=y1));}for(let i=0;i<groups.length;i++)for(let j=0;j<i;j++){const a=rectangles[i],b=rectangles[j];assert.ok(a[1]<b[0]||b[1]<a[0]||a[3]<b[2]||b[3]<a[2],'overlapping rectangles');}}
function uniqueExtreme(values,max){const value=(max?Math.max:Math.min)(...values);assert.equal(values.filter(v=>v===value).length,1,'ambiguous selected cluster');return values.indexOf(value);}
function solveStars(A,B,spec){const groupsA=split(A,'A',spec.kind),groupsB=split(B,'B',spec.kind),ca=groupsA.map(medoid),cb=groupsB.map(medoid);const aSizes=groupsA.map(g=>g.length),bCounts=groupsB.map(g=>g.filter(p=>p.type===spec.bCountType).length);let answer,detail={aSizes,bCounts};
 if(spec.kind==='nearest'){
  const ai=uniqueExtreme(aSizes,true),eligible=groupsA[ai].filter(p=>p.type===spec.aType).sort((p,q)=>squared(p,ca[ai])-squared(q,ca[ai]));assert.ok(eligible.length>1);assert.ok(squared(eligible[0],ca[ai])<squared(eligible[1],ca[ai]));const selected=eligible[0];const lo=uniqueExtreme(bCounts,false),hi=uniqueExtreme(bCounts,true),between=squared(cb[lo],cb[hi]);let diameter=null;
  groupsB.forEach((g,cluster)=>{const stars=g.filter(p=>p.type===spec.bType);for(let i=0;i<stars.length;i++)for(let j=i+1;j<stars.length;j++){const q=squared(stars[i],stars[j]);if(diameter===null||q>diameter.squared)diameter={squared:q,cluster,indices:[stars[i].index,stars[j].index]};}});assert.ok(diameter);
  answer=[Math.floor(Math.abs(selected.x)/100),Math.floor(Math.abs(selected.y)/100),scaledDistance(between),scaledDistance(diameter.squared)];Object.assign(detail,{aCluster:ai,aSelected:selected,aDistanceSquared:squared(selected,ca[ai]),bMinCluster:lo,bMaxCluster:hi,bBetweenSquared:between,bDiameter:diameter});
 }else{
  assert.equal(spec.kind,'radius');assert.ok(['min','max'].includes(spec.extreme));const ai=uniqueExtreme(aSizes,false),selected=groupsA[ai].filter(p=>p.type===spec.aType&&squared(p,ca[ai])<=spec.radius**2).map(p=>p.index);const between=squared(ca[0],ca[1]);let extreme=null;
  groupsB.forEach((g,cluster)=>{for(const p of g.filter(p=>p.type===spec.bType)){const q=squared(p,cb[cluster]);if(extreme===null||(spec.extreme==='min'?q<extreme.squared:q>extreme.squared))extreme={squared:q,cluster,index:p.index};}});assert.ok(extreme);
  answer=[selected.length,scaledDistance(between),scaledDistance(extreme.squared),Math.max(...bCounts)];Object.assign(detail,{aCluster:ai,aSelectedIndices:selected,aBetweenSquared:between,bExtreme:extreme,bMaxCountClusters:bCounts.flatMap((c,i)=>c===Math.max(...bCounts)?[i]:[])});
 }
 return {answer:answer.join(' '),detail,groups:[groupsA,groupsB],centers:[ca,cb]};
}
function processTimeline(processes){const by=new Map(processes.map(p=>[p.id,p]));assert.equal(by.size,processes.length);for(const p of processes){assert.ok(Number.isSafeInteger(p.id)&&Number.isSafeInteger(p.duration)&&p.duration>0);assert.equal(p.depends.length,new Set(p.depends).size);for(const dep of p.depends)assert.ok(by.has(dep)&&dep!==p.id);}
 const pending=new Set(by.keys()),running=new Map(),finished=new Set(),starts={},ends={},ticks=[];let time=0;const bound=processes.reduce((n,p)=>n+p.duration,0);
 while(pending.size||running.size){for(const id of [...pending]){const p=by.get(id);if(p.depends.every(d=>finished.has(d))){pending.delete(id);running.set(id,p.duration);starts[id]=time;}}assert.ok(running.size,'cycle');ticks.push([...running.keys()].sort((a,b)=>a-b));time++;assert.ok(time<=bound);for(const [id,left] of [...running])if(left===1){running.delete(id);finished.add(id);ends[id]=time;}else running.set(id,left-1);}
 return {starts,ends,ticks};
}
module.exports={parseStars,squared,scaledDistance,split,medoid,proveRectangles,solveStars,processTimeline};
