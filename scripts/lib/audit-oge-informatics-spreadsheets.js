'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const evidence=require('../data/oge-informatics-spreadsheets-evidence.json');
const {solutionFile}=require('../../lib/solution-files');
let checked;
function auditSpreadsheet(task,record){
 const e=evidence[task.id];assert.ok(e?.reviewed);
 assert.equal(record.answer,e.answer,task.id+': answer');
 checked ||= JSON.parse(execFileSync('python3',[path.join(__dirname,'check-informatics-spreadsheets.py')],{encoding:'utf8',timeout:180000,maxBuffer:1024*1024}));
 assert.equal(solutionFile(task.id)?.sha256,e.fileHash);
 for(const text of [...e.resultCells,'Проверка и сохранение','ODS','легенду','G6',...e.chart.map(x=>x.label)])assert.ok(record.solution.includes(text),task.id+': missing '+text);
 return {kind:'spreadsheet',...checked[task.id],rejectedEdits:0};
}
module.exports={auditSpreadsheet};
