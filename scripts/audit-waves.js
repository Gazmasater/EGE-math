const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { records } = require('./data/waves-solutions');
const { diagrams } = require('./data/waves-diagrams');
const sources = require('./data/waves-sources.json');
const root = path.resolve(__dirname, '..');
const ids = Object.keys(records).sort();
const expected = require('./data/waves-answers.json');
function verifyPhysics() { require('./data/waves-checks').verifyPhysics(); }
function verifyContent() {
  assert.equal(ids.length,5,'Число задач текущего раздела КЭС 1.5');
  assert.deepEqual(ids,Object.keys(expected).sort(),'Полнота 5 решений');
  assert.deepEqual(ids,Object.keys(diagrams).sort(),'Полнота схем');
  assert.deepEqual(ids,Object.keys(sources).sort(),'Полнота сверки источников');
  const catalog=new Map();
  for(const file of fs.readdirSync(root).filter(f=>/^physics-\d+\.raw\.html$/.test(f))) {
    const html=new TextDecoder('windows-1251').decode(fs.readFileSync(path.join(root,file)));
    for(const block of html.split(/(?=<div\s+class=["'][^"']*\bqblock\b)/i)) {
      const match=block.match(/id=['"]q([A-Fa-f0-9]+)['"]/);
      if(match && /<div>1\.5(?:\.|\s)/.test(block)) {
        const id=match[1].toUpperCase();catalog.set(id,true);
        const images=Array.from(block.matchAll(/ShowPictureQ\(\s*['"]([^'"]+)['"]/g),m=>m[1]);
        assert.deepEqual(sources[id]?.images,images,`${id}: все рисунки ФИПИ учтены`);
        assert.equal(createHash('sha256').update(block).digest('hex'),sources[id]?.conditionSha256,`${id}: изменено условие ФИПИ; требуется новая сверка`);
      }
    }
  }
  assert.deepEqual([...catalog.keys()].sort(),ids,'Каталог ФИПИ и набор решений');
  for(const id of ids) {
    const r=records[id],all=r.solution+r.answer+r.diagramCaption;
    assert.equal(r.answer,expected[id],`${id}: ответ`);
    assert.ok(r.solution.length>600 && r.solution.includes('Проверка'),`${id}: полный вывод и обратная проверка`);
    assert.ok(/подстановка/i.test(r.solution) && /[Оо]с[ьи] O|Ox|Oy/.test(r.solution),`${id}: оси и вычисления`);
    assert.ok(!/<\/?[a-z][a-z0-9]*(?:\s[^>]*)?\/?>|\//i.test(all),`${id}: текст без HTML и косых дробей`);
    const fractions=[];
    for(const char of all) {
      if(char==='⟦')fractions.push(0);
      if(char==='¦'){assert.ok(fractions.length,`${id}: лишний разделитель`);fractions[fractions.length-1]++;}
      if(char==='⟧')assert.equal(fractions.pop(),1,`${id}: структура дроби`);
    }
    assert.equal(fractions.length,0,`${id}: незакрытая дробь`);
    assert.ok(diagrams[id].startsWith('<svg') && diagrams[id].endsWith('</svg>'),`${id}: SVG`);
    assert.ok(diagrams[id].includes(`data-waves-diagram="${id}"`),`${id}: схема соответствует задаче`);
    for(const img of sources[id].images)assert.ok(diagrams[id].includes(`data-fipi-source="${img}"`),`${id}: оригинальный рисунок сохранён`);
    assert.ok(sources[id].comparison && /^https:\/\/phys-ege\.sdamgia\.ru\/problem\?id=\d+$/.test(sources[id].reshu),`${id}: независимая сверка`);
    assert.equal(sources[id].manuallyChecked,true,`${id}: ручная проверка условия и расхождений`);
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
}
function main() {
  verifyContent();
  if(process.argv.includes('--content-only'))return console.log(JSON.stringify({checked:ids.length,status:'ok',database:false}));
  const at=process.argv.indexOf('--db');
  if(at>=0)assert.ok(process.argv[at+1],'После --db требуется путь');
  const db=new DatabaseSync(at<0?path.join(root,'storage/solutions.sqlite'):path.resolve(process.argv[at+1]));
  let changed=0;
  try {if(process.argv.includes('--apply'))changed=apply(db);audit(db);} finally {db.close();}
  console.log(JSON.stringify({checked:ids.length,changed,status:'ok'}));
}
if(require.main===module)main();
module.exports={main,verifyContent,verifyPhysics,apply,audit,ids};
