// Bounded, sequential Chrome lifetimes; full catalog is checked in every batch.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const topic=process.env.PHYSICS_REVIEW_TOPIC||'electrodynamics';
assert.ok(['electrodynamics','quantum'].includes(topic));
const catalog=require('./data/'+topic+'-catalog.json');
const ids=(process.env.PHYSICS_TASK_IDS?process.env.PHYSICS_TASK_IDS.split(','):catalog.map(t=>t.id)).sort();
const out=path.resolve(process.env.PHYSICS_ARTIFACTS),size=Number(process.env.PHYSICS_BATCH_SIZE||7);
assert.ok(size>0&&size<=35);fs.mkdirSync(out,{recursive:true});
async function main(){
 const summary={topic,origin:process.env.PHYSICS_ORIGIN,pages:[],svg:[],catalog:[],errors:[],batches:[]};
 for(let i=0;i<ids.length;i+=size){
  const batch=ids.slice(i,i+size),dir=path.join(out,'batch-'+String(i/size+1).padStart(2,'0'));
  const child=spawn(process.execPath,[path.join(__dirname,'check-physics-pages.js'),'--topic',topic],{env:{...process.env,PHYSICS_TASK_IDS:batch.join(','),PHYSICS_ARTIFACTS:dir},stdio:'inherit'});
  const [code,signal]=await new Promise(resolve=>child.once('exit',(code,signal)=>resolve([code,signal])));
  assert.equal(code,0,'Browser batch failed: '+batch.join(',')+'; signal '+signal);
  const r=JSON.parse(fs.readFileSync(path.join(dir,'report.json')));assert.equal(r.pages.length,2*batch.length);assert.equal(r.svg.length,batch.length);assert.equal(r.catalog.length,catalog.length);assert.deepEqual(r.errors,[]);
  summary.pages.push(...r.pages);summary.svg.push(...r.svg);summary.catalog=r.catalog;summary.batches.push({ids:batch,report:path.join(dir,'report.json')});
  fs.writeFileSync(path.join(out,'combined-report.json'),JSON.stringify(summary,null,2));
  console.log('COMPLETED',i+batch.length,'/',ids.length);
 }
 assert.equal(new Set(summary.svg.map(r=>r.id)).size,ids.length);
 console.log(JSON.stringify({pages:summary.pages.length,svg:summary.svg.length,catalog:catalog.length,errors:0,out}));
}
main().catch(e=>{console.error(e);process.exitCode=1});
