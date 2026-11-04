'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{execFileSync}=require('node:child_process');
const {conditionText}=require('../../lib/seo-text'),{auditPrimaryImage}=require('./ege-informatics-number-sequence-machine');
const root=path.resolve(__dirname,'../..');
function model(text){
 const q=text.slice(text.lastIndexOf('Используя'));assert.ok(q.length>100);
 const dates=q.match(/с (\d+) по (\d+) июня/);assert.ok(dates);assert.ok(text.includes('июня 2025 г.'));
 const product=q.includes('шоколада массой 100 г')?'Шоколад ':q.includes('крахмала картофельного')?'Крахмал картофельный':q.includes('карамели')?'Карамель':q.includes('зефира')?'Зефир':null;assert.ok(product);
 const district=q.includes('Промышленного района')?'Промышленный':q.includes('Октябрьского района')?'Октябрьский':q.includes('Центрального района')?'Центральный':null;
 const street=q.includes('Металлургов')?'Металлургов':q.includes('Прибрежной улице')?'Прибрежная':null;assert.ok(Boolean(district)!==Boolean(street));
 const sale=/продан|продажи/.test(q);assert.ok(sale||/поступившего|полученного/.test(q));
 const measure=q.includes('выручку')?'rubles':q.includes('упаковок шоколада')?'packages':q.includes('целую часть')?'kg-floor':'kg';
 return {start:Number(dates[1]),end:Number(dates[2]),operation:sale?'Продажа':'Поступление',product,...(product==='Шоколад '?{grams:100}:{}),...(district?{district}:{street}),measure};
}
function fraction(n,d=1){const gcd=(a,b)=>b?gcd(b,a%b):a;const g=gcd(n,d);return d===g?String(n/g):`${n/g}/${d/g}`;}
function solve(sheets,c){
 assert.deepEqual(Object.keys(sheets).sort(),['Движение_товаров','Магазин','Товар'].sort());
 const goods=new Map(sheets['Товар'].slice(1).map(r=>[r[0],r])),stores=new Map(sheets['Магазин'].slice(1).map(r=>[r[0],r]));
 assert.equal(goods.size,sheets['Товар'].length-1);assert.equal(stores.size,sheets['Магазин'].length-1);
 const rows=sheets['Движение_товаров'],headers=rows[0],qty=headers.findIndex(s=>s.startsWith('Количество упаковок')),op=headers.indexOf('Тип операции');assert.ok(qty>=0&&op>=0);
 assert.ok(headers[0].startsWith('ID')&&headers[1]==='Дата'&&headers[2].includes('магазина')&&headers[3]==='Артикул');
 const selectedGoods=[...goods.values()].filter(r=>r[2].startsWith(c.product)&&(!c.grams||r[3]==='грамм'&&r[4]===c.grams));
 const selectedStores=[...stores.values()].filter(r=>c.district?r[1]===c.district:r[2].includes(c.street));
 const gids=new Set(selectedGoods.map(r=>r[0])),sids=new Set(selectedStores.map(r=>r[0]));assert.ok(gids.size&&sids.size);
 const scale=['kg','kg-floor'].includes(c.measure)?1000:1,stages=[0,0,0,0],matches=[],byArticle=new Map(),byDate=new Map(),seen=new Set();let total=0,packages=0;
 const add=(map,key,q,n)=>{const v=map.get(key)||{key,packages:0,amount:0};v.packages+=q;v.amount+=n;map.set(key,v);};
 for(const row of rows.slice(1)){
  assert.equal(row.length,headers.length);assert.ok(!seen.has(row[0]));seen.add(row[0]);assert.ok(goods.has(row[3])&&stores.has(row[2]));assert.ok(Number.isSafeInteger(row[qty])&&row[qty]>=0);assert.ok(['Продажа','Поступление'].includes(row[op]));
  if(!gids.has(row[3]))continue;stages[0]++;
  if(!sids.has(row[2]))continue;stages[1]++;
  if(row[1]<'2025-06-'+String(c.start).padStart(2,'0')||row[1]>'2025-06-'+String(c.end).padStart(2,'0'))continue;stages[2]++;
  if(row[op]!==c.operation)continue;stages[3]++;
  const g=goods.get(row[3]),q=row[qty];let factor=1;
  if(c.measure==='rubles')factor=g[5];
  else if(scale===1000){assert.ok(['грамм','кг'].includes(g[3]));factor=g[4]*(g[3]==='кг'?1000:1);}
  assert.ok(Number.isSafeInteger(factor)&&factor>0);const n=q*factor;assert.ok(Number.isSafeInteger(n));
  total+=n;packages+=q;matches.push({operationId:row[0],date:row[1],store:row[2],article:row[3],packages:q,amount:fraction(n,scale)});
  add(byArticle,row[3],q,n);add(byDate,row[1],q,n);
 }
 const group=map=>[...map.values()].sort((a,b)=>a.key<b.key?-1:a.key>b.key?1:0).map(v=>({...v,amount:fraction(v.amount,scale)}));
 assert.ok(c.measure==='kg-floor'||total%scale===0);assert.ok(Number.isSafeInteger(total));
 return {answer:String(Math.floor(total/scale)),exactAmount:fraction(total,scale),config:c,sheetRows:Object.fromEntries(Object.entries(sheets).map(([k,v])=>[k,v.length-1])),goods:selectedGoods,stores:selectedStores,stages,matched:matches.length,packages,matches,byArticle:group(byArticle),byDate:group(byDate)};
}
function compute(task,data,readFile=fs.readFileSync){
 const text=conditionText(task.fragment);assert.equal(text,data.condition,'changed primary condition');const c=model(text);assert.deepEqual(c,data.result.config,'changed selection criteria');
 const links=[...task.fragment.matchAll(/href=["'](\/fipi\/ege-informatics\/[^"']+\.ods)["']/g)].map(m=>m[1]);assert.deepEqual(links,[data.url],'changed primary file URL');
 const file=path.resolve(root,data.url.slice(1).replace(/^fipi\//,'fipi-assets/'));assert.ok(file.startsWith(root+'/fipi-assets/ege-informatics/'));
 assert.equal(createHash('sha256').update(readFile(file)).digest('hex'),data.fileSha256,'changed primary data file');
 const sheets=JSON.parse(execFileSync('python3',[path.join(__dirname,'read-ege-informatics-database-ods.py'),file],{encoding:'utf8',timeout:60000,maxBuffer:8*1024*1024}));
 const result=solve(sheets,c);assert.deepEqual(result,data.result,'changed database calculation');return result;
}
module.exports={model,solve,compute,auditPrimaryImage};
