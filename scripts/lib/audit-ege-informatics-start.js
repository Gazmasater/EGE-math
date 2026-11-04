'use strict';

const assert = require('node:assert/strict');
const { conditionText, seoPlainText } = require('../../lib/seo-text');
const { auditSets } = require('./audit-oge-informatics-sets');

function auditExecutor(task, record) {
  const text = conditionText(task.fragment);
  const square = /1\. возведи в квадрат, 2\. прибавь 1/u.test(text);
  const commands = /1\. прибавь (\d+),? 2\. умножь на (\d+)/u.exec(text);
  assert.ok(square || commands, task.id + ': commands');
  const question = text.slice(text.indexOf('Запишите'));
  const request = /получения из (?:числа )?(\d+) числа (\d+), содержащей не более (\d+) команд/u.exec(question)
    || /преобразует число (\d+) в число (\d+) и содержит не более (четырёх) команд/u.exec(question);
  assert.ok(request);
  const start = Number(request[1]), target = Number(request[2]), limit = request[3] === 'четырёх' ? 4 : Number(request[3]);
  const step = (n, c) => square ? (c === '1' ? n * n : n + 1) : (c === '1' ? n + Number(commands[1]) : n * Number(commands[2]));
  const programs = [];
  let attempted = 0;
  function visit(n, program) {
    if (program) { attempted++; if (n === target) programs.push(program); }
    if (program.length < limit) for (const c of ['1', '2']) visit(step(n, c), program + c);
  }
  visit(start, '');
  assert.ok(programs.includes(record.answer), task.id + ': answer must execute within limit');
  const chain = [start];
  for (const c of record.answer) chain.push(step(chain.at(-1), c));
  assert.ok(record.solution.includes(chain.join(' → ')), task.id + ': displayed execution');
  const lines = [...record.solution.matchAll(/^(\d+)\) команда ([12]): (\d+)(?: ([+·]) (\d+)|(²)) = (\d+)[;.]/gmu)];
  assert.equal(lines.length, record.answer.length);
  for (let i = 0; i < lines.length; i++) {
    const [, index, command, before, operator, operand, exponent, after] = lines[i];
    assert.equal(Number(index), i + 1);
    assert.equal(command, record.answer[i]); assert.equal(Number(before), chain[i]); assert.equal(Number(after), chain[i + 1]);
    if (square && command === '1') assert.equal(exponent, '²');
    else {
      assert.equal(operator, square || command === '1' ? '+' : '·');
      assert.equal(Number(operand), square ? 1 : Number(commands[Number(command)]));
    }
  }
  const example = /Например, программа (\d+)/u.exec(text);
  const initial = /которая преобразует число (\d+) в (?:число )?(\d+)/u.exec(text);
  assert.ok(example && initial);
  assert.equal([...example[1]].reduce(step, Number(initial[1])), Number(initial[2]), task.id + ': FIPI example');
  return { answer: record.answer, enumeratedPrograms: attempted, validPrograms: programs, rejectedEdits: attempted - programs.length };
}

