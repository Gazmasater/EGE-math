'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');const {conditionText}=require(root+'/lib/seo-text');
function model(condition){
 if(condition.includes('«вечер» или «Вечер»')){assert.ok(condition.includes('не считая сносок'));return {terms:['вечер','Вечер'],chapters:null,part:null,wholeOnly:false};}
 if(condition.includes('«по» или «По»')){assert.ok(condition.includes('главы III')&&condition.includes('дефисом'));return {terms:['по','По'],chapters:['III'],part:null,wholeOnly:false};}
 if(condition.includes('«Ромашов»')){assert.ok(condition.includes('главы V')&&condition.includes('с прописной'));return {terms:['Ромашов'],chapters:['V'],part:null,wholeOnly:true};}
 assert.ok(condition.includes('«то» или «То»')&&condition.includes('глав I и III')&&condition.includes('третьей части тома 2'));return {terms:['то','То'],chapters:['I','III'],part:'ЧАСТЬ ТРЕТЬЯ',wholeOnly:false};
}
function scopes(paragraphs,m){
 if(!m.chapters)return [{chapter:'all',startParagraph:0,endParagraph:paragraphs.length,text:paragraphs.join('\n')}];
 const start=m.part?paragraphs.findIndex(s=>s.trim()===m.part):0;assert.ok(start>=0);const nextPart=m.part?paragraphs.findIndex((s,i)=>i>start&&/^ЧАСТЬ /u.test(s.trim())):-1;const limit=nextPart<0?paragraphs.length:nextPart;
 return m.chapters.map(ch=>{const a=paragraphs.findIndex((s,i)=>i>=start&&i<limit&&s.trim()===ch);assert.ok(a>=0,'missing chapter');const b=paragraphs.findIndex((s,i)=>i>a&&i<limit&&/^[IVXLCDM]+$/u.test(s.trim()));assert.ok(b>a,'missing next chapter');return {chapter:ch,startParagraph:a,endParagraph:b,text:paragraphs.slice(a+1,b).join('\n')};});
}
function count(text,m){
 const pattern=new RegExp(m.terms.join('|'),'gu'),all=[...text.matchAll(pattern)],selected=[],whole=[];
 for(const token of text.matchAll(/[A-Za-zА-Яа-яЁё]+(?:[-‑][A-Za-zА-Яа-яЁё]+)*/gu))for(const hit of token[0].matchAll(new RegExp(m.terms.join('|'),'gu'))){const exact=token[0]===hit[0],position=token.index+hit.index;if(exact)whole.push(position);if(m.wholeOnly?exact:!exact)selected.push(position);}
 return {allOccurrences:all.length,wholeWords:whole.length,answer:selected.length,selectedPositions:selected};
}
function solve(paragraphs,m){const pieces=scopes(paragraphs,m).map(({text,...scope})=>({...scope,...count(text,m)}));return {answer:String(pieces.reduce((n,p)=>n+p.answer,0)),pieces};}
function compute(task,data,readFile=fs.readFileSync){
 const condition=conditionText(task.fragment);assert.equal(condition,data.condition,'changed primary condition');const m=model(condition);assert.deepEqual(m,data.model,'changed model');
 const links=[...task.fragment.matchAll(/href=["'](\/fipi\/ege-informatics\/[^"']+\.odt)["']/g)].map(x=>x[1]);assert.deepEqual(links,[data.url],'changed file URL');const filename=path.resolve(root,data.url.slice(1).replace(/^fipi\//,'fipi-assets/'));assert.ok(filename.startsWith(root+'/fipi-assets/ege-informatics/'));
 const bytes=readFile(filename);assert.equal(createHash('sha256').update(bytes).digest('hex'),data.fileSha256,'changed file');const parsed=JSON.parse(execFileSync('python3',[path.join(__dirname,'read-ege-informatics-odt.py')],{input:bytes,encoding:'utf8',timeout:30000,maxBuffer:8*1024*1024}));assert.equal(parsed.notes,data.notes);assert.equal(createHash('sha256').update(JSON.stringify(parsed.paragraphs)).digest('hex'),data.paragraphsSha256,'changed decoded text');const result=solve(parsed.paragraphs,m);assert.deepEqual(result,data.result,'changed calculation');return result;
}
module.exports={model,scopes,count,solve,compute};
