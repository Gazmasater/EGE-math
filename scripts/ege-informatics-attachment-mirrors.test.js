'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{mirroredInformaticsAsset}=require('../lib/ege-informatics-attachment-mirrors');
const rows=require('../lib/ege-informatics-attachment-mirrors.json');
test('verified official attachments map only in the exact subject and exact source path',()=>{
 for(const [key,r] of Object.entries(rows)){
  assert.equal(mirroredInformaticsAsset(key,'ege-informatics'),r.localRelative);
  assert.equal(mirroredInformaticsAsset(key,'oge-informatics'),key);
  assert.equal(mirroredInformaticsAsset(key+'?changed','ege-informatics'),key+'?changed');
 }
});
test('unknown or inherited manifest keys remain unchanged',()=>{
 for(const key of ['docs/unknown.zip','__proto__','constructor','toString'])assert.equal(mirroredInformaticsAsset(key,'ege-informatics'),key);
});
