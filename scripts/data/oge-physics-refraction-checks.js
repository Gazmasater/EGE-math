'use strict';
const assert = require('node:assert/strict');
const models = require('./oge-physics-refraction-models.json');
module.exports = function checkRefraction(records) {
  const sin = a => Math.sin(a * Math.PI / 180);
  const refract = (angle, n1, n2) => Math.asin(n1 * sin(angle) / n2) * 180 / Math.PI;
  const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
  const byId = new Map(records.map(r => [r.id, r]));
  for (const [id, m] of Object.entries(models)) {
    const r = byId.get(id); assert.ok(r, id);
    if (m.kind === 'protractor') {
      assert.equal(m.options[Number(r.answer) - 1], m.beta);
      assert.ok(m.beta > 0 && m.beta < 90);
      near(m.beta + (90 - m.beta), 90);
    } else if (m.kind === 'ray-choice') {
      // Angles preserve the independently read ordering of arrows, not a fitted index.
      const possible = m.candidateAngles.map((b, i) => ({b, i: i + 1})).filter(({b}) =>
        b > 0 && (m.toward ? b < m.incident : b > m.incident));
      assert.equal(possible.length, 1); assert.equal(String(possible[0].i), r.answer);
      const n1 = m.toward ? 1 : 1.5, n2 = m.toward ? 1.5 : 1;
      const beta = refract(30, n1, n2); near(refract(beta, n2, n1), 30);
    } else if (m.kind === 'tilted') {
      const alpha = Math.abs(m.incidentAngle - m.normalAngle);
      const possibilities = m.candidateDirections.map((a, i) => ({a, i: i + 1})).filter(({a}) =>
        a > m.incidentAngle && a < m.normalAngle && Math.abs(a - m.normalAngle) < alpha);
      assert.equal(possibilities.length, 1); assert.equal(String(possibilities[0].i), r.answer);
    } else if (m.kind === 'plate') {
      for (const alpha of [15, 30, 45, 65]) {
        const beta = refract(alpha, 1, 1.5); assert.ok(beta < alpha);
        near(refract(beta, 1.5, 1), alpha);
        assert.ok(Math.tan(alpha * Math.PI / 180) > Math.tan(beta * Math.PI / 180));
      }
      assert.equal(r.answer, '2');
    } else if (m.kind === 'speed') {
      const sines = m.dx.map((x, i) => x / Math.hypot(x, m.dy[i]));
      assert.equal(String(sines.indexOf(Math.max(...sines)) + 1), r.answer);
      const indices = sines.map(s => 1 / s), speeds = indices.map(n => 1 / n);
      speeds.forEach((v, i) => near(v, sines[i]));
    } else if (m.kind === 'apparent-depth') {
      for (const alpha of [5, 15, 30]) {
        const beta = refract(alpha, 4 / 3, 1);
        const depthRatio = Math.tan(alpha * Math.PI / 180) / Math.tan(beta * Math.PI / 180);
        assert.ok(depthRatio > 0 && depthRatio < 1);
      }
      assert.equal(r.answer, '1');
    } else if (m.kind === 'comparison') {
      const water = refract(40, 1, 4 / 3), glass = refract(40, 1, 1.5);
      assert.ok(glass < water && water < 40);
      for (const n of [4 / 3, 1.5]) {
        const next = refract(m.decrease ? 35 : 45, 1, n);
        assert.ok(m.decrease ? next < refract(40, 1, n) : next > refract(40, 1, n));
      }
      assert.equal(r.answer, m.decrease ? '4562' : '4561');
    } else throw new Error('Unknown refraction model ' + m.kind);
  }
  return Object.keys(models).length;
};
