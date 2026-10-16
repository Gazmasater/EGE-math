const assert = require('node:assert/strict');
const { decodeEntities } = require('../../lib/seo-text');

function checkCoordinatePlane(task, record, diagram) {
  assert.ok(diagram.reviewed && diagram.assets.length === 3, task.id + ': original graphs reviewed');
  const text = decodeEntities(task.fragment.replace(/<[^>]*>/g, '')).replace(/\s/g, '');
  const pairs = [...text.matchAll(/k([<>])0,b([<>])0/g)].map(m => [m[1], m[2]]);
  assert.equal(pairs.length, 3, task.id + ': three original coefficient pairs');
  const graphs = diagram.assets.map(a => {
    assert.ok(['increasing', 'decreasing'].includes(a.slope));
    assert.ok(['above-origin', 'below-origin'].includes(a.yIntercept));
    return [a.slope === 'increasing' ? '>' : '<', a.yIntercept === 'above-origin' ? '>' : '<'];
  });
  const first = text.indexOf('КОЭФФИЦИЕНТЫ') < text.indexOf('ГРАФИКИ');
  const options = first ? graphs : pairs, prompts = first ? pairs : graphs;
  const permutations = ['123', '132', '213', '231', '312', '321'];
  const valid = permutations.filter(p => prompts.every((pair, i) =>
    pair.every((sign, j) => sign === options[Number(p[i]) - 1][j])));
  assert.deepEqual(valid, [record.answer], task.id + ': unique complete matching in primary letter order');
}

function auditCoordinatePlane(task, source, record) {
  checkCoordinatePlane(task, record, source.diagramModel);
  assert.ok(source.methodSource?.reviewed && source.methodSource.steps.length > 80);
}
module.exports = { checkCoordinatePlane, auditCoordinatePlane };
