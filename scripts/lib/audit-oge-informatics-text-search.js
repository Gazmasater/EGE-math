'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const evidence=require('../data/oge-informatics-text-search-evidence.json');
let verified;
function auditTextSearch(task,record){
 verified ||= JSON.parse(execFileSync('python3',[path.join(__dirname,'check-informatics-text-archive.py')],{encoding:'utf8',timeout:300000,maxBuffer:1024*1024}));
 const e=evidence[task.id];assert.ok(e && e.reviewed);
 assert.equal(record.answer,e.expectedAnswer,task.id+': answer');
 assert.ok(record.solution.includes(e.quote),task.id+': source quotation');
 for(const text of [e.title,e.query,path.basename(e.member)])assert.ok(record.solution.includes(text),task.id+': missing '+text);
 if(task.id==='OGEINFF73318')assert.ok(record.solution.includes('Артемий Павлович') && record.solution.includes('неоднозначность'),task.id+': ambiguity');
 return {kind:'text-search',archiveHash:verified.archiveHash,documentHash:e.memberHash,quoteLength:e.quote.length,rejectedEdits:0};
}
module.exports={auditTextSearch};
