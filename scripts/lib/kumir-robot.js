'use strict';

// A deliberately restricted interpreter for the Robot language in the FIPI
// conditions. It parses the published source, independently of its generator.
const moves = { вверх: [0, -1], вниз: [0, 1], влево: [-1, 0], вправо: [1, 0] };
const senses = { сверху: 'вверх', снизу: 'вниз', слева: 'влево', справа: 'вправо' };

function parseKumir(source, { complete = true } = {}) {
  const clean = source.replace(/\|[^\n]*/g, '').replace(/ё/g, 'е').toLowerCase();
  if (/[^а-я\s()]/u.test(clean)) throw new Error('Unknown Robot syntax');
  const tokens = clean.match(/[а-я]+|[()]/gu) || [];
  let index = 0;
  const peek = () => tokens[index];
  function take(expected) {
    const token = tokens[index++];
    if (expected && token !== expected) throw new Error(`Expected ${expected}, got ${token}`);
    return token;
  }
  function atom() {
    if (peek() === 'не') { take(); return { op: 'not', value: atom() }; }
    if (peek() === '(') { take(); const value = expression(); take(')'); return value; }
    const side = take();
    if (!senses[side]) throw new Error(`Unknown sensor ${side}`);
    let inverted = false;
    if (peek() === 'не') { take(); inverted = true; }
    const state = take();
    if (!['свободно', 'стена'].includes(state)) throw new Error(`Unknown sensor state ${state}`);
    return { op: 'sense', direction: senses[side], free: (state === 'свободно') !== inverted };
  }
  function conjunction() {
    let left = atom();
    while (peek() === 'и') { take(); left = { op: 'and', left, right: atom() }; }
    return left;
  }
  function expression() {
    let left = conjunction();
    while (peek() === 'или') { take(); left = { op: 'or', left, right: conjunction() }; }
    return left;
  }
  function block(end) {
    const result = [];
    while (index < tokens.length && peek() !== end) {
      const command = take();
      if (command === 'закрасить' || moves[command]) result.push({ op: command });
      else if (command === 'нц') {
        take('пока'); const condition = expression(); const body = block('кц'); take('кц');
        result.push({ op: 'while', condition, body });
      } else if (command === 'если') {
        const condition = expression(); take('то'); const body = block('все'); take('все');
        result.push({ op: 'if', condition, body });
      } else throw new Error(`Unknown command ${command}`);
    }
    return result;
  }
  if (complete) { take('использовать'); take('робот'); take('алг'); take('нач'); }
  else {
    if (peek() === 'использовать') { take(); take('робот'); }
    if (peek() === 'алг') take();
    if (peek() === 'нач') take();
  }
  const result = block('кон');
  if (complete) take('кон');
  else if (peek() === 'кон') take();
  if (index !== tokens.length) throw new Error('Trailing Robot source');
  return result;
}

function runRobot(program, world, limit = 100000) {
  const cell = (point) => point.join(',');
  const edge = (a, b) => [cell(a), cell(b)].sort().join('|');
  const walls = new Set(world.walls.map(([a, b]) => edge(a, b)));
  const painted = new Set();
  let position = [...world.start]; let steps = 0;
  const tick = () => { if (++steps > limit) throw new Error('Robot did not terminate'); };
  function free(direction) {
    const [dx, dy] = moves[direction];
    return !walls.has(edge(position, [position[0] + dx, position[1] + dy]));
  }
  function condition(value) {
    if (value.op === 'sense') return free(value.direction) === value.free;
    if (value.op === 'not') return !condition(value.value);
    if (value.op === 'and') return condition(value.left) && condition(value.right);
    if (value.op === 'or') return condition(value.left) || condition(value.right);
    throw new Error('Invalid condition');
  }
  function execute(body) {
    for (const statement of body) {
      tick();
      if (statement.op === 'закрасить') painted.add(cell(position));
      else if (moves[statement.op]) {
        if (!free(statement.op)) throw new Error(`Robot hit a wall at ${cell(position)}: ${statement.op}`);
        const [dx, dy] = moves[statement.op]; position = [position[0] + dx, position[1] + dy];
      } else if (statement.op === 'if') { if (condition(statement.condition)) execute(statement.body); }
      else if (statement.op === 'while') {
        while (condition(statement.condition)) { tick(); execute(statement.body); }
      } else throw new Error('Invalid statement');
    }
  }
  execute(program);
  const expected = new Set(world.target.map(cell));
  const extra = [...painted].filter((p) => !expected.has(p));
  const missing = [...expected].filter((p) => !painted.has(p));
  if (extra.length || missing.length) throw new Error(`Wrong paint: extra ${extra.slice(0, 5)}; missing ${missing.slice(0, 5)}`);
  if (world.finish && cell(position) !== cell(world.finish)) throw new Error('Wrong final position');
  return { steps, painted: painted.size, position };
}

module.exports = { parseKumir, runRobot };
