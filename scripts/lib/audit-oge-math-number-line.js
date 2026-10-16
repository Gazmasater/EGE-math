const assert = require('node:assert/strict');
const { decodeEntities } = require('../../lib/seo-text');
const plain = html => decodeEntities(html.replace(/<[^>]*>/g, '')).replace(/\s/g, '');
function checkNumberLine(task, record, diagram) {
  assert.ok(diagram.reviewed && diagram.assets.length === 1, task.id + ': reviewed original diagram');
  const choices = [...task.fragment.matchAll(/<tr\b[^>]*class=["'][^"']*\bactive-distractor\b[^"']*["'][^>]*>([\s\S]*?)<\/tr>/gi)]
    .map(m => plain([...m[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].at(-1)[1]));
  assert.equal(choices.length, 4);
  let selected;
  if (diagram.kind === 'root-point') {
    const rad = task.fragment.match(/<(?:m:)?msqrt\b[^>]*>([\s\S]*?)<\/(?:m:)?msqrt>/i);
    assert.ok(rad); const n = BigInt(plain(rad[1]));
    const letters = Object.entries(diagram.halfIntervals).filter(([, [lo, hi]]) => {
      const l = BigInt(lo * 2), h = BigInt(hi * 2);
      assert.ok(l >= 0n && l < h); return l * l < 4n * n && 4n * n < h * h;
    }).map(([letter]) => letter);
    assert.equal(letters.length, 1); selected = choices.flatMap((c, i) => c === 'точка' + letters[0] ? [String(i + 1)] : []);
  } else if (diagram.kind === 'difference-sign') {
    const negative = /отрицательна/.test(task.fragment), order = diagram.order;
    assert.equal(new Set(order).size, 3);
    selected = choices.slice(0, 3).flatMap((choice, i) => {
      const m = choice.match(/^([a-z])−([a-z])$/); assert.ok(m);
      assert.ok(order.includes(m[1]) && order.includes(m[2]));
      const sign = Math.sign(order.indexOf(m[1]) - order.indexOf(m[2]));
      assert.notEqual(sign, 0); return sign === (negative ? -1 : 1) ? [String(i + 1)] : [];
    });
    assert.equal(choices[3], 'ниоднаизних'); if (!selected.length) selected = ['4'];
  } else {
    assert.equal(diagram.kind, 'point-inequality'); const [lo, hi] = diagram.bounds;
    assert.ok(Number.isInteger(lo) && hi === lo + 1);
    selected = choices.flatMap((choice, i) => {
      const m = choice.match(/^(a|\d+)−(a|\d+)([<>])0$/); assert.ok(m);
      const values = [lo, hi].map(x => (m[1] === 'a' ? x : Number(m[1])) - (m[2] === 'a' ? x : Number(m[2])));
      // Endpoints are excluded. A zero at an endpoint therefore preserves
      // a strict sign everywhere inside the interval.
      const positive = values.every(x => x >= 0) && values.some(x => x > 0);
      const negative = values.every(x => x <= 0) && values.some(x => x < 0);
      assert.ok(positive || negative); return (m[3] === '>' ? positive : negative) ? [String(i + 1)] : [];
    });
  }
  assert.deepEqual(selected, [record.answer], task.id + ': unique option from primary condition and diagram');
}
function auditNumberLine(task, source, record) {
  checkNumberLine(task, record, source.diagramModel);
  assert.ok(source.methodSource?.reviewed && source.methodSource.steps.length > 80);
}
module.exports = { checkNumberLine, auditNumberLine };
