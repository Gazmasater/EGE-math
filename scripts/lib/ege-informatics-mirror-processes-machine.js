'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{execFileSync}=require('node:child_process');
const {graph,schedule}=require('./ege-informatics-recovered-processes-machine');
const sha=b=>createHash('sha256').update(b).digest('hex'),root=path.resolve(__dirname,'../..'),cache=new Map();
function conditionModel(text){
 let m;if((m=text.match(/могут быть завершены за первые (\d+) мс/u)))return {type:'completed-by',parameter:Number(m[1]),minimalMakespanRequired:false};
 if((m=text.match(/параллельно выполняются на (\d+)-й мс/u)))return {type:'active-at',parameter:Number(m[1]),minimalMakespanRequired:false};
 if((m=text.match(/за которое завершатся (\d+)\s+процесс/u)))return {type:'finish-count',parameter:Number(m[1]),minimalMakespanRequired:false};
 if(text.includes('максимальную продолжительность отрезка времени'))return {type:'interval',parameter:null,minimalMakespanRequired:/время окончания работы всех процессов минимально/u.test(text)};
 assert(text.includes('завершится выполнение всей совокупности процессов'));return {type:'makespan',parameter:null,minimalMakespanRequired:false};
}
const SHAPES={
 A:[[],[],[101,102],[102],[103],[103],[106],[105,107],[108],[],[110],[110],[112]],
 B:[[],[101],[101],[103,107],[104],[104],[],[],[108],[109],[108],[111]],
 C:[[],[],[101,102],[103],[103],[104],[105,106],[107],[],[109],[109],[110,111],[111]]
};
function intervalBound(ps,deadline){
 assert.deepEqual(ps.map(p=>p.id),ps.map((_,i)=>101+i));const deps=ps.map(p=>[...p.depends].sort((a,b)=>a-b));
 const shape=Object.keys(SHAPES).find(k=>JSON.stringify(SHAPES[k])===JSON.stringify(deps));assert(shape,'unreviewed dependency structure');
 const d=Object.fromEntries(ps.map(p=>[p.id,p.duration]));let bound;
 if(shape==='A'){assert.equal(deadline,null);bound=Math.min(d[104],d[105],d[106]+d[107],d[111],d[112]+d[113]);}
 if(shape==='B'){
  let early=Math.min(d[102],d[103],d[107]);if(deadline!==null)early=Math.max(0,Math.min(early,deadline-d[104]-Math.max(d[105],d[106])-d[108]));
  bound=Math.min(Math.max(early,Math.min(d[102],d[105],d[106])),d[109]+d[110],d[111]+d[112]);
 }
 if(shape==='C'){
  let early=Math.min(d[101],d[102]),late=Math.min(d[105],d[104]+d[106]);
  if(deadline!==null){
   early=Math.max(0,Math.min(early,deadline-d[103]-Math.max(d[105],d[104]+d[106])-d[107]-d[108]-d[109]));
   const earliestSecond=Math.max(d[101],d[102])+d[103];
   late=Math.min(late,Math.max(d[113],deadline-d[112]+d[113]-earliestSecond));
  }
  bound=Math.min(Math.max(early,late),d[110]+d[112],d[111]+d[113]);
 }
 assert(Number.isSafeInteger(bound)&&bound>0);return {shape,bound};
}
function solve(ps,m,certificate){
 const g=graph(ps),starts=Object.fromEntries(ps.map(p=>[p.id,g.ends[p.id]-p.duration]));let answer;
 const result={starts,finishes:g.ends,makespan:g.total};
 if(m.type==='makespan')answer=g.total;
 else if(m.type==='active-at')answer=ps.filter(p=>starts[p.id]<m.parameter&&g.ends[p.id]>=m.parameter).length;
 else if(m.type==='completed-by')answer=ps.filter(p=>g.ends[p.id]<=m.parameter).length;
 else if(m.type==='finish-count'){assert(m.parameter>0&&m.parameter<=ps.length);answer=Object.values(g.ends).sort((a,b)=>a-b)[m.parameter-1];}
 else {
  assert.equal(m.type,'interval');const ids=ps.map(p=>p.id);let width=0;
  for(let mask=1;mask<1<<ps.length;mask++){const chosen=ids.filter((_,i)=>mask>>i&1);if(chosen.length<=width)continue;if(chosen.every(a=>chosen.every(b=>!g.anc[a].has(b))))width=chosen.length;}
  const {shape,bound}=intervalBound(ps,m.minimalMakespanRequired?g.total:null),checked=schedule(ps,certificate.starts,width);
  if(m.minimalMakespanRequired)assert.equal(Math.max(...Object.values(checked.ends)),g.total,'deadline violation');
  assert.equal(checked.longest,bound,'witness must attain the mathematical upper bound');
  const [a,b]=certificate.interval;assert.equal(b-a,bound);const segments=[];
  for(const seg of checked.intervals)if(seg.start<b&&seg.end>a){assert.equal(seg.active.length,width);segments.push({start:Math.max(a,seg.start),end:Math.min(b,seg.end),processes:seg.active});}
  assert.equal(segments.reduce((sum,s)=>sum+s.end-s.start,0),bound);
  assert.equal(certificate.maximumParallel,width);assert.equal(certificate.answer,bound);assert.deepEqual(certificate.finishes,checked.ends);assert.deepEqual(certificate.segments,segments);
  Object.assign(result,{shape,maximumParallel:width,interval:[a,b],scheduleStarts:certificate.starts,scheduleFinishes:checked.ends,segments});answer=bound;
 }
 return {answer:String(answer),...result};
}
function compute(task,data,readFile=fs.readFileSync){
 const {conditionText}=require('../../lib/seo-text'),condition=conditionText(task.fragment);assert.equal(condition,data.condition,'changed condition');
 const models=require('../data/ege-informatics-mirror-processes-models.json');assert.deepEqual(data.model,models[task.id],'changed model');
 const parsed=conditionModel(condition);for(const k of Object.keys(parsed))assert.deepEqual(parsed[k],data.model[k]);
 const urls=[...task.fragment.matchAll(/href=["'](\/fipi\/ege-informatics\/[^"']+\.ods)["']/gu)].map(x=>x[1]);assert.deepEqual(urls,data.files.map(f=>f.url),'changed attachments');
 const bytes=data.files.map(f=>{assert.match(f.url,/^\/fipi\/ege-informatics\/docs\/restored-processes\/EGEINF[A-F\d]{6}(?:-[A-Za-z0-9_]+)?\.ods$/u);const b=readFile(path.join(root,f.url.slice(1).replace(/^fipi\//u,'fipi-assets/')));assert.equal(sha(b),f.sha256,'changed file');return b;});
 const key=data.files.map(f=>f.sha256).join(',')+JSON.stringify(data.model)+JSON.stringify(data.certificate);
 if(!cache.has(key)){
  const graphs=bytes.map(b=>JSON.parse(execFileSync('python3',[path.join(__dirname,'read-ege-informatics-mirror-processes.py')],{input:b,encoding:'utf8',timeout:30000,maxBuffer:1024*1024})));
  for(const ps of graphs)assert.deepEqual(ps,data.model.processes,'changed primary table');
  cache.set(key,solve(graphs[0],data.model,data.certificate));
 }
 const r=cache.get(key);assert.deepEqual(r,data.result,'changed calculation');return r;
}
module.exports={conditionModel,intervalBound,solve,compute};
