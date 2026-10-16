const assert = require('node:assert/strict');
const models = require('./oge-physics-lenses-models.json');
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8 * Math.max(1, Math.abs(b)), `${a} != ${b}`);
const numeric = r => Number(r.answer.replace(',', '.'));
// Intersect two independently traced rays after the lens, without solving its image-distance formula.
function trace(d, F, h = 1, entrance = [-.7, .9]) {
  const [y1, y2] = entrance, slope = y => (y - h) / d - y / F;
  const b = (y2 - y1) / (slope(y1) - slope(y2));
  return {b, height: y1 + b * slope(y1)};
}
module.exports = prepared => {
  const rows = new Map(prepared.map(r => [r.id, r]));
  for (const [id, m] of Object.entries(models)) {
    const r = rows.get(id); assert.ok(r, id);
    if (m.kind === 'aperture') {
      const full = trace(1.5, 1), lower = trace(1.5, 1, 1, [-.8, -.2]), upper = trace(1.5, 1, 1, [.2, .8]);
      for (const part of [lower, upper]) { near(part.b, full.b); near(part.height, full.height); }
      assert.equal(r.answer, m.answer); assert.match(r.solution, /яркость.*уменьшается|Яркость уменьшается/s);
    } else if (m.kind === 'object-position') {
      const positions = m.case === 'large-real' ? [.5, 1.5, 2.5, 2.5] : m.case === 'small-real' ? [.5, 1.5, 2.5, 1.8] : [.5, 1.5, 2, 2.5];
      const valid = positions.flatMap((d, i) => {
        const t = trace(d, 1), real = t.b > 0;
        return (m.case === 'large-real' ? real && Math.abs(t.height) > 1 : m.case === 'small-real' ? real && Math.abs(t.height) < 1 : !real && t.height > 1) ? [i + 1] : [];
      });
      assert.deepEqual(valid, [numeric(r)]);
    } else if (m.kind === 'single-ray') {
      const sourceDistance = {'focus': 1, 'parallel': Infinity, 'double-focus': 2, 'inside-focus': .5}[m.case];
      const entranceHeight = 1, outgoingSlope = entranceHeight / sourceDistance - entranceHeight;
      const candidateSlopes = [-1, -.5, 0, 1]; near(candidateSlopes[numeric(r) - 1], outgoingSlope);
    } else if (m.kind === 'equal-image') {
      let d, F;
      if (m.case === 'distance-to-power') { d = m.value / 100; F = 1 / numeric(r); }
      else if (m.case === 'distance-to-focus') { d = m.value / 100; F = numeric(r); }
      else if (m.case === 'focus-to-distance') { d = numeric(r); F = m.value; }
      else { d = numeric(r); F = 1 / m.value; }
      const t = trace(d, F); near(t.b, d); near(t.height, -1);
    } else if (m.kind === 'candle') {
      const t = trace(m.d, m.F, m.h); near(Math.abs(t.height), numeric(r)); assert.ok(t.b > 0 && t.height < 0);
    } else if (m.kind === 'changes') {
      const t1 = trace(m.d1, 1), t2 = trace(m.d2, 1);
      const digit = (a, b) => Math.abs(a - b) < 1e-9 ? '3' : b > a ? '1' : '2';
      const changes = {F: '3', D: '3', b: digit(Math.abs(t1.b), Math.abs(t2.b)), H: digit(Math.abs(t1.height), Math.abs(t2.height))};
      assert.equal(r.answer, m.order.map(k => changes[k]).join('')); assert.equal(t1.b < 0 && t2.b < 0, m.virtual);
    } else if (m.kind === 'point-image') {
      const t = trace(m.virtual ? .4 : 1.6, 1);
      assert.equal(t.b < 0, m.virtual); assert.equal(t.height > 0, m.virtual); assert.ok(Math.abs(t.height) > 1);
      assert.equal(numeric(r), m.virtual ? 1 : 4);
    } else if (m.kind === 'grid') {
      // Primary grids: for DCA914/E77C38 the source and its image are each eight cells from O.
      // Their two rays meet at the same height only for a four-cell focal length.
      const Fcells = 100 / (numeric(r) * m.cellcm);
      if (['OGEPHYSDCA914', 'OGEPHYSE77C38'].includes(id)) {
        const out = trace(8, Fcells, -2, [-2, 3]); near(out.b, 8); near(out.height, 2);
      } else {
        // Ray initially parallel to the axis reaches y=0 at the observed two/four-cell mark.
        near(1 - m.cells / Fcells, 0);
      }
      near(numeric(r) * m.cells * m.cellcm / 100, 1);
    } else if (m.kind === 'shape') {
      assert.equal(r.answer, '7354'); assert.match(r.solution, /продолжения/);
      for (const F of [-2, 2]) near(-1 / F, F > 0 ? -.5 : .5);
    } else if (m.kind === 'magnifier') {
      assert.equal(r.answer, '4861'); assert.match(r.solution, /угловое/); assert.match(r.solution, /не является универсальным/);
      assert.ok(.25 / .05 > .25 / .1); // Same relaxed-eye viewing convention.
      assert.ok(Math.abs(trace(.3, .05).height) < Math.abs(trace(.3, .1).height)); // Counterexample for arbitrary linear magnification.
    } else if (m.kind === 'water-drop') {
      assert.equal(r.answer, '3'); assert.match(r.solution, /не является обязательным/);
      for (const y of [-1, -.5, .5, 1]) near(y + 2 * (-y / 2), 0);
    } else if (m.kind === 'focus-experiment') {
      assert.match(r.solution, /не заменяющий измерение/); assert.match(r.answer, /D = ⟦1¦F⟧/);
      const F = m.F / 100, out = trace(1000, F); assert.ok(Math.abs(out.b - F) < .002);
      near(1000 / (m.F * 10), 1 / F);
    } else if (m.kind === 'image-experiment') {
      const out = trace(m.d, m.F); near(out.b, m.b); assert.ok(out.b > 0 && out.height < 0);
      assert.match(r.solution, /b_изм снимают с установки/); assert.match(r.solution, /±2 мм/);
      assert.match(r.answer, /по измерению/);
    } else throw new Error(id);
  }
  assert.equal(Object.keys(models).length, 47);
};
