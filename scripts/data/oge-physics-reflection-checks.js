const assert = require('node:assert/strict');
const models = require('./oge-physics-reflection-models.json');
const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const reflect = (v, n) => v.map((x, i) => x - 2 * dot(v, n) * n[i]);
const deg = a => a * Math.PI / 180;
const angle = (a, b) => Math.acos(Math.max(-1, Math.min(1, dot(a, b) / Math.hypot(...a) / Math.hypot(...b)))) * 180 / Math.PI;
module.exports = prepared => {
  const rows = new Map(prepared.map(r => [r.id, r]));
  for (const [id, m] of Object.entries(models)) {
    const r = rows.get(id); assert.ok(r, id);
    if (m.kind === 'sun') {
      const incoming = [Math.cos(deg(m.height)), -Math.sin(deg(m.height))];
      const outgoing = reflect(incoming, [0, 1]);
      near(angle(outgoing, [0, 1]), Number(r.answer));
      near(angle(incoming.map(x => -x), [0, 1]), Number(r.answer));
    } else if (m.kind === 'between') {
      const alpha = m.asked === 'surface' ? 90 - Number(r.answer) : Number(r.answer);
      const incoming = [Math.sin(deg(alpha)), -Math.cos(deg(alpha))];
      near(angle(incoming.map(x => -x), reflect(incoming, [0, 1])), m.phi);
    } else if (m.kind === 'tilted-sun') {
      const incoming = [-Math.cos(deg(m.height)), -Math.sin(deg(m.height))];
      const normalAngle = m.height + Number(r.answer);
      const outgoing = reflect(incoming, [Math.cos(deg(normalAngle)), Math.sin(deg(normalAngle))]);
      near(outgoing[0], 0); near(outgoing[1], 1);
      assert.match(r.solution, /Горизонтальная линия.*горизонт/);
    } else if (m.kind === 'scale') {
      // Angles are readings of the retained primary FIPI scale, not external answer numbers.
      assert.equal(m.choices[Number(r.answer) - 1], m.angle);
      assert.match(r.solution, /нормал/);
      if (id === 'OGEPHYSBE4FE5') assert.notEqual(Number(r.answer), 2);
    } else if (['distance', 'image-distance', 'closer', 'farther', 'grow-factor', 'shrink-factor', 'changes'].includes(m.kind)) {
      // Construct point images in x=0 and measure separations before and after motion.
      const image = p => reflect(p, [1, 0]);
      const separation = d => Math.abs(d - image([d, 0])[0]);
      if (['distance', 'image-distance'].includes(m.kind)) near(separation(m.value), Number(r.answer));
      else if (['closer', 'farther'].includes(m.kind)) {
        const before = 25, after = before + (m.kind === 'closer' ? -m.value : m.value);
        near(Math.abs(separation(after) - separation(before)), Number(r.answer));
      } else if (m.kind === 'grow-factor') near(separation(7 * Number(r.answer)) / separation(7), m.value);
      else if (m.kind === 'shrink-factor') near(separation(7) / separation(7 / Number(r.answer)), m.value);
      else {
        for (const d of [2, 7, 20]) near(Math.hypot(...image([d, 5]).map((v, i) => v - image([d, 1])[i])), 4);
        const before = image([10, 0]), after = image([m.away ? 15 : 5, 0]);
        assert.equal(r.answer, '3' + (Math.abs(after[0]) > Math.abs(before[0]) ? '1' : '2'));
      }
    } else if (m.kind === 'arrow') {
      // Approximate pixels read from the primary figure (reflection-2.png), in its local coordinates.
      const origin = [199, 73], tangent = [63, 111], norm = Math.hypot(...tangent);
      const n = [-tangent[1] / norm, tangent[0] / norm];
      const pointImage = p => reflect(p.map((v, i) => v - origin[i]), n).map((v, i) => v + origin[i]);
      const tip = pointImage([183, 118]), base = pointImage([183, 180]);
      assert.ok(Math.hypot(tip[0] - 245, tip[1] - 85) < 12);
      assert.ok(Math.hypot(base[0] - 297, base[1] - 116) < 12);
      assert.ok(tip[0] < base[0] && tip[1] < base[1]); assert.equal(r.answer, '1');
    } else if (m.kind === 'puddle') {
      for (const slope of [.1, .3, .7]) {
        const out = reflect([1, -slope], [0, 1]); assert.ok(out[0] > 0 && out[1] > 0);
      }
      assert.equal(r.answer, '2'); assert.match(r.solution, /собственного автомобиля/);
    } else if (m.kind === 'landscape') {
      const rays = [[.5, -1], [.6, -1]];
      near(angle(...rays), angle(...rays.map(v => reflect(v, [0, 1]))));
      assert.equal(r.answer, '1');
    } else if (m.kind === 'reciprocal') {
      for (const a of [0, 20, 50, 85]) {
        const v = [Math.sin(deg(a)), -Math.cos(deg(a))];
        const reverse = reflect(reflect(v, [0, 1]).map(x => -x), [0, 1]);
        v.forEach((x, i) => near(reverse[i], -x));
      }
      assert.match(r.answer, /Да/); assert.match(r.solution, /обратимость/);
    } else throw new Error(id);
  }
  assert.equal(Object.keys(models).length, 23);
};
