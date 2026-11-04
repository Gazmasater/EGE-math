'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { conditionText } = require('../../lib/seo-text');

function auditPrimaryImage(task, source, root) {
  const review = source.primaryImageReview;
  assert.ok(review?.reviewed, 'graph image has not been reviewed');
  const urls = [...task.fragment.split('КЭС:')[0].matchAll(/<img\b[^>]*src="([^"]+)"/gu)].map(m => m[1]);
  assert.equal(urls.length, 1);
  assert.deepEqual(review.files.map(f => f.src), urls);
  for (const file of review.files) {
    assert.ok(file.src.startsWith('/fipi/ege-informatics/'));
    const local = path.resolve(root, 'fipi-assets', decodeURIComponent(file.src.slice(6)));
    assert.ok(local.startsWith(path.resolve(root, 'fipi-assets/ege-informatics') + path.sep));
    assert.equal(createHash('sha256').update(fs.readFileSync(local)).digest('hex'), file.sha256, 'changed primary graph');
  }
}

function compute(task, data) {
  const text = conditionText(task.fragment), graph = data.adjacency;
  const vertices = Object.keys(graph), cycle = text.includes('начинаются и заканчиваются');
  let start, end, must = null, avoid = null;
  if (cycle) {
    assert.match(text, /ненулевой длины/u);
    assert.match(text, /не содержат этот город в качестве промежуточного пункта/u);
    assert.match(text, /через промежуточные города не более одного раза/u);
    start = end = text.match(/начинаются и заканчиваются в городе ([А-Я])/u)[1];
  } else {
    [, start, end] = text.match(/из города ([А-Я]) в город ([А-Я])/u);
    must = text.match(/(?<!не )проходящих через город ([А-Я])/u)?.[1] || null;
    avoid = text.match(/не проходящих через город ([А-Я])/u)?.[1] || null;
  }
  const cities = text.match(/связывающих города ([А-Я, ]+)\./u)[1].split(',').map(s => s.trim());
  assert.deepEqual([...vertices].sort(), cities.sort(), 'graph vertices differ from condition');
  assert.deepEqual({ start, end, must, avoid, cycle }, Object.fromEntries(['start', 'end', 'must', 'avoid', 'cycle'].map(k => [k, data[k]])));
  for (const [u, next] of Object.entries(graph)) {
    assert.equal(new Set(next).size, next.length, 'duplicate road');
    for (const v of next) assert.ok(vertices.includes(v) && u !== v, 'invalid road');
  }
  // Count simple paths by the complete set of visited vertices, independently
  // of the topological tables used in the written solution.
  const n = vertices.length, si = vertices.indexOf(start), ti = vertices.indexOf(end);
  const mi = vertices.indexOf(must), bad = vertices.indexOf(avoid);
  const edges = vertices.map(u => graph[u].map(v => vertices.indexOf(v)));
  const counts = Array.from({ length: 1 << n }, () => Array(n).fill(0));
  counts[1 << si][si] = 1;
  let answer = 0;
  for (let mask = 0; mask < 1 << n; mask++) for (let u = 0; u < n; u++) {
    if (!counts[mask][u]) continue;
    for (const v of edges[u]) {
      if (v === bad) continue;
      if (v === ti) {
        if (mi < 0 || (mask & (1 << mi)) || v === mi) answer += counts[mask][u];
      } else if (!(mask & (1 << v))) counts[mask | (1 << v)][v] += counts[mask][u];
    }
  }
  const vs = vertices.filter(v => v !== avoid && (!cycle || v !== start));
  const predecessors = Object.fromEntries(vs.map(v => [v, vs.filter(u => graph[u].includes(v))]));
  const degree = Object.fromEntries(vs.map(v => [v, predecessors[v].length]));
  const queue = vs.filter(v => degree[v] === 0), order = [];
  while (queue.length) {
    const u = queue.shift(); order.push(u);
    for (const v of graph[u]) if (v in degree && --degree[v] === 0) queue.push(v);
  }
  assert.equal(order.length, vs.length, 'written topological argument requires an acyclic remainder');
  const forward = {}, backward = {};
  for (const v of order) forward[v] = (cycle ? Number(graph[start].includes(v)) : Number(v === start)) + predecessors[v].reduce((a, u) => a + forward[u], 0);
  let returnVertices = [];
  if (cycle) {
    returnVertices = vs.filter(v => graph[v].includes(end));
    assert.equal(returnVertices.reduce((a, v) => a + forward[v], 0), answer);
  } else {
    for (const v of [...order].reverse()) backward[v] = Number(v === end) + graph[v].filter(w => w !== avoid).reduce((a, w) => a + backward[w], 0);
    assert.equal(must ? forward[must] * backward[must] : forward[end], answer);
    assert.equal(forward[end], backward[start]);
  }
  const result = { order, predecessors, forward, ...(cycle ? { returnVertices } : { backward }) };
  for (const [key, value] of Object.entries(result)) assert.deepEqual(value, data.tables[key], 'changed intermediate graph table: ' + key);
  return { answer: String(answer), kind: cycle ? 'cycle' : avoid ? 'required-forbidden' : must ? 'required' : 'all', ...result };
}
module.exports = { compute, auditPrimaryImage };
