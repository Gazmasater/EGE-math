'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const machine=require('./lib/ege-informatics-mirror-optimization-machine');

test('extra laboratory header is accepted only for exact reviewed source bytes',()=>{
  const p=require('./data/ege-informatics-mirror-optimization-proofs').EGEINF327EB5.data;
  const bytes=fs.readFileSync('fipi-assets/ege-informatics/docs/restored-optimization/EGEINF327EB5.zip');
  const [a]=machine.unpack(bytes,p.members.map(m=>m.name));
  assert.throws(()=>machine.parse(a,p.model));
  assert.equal(machine.parse(a,p.model,[100,113]).N,100);
  assert.throws(()=>machine.parse(a,p.model,[100,114]),/header/);
  assert.throws(()=>machine.parse(Buffer.concat([a,Buffer.from('\n')]),p.model,[100,113]),/unreviewed/);
  assert.throws(()=>machine.parse(Buffer.from('2 113\n1 44\n2 44\n'),p.model,[2,113]),/unreviewed/);
  assert.throws(()=>machine.parse(a,{kind:'radius-containers',capacity:44},[100,113]),/linear cost/);
});

test('327EB5 binds all-points cost and capacity 44 without changing the radius task',()=>{
  const {readOgeCatalog}=require('./lib/oge-catalog');
  const {auditMirrorOptimization}=require('./lib/audit-ege-informatics-mirror-optimization');
  const batch=require('./data/ege-informatics-solutions').find(b=>b.name==='mirror-optimization');
  const tasks=new Map(readOgeCatalog(undefined,'ege-informatics').tasks.map(t=>[t.id,t]));
  const record=batch.records.find(r=>r.id==='EGEINF327EB5'),task=tasks.get(record.id),source=batch.sources[record.id];
  assert.ok(record.solution.length>800&&record.solution.includes('Проверка'));
  assert.ok(record.solution.endsWith('Ответ: '+record.answer+'.'));
  assert.ok(!/\/|undefined/u.test(record.answer+record.solution));
  assert.equal(auditMirrorOptimization(task,record,source).answer,'161619 18586868584232');
  const radius=batch.records.find(r=>r.id==='EGEINF30C294');
  assert.equal(auditMirrorOptimization(tasks.get(radius.id),radius,batch.sources[radius.id]).answer,'264 27140');
  assert.match(record.solution,/В данном решении считаем требуемую стоимость доставки из всех пунктов/);
  assert.throws(()=>auditMirrorOptimization(task,{...record,answer:radius.answer},source),/answer/);
  assert.throws(()=>auditMirrorOptimization({...task,fragment:task.fragment.replace('не более 44 штук','не более 30 штук')},record,source),/condition/);
  assert.throws(()=>auditMirrorOptimization(task,{...record,solution:record.solution.replace('не используется','используется')},source),/explanation/);
  const proof=require('./data/ege-informatics-mirror-optimization-proofs').EGEINF327EB5;
  assert.throws(()=>machine.compute({...task,id:'EGEINF30C294'},proof.data),/task-specific/);
  assert.throws(()=>machine.compute(task,{...proof.data,reviewedHeaders:[[100,114],[1200000,12013]]}));
});
