const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {DatabaseSync}=require('node:sqlite');
const {readMathematicsCatalog}=require('./lib/mathematics-catalog');
const inventory=require('./data/math-completion-catalog.json');
const batches=require('./data/math-completion-batches');

const root=path.resolve(__dirname,'..');
const args=process.argv.slice(2);
const option=name=>{const i=args.indexOf(name);return i<0?null:args[i+1];};
const dbFile=path.resolve(option('--db')||path.join(root,'storage/solutions.sqlite'));
const apply=args.includes('--apply'), contentOnly=args.includes('--content-only');
const catalog=readMathematicsCatalog();
assert.deepEqual([...catalog.keys()].sort(),inventory.map(t=>t.id).sort(),'FIPI catalog changed');
for(const entry of inventory)assert.equal(catalog.get(entry.id).sourceHash,entry.sourceHash,`${entry.id}: condition changed`);
const selected=option('--batch');
const active=batches.filter(b=>!selected||b.name===selected);
assert.ok(active.length,'Unknown batch');
const records=active.flatMap(batch=>{
 const prepared=[...catalog.values()].flatMap(task=>{
  const record=batch.solve(task);if(!record)return [];
  assert.equal(inventory.find(t=>t.id===task.id).status,'pending',`${task.id}: previous solution must not be rewritten`);
  const source=batch.sources[task.id];assert.ok(source?.reviewed&&source.url&&source.comparison,`${task.id}: source not reviewed`);
  assert.equal(source.sourceHash,task.sourceHash,`${task.id}: stale source review`);
  assert.equal(record.answer,source.expectedAnswer,`${task.id}: reviewed answer differs`);
  assert.ok(record.solution.length>=250,`${task.id}: incomplete explanation`);
  // Не принимать цепочку 0<x<49 ... x>49 за HTML-тег.
  assert.ok(!record.solution.includes('/')&&!record.answer.includes('/')&&!/<\/?[a-z][a-z0-9-]*(?:\s[^<>]*?)?\s*\/?>/i.test(record.solution),`${task.id}: invalid plain-text formatting`);
  batch.verify(record);
  return [record];
 });
 assert.equal(prepared.length,batch.count,`${batch.name}: section must be complete`);
 return prepared;
});
assert.equal(new Set(records.map(r=>r.id)).size,records.length,'Duplicate task in batches');
let changed=0,publishedCount=0;
if(!contentOnly){
  const db=new DatabaseSync(dbFile,{readOnly:!apply});
  try {
    const read=db.prepare('SELECT * FROM solutions WHERE task_id=?');
    const insert=apply?db.prepare('INSERT INTO solutions (task_id,answer,solution,diagram_svg,diagram_caption,published,created_at,updated_at) VALUES (?,?,?,?,?,1,?,?)'):null;
    if(apply)db.exec('BEGIN IMMEDIATE');
    for(const record of records){
      let row=read.get(record.id);
      if(!row&&apply){const now=new Date().toISOString();insert.run(record.id,record.answer,record.solution,record.diagram_svg,record.diagram_caption,now,now);changed++;row=read.get(record.id);}
      assert.ok(row,`${record.id}: not published`);
      for(const key of ['answer','solution','diagram_svg','diagram_caption'])assert.equal(row[key],record[key],`${record.id}: ${key} differs`);
      assert.equal(row.published,1,`${record.id}: unpublished row must be reviewed explicitly`);
    }
    const published=new Set(db.prepare('SELECT task_id FROM solutions WHERE published=1').all().map(row=>row.task_id));
    publishedCount=[...catalog.keys()].filter(id=>published.has(id)).length;
    if(args.includes('--complete'))assert.equal(publishedCount,catalog.size,'All mathematics solutions are required');
    if(apply)db.exec('COMMIT');
  }catch(error){if(apply)db.exec('ROLLBACK');throw error;}finally{db.close();}
}
console.log(JSON.stringify({catalog:catalog.size,prepared:records.length,changed,publishedMathematics:publishedCount,remaining:contentOnly?null:catalog.size-publishedCount}));
