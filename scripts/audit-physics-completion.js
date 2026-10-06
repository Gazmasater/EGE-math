const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {DatabaseSync}=require('node:sqlite');
const {readPhysicsCatalog}=require('./lib/physics-catalog');
const {conditionSha256}=require('../lib/physics-topics');
const {conditionText}=require('../lib/seo-text');
const inventory=require('./data/physics-completion-catalog.json');
const batches=require('./data/physics-completion-batches');
const root=path.resolve(__dirname,'..'),args=process.argv.slice(2);
const option=name=>{const i=args.indexOf(name);return i<0?null:args[i+1];};
const catalog=readPhysicsCatalog(root,{allAnswerTypes:true});
assert.deepEqual([...catalog.keys()].sort(),inventory.map(t=>t.id).sort());
for(const t of inventory)assert.equal(conditionSha256(catalog.get(t.id).contentHtml),t.sourceHash,t.id+': changed condition');
const active=batches.filter(b=>!option('--batch')||b.name===option('--batch'));
assert.ok(active.length,'No batches');
const prepared=[];
for(const b of active){
 assert.equal(b.records.length,b.count,b.name+': incomplete batch');b.verify();
 for(const r of b.records){
  const t=inventory.find(t=>t.id===r.id),source=b.sources[r.id];
  assert.ok(t&&!t.published,r.id+': previous solution protected');
  assert.ok(source?.reviewed&&source.comparison.length>80&&source.url.startsWith('https://phys-ege.sdamgia.ru/problem?id='),r.id+': review');
  assert.ok(!/\bundefined\b/.test(source.comparison),r.id+': incomplete source comparison');
  if(['molecular-gas','molecular-matter','thermodynamics-heat','thermodynamics-gas','thermodynamics-engines','thermal-changes','thermal-matching','thermal-statements','thermal-graphs','electricity-field','electricity-circuits','measurement-indirect','measurement-direct','experiment-equipment','experiment-tables','experiment-pictures','gravity','elasticity','friction','forces','momentum','energy'].includes(b.name))assert.equal(source.fipiCondition,conditionText(catalog.get(r.id).contentHtml),r.id+': review condition');
  if(['statics-short','oscillations-short','magnetism-field','induction','em-oscillations','optics','electro-changes','kinematics-graphs','mechanics-changes','mechanics-matching','mechanics-analysis-graphs','mechanics-analysis-statements','electro-matching','electro-statements','laws-statements','laws-graphs','electro-analysis-graphs','recovered-figures','final-figures'].includes(b.name))assert.equal(source.fipiCondition,conditionText(catalog.get(r.id).contentHtml),r.id+': review condition');
  assert.equal(source.sourceHash,t.sourceHash,r.id+': stale review');assert.equal(source.expectedAnswer,r.answer,r.id+': answer');
  assert.ok(r.solution.length>600&&r.solution.includes('Проверка'),r.id+': full explanation');
  const text=r.answer+r.solution+r.diagram_caption;
  assert.ok(!/<\/?[a-z][a-z0-9]*(?:\s[^<>]*?)?\s*\/?>|\//i.test(text),r.id+': plain text formatting');
  const stack=[];for(const c of text){if(c==='⟦')stack.push(0);if(c==='¦'){assert.ok(stack.length);stack[stack.length-1]++;}if(c==='⟧')assert.equal(stack.pop(),1,r.id+': fraction');}assert.equal(stack.length,0);
  assert.ok(r.diagram_svg.includes('data-physics-diagram="'+r.id+'"'),r.id+': diagram');
  for(const file of t.images)assert.ok(r.diagram_svg.includes(fs.readFileSync(path.join(root,'fipi-assets',file)).toString('base64')),r.id+': original image');
  prepared.push(r);
 }
}
assert.equal(new Set(prepared.map(r=>r.id)).size,prepared.length);
let changed=0,published=0,part2=0;
if(!args.includes('--content-only')){
 const apply=args.includes('--apply'),db=new DatabaseSync(path.resolve(option('--db')||path.join(root,'storage/solutions.sqlite')),{readOnly:!apply});
 try{
  if(apply)db.exec('BEGIN IMMEDIATE');
  const read=db.prepare('SELECT * FROM solutions WHERE upper(task_id)=?');
  const insert=apply?db.prepare('INSERT INTO solutions(task_id,answer,solution,diagram_svg,diagram_caption,published,created_at,updated_at) VALUES(?,?,?,?,?,1,?,?)'):null;
  for(const r of prepared){let rows=read.all(r.id);assert.ok(rows.length<=1,r.id+': duplicate');
   if(!rows.length&&apply){const now=new Date().toISOString();insert.run(r.id,r.answer,r.solution,r.diagram_svg,r.diagram_caption,now,now);changed++;rows=read.all(r.id);}
   assert.equal(rows.length,1,r.id+': missing');for(const k of ['answer','solution','diagram_svg','diagram_caption'])assert.equal(rows[0][k],r[k],r.id+': '+k);assert.equal(rows[0].published,1);
  }
  if(option('--baseline')){const before=new DatabaseSync(path.resolve(option('--baseline')),{readOnly:true});try{for(const row of before.prepare('SELECT * FROM solutions').all())assert.deepEqual(read.get(row.task_id),row,row.task_id+': previous row changed');}finally{before.close();}}
  const ids=new Set(db.prepare('SELECT task_id FROM solutions WHERE published=1').all().map(t=>t.task_id));
  published=inventory.filter(t=>ids.has(t.id)).length;part2=inventory.filter(t=>t.part===2&&ids.has(t.id)).length;
  if(args.includes('--complete'))assert.equal(published,inventory.length,'Physics is incomplete');
  if(apply)db.exec('COMMIT');
 }catch(e){if(apply)db.exec('ROLLBACK');throw e;}finally{db.close();}
}
console.log(JSON.stringify({catalog:catalog.size,prepared:prepared.length,changed,publishedPhysics:published,part2,remaining:args.includes('--content-only')?null:catalog.size-published,status:'ok'}));
