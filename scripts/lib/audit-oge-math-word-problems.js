const assert=require('node:assert/strict');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {readOgeCatalog}=require('./oge-catalog');
const {conditionText}=require('../../lib/seo-text');
let checked;
function auditWordProblems(task,source,record) {
  if(!checked) {
    const root=path.resolve(__dirname,'../..');
    const batch=require('../data/oge-math-word-problems');
    const tasks=new Map(readOgeCatalog(root).tasks.map(t=>[t.id,t]));
    const items=batch.records.map(record=>{
      const task=tasks.get(record.id);assert.ok(task);
      return {record,task:{id:task.id,fragment:task.fragment,text:conditionText(task.fragment)}};
    });
    const child=spawnSync('python3',[path.join(__dirname,'audit-oge-math-word-problems.py')],{input:JSON.stringify({items}),encoding:'utf8',maxBuffer:8*1024*1024});
    assert.equal(child.status,0,child.stderr||child.error?.message);
    const result=JSON.parse(child.stdout);
    assert.equal(result.checked.length,549);
    assert.deepEqual([...result.checked].sort(),batch.records.map(r=>r.id).sort());
    checked=new Map(items.map(({record,task})=>[record.id,{answer:record.answer,fragment:task.fragment}]));
  }
  const result=checked.get(record.id);assert.ok(result);
  assert.equal(record.answer,result.answer,record.id+': independently validated answer');
  assert.equal(task.fragment,result.fragment,record.id+': independently validated primary condition');
}
module.exports={auditWordProblems};
