'use strict';
const assert=require('node:assert/strict');
const sources=require('./oge-physics-measurements-sources.json');
// These readings were obtained by inspecting the primary FIPI figures.
// Option codes are derived below from the primary text, never from the model.
const readings={C10EF1:[100,10],F3C375:[80,10],E72221:[60,10],
  '8F911C':[6.5-0,.5],F731A7:[7.5-1,.5],FC25C7:[5.5-1,.5],D5F59C:[20.1,1/10]};
const purpose={
  'масса тела':/(?:рычажные )?весы/,
  'влажность воздуха':/(?:психрометр|гигрометр)/,
  'относительная влажность воздуха':/психрометрический гигрометр/,
  'температура жидкости':/термометр/,'температура воздуха':/термометр/,'температура':/термометр/,
  'объём жидкости':/(?:мензурка|измерительный цилиндр)/,'объем жидкости':/мензурка/,
  'атмосферное давление':/барометр/,'мощность тока':/ваттметр/,'сила тока':/амперметр/,
  'ускорение':/акселерометр/,'сила':/динамометр/,'время':/секундомер/,'скорость':/спидометр/,
  'сила трения':/динамометр/,'плотность жидкости':/ареометр/,
  'гидростатическое давление в жидкости':/^манометр/,
  'разность давления газа и атмосферного давления':/U-образный манометр/,
  'объём тела неправильной формы':/мензурка/
};
const val=s=>Number(s.replace(',','.'));
function options(text){return [...text.matchAll(/([1-4])\)\s*([\s\S]*?)(?=\s+[1-4]\)|$)/g)].map(m=>({n:m[1],label:m[2].trim()}));}
module.exports=prepared=>{
 const rows=new Map(prepared.map(r=>[r.id,r]));let checked=0;
 for(const [id,s] of Object.entries(sources)){
  const short=id.replace('OGEPHYS',''),text=s.fipiCondition,opts=options(text);assert.equal(opts.length,4,id);let answer;
  if(readings[short]){
   const [reading,step]=readings[short],uncertainty=step*(text.includes('половине')?.5:1);
   const valid=opts.filter(o=>{const m=o.label.match(/^\(([\d,]+) ± ([\d,]+)\)/);return m&&Math.abs(val(m[1])-reading)<1e-10&&Math.abs(val(m[2])-uncertainty)<1e-10;});
   assert.equal(valid.length,1,id);answer=valid[0].n;
   assert.ok(rows.get(id).solution.includes(String(uncertainty).replace('.',',')),id);
  }else if(['7A8E71','44D638'].includes(short)){
   const limit=short==='7A8E71'?120:80,step=short==='7A8E71'?(60-30)/3:(40-20)/2;
   const valid=opts.filter(o=>o.label===`${step} мл; ${limit} мл`);assert.equal(valid.length,1,id);answer=valid[0].n;
  }else if(short==='FAF596'){
   const c1=(100-0)/10,c2=(10-0)/10;
   const valid=opts.filter(o=>o.label===`${c1} см и ${c2} мм`);assert.equal(valid.length,1,id);answer=valid[0].n;
  }else if(short==='309BCF'){
   answer=[/условие равновесия рычага/,/зависимость силы, действующей на проводник с током/].map(p=>{const q=opts.filter(o=>p.test(o.label));assert.equal(q.length,1);return q[0].n;}).join('');
  }else{
   const left=text.match(/А\) (.*?) Б\) (.*?) 1\)/);assert.ok(left,id);
   answer=left.slice(1).map(q=>{const p=purpose[q];assert.ok(p,`${id}: ${q}`);const m=opts.filter(o=>p.test(o.label));assert.equal(m.length,1,id);return m[0].n;}).join('');
  }
  assert.equal(rows.get(id).answer,answer,id);checked++;
 }
 assert.equal(checked,30);
};
