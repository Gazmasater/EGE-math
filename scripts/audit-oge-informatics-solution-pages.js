const assert = require('node:assert/strict');
const fs = require('node:fs');
const {createHash} = require('node:crypto');
const {solutionFile} = require('../lib/solution-files');
const selectedBatches = process.env.OGE_INF_BATCH?.split(',');
const allBatches = require('./data/oge-informatics-solutions');
const batches = allBatches.filter(b => !selectedBatches || selectedBatches.includes(b.name));
assert.ok(batches.length, 'No solution batches selected');
const {readOgeCatalog} = require('./lib/oge-catalog');
const {ogeTaskMatchesTopic,ogeCataloguePath,OGE_PAGE_SIZE} = require('../lib/oge-catalog');
const origin = process.env.OGE_SITE_ORIGIN || 'http://127.0.0.1:8888';
const records = batches.flatMap(b=>b.records), ids = new Set(allBatches.flatMap(b=>b.records.map(r=>r.id)));
const tasks = readOgeCatalog(undefined,'oge-informatics').tasks;
const concurrency = Number(process.env.OGE_HTTP_CONCURRENCY || 4);
assert.ok(Number.isInteger(concurrency) && concurrency >= 1 && concurrency <= 8, 'HTTP concurrency must be 1–8');
async function eachBounded(items, visit) {
  let next = 0, failure;
  await Promise.all(Array.from({length: Math.min(concurrency, items.length)}, async () => {
    while (!failure) {
      const index = next++;
      if (index >= items.length) return;
      try { await visit(items[index]); } catch (error) { failure = error; }
    }
  }));
  if (failure) throw failure;
}
async function get(url) {
  const response = await fetch(origin+url,{signal:AbortSignal.timeout(30000)});
  assert.equal(response.status,200,url); return response;
}
async function main() {
  await eachBounded(records, async r => {
    const api = await (await get('/api/solutions/'+r.id)).json();
    for (const [key,expected] of [['answer',r.answer],['solution',r.solution],['diagramSvg',r.diagram_svg],['diagramCaption',r.diagram_caption]]) assert.equal(api[key],expected,r.id+': '+key);
    const html = await (await get('/tasks/'+r.id)).text();
    assert.ok(html.includes(api.solutionHtml.trim()),r.id+': server-rendered solution');
    const file=solutionFile(r.id);
    if(file){
      assert.ok(api.solutionHtml.includes(`href="${file.url}"`),r.id+': download link in API and SSR');
      const response=await get(file.url),data=Buffer.from(await response.arrayBuffer());
      assert.equal(response.headers.get('content-type'),file.contentType,r.id+': file media type');
      assert.equal(data.length,file.bytes,r.id+': downloaded file size');
      assert.equal(createHash('sha256').update(data).digest('hex'),file.sha256,r.id+': downloaded file hash');
    }
    if (r.diagram_svg) assert.ok(html.includes('data:image/svg+xml;base64,'),r.id+': server-rendered diagram');
  });
  let pages = 0;
  for (const topic of new Set(batches.map(b=>b.topic))) {
    const selected = tasks.filter(t=>ogeTaskMatchesTopic(t,topic,'oge-informatics'));
    for (let page=1;page<=Math.ceil(selected.length/OGE_PAGE_SIZE);page++) {
      const url = ogeCataloguePath({topic,page,section:'oge-informatics'});
      const html = await (await get(url)).text();
      const actual = [...html.matchAll(/<div\s+class=['"][^'"]*\bqblock\b[^'"]*['"]\s+id=['"]q([A-Z0-9]+)['"]/gi)].map(m=>m[1]);
      const expected = selected.slice((page-1)*OGE_PAGE_SIZE,page*OGE_PAGE_SIZE).map(t=>t.id);
      assert.deepEqual(actual,expected,url+': catalogue membership');
      const config = html.match(/<script id="catalogue-config" type="application\/json">([\s\S]*?)<\/script>/);
      assert.ok(config, url + ': catalogue configuration');
      const published = JSON.parse(config[1]).publishedSolutionIds;
      assert.deepEqual(published.sort(),expected.filter(id=>ids.has(id)).sort(),url+': solution badges'); pages++;
    }
  }
  const report = {origin,checkedAt:new Date().toISOString(),solutions:records.length,cataloguePages:pages,status:'ok'};
  if(process.env.OGE_SOLUTION_REPORT)fs.writeFileSync(process.env.OGE_SOLUTION_REPORT,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
