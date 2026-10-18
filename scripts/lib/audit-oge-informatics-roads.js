'use strict';

const assert = require('node:assert/strict');
const { conditionText, seoPlainText } = require('../../lib/seo-text');

// Independently read the original matrix, then use dynamic programming over
// visited-vertex sets. The generator uses recursive enumeration instead.
function auditRoads(task, record) {
  const latin = value => value.replace(/[АВСЕНКМОРТХ]/gu, c => 'ABCEHKMOPTX'['АВСЕНКМОРТХ'.indexOf(c)]);
  const text = latin(conditionText(task.fragment));
  const html = task.fragment.slice(task.fragment.search(/class=["']cell_0["']/u));
  const table = html.match(/<table\b[^>]*>([\s\S]*?)<\/table>/u);
  assert.ok(table, task.id + ': matrix');
  const rows = [...table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gu)].map(row =>
    [...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gu)].map(cell => latin(seoPlainText(cell[1])).replace(/\s|\u2060/gu, '')));
  const labels = rows.shift().slice(1), n = labels.length;
  assert.ok(n >= 4 && n <= 6 && new Set(labels).size === n);
  const weights = rows.map((row, index) => {
    assert.equal(row.shift(), labels[index]);
    assert.equal(row.length, n);
    return row.map(cell => {
      assert.ok(!cell || /^\d+$/u.test(cell), task.id + ': matrix cell ' + cell);
      return Number(cell);
    });
  });
  assert.equal(weights.length, n);
  for (let i = 0; i < n; i++) {
    assert.equal(weights[i][i], 0);
    for (let j = 0; j < n; j++) assert.equal(weights[i][j], weights[j][i]);
  }
  const endpoints = text.match(/между пунктами ([A-Z]) и ([A-Z])/u);
  assert.ok(endpoints, task.id + ': endpoints');
  const start = labels.indexOf(endpoints[1]), end = labels.indexOf(endpoints[2]);
  const restriction = text.match(/(не )?проходящего через (?:пункт )?([A-Z])/u);
  const via = restriction && !restriction[1] ? labels.indexOf(restriction[2]) : -1;
  const avoid = restriction && restriction[1] ? labels.indexOf(restriction[2]) : -1;
  assert.ok(start >= 0 && end >= 0 && start !== end);
  assert.match(conditionText(task.fragment), /Каждый пункт можно посетить только (?:один|1) раз/u);
  const costs = Array.from({ length: 1 << n }, () => Array(n).fill(Infinity));
  const counts = Array.from({ length: 1 << n }, () => Array(n).fill(0));
  costs[1 << start][start] = 0; counts[1 << start][start] = 1;
  let minimum = Infinity, routeCount = 0, states = 0;
  for (let mask = 0; mask < 1 << n; mask++) for (let at = 0; at < n; at++) {
    if (!counts[mask][at]) continue;
    states++;
    if (at === end) {
      if (via < 0 || (mask & (1 << via))) {
        minimum = Math.min(minimum, costs[mask][at]);
        routeCount += counts[mask][at];
      }
      continue;
    }
    for (let next = 0; next < n; next++) {
      if (next === avoid || (mask & (1 << next)) || !weights[at][next]) continue;
      const nextMask = mask | (1 << next);
      counts[nextMask][next] += counts[mask][at];
      costs[nextMask][next] = Math.min(costs[nextMask][next], costs[mask][at] + weights[at][next]);
    }
  }
  assert.equal(record.answer, String(minimum), task.id + ': independent shortest-path answer');
  // Every listed route must be valid and distinct, and their number must equal
  // the independent DP count. This proves the displayed enumeration complete.
  const printed = [...record.solution.matchAll(/^([A-Z](?:—[A-Z])+): ([\d +]+) = (\d+) (?:км|ед\. длины)\.$/gmu)];
  assert.equal(printed.length, routeCount, task.id + ': complete displayed routes');
  assert.equal(new Set(printed.map(m => m[1])).size, routeCount);
  for (const route of printed) {
    const vertices = route[1].split('—').map(label => labels.indexOf(label));
    assert.equal(vertices[0], start); assert.equal(vertices.at(-1), end);
    assert.equal(new Set(vertices).size, vertices.length);
    assert.ok(!vertices.includes(-1) && !vertices.includes(avoid));
    if (via >= 0) assert.ok(vertices.includes(via));
    const lengths = vertices.slice(1).map((vertex, index) => weights[vertices[index]][vertex]);
    assert.ok(lengths.every(value => value > 0));
    assert.deepEqual(route[2].split(' + ').map(Number), lengths);
    assert.equal(Number(route[3]), lengths.reduce((sum, value) => sum + value, 0));
  }
  assert.equal(Math.min(...printed.map(route => Number(route[3]))), minimum);
  return { shortest: minimum, routeCount, states, rejectedEdits: printed.filter(route => Number(route[3]) !== minimum).length };
}

module.exports = { auditRoads };
