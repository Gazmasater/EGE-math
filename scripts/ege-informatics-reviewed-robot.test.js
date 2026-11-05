'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
test('Seven reviewed original robot files calculate exactly; changed data and hidden discrepancy are rejected',()=>{
  const {readOgeCatalog}=require('./lib/oge-catalog'),{auditReviewedRobot}=require('./lib/audit-ege-informatics-reviewed-robot');
  const {ogeTaskMatchesTopic}=require('../lib/oge-catalog');
  const tasks=new Map(readOgeCatalog(undefined,'ege-informatics').tasks.map(t=>[t.id,t]));
  const batch=require('./data/ege-informatics-solutions').find(b=>b.name==='reviewed-robot');
  const expected={EGEINF79404A:'2794 1693',EGEINF77DB46:'2766 1820',EGEINFB4F848:'2852 1784',EGEINFE60642:'2337 1275',EGEINF779E0A:'2391 1059',EGEINF34C97E:'2691 1795',EGEINF72C252:'2833 1944'};
  assert.deepEqual(new Set(batch.records.map(r=>r.id)),new Set(Object.keys(expected)));
  for(const r of batch.records){
    const t=tasks.get(r.id),s=batch.sources[r.id];assert.ok(ogeTaskMatchesTopic(t,batch.topic,'ege-informatics'));
    assert.equal(auditReviewedRobot(t,r,s).answer,expected[r.id]);
    assert.match(r.solution,/хотя в тексте указана общая граница 100/);
    assert.throws(()=>auditReviewedRobot(t,{...r,answer:r.answer.split(' ').reverse().join(' ')},s),/answer/);
    assert.throws(()=>auditReviewedRobot(t,{...r,solution:r.solution.split('\n').filter(l=>!l.startsWith('Особенность')).join('\n')},s),/explanation/);
    assert.throws(()=>auditReviewedRobot({...t,fragment:t.fragment.replace('от 1 до 100','от 1 до 1000')},r,s),/condition/);
    assert.throws(()=>auditReviewedRobot(t,r,s,p=>Buffer.concat([fs.readFileSync(p),Buffer.from('changed')])),/archive/);
  }
});
test('Independent reverse Python calculation checks both original formats and all 14 optimal routes',()=>{
  const {spawnSync}=require('node:child_process'),path=require('node:path');
  const result=spawnSync('python3',[path.resolve(__dirname,'../docs/audits/ege-informatics-transfer-review-2026-11-05/verify.py')],{encoding:'utf8',timeout:30000});
  assert.equal(result.status,0,result.stderr);assert.match(result.stdout,/2800 cells/);assert.match(result.stdout,/14 routes/);
});
