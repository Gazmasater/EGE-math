'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto'),{execFileSync}=require('node:child_process');
const sha=b=>createHash('sha256').update(b).digest('hex');
function scope(paragraphs,m){
 if(!m.part)return {bounds:[],text:paragraphs.join('\n')};
 let part=0,current=null;const sections=[];
 for(let i=0;i<paragraphs.length;i++){
  const original=paragraphs[i].trim(),s=original.replaceAll('Х','X').replaceAll('І','I').replaceAll('С','C').replaceAll('М','M');
  if(/^ЧАСТЬ\s+[А-ЯЁ]+$/u.test(original)){if(current){current.end=i;current=null;}part++;}
  if(/^[IVXLCDM]+$/u.test(s)){if(current)current.end=i;current={part,chapter:s,start:i+1,end:paragraphs.length};sections.push(current);}
 }
 const chosen=m.chapters.map(ch=>{const matches=sections.filter(x=>x.part===m.part&&x.chapter===ch);assert.equal(matches.length,1,'ambiguous chapter');return matches[0]});
 return {bounds:chosen.map(x=>[x.start,x.end]),text:chosen.flatMap(x=>paragraphs.slice(x.start,x.end)).join('\n')};
}
function count(text,m){
 const letter=c=>!!c&&/\p{L}/u.test(c),joins=i=>letter(text[i])||(m.hyphens!=='boundary'&&['-','‑'].includes(text[i])&&letter(text[i-1])&&letter(text[i+1]));
 const all=new Set(),whole=new Set(),embedded=new Set(),words=new Set();const wholeCountsByTerm=Object.fromEntries(m.terms.map(t=>[t,0])),allCountsByTerm={...wholeCountsByTerm};
 for(let i=0;i<text.length;i++)for(const term of m.terms){
  if(!text.startsWith(term,i))continue;all.add(i);allCountsByTerm[term]++;const w=!joins(i-1)&&!joins(i+term.length);
  if(w){whole.add(i);wholeCountsByTerm[term]++;}else{embedded.add(i);let a=i;while(a>0&&joins(a-1))a--;words.add(a);}
 }
 const selectedPositions=[...({all,whole,embedded,'embedded-words':words}[m.mode])].sort((a,b)=>a-b);assert.ok(selectedPositions);
 return {answer:selectedPositions.length,allOccurrences:all.size,wholeWords:whole.size,embeddedOccurrences:embedded.size,embeddedWords:words.size,selectedPositions,wholeCountsByTerm,allCountsByTerm};
}
function solve(paragraphs,m){const {bounds,text}=scope(paragraphs,m);return {bounds,selectedSha256:sha(text),...count(text,m)};}
module.exports={scope,count,solve};
const root=path.resolve(__dirname,'../..');const parsedCache=new Map(),resultCache=new Map();
function compute(task,data,readFile=fs.readFileSync){
 const {conditionText}=require('../../lib/seo-text');
 assert.equal(conditionText(task.fragment),data.condition,'changed condition');
 const models=require('../data/ege-informatics-mirror-library-models.json');assert.deepEqual(data.model,models[task.id],'changed search parameters');
 const urls=[...task.fragment.matchAll(/href=["'](\/fipi\/ege-informatics\/[^"']+\.odt)["']/gu)].map(x=>x[1]);assert.deepEqual(urls,[data.url],'changed attachment');assert.match(data.url,/^\/fipi\/ege-informatics\/docs\/restored-library\/EGEINF[A-F\d]{6}\.odt$/u);
 const file=path.join(root,data.url.slice(1).replace(/^fipi\//u,'fipi-assets/')),bytes=readFile(file);assert.equal(sha(bytes),data.fileSha256,'changed file');
 if(!parsedCache.has(data.fileSha256))parsedCache.set(data.fileSha256,JSON.parse(execFileSync('python3',[path.join(root,'scripts/lib/read-ege-informatics-odt.py')],{input:bytes,encoding:'utf8',timeout:30000,maxBuffer:12*1024*1024})));
 const doc=parsedCache.get(data.fileSha256);assert.equal(doc.notes,data.notes);assert.equal(sha(JSON.stringify(doc.paragraphs)),data.paragraphsSha256,'changed document structure');
 const key=data.fileSha256+JSON.stringify(data.model);if(!resultCache.has(key))resultCache.set(key,solve(doc.paragraphs,data.model));const result=resultCache.get(key);assert.deepEqual(result,data.result,'changed calculation');return result;
}
module.exports.compute=compute;
