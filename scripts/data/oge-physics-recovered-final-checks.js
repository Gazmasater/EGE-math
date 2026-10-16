'use strict';
const assert = require('node:assert/strict');
module.exports = function checkRecoveredFinal(records) {
  const byId = new Map(records.map(r => [r.id, r]));
  const iron = byId.get('OGEPHYS0B8B06'), star = byId.get('OGEPHYSDDDA91');
  // Independently read graph levels; the lowest feature is magnetic, not a
  // third change between the solid BCC/FCC crystal structures.
  const cooling = [
    {t:1539, from:'liquid', to:'bcc'},
    {t:1392, from:'bcc', to:'fcc'},
    {t:911, from:'fcc', to:'bcc'},
    {t:768, from:'bcc', to:'bcc'}
  ];
  const solid = cooling.filter(p => p.from !== 'liquid');
  assert.equal(solid.length, 3);
  assert.equal(solid.filter(p => p.from !== p.to).length, 2);
  assert.match(iron.answer, /^3.*Решу ОГЭ.*2/);
  assert.match(iron.solution, /тип кристаллической решётки не меняется/);
  // Plane parallel thin-layer limit: increasing n turns the ray toward the
  // vertical, raising the apparent altitude. Homogeneous limit has no shift.
  for (const z of [10, 30, 60, 80]) {
    const refract = n => Math.asin(Math.sin(z*Math.PI/180)/n)*180/Math.PI;
    assert.ok(90-refract(1.0003) > 90-z);
    assert.ok(Math.abs(refract(1)-z)<1e-10);
  }
  assert.equal(star.answer, 'S₁ — истинное положение, S₂ — видимое.');
  assert.match(star.solution, /n₁ sin α = n₂ sin β/);
  return 2;
};
