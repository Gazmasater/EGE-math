const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { records } = require('./data/kinematics-solutions');
const { diagrams } = require('./data/kinematics-diagrams');
const sources = require('./data/kinematics-sources.json');
const root = path.resolve(__dirname, '..');
const ids = Object.keys(records).sort();
const expected = {
  '083006':'1 с','34E52A':'5 м·с⁻¹','3848C6':'400 с','3D4BAC':'1000 м',
  '77E11B':'a_y=+12 м·с⁻²','854BA3':'2 м·с⁻¹','9AC6EF':'8√2 м·с⁻¹ ≈ 11,3 м·с⁻¹',
  '9AC70F':'5 м·с⁻²','B9584F':'10 м·с⁻¹','D01BEA':'1 с',
  'E24F06':'сила трения увеличится; в обоих опытах брусок покоится','E3DCE5':'200 с',
};
const close=(a,b,message)=>assert.ok(Math.abs(a-b)<1e-9,`${message}: ${a} ≠ ${b}`);
function verifyPhysics() {
  // Независимые обратные подстановки в условия, а не чтение чисел из готового текста.
  for(const a of [.1,1,7])close(a*(1+2)/(a*1),3,'083006: отношение скоростей');
  close(10*1+10/2,15,'B9584F: путь');close(10+10*1,2*10,'B9584F: удвоение скорости');
  close(5*2+5*2**2/2,20,'34E52A: путь');close((5+5*2)/5,3,'34E52A: рост скорости');
  close(15*2-5*2**2/2,20,'9AC70F: путь');close(15/(15-5*2),3,'9AC70F: падение скорости');
  for(const id of ['3D4BAC','E3DCE5']) {
    close(10-.05*200,0,`${id}: остановка`);close(10*200-.05*200**2/2,1000,`${id}: путь`);
  }
  close(.05*200,10,'3848C6: первая скорость');close(.05*200**2/2,1000,'3848C6: первый километр');
  close(.05*400**2/2,4000,'3848C6: полный путь');
  for(const a of [.1,1,7]) {const t=4/a;close(a*t*t/2,2*t,'854BA3: совпадение координат при v=4');}
  close(10-10*1,0,'D01BEA: горизонтальная скорость');close(10*1-10/2,5,'D01BEA: высота');
  close(8*.8,6.4,'9AC6EF: расстояние до забора');close(1.6+8*.8-5*.8**2,4.8,'9AC6EF: высота');
  close(8-10*.8,0,'9AC6EF: вершина');close((8*Math.sqrt(2))**2,8**2+8**2,'9AC6EF: модуль скорости');
  for(const [t,y] of [[0,0],[1,6],[2,24],[3,54]])close(12*t*t/2,y,'77E11B: шкала ФИПИ');
  for(const [h,horizontal] of [[50,120],[78,104]]) {
    close(h*h+horizontal**2,130**2,'E24F06: геометрия');
    assert.ok(h/horizontal<.8,'E24F06: покой возможен');
    close(h/130,.8*(horizontal/130)*(h/(.8*horizontal)),'E24F06: трение уравновешивает тяжесть вдоль доски');
  }
  close((78/130)/(50/130),1.56,'E24F06: рост действительной силы трения');
}
function verifyContent() {
  assert.deepEqual(ids,Object.keys(expected).sort(),'Полнота 12 решений');
  assert.deepEqual(ids,Object.keys(diagrams).sort(),'Полнота схем');
  assert.deepEqual(ids,Object.keys(sources).sort(),'Полнота сверки источников');
  const catalog=new Map();
  for(const file of fs.readdirSync(root).filter(f=>/^physics-\d+\.raw\.html$/.test(f))) {
    const html=new TextDecoder('windows-1251').decode(fs.readFileSync(path.join(root,file)));
    for(const block of html.split(/(?=<div\s+class=["'][^"']*\bqblock\b)/i)) {
      const match=block.match(/id=['"]q([A-Fa-f0-9]+)['"]/);
      if(match && /<div>1\.1(?:\.|\s)/.test(block)) {
        const id=match[1].toUpperCase();catalog.set(id,true);
        assert.equal(createHash('sha256').update(block).digest('hex'),sources[id]?.conditionSha256,`${id}: изменено условие ФИПИ; требуется новая сверка`);
      }
    }
  }
  assert.deepEqual([...catalog.keys()].sort(),ids,'Каталог ФИПИ и набор решений');
  for(const id of ids) {
    const r=records[id],all=r.solution+r.answer+r.diagramCaption;
    assert.equal(r.answer,expected[id],`${id}: ответ`);
    assert.ok(r.solution.length>600 && r.solution.includes('Проверка'),`${id}: полный вывод и обратная проверка`);
    assert.ok(r.solution.includes('Подстановка') && /Ось O|Оси O|Ox|Oy/.test(r.solution),`${id}: оси и вычисления`);
    assert.ok(!/<\/?[a-z][^>]*>|\//i.test(all),`${id}: текст без HTML и косых дробей`);
    const fractions=[];
    for(const char of all) {
      if(char==='⟦')fractions.push(0);
      if(char==='¦'){assert.ok(fractions.length,`${id}: лишний разделитель`);fractions[fractions.length-1]++;}
      if(char==='⟧')assert.equal(fractions.pop(),1,`${id}: структура дроби`);
    }
    assert.equal(fractions.length,0,`${id}: незакрытая дробь`);
    assert.ok(diagrams[id].startsWith('<svg') && diagrams[id].endsWith('</svg>'),`${id}: SVG`);
    assert.ok(diagrams[id].includes(`data-kinematics-diagram="${id}"`),`${id}: схема соответствует задаче`);
    if(sources[id].image)assert.ok(diagrams[id].includes(`data-fipi-source="${sources[id].image}"`),`${id}: оригинальный рисунок сохранён`);
    assert.ok(sources[id].comparison && /^https:\/\/phys-ege\.sdamgia\.ru\/problem\?id=\d+$/.test(sources[id].reshu),`${id}: независимая сверка`);
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
  const db=new DatabaseSync(at<0?path.join(root,'storage/solutions.sqlite'):path.resolve(process.argv[at+1]));
  let changed=0;
  try {if(process.argv.includes('--apply'))changed=apply(db);audit(db);} finally {db.close();}
  console.log(JSON.stringify({checked:ids.length,changed,status:'ok'}));
}
if(require.main===module)main();
module.exports={main,verifyContent,verifyPhysics,apply,audit,ids};
