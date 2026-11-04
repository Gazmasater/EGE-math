'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{solve}=require('./lib/ege-informatics-mirror-strings-machine'),cases=require('./data/ege-informatics-mirror-strings-small-cases.json');
for(const kind of ['pairs','forbidden','occurrences','anchored','mixed-min','expression'])test(kind+' matches exhaustive substring oracle, including boundary and empty-answer cases',()=>{
 const selected=cases.filter(x=>x.model.kind===kind);assert.ok(selected.length>100);
 for(const c of selected)assert.deepEqual(solve(c.s,c.model),c.expected,JSON.stringify(c));
});
