const test = require('node:test');
const assert = require('node:assert/strict');
const {readPhysicsCatalog} = require('./lib/physics-catalog');
const {conditionText} = require('../lib/seo-text');
const {restorePhysicsFigures} = require('../lib/physics-condition-figures');
const catalog = readPhysicsCatalog(undefined, {allAnswerTypes: true});
const figures = require('../lib/physics-condition-figures.json');

for (const id of ['13442E', '2405C2', 'D2144A']) {
const condition = catalog.get(id).contentHtml;
const document = `${condition}<div id='i${id}'>metadata</div>`;

test(`${id}: supplied figure preserves wording, answers and other tasks`, () => {
  const other = catalog.get('4EAC46').contentHtml;
  const restored = restorePhysicsFigures(document + other + '<div id="i4EAC46">metadata</div>');
  assert.equal((restored.match(/class="restored-condition-figure"/g) || []).length, 1);
  assert.ok(restored.includes(`src="/fipi/${figures[id].asset}"`));
  assert.ok(restored.includes(other));
  assert.equal(conditionText(restored), conditionText(document + other + '<div id="i4EAC46">metadata</div>'));
});

test(`${id}: a changed source condition does not receive an unreviewed figure`, () => {
  const changed = document.replace('MsoNormal', 'MsoNormalChanged');
  assert.notEqual(changed, document);
  assert.equal(restorePhysicsFigures(changed), changed);
});

test(`${id}: restoration is idempotent`, () => {
  const once = restorePhysicsFigures(document);
  assert.equal(restorePhysicsFigures(once), once);
});
}
