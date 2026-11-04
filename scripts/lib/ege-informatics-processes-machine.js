'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{execFileSync}=require('node:child_process');
const {conditionText}=require('../../lib/seo-text'),{auditPrimaryImage}=require('./ege-informatics-number-sequence-machine');
const root=path.resolve(__dirname,'../..');
function model(text){
 let m;if((m=text.match(/параллельно выполняются на (\d+)-й мс/u))){assert.ok(text.includes('каждый процесс начинается в самое раннее допустимое время'));return {kind:'active-at',time:Number(m[1])};}
 if((m=text.match(/за которое завершатся (\d+) процесс/u))){assert.ok(text.includes('каждый процесс начинается в самое раннее допустимое время'));return {kind:'finish-count',count:Number(m[1])};}
 assert.ok(text.includes('завершится выполнение всей совокупности процессов'));return {kind:'makespan'};
}
function parse(file){
 const xml=execFileSync('unzip',['-p',file,'content.xml'],{encoding:'utf8',maxBuffer:10000000,timeout:30000}),rows=[];
 assert.equal([...xml.matchAll(/<table:table\s/gu)].length,1,'single primary worksheet');
 for(const m of xml.matchAll(/<table:table-row\b([^>]*)>([\s\S]*?)<\/table:table-row>/gu)){
  const values=[];
  for(const c of m[2].matchAll(/<table:table-cell\b([^>]*?)(?:\/>|>([\s\S]*?)<\/table:table-cell>)/gu)){
   const text=(c[2]||'').replace(/<[^>]*>/gu,'').trim(),repeat=Number(c[1].match(/table:number-columns-repeated="(\d+)"/u)?.[1]||1);
   if(repeat>100&&!text)break;assert.ok(repeat<100);values.push(...Array(repeat).fill(text));
  }
  while(values.length&&values.at(-1)==='')values.pop();
  if(values.some(Boolean)){assert.equal(Number(m[1].match(/table:number-rows-repeated="(\d+)"/u)?.[1]||1),1);rows.push(values);}
 }
 assert.equal(rows[0].length,3);assert.ok(rows[0][0].includes('ID'));
 return rows.slice(1).map(row=>{assert.equal(row.length,3);assert.ok(/^\d+$/u.test(row[0])&&/^\d+$/u.test(row[1])&&/^\d+(?:\s*;\s*\d+)*$/u.test(row[2]));return {id:Number(row[0]),duration:Number(row[1]),depends:row[2]==='0'?[]:row[2].split(';').map(Number)};});
}
function solve(ps,m){
 const lookup=new Map(ps.map(p=>[p.id,p]));assert.equal(lookup.size,ps.length);assert.ok(ps.length>0);
 for(const p of ps){assert.ok(Number.isSafeInteger(p.id)&&p.id>0&&Number.isSafeInteger(p.duration)&&p.duration>0);assert.equal(new Set(p.depends).size,p.depends.length);for(const id of p.depends)assert.ok(lookup.has(id)&&id!==p.id);}
 const starts={},ends={},remaining=new Set(lookup.keys()),timeline=[];let time=0;
 while(remaining.size){
  for(const p of ps)if(remaining.has(p.id)&&starts[p.id]===undefined&&p.depends.every(id=>ends[id]!==undefined))starts[p.id]=time;
  const active=ps.filter(p=>remaining.has(p.id)&&starts[p.id]!==undefined).map(p=>p.id);assert.ok(active.length,'cyclic dependency');time++;
  for(const id of active)if(time-starts[id]===lookup.get(id).duration){ends[id]=time;remaining.delete(id);}
  timeline.push({ms:time,active,finished:ps.filter(p=>ends[p.id]!==undefined).map(p=>p.id)});assert.ok(time<=10000,'unbounded timeline');
 }
 let answer,selected;
 if(m.kind==='makespan'){answer=time;selected=ps.filter(p=>ends[p.id]===time).map(p=>p.id);}
 else if(m.kind==='active-at'){assert.ok(Number.isInteger(m.time)&&m.time>0);selected=timeline[m.time-1]?.active||[];answer=selected.length;}
 else{assert.equal(m.kind,'finish-count');assert.ok(Number.isInteger(m.count)&&m.count>0&&m.count<=ps.length);answer=timeline.find(r=>r.finished.length>=m.count).ms;selected=timeline[answer-1].finished;}
 return {answer:String(answer),starts,ends,total:time,timeline,selected};
}
function compute(task,data,readFile=fs.readFileSync){
 const text=conditionText(task.fragment);assert.equal(text,data.condition,'changed primary condition');const m=model(text);
 const links=[...task.fragment.matchAll(/href=["'](\/fipi\/ege-informatics\/[^"']+\.ods)["']/gu)].map(x=>x[1]);assert.deepEqual(links,[data.url]);
 const file=path.resolve(root,data.url.slice(1).replace(/^fipi\//u,'fipi-assets/'));assert.ok(file.startsWith(root+'/fipi-assets/ege-informatics/'));assert.equal(createHash('sha256').update(readFile(file)).digest('hex'),data.fileSha256,'changed primary file');
 const ps=parse(file);assert.deepEqual(ps,data.processes,'changed source processes');const r=solve(ps,m),c=data.result;assert.equal(m.kind,c.kind);
 for(const key of ['answer','starts','ends','total','timeline'])assert.deepEqual(r[key],c[key],'changed process calculation: '+key);
 const done=new Set();assert.equal(c.order.length,ps.length);
 for(const id of c.order){const p=ps.find(p=>p.id===id);assert.ok(p&&!done.has(id)&&p.depends.every(id=>done.has(id)));done.add(id);}
 if(m.kind==='active-at'){assert.equal(m.time,c.time);assert.deepEqual(r.selected,c.active);}
 else if(m.kind==='finish-count'){assert.equal(m.count,c.count);assert.deepEqual(ps.filter(p=>r.ends[p.id]<Number(r.answer)).map(p=>p.id),c.before);assert.deepEqual(ps.filter(p=>r.ends[p.id]===Number(r.answer)).map(p=>p.id),c.at);}
 else{const chain=c.criticalPath;assert.ok(chain.length);let sum=0;for(let i=0;i<chain.length;i++){const p=ps.find(p=>p.id===chain[i]);assert.ok(p);if(i)assert.ok(p.depends.includes(chain[i-1]));sum+=p.duration;}assert.equal(sum,r.total);}
 return {...r,kind:m.kind};
}
module.exports={model,parse,solve,compute,auditPrimaryImage};
