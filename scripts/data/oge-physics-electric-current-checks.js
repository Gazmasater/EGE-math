const assert = require('node:assert/strict');
const sources = require('./oge-physics-electric-current-sources.json');
module.exports = prepared => {
  const rows = new Map(prepared.map(r => [r.id.slice(7), r]));
  const choice = (id, re) => {
    const all = [...sources['OGEPHYS' + id].fipiCondition.matchAll(/(\d)\)\s*([\s\S]*?)(?=\s\d\)|$)/g)].filter(m => re.test(m[2]));
    assert.equal(all.length, 1, `${id}: ${re}`);
    return all[0][1];
  };
  for (const [id, rodCharge] of [['76D50D', 1], ['B07A6C', -1]]) {
    const electronCharge = -1;
    const electronsTransferredToBall = rodCharge * 4;
    const ballCharge = electronsTransferredToBall * electronCharge;
    const leafCharge = -ballCharge / 2;
    assert.equal(ballCharge + 2 * leafCharge, 0);
    assert.ok(ballCharge * rodCharge < 0);
    assert.ok(leafCharge * leafCharge > 0);
    const answer = [/^электризация через влияние/, ballCharge < 0 ? /^отрицательный/ : /^положительный/, /^проводники/, /^одноимённый/].map(re => choice(id, re)).join('');
    assert.equal(rows.get(id).answer, answer);
    assert.match(rows.get(id).solution, /в целом нейтральным/);
  }
  const repelled = 'F218B0', silkCharge = -1;
  const validSigns = [-1, 0, 1].filter(q => q * silkCharge > 0);
  assert.deepEqual(validSigns, [-1]);
  assert.equal(rows.get(repelled).answer, [/^отталкиваться от платка/, /^взаимодействие заряженных тел/, /^одноимённо/, /^отрицательный/].map(re => choice(repelled, re)).join(''));
  for (const [id, words] of [
    ['5EB891', [/^дистиллированная вода/, /^ионы/, /^электрическое поле/, /^электрический ток/]],
    ['A6AB9F', [/^соляная кислота/, /^ионы/, /^электрическое поле/, /^дистиллированная вода/]],
  ]) {
    assert.equal(rows.get(id).answer, words.map(re => choice(id, re)).join(''));
    assert.match(rows.get(id).solution, /недостаточ.*свечения/);
    assert.match(rows.get(id).solution, /электрическое поле/i);
    // The two signs of carrier move in opposite directions, giving the same sign of current.
    const field = 3, mobility = 2;
    const currents = [-1, 1].map(q => q * (mobility * q * field));
    assert.ok(currents.every(j => j > 0));
  }
  assert.equal(Object.keys(sources).length, 5);
};
