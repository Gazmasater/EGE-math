'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { ogeSourceSignature } = require('../../lib/oge-classification');
const { parseKumir, runRobot } = require('./kumir-robot');
const images = require('../data/oge-informatics-robot-images.json');
const sources = require('../data/oge-informatics-robot-sources.json');
const hash = (value) => createHash('sha256').update(value).digest('hex');

function auditRobotImages(task) {
  const reviewed = images[task.id];
  assert.ok(reviewed?.reviewed, task.id + ': primary images not reviewed');
  assert.equal(reviewed.sourceHash, ogeSourceSignature(task));
  const srcs = [...task.fragment.matchAll(/<img\b[^>]*src="([^"]+)"/gu)].map(m => m[1]);
  assert.deepEqual(srcs, reviewed.images.map(i => i.src));
  assert.ok(srcs.length >= 2, task.id + ': missing Robot diagrams');
  for (const item of reviewed.images) {
    assert.ok(item.reviewed && item.src.startsWith('/fipi/') && !item.src.includes('..'));
    const file = path.join(__dirname, '../../fipi-assets', item.src.slice('/fipi/'.length));
    assert.equal(hash(fs.readFileSync(file)), item.sha256, task.id + ': primary image changed');
  }
  return reviewed.images;
}

function auditRobot(task, record) {
  assert.equal(record.answer, 'Алгоритм приведён в шаге 3', task.id + ': answer');
  const source = sources[task.id];
  assert.equal(source.sourceHash, ogeSourceSignature(task));
  auditRobotImages(task);
  const blocks = [...record.solution.matchAll(/^```kumir\n([\s\S]*?)\n```[ \t]*(?:\n|$)/gm)];
  assert.equal(blocks.length, 1, task.id + ': Robot source block');
  assert.ok(!record.solution.replace(blocks[0][0], '').includes('```'));
  const code = blocks[0][1] + '\n';
  const program = parseKumir(code);
  const worlds = JSON.parse(execFileSync('python3', [path.join(__dirname, 'oge-informatics-robot-worlds.py')], {
    input: JSON.stringify(source.model), encoding: 'utf8', timeout: 10000, maxBuffer: 16 * 1024 * 1024
  }));
  assert.ok(worlds.length >= 180, task.id + ': incomplete geometric coverage');
  let maxSteps = 0;
  for (const world of worlds) maxSteps = Math.max(maxSteps, runRobot(program, world).steps);
  const mutant = code.includes('закрасить') ? code.replaceAll('закрасить', '') : code.replace(/\n\s*вправо\n/u, '\n  влево\n');
  assert.notEqual(mutant, code);
  let rejected = false;
  for (const world of worlds.slice(0, 30)) {
    try { runRobot(parseKumir(mutant), world); }
    catch { rejected = true; break; }
  }
  assert.ok(rejected, task.id + ': incorrect program escaped the oracle');
  return { kind: source.model.family, tests: worlds.length, maxSteps, programHash: hash(code), rejectedEdits: 1 };
}

module.exports = { auditRobot, auditRobotImages };
