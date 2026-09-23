// Public reference research only. Candidate similarity is never proof of a match.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {conditionText}=require('../lib/seo-text');
const catalog=require('./data/electrodynamics-catalog.json');
const out=process.argv[2];assert.ok(out,'Research output directory required');
fs.mkdirSync(out,{recursive:true});
const clean=h=>conditionText(h.replace(/<img\b[^>]*alt="([^"]*)"[^>]*>/g,' $1 ')).replace(/\u00ad/g,'');
const words=t=>new Set(t.toLowerCase().match(/[а-яё]{3,}/g)||[]);
async function main(){
 const registry=path.join(out,'references.json');
 const refs=fs.existsSync(registry)?JSON.parse(fs.readFileSync(registry,'utf8')):{};
 const categories=['category_id=300','category_id=277','category_id=320','category_id=311','category_id=310','category_id=318','category_id=313','category_id=279','extra_id=290','extra_id=304','category_id=327',...process.argv.slice(3)];
 for(const key of categories){
  const file=path.join(out,'reference-'+key+'.html');let html=fs.existsSync(file)?fs.readFileSync(file,'utf8'):'';
  if(!/<span style="text-indent:0" class="outer_number">/.test(html)){
   const response=await fetch('https://phys-ege.sdamgia.ru/test?'+key+'&filter=all&print=true',{signal:AbortSignal.timeout(45000)});
   assert.equal(response.status,200,key);html=await response.text();
   assert.ok(/<span style="text-indent:0" class="outer_number">/.test(html),key+': no public tasks');
   fs.writeFileSync(file,html);
  }
  const starts=[...html.matchAll(/<span style="text-indent:0" class="outer_number">/g)].map(m=>m.index);
  for(let i=0;i<starts.length;i++){
   const block=html.slice(starts[i],starts[i+1]||html.length),id=block.match(/href="\/problem\?id=(\d+)"/)?.[1];if(!id)continue;
   const txt=clean(block),body=txt.slice(txt.indexOf(' i ')+3).split('Критерии проверки:')[0];
   refs[id]={id,url:'https://phys-ege.sdamgia.ru/problem?id='+id,condition:body.split(/Решение\s*\./)[0],text:body,archive:path.basename(file)};
  }
  fs.writeFileSync(path.join(out,'references.json'),JSON.stringify(refs,null,2));console.log(key,starts.length,'total',Object.keys(refs).length);
 }
 const matches=catalog.filter(t=>t.status!=='previously-published').map(t=>{
  const w=words(t.condition),top=Object.values(refs).map(r=>{const v=words(r.condition),n=[...w].filter(x=>v.has(x)).length;return{id:r.id,score:n/(w.size+v.size-n),condition:r.condition}}).sort((a,b)=>b.score-a.score).slice(0,3);
  return{id:t.id,condition:t.condition,top};
 });
 fs.writeFileSync(path.join(out,'matches.json'),JSON.stringify(matches,null,2));
 console.log(JSON.stringify({references:Object.keys(refs).length,candidates:matches.length,out}));
}
main().catch(e=>{console.error(e);process.exitCode=1});
