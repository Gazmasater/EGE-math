'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{execFileSync}=require('node:child_process');
const {conditionText}=require('../../lib/seo-text'),{auditPrimaryImage}=require('./ege-informatics-number-sequence-machine');
const root=path.resolve(__dirname,'../..');
function select(row,condition){
 if(row.length===4){const [a,b,c,d]=row;return 2*Math.max(...row)<a+b+c+d&&a+b!==c+d&&a+c!==b+d&&a+d!==b+c;}
 for(let i=0;i<row.length;i++)for(let j=0;j<i;j++)if(row[i]===row[j])return false;
 let min=row[0],max=row[0],sum=0;for(const x of row){min=Math.min(min,x);max=Math.max(max,x);sum+=x;}
 return condition.includes('меньше суммы')?3*(min+max)<sum:3*(min+max)>sum;
}
function compute(task,data,readFile=fs.readFileSync){
 const condition=conditionText(task.fragment);assert.equal(condition,data.condition,'changed primary condition');
 const links=[...task.fragment.matchAll(/href=["'](\/fipi\/ege-informatics\/[^"']+\.ods)["']/g)].map(m=>m[1]);assert.deepEqual(links,[data.url],'changed primary file URL');
 const file=path.resolve(root,data.url.slice(1).replace(/^fipi\//,'fipi-assets/'));assert.ok(file.startsWith(root+'/fipi-assets/ege-informatics/'));
 const bytes=readFile(file);assert.equal(createHash('sha256').update(bytes).digest('hex'),data.fileSha256,'changed primary data file');
 const decoded=JSON.parse(execFileSync('python3',[path.join(__dirname,'read-ege-informatics-ods.py'),file],{encoding:'utf8',timeout:60000,maxBuffer:8*1024*1024}));
 const rows=decoded.rows,width=condition.includes('четыре натуральных')?4:5;assert.equal(width,data.columns);assert.equal(rows.length,data.rows);assert.deepEqual(decoded.sheets,data.sheets);
 assert.ok(rows.every(r=>r.length===width&&r.every(x=>Number.isSafeInteger(x)&&x>0)));
 const canonical=rows.map(r=>r.join(' ')).join('\n')+'\n';assert.equal(createHash('sha256').update(canonical).digest('hex'),data.rowsSha256,'changed decoded rows');
 const indices=[];rows.forEach((r,i)=>{if(select(r,condition))indices.push(i+1)});assert.deepEqual(indices,data.indices,'changed selected rows');assert.equal(indices.length,data.matched);
 let answer,kind;
 if(condition.includes('количество строк')){kind='count';answer=indices.length;}
 else if(condition.includes('наибольший номер')){kind='max-index';answer=Math.max(...indices);}
 else if(condition.includes('сумму чисел в строке')){kind='first-sum';answer=rows[indices[0]-1].reduce((a,b)=>a+b,0);}
 else{assert.ok(condition.includes('наименьший номер'));kind='min-index';answer=Math.min(...indices);}
 assert.equal(kind,data.kind);assert.equal(String(answer),data.answer,'answer');
 assert.deepEqual({index:indices[0],values:rows[indices[0]-1]},data.firstMatch);assert.deepEqual({index:indices.at(-1),values:rows[indices.at(-1)-1]},data.lastMatch);
 return{answer:String(answer),kind,rows:rows.length,matched:indices.length};
}
module.exports={select,compute,auditPrimaryImage};
