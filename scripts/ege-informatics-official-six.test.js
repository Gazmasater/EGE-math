'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const machine=require('./lib/ege-informatics-official-six-machine');
test('Millisecond indices include a finishing process and exclude its newly started successor',()=>{
 const rows=[{id:1,duration:23,depends:[]},{id:2,duration:2,depends:[1]}];const t=machine.processTimeline(rows);assert.deepEqual(t.ticks[22],[1]);assert.deepEqual(t.ticks[23],[2]);
 const sample=[{id:1,duration:3,depends:[]},{id:2,duration:4,depends:[1]},{id:3,duration:2,depends:[2,4]},{id:4,duration:5,depends:[]},{id:5,duration:8,depends:[1,4]},{id:6,duration:3,depends:[1]}];assert.deepEqual(machine.processTimeline(sample).ticks[5],[2,5,6]);
 assert.throws(()=>machine.processTimeline([{id:1,duration:1,depends:[2]},{id:2,duration:1,depends:[1]}]),/cycle/);
 assert.throws(()=>machine.processTimeline([{id:1,duration:1,depends:[99]}]));
});
test('Simulation agrees with independent recursive schedules on 300 small dependency graphs',()=>{
 let seed=475;const rand=n=>{seed=(seed*1664525+1013904223)>>>0;return seed%n;};
 for(let sample=0;sample<300;sample++){const rows=Array.from({length:2+rand(8)},(_,i)=>({id:i+1,duration:1+rand(6),depends:Array.from({length:i},(_,j)=>j+1).filter(()=>rand(3)===0)})),by=new Map(rows.map(p=>[p.id,p])),ends={};function finish(id){if(ends[id]!==undefined)return ends[id];const p=by.get(id);return ends[id]=p.duration+Math.max(0,...p.depends.map(finish));}rows.forEach(p=>finish(p.id));const t=machine.processTimeline([...rows].reverse());for(let k=1;k<=Math.max(...Object.values(ends));k++)assert.deepEqual(t.ticks[k-1],rows.filter(p=>ends[p.id]-p.duration<k&&k<=ends[p.id]).map(p=>p.id));}
});
test('Star classes distinguish exact luminosity suffixes and keep bare VII',()=>{
 const parsed=machine.parseStars('1,000000 2,000000 B7II\n1,000000 3,000000 B7III\n1,000000 4,000000 K3VI\n1,000000 5,000000 VII');assert.deepEqual(parsed.map(p=>p.type),['BII','BIII','KVI','VII']);assert.throws(()=>machine.parseStars('1,000000 2,000000 A7VII'));assert.throws(()=>machine.parseStars('1,000000 2,000000 B7II extra'));
});
test('Discrete medoid, exact truncation and disjoint rectangle certificates',()=>{
 const g=[0,1,10].map((x,i)=>({x:x*1e6,y:0,index:i+1}));assert.equal(machine.medoid(g).index,2);assert.equal(machine.scaledDistance(999999),9);assert.equal(machine.scaledDistance(1000000),10);assert.equal(machine.scaledDistance(1000001),10);
 assert.throws(()=>machine.proveRectangles([g],[[-1,5499999,0,6000000]]));assert.throws(()=>machine.proveRectangles([[g[0]],[g[1]]],[[0,5500000,0,6000000],[0,5500000,0,6000000]]));
});
test('All six official files recalculate and altered answers, explanations, conditions and archives are rejected',()=>{
 const {readOgeCatalog}=require('./lib/oge-catalog'),{auditOfficialSix}=require('./lib/audit-ege-informatics-official-six');const tasks=new Map(readOgeCatalog(undefined,'ege-informatics').tasks.map(t=>[t.id,t]));const batches=require('./data/ege-informatics-solutions').filter(b=>b.name.startsWith('official-six-'));assert.equal(batches.flatMap(b=>b.records).length,6);
 for(const b of batches)for(const r of b.records){const t=tasks.get(r.id),s=b.sources[r.id];assert.equal(auditOfficialSix(t,r,s).answer,r.answer);assert.throws(()=>auditOfficialSix(t,{...r,answer:r.answer+'0'},s),/answer/);assert.throws(()=>auditOfficialSix(t,{...r,solution:r.solution+'изменено'},s),/explanation/);assert.throws(()=>auditOfficialSix({...t,fragment:t.fragment.replace('Задание','Другое задание')},r,s),/condition/);assert.throws(()=>auditOfficialSix(t,r,s,p=>Buffer.concat([fs.readFileSync(p),Buffer.from('changed')])) ,/archive/);}
});

test('Independent Python calculation reproduces all six results from the original ZIP bytes',()=>{
 const {spawnSync}=require('node:child_process'),path=require('node:path');const p=spawnSync('python3',[path.join(__dirname,'lib/check-ege-informatics-official-six-independent.py')],{encoding:'utf8',timeout:120000,maxBuffer:2000000});assert.equal(p.status,0,p.stderr);const report=JSON.parse(p.stdout);assert.equal(report.status,'ok');assert.equal(report.tasks,6);assert.equal(report.starPoints,9575);assert.equal(report.processes,25);
});
