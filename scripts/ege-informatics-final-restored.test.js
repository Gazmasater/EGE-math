'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{spawnSync}=require('node:child_process');
const regression=path.join(__dirname,'lib/test-ege-informatics-final-restored.py');
const calculator=path.join(__dirname,'lib/calculate-ege-informatics-final-restored.py');
const lib='/root/projects/ege-math/scripts/lib';
for(const group of ['sequence','strings','events','reject-invalid'])test('restored final: independent enumeration '+group,()=>{
 const p=spawnSync('python3',[regression,group,calculator,lib],{maxBuffer:2000000,timeout:120000});
 assert.equal(p.status,0,String(p.stderr));const d=JSON.parse(p.stdout);assert.equal(d.status,'ok');assert.ok(d.fixtures>=4);console.log(group,d.fixtures);
});
