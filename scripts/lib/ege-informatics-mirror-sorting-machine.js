'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{conditionText}=require('../../lib/seo-text');
const root=path.resolve(__dirname,'../..');
function model(text){
 if(text.includes('перед ними все кресла'))return {family:'prefix-pair',largest:text.includes('наибольшими номерами')};
 if(text.includes('между двумя последними мероприятиями'))return {family:'events',gap:true};
 if(text.includes('самое позднее время окончания'))return {family:'events',gap:false};
 if(text.includes('материалов двух видов'))return {family:'coloured-boxes'};
 if(text.includes('кубических коробок')){const g=text.match(/хотя бы на (\d+) единиц/u);assert(g);return {family:'boxes',gap:Number(g[1])};}
 if(text.includes('студенты сдают')){assert(text.includes('более двух «двоек»'));return {family:'students'};}
 if(text.includes('транспортную компанию'))return {family:'cargo'};
 if(text.includes('отряд космонавтов'))return {family:'astronauts'};
 if(text.includes('слева и справа от них'))return {family:'bounded-pair'};
 if(text.includes('рейтинг продуктов'))return {family:'products',above:text.includes('более высокие места')};
 if(text.includes('идущих подряд кресел'))return {family:'free-run',seat:text.includes('наименьший номер места')};
 if(text.includes('грузовом судне'))return {family:'ship'};
 throw Error('unrecognized sorting condition');
}
function validate(h,a,m){
 const family=m.family;assert(h.length>0&&a.length>0);assert(h.every(x=>Number.isSafeInteger(x)&&x>0));assert(a.every(row=>row.every(x=>Number.isSafeInteger(x)&&x>=0)));
 const width=['students','astronauts'].includes(family)?5:['boxes','ship','cargo'].includes(family)?1:2;assert(a.every(row=>row.length===width));
 assert.equal(a.length,family==='cargo'?h[0]+h[1]:family==='ship'?h[1]:h[0]);
 if(['prefix-pair','free-run'].includes(family)){assert.equal(h.length,3);assert(h[0]<=10000&&h[1]<=100000&&h[2]<=100000);assert(a.every(([r,c])=>r>0&&r<=h[1]&&c>0&&c<=h[2]));}
 if(family==='bounded-pair'){assert.equal(h.length,1);assert(h[0]<=10000&&a.every(row=>row.every(v=>v>0&&v<=100000)));}
 if(family==='events'){assert.equal(h.length,1);assert(h[0]<=1000&&a.every(([s,e])=>s>0&&s<e&&e<=1440));}
 if(family==='boxes'){assert.equal(h.length,1);assert(h[0]<=10000&&a.every(([s])=>s>0&&s<=10000));assert(Number.isInteger(m.gap)&&m.gap>0);}
 if(family==='coloured-boxes'){assert.equal(h.length,2);assert(h[0]<100000&&h[1]<10000&&a.every(([s,c])=>s>0&&s<=10000&&(c===0||c===1)));}
 if(['students','astronauts'].includes(family)){assert(h[0]<=10000);assert.equal(new Set(a.map(x=>x[0])).size,a.length);assert(a.every(x=>x[0]>0&&x[0]<=100000));}
 if(family==='students'){assert.equal(h.length,1);assert.equal(h[0]%4,0);assert(a.every(x=>x.slice(1).every(v=>v>=2&&v<=5)));assert(a.filter(x=>!x.slice(1).includes(2)).length>=h[0]/4);assert(a.some(x=>x.slice(1).filter(v=>v===2).length>2));}
 if(family==='astronauts'){assert.equal(h.length,2);assert(h[1]<=10000&&a.every(x=>x.slice(1,4).every(v=>v<=100)&&x[4]<=10));}
 if(family==='products'){assert.equal(h.length,1);assert(h[0]<=1000&&a.every(x=>x.every(v=>v>0)));assert.equal(new Set(a.flat()).size,2*h[0]);}
 if(family==='cargo'){assert.equal(h.length,2);assert(h.every(x=>x<=1000)&&a.every(([w])=>w>0));}
 if(family==='ship'){assert.equal(h.length,2);assert(h[0]<=100000&&h[1]<=10000&&a.every(([w])=>w>0&&w<=100));}
}
function solve(h,a,m){let answer;
 if(m.family==='prefix-pair') {
  const limits=new Array(h[2]-1).fill(h[1]);
  for(const [row,col] of a)for(const left of [col-1,col])if(left>=1&&left<h[2])limits[left-1]=Math.min(limits[left-1],row-1);
  const row=Math.max(...limits); const index=m.largest?limits.lastIndexOf(row):limits.indexOf(row);answer=[row,index+1+(m.largest?1:0)];
 } else if(m.family==='bounded-pair') {
  const occupied=new Set(a.map(x=>x.join(',')));let row=-1,seat=Infinity;
  for(const [r,c] of a)if(occupied.has([r,c+3].join(','))&&!occupied.has([r,c+1].join(','))&&!occupied.has([r,c+2].join(','))) {
   if(r>row||r===row&&c+1<seat){row=r;seat=c+1;}
  }
  answer=[row,seat];
 } else if(m.family==='free-run') {
  const cols=Array.from({length:h[2]+1},()=>[]);for(const [r,c]of a)cols[c].push(r);
  for(let c=1;c<=h[2];c++)cols[c]=[0,...new Set(cols[c].sort((x,y)=>x-y)),h[1]+1];
  const feasible=length=>cols.some((v,c)=>c&&v.some((end,i)=>i&&end-v[i-1]-1>=length));
  let low=1,high=h[1];while(low<high){const middle=Math.ceil((low+high)/2);if(feasible(middle))low=middle;else high=middle-1;}
  let row=Infinity,seat=Infinity;for(let c=1;c<=h[2];c++)for(let j=1;j<cols[c].length;j++)if(cols[c][j]-cols[c][j-1]-1>=low){const x=cols[c][j-1]+low;if(x<row||x===row&&c<seat){row=x;seat=c;}}
  answer=[row,m.seat?seat:low-1];
 } else if(m.family==='events') {
  const dp=new Int32Array(1441),ends=Array.from({length:1441},()=>[]);for(const [s,e] of a)ends[e].push(s);
  for(let t=1;t<=1440;t++){dp[t]=dp[t-1];for(const s of ends[t])dp[t]=Math.max(dp[t],dp[s]+1);}
  const k=dp[1440];let secondary=-1;
  for(const [s,e] of a)for(let t=0;t<=s;t++)if(dp[t]===k-1)secondary=Math.max(secondary,m.gap?s-t:e);
  answer=[k,secondary];
 } else if(m.family==='boxes'||m.family==='coloured-boxes') {
  if(m.family==='boxes'){
   const sizes=a.map(x=>x[0]).sort((x,y)=>y-x);let last=Infinity,count=0;
   for(const size of sizes)if(last-size>=m.gap){last=size;count++;}answer=[count,last];
  }else{
   const sets=[new Set(),new Set()];let limit=0;for(const [size,c]of a){sets[c].add(size);limit=Math.max(limit,size);}
   const best=[new Int32Array(limit+h[1]+2),new Int32Array(limit+h[1]+2)];let count=0,inner=0;
   for(let size=limit;size>=1;size--)for(let c=0;c<=1;c++){
    best[c][size]=best[c][size+1];if(sets[c].has(size)){const length=1+best[1-c][size+h[1]];best[c][size]=Math.max(best[c][size],length);if(length>count||length===count&&size>inner){count=length;inner=size;}}
   }answer=[count,inner];
  }
 } else if(m.family==='students') {
  const groups=Array.from({length:5},()=>[]);for(const row of a)groups[row.slice(1).filter(x=>x===2).length].push(row);
  groups[0].sort((x,y)=>y.slice(1).reduce((s,v)=>s+v,0)-x.slice(1).reduce((s,v)=>s+v,0)||x[0]-y[0]);
  for(let i=1;i<=4;i++)groups[i].sort((x,y)=>x[0]-y[0]);
  answer=[groups[0][h[0]/4-1][0],groups.slice((m.failures??2)+1).flat()[0][0]];
 } else if(m.family==='cargo') {
  const weights=a.slice(0,h[0]).map(x=>x[0]).sort((x,y)=>x-y),caps=a.slice(h[0]).map(x=>x[0]).sort((x,y)=>x-y);
  let k=0;for(const cap of caps)if(k<weights.length&&weights[k]<=cap)k++;
  const biggest=weights.filter(w=>w<=caps.at(-1)).at(-1),remaining=weights.slice();remaining.splice(remaining.lastIndexOf(biggest),1);
  let forced=0;for(const cap of caps.slice(0,-1))if(forced<remaining.length&&remaining[forced]<=cap)forced++;
  assert.equal(forced+1,k);answer=[k,biggest];
 } else if(m.family==='astronauts') {
  const scores=new Map();for(const row of a){const s=row.slice(1).reduce((x,y)=>x+y,0);if(!scores.has(s))scores.set(s,[]);scores.get(s).push(row);}
  let filled=0,pass,semi=0;for(let s=310;s>=0;s--){const g=scores.get(s)||[];if(!g.length)continue;if(filled+g.length<=h[1]){filled+=g.length;pass=g;}else{if(filled<h[1])semi=g.length;break;}}
  pass.sort((x,y)=>x[4]-y[4]||y[0]-x[0]);answer=[pass[0][0],semi];
 } else if(m.family==='products') {
  const products=a.map((v,i)=>({id:i+1,value:Math.min(...v),left:v[0]<v[1]})).sort((x,y)=>x.value-y.value);
  const last=products.at(-1),before=products.slice(0,-1).filter(x=>x.left).length,after=products.length-1-before;
  answer=[last.id,m.above?before:after];
 } else if(m.family==='ship') {
  const freq=new Int32Array(101);for(const [w]of a)freq[w]++;
  const count=(capacity,forced)=>{let n=0;for(let w=1;w<=100;w++){const take=Math.min(freq[w]-(w===forced?1:0),Math.floor(capacity/w));n+=take;capacity-=take*w;}return n;};
  const k=count(h[0],0);let heavy=0;for(let w=1;w<=100;w++)if(freq[w]&&w<=h[0]&&count(h[0]-w,w)+1===k)heavy=w;
  answer=[k,heavy];
 } else throw Error(m.family);
 return answer;
}
const caches=new WeakMap();
function compute(task,data,readFile=fs.readFileSync){
 const text=conditionText(task.fragment);assert.equal(text,data.condition,'changed condition');const m=model(text);assert.deepEqual(m,data.model,'changed model');
 const links=[...task.fragment.matchAll(/href=["'](\/fipi\/ege-informatics\/docs\/restored-sorting\/EGEINF[A-F\d]{6}\.txt)["']/g)].map(x=>x[1]);assert.deepEqual(links,[data.url]);
 const file=path.resolve(root,'fipi-assets',data.url.slice('/fipi/'.length));assert(file.startsWith(root+'/fipi-assets/ege-informatics/docs/restored-sorting/'));
 const bytes=readFile(file),sha=createHash('sha256').update(bytes).digest('hex');assert.equal(sha,data.fileSha256,'changed file');let cache=caches.get(readFile);if(!cache){cache=new Map();caches.set(readFile,cache);}const key=JSON.stringify([sha,m]);let result=cache.get(key);
 if(!result){const raw=bytes.toString('utf8').replace(/^\uFEFF/u,'').trim();assert.match(raw,/^\d+(?:\s+\d+)*$/u);const rows=raw.split(/\r?\n/u).map(x=>x.trim().split(/\s+/u).map(Number)),header=rows.shift();validate(header,rows,m);const answer=solve(header,rows,m);assert(answer.length===2&&answer.every(Number.isSafeInteger));result={answer:answer.join(' '),header,rows:rows.length,fileSha256:sha};cache.set(key,result);}
 assert.deepEqual(result,data.result,'changed result');return result;
}
module.exports={model,validate,solve,compute};
