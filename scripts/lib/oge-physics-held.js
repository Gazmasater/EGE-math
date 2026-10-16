'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {ogeSourceSignature}=require('../../lib/oge-classification');
const {conditionText}=require('../../lib/seo-text');
function validateHeld(catalog,prepared,held,root){
 const byId=new Map(catalog.map(t=>[t.id,t])),preparedIds=new Set(prepared.map(r=>r.id));
 assert.equal(new Set(held.map(r=>r.id)).size,held.length,'Duplicate held task');
 for(const h of held){
  const t=byId.get(h.id);assert.ok(t,'Unknown held task '+h.id);
  assert.ok(!preparedIds.has(h.id),'Held task cannot have a prepared solution: '+h.id);
  assert.equal(h.status,'blocked-missing-primary-figure');assert.equal(h.reviewed,true);
  assert.equal(h.sourceHash,ogeSourceSignature(t),h.id+': held source changed');
  assert.equal(h.fipiCondition,conditionText(t.fragment),h.id+': held condition changed');
  for(const key of ['reason','recovery','resolutionRequired'])assert.ok(h[key]?.length>80,h.id+': missing hold evidence '+key);
  assert.ok(h.missingFigure?.length>10);assert.match(h.externalURL,/^https:\/\/phys-oge\.sdamgia\.ru\/problem\?id=\d+$/);
  const sourcePaths=[...new Set([...t.fragment.matchAll(/src=["']([^"']+)["']/g)].map(m=>m[1]).filter(p=>p.startsWith('/fipi/')).map(p=>p.replace('/fipi/','fipi-assets/')))];
  assert.deepEqual(h.images.map(im=>im.path).sort(),sourcePaths.sort(),h.id+': held image inventory');
  for(const im of h.images)assert.equal(createHash('sha256').update(fs.readFileSync(path.join(root,im.path))).digest('hex'),im.sha256);
 }
 return new Set(held.map(h=>h.id));
}
function assertTopicCoverage(topicIds,prepared,heldIds,topic){
 const covered=prepared.filter(r=>topicIds.includes(r.id)).map(r=>r.id).concat(topicIds.filter(id=>heldIds.has(id))).sort();
 assert.deepEqual(covered,[...topicIds].sort(),'Complete reviewed topic coverage: '+topic);
}
function assertHeldUnpublished(held,read){
 for(const h of held)assert.notEqual(read(h.id)?.published,1,'Held source must remain unpublished: '+h.id);
}
module.exports={validateHeld,assertTopicCoverage,assertHeldUnpublished};
