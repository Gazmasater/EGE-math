const assert = require('node:assert/strict');
const path = require('node:path');
const {DatabaseSync} = require('node:sqlite');
const {readPhysicsCatalog} = require('./lib/physics-catalog');
const {taskMatchesTopic, conditionSha256} = require('../lib/physics-topics');
const {records} = require('./data/thermal-solutions');
const {diagrams} = require('./data/thermal-diagrams');
const expected = require('./data/thermal-answers.json');
const sources = require('./data/thermal-sources.json');
const snapshot = require('./data/thermal-catalog.json');
const {verifyPhysics} = require('./data/thermal-checks');
const root = path.resolve(__dirname, '..');
const ids = Object.keys(records).sort();
function verifyContent() {
  assert.equal(ids.length,139,'Все тепловые задачи, кроме ранее опубликованной F717A0');
  for(const map of [diagrams,expected,sources])assert.deepEqual(Object.keys(map).sort(),ids);
  const catalog=readPhysicsCatalog();
  const section=[...catalog.values()].filter(t=>taskMatchesTopic(t,'2'));
  assert.equal(section.length,140);
  assert.deepEqual(section.map(t=>t.id).sort(),snapshot.map(t=>t.id).sort(),'Полный состав раздела');
  for(const item of snapshot) {
    const task=catalog.get(item.id);
    assert.equal(conditionSha256(task.contentHtml),item.conditionSha256,item.id+': исходное условие');
    assert.deepEqual(task.codes,item.sourceCodes,item.id+': исходные КЭС');
    const images=[...task.contentHtml.matchAll(/ShowPictureQ\(\s*['"]([^'"]+)['"]/g)].map(m=>m[1]);
    assert.deepEqual(images,item.images,item.id+': исходные рисунки');
  }
  assert.deepEqual(snapshot.filter(t=>['batch-1','completion'].includes(t.status)).map(t=>t.id).sort(),ids);
  for(const id of ids) {
    const r=records[id], all=r.answer+r.solution+r.diagramCaption;
    assert.equal(r.answer,expected[id],id+': ответ');
    assert.ok(r.solution.length>900 && r.solution.includes('Проверка') && r.solution.includes('Подстановка'),id+': полный вывод');
    assert.ok(!/<\/?[a-z][a-z0-9]*(?:\s[^>]*)?\/?>|\//i.test(all),id+': без HTML и косых дробей');
    const stack=[];
    for(const char of all) {
      if(char==='⟦')stack.push(0);
      if(char==='¦'){assert.ok(stack.length);stack[stack.length-1]++;}
      if(char==='⟧')assert.equal(stack.pop(),1,id+': дробь');
    }
    assert.equal(stack.length,0);
    assert.ok(diagrams[id].startsWith('<svg')&&diagrams[id].endsWith('</svg>'));
    assert.ok(diagrams[id].includes('data-thermal-diagram="'+id+'"'));
    assert.equal(r.stages.length,3);
    assert.equal(sources[id].conditionSha256,conditionSha256(catalog.get(id).contentHtml));
    assert.deepEqual(sources[id].images,snapshot.find(t=>t.id===id).images,id+': реестр исходных изображений');
    for(const file of sources[id].images){
      const bytes=require('node:fs').readFileSync(path.join(root,'fipi-assets',file));
      assert.ok(diagrams[id].includes(bytes.toString('base64')),id+': исходный растр сохранён целиком');
      assert.ok(diagrams[id].includes('data-fipi-source="'+file+'"'),id+': ссылка на исходный рисунок');
    }
    assert.ok(/^https:\/\/phys-ege\.sdamgia\.ru\/problem\?id=\d+$/.test(sources[id].reshu));
    assert.ok(sources[id].comparison.length>80&&sources[id].manuallyChecked);
  }
  verifyPhysics();
}
function apply(db) {
  const get=db.prepare('SELECT * FROM solutions WHERE upper(task_id)=?');
  const save=db.prepare(`INSERT INTO solutions(task_id,answer,solution,diagram_svg,diagram_caption,published,created_at,updated_at)
    VALUES(?,?,?,?,?,1,?,?) ON CONFLICT(task_id) DO UPDATE SET answer=excluded.answer,solution=excluded.solution,
    diagram_svg=excluded.diagram_svg,diagram_caption=excluded.diagram_caption,published=1,updated_at=excluded.updated_at`);
  let changed=0;db.exec('BEGIN IMMEDIATE');
  try {
    for(const id of ids) {
      const matches=get.all(id);assert.ok(matches.length<=1,`${id}: дубликаты регистра`);
      const old=matches[0],r=records[id];
      if(old && old.task_id!==id)db.prepare('UPDATE solutions SET task_id=? WHERE task_id=?').run(id,old.task_id);
      if(old?.task_id===id && old.published===1 && old.answer===r.answer && old.solution===r.solution && old.diagram_svg===diagrams[id] && old.diagram_caption===r.diagramCaption)continue;
      const now=new Date().toISOString();save.run(id,r.answer,r.solution,diagrams[id],r.diagramCaption,old?.created_at||now,now);changed++;
    }
    db.exec('COMMIT');
  } catch(e) {db.exec('ROLLBACK');throw e;}
  return changed;
}
function audit(db) {
  for(const id of ids) {
    const matches=db.prepare('SELECT * FROM solutions WHERE upper(task_id)=?').all(id),r=records[id];
    assert.equal(matches.length,1,`${id}: ровно одна запись`);const row=matches[0];
    assert.equal(row.task_id,id,`${id}: канонический регистр`);assert.equal(row.published,1,`${id}: опубликовано`);
    for(const [field,value] of Object.entries({answer:r.answer,solution:r.solution,diagram_svg:diagrams[id],diagram_caption:r.diagramCaption}))assert.equal(row[field],value,`${id}: база и проверенный набор (${field})`);
  }
  // Проверяем весь опубликованный состав раздела, а не только новый пакет.
  const sectionIds=new Set(snapshot.map(t=>t.id));
  const published=db.prepare('SELECT task_id FROM solutions WHERE published=1').all().map(r=>r.task_id).filter(id=>sectionIds.has(id)).sort();
  assert.deepEqual(published,[...ids,'F717A0'].sort(),'Все 140 решений в разделе 2');
  const previous=require('./data/waves-solutions').records.F717A0;
  const previousSvg=require('./data/waves-diagrams').diagrams.F717A0;
  const row=db.prepare('SELECT * FROM solutions WHERE task_id=?').get('F717A0');
  for(const [field,value] of Object.entries({answer:previous.answer,solution:previous.solution,diagram_svg:previousSvg,diagram_caption:previous.diagramCaption}))assert.equal(row[field],value,'F717A0: прежнее решение сохранено');
}
function main() {
  verifyContent();
  if(process.argv.includes('--content-only'))return console.log(JSON.stringify({checked:ids.length,status:'ok',database:false}));
  const at=process.argv.indexOf('--db');
  if(at>=0)assert.ok(process.argv[at+1],'После --db требуется путь');
  const db=new DatabaseSync(at<0?path.join(root,'storage/solutions.sqlite'):path.resolve(process.argv[at+1]),{readOnly:!process.argv.includes('--apply')});
  let changed=0;
  try {if(process.argv.includes('--apply'))changed=apply(db);audit(db);} finally {db.close();}
  console.log(JSON.stringify({checked:ids.length,sectionTasks:snapshot.length,publishedInSection:140,pending:0,changed,status:'ok'}));
}
if(require.main===module)main();
module.exports={main,verifyContent,verifyPhysics,apply,audit,ids};
