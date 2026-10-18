'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseKumir, runRobot } = require('./lib/kumir-robot');
const source = (body) => 'использовать Робот\nалг\nнач\n' + body + '\nкон';
const corridor = { start: [0, 0], target: [[0, 0], [1, 0]], finish: [0, 0],
  walls: [[[-1, 0], [0, 0]], [[1, 0], [2, 0]]] };

test('Robot preserves the last corridor cell and returns to the start', () => {
  const program = parseKumir(source('нц пока справа свободно\nзакрасить\nвправо\nкц\nзакрасить\nнц пока слева свободно\nвлево\nкц'));
  assert.equal(runRobot(program, corridor).painted, 2);
});
test('Robot detects missing and extra paint, a wrong finish, and collisions', () => {
  assert.throws(() => runRobot(parseKumir(source('закрасить')), corridor), /Wrong paint/);
  assert.throws(() => runRobot(parseKumir(source('закрасить')), { start: [0, 0], target: [], walls: [] }), /Wrong paint/);
  assert.throws(() => runRobot(parseKumir(source('закрасить\nвправо\nзакрасить')), corridor), /final position/);
  assert.throws(() => runRobot(parseKumir(source('влево')), corridor), /hit a wall/);
});
test('Robot rejects unmatched blocks and bounds empty and moving infinite loops', () => {
  assert.throws(() => parseKumir(source('нц пока справа свободно\nвправо')), /Unknown command/);
  const empty = { start: [0, 0], target: [], walls: [] };
  for (const body of ['', 'вправо']) assert.throws(() => runRobot(parseKumir(source('нц пока справа свободно\n' + body + '\nкц')), empty, 20), /terminate/);
  assert.throws(() => parseKumir(source('ввод а')), /Unknown command/);
});
test('Robot supports condition negation, parentheses, and boolean precedence', () => {
  const program = parseKumir(source('если не (слева свободно) и справа свободно или сверху стена то\nзакрасить\nвсе'));
  assert.equal(runRobot(program, { ...corridor, target: [[0, 0]] }).painted, 1);
});
