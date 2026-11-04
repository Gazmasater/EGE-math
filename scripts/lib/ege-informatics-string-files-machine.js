'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {conditionText}=require('../../lib/seo-text');
const {auditPrimaryImage}=require('./ege-informatics-number-sequence-machine');
const root=path.resolve(__dirname,'../..');
function expression(s){
  let z=0,n=0,o=0,best=0,end=0;
  for(let i=0;i<s.length;i++){
    const c=s[i];
    if(c==='0'){
      z=o?o+1:1;n=n?n+1:0;o=0;
    }else if(c>='1'&&c<='9'){
      n=Math.max(1,n?n+1:0,o?o+1:0);z=0;o=0;
    }else{
      const number=Math.max(z,n);o=number?number+1:0;z=0;n=0;
    }
    if(Math.max(z,n)>best){best=Math.max(z,n);end=i+1;}
  }
  return {best,start:end-best,end};
}
function exactPair(s,k){
  let left=0,count=0,best=0,start=0,end=0;
  for(let right=0;right<s.length;right++){
    if(right&&s[right-1]==='B'&&s[right]==='C')count++;
    while(count>k){if(s[left]==='B'&&s[left+1]==='C')count--;left++;}
    if(count===k&&right-left+1>best){best=right-left+1;start=left;end=right+1;}
  }
  return {best,start,end};
}

function compute(task,data,readFile=fs.readFileSync){
  const condition=conditionText(task.fragment);assert.equal(condition,data.condition,'changed primary condition');
  const links=[...task.fragment.matchAll(/href=["'](\/fipi\/ege-informatics\/[^"']+\.txt)["']/g)].map(m=>m[1]);
  assert.deepEqual(links,[data.url],'changed primary file URL');
  const file=path.resolve(root,data.url.slice(1).replace(/^fipi\//,'fipi-assets/'));assert.ok(file.startsWith(root+'/fipi-assets/ege-informatics/'));
  const bytes=readFile(file);assert.equal(createHash('sha256').update(bytes).digest('hex'),data.fileSha256,'changed primary data file');
  const s=bytes.toString('utf8').trim();assert.ok(!/\s/.test(s));
  let result,kind;
  if(condition.includes('арифметическим выражением')){
    const digits=new Set(condition.match(/состоит из цифр ([\d, ]+) и/)[1].match(/\d/g));
    assert.ok(condition.includes('вычитание и умножение'));
    for(const c of s)assert.ok(digits.has(c)||c==='-'||c==='*');
    kind='expression';result=expression(s);
    assert.ok(/^(?:0|[1-9][0-9]*)(?:[-*](?:0|[1-9][0-9]*))*$/.test(s.slice(result.start,result.end)));
  }else{
    assert.ok(condition.includes('пара символов BC'));const k=Number(condition.match(/ровно (\d+) раз/)[1]);
    assert.ok(/^[ABCDEF]+$/.test(s));kind='exact-pair';result=exactPair(s,k);
    assert.equal(s.slice(result.start,result.end).split('BC').length-1,k);
    assert.equal(s.split('BC').length-1,data.occurrences);
    const first=s.indexOf('BC',result.start),last=s.lastIndexOf('BC',result.end-2);
    assert.equal(first,data.firstIncludedStart);assert.equal(last,data.lastIncludedStart);
    assert.equal(s.lastIndexOf('BC',result.start-1),data.previousStart);
    assert.equal(s.indexOf('BC',result.end-1),data.nextStart);
  }
  assert.equal(kind,data.kind);assert.equal(s.length,data.length);
  assert.equal(String(result.best),data.answer,'answer');assert.equal(result.start,data.startIndex);assert.equal(result.end,data.endExclusive);
  assert.equal(createHash('sha256').update(s.slice(result.start,result.end)).digest('hex'),data.witnessSha256,'changed witness');
  return {kind,answer:String(result.best),length:s.length,startIndex:result.start,endExclusive:result.end};
}
module.exports={expression,exactPair,compute,auditPrimaryImage};
