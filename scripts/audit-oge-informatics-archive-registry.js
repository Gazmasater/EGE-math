'use strict';

// Read-only: reconcile the handoff registry with the original FIPI snapshots.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { readOgeCatalog } = require('./lib/oge-catalog');
const { conditionText } = require('../lib/seo-text');
const { classifyInformatics } = require('./lib/oge-informatics-classifier');
const root = path.resolve(__dirname, '..');
const registryPath = path.join(root, 'data-sources/oge-informatics/tasks.json');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const catalog = readOgeCatalog(root, 'oge-informatics');
const actual = catalog.tasks.flatMap(task => {
  const urls = [...task.fragment.matchAll(/class="fipi-attachment" href="([^"]+)"/g)].map(m => m[1]);
  return urls.length ? [{ id: task.id, sourceId: task.sourceId,
    group: classifyInformatics(task).type, text: conditionText(task.fragment), urls }] : [];
});
assert.equal(registry.length, 371);
assert.equal(new Set(registry.map(t => t.id)).size, 371);
const byId = new Map(actual.map(t => [t.id, t]));
assert.equal(byId.size, registry.length);
for (const task of registry) assert.deepEqual(task, byId.get(task.id), task.id);
const urls = registry.flatMap(t => t.urls);
assert.equal(urls.length, 371);
assert.equal(new Set(urls).size, 371);
for (const url of urls) {
  assert.match(url, /^https:\/\/oge\.fipi\.ru\/docs\/74676951F093A0754D74F2D6E7955F06\/questions\/[A-F0-9]{32}\/[^/]+\.(zip|rar)$/);
}
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
console.log(JSON.stringify({ status: 'passed', tasks: registry.length, urls: urls.length,
  byGroup: Object.fromEntries(['type.11', 'type.12', 'type.13', 'type.14'].map(group =>
    [group, registry.filter(t => t.group === group).length])),
  registrySha256: hash(registryPath),
  rawPages: catalog.pages.map(p => ({ path: p.name, sha256: hash(path.join(root, p.name)) }))
}, null, 2));
