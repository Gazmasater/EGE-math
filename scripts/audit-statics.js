const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { records } = require('./data/statics-solutions');
const { diagrams } = require('./data/statics-diagrams');
const sources = require('./data/statics-sources.json');
const root = path.resolve(__dirname, '..');
const ids = Object.keys(records).sort();
const expected = {
  '0CDBF9':'2,8 кг','1F1FD6':'1250 кг·м⁻³','27EF85':'55,6 см','29960D':'850 кг·м⁻³',
  '2A7ADB':'1,44 кг','2E71C0':'350 Н','328102':'5 Н','36135B':'20 Н','418761':'0,35',
  '62CDEC':'увеличится на 0,9 Н','652146':'60 см','6AB9E6':'25 Н','7018C7':'4 см',
  '7733A6':'90 кг','7823C1':'0,004 Н','904771':'11,2 Н','A1B57A':'26 см','A48FB7':'867 кг·м⁻³',
  'A69E10':'30°','B468EB':'0,16 кг','B938AE':'20 см','BBC367':'68,3 см','CFC86C':'45°',
  'D59EAC':'2,23 кг','DB692A':'800 кг·м⁻³','DEAB32':'4 кг','E9B775':'13 Н','EB0004':'3 кг',
  'F5E61D':'20 см','F9BE3E':'10 Н',
};
function close(a,b,msg,tol=1e-9) { assert.ok(Math.abs(a-b)<tol,`${msg}: ${a} ≠ ${b}`); }
const rad=d=>d*Math.PI/180;
function verifyPhysics() {
  // Проверяем силы и моменты независимо от форматированного текста и округлённых ответов.
  close(10**2+(2*Math.sqrt(2)*10)**2,30**2,'0CDBF9: треугольник сил');
  close(3+1000*10*4e-4/2,1250*4e-4*10,'1F1FD6: вертикальные силы');
  close(1000/4+800*3/4,850,'29960D: плотность');
  close((1000+2*800)/3,866.6666666666666,'A48FB7: плотность до округления');
  close((15/(10*Math.sqrt(13/12)))**2*100*13/12,225,'2A7ADB: реакция');
  close(350*4,75*10*1.6+10*10*2,'2E71C0: моменты');
  close(1000*10*.01*.05,5,'328102: изменение вытесненного объёма');
  for(const [id,BC,N] of [['36135B',2,20],['F9BE3E',1,10]]) {
    close(3*10*BC*Math.sin(rad(45)),N*3*Math.cos(rad(45)),`${id}: моменты относительно нижнего конца`);
  }
  close(.5*.07,.35*.10,'418761: моменты составного блока');
  assert.ok((.5-.51)<0,'418761: за пределом требуется отрицательная координата реакции');
  close(900*10*1e-4,.9,'62CDEC: изменение натяжения');
  close((5/3)*.2+(10/3)*.8,.3*10,'652146: моменты');
  const ironT=2.5*10*(1-1000/7800)/Math.cos(rad(30));
  close(ironT*Math.cos(rad(30))+1000*10*2.5/7800,25,'6AB9E6: силы');
  for(const [id,m,N] of [['7018C7',.0018,.008],['7823C1',.0009,.004]]) {
    const H=Math.sqrt(.1**2-4*.04**2),FA=.75*m*10*.04/H;
    close(N*H+FA*.04*.04/H,m*10*.04,`${id}: моменты`);
    assert.ok(m*10-FA>0,`${id}: контакт с дном`);
  }
  close(1000*.25*(.4-.04),90,'7733A6: вытесненная вода');
  close((5*Math.sqrt(5))**2,10**2+5**2,'904771: составляющие реакции');
  close(800*10*(.30-.10),1000*10*(.26-.10),'A1B57A: гидростатика');
  close(Math.cos(rad(30))/Math.sin(rad(30)),Math.sqrt(3),'A69E10: отношение реакций');
  const plate=(5*1.6*Math.cos(rad(45))-2*.05*10)/(3*10);
  close(3*plate*10+2*.05*10,5*1.6*Math.cos(rad(45)),'B468EB: моменты');
  close(.25*10*(.6/2-.2),.125*10*.2,'B938AE: опрокидывание');
  for(const [id,m1,m2,M,a,b,l] of [['27EF85',.1,.2,.2,45,15,.556186217847897],['BBC367',.2,.1,.1,30,30,.6830127018922193]]) {
    close(M*10*l*Math.sin(rad(a+b)),m1*10*.25*Math.sin(rad(a))+m2*10*l*Math.sin(rad(a)),`${id}: моменты`,1e-8);
  }
  const a=rad(45),N=10*Math.cos(a),T=10*Math.sin(a)/2;
  close(T,.5*N,'CFC86C: предел трения');close(T+T,10*Math.sin(a),'CFC86C: силы');
  const rodM=.4*(5+Math.tan(rad(30)));
  close(rodM*10*Math.cos(rad(30))/2,10*Math.cos(rad(30))+2*Math.sin(rad(30)),'D59EAC: моменты');
  close(6+1000*10*(1.6/800)/2,16,'DB692A: силы');
  close(45*.4,20*.2+40*.35,'DEAB32: моменты');close(45/15,3,'DEAB32: пружины');
  close(13+700*10*.001,20,'E9B775: силы');
  close(40*.3,30*.15+30*.25,'EB0004: моменты');close(40/20,2,'EB0004: пружины');
  close(12.8*.2,3.2*.8,'F5E61D: воздух');close(10.8*.1,1.2*.9,'F5E61D: вода');
}
function verifyContent() {
  assert.deepEqual(ids,Object.keys(expected).sort(),'Полнота 30 решений');
  assert.deepEqual(ids,Object.keys(diagrams).sort(),'Полнота 30 схем');
  assert.deepEqual(ids,Object.keys(sources).sort(),'Полнота источников');
  const catalog = new Set();
  for(const file of fs.readdirSync(root).filter(f=>/^physics-\d+\.raw\.html$/.test(f))) {
    const html=new TextDecoder('windows-1251').decode(fs.readFileSync(path.join(root,file)));
    const blocks=html.split(/(?=<div\s+class=["'][^"']*\bqblock\b)/i);
    for(const block of blocks) {
      const id=block.match(/id=['"]q([A-Fa-f0-9]+)['"]/);
      if(id && /<div>1\.3(?:\.[1-6])?\s/.test(block))catalog.add(id[1].toUpperCase());
    }
  }
  assert.deepEqual([...catalog].sort(),ids,'Каталог ФИПИ и набор решений должны совпадать');
  for(const id of ids) {
    const r=records[id];assert.equal(r.answer,expected[id],`${id}: ответ`);
    assert.ok(r.solution.length>600,`${id}: развёрнутое решение`);
    assert.ok(r.solution.includes('Проверка')||r.solution.includes('проверка'),`${id}: обратная проверка`);
    assert.ok(!/<\/?[a-z][^>]*>|\//i.test(r.solution+r.answer),`${id}: обычный текст и вертикальные дроби`);
    assert.ok(r.solution.includes('Oy')&&r.solution.includes('Подстановка'),`${id}: оси и подстановка`);
    assert.equal([...r.solution].filter(c=>c==='⟦').length,[...r.solution].filter(c=>c==='⟧').length,`${id}: скобки дробей`);
    if(sources[id].image)assert.ok(diagrams[id].includes('data-fipi-source='),`${id}: рисунок ФИПИ сохранён`);
    assert.ok(sources[id].comparison && sources[id].reshu,`${id}: нет независимой сверки`);
  }
  verifyPhysics();
}
function apply(db) {
  const save=db.prepare(`INSERT INTO solutions(task_id,answer,solution,diagram_svg,diagram_caption,published,created_at,updated_at)
    VALUES(?,?,?,?,?,1,?,?) ON CONFLICT(task_id) DO UPDATE SET answer=excluded.answer,solution=excluded.solution,
    diagram_svg=excluded.diagram_svg,diagram_caption=excluded.diagram_caption,published=1,updated_at=excluded.updated_at`);
  const get=db.prepare('SELECT * FROM solutions WHERE task_id=?');
  let changed=0;
  db.exec('BEGIN IMMEDIATE');
  try {
    for(const id of ids) {
      const r=records[id],old=get.get(id);
      if(old && old.answer===r.answer && old.solution===r.solution && old.diagram_svg===diagrams[id] && old.diagram_caption===r.diagramCaption && old.published===1)continue;
      const now=new Date().toISOString();save.run(id,r.answer,r.solution,diagrams[id],r.diagramCaption,now,now);changed++;
    }
    db.exec('COMMIT');
  } catch(e) { db.exec('ROLLBACK');throw e; }
  return changed;
}
function audit(db) {
  const get=db.prepare('SELECT * FROM solutions WHERE task_id=?');
  for(const id of ids) {
    const row=get.get(id),r=records[id];assert.ok(row&&row.published===1,`${id}: не опубликовано`);
    for(const [field,value] of Object.entries({answer:r.answer,solution:r.solution,diagram_svg:diagrams[id],diagram_caption:r.diagramCaption})) {
      assert.equal(row[field],value,`${id}: база расходится с проверенным набором (${field})`);
    }
  }
  assert.equal(db.prepare("SELECT count(*) AS n FROM solutions WHERE lower(task_id) IN ('b468eb','f5e61d')").get().n,2,'Нет дубликатов регистра');
}
function main() {
  verifyContent();
  const at=process.argv.indexOf('--db');
  const file=at>=0?path.resolve(process.argv[at+1]):path.join(root,'storage/solutions.sqlite');
  const db=new DatabaseSync(file);let changed=0;
  try { if(process.argv.includes('--apply'))changed=apply(db);audit(db); }
  finally { db.close(); }
  console.log(JSON.stringify({checked:ids.length,changed,status:'ok'}));
}
if(require.main===module)main();
module.exports={main,verifyContent,verifyPhysics,apply,audit,ids};
