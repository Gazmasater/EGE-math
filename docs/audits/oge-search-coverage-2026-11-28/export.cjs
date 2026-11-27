'use strict';
// Read published educational content only. Never read users, leads or comments.
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {DatabaseSync} = require('node:sqlite');
const root = process.argv[2] || '/root/projects/ege-math';
const {readOgeCatalog} = require(path.join(root, 'scripts/lib/oge-catalog'));
const {conditionText, decodeEntities} = require(path.join(root, 'lib/seo-text'));
const {ogeTopicCodes, ogeTopicInfo, ogeTaskMatchesTopic, OGE_PAGE_SIZE} = require(path.join(root, 'lib/oge-catalog'));
const hash = s => createHash('sha256').update(s).digest('hex');
const db = new DatabaseSync(path.join(root, 'storage/solutions.sqlite'), {readOnly:true});
const solutions = new Map(db.prepare('SELECT task_id,answer,solution,diagram_svg,diagram_caption,created_at,updated_at FROM solutions WHERE published=1').all().map(x=>[x.task_id,x]));
const banks = {}, tasks = [];
for (const section of ['oge','oge-physics','oge-informatics','ege-informatics']) {
  const bank = readOgeCatalog(root, section);
  banks[section] = bank.tasks.map(t=>t.id);
  if (section !== 'oge') continue;
  const topicPositions = new Map();
  for (const [index,t] of bank.tasks.entries()) {
    const s = solutions.get(t.id), condition = conditionText(t.fragment);
    const block = t.fragment.split(/<div\s+id=['"]i[A-Z0-9]+['"]/i)[0];
    // Original image bytes, rather than image URLs, distinguish figure variants.
    const images = [...block.matchAll(/<img\b[^>]*\bsrc=['"]([^'"]+)['"][^>]*>/gi)].map(m=>{
      const url = decodeEntities(m[1]);
      const relative = url.replace(/^\/fipi\/oge\//,'');
      const file = path.resolve(root,'fipi-assets/oge',relative);
      const exists = file.startsWith(path.join(root,'fipi-assets/oge')+path.sep) && fs.existsSync(file) && fs.statSync(file).isFile();
      return {url,sha256:exists?hash(fs.readFileSync(file)):null};
    });
    const codes = ogeTopicCodes(t, 'oge');
    const links = ['all',...new Set(codes.flatMap(c=>[c,c.split('.')[0]]))].map(code=>{
      if (!topicPositions.has(code)) {
        const set=bank.tasks.filter(x=>ogeTaskMatchesTopic(x,code,'oge'));
        topicPositions.set(code,{total:set.length,positions:new Map(set.map((x,i)=>[x.id,i]))});
      }
      const set=topicPositions.get(code),n=set.positions.get(t.id);
      return {topic:code,index:n,page:Math.floor(n/OGE_PAGE_SIZE)+1,total:set.total};
    });
    tasks.push({id:t.id,index,codes,topicNames:codes.map(c=>ogeTopicInfo(c,'oge')?.name),condition,images,
      textHash:hash(condition),visualHash:hash(JSON.stringify([condition,images.map(x=>x.sha256 || x.url)])),
      published:!!s,answer:s?.answer,solution:s?.solution,createdAt:s?.created_at,updatedAt:s?.updated_at,
      solutionHash:s?hash(JSON.stringify([s.answer,s.solution,s.diagram_svg,s.diagram_caption])):null,links});
  }
}
db.close();
// EGE raw snapshots cover all math parts; these ID sets need no user data.
for (const [name,pattern] of [['ege-physics',/^physics-\d+\.raw\.html$/],['ege-math',/^(?:mathematics-\d+|questions(?:-\d+)?|planimetry(?:-\d+)?|parameters(?:-\d+)?|equations-\d+|inequalities-\d+|optimal(?:-all-\d+)?|numbers(?:-\d+)?|finance(?:-\d+)?)\.raw\.html$/]]) {
  const ids=new Set();
  for(const file of fs.readdirSync(root).filter(x=>pattern.test(x))) {
    const raw=new TextDecoder('windows-1251').decode(fs.readFileSync(path.join(root,file)));
    for(const m of raw.matchAll(/<div\s+class=['"][^'"]*\bqblock\b[^'"]*['"]\s+id=['"]q([A-Z0-9]+)['"]/gi)) ids.add(m[1].toUpperCase());
  }
  banks[name]=[...ids];
}
console.log(JSON.stringify({generatedUtc:new Date().toISOString(),banks,tasks}));
