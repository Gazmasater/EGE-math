const assert = require('node:assert/strict');

// Independent truth-table check. The generator selects region indices and uses
// Fraction; this audit tests Boolean events on individual elementary outcomes.
// Original diagram/formula hashes and their actual review are checked upstream.
function auditProbability(task, source, record, text) {
  const kind = text.includes('около каждого указана его вероятность') ? 'weighted'
    : text.includes('сколько исходов принадлежит') ? 'counts'
    : text.includes('из четырёх областей указана вероятность') ? 'regions'
    : text.includes('Точками показаны все равновозможные') ? 'dots' : null;
  assert.ok(kind, task.id + ': unknown primary probability condition');
  assert.equal(source.visualReview.kind, kind);
  assert.equal(source.images.length, 4);
  assert.deepEqual(source.images.map(i => i.role), ['formula','formula','formula','diagram']);
  const events = {
    A: (a,b) => a, B: (a,b) => b,
    union: (a,b) => a || b, intersection: (a,b) => a && b,
    not_union: (a,b) => !(a || b), not_intersection: (a,b) => !(a && b),
    A_or_notB: (a,b) => a || !b, notA_or_B: (a,b) => !a || b,
    A_and_notB: (a,b) => a && !b, notA_and_B: (a,b) => !a && b,
  };
  const event = events[source.visualReview.event];
  assert.ok(event, task.id + ': unknown reviewed event');
  const outcomes = [];
  const add = (a,b,mass,count=1) => {
    for (let n=0; n<count; n++) outcomes.push({a,b,mass});
  };
  if (kind === 'dots' || kind === 'counts') {
    const numbers = kind === 'dots' ? [3,2,4,1] : [18,6,12,24];
    [[true,false],[true,true],[false,true],[false,false]].forEach(([a,b],i) => add(a,b,1,numbers[i]));
    assert.equal(outcomes.length, kind === 'dots' ? 10 : 60);
  } else if (kind === 'weighted') {
    // Each number is the probability of one plotted point, in hundredths.
    add(true,false,20); add(true,false,10);
    add(true,true,10); add(true,true,30);
    add(false,true,5); add(false,true,10);
    add(false,false,5); add(false,false,10);
    assert.equal(outcomes.length,8);
    assert.ok(record.solution.includes('Они различаются'));
  } else {
    add(true,false,30); add(true,true,10);
    add(false,true,20); add(false,false,40);
  }
  let good=0, bad=0;
  for (const o of outcomes) {
    if (event(o.a,o.b)) good+=o.mass;
    else bad+=o.mass;
  }
  const total=good+bad;
  assert.equal(total, kind === 'dots' ? 10 : kind === 'counts' ? 60 : 100);
  const value=Number(record.answer.replace(',','.'));
  assert.ok(value>=0 && value<=1);
  assert.ok(Math.abs(value*total-good)<1e-10,task.id+': event truth table');
  assert.ok(Math.abs((1-value)*total-bad)<1e-10,task.id+': complementary event');
  assert.ok(source.methodSource.reviewed && source.methodSource.steps.length>100);
  assert.ok(source.externalImages.length>=1 && source.externalImages.every(i=>i.reviewed));
}
module.exports = {auditProbability};
