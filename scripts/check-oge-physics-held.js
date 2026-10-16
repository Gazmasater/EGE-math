'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const {readOgeCatalog}=require('./lib/oge-catalog');
const {validateHeld,assertTopicCoverage,assertHeldUnpublished}=require('./lib/oge-physics-held');
const root=path.resolve(__dirname,'..'),currentHeld=require('./data/oge-physics-held.json');
const catalog=readOgeCatalog(root,'oge-physics').tasks;
validateHeld(catalog,[],currentHeld,root);
// Resolved historical holds remain fixtures so an empty live list does not
// disable regression checks for the source and publication guards.
const held=require('./data/oge-physics-held-history.json');
const ids=validateHeld(catalog,[],held,root);
// A source change, an accidental invented solution and a published held record
// must all stop the audit. An unrelated missing task must not be exempted.
const changed=structuredClone(held);changed[0].sourceHash='0'.repeat(64);
assert.throws(()=>validateHeld(catalog,[],changed,root),/held source changed/);
assert.throws(()=>validateHeld(catalog,[{id:held[0].id}],held,root),/cannot have a prepared solution/);
assert.throws(()=>assertHeldUnpublished(held,()=>({published:1})),/must remain unpublished/);
assertHeldUnpublished(held,()=>undefined);
const ordinary=catalog.find(t=>!ids.has(t.id)).id,topic=[ordinary,...ids];
assertTopicCoverage(topic,[{id:ordinary}],ids,'fixture');
assert.throws(()=>assertTopicCoverage(topic,[],ids,'fixture'),/Complete reviewed topic coverage/);
console.log('Held-source guards: valid holds and four failure cases passed.');
