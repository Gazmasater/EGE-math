const assert = require('node:assert/strict');
const fs = require('node:fs');
const batches = require('./data/oge-physics-solutions');
const {readOgeCatalog} = require('./lib/oge-catalog');
const {ogeTaskMatchesTopic,ogeCataloguePath,OGE_PAGE_SIZE} = require('../lib/oge-catalog');
const origin = process.env.OGE_SITE_ORIGIN || 'http://127.0.0.1:8878';
const records = batches.flatMap(b=>b.records), ids = new Set(records.map(r=>r.id));
const tasks = readOgeCatalog(undefined,'oge-physics').tasks;
async function get(url) {
  const response = await fetch(origin+url,{signal:AbortSignal.timeout(30000)});
  assert.equal(response.status,200,url); return response;
}
async function main() {
  for (const r of records) {
    const api = await (await get('/api/solutions/'+r.id)).json();
    for (const [key,expected] of [['answer',r.answer],['solution',r.solution],['diagramSvg',r.diagram_svg],['diagramCaption',r.diagram_caption]]) assert.equal(api[key],expected,r.id+': '+key);
    const html = await (await get('/tasks/'+r.id)).text();
    assert.ok(html.includes(api.solutionHtml.trim()),r.id+': server-rendered solution');
    assert.ok(html.includes('data:image/svg+xml;base64,'),r.id+': server-rendered diagram');
  }
  let pages = 0;
  for (const {topic} of batches) {
    const selected = tasks.filter(t=>ogeTaskMatchesTopic(t,topic,'oge-physics'));
    for (let page=1;page<=Math.ceil(selected.length/OGE_PAGE_SIZE);page++) {
      const url = ogeCataloguePath({topic,page,section:'oge-physics'});
      const html = await (await get(url)).text();
      const actual = [...html.matchAll(/<div\s+class=['"][^'"]*\bqblock\b[^'"]*['"]\s+id=['"]q([A-Z0-9]+)['"]/gi)].map(m=>m[1]);
      const expected = selected.slice((page-1)*OGE_PAGE_SIZE,page*OGE_PAGE_SIZE).map(t=>t.id);
      assert.deepEqual(actual,expected,url+': catalogue membership');
      const published = JSON.parse(html.match(/const publishedSolutionIds = new Set\((\[[^;]*?\])\);/)[1]);
      assert.deepEqual(published.sort(),expected.filter(id=>ids.has(id)).sort(),url+': solution badges'); pages++;
    }
  }
  const report = {origin,checkedAt:new Date().toISOString(),solutions:records.length,cataloguePages:pages,status:'ok'};
  if(process.env.OGE_SOLUTION_REPORT)fs.writeFileSync(process.env.OGE_SOLUTION_REPORT,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
