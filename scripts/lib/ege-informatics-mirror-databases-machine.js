'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),sha=b=>createHash('sha256').update(b).digest('hex'),cache=new Map();
function conditionModel(text){
 const q=text.slice(text.indexOf('Используя информацию')),dates=q.match(/за период с[оo]?\s*(\d+) по (\d+) (июня|августа|сентября|октября)/u),year=text.match(/(20\d\d) г\./u);assert(dates&&year);
 const month={июня:'06',августа:'08',сентября:'09',октября:'10'}[dates[3]],m={start:year[1]+'-'+month+'-'+dates[1].padStart(2,'0'),end:year[1]+'-'+month+'-'+dates[2].padStart(2,'0'),truncate:q.includes('целую часть')};
 const districts={Промышленного:'Промышленный',Октябрьского:'Октябрьский',Первомайского:'Первомайский',Заречного:'Заречный',Прибрежного:'Прибрежный',Центрального:'Центральный',Нагорного:'Нагорный'};
 const ds=Object.entries(districts).filter(([k])=>q.includes(k+' района'));if(ds.length){assert.equal(ds.length,1);m.store={field:'district',value:ds[0][1]};}
 else{const ss=Object.entries({'Широкой улице':'Широкая улица,','Тургеневской улице':'Тургеневская,','улице Металлургов':'ул. Металлургов','проспекте Мира':'просп. Мира,','Луговой улице':'Луговая,','проспекте Революции':'просп. Революции,'}).filter(([k])=>q.includes(k));assert.equal(ss.length,1);m.store={field:'addressPrefix',value:ss[0][1]};}
 const products=[['«Суфле в шоколаде»',{names:['Суфле в шоколаде']}],['«Клюква в сахаре»',{names:['Клюква в сахаре']}],['крахмала картофельного',{names:['Крахмал картофельный']}],['пряников тульских с начинкой',{names:['Пряник тульский с начинкой']}],['антисептика для рук',{names:['Антисептик для рук гель']}],['соды пищевой',{names:['Сода пищевая']}],['яиц диетических',{names:['Яйцо диетическое']}],['салфеток косметических',{names:['Салфетки косметические в коробке']}],['варенца термостатного',{names:['Варенец термостатный']}],['всех видов риса',{prefix:'Рис '}],['всех видов макарон производителя «Макаронная фабрика»',{prefix:'Макароны ',manufacturer:'Макаронная фабрика'}],['паштета (фермерского с грибами и из куриной печени)',{names:['Паштет фермерский с грибами','Паштет из куриной печени']}],['ряженки (всех имеющихся видов)',{prefix:'Ряженка '}],['всех видов карамели',{prefix:'Карамель '}],['всех видов шампуня для волос',{prefix:'Шампунь для '}],['всех видов зефира',{prefix:'Зефир '}]].filter(([s])=>q.includes(s));assert.equal(products.length,1);m.goods=products[0][1];
 if(q.includes('увеличилось')){m.operation='both';m.measure=q.includes('количество пряников')?'netUnits':'netPackages';}
 else if(q.includes('выручку')||q.includes('на какую сумму')){m.operation='Продажа';m.measure='revenue';}
 else {m.measure=q.includes('(в литрах)')?'litres':'kilograms';assert(m.measure==='litres'||q.includes('(в кг)'));m.operation=q.includes('проданных')?'Продажа':'Поступление';assert(m.operation==='Продажа'||q.includes('поступившего')||q.includes('полученных'));}
 assert(m.start<=m.end);return m;
}
function normalize(sheets){const out={};for(const rows of Object.values(sheets)){if(!rows.length)continue;const k={'ID операции':'operations','Артикул':'goods','ID магазина':'stores'}[rows[0][0]];assert(k&&!out[k]);out[k]=rows.map(r=>r.map(v=>typeof v==='string'?v.trim().replaceAll('\u00a0',' '):v));}assert.deepEqual(Object.keys(out).sort(),['goods','operations','stores']);return out;}
function exact(n,d){const gcd=(a,b)=>b?gcd(b,a%b):a,g=gcd(Math.abs(n),d);return d===g?String(n/g):`${n/g}/${d/g}`;}
function solve(d,m){
 assert(['netPackages','netUnits','revenue','kilograms','litres'].includes(m.measure));assert(['both','Поступление','Продажа'].includes(m.operation));assert(['district','addressPrefix'].includes(m.store.field));
 const goods=d.goods.slice(1),stores=d.stores.slice(1),ops=d.operations,g=new Map(goods.map(r=>[r[0],r])),s=new Map(stores.map(r=>[r[0],r]));assert.equal(g.size,goods.length);assert.equal(s.size,stores.length);
 for(const r of goods){assert.equal(r.length,6);assert(Number.isSafeInteger(r[0])&&r[0]>0);assert(typeof r[2]==='string'&&typeof r[3]==='string');assert(typeof r[4]==='number'&&r[4]>0);}
 for(const r of stores){assert.equal(r.length,3);assert(r.every(v=>typeof v==='string'&&v.length));}
 const selectedGoods=goods.filter(r=>(m.goods.names?m.goods.names.includes(r[2]):r[2].startsWith(m.goods.prefix))&&(!m.goods.manufacturer||r[5]===m.goods.manufacturer));
 const selectedStores=stores.filter(r=>m.store.field==='district'?r[1]===m.store.value:r[2].startsWith(m.store.value));assert(selectedGoods.length&&selectedStores.length);
 const gids=new Set(selectedGoods.map(r=>r[0])),sids=new Set(selectedStores.map(r=>r[0])),qty=ops[0].findIndex(x=>x.startsWith('Количество упаковок')),op=ops[0].indexOf('Тип операции');assert(qty>=0&&op>=0&&qty!==op);assert.deepEqual(ops[0].slice(0,4),['ID операции','Дата','ID магазина','Артикул']);
 let total=0,incoming=0,sold=0;const matches=[],groups=new Map(),seen=new Set(),scale=['kilograms','litres'].includes(m.measure)?1000:1;
 for(const r of ops.slice(1)){
  assert.equal(r.length,ops[0].length);assert(Number.isSafeInteger(r[0])&&r[0]>0&&!seen.has(r[0]));seen.add(r[0]);assert(g.has(r[3])&&s.has(r[2]));assert(Number.isSafeInteger(r[qty])&&r[qty]>=0);assert(['Поступление','Продажа'].includes(r[op]));assert.match(r[1],/^20\d\d-\d\d-\d\d$/u);assert.equal(new Date(r[1]).toISOString().slice(0,10),r[1]);
  if(!gids.has(r[3])||!sids.has(r[2])||r[1]<m.start||r[1]>m.end||m.operation!=='both'&&r[op]!==m.operation)continue;
  const good=g.get(r[3]);let factor=1;
  if(m.measure==='netPackages')factor=r[op]==='Продажа'?-1:1;
  else if(m.measure==='netUnits'){assert.equal(good[3],'шт');factor=good[4]*(r[op]==='Продажа'?-1:1);}
  else if(m.measure==='revenue')factor=good[5];
  else{const allowed=m.measure==='kilograms'?{грамм:1,кг:1000}:{мл:1,литр:1000};assert(Object.hasOwn(allowed,good[3]));factor=good[4]*allowed[good[3]];}
  assert(Number.isSafeInteger(factor));const value=r[qty]*factor;assert(Number.isSafeInteger(value));total+=value;assert(Number.isSafeInteger(total));
  if(r[op]==='Поступление')incoming+=r[qty];else sold+=r[qty];matches.push(r);
  const k=r[3]+'|'+r[op];groups.set(k,(groups.get(k)||0)+r[qty]);
 }
 assert(matches.length);assert(m.truncate||total%scale===0);
 return {answer:String(Math.trunc(total/scale)),exactTotal:exact(total,scale),incomingPackages:incoming,soldPackages:sold,goods:selectedGoods,stores:selectedStores,matches,byArticleAndOperation:[...groups].map(([k,q])=>({article:Number(k.split('|')[0]),operation:k.split('|')[1],packages:q})).sort((a,b)=>a.article-b.article||(a.operation<b.operation?-1:a.operation>b.operation?1:0)),quantityIndex:qty,operationIndex:op};
}
function compute(task,data,readFile=fs.readFileSync){
 const {conditionText}=require('../../lib/seo-text'),condition=conditionText(task.fragment);assert.equal(condition,data.condition,'changed condition');const m=conditionModel(condition);assert.deepEqual(m,data.model,'changed model');
 const urls=[...task.fragment.matchAll(/href=["'](\/fipi\/ege-informatics\/[^"']+\.ods)["']/gu)].map(x=>x[1]);assert.deepEqual(urls,data.files.map(f=>f.url),'changed attachments');
 const bytes=data.files.map(f=>{assert.match(f.url,/^\/fipi\/ege-informatics\/docs\/restored-databases\/EGEINF[A-F\d]{6}(?:-[A-Za-z0-9_]+)?\.ods$/u);const b=readFile(path.join(root,f.url.slice(1).replace(/^fipi\//u,'fipi-assets/')));assert.equal(sha(b),f.sha256,'changed file');return b;});assert(bytes.length);
 const key=data.files.map(f=>f.sha256).join(',')+JSON.stringify(m);
 if(!cache.has(key)){
  const tables=bytes.map(b=>normalize(JSON.parse(execFileSync('python3',[path.join(__dirname,'read-ege-informatics-mirror-databases.py')],{input:b,encoding:'utf8',timeout:30000,maxBuffer:8*1024*1024}))));for(const t of tables)assert.deepEqual(t,tables[0],'different attached tables');cache.set(key,solve(tables[0],m));
 }
 const result=cache.get(key);assert.deepEqual(result,data.result,'changed calculation');return result;
}
module.exports={conditionModel,normalize,solve,compute};
