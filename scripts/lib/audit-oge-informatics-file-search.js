'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {conditionText}=require('../../lib/seo-text');
let archive;
function auditFileSearch(task,record){
  archive ||= JSON.parse(execFileSync('python3',[path.join(__dirname,'check-informatics-file-archive.py')],{encoding:'utf8',maxBuffer:1024*1024}));
  const text=conditionText(task.fragment), expression=text.match(/расширени(?:ем|ями) (.*?) содержится/u)[1];
  const extensions=new Set(expression.replaceAll('.','').split(/[,\s]+/u).filter(s=>s!=='и'));
  const regions=text.split(/а также/u);const folders=[];
  for(const region of regions){
    const scoped=region.match(/подкаталог(?:е|ах) (.+?) каталога DEMO-12\/(Проза|Поэзия|Живопись)/u);
    if(scoped){for(const name of scoped[1].split(/, | и /u)) folders.push('DEMO-12/'+scoped[2]+'/'+name.trim());}
    else {const whole=region.match(/подкаталогах каталога (DEMO-12|Проза|Поэзия|Живопись)/u);assert.ok(whole,task.id+': scope');folders.push(whole[1]==='DEMO-12'?'DEMO-12':'DEMO-12/'+whole[1]);}
  }
  const selected=archive.paths.filter(p=>extensions.has(p.split('.').at(-1)) && folders.some(f=>p.startsWith(f+'/')));
  assert.equal(record.answer,String(selected.length),task.id+': answer');
  for(const f of folders){
    const found=selected.filter(p=>p.startsWith(f+'/'));
    assert.ok(record.solution.includes(f.replaceAll('/',' → ')+': '+found.length+'.'),task.id+': subtotal');
    for(const p of found)assert.ok(record.solution.includes('«'+p.slice(f.length+1).replaceAll('/',' → ')+'»'),task.id+': missing file '+p);
  }
  for(const ext of extensions)assert.ok(record.solution.includes('«*.'+ext+'»'),task.id+': extension');
  return {kind:'file-search',archiveHash:archive.archiveHash,matchedFiles:selected.length,folders:folders.length,rejectedEdits:0};
}
module.exports={auditFileSearch};
