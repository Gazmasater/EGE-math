'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {conditionText}=require('../../lib/seo-text');
const root=path.resolve(__dirname,'../..');
function model(text){
  if(text.includes('абсолютное значение их разности'))return {kind:'difference',divisor:Number(text.match(/кратный (\d+)/)[1]),minimum:false};
  if(text.includes('сумма элементов меньше'))return {kind:'sum-bound',divisor:Number(text.match(/кратного (\d+)/)[1]),minimum:false};
  if(text.includes('сумма остатков'))return {kind:'sum-remainders',divisor:Number(text.match(/обоих элементов на (\d+)/)[1]),minimum:text.includes('минимальную из сумм')};
  assert.ok(text.includes('хотя бы одного из элементов'));
  return {kind:'either-remainder',divisor:Number(text.match(/остаток от деления на (\d+)/)[1]),minimum:false};
}
function solve(a,m){
  assert.ok(a.length>=2&&a.every(x=>Number.isInteger(x)&&x>=-100000&&x<=100000));
  const special=['difference','sum-bound'].includes(m.kind);
  if(!special)assert.ok(a.every(x=>x>=1));
  let threshold=Infinity;
  for(const x of a)if((!special||x>0&&x%m.divisor===0)&&x<threshold)threshold=x;
  assert.ok(Number.isFinite(threshold));
  const starts=[];let best=m.minimum?Infinity:-Infinity;
  for(let j=1;j<a.length;j++){
    const x=a[j-1],y=a[j];let ok;
    if(m.kind==='difference')ok=x!==y&&Number.isInteger((x-y)/threshold);
    else if(m.kind==='sum-bound')ok=x+y<threshold;
    else if(m.kind==='sum-remainders')ok=x%m.divisor+y%m.divisor===threshold;
    else ok=x%m.divisor===threshold||y%m.divisor===threshold;
    if(!ok)continue;
    starts.push(j);best=m.minimum?Math.min(best,x+y):Math.max(best,x+y);
  }
  assert.ok(starts.length,'no qualifying pairs');
  return {kind:m.kind,divisor:m.divisor,minimum:m.minimum,elements:a.length,threshold,count:starts.length,best,starts,answer:`${starts.length} ${m.kind==='sum-bound'?Math.abs(best):best}`};
}
function compute(task,data,readFile=fs.readFileSync){
  const text=conditionText(task.fragment);assert.equal(text,data.condition,'changed primary condition');
  const links=[...task.fragment.matchAll(/href=["'](\/fipi\/ege-informatics\/[^"']+\.txt)["']/g)].map(m=>m[1]);assert.equal(links.length,1,'primary data link');
  assert.equal(links[0],data.url,'changed primary data URL');
  const file=path.resolve(root,links[0].slice(1).replace(/^fipi\//,'fipi-assets/'));
  assert.ok(file.startsWith(root+'/fipi-assets/ege-informatics/'));
  const bytes=readFile(file);assert.equal(createHash('sha256').update(bytes).digest('hex'),data.fileSha256,'changed primary data file');
  const raw=bytes.toString('utf8').trim();assert.ok(/^-?\d+(?:\s+-?\d+)*$/.test(raw));
  const result=solve(raw.split(/\s+/).map(Number),model(text));
  assert.deepEqual(result,data.result,'changed sequence calculation');return result;
}
function auditPrimaryImage(task,source,projectRoot=root){
  const review=source.primaryImageReview;assert.ok(review?.reviewed);
  const urls=[...task.fragment.split('КЭС:')[0].matchAll(/<img\b[^>]*src=["']([^"']+)["']/giu)].map(m=>m[1]);
  assert.deepEqual(review.files.map(f=>f.src),urls,'changed primary images');
  for(const f of review.files){
    assert.ok(f.src.startsWith('/fipi/ege-informatics/'));
    const local=path.resolve(projectRoot,'fipi-assets',decodeURIComponent(f.src.slice(6)));
    assert.ok(local.startsWith(path.resolve(projectRoot,'fipi-assets/ege-informatics')+path.sep));
    assert.equal(createHash('sha256').update(fs.readFileSync(local)).digest('hex'),f.sha256,'changed primary image');
  }
}
module.exports={model,solve,compute,auditPrimaryImage};
