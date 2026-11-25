'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const {DatabaseSync} = require('node:sqlite');
const {readPhysicsCatalog} = require('./lib/physics-catalog');
const {conditionText} = require('../lib/seo-text');
const {reviewedCanonicalId} = require('../lib/task-canonical');
const manifest = require('../lib/task-canonical.json');
const root = path.resolve(__dirname, '..');
const tasks = readPhysicsCatalog(root, {allAnswerTypes: true});
const db = new DatabaseSync(process.env.EGE_SOLUTIONS_DB || path.join(root, 'storage/solutions.sqlite'), {readOnly: true});
const get = db.prepare('SELECT * FROM solutions WHERE task_id=?');
const normalizeDiagram = (svg, id) => String(svg || '').replaceAll('ph-title-' + id, 'ph-title-TASK')
  .replaceAll(`data-physics-diagram="${id}"`, 'data-physics-diagram="TASK"').replaceAll(`>${id} · `, '>TASK · ');
let aliases = 0;
try {
  for (const group of manifest.groups) {
    assert.equal(group.subject, 'ЕГЭ физика', 'Only the reviewed physics pilot is supported');
    const target = tasks.get(group.canonicalId), targetSolution = get.get(group.canonicalId);
    assert.ok(target && targetSolution?.published === 1, 'Canonical target exists and has a published solution');
    for (const alias of group.aliases) {
      const source = tasks.get(alias), solution = get.get(alias);
      assert.ok(source && solution?.published === 1);
      assert.equal(source.answerType, target.answerType);
      assert.ok(!/ShowPicture|<(?:img|svg|object|iframe)\b|<(?:m:)?math\b/i.test(source.contentHtml + target.contentHtml), 'This pilot has no unreviewed condition pictures or MathML');
      assert.equal(conditionText(source.contentHtml), conditionText(target.contentHtml));
      for (const field of ['answer','solution','diagram_caption']) assert.equal(solution[field], targetSolution[field], field);
      assert.equal(normalizeDiagram(solution.diagram_svg, alias), normalizeDiagram(targetSolution.diagram_svg, group.canonicalId), 'Diagram differs only in task labels');
      assert.equal(reviewedCanonicalId(alias, {fragment:source.contentHtml, solution, targetFragment:target.contentHtml, targetSolution}), group.canonicalId);
      aliases++;
    }
  }
} finally { db.close(); }
console.log(JSON.stringify({groups:manifest.groups.length,aliases,conditionAnswerSolutionAndDiagramVerified:true}));
