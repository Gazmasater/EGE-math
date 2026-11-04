const test=require('node:test'),assert=require('node:assert/strict');
const {correctEgeInformaticsSource:correct}=require('../lib/ege-informatics-source-corrections');
const {model,solve}=require('./lib/ege-informatics-archive-repair-machine');
const tasks=require('./data/ege-informatics-archive-repair-test-fixtures.json');
test('Only two source-verified flattened rates become exponents',()=>{
 for(const t of tasks){const fixed=correct(t.fragment,t.id),m=model({...t,fragment:fixed});assert.equal(m.ratePower,t.id==='EGEINFC8ED0E'?22:23);assert.equal(solve(m).answer,t.id==='EGEINFC8ED0E'?'Б9':'А17');}
});
test('Restored rates are idempotent and unknown IDs remain untouched',()=>{
 for(const t of tasks){const fixed=correct(t.fragment,t.id);assert.equal(correct(fixed,t.id),fixed);assert.equal(correct(t.fragment,'UNKNOWN'),t.fragment);}
});
test('An altered source cannot receive an otherwise plausible exponent repair',()=>{
 for(const t of tasks){const changed=t.fragment.replace('Мбайт','Кбайт');assert.notEqual(changed,t.fragment);assert.equal(correct(changed,t.id),changed);}
});
