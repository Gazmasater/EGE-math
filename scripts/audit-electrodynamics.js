const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {DatabaseSync}=require('node:sqlite');
const {readPhysicsCatalog}=require('./lib/physics-catalog');
const {taskMatchesTopic,conditionSha256}=require('../lib/physics-topics');
const {records}=require('./data/electrodynamics-solutions');
const {diagrams}=require('./data/electrodynamics-diagrams');
const {verifyPhysics}=require('./data/electrodynamics-checks');
const snapshot=require('./data/electrodynamics-catalog.json');
const root=path.resolve(__dirname,'..'),production=path.join(root,'storage/solutions.sqlite');
const ids=Object.keys(records).sort(),previous=['030E68','963FCF'];
function source(id){const t=snapshot.find(t=>t.id===id),r=records[id];return{fipi:'https://ege.fipi.ru/bank/index.php?proj=BA1F39653304A5B041B656915DC36B38',file:t.file,images:t.images,conditionSha256:t.conditionSha256,reshu:`https://phys-ege.sdamgia.ru/problem?id=${r.source}`,match:r.comparison.startsWith('Точное совпадение')?'exact':r.comparison.includes('Методический')?'method-analogue':'variant',comparison:r.comparison,manuallyChecked:true,checkedAt:'2026-09-21',fipiAccess:'Проверены сохранённое исходное условие и растры ФИПИ. Онлайн-банк при повторном запросе вернул ошибку; первичные данные не изменены.'};}
function verifyContent({draft=false}={}){
 const catalog=readPhysicsCatalog(),section=[...catalog.values()].filter(t=>taskMatchesTopic(t,'3'));
 assert.equal(section.length,213);assert.deepEqual(section.map(t=>t.id).sort(),snapshot.map(t=>t.id).sort());
 assert.deepEqual(Object.keys(diagrams).sort(),ids);
 for(const t of snapshot){const actual=catalog.get(t.id);assert.equal(conditionSha256(actual.contentHtml),t.conditionSha256,t.id+': условие');assert.deepEqual(actual.codes,t.sourceCodes,t.id+': исходные КЭС');const images=[...actual.contentHtml.matchAll(/ShowPictureQ\(\s*['"]([^'"]+)['"]/g)].map(m=>m[1]);assert.deepEqual(images,t.images,t.id+': оригинальные изображения');}
 if(!draft)assert.deepEqual(ids,snapshot.filter(t=>!previous.includes(t.id)).map(t=>t.id).sort(),'Для публикации обязательны все 211 новых решений');
 for(const id of ids){const r=records[id],all=r.answer+r.solution+r.diagramCaption;assert.ok(snapshot.some(t=>t.id===id)&&!previous.includes(id));
  assert.ok(r.solution.length>900&&r.solution.includes('Проверка')&&/Подстановка|подстановка/.test(r.solution),id+': полный вывод');
  assert.ok(!/<\/?[a-z][a-z0-9]*(?:\s[^>]*)?\/?>|\//i.test(all),id+': HTML или косая дробь');
  const stack=[];for(const c of all){if(c==='⟦')stack.push(0);if(c==='¦'){assert.ok(stack.length);stack[stack.length-1]++;}if(c==='⟧')assert.equal(stack.pop(),1,id+': дробь');}assert.equal(stack.length,0);
  assert.equal(r.stages.length,3);assert.ok(Number.isInteger(r.source)&&r.source>0&&r.comparison.length>80,id+': независимая сверка');
  assert.ok(diagrams[id].includes('data-physics-diagram="'+id+'"'));for(const file of source(id).images)assert.ok(diagrams[id].includes(fs.readFileSync(path.join(root,'fipi-assets',file)).toString('base64')),id+': полный исходный растр');
 }
 verifyPhysics();return{section:213,drafts:ids.length,previous:2,pending:211-ids.length};
}
function apply(db){
 const get=db.prepare('SELECT * FROM solutions WHERE upper(task_id)=?');
 const save=db.prepare('INSERT INTO solutions(task_id,answer,solution,diagram_svg,diagram_caption,published,created_at,updated_at) VALUES(?,?,?,?,?,1,?,?)');
 let changed=0;db.exec('BEGIN IMMEDIATE');try{for(const id of ids){const rows=get.all(id),r=records[id];assert.ok(rows.length<=1,id+': duplicate');if(rows.length){for(const[k,v]of Object.entries({task_id:id,answer:r.answer,solution:r.solution,diagram_svg:diagrams[id],diagram_caption:r.diagramCaption,published:1}))assert.equal(rows[0][k],v,id+': существующая запись защищена от перезаписи');continue;}const now=new Date().toISOString();save.run(id,r.answer,r.solution,diagrams[id],r.diagramCaption,now,now);changed++;}db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}return changed;
}
function audit(db,{draft=false}={}){
 for(const id of ids){const r=records[id],row=db.prepare('SELECT * FROM solutions WHERE task_id=?').get(id);assert.ok(row,id+': отсутствует в базе');for(const[k,v]of Object.entries({answer:r.answer,solution:r.solution,diagram_svg:diagrams[id],diagram_caption:r.diagramCaption,published:1}))assert.equal(row[k],v,id+': '+k);}
 for(const[id,group]of [['030E68','conservation'],['963FCF','waves']]){const r=require('./data/'+group+'-solutions').records[id],svg=require('./data/'+group+'-diagrams').diagrams[id],row=db.prepare('SELECT * FROM solutions WHERE task_id=?').get(id);for(const[k,v]of Object.entries({answer:r.answer,solution:r.solution,diagram_svg:svg,diagram_caption:r.diagramCaption,published:1}))assert.equal(row[k],v,id+': ранее опубликованное решение сохранено');}
 if(!draft){const section=new Set(snapshot.map(t=>t.id));assert.equal(db.prepare('SELECT task_id FROM solutions WHERE published=1').all().filter(r=>section.has(r.task_id)).length,213);}
}
function main(){const draft=process.argv.includes('--draft'),state=verifyContent({draft});if(process.argv.includes('--content-only'))return console.log(JSON.stringify({...state,status:'ok',database:false}));
 const at=process.argv.indexOf('--db');if(at>=0)assert.ok(process.argv[at+1]);const file=at<0?production:path.resolve(process.argv[at+1]);
 if(draft&&process.argv.includes('--apply'))assert.notEqual(fs.realpathSync(file),fs.realpathSync(production),'Черновики запрещено публиковать в рабочую базу');
 const db=new DatabaseSync(file,{readOnly:!process.argv.includes('--apply')});try{const changed=process.argv.includes('--apply')?apply(db):0;audit(db,{draft});console.log(JSON.stringify({...state,changed,status:'ok'}));}finally{db.close();}
}
if(require.main===module)main();module.exports={ids,records,source,verifyContent,verifyPhysics,apply,audit};
