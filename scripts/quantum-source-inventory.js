// Public reference candidates; similarity is not a substitute for manual review.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {conditionText}=require('../lib/seo-text');
const catalog=require('./data/quantum-catalog.json');
assert.ok(process.argv[2],'Research output directory required');
const out=path.resolve(process.argv[2]);fs.mkdirSync(out,{recursive:true});
const clean=h=>conditionText(h.replace(/<img\b[^>]*alt="([^"]*)"[^>]*>/g,' $1 ')).replace(/\u00ad/g,'');
const words=t=>new Set(t.toLowerCase().match(/[а-яё]{3,}/g)||[]);
async function main(){
 const registry=path.join(out,'references.json'),refs=fs.existsSync(registry)?JSON.parse(fs.readFileSync(registry)):{};
 const categories=['category_id=301','category_id=331','category_id=334','category_id=280','category_id=314','category_id=315',...process.argv.slice(3)];
 for(const key of categories){
  assert.match(key,/^(category_id|extra_id|likes)=\d+$/);
  const file=path.join(out,'reference-'+key+'.html');let html=fs.existsSync(file)?fs.readFileSync(file,'utf8'):'';
  if(!/<span style="text-indent:0" class="outer_number">/.test(html)){
   const response=await fetch('https://phys-ege.sdamgia.ru/test?'+key+'&filter=all&print=true',{signal:AbortSignal.timeout(45000)});
   assert.equal(response.status,200,key);html=await response.text();
   assert.ok(/<span style="text-indent:0" class="outer_number">/.test(html),key+': no public tasks');fs.writeFileSync(file,html);
  }
  const starts=[...html.matchAll(/<span style="text-indent:0" class="outer_number">/g)].map(m=>m.index);
  for(let i=0;i<starts.length;i++){
   const block=html.slice(starts[i],starts[i+1]||html.length),id=block.match(/href="\/problem\?id=(\d+)"/)?.[1];if(!id)continue;
   const txt=clean(block),body=txt.slice(txt.indexOf(' i ')+3).split('Критерии проверки:')[0];
   refs[id]={id,url:'https://phys-ege.sdamgia.ru/problem?id='+id,condition:body.split(/Решение\s*\./)[0],text:body,archive:path.basename(file)};
  }
  fs.writeFileSync(registry,JSON.stringify(refs,null,2));console.log(key,starts.length,'total',Object.keys(refs).length);
 }
 const matches=catalog.map(t=>{const w=words(t.condition),top=Object.values(refs).map(r=>{const v=words(r.condition),n=[...w].filter(x=>v.has(x)).length;return{id:r.id,score:n/(w.size+v.size-n),condition:r.condition}}).sort((a,b)=>b.score-a.score).slice(0,4);return{id:t.id,condition:t.condition,top};});
 fs.writeFileSync(path.join(out,'matches.json'),JSON.stringify(matches,null,2));console.log(JSON.stringify({references:Object.keys(refs).length,candidates:matches.length,out}));
}
main().catch(e=>{console.error(e);process.exitCode=1});
