'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {spawnSync} = require('node:child_process');
const {DatabaseSync} = require('node:sqlite');
const {solutionDatabaseFile} = require('./lib/solution-database');
const {collectEquationDefinitions} = require('./audit-equation-roots');

test('solution audits select the explicit database before the environment default', () => {
  assert.equal(solutionDatabaseFile(['--db', 'preview.sqlite'], {EGE_SOLUTIONS_DB: 'other.sqlite'}), path.resolve('preview.sqlite'));
  assert.equal(solutionDatabaseFile([], {EGE_SOLUTIONS_DB: 'other.sqlite'}), path.resolve('other.sqlite'));
  assert.throws(() => solutionDatabaseFile(['--db']), /--db/);
});

test('equation definitions use the supplied answers without opening a database at import time', () => {
  const definitions = collectEquationDefinitions(new Map([['638272', '0']]));
  assert.ok(definitions.length > 0);
  assert.deepEqual(definitions.find(row => row.taskId === '638272').expected, [0]);
});

test('both CLI auditors inspect an isolated database and never create a missing database', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ege-audit-test-'));
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  const fixture = path.join(directory, 'fixture.sqlite');
  const missing = path.join(directory, 'missing.sqlite');
  const db = new DatabaseSync(fixture);
  db.exec('CREATE TABLE solutions(task_id TEXT, answer TEXT, solution TEXT, diagram_svg TEXT, diagram_caption TEXT, published INTEGER)');
  db.close();
  for (const script of ['audit-equation-roots.js', 'audit-published-solutions.js']) {
    const run = filename => spawnSync(process.execPath, [path.join(__dirname, script), '--db', filename], {
      encoding: 'utf8', windowsHide: true, timeout: 30000,
      env: {...process.env, EGE_SOLUTIONS_DB: missing}
    });
    const result = run(fixture);
    assert.equal(result.status, 1, 'an empty fixture must fail content checks');
    assert.doesNotMatch(result.stderr, /unable to open|no such table|ERR_SQLITE/);
    assert.ok(result.stderr.includes('taskId') || result.stderr.includes('решение'), 'reports content problems from the selected database');
    const absent = run(missing);
    assert.equal(absent.status, 1);
    assert.equal(fs.existsSync(missing), false, script + ' must not create a database');
  }
});
