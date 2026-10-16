const assert = require('node:assert/strict');
const models = require('./oge-physics-optical-applications-models.json');
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
const code = (before, after) => Math.abs(before - after) < 1e-9 ? '3' : after > before ? '1' : '2';
module.exports = prepared => {
  const rows = new Map(prepared.map(r => [r.id, r]));
  for (const [id, m] of Object.entries(models)) {
    const r = rows.get(id); assert.ok(r, id);
    if (m.kind === 'accommodation') {
      // Reduced eye: fixed retina and fixed corneal contribution. Trace incoming
      // paraxial rays to derive the optical power required to reach the retina.
      const retina = .017, cornea = 40, distances = m.near ? [500, .3] : [.3, 500];
      const powers = distances.map(d => {
        const h = .002, before = h / d, after = -h / retina;
        const wholeEye = (before - after) / h;
        return wholeEye - cornea;
      });
      assert.equal(r.answer, code(1 / powers[0], 1 / powers[1]) + code(...powers));
      assert.match(r.solution, /аккомодаци/);
    } else if (m.kind === 'devices') {
      const effect = device => {
        if (['periscope', 'telescope'].includes(device)) {
          const n = [Math.SQRT1_2, Math.SQRT1_2];
          const reflect = v => { const dot = v[0] * n[0] + v[1] * n[1]; return v.map((x, i) => x - 2 * dot * n[i]); };
          const middle = reflect([1, 0]); near(middle[0], 0); near(middle[1], -1);
          const out = reflect(middle); near(out[0], 1); near(out[1], 0);
          return 'reflection';
        }
        if (device === 'stove') {
          const I = 3, resistance = 20, seconds = 50, U = I * resistance;
          near(U * I * seconds, I * I * resistance * seconds);
          return 'heat';
        }
        // Refraction at an air/glass boundary changes the ray direction.
        const incident = Math.PI / 6, refracted = Math.asin(Math.sin(incident) / 1.5);
        assert.ok(refracted < incident);
        if (device === 'magnifier') {
          const F = 10, d = 7, signedImage = 1 / (1 / F - 1 / d);
          assert.ok(signedImage < 0 && -signedImage / d > 1);
        }
        return 'refraction';
      };
      assert.equal(r.answer, m.devices.map(d => m.codes[effect(d)]).join(''));
    } else if (m.kind === 'image-experiment') {
      // Two rays at different entrance heights must meet on the stated screen.
      const objectHeight = 1, heights = [0, 1.4];
      const rays = heights.map(h => ({h, slope:(h - objectHeight) / m.d - h / m.F}));
      const b = (rays[1].h - rays[0].h) / (rays[0].slope - rays[1].slope);
      near(b, m.b); near(rays[0].h + b * rays[0].slope, -2);
      assert.match(r.solution, /75 ± 2/); assert.match(r.solution, /не заменяют измерение/);
      assert.equal(r.sketch.d, m.d); assert.equal(r.sketch.F, m.F);
    } else throw new Error(id);
  }
  assert.equal(Object.keys(models).length, 10);
};
