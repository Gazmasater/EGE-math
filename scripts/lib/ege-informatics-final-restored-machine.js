'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),{conditionText}=require(root+'/lib/seo-text');
const models=require('../data/ege-informatics-final-restored-models.json');
const calculator=path.join(__dirname,'calculate-ege-informatics-final-restored.py');
const sha=b=>createHash('sha256').update(b).digest('hex'),cache=new Map();
function compute(task,data,readFile=fs.readFileSync){
 assert.ok(Object.hasOwn(models,task.id),'unknown task');
 assert.equal(conditionText(task.fragment),data.condition,'changed condition');
 assert.deepEqual(data.model,models[task.id],'changed model');
 const urls=[...task.fragment.matchAll(/class="fipi-attachment" href="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(urls,[data.url]);
 assert.match(data.url,/^\/fipi\/ege-informatics\/docs\/restored-final\/EGEINF[0-9A-F]+\.zip$/);
 const filename=path.resolve(root,data.url.slice(1).replace(/^fipi\//,'fipi-assets/'));
 assert.ok(filename.startsWith(root+'/fipi-assets/ege-informatics/docs/restored-final/'));
 const bytes=readFile(filename);assert.equal(sha(bytes),data.fileSha256,'changed archive');
 const key=JSON.stringify([data.fileSha256,data.model]);let result=cache.get(key);
 if(!result){
  const p=spawnSync('python3',[calculator,path.join(root,'scripts/lib'),JSON.stringify(data.model)],{input:bytes,maxBuffer:2000000,timeout:120000});
  assert.equal(p.status,0,String(p.stderr));result=JSON.parse(p.stdout);cache.set(key,result);
 }
 assert.deepEqual(result,data.result,'changed calculation');return result;
}
module.exports={compute};
