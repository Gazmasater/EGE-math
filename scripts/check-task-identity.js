'use strict';
const assert=require('node:assert/strict');
const origin=process.env.TASK_IDENTITY_ORIGIN||'http://127.0.0.1:8765';
async function run(){
  let checks=0;
  for(const id of ['2AF210','2af210']){
    const r=await fetch(origin+'/tasks/'+id+'?ref=identity-check',{redirect:'manual'});
    assert.equal(r.status,301);assert.equal(r.headers.get('location'),'/tasks/534193?ref=identity-check');checks++;
  }
  for(const id of ['2AF210','534193']){
    const r=await fetch(origin+'/search?q='+id,{redirect:'manual'});
    assert.equal(r.status,302);assert.equal(r.headers.get('location'),'/tasks/534193');checks++;
    const api=await fetch(origin+'/api/solutions/'+id);assert.equal(api.status,200);
    assert.equal((await api.json()).taskId,id);checks++;
  }
  const r=await fetch(origin+'/tasks/534193');assert.equal(r.status,200);const text=await r.text();
  assert.match(text,/data-fipi-task-ids>[^<]*<strong>534193<\/strong>, <strong>2AF210<\/strong>/);
  assert.match(text,/id="solution-2AF210"/);assert.match(text,/<link rel="canonical" href="https:\/\/ege-fipi\.ru\/tasks\/534193">/);checks++;
  const graph=JSON.parse(text.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'][0];
  assert.deepEqual(graph.identifier,['534193','2AF210']);checks++;
  const search=await (await fetch(origin+'/search?q='+encodeURIComponent('Период свободных электромагнитных колебаний'))).text();
  const links=[...search.matchAll(/<li><a href="(\/tasks\/[^\"]+)"/g)].map(m=>m[1]);
  assert.equal(links.filter(url=>url==='/tasks/534193').length,1);assert.ok(!links.includes('/tasks/2AF210'));checks++;
  console.log(JSON.stringify({origin,checks,originalIdsPreserved:true,singleTaskPage:true}));
}
run().catch(error=>{console.error(error);process.exitCode=1;});
