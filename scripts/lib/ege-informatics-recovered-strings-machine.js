'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'../..');const {conditionText}=require(root+'/lib/seo-text');
function model(condition){
 if(condition.includes('максимального чётного 14-ричного числа')){assert.ok(condition.includes('значащих цифр'));return {kind:'base14-even'};}
 if(condition.includes('ни одна буква не стоит рядом с буквой')){assert.ok(condition.includes('Q, R, W')&&condition.includes('1, 2, 4'));return {kind:'alternating'};}
 assert.match(condition,/никакие две буквы из набора букв A, B и [CС]/u);return {kind:'no-adjacent-abc'};
}
function solve(s,m){
 if(m.kind==='base14-even'){
  assert.match(s,/^[0-9A-Z]*$/u);let best='',start=-1,end=-1;
  for(const match of s.matchAll(/[0-9A-D]+/g)){let first=0,last=match[0].length;while(first<last&&match[0][first]==='0')first++;while(last>first&&!'02468AC'.includes(match[0][last-1]))last--;const value=match[0].slice(first,last);if(value.length>best.length||(value.length===best.length&&value>best)){best=value;start=match.index+first;end=match.index+last;}}
  return {kind:m.kind,answer:String(best.length),elements:s.length,best:{start,end,text:best}};
 }
 assert.match(s,m.kind==='alternating'?/^[QRW124]*$/u:/^[A-Z]*$/u);assert.ok(['alternating','no-adjacent-abc'].includes(m.kind));if(!s.length)return {kind:m.kind,answer:'0',elements:0,windows:0,best:[]};
 const bad=m.kind==='alternating'?/[QRW](?=[QRW])|[124](?=[124])/g:/[ABC](?=[ABC])/g;let begin=0,maximum=0,windows=0,best=[];
 function visit(end){const length=end-begin;windows++;if(length>maximum){maximum=length;best=[]}if(length===maximum)best.push({start:begin,end,text:s.slice(begin,end)});begin=end;}
 for(const match of s.matchAll(bad))visit(match.index+1);visit(s.length);
 return {kind:m.kind,answer:String(maximum),elements:s.length,windows,best};
}
function compute(task,data,readFile=fs.readFileSync){
 const condition=conditionText(task.fragment);assert.equal(condition,data.condition,'changed primary condition');const m=model(condition);assert.deepEqual(m,data.model,'changed model');
 const links=[...task.fragment.matchAll(/href=["'](\/fipi\/ege-informatics\/[^"']+\.txt)["']/g)].map(x=>x[1]);assert.deepEqual(links,[data.url],'changed source file URL');
 const filename=path.resolve(root,data.url.slice(1).replace(/^fipi\//,'fipi-assets/'));assert.ok(filename.startsWith(root+'/fipi-assets/ege-informatics/'));
 const bytes=readFile(filename);assert.equal(createHash('sha256').update(bytes).digest('hex'),data.fileSha256,'changed source file');const result=solve(bytes.toString('utf8').trim(),m);assert.deepEqual(result,data.result,'changed calculation');return result;
}
module.exports={model,solve,compute};
