'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path'),{createHash}=require('node:crypto');
const {conditionText}=require('../../lib/seo-text');
const {auditPrimaryImage}=require('./ege-informatics-number-sequence-machine');
const root=path.resolve(__dirname,'../..');
function shop(text){
 const lines=text.trim().split(/\r?\n/),n=Number(lines.shift()),rows=lines.map(x=>x.split(/\s+/).map(Number));assert.equal(rows.length,n);
 const sum=rows.reduce((v,r)=>v+r[1],0),articles=[...new Set(rows.map(r=>r[0]))];
 const stats=articles.map(a=>{const r=rows.filter(x=>x[0]===a);assert.ok(r.every(x=>x[1]===r[0][1]));return{article:a,price:r[0][1],sold:r.filter(x=>x[2]===0).length,left:r.filter(x=>x[2]===1).length}});
 const expensive=stats.filter(r=>r.price*n>sum);
 let finalists=expensive.filter(r=>r.sold===Math.max(...expensive.map(x=>x.sold)));
 finalists=finalists.filter(r=>r.price===Math.max(...finalists.map(x=>x.price)));
 finalists=finalists.filter(r=>r.left===Math.min(...finalists.map(x=>x.left)));assert.equal(finalists.length,1);
 const winner=finalists[0];return{answer:`${winner.price*winner.sold} ${winner.left}`,winner,n,priceSum:sum};
}
function server(text,mode){
 const lines=text.trim().split(/\r?\n/),[n,capacity]=lines.shift().split(/\s+/).map(Number);
 const rows=lines.map(line=>{const [time,c,s]=line.split(/\s+/),[h,m,sec]=time.split(':').map(Number);return{time,seconds:h*3600+m*60+sec,client:Number(c),size:Number(s)}}).sort((a,b)=>a.seconds-b.seconds);assert.equal(rows.length,n);
 const prefix=[0];for(const r of rows)prefix.push(prefix.at(-1)+r.size);
 // Find each maximal fitting consecutive block using prefix sums and binary search.
 const backups=[];let begin=0;
 while(begin<n){let lo=begin+1,hi=n+1;while(lo<hi){const mid=Math.floor((lo+hi)/2);if(prefix[mid]-prefix[begin]<=capacity)lo=mid+1;else hi=mid;}
  const end=lo-1;assert.ok(end>begin);if(end===n)break;
  backups.push({time:rows[end].time,size:prefix[end]-prefix[begin],startIndex:begin,endExclusive:end,triggerSize:rows[end].size});begin=end;
 }
 const clients=[...new Set(rows.map(r=>r.client))].map(c=>({client:c,volume:rows.filter(r=>r.client===c&&(mode!=='morning-max-id-two-backups'||r.seconds<43200)).reduce((s,r)=>s+r.size,0)}));
 let selected=clients,bs=backups,first;
 if(mode==='min-two-min-morning'){
  selected=clients.filter(r=>r.volume>=150000).sort((a,b)=>a.volume-b.volume);first=selected[0].volume+selected[1].volume;bs=backups.filter(b=>b.time<'12:00:00').sort((a,b)=>a.size-b.size).slice(0,1);
 }else if(mode==='max-two-last-morning'){
  selected.sort((a,b)=>b.volume-a.volume);first=selected[0].volume+selected[1].volume;bs=backups.filter(b=>b.time<'12:00:00').slice(-1);
 }else{
  if(mode==='max-under-id-two-afternoon')selected=clients.filter(r=>r.volume<=150000);
  selected.sort((a,b)=>b.volume-a.volume);assert.ok(selected[0].volume>selected[1].volume);first=selected[0].client;
  if(mode==='max-under-id-two-afternoon')bs=backups.filter(b=>b.time>='12:00:00');
  if(mode==='max-id-two-morning')bs=backups.filter(b=>b.time<'12:00:00');
  bs=[...bs].sort((a,b)=>b.size-a.size).slice(0,2);
 }
 return{answer:`${first} ${bs.reduce((s,b)=>s+b.size,0)}`,backups,chosenBackups:bs,unarchived:prefix[n]-prefix[begin],selectedClients:selected.slice(0,5)};
}
function inferMode(condition){
 if(condition.includes('В магазине продаётся'))return 'shop';
 assert.ok(condition.includes('Сервер выполняет запросы'));
 if(condition.includes('наименьший суммарный объём'))return 'min-two-min-morning';
 if(condition.includes('объём данных не позднее 11:59:59'))return 'morning-max-id-two-backups';
 if(condition.includes('наибольший суммарный объём данных, переданных на сервер с двух'))return 'max-two-last-morning';
 if(condition.includes('не превышающий 150 000'))return 'max-under-id-two-afternoon';
 assert.ok(condition.includes('наибольший общий объём данных'));return 'max-id-two-morning';
}
function compute(task,data,readFile=fs.readFileSync){
 const condition=conditionText(task.fragment);assert.equal(condition,data.condition,'changed primary condition');
 const links=[...task.fragment.matchAll(/href=["'](\/fipi\/ege-informatics\/[^"']+\.txt)["']/g)].map(m=>m[1]);assert.deepEqual(links,[data.url],'changed primary file URL');
 const file=path.resolve(root,data.url.slice(1).replace(/^fipi\//,'fipi-assets/'));assert.ok(file.startsWith(root+'/fipi-assets/ege-informatics/'));
 const bytes=readFile(file);assert.equal(createHash('sha256').update(bytes).digest('hex'),data.fileSha256,'changed primary data file');
 const text=bytes.toString('utf8'),mode=inferMode(condition);assert.equal(mode,data.kind==='shop'?'shop':data.mode,'changed calculation mode');
 const result=mode==='shop'?shop(text):server(text,mode);assert.equal(result.answer,data.answer,'answer');
 if(mode==='shop'){assert.equal(result.n,data.n);assert.equal(result.priceSum,data.priceSum);assert.deepEqual(result.winner,data.top[0]);}
 else{assert.deepEqual(result.backups,data.backups,'changed backup sequence');assert.deepEqual(result.chosenBackups,data.chosenBackups);assert.equal(result.unarchived,data.unarchived);assert.deepEqual(result.selectedClients,data.clientTop);const header=text.split(/\r?\n/)[0].split(/\s+/).map(Number);assert.deepEqual(header,[data.n,data.capacity]);}
 return {answer:result.answer,kind:mode,backups:result.backups?.length||0};
}
module.exports={shop,server,inferMode,compute,auditPrimaryImage};
