'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {DatabaseSync} = require('node:sqlite');
const {readPhysicsCatalog} = require('./lib/physics-catalog');
const {reviewedCanonicalId, reviewedTaskTarget, reviewedTaskIds} = require('../lib/task-canonical');
const root = path.resolve(__dirname, '..');
const tasks = readPhysicsCatalog(root, {allAnswerTypes: true});
const db = new DatabaseSync(process.env.EGE_SOLUTIONS_DB || path.join(root, 'storage/solutions.sqlite'), {readOnly:true});
const source = db.prepare('SELECT * FROM solutions WHERE task_id=?').get('2AF210');
const target = db.prepare('SELECT * FROM solutions WHERE task_id=?').get('534193');
db.close();
const evidence = {fragment:tasks.get('2AF210').contentHtml, solution:source, targetFragment:tasks.get('534193').contentHtml, targetSolution:target};

test('The confirmed pair recommends its existing primary URL; other tasks remain individual', () => {
  assert.equal(reviewedTaskTarget('2AF210'), '534193');
  assert.equal(reviewedCanonicalId('2AF210', evidence), '534193');
  assert.equal(reviewedCanonicalId('534193', evidence), '534193');
  assert.equal(reviewedTaskTarget('1A3704'), null);
  assert.equal(reviewedCanonicalId('1A3704', evidence), '1A3704');
  assert.deepEqual(reviewedTaskIds('2AF210'), ['534193', '2AF210']);
  assert.deepEqual(reviewedTaskIds('534193'), ['534193', '2AF210']);
  assert.deepEqual(reviewedTaskIds('1A3704'), ['1A3704']);
});
test('Changing either condition restores the individual canonical URL', () => {
  for (const field of ['fragment','targetFragment']) {
    const changed = evidence[field].replace('6,3', '9,3');
    assert.notEqual(changed, evidence[field]);
    assert.equal(reviewedCanonicalId('2AF210', {...evidence,[field]:changed}), '2AF210');
  }
});
test('A changed answer, explanation, diagram or caption requires a new review on either side', () => {
  for (const key of ['solution','targetSolution']) for (const field of ['answer','solution','diagram_svg','diagram_caption']) {
    const changed = {...evidence[key],[field]:evidence[key][field]+' changed'};
    assert.equal(reviewedCanonicalId('2AF210', {...evidence,[key]:changed}), '2AF210', key+'.'+field);
  }
});
test('Missing or unpublished source or target cannot absorb an individual URL', () => {
  for (const key of ['solution','targetSolution']) {
    assert.equal(reviewedCanonicalId('2AF210', {...evidence,[key]:undefined}), '2AF210');
    assert.equal(reviewedCanonicalId('2AF210', {...evidence,[key]:{...evidence[key],published:0}}), '2AF210');
  }
  assert.equal(reviewedCanonicalId('2AF210', {...evidence,targetFragment:null}), '2AF210');
});
test('A timestamp update alone does not invalidate the reviewed content', () => {
  assert.equal(reviewedCanonicalId('2AF210', {...evidence,solution:{...source,updated_at:'2030-01-01T00:00:00Z'}}), '534193');
});
