'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createHash}=require('node:crypto');
const {execFileSync}=require('node:child_process');
const content=require('../data/oge-informatics-presentations-content.json');
const {solutionFile}=require('../../lib/solution-files');
let checked;
function auditPresentationImages(task){
 const images=content[task.id]?.primaryImages;
 assert.ok(images?.length>=3,task.id+': missing reviewed slide layouts');
 const srcs=[...task.fragment.split('КЭС:')[0].matchAll(/<img[^>]+src=["']([^"']+)/gu)].map(m=>m[1]);
 assert.deepEqual(srcs,images.map(i=>i.src),task.id+': changed slide layout images');
 for(const item of images){
  assert.ok(item.reviewed&&item.src.startsWith('/fipi/')&&!item.src.includes('..'));
  const file=path.join(__dirname,'../../fipi-assets',item.src.slice('/fipi/'.length));
  assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'),item.sha256,task.id+': slide layout hash');
 }
 return images;
}
function auditPresentation(task,record){
 const m=content[task.id];assert.ok(m?.reviewed);
 assert.equal(record.answer,'Презентация ODP доступна для скачивания',task.id+': answer');
 checked ||= JSON.parse(execFileSync('python3',[path.join(__dirname,'check-informatics-presentations.py')],{encoding:'utf8',timeout:180000,maxBuffer:1024*1024}));
 assert.equal(solutionFile(task.id)?.sha256,checked[task.id].fileHash);
 for(const text of [...m.blocks,'40 пунктов','24 пункта','20 пунктов','16:9','Номер участника: ______','Проверка и сохранение','.odp'])assert.ok(record.solution.includes(text),task.id+': missing '+text);
 return {kind:'presentation',...checked[task.id],rejectedEdits:0};
}
module.exports={auditPresentation,auditPresentationImages};
