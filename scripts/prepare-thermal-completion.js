// Reproducible metadata generation; never touches the production database.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),data=path.join(__dirname,'data');
const {records}=require('./data/thermal-new');
const sources=require('./data/thermal-sources.json');
const answers=require('./data/thermal-answers.json');
const snapshot=require('./data/thermal-catalog.json');
for(const[id,r]of Object.entries(records)){
 const t=snapshot.find(t=>t.id===id);assert.ok(t);
 const comparison=r.comparison;
 sources[id]={fipi:'https://ege.fipi.ru/bank/index.php?proj=BA1F39653304A5B041B656915DC36B38',file:t.file,images:t.images,conditionSha256:t.conditionSha256,reshu:`https://phys-ege.sdamgia.ru/problem?id=${r.source}`,match:comparison.startsWith('Точное совпадение')?'exact':comparison.includes('Методический')?'method-analogue':'variant',comparison,manuallyChecked:true,checkedAt:'2026-09-21',fipiAccess:'Проверены сохранённое условие ФИПИ и исходные растры. Онлайн-банк при повторной проверке завершился тайм-аутом; исходный состав не менялся.'};
 answers[id]=r.answer;
 if(t.status==='pending')t.status='completion';
}
for(const[name,value]of [['thermal-sources.json',sources],['thermal-answers.json',answers],['thermal-catalog.json',snapshot]])fs.writeFileSync(path.join(data,name),JSON.stringify(value,null,2)+'\n');
console.log(JSON.stringify({newRecords:Object.keys(records).length,canonicalRecords:Object.keys(answers).length,section:snapshot.length}));
