'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const {conditionText}=require(root+'/lib/seo-text');
const hash=b=>createHash('sha256').update(b).digest('hex');
function temperature(rows){
 const values=[];
 for(const row of rows.slice(1)){
  const day=row[0].slice(0,10);if(day<'2018-04-01'||day>'2018-05-31')continue;
  for(let j=1;j<rows[0].length;j++){
   const hour=Number(rows[0][j].match(/^PT(\d+)H/)[1]);
   if(hour>=9&&hour<=12)values.push(Number(row[j]));
  }
 }
 assert.ok(values.length&&values.every(Number.isFinite));
 const total=values.reduce((a,b)=>a+b,0),maximum=Math.max(...values),difference=maximum-total/values.length;
 return {answer:String(Math.trunc(difference)),count:values.length,total,maximum,difference};
}
function robot(grid){
 const n=grid.length;assert.ok(n>1&&n<26&&grid.every(row=>row.length===n&&row.every(x=>Number.isInteger(x)&&x>=1&&x<=100)));
 const results=[];
 for(const choose of [Math.min,Math.max]){
  const table=Array.from({length:n},()=>Array(n).fill(0));
  for(let i=n-1;i>=0;i--)for(let j=n-1;j>=0;j--){
   const next=[];if(i+1<n)next.push(table[i+1][j]);if(j+1<n)next.push(table[i][j+1]);
   table[i][j]=grid[i][j]+(next.length?choose(...next):0);
  }
  results.push(table[0][0]);
 }
 return {answer:results.join(' '),size:n};
}
function document(paragraphs){
 const text=paragraphs.join('\n'),positions=[];let lower=0,upper=0;
 const word=c=>!!c&&/[\p{L}\p{N}_\-‑]/u.test(c);
 for(let i=0;i<text.length;i++)if((text.startsWith('батюшка',i)||text.startsWith('Батюшка',i))&&!word(text[i-1])&&!word(text[i+7])){positions.push(i);if(text[i]==='б')lower++;else upper++;}
 return {answer:String(positions.length),lower,upper,positions};
}
function string(s){
 assert.match(s,/^[XYZ]+$/);assert.ok(s.length<=1200000);
 let left=0,best=0,start=0,end=0,count=0;
 for(let right=0;right<s.length;right++){
  if(right>=3&&s.slice(right-3,right+1)==='XZZY'){left=right-2;count++;}
  if(right-left+1>best){best=right-left+1;start=left;end=right+1;}
 }
 return {answer:String(best),length:s.length,forbiddenCount:count,start,end,windowSha256:hash(s.slice(start,end))};
}
function containers(capacity,values){
 assert.ok(Number.isInteger(capacity)&&capacity>=1&&capacity<=100000&&values.length<=10000&&values.every(x=>Number.isInteger(x)&&x>=1&&x<=100));
 const hist=Array(101).fill(0);for(const x of values)hist[x]++;
 let used=0,count=0;
 for(let x=1;x<=100;x++){
  const take=Math.min(hist[x],Math.floor((capacity-used)/x));count+=take;used+=take*x;
  if(take<hist[x])break;
 }
 let heaviest=0;
 if(count)for(let last=1;last<=100;last++){
  if(!hist[last])continue;
  let remaining=count-1,total=last;
  for(let x=1;x<=100&&remaining;x++){
   const take=Math.min(hist[x]-(x===last?1:0),remaining);remaining-=take;total+=take*x;
  }
  if(!remaining&&total<=capacity)heaviest=last;
 }
 return {answer:count+' '+heaviest,capacity,records:values.length,smallestSum:used};
}
function triples(text,k=109){
 const iterator=text.matchAll(/[^\r\n]+/g),header=iterator.next();assert.ok(!header.done);
 const n=Number(header.value[0]);assert.ok(Number.isInteger(n)&&n>=1&&n<=1000000);
 let sum=0,loss=Infinity,count=0,witness=null,maximum=0;
 for(const [line] of iterator){
  const a=line.trim().split(/\s+/).map(Number);assert.ok(a.length===3&&a.every(x=>Number.isInteger(x)&&x>=1&&x<=12000));count++;
  const m=Math.max(...a);maximum=Math.max(maximum,m);sum+=m;
  for(const x of a)if((m-x)%k!==0&&m-x<loss){loss=m-x;witness={row:count,from:m,to:x};}
 }
 assert.equal(count,n);const answer=sum%k?sum:sum-loss;assert.ok(Number.isSafeInteger(answer)&&answer%k!==0);
 return {answer:String(answer),records:n,sum,remainder:sum%k,loss:Number.isFinite(loss)?loss:null,witness,maximum};
}
const cache=new Map();
function compute(task,data,readFile=fs.readFileSync){
 assert.equal(conditionText(task.fragment),data.condition);
 const links=[...task.fragment.matchAll(/class="fipi-attachment" href="([^"]+)"/g)].map(x=>x[1]);
 assert.deepEqual(links,data.files.map(f=>f.url));
 const files=data.files.map(f=>{
  assert.match(f.url,/^\/fipi\/ege-informatics\/restored-2021\/[\w.-]+\.(ods|odt|txt)$/);
  const filename=path.join(root,'fipi-assets',f.url.slice('/fipi/'.length));
  const bytes=readFile(filename);assert.equal(hash(bytes),f.sha256,'changed attachment');return bytes;
 });
 const key=JSON.stringify([data.mode,data.files.map(f=>f.sha256)]);let result=cache.get(key);
 if(!result){
  if(data.mode==='temperature'||data.mode==='robot'){
   const sheets=JSON.parse(execFileSync('python3',[path.join(__dirname,'read-ege-informatics-2021-ods.py')],{input:files[0],encoding:'utf8',maxBuffer:2000000}));assert.equal(sheets.length,1);
   result=data.mode==='temperature'?temperature(sheets[0].rows):robot(sheets[0].rows.map(row=>row.map(Number)));
  }else if(data.mode==='document'){
   const parsed=JSON.parse(execFileSync('python3',[path.join(__dirname,'read-ege-informatics-odt.py')],{input:files[0],encoding:'utf8',maxBuffer:12000000}));assert.equal(parsed.notes,0);result=document(parsed.paragraphs);
  }else if(data.mode==='string')result=string(files[0].toString('utf8').trim());
  else if(data.mode==='containers'){
   const a=files[0].toString('utf8').trim().split(/\s+/).map(Number),capacity=a.shift(),count=a.shift();assert.equal(count,a.length);result=containers(capacity,a);
  }else if(data.mode==='triples'){
   const outputs=files.map(b=>triples(b.toString('utf8')));result={answer:outputs.map(r=>r.answer).join(' '),files:outputs};
  }else throw new Error('Unknown mode');
  cache.set(key,result);
 }
 assert.deepEqual(result,data.result,'changed calculation');return result;
}
module.exports={temperature,robot,document,string,containers,triples,compute};
