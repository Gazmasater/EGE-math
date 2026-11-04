'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path'),{createHash}=require('node:crypto');
const sha=b=>createHash('sha256').update(b).digest('hex');
function lower(a,x){let l=0,r=a.length;while(l<r){let k=(l+r)>>>1;if(a[k]<x)l=k+1;else r=k;}return l;}
function solve(s,m){
 let best=null;const maximize=!(m.kind==='mixed-min'||m.mode?.startsWith('min')),n=s.length;
 function consider(a,b,divisor=1){const answer=(b-a)/divisor;if(best===null||(maximize?answer>best.answer:answer<best.answer)||answer===best.answer&&a<best.start)best={answer,start:a,end:b,length:b-a};}
 if(m.kind==='pairs'){
  const state=[0,0];for(let i=0;i<n;i++){const parity=i%2;state[parity]=i>0&&m.first.includes(s[i-1])&&m.second.includes(s[i])?state[parity]+2:0;if(state[parity])consider(i+1-state[parity],i+1,2);}
 }else if(m.kind==='expression'){
  let nz=0,z=0,op=0;for(let i=0;i<n;i++){const c=s[i];let a=0,b=0,d=0;if(c==='0'){a=nz?nz+1:0;b=Math.max(1,op?op+1:0);}else if(m.digits.includes(c)){a=Math.max(1,nz?nz+1:0,op?op+1:0);}else{assert.ok(c==='-'||c==='*');d=Math.max(nz,z);d=d?d+1:0;}nz=a;z=b;op=d;const length=Math.max(nz,z);if(length)consider(i-length+1,i+1);}
 }else if(m.kind==='forbidden'){
  const re=new RegExp('^(?:'+m.pattern+')$');let left=0;for(let i=0;i<n;i++){if(i>=m.width-1&&re.test(s.slice(i-m.width+1,i+1)))left=i-m.width+2;consider(left,i+1);}
 }else if(m.kind==='occurrences'){
  const pat=m.pattern,w=pat.length,k=m.count;let left=0,count=0;
  for(let right=0;right<n;right++){
   if(right-w+1>=left&&s.startsWith(pat,right-w+1))count++;
   if(m.mode.startsWith('min')){while(count>=k){consider(left,right+1);if(left+w-1<=right&&s.startsWith(pat,left))count--;left++;}}
   else{while(count>k){if(left+w-1<=right&&s.startsWith(pat,left))count--;left++;}if(m.mode==='max-atmost'||count===k)consider(left,right+1);}
  }
 }else if(m.kind==='anchored'){
  const markers=[],counted=[];for(let i=0;i<n;i++){if(m.starts.includes(s[i]))markers.push(i);if(m.countChars.includes(s[i]))counted.push(i);}markers.push(n);
  for(let i=0;i<markers.length-1;i++){const a=markers[i],b=markers[i+1],j=lower(counted,a+1);if(j+m.count<=counted.length&&counted[j+m.count-1]<b){const end=Math.min(b,counted[j+m.count]??n);consider(a,end);}}
 }else if(m.kind==='mixed-min'){
  const positions=[],matches=[];for(let i=0;i<n;i++){if(s[i]===m.char)positions.push(i);if(s.startsWith(m.pattern,i))matches.push(i);}
  function candidate(left){const w=lower(positions,left),j=lower(matches,left);if(w+m.count>positions.length||j+m.minimum>matches.length)return;const end=Math.max(positions[w+m.count-1]+1,matches[j+m.minimum-1]+m.pattern.length);if(end<=(positions[w+m.count]??n))consider(left,end);}
  for(const left of positions)candidate(left);for(const left of matches)candidate(left);
 }else throw Error(m.kind);
 return best;
}

const root=path.resolve(__dirname,'../..'),results=new Map();
function compute(task,data,readFile=fs.readFileSync){
 const {conditionText}=require('../../lib/seo-text');assert.equal(conditionText(task.fragment),data.condition,'changed condition');
 const models=require('../data/ege-informatics-mirror-strings-models.json');assert.deepEqual(data.model,models[task.id],'changed model');
 const urls=[...task.fragment.matchAll(/href=["'](\/fipi\/ege-informatics\/[^"']+\.txt)["']/gu)].map(x=>x[1]);assert.deepEqual(urls,[data.url],'changed attachment');assert.match(data.url,/^\/fipi\/ege-informatics\/docs\/restored-strings\/EGEINF[A-F\d]{6}\.txt$/u);
 const file=path.join(root,data.url.slice(1).replace(/^fipi\//u,'fipi-assets/')),bytes=readFile(file);assert.equal(sha(bytes),data.fileSha256,'changed file');
 const key=data.fileSha256+JSON.stringify(data.model);if(!results.has(key)){
  const s=bytes.toString('utf8').replace(/[\r\n]+$/u,'');assert.ok(s&&!/[\r\n\u0080-\uffff]/u.test(s),'invalid input');
  const r=solve(s,data.model);assert.ok(r,'no solution');results.set(key,{...r,answer:String(r.answer),characters:s.length});
 }
 const result=results.get(key);assert.deepEqual(result,data.result,'changed calculation');return result;
}
module.exports={solve,compute};
