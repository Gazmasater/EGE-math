// Read-only research: downloads public reference pages, emits a local research report.
const fs=require('node:fs');
const path=require('node:path');
const {conditionText}=require('../lib/seo-text');
const {readPhysicsCatalog}=require('./lib/physics-catalog');
const snapshot=require('./data/thermal-catalog.json');
const out=process.argv[2];
if(!out)throw Error('Research output directory required');
function clean(h){return conditionText(h.replace(/<img\b[^>]*alt="([^"]*)"[^>]*>/g,' $1 ')).replace(/\u00ad/g,'');}
function words(t){return new Set(t.toLowerCase().match(/[а-яё]{3,}/g)||[]);}
async function main(){
  const refs={};
  for(const category of ['category_id=302','category_id=307','theme=306','theme=308','theme=309','theme=310','extra_id=252','extra_id=253','extra_id=256','category_id=398']){
    const url=`https://phys-ege.sdamgia.ru/test?${category}&filter=all&print=true`;
    const html=await(await fetch(url)).text();
    fs.writeFileSync(path.join(out,`reference-${category}.html`),html);
    const starts=[...html.matchAll(/<span style="text-indent:0" class="outer_number">/g)].map(m=>m.index);
    for(let i=0;i<starts.length;i++){
      const block=html.slice(starts[i],starts[i+1]||html.length);
      const id=block.match(/href="\/problem\?id=(\d+)"/)?.[1];if(!id)continue;
      const txt=clean(block), body=txt.slice(txt.indexOf(' i ')+3).split('Критерии проверки:')[0];
      refs[id]={id,url:`https://phys-ege.sdamgia.ru/problem?id=${id}`,condition:body.split(/Решение\s*\./)[0],text:body};
    }
  }
  fs.writeFileSync(path.join(out,'references.json'),JSON.stringify(refs,null,2));
  const catalog=readPhysicsCatalog();
  const matches=snapshot.filter(t=>['pending','completion'].includes(t.status)).map(t=>{
    const condition=conditionText(catalog.get(t.id).contentHtml),w=words(condition);
    const top=Object.values(refs).map(r=>{const v=words(r.condition),n=[...w].filter(x=>v.has(x)).length;return {id:r.id,score:n/(w.size+v.size-n),condition:r.condition};}).sort((a,b)=>b.score-a.score).slice(0,3);
    return {id:t.id,condition,top};
  });
  fs.writeFileSync(path.join(out,'matches.json'),JSON.stringify(matches,null,2));
  console.log(JSON.stringify({references:Object.keys(refs).length,matches:matches.length,out}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
