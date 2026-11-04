'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {conditionText,seoPlainText}=require('../../lib/seo-text');
function primaryUrls(task){
 const html=task.fragment.split('КЭС:')[0];
 return [...html.matchAll(/<img\b[^>]*src=["']([^"']+)["']|ShowPictureQ\('([^']+)'/gu)].map(m=>m[1]||'/fipi/ege-informatics/'+m[2]);
}
function auditPrimaryImage(task,source,root){
 const review=source.primaryImageReview;assert.ok(review?.reviewed);
 assert.deepEqual(review.files.map(f=>f.src),primaryUrls(task));
 assert.equal(review.files.length,review.transcriptions.length);
 review.files.forEach((f,i)=>{
  assert.ok(f.src.startsWith('/fipi/ege-informatics/'));
  const local=path.resolve(root,'fipi-assets',decodeURIComponent(f.src.slice(6)));
  assert.ok(local.startsWith(path.resolve(root,'fipi-assets/ege-informatics')+path.sep));
  assert.equal(createHash('sha256').update(fs.readFileSync(local)).digest('hex'),f.sha256,'changed primary image');
  assert.equal(review.transcriptions[i].imageSha256,f.sha256);
  assert.ok(review.transcriptions[i].reviewed);
 });
}
function tables(html){
 const stack=[],leaf=[];
 for(const m of html.matchAll(/<\/?table\b[^>]*>/giu)){
  if(!/^<\//u.test(m[0])){if(stack.length)stack.at(-1).child=true;stack.push({start:m.index+m[0].length,child:false});}
  else{const t=stack.pop();if(t&&!t.child)leaf.push(html.slice(t.start,m.index));}
 }
 const out=[];
 for(const h of leaf){
  const rows=[...h.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/giu)].map(r=>[...r[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/giu)].map(c=>seoPlainText(c[1]).replace(/\s+/gu,'').replace(/[АВСЕ]/gu,c=>({'А':'A','В':'B','С':'C','Е':'E'}[c]))));
  // Infer width from the labelled final row, then validate all labelled rows.
  const last=rows.at(-1);if(!last)continue;
  const label=last[0];let n=/^(?:П)?\d+$/u.test(label)?Number(label.replace('П','')):/^[D-Z]$/u.test(label)?label.charCodeAt(0)-64:0;
  if(n<4||n>10||last.length!==n+1)continue;
  const body=rows.slice(-n),labels=[],matrix=[];
  for(let i=0;i<n;i++){
   const row=body[i],cells=row.slice(-n),l=row.at(-n-1);
   if(!new RegExp(`^(?:П?${i+1}|${String.fromCharCode(65+i)})$`,'u').test(l)||!cells.every(c=>/^(?:\d+|\*|)$/u.test(c)))break;
   labels.push(l);matrix.push(cells.map(c=>c==='*'?1:Number(c)));
  }
  if(matrix.length===n){assert.ok(matrix.every((r,i)=>r[i]===0));out.push({labels,matrix});}
 }
 return out;
}
function graph(row){const labels=[...new Set(row.edges.flatMap(e=>e.slice(0,2)))].sort(),matrix=labels.map(()=>labels.map(()=>0));for(const [a,b,w=1] of row.edges){const i=labels.indexOf(a),j=labels.indexOf(b);matrix[i][j]=w;if(row.kind!=='directed-graph')matrix[j][i]=w;}for(const [a,b,w] of row.reverseOverrides||[])matrix[labels.indexOf(a)][labels.indexOf(b)]=w;return {labels,matrix};}
function floyd(m){const d=m.map((r,i)=>r.map((w,j)=>i===j?0:w||Infinity));for(let k=0;k<m.length;k++)for(let i=0;i<m.length;i++)for(let j=0;j<m.length;j++)d[i][j]=Math.min(d[i][j],d[i][k]+d[k][j]);return d;}
function longest(g,start){const {labels:v,matrix:m}=g,indegree=v.map((_,j)=>m.reduce((s,r)=>s+Number(!!r[j]),0)),queue=v.map((_,i)=>i).filter(i=>!indegree[i]),order=[],dist=v.map(()=>-Infinity),counts=v.map(()=>0);dist[v.indexOf(start)]=0;counts[v.indexOf(start)]=1;
 while(queue.length){const i=queue.shift();order.push(i);for(let j=0;j<v.length;j++)if(m[i][j]){dist[j]=Math.max(dist[j],dist[i]+1);counts[j]+=counts[i];if(!--indegree[j])queue.push(j);}}
 assert.equal(order.length,v.length,'DAG');return {order:order.map(i=>v[i]),dist:Object.fromEntries(v.map((x,i)=>[x,dist[i]])),pathCounts:Object.fromEntries(v.map((x,i)=>[x,counts[i]]))};}
function permutations(n,visit){const p=Array(n).fill(0),used=Array(n).fill(false);function rec(k){if(k===n){visit(p);return;}for(let i=0;i<n;i++)if(!used[i]){used[i]=true;p[k]=i;rec(k+1);used[i]=false;}}rec(0);}

function compute(task,data){
 const id=task.id,text=conditionText(task.fragment),rows=data.graphs,ts=tables(task.fragment);assert.deepEqual(ts,data.tables.map(({labels,matrix})=>({labels,matrix})),id+' primary table');const rec={id};
 if(rows.length===1&&rows[0].kind==='graph'){
  const g=graph(rows[0]),t=ts[0],maps=[];assert.equal(g.labels.length,t.labels.length);const n=g.labels.length;
  permutations(n,p=>{for(let i=0;i<n;i++)for(let j=0;j<n;j++)if(Boolean(g.matrix[i][j])!==Boolean(t.matrix[p[i]][p[j]]))return;maps.push(Object.fromEntries(g.labels.map((v,i)=>[v,t.labels[p[i]]])));});assert.ok(maps.length,id);
  const pairs=[...text.matchAll(/из пункта ([A-ZА-Я]) в пункт ([A-ZА-Я])/gu)].map(m=>[m[1],m[2]]);const shared=text.match(/из пункта ([A-ZА-Я]) в пункты ([A-ZА-Я]) и ([A-ZА-Я])/u);if(shared)pairs.push([shared[1],shared[2]],[shared[1],shared[3]]);
  let values;if(pairs.length)values=maps.map(mp=>String(pairs.reduce((s,[a,b])=>{const w=t.matrix[t.labels.indexOf(mp[a])][t.labels.indexOf(mp[b])];assert.ok(w);return s+w;},0)));
  else{const ordered=text.match(/сначала для пункта ([A-ZА-Я]), затем для пункта ([A-ZА-Я])/u),q=ordered||text.match(/населённым пунктам ([A-ZА-Я]) и ([A-ZА-Я]) на схеме/u);assert.ok(q,id);values=maps.map(mp=>{let v=[q[1],q[2]].map(x=>Number(mp[x].replace(/\D/gu,'')));if(!ordered)v.sort((a,b)=>a-b);return v.join('');});}
  assert.equal(new Set(values).size,1,id);rec.answer=values[0];rec.mappings=maps;
 }else if(rows.length===1&&rows[0].kind.startsWith('weighted-table')){
  const g=graph(rows[0]),d=floyd(g.matrix),q=text.match(/между пунктами ([A-Z]) и ([A-Z]) \(при условии/u);assert.ok(q,id);const distance=d[g.labels.indexOf(q[1])][g.labels.indexOf(q[2])],choices=[...text.matchAll(/[1-4]\) (\d+)/gu)].map(m=>Number(m[1]));assert.equal(choices.filter(x=>x===distance).length,1,id);rec.answer=String(choices.indexOf(distance)+1);rec.distance=distance;rec.allPairs=d;rec.vertices=g.labels;
 }else if(rows.length===1&&rows[0].kind==='directed-graph'){
  const q=text.match(/из города ([А-Я]) в город ([А-Я])/u);assert.ok(q,id);const data=longest(graph(rows[0]),q[1]);Object.assign(rec,data,{answer:String(data.dist[q[2]])});
 }else if(rows.length===4&&rows.every(r=>r.kind==='weighted-choice')){
  const t=ts[0],ok=[];rows.sort((a,b)=>a.group-b.group).forEach((r,k)=>{const g=graph(r);if(t.labels.every((a,i)=>t.labels.every((b,j)=>t.matrix[i][j]===g.matrix[g.labels.indexOf(a)][g.labels.indexOf(b)])))ok.push(k+1);});assert.equal(ok.length,1,id);rec.answer=String(ok[0]);
 }else if(id==='EGEINF2F4C39'){
  const minima=ts.map(t=>floyd(t.matrix)[t.labels.indexOf('A')][t.labels.indexOf('B')]);const ok=minima.flatMap((v,i)=>v<=6?[i+1]:[]);assert.equal(ok.length,1);rec.answer=String(ok[0]);rec.minima=minima;
 }else throw Error(id+' unsupported');

 validateFacts(rec,data);return rec;
}
function validateFacts(rec,data){
 const f=data.facts,g=data.graphs.length===1?graph(data.graphs[0]):null;
 if(rec.mappings){
  const t=data.tables[0],n=g.labels.length;
  assert.ok(t.matrix.every((r,i)=>r.every((w,j)=>w===t.matrix[j][i])),'symmetric table');
  const matrices=[g.matrix,t.matrix],rf=data.refinement;
  let colors=matrices.map(m=>m.map(row=>row.filter(Boolean).length)),last;
  for(const step of rf.steps){
   const sig=matrices.map((m,k)=>m.map((row,i)=>JSON.stringify([colors[k][i],row.flatMap((w,j)=>w?[colors[k][j]]:[]).sort((a,b)=>a-b)])));
   const keys=[...new Set(sig.flat())].sort();colors=sig.map(row=>row.map(s=>keys.indexOf(s)));
   last=Object.fromEntries(g.labels.map((v,i)=>[v,t.labels.filter((_,j)=>colors[0][i]===colors[1][j])]));assert.deepEqual(last,step,'refinement step');
  }
  assert.ok(last);const groups=rf.groups;assert.deepEqual(groups.flatMap(x=>x[0]).sort(),[...g.labels].sort());assert.deepEqual(groups.flatMap(x=>x[1]).sort(),[...t.labels].sort());
  for(const [a,b] of groups)for(const v of a)assert.deepEqual([...b].sort(),[...last[v]].sort());
  const factorial=n=>n<2?1:n*factorial(n-1),count=groups.reduce((s,[a])=>s*factorial(a.length),1);
  assert.equal(f.variants.length,count);const valid=[],unique=new Set();
  for(const item of f.variants){
   const mp=item.mapping;assert.deepEqual(Object.keys(mp).sort(),[...g.labels].sort());assert.equal(new Set(Object.values(mp)).size,n);
   for(const v of g.labels)assert.ok(last[v].includes(mp[v]));const key=JSON.stringify(mp);assert.ok(!unique.has(key));unique.add(key);
   let bad=null;for(let i=0;i<n&&!bad;i++)for(let j=i+1;j<n;j++)if(Boolean(g.matrix[i][j])!==Boolean(t.matrix[t.labels.indexOf(mp[g.labels[i]])][t.labels.indexOf(mp[g.labels[j]])])){bad=[g.labels[i],g.labels[j]];break;}
   assert.deepEqual(item.conflict,bad,'excluded mapping conflict');if(!bad)valid.push(mp);
  }
  const normalized=maps=>maps.map(mp=>JSON.stringify(Object.fromEntries(g.labels.map(v=>[v,mp[v]])))).sort();assert.deepEqual(normalized(valid),normalized(rec.mappings),'complete mappings');
 }else if(rec.distance!==undefined){
  const n=g.labels.length,m=g.matrix.map((row,i)=>row.map((w,j)=>{const a=[w,g.matrix[j][i]].filter(Boolean);return a.length?Math.min(...a):0;}));assert.deepEqual(m,f.lowerMatrix);
  const d=g.labels.map(()=>Infinity),used=new Set();d[g.labels.indexOf(data.start)]=0;
  for(const step of f.dijkstra){
   const i=g.labels.map((_,i)=>i).filter(i=>!used.has(i)).sort((a,b)=>d[a]-d[b]||g.labels[a].localeCompare(g.labels[b]))[0];assert.equal(step.vertex,g.labels[i]);used.add(i);
   for(let j=0;j<n;j++)if(m[i][j])d[j]=Math.min(d[j],d[i]+m[i][j]);assert.deepEqual(step.distances,d.map(x=>Number.isFinite(x)?x:null));
  }
  assert.equal(used.size,n);assert.deepEqual(f.distances,d);assert.equal(d[g.labels.indexOf(data.end)],rec.distance);
  for(let i=0;i<n;i++)for(let j=0;j<n;j++)if(m[i][j])assert.ok(d[j]<=d[i]+m[i][j],'distance lower bound');
  // All asymmetric-source readings and the lower positive union give the
  // same optimum. The achieving path uses only undisputed entries.
  for(const policy of ['upper','lower','minimum','maximum']){
   const alt=g.matrix.map(row=>[...row]);for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){const a=g.matrix[i][j],b=g.matrix[j][i];alt[i][j]=alt[j][i]=policy==='upper'?a:policy==='lower'?b:policy==='minimum'?Math.min(a,b):Math.max(a,b);}
   assert.equal(floyd(alt)[g.labels.indexOf(data.start)][g.labels.indexOf(data.end)],rec.distance,'source interpretation '+policy);
  }
  for(const p of data.bestPaths){assert.equal(p.path[0],data.start);assert.equal(p.path.at(-1),data.end);assert.equal(new Set(p.path).size,p.path.length);let total=0;for(let k=1;k<p.path.length;k++){const i=g.labels.indexOf(p.path[k-1]),j=g.labels.indexOf(p.path[k]);assert.ok(g.matrix[i][j]>0);assert.equal(g.matrix[i][j],g.matrix[j][i],'achieving route uses undisputed roads');total+=g.matrix[i][j];}assert.equal(total,rec.distance);}
 }else if(rec.dist){
  assert.deepEqual(f.order,rec.order);assert.deepEqual(f.longestDistances,rec.dist);
  for(const p of data.bestPaths){assert.equal(p.path[0],data.start);assert.equal(p.path.at(-1),data.end);assert.equal(new Set(p.path).size,p.path.length);for(let k=1;k<p.path.length;k++)assert.equal(g.matrix[g.labels.indexOf(p.path[k-1])][g.labels.indexOf(p.path[k])],1);assert.equal(p.path.length-1,Number(rec.answer));}
 }else if(rec.minima){
  assert.equal(f.allRoutes.length,data.tables.length);
  data.tables.forEach((t,k)=>{const routes=[];function visit(v,ps,cost){if(v==='B'){routes.push([ps,cost]);return;}t.matrix[t.labels.indexOf(v)].forEach((w,j)=>{if(w&&!ps.includes(t.labels[j]))visit(t.labels[j],[...ps,t.labels[j]],cost+w);});}visit('A',['A'],0);const norm=x=>x.map(y=>JSON.stringify(y)).sort();assert.deepEqual(norm(f.allRoutes[k]),norm(routes));assert.equal(Math.min(...routes.map(r=>r[1])),rec.minima[k]);});
 }
}
module.exports={compute,auditPrimaryImage,primaryUrls,tables,graph};
