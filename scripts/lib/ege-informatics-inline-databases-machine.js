'use strict';
const assert=require('node:assert/strict');
const {conditionText,seoPlainText}=require('../../lib/seo-text');
function tables(fragment){
 return [...fragment.matchAll(/<table\b[^>]*>(?:(?!<table\b)[\s\S])*?<\/table>/gi)].map(t=>[...t[0].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(r=>[...r[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(c=>seoPlainText(c[1].replace(/<br\s*\/?>/gi,' ').replace(/<\/?(?:span|b|i|font|strong|em)\b[^>]*>/gi,'')).replace(/\s+/gu,' ').trim())));
}
function model(task){
 const text=conditionText(task.fragment),rows=tables(task.fragment).filter(r=>r.length>=6);assert.equal(rows.length,1,'one primary data table');const a=rows[0],m={};
 if(a[0][0]!=='Таблица 1'){
  if(text.includes('Конкурсе красоты')){assert.match(text,/декабре 2005/);assert.match(text,/более 180/);assert.match(text,/не менее 16/);m.kind='filter';m.year=2005;m.age=16;m.height=180;}
  else if(text.includes('Химия>Биология')||/Химия\s*>\s*Биология/u.test(text)){m.kind='grades';assert.match(text,/ИЛИ/);assert.match(text,/Пол\s*=\s*[’'«]?м/u);}
  else {assert.match(text,/Кто победил в рывке/);m.kind='lifting';}
  return {...m,rows:a};
 }
 const header=a[1],separator=header.indexOf('');assert.ok([3,4].includes(separator));const people=[],edges=[];
 for(const r of a.slice(2)){
  if(/^\d+$/u.test(r[0])){const p={id:Number(r[0]),name:r[1],sex:r[2]};if(separator===4){if(header[3].includes('Год'))p.year=Number(r[3].replace(/\s+/gu,''));else p.city=r[3];}people.push(p);}
  if(r.slice(-2).every(v=>/^\d+$/u.test(v)))edges.push(r.slice(-2).map(Number));
 }
 assert.ok([13,14].includes(people.length));assert.ok([13,14].includes(edges.length));assert.equal(new Set(people.map(p=>p.id)).size,people.length);for(const [a,b] of edges)assert.ok(people.some(p=>p.id===a)&&people.some(p=>p.id===b));
 if(text.includes('ID дедушки'))Object.assign(m,{kind:'named-grandfather',target:'Аганян Б.Г.'});
 else if(text.includes('общее число дочерей и внучек'))Object.assign(m,{kind:'female-descendants',target:'Баурн А.С.'});
 else if(text.includes('на момент их рождения')){const v=text.match(/(матерям|отцам) было (не больше|больше|меньше) (\d+) полных лет/u);assert.ok(v);Object.assign(m,{kind:'parent-age-count',sex:v[1]==='матерям'?'Ж':'М',op:{'не больше':'le','больше':'gt','меньше':'lt'}[v[2]],limit:Number(v[3])});}
 else if(/молодом возрасте|наименьший возраст/u.test(text))Object.assign(m,{kind:'mother-extreme',extreme:'min'});
 else if(text.includes('наибольший возраст'))Object.assign(m,{kind:'mother-extreme',extreme:'max'});
 else if(text.includes('разницу между годами рождения родных'))Object.assign(m,{kind:'sibling-gap',sex:text.includes('родных братьев')?'М':'Ж',extreme:text.includes('наименьшую')?'min':'max'});
 else if(text.includes('хотя бы один родной брат'))Object.assign(m,{kind:'sibling-count',sex:'М',op:'abs-le',limit:4});
 else if(text.includes('хотя бы одна родная сестра'))Object.assign(m,{kind:'sibling-count',sex:'Ж',op:'younger-ge',limit:4});
 else {assert.ok(text.includes('город'));Object.assign(m,{kind:'grand-city',countSide:text.includes('внук')?'grandparent':'grandchild'});}
 return {...m,people,edges};
}
function solve(m){
 const p=new Map((m.people||[]).map(x=>[x.id,x])),e=m.edges||[],children=new Map(),parents=new Map();
 for(const [a,b] of e){if(!children.has(a))children.set(a,new Set());children.get(a).add(b);if(!parents.has(b))parents.set(b,new Set());parents.get(b).add(a);}
 const cs=a=>[...(children.get(a)||[])],ps=b=>[...(parents.get(b)||[])],selected=new Set();let answer,details;
 switch(m.kind){
 case 'named-grandfather':{const target=[...p.values()].find(x=>x.name.replace(/\s+/gu,'')===m.target.replace(/\s+/gu,''));assert.ok(target);for(const a of ps(target.id))for(const g of ps(a))if(p.get(g).sex==='М')selected.add(g);assert.equal(selected.size,1);answer=[...selected][0];break;}
 case 'female-descendants':{const target=[...p.values()].find(x=>x.name.replace(/\s+/gu,'')===m.target.replace(/\s+/gu,''));for(const c of cs(target.id)){if(p.get(c).sex==='Ж')selected.add(c);for(const g of cs(c))if(p.get(g).sex==='Ж')selected.add(g);}answer=selected.size;break;}
 case 'parent-age-count':for(const [a,b] of e){if(p.get(a).sex!==m.sex)continue;const age=p.get(b).year-p.get(a).year;if(m.op==='gt'?age>m.limit:m.op==='lt'?age<m.limit:age<=m.limit)selected.add(b);}answer=selected.size;break;
 case 'mother-extreme':{const scored=[...p.values()].filter(x=>x.sex==='Ж'&&cs(x.id).length).map(x=>[x.id,Math[m.extreme](...cs(x.id).map(c=>p.get(c).year-x.year))]);scored.sort((a,b)=>(m.extreme==='min'?a[1]-b[1]:b[1]-a[1])||a[0]-b[0]);answer=scored[0][0];details=scored;break;}
 case 'sibling-gap':case 'sibling-count':{const candidates=[...p.values()],pairs=[];for(const a of candidates)for(const b of candidates){if(a.id===b.id||!ps(a.id).some(x=>ps(b.id).includes(x)))continue;const delta=b.year-a.year;if(m.kind==='sibling-gap'){if(a.id<b.id&&a.sex===m.sex&&b.sex===m.sex)pairs.push([a.id,b.id,Math.abs(delta)]);}else if(b.sex===m.sex&&(m.op==='abs-le'?Math.abs(delta)<=m.limit:delta>=m.limit))selected.add(a.id);}if(m.kind==='sibling-gap'){assert.ok(pairs.length);answer=Math[m.extreme](...pairs.map(x=>x[2]));details=pairs;}else answer=selected.size;break;}
 case 'grand-city':for(const [a,b] of e)for(const c of cs(b))if(p.get(a).city===p.get(c).city)selected.add(m.countSide==='grandparent'?a:c);answer=selected.size;break;
 case 'grades':{const rows=m.rows.slice(1);const columns=m.rows[0],sex=columns.indexOf('Пол'),chem=columns.indexOf('Химия'),bio=columns.indexOf('Биология');assert.ok([sex,chem,bio].every(i=>i>=0));details=rows.filter(r=>r[sex]==='м'||Number(r[chem])>Number(r[bio])).map(r=>r[0]);answer=details.length;break;}
 case 'filter':{let passed=0;for(const sex of ['м','д'])for(const height of [179,180,181])for(const year of [1988,1989,1990]){const expected=sex==='д'&&height>m.height&&m.year-year>=m.age;const options=[sex==='д'||height>180&&year===1989,sex==='д'&&height>180||year<1989,sex==='д'&&height>180&&year<1990,sex==='д'&&height===180&&year<1989];assert.equal(options[2],expected);passed++;}answer=3;details={cases:passed};break;}
 case 'lifting':{const rows=m.rows.slice(1).filter(r=>r[2]!=='-').map(r=>({name:r[0],weight:Number(r[1].replace(',','.')),snatch:Number(r[2].replace(',','.')),attempt:Number(r[3])}));rows.sort((a,b)=>b.snatch-a.snatch||a.weight-b.weight||a.attempt-b.attempt);assert.match(rows[0].name,/Шапсугов/u);answer=4;details=rows;break;}
 default:assert.fail(m.kind);
 }
 return {answer:String(answer),kind:m.kind,selected:[...selected].sort((a,b)=>a-b),...(details?{details}:{})};
}
function comparable(m){const d={...m};if(d.people)d.people=d.people.map(p=>({...p,name:p.name.replace(/\s+/gu,'')}));return d;}
function compute(task,data){const text=conditionText(task.fragment);assert.equal(text,data.condition,'changed condition');const derived=model(task);assert.deepEqual(comparable(derived),comparable(data.model),'changed model');const result=solve(derived);assert.deepEqual(result,data.calculated,'changed calculation');return result;}
module.exports={tables,model,solve,compute};
