'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { readOgeCatalog } = require('./lib/oge-catalog');
const { ogeTaskMatchesTopic } = require('../lib/oge-catalog');
const { ogeSourceSignature } = require('../lib/oge-classification');
const { conditionText } = require('../lib/seo-text');
const { auditTextVolume } = require('./lib/audit-oge-informatics-text-volume');
const { auditCoding } = require('./lib/audit-oge-informatics-coding');
const { auditLogic } = require('./lib/audit-oge-informatics-logic');
const { auditRoads } = require('./lib/audit-oge-informatics-roads');
const { auditExecutor } = require('./lib/audit-oge-informatics-executor');
const { auditBranches } = require('./lib/audit-oge-informatics-branches');
const { auditAddresses } = require('./lib/audit-oge-informatics-addresses');
const { auditSets } = require('./lib/audit-oge-informatics-sets');
const { auditGraphs, auditGraphImage } = require('./lib/audit-oge-informatics-graphs');
const { auditBases } = require('./lib/audit-oge-informatics-bases');
const { auditProgramming, auditProgrammingImages } = require('./lib/audit-oge-informatics-programming');
const { auditRobot, auditRobotImages } = require('./lib/audit-oge-informatics-robot');
const { auditDocument, isDocumentTask } = require('./lib/audit-oge-informatics-documents');
const { auditTextSearch } = require('./lib/audit-oge-informatics-text-search');
const { auditFileSearch } = require('./lib/audit-oge-informatics-file-search');
const { auditPresentation, auditPresentationImages } = require('./lib/audit-oge-informatics-presentations');
const { auditSpreadsheet } = require('./lib/audit-oge-informatics-spreadsheets');
const auditors = { 'text-volume': auditTextVolume, coding: auditCoding, logic: auditLogic, roads: auditRoads, executor: auditExecutor, branches: auditBranches, addresses: auditAddresses, sets: auditSets, graphs: auditGraphs, bases: auditBases, programming: auditProgramming, robot: auditRobot, documents: auditDocument, 'text-search': auditTextSearch, 'file-search': auditFileSearch, presentations: auditPresentation, spreadsheets: auditSpreadsheet };
const batches = require('./data/oge-informatics-solutions');
const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const option = key => { const i = args.indexOf(key); return i < 0 ? null : args[i + 1]; };
const tasks = readOgeCatalog(root, 'oge-informatics').tasks;
const byId = new Map(tasks.map(t => [t.id, t]));
const records = batches.flatMap(b => b.records);
const checks = [], matches = {};
assert.equal(new Set(records.map(r => r.id)).size, records.length, 'Duplicate solution');
for (const batch of batches) {
  const topicTasks = tasks.filter(t => ogeTaskMatchesTopic(t, batch.topic, 'oge-informatics'));
  let selected = topicTasks;
  if (batch.name === 'documents') {
    // Type 13 contains two distinct deliverables; audit both complete partitions.
    assert.equal(batch.topic, 'type.13');
    selected = topicTasks.filter(isDocumentTask);
    assert.equal(selected.length, 61, 'Changed document subgroup');
    const presentations = topicTasks.filter(t => !isDocumentTask(t));
    assert.equal(presentations.length, 59, 'Changed presentation subgroup');
    for (const task of presentations) {
      assert.match(conditionText(task.fragment), /создайте презентацию/iu, task.id + ': unknown type 13 task');
      assert.match(task.fragment, /\.zip|\.rar/iu, task.id + ': presentation source archive');
    }
  }
  if (batch.name === 'presentations') {
    assert.equal(batch.topic, 'type.13');
    selected = topicTasks.filter(t => !isDocumentTask(t));
    assert.equal(selected.length, 59, 'Changed presentation subgroup');
  }
  assert.deepEqual(batch.records.map(r => r.id).sort(), selected.map(t => t.id).sort(), 'Incomplete topic or subgroup ' + batch.topic);
  for (const record of batch.records) {
    const task = byId.get(record.id), source = batch.sources[record.id];
    assert.ok(task && source && record.id.startsWith('OGEINF'));
    assert.equal(ogeSourceSignature(task), source.sourceHash, record.id + ': changed FIPI source');
    assert.equal(conditionText(task.fragment), source.fipiCondition);
    assert.ok(source.reviewed && ['exact', 'variant', 'method'].includes(source.match));
    assert.match(source.url, /^https:\/\/inf-oge\.sdamgia\.ru\/problem\?id=\d+$/u);
    assert.ok(source.comparison.length > 100);
    assert.equal(record.answer, source.expectedAnswer);
    if (['programming', 'robot'].includes(batch.name)) {
      assert.equal(source.answerKind, 'program');
      assert.equal(source.externalAnswer, null);
      assert.match(source.externalProgramHash, /^[a-f0-9]{64}$/u);
    } else if (batch.name === 'documents') {
      assert.equal(source.answerKind, 'document');
      assert.equal(source.externalAnswer, null);
      assert.match(source.externalSample.sha256, /^[a-f0-9]{64}$/u);
      assert.match(source.documentHash, /^[a-f0-9]{64}$/u);
    } else if (['presentations', 'spreadsheets'].includes(batch.name)) {
      assert.equal(source.answerKind, batch.name === 'presentations' ? 'presentation' : 'spreadsheet');
      assert.equal(source.externalAnswer, null);
      assert.match(source.fileHash, /^[a-f0-9]{64}$/u);
    } else if (source.match === 'exact') assert.equal(record.answer.toLowerCase(), source.externalAnswer.toLowerCase());
    if (source.discrepancy) {
      assert.equal(source.discrepancy.status, 'resolved');
      assert.ok(source.discrepancy.resolution.length > 100);
    }
    matches[source.match] = (matches[source.match] || 0) + 1;
    assert.equal(record.diagram_svg, ''); assert.equal(record.diagram_caption, '');
    if (/<img|ShowPicture/u.test(task.fragment.split('КЭС:')[0])) {
      if (batch.name === 'robot') assert.deepEqual(source.primaryImages, auditRobotImages(task));
      else if (batch.name === 'programming') assert.deepEqual(source.primaryImages, auditProgrammingImages(task));
      else if (batch.name === 'presentations') assert.deepEqual(source.primaryImages, auditPresentationImages(task));
      else {
        assert.equal(batch.name, 'graphs', record.id + ': new primary image needs review');
        const graph = auditGraphImage(task);
        assert.deepEqual(source.primaryImages, [{ src: graph.src, sha256: graph.sha256, reviewed: true }]);
      }
    }
    assert.ok(record.solution.length > 800 && record.solution.includes('Проверка'));
    assert.ok(record.solution.endsWith('Ответ: ' + record.answer + '.'));
    const prose = batch.name === 'programming' ? record.solution.replace(/^```python\n[\s\S]*?\n```[ \t]*(?:\n|$)/gm, '') : record.solution;
    assert.ok(!/[<>]/u.test(record.answer + prose));
    assert.ok(!/\/|undefined/u.test(record.answer + record.solution));
    const stack = [];
    for (const char of record.solution) {
      if (char === '⟦') stack.push(0);
      if (char === '¦') { assert.ok(stack.length); stack[stack.length - 1]++; }
      if (char === '⟧') assert.equal(stack.pop(), 1);
    }
    assert.equal(stack.length, 0);
    const audit = auditors[batch.name];
    assert.ok(audit, 'Missing independent audit: ' + batch.name);
    const checked = audit(task, record);
    if (['programming', 'robot'].includes(batch.name)) assert.equal(checked.programHash, source.programHash, record.id + ': reviewed program changed');
    if (batch.name === 'documents') assert.equal(checked.documentHash, source.documentHash, record.id + ': reviewed document changed');
    if (['presentations', 'spreadsheets'].includes(batch.name)) assert.equal(checked.fileHash, source.fileHash, record.id + ': reviewed attachment changed');
    checks.push({ id: record.id, ...checked });
    assert.throws(() => audit(task, { ...record, answer: record.answer + 'а' }), /answer/u);
  }
}
assert.equal(records.length, tasks.length, 'Every OGE informatics task must have a solution');
let changed = 0, published = null, integrity = null, preserved = null;
if (!args.includes('--content-only')) {
  const apply = args.includes('--apply');
  const target = path.resolve(option('--db') || path.join(root, 'storage/solutions.sqlite'));
  const baselinePath = option('--baseline') && path.resolve(option('--baseline'));
  if (apply) assert.ok(baselinePath && baselinePath !== target && fs.existsSync(baselinePath), 'Apply requires a separate baseline snapshot');
  const db = new DatabaseSync(target, { readOnly: !apply });
  let transaction = false;
  try {
    if (apply) { db.exec('BEGIN IMMEDIATE'); transaction = true; }
    const read = db.prepare('SELECT * FROM solutions WHERE upper(task_id)=?');
    const readExact = db.prepare('SELECT * FROM solutions WHERE task_id=?');
    const insert = apply && db.prepare('INSERT INTO solutions(task_id,answer,solution,diagram_svg,diagram_caption,published,created_at,updated_at) VALUES(?,?,?,?,?,1,?,?)');
    for (const record of records) {
      let row = read.get(record.id);
      if (!row && apply) {
        const now = new Date().toISOString();
        insert.run(record.id, record.answer, record.solution, record.diagram_svg, record.diagram_caption, now, now);
        row = read.get(record.id); changed++;
      }
      assert.ok(row, record.id + ': unpublished');
      for (const key of ['answer', 'solution', 'diagram_svg', 'diagram_caption']) assert.equal(row[key], record[key], record.id + ': ' + key);
      assert.equal(row.published, 1);
    }
    if (baselinePath) {
      const baseline = new DatabaseSync(baselinePath, { readOnly: true });
      try {
        const rows = baseline.prepare('SELECT * FROM solutions').all();
        for (const row of rows) assert.deepEqual(readExact.get(row.task_id), row, row.task_id + ': previous row changed');
        preserved = rows.length;
      } finally { baseline.close(); }
    }
    integrity = Object.values(db.prepare('PRAGMA integrity_check').get())[0];
    assert.equal(integrity, 'ok');
    const ids = new Set(db.prepare('SELECT task_id FROM solutions WHERE published=1').all().map(r => r.task_id));
    published = tasks.filter(t => ids.has(t.id)).length;
    if (apply) { db.exec('COMMIT'); transaction = false; }
  } catch (error) { if (transaction) db.exec('ROLLBACK'); throw error; }
  finally { db.close(); }
}
const report = { catalog: tasks.length, prepared: records.length, matches, changed, published,
  remaining: published === null ? null : tasks.length - published, preserved, integrity, checks,
  rejectedEdits: checks.reduce((n, c) => n + c.rejectedEdits, 0), rejectedWrongAnswers: records.length, status: 'ok' };
if (option('--report')) fs.writeFileSync(option('--report'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ...report, checks: checks.length }));