function auditPaths(task, record) {
  const text = conditionText(task.fragment);
  // Some original answer choices use Cyrillic А and a space after a separator.
  // Normalize these typographical variants for comparison; never rewrite raw HTML.
  const normalize = s => s.replace(/^А:/u, 'A:').replace(/\\\s+/gu, '\\').trim();
  const options = [...text.matchAll(/([1-4])\) (.*?)(?= [1-4]\)|$)/gu)].map(m => [m[1], normalize(m[2])]);
  assert.equal(options.length, 4);
  let expected;
  const moved = /полное имя файла стало (.*?)\. Каково/u.exec(text);
  if (moved) {
    const parts = moved[1].split('\\');
    assert.match(parts[0], /^[A-Z]:$/u); assert.ok(parts.length >= 4);
    expected = text.includes('вновь созданного') ? parts.at(-2) : parts.slice(0, -2).join('\\');
    assert.ok(record.solution.includes(moved[1]), task.id + ': full destination');
  } else {
    const route = /посетил каталоги (.*?)\./u.exec(text)[1].split(',').map(x => normalize(x));
    const anchor = route.findIndex(x => /^[A-Z]:\\$/u.test(x));
    assert.ok(anchor > 0 && anchor < route.length - 1);
    assert.equal(new Set(route).size, route.length, 'Repeated names need separate tree analysis');
    const paths = route.map((_, i) => route[anchor] + (i < anchor ? route.slice(i, anchor).reverse() : route.slice(anchor + 1, i + 1)).join('\\'));
    for (let i = 1; i < paths.length; i++) {
      const parts = p => p.split('\\').filter(Boolean);
      const a = parts(paths[i - 1]), b = parts(paths[i]);
      assert.equal(Math.abs(a.length - b.length), 1);
      assert.deepEqual(a.slice(0, Math.min(a.length, b.length)), b.slice(0, Math.min(a.length, b.length)));
    }
    expected = text.includes('начал перемещение') ? paths[0] : paths.at(-1);
    assert.ok(record.solution.includes(paths.join(' → ')), task.id + ': displayed route');
  }
  const correct = options.filter(([, value]) => value === expected);
  assert.equal(correct.length, 1);
  assert.equal(record.answer, correct[0][0], task.id + ': answer');
  assert.ok(record.solution.includes(expected));
  return { answer: record.answer, path: expected, rejectedEdits: options.length - 1 };
}

// Recursive descent deliberately differs from the stack parser in the numeric audit.
function evaluateQuery(query, assignment) {
  const tokens = query.split(/([&|()])/u).map(x => x.trim()).filter(Boolean); let i = 0;
  function atom() {
    const token = tokens[i++];
    if (token === '(') { const v = union(); assert.equal(tokens[i++], ')'); return v; }
    assert.ok(Object.hasOwn(assignment, token)); return assignment[token];
  }
  function intersection() { let value = atom(); while (tokens[i] === '&') { i++; const b = atom(); value = value && b; } return value; }
  function union() { let value = intersection(); while (tokens[i] === '|') { i++; const b = intersection(); value = value || b; } return value; }
  const result = union(); assert.equal(i, tokens.length); return result;
}
function auditQueries(task, record) {
  const text = conditionText(task.fragment);
  if (text.includes('будет найдено по запросу')) return auditSets(task, record);
  const queries = {};
  for (const row of task.fragment.matchAll(/<tr\b[^>]*>((?:(?!<tr\b)[\s\S])*?)<\/tr>/giu)) {
    const cells = [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/giu)].map(m => seoPlainText(m[1]));
    if (cells.length === 2 && /^[АБВГ]\)$/u.test(cells[0])) queries[cells[0][0]] = cells[1];
  }
  assert.deepEqual(Object.keys(queries).sort(), ['А', 'Б', 'В', 'Г']);
  assert.deepEqual([...record.answer].sort(), ['А', 'Б', 'В', 'Г'], task.id + ': answer permutation');
  const labels = [...new Set(Object.values(queries).flatMap(q => q.split(/[&|()]/u).map(x => x.trim()).filter(Boolean)))];
  assert.ok(labels.length <= 4);
  const descending = text.includes('убывания');
  for (let mask = 0; mask < (1 << labels.length); mask++) {
    const assignment = Object.fromEntries(labels.map((label, i) => [label, Boolean(mask & (1 << i))]));
    const values = [...record.answer].map(c => Number(evaluateQuery(queries[c], assignment)));
    for (let i = 1; i < values.length; i++) assert.ok(descending ? values[i - 1] >= values[i] : values[i - 1] <= values[i], task.id + ': answer inclusion');
  }
  assert.ok(record.solution.includes([...record.answer].join(', ')), task.id + ': displayed order');
  return { answer: record.answer, truthAssignments: 1 << labels.length, rejectedEdits: 23 };
}

module.exports = { 'number-executors': auditExecutor, 'file-system': auditPaths, 'search-queries': auditQueries };
