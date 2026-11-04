'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),{conditionText}=require(root+'/lib/seo-text'),{auditPrimaryImage}=require(root+'/scripts/lib/ege-informatics-number-sequence-machine');
function select(row){assert.equal(row.length,5);assert.ok(row.every(x=>Number.isSafeInteger(x)&&x>0));const a=row.slice().sort((a,b)=>a-b);return a.every((v,i)=>i===0||v!==a[i-1])&&a[3]+a[4]<=a[0]+a[1]+a[2];}
function compute(task,data,readFile=fs.readFileSync){
 const condition=conditionText(task.fragment);assert.equal(condition,data.condition,'changed primary condition');assert.ok(condition.includes('сумма двух наибольших чисел строки не больше суммы трёх её оставшихся чисел'));assert.ok(condition.includes('в строке все числа различны'));assert.ok(condition.includes('количество строк'));
 const links=[...task.fragment.matchAll(/href=["'](\/fipi\/ege-informatics\/[^"']+\.ods)["']/g)].map(m=>m[1]);assert.deepEqual(links,[data.url],'changed primary file URL');
 const file=path.resolve(root,data.url.slice(1).replace(/^fipi\//,'fipi-assets/'));assert.ok(file.startsWith(root+'/fipi-assets/ege-informatics/'));
 const bytes=readFile(file);assert.equal(createHash('sha256').update(bytes).digest('hex'),data.fileSha256,'changed primary file');
 const decoded=JSON.parse(execFileSync('python3',[root+'/scripts/lib/read-ege-informatics-ods.py',file],{encoding:'utf8',timeout:60000,maxBuffer:8*1024*1024}));
 assert.equal(decoded.rows.length,data.rows);assert.deepEqual(decoded.sheets,data.sheets);const canonical=decoded.rows.map(r=>r.join(' ')).join('\n')+'\n';assert.equal(createHash('sha256').update(canonical).digest('hex'),data.rowsSha256,'changed decoded rows');
 const selected=[];decoded.rows.forEach((r,i)=>{if(select(r))selected.push(i+1)});assert.deepEqual(selected,data.selected,'changed selected rows');assert.equal(String(selected.length),data.answer,'answer');return {answer:String(selected.length),rows:decoded.rows.length,matched:selected.length};
}
module.exports={select,compute,auditPrimaryImage};
