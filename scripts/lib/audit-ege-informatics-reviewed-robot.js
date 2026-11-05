'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto'),{execFileSync}=require('node:child_process');
const {ogeSourceSignature}=require('../../lib/oge-classification'),{conditionText}=require('../../lib/seo-text');
const {solve,modelFromCondition}=require('./ege-informatics-mirror-robot-machine');
const proofs=require('../data/ege-informatics-reviewed-robot-proofs.json');
const root=path.resolve(__dirname,'../..'),cache=new Map();
const firstCells={EGEINF79404A:108,EGEINF77DB46:107,EGEINFB4F848:105,EGEINFE60642:102,EGEINF779E0A:106,EGEINF34C97E:101,EGEINF72C252:104};
const sha=b=>createHash('sha256').update(b).digest('hex');
function auditReviewedRobot(task,record,source,readFile=fs.readFileSync){
  const p=proofs[task.id];assert.ok(p&&Object.hasOwn(firstCells,task.id),'unreviewed task');
  assert.equal(ogeSourceSignature(task),p.sourceHash,'changed primary condition');
  assert.equal(conditionText(task.fragment),p.condition,'changed condition');
  assert.equal(source.fipiCondition,p.condition);assert.equal(record.answer,p.answer,'answer');
  assert.equal(sha(record.solution),p.solutionHash,'changed explanation');
  assert.deepEqual(record.solution.split('\n').filter(Boolean),p.lines);
  const links=[...task.fragment.matchAll(/href=["'](\/fipi\/ege-informatics\/[^"']+\.zip)["']/g)].map(x=>x[1]);
  assert.deepEqual(links,[p.url]);assert.equal(p.url,'/fipi/ege-informatics/docs/official-open/2026/'+task.id+'.zip');
  const bytes=readFile(path.join(root,'fipi-assets',p.url.slice('/fipi/'.length)));
  assert.equal(sha(bytes),p.archiveSha256,'changed archive');
  if(!cache.has(p.archiveSha256))cache.set(p.archiveSha256,JSON.parse(execFileSync('python3',[path.join(__dirname,'read-ege-informatics-reviewed-robot.py')],{input:bytes,encoding:'utf8',timeout:30000,maxBuffer:2000000})));
  const data=cache.get(p.archiveSha256);assert.deepEqual(data.hashes,p.memberHashes,'changed members');
  assert.deepEqual(data.grid,p.grid,'changed grid');assert.equal(data.grid.grid[0][0],firstCells[task.id]);
  // This exception applies only to seven original, hash-verified archives.
  // All other cells retain the stated bound; no value is clipped or rewritten.
  assert.ok(data.grid.grid.flat().slice(1).every(v=>v>=1&&v<=100),'unreviewed bound violation');
  assert.ok(p.condition.includes('от 1 до 100'));
  const model=modelFromCondition(p.condition);assert.deepEqual(model,{finish:'bottom-right',order:'max-min'});
  const result=solve(data.grid,model);assert.deepEqual(result,p.result,'changed calculation');
  assert.equal(result.answer,record.answer,'answer calculation');
  return {answer:result.answer,kind:'reviewed-original-robot-file',elements:data.grid.n**2,lines:p.lines,rejectedEdits:0};
}
module.exports={auditReviewedRobot};
