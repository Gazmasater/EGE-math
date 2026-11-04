const test=require('node:test'),assert=require('node:assert/strict');const {solve,model}=require('./lib/ege-informatics-archive-transfer-machine');
test('The stated percentage is remaining size and processing can erase savings',()=>{
 const base={kind:'compare',megabytes:40,ratePower:23,percent:90,pack:16,unpack:2};assert.equal(solve(base).answer,'Б14');assert.equal(solve({...base,percent:10}).answer,'А18');
});
test('Every byte contributes eight bits; both processing stages contribute time',()=>{
 const r=solve({kind:'compare',megabytes:20,ratePower:21,percent:70,pack:16,unpack:3});assert.equal(r.rawSeconds,'80');assert.equal(r.compressedSeconds,'56');assert.equal(r.totalSeconds,'75');assert.equal(r.answer,'А5');
});
test('Minute input is converted before subtracting compressed transmission time',()=>{
 const t=require('./data/ege-informatics-archive-transfer-test-fixtures.json').find(t=>t.id==='EGEINFCD059E'),m=model(t);assert.equal(m.rawSeconds,60);assert.equal(solve(m).answer,'12');
});
test('Literal 220..224 values without exponent markup are never silently repaired',()=>{
 const t=require('./data/ege-informatics-archive-transfer-test-fixtures.json').find(t=>t.id==='EGEINFC8ED0E');assert.throws(()=>model(t),/unambiguous exponent/);
});
