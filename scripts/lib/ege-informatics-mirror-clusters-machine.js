'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),{conditionText}=require(root+'/lib/seo-text');
const {center,isqrt,decimal}=require('./ege-informatics-recovered-clusters-machine');
const sha=b=>createHash('sha256').update(b).digest('hex');
function conditionModel(text) {
  for(const part of ['H = 6 и W = 4,5','H = 6, W = 5','количество точек не превышает 1000.',
    'количество точек не превышает 10 000.','ровно трёх','сумму абсцисс центров кластеров',
    'сумму ординат центров кластеров','минимальное расстояние между центрами различных кластеров',
    'максимальное расстояние между центрами кластеров','сумма расстояний','10 000']) assert.ok(text.includes(part),part);
  return {kind:'center-sum-minmax',decimals:7,clusters:[2,3],anomalies:[0,3],width:[4.5,5],height:6,limits:[1000,10000]};
}
function parse(text) {
  const lines=text.replace(/^\uFEFF/,'').trim().split(/\r?\n/);assert.deepEqual(lines.shift().trim().split(/\s+/),['X','Y']);
  return lines.filter(s=>s.trim()).map((s,i)=>{
    const raw=s.replaceAll(',','.').trim().split(/\s+/);assert.equal(raw.length,2);
    raw.forEach(v=>{assert.match(v,/^-?\d+(?:\.\d{1,7})?$/);assert.ok(Number.isFinite(Number(v)));});
    return {index:i+1,x:Number(raw[0]),y:Number(raw[1]),raw,class:null};
  });
}
function partition(rows,boxes,model,k) {
  assert.equal(boxes.length,model.clusters[k]);
  for(const b of boxes){assert.equal(b.length,4);assert.ok(b.every(Number.isFinite));assert.equal(b[1]-b[0],model.width[k]);assert.equal(b[3]-b[2],model.height);}
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
    const a=boxes[i],b=boxes[j];assert.ok(a[1]<b[0]||b[1]<a[0]||a[3]<b[2]||b[3]<a[2],'overlapping rectangles');
  }
  const groups=boxes.map(()=>[]),omitted=[];
  for(const r of rows){
    const hits=boxes.map((b,i)=>b[0]<r.x&&r.x<b[1]&&b[2]<r.y&&r.y<b[3]?i:-1).filter(i=>i>=0);
    assert.ok(hits.length<=1);if(hits.length)groups[hits[0]].push(r);else omitted.push(r);
  }
  assert.equal(omitted.length,model.anomalies[k]);assert.ok(groups.every(g=>g.length));
  for(const a of omitted)for(const b of rows)if(a!==b)assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>Math.hypot(model.width[k],model.height),'not an isolated anomaly');
  return {groups,omitted};
}
function squared(a,b){const d=[0,1].map(k=>decimal(a.raw[k],7)-decimal(b.raw[k],7));return d[0]**2n+d[1]**2n;}
function solve(texts,model,boxes) {
  assert.equal(model.kind,'center-sum-minmax');assert.equal(texts.length,2);assert.equal(boxes.length,2);
  const results=texts.map((text,k)=>{
    const rows=parse(text);assert.ok(rows.length&&rows.length<=model.limits[k]);
    const {groups,omitted}=partition(rows,boxes[k],model,k),centers=groups.map(center);
    const clusters=groups.map((g,i)=>({count:g.length,indices:g.map(r=>r.index),centerIndex:centers[i].point.index,center:centers[i].point.raw,runnerUp:centers[i].runnerUp}));
    let answer,pairs;
    if(k===0)answer=[0,1].map(axis=>{const n=centers.reduce((s,c)=>s+decimal(c.point.raw[axis],7),0n)/1000n;return Number(n<0n?-n:n);});
    else{
      pairs=[];for(let i=0;i<3;i++)for(let j=i+1;j<3;j++){const sq=squared(centers[i].point,centers[j].point);pairs.push({clusters:[i+1,j+1],squaredScaledDistance:sq.toString(),scaledFloor:Number(isqrt(sq)/1000n)});}
      pairs.sort((a,b)=>BigInt(a.squaredScaledDistance)<BigInt(b.squaredScaledDistance)?-1:1);answer=[pairs[0].scaledFloor,pairs.at(-1).scaledFloor];
    }
    return {rows:rows.length,clusters,anomalyIndices:omitted.map(r=>r.index),answer,...(pairs?{pairs}:{})};
  });
  return {answer:results.flatMap(r=>r.answer).join(' '),files:results};
}
const cache=new Map();
function compute(task,data,readFile=fs.readFileSync) {
  const text=conditionText(task.fragment);assert.equal(text,data.condition);assert.deepEqual(conditionModel(text),data.model);
  const urls=[...task.fragment.matchAll(/class="fipi-attachment" href="([^"]+)"/g)].map(m=>m[1]);assert.deepEqual(urls,[data.url]);
  const file=path.resolve(root,data.url.slice(1).replace(/^fipi\//,'fipi-assets/'));assert.ok(file.startsWith(root+'/fipi-assets/ege-informatics/'));
  const bytes=readFile(file);assert.equal(sha(bytes),data.fileSha256);
  const key=JSON.stringify([data.fileSha256,data.model,data.boxes,data.members]);let result=cache.get(key);
  if(!result){
    const py='import sys,io,zipfile,json,hashlib\nz=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read()))\nassert z.testzip() is None\nprint(json.dumps([{ "name":n,"sha256":hashlib.sha256(z.read(n)).hexdigest(),"text":z.read(n).decode("utf-8-sig") if n.endswith(".txt") else None} for n in z.namelist()]))';
    const child=spawnSync('python3',['-c',py],{input:bytes,maxBuffer:2000000});assert.equal(child.status,0,String(child.stderr));
    const files=JSON.parse(child.stdout);assert.deepEqual(files.map(({name,sha256})=>({name,sha256})),data.members);
    const texts=['A','B'].map(letter=>{const selected=files.filter(f=>f.name.endsWith('_'+letter+'.txt'));assert.equal(selected.length,1);return selected[0].text;});
    result=solve(texts,data.model,data.boxes);cache.set(key,result);
  }
  assert.deepEqual(result,data.result);return result;
}
module.exports={conditionModel,parse,partition,solve,compute};
