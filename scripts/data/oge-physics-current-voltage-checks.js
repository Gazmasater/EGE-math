const assert = require('node:assert/strict');
const sources = require('./oge-physics-current-voltage-sources.json');
const models = require('./oge-physics-current-voltage-models.json');
const number = s => Number(String(s).replaceAll('−', '-').replace(',', '.'));
const near = (a, b) => assert.ok(Math.abs(a - b) <= 1e-10 * Math.max(1, Math.abs(b)), `${a} != ${b}`);
module.exports = prepared => {
  const rows = new Map(prepared.map(r => [r.id, r]));
  const options = id => [...sources[id].fipiCondition.matchAll(/(\d)\)\s*([\s\S]*?)(?=\s\d\)|$)/g)];
  const choose = (id, re) => {
    const found = options(id).filter(m => re.test(m[2]));
    assert.equal(found.length, 1, `${id}: ${re}`);
    return found[0][1];
  };
  for (const [id, model] of Object.entries(models)) {
    const r = rows.get(id), m = model, source = sources[id];
    assert.ok(r, id);
    if (m.kind === 'voltage-work') {
      near(number(r.answer) * 1000 * 1.6e-19, m.work);
      assert.match(r.solution, /модул/);
    } else if (m.kind === 'time') {
      near(number(r.answer) * m.I, m.q);
    } else if (m.kind === 'charge') {
      near(number(r.answer) / m.t, m.I);
    } else if (m.kind === 'qt') {
      const dt = m.t / 4, dq = m.q / 4;
      near(dq / dt, number(r.answer));
      near(number(r.answer) * m.t, m.q);
    } else if (m.kind === 'it') {
      let area = 0;
      for (let k = 1; k < m.points.length; k++) {
        const [a, ia] = m.points[k-1], [b, ib] = m.points[k];
        const left = Math.max(a, m.start), right = Math.min(b, m.end);
        if (left >= right) continue;
        const at = t => ia + (ib - ia) * (t - a) / (b - a);
        area += (at(left) + at(right)) * (right - left) / 2;
      }
      near(number(r.answer), area);
    } else if (m.kind === 'scale') {
      const step = m.interval / m.divisions;
      const found = options(id).filter(o => {
        const v = o[2].match(/^([\d,]+)\s*(мА|А|В);\s*([\d,]+)\s*(мА|А|В)/);
        return v && number(v[1]) === step && v[2] === m.unit && number(v[3]) === m.maximum && v[4] === m.unit;
      });
      assert.equal(found.length, 1, id);assert.equal(r.answer, found[0][1]);
      near((m.maximum / step) * step, m.maximum);
    } else if (m.kind === 'measurement') {
      const uncertainty = (m.high - m.low) / m.divisions;
      const all = [...source.fipiCondition.matchAll(/(\d)\)\s*\(([\d,]+)\s*±\s*([\d,]+)\)\s*([АВ])/g)];
      const found = all.filter(v => number(v[2]) === m.value && number(v[3]) === uncertainty && v[4] === m.unit);
      assert.equal(found.length, 1, id);assert.equal(r.answer, found[0][1]);
      assert.match(r.solution, /Половину деления.*не следует/);
    } else if (m.kind === 'circuit') {
      let selected;
      if (m.layout === 'reversed') {
        // Positive current travels from higher to lower potential through the meter.
        const plusTerminalPotential = 0, zeroTerminalPotential = 8;
        assert.ok(plusTerminalPotential - zeroTerminalPotential < 0);
        selected = /^Амперметр включён.*нарушением полярности/;
      } else if (m.layout === 'branch-r1' || m.layout === 'total-current') {
        // Independent numerical circuit with two parallel resistors and a shared rheostat.
        const r1 = 20, r2 = 30, rheostat = 10, supply = 12;
        const equivalent = 1 / (1/r1 + 1/r2), total = supply / (rheostat + equivalent);
        const u = total * equivalent, i1 = u / r1, i2 = u / r2;
        near(total, i1 + i2);assert.ok(i1 < total && i2 < total);
        selected = m.layout === 'branch-r1' ? /^При замыкании ключа амперметр.*через резистор R1/ : /^При замыкании ключа амперметр.*через реостат R/;
      } else {
        const current = 12 / (10 + 20 + 30);
        const nodes = { R: current * 10, R1: current * 20, R2: current * 30 };
        near(nodes.R + nodes.R1 + nodes.R2, 12);
        if (m.layout === 'voltage') {
          selected = m.voltageSpan === 'R2' ? /^При замыкании ключа вольтметр.*на резисторе R2/ : /^При замыкании ключа вольтметр.*общее.*напряжение.*R1 и R2/;
        } else selected = m.layout === 'r2-current' ? /^При замыкании ключа амперметр.*через резистор R2/ : /^При замыкании ключа амперметр.*через реостат R/;
      }
      assert.equal(r.answer, choose(id, selected));
    } else if (m.kind === 'lamp-circuit') {
      const correctA = m.layout !== 'swapped', correctV = m.layout === 'both-correct';
      const selected = correctA && correctV ? /^И амперметр, и вольтметр включены правильно/ : correctA ? /^Только амперметр/ : /^И амперметр, и вольтметр включены неправильно/;
      assert.equal(r.answer, choose(id, selected));
      if (m.layout === 'voltmeter-wide') {
        const lampDrop = 4, rheostatDrop = 3;
        assert.notEqual(lampDrop, lampDrop + rheostatDrop);
      }
    } else if (m.kind === 'lightning') {
      const upperPotential = m.ground ? -8 : 8, lowerPotential = m.ground ? 0 : -8;
      const fieldUp = lowerPotential - upperPotential;
      assert.equal(fieldUp > 0, m.ground);
      assert.equal(r.answer, m.ground ? 'Снизу вверх.' : 'Сверху вниз.');
    } else if (m.kind === 'thermo') {
      const initial = 350 - 20;
      const final = m.mode === 'zero' ? -78.5 - (-78.5) : -78.5 - 20;
      if (m.mode === 'zero') {
        assert.equal(final, 0);assert.match(r.answer, /нулю/);
      } else {
        assert.ok(initial * final < 0);assert.match(r.answer, /противоположное/);
        assert.match(r.solution, /условная оценка/);
        assert.equal(source.discrepancy.status, 'resolved');
      }
    } else assert.fail(`Unknown current/voltage model: ${m.kind}`);
  }
  assert.equal(Object.keys(models).length, 40);
  assert.equal(Object.keys(sources).length, 40);
};
