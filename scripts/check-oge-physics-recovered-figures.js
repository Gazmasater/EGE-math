'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {readOgeCatalog} = require('./lib/oge-catalog');
const {conditionText} = require('../lib/seo-text');
const {restoreOgePhysicsFigures} = require('../lib/oge-physics-condition-figures');
const figures = require('../lib/oge-physics-condition-figures.json');
const root = path.resolve(__dirname, '..');
let restored = 0, unchanged = 0;
for (const t of readOgeCatalog(root, 'oge-physics').tasks) {
  const html = restoreOgePhysicsFigures(t.fragment), f = figures[t.id];
  if (!f) { assert.equal(html, t.fragment); unchanged++; continue; }
  assert.notEqual(html, t.fragment, t.id + ': figure must appear');
  assert.equal(restoreOgePhysicsFigures(html), html, 'idempotent');
  const altered = t.fragment.replace('Задание №1.', 'Задание №2.');
  assert.notEqual(altered, t.fragment);
  assert.equal(restoreOgePhysicsFigures(altered), altered, 'changed source must not restore');
  assert.equal(conditionText(html.replace(/<figure class="restored-condition-figure"[\s\S]*?<\/figure>/g, f.placeholder)), conditionText(t.fragment), 'original text');
  assert.equal(html.split('class="restored-condition-figure"').length - 1, 1);
  assert.ok(html.includes(f.page) && html.includes('«Решу ОГЭ»'));
  assert.ok(html.includes('/fipi/' + f.asset));
  const bytes = fs.readFileSync(path.join(root, 'fipi-assets', f.asset));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), f.sha256);
  assert.doesNotMatch(bytes.toString(), /<script|<foreignObject|(?:href|src)\s*=\s*["'](?:https?:|\/\/)/i);
  restored++;
}
assert.equal(restored, 2);
console.log(JSON.stringify({restored, unchanged, status:'ok'}));
