'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{execFileSync}=require('node:child_process');
const {ogeSourceSignature}=require('../../lib/oge-classification'),{conditionText}=require('../../lib/seo-text'),machine=require('./ege-informatics-official-six-machine');
const proofs=require('../data/ege-informatics-official-six-proofs.json');
const root=path.resolve(__dirname,'../..');
function auditOfficialSix(task,record,source,readFile=fs.readFileSync){
 const p=proofs[task.id];assert.ok(p);assert.equal(ogeSourceSignature(task),p.sourceHash,'changed primary condition');assert.equal(conditionText(task.fragment),p.condition);assert.equal(source.fipiCondition,p.condition);assert.equal(record.answer,p.answer,'answer');assert.equal(createHash('sha256').update(record.solution).digest('hex'),p.solutionHash,'changed explanation');assert.deepEqual(record.solution.split('\n').filter(Boolean),p.lines);
 const links=[...task.fragment.matchAll(/href=["'](\/fipi\/ege-informatics\/[^"']+\.zip)["']/g)].map(x=>x[1]);assert.deepEqual(links,[p.url]);const filename=path.resolve(root,'fipi-assets',p.url.slice('/fipi/'.length));assert.ok(filename.startsWith(root+'/fipi-assets/ege-informatics/'));const bytes=readFile(filename);assert.equal(createHash('sha256').update(bytes).digest('hex'),p.archiveSha256,'changed source archive');
 const data=JSON.parse(execFileSync('python3',[path.join(__dirname,'read-ege-informatics-official-six.py'),p.kind],{input:bytes,encoding:'utf8',maxBuffer:2000000,timeout:30000}));assert.deepEqual(data.hashes,p.memberHashes,'changed archive members');let result;
 if(p.kind==='process'){
  assert.ok(p.condition.includes('на 23-й мс'));assert.deepEqual(data.processes,p.processes);const timeline=machine.processTimeline(data.processes);for(const row of p.schedule){assert.equal(timeline.starts[row.id],row.start);assert.equal(timeline.ends[row.id],row.end);}assert.deepEqual(timeline.ticks[22],p.active);result={answer:String(timeline.ticks[22].length)};
 }else{
  const points=p.calculation.files.map(f=>{const text=data.texts[f.file];assert.ok(text);return machine.parseStars(text);});result=machine.solveStars(...points,p.calculation.spec);assert.deepEqual(result.detail,p.calculation.detail,'changed calculation');
  for(let k=0;k<2;k++){const g=p.calculation.files[k].groups;assert.deepEqual(result.groups[k].map(x=>x.map(q=>q.index)),g.map(x=>x.indices));assert.deepEqual(result.centers[k],g.map(x=>x.center.point),'changed medoid');machine.proveRectangles(result.groups[k],g.map(x=>x.rectangleMicro));}
 }
 assert.equal(result.answer,p.answer,'answer calculation');return {answer:result.answer,kind:p.kind,lines:p.lines,rejectedEdits:0};
}
module.exports={auditOfficialSix};
