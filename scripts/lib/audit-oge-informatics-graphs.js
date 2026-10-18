'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { conditionText } = require('../../lib/seo-text');
const reviewed = require('../data/oge-informatics-graphs-images.json');

function auditGraphImage(task) {
  const graph = reviewed[task.id];
  assert.ok(graph?.reviewed && graph.reviewPasses === 2, task.id + ': unreviewed graph');
  const fragment = task.fragment.split('КЭС:')[0];
  const images = [...fragment.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/gu)].map(m => m[1]);
  assert.deepEqual(images, [graph.src], task.id + ': primary image changed');
  assert.match(graph.src, /^\/fipi\/oge-informatics\/docs\/[\w/.-]+\.(?:png|jpg)$/u);
  const file = path.resolve(__dirname, '../../fipi-assets', graph.src.slice('/fipi/'.length));
  assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'), graph.sha256, task.id + ': image hash');
  return graph;
}

function auditGraphs(task, record) {
  const graph = auditGraphImage(task);
  const edges = graph.edges;
  assert.equal(new Set(edges).size, edges.length);
  assert.ok(edges.every(e => /^[A-ZА-Я]{2}$/u.test(e) && e[0] !== e[1]));
  const nodes = [...new Set(edges.join(''))].sort();
  const start = nodes.includes('A') ? 'A' : 'А';
  const text = conditionText(task.fragment);
  let end = text.match(/в (?:город|насел[её]нный пункт|пункт) ([A-ZА-Я])\s*\?/u)?.[1];
  if (start === 'A') end = ({ А:'A', В:'B', Е:'E', К:'K', М:'M', Н:'H', О:'O', Р:'P', С:'C', Т:'T', Х:'X' })[end] || end;
  assert.ok(nodes.includes(end), 'graph destination');
  const next = n => edges.filter(e => e[0] === n).map(e => e[1]).sort();
  // Explicitly enumerate complete routes; the generator uses forward dynamic programming.
  let enumerated = 0;
  function routes(a, b, visited = []) {
    assert.ok(!visited.includes(a), 'directed cycle');
    if (a === b) { enumerated++; return [[a]]; }
    return next(a).flatMap(n => routes(n, b, [...visited, a]).map(route => [a, ...route]));
  }
  const paths = routes(start, end);
  assert.equal(new Set(paths.map(p => p.join(''))).size, paths.length);
  assert.equal(record.answer, String(paths.length), task.id + ': answer');
  const forward = Object.fromEntries(nodes.map(n => [n, routes(start, n).length]));
  const reverse = Object.fromEntries(nodes.map(n => [n, routes(n, end).length]));
  let equations = 0;
  for (const n of nodes) {
    const out = next(n);
    assert.ok(record.solution.includes(out.length ? n + ' → ' + out.join(', ') + '.' : 'Из ' + n + ' дорог дальше нет.'), task.id + ': printed roads');
    const incoming = edges.filter(e => e[1] === n).map(e => e[0]).sort();
    const f = n === start ? 'N(' + n + ') = 1.' : 'N(' + n + ') = ' + incoming.map(v => 'N(' + v + ')').join(' + ') + ' = ' + incoming.map(v => forward[v]).join(' + ') + ' = ' + forward[n] + '.';
    assert.ok(record.solution.includes(f), task.id + ': forward arithmetic ' + n); equations++;
    const r = n === end ? 'M(' + n + ') = 1.' : 'M(' + n + ') = ' + (out.length ? out.map(v => 'M(' + v + ')').join(' + ') + ' = ' + out.map(v => reverse[v]).join(' + ') + ' = ' : '') + reverse[n] + '.';
    assert.ok(record.solution.includes(r), task.id + ': reverse arithmetic ' + n); equations++;
  }
  assert.equal(reverse[start], forward[end]);
  return { answer: record.answer, paths: paths.length, enumerated, equations, imageHash: graph.sha256, rejectedEdits: 0 };
}

module.exports = { auditGraphs, auditGraphImage };
