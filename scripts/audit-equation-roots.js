#!/usr/bin/env node

// Проверка опубликованных ответов по уравнениям на основании исходных MathML-условий ФИПИ.
// Скрипт ничего не изменяет: ненулевой код завершения означает, что ответ требует проверки.

const fs = require('fs');
const path = require('path');
const { TextDecoder } = require('util');
const { DatabaseSync } = require('node:sqlite');

const ROOT = path.join(__dirname, '..');
const decoder = new TextDecoder('windows-1251');
const raw = ['equations-1.raw.html', 'equations-2.raw.html']
  .map(file => decoder.decode(fs.readFileSync(path.join(ROOT, file))))
  .join('');
const db = new DatabaseSync(path.join(ROOT, 'storage', 'solutions.sqlite'));
const answers = new Map(db.prepare('SELECT task_id, answer FROM solutions WHERE published = 1').all()
  .map(row => [row.task_id, row.answer]));

function decodeEntities(value) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
    .replace(/&nbsp;/g, ' ');
}

function parseMathMl(value) {
  const root = { name: 'root', children: [] };
  const stack = [root];
  for (const token of value.match(/<[^>]+>|[^<]+/g) || []) {
    if (token.startsWith('</')) {
      const name = token.match(/^<\/\s*([^\s>]+)/)?.[1]?.replace(/^m:/, '');
      let index = stack.length - 1;
      while (index && stack[index].name !== name) index -= 1;
      stack.length = index;
      continue;
    }
    if (token.startsWith('<')) {
      if (/^<\?/.test(token) || /^<!/.test(token)) continue;
      const name = token.match(/^<\s*([^\s/>]+)/)?.[1]?.replace(/^m:/, '');
      if (!name) continue;
      const node = { name, children: [] };
      stack.at(-1).children.push(node);
      if (!/\/>$/.test(token)) stack.push(node);
      continue;
    }
    stack.at(-1).children.push(decodeEntities(token));
  }
  return root;
}

function nodeText(node) {
  return typeof node === 'string' ? node : node.children.map(nodeText).join('').trim();
}

function renderMath(node) {
  if (typeof node === 'string') return node.replace(/[\s​]/g, '');
  const children = node.children.map(renderMath).filter(Boolean);
  const [left = '', right = ''] = children;
  if (['root', 'math', 'mstyle', 'semantics', 'mrow', 'mpadded'].includes(node.name)) return children.join('');
  if (['mn', 'mi', 'mo', 'mtext'].includes(node.name)) return nodeText(node);
  if (node.name === 'mfrac') return `(${left})/(${right})`;
  if (node.name === 'msup') return `(${left})^(${right})`;
  if (node.name === 'msub') return `${left}_${right}`;
  if (node.name === 'msubsup') return `${left}_${right}^${children[2] || ''}`;
  if (node.name === 'msqrt') return `√(${children.join('')})`;
  return children.join('');
}

function expandFunctionPowers(value) {
  let offset = 0;
  for (;;) {
    const matcher = /\((sin|cos|tan)\)\^\(([^()]*)\)/g;
    matcher.lastIndex = offset;
    const match = matcher.exec(value);
    if (!match) return value;
    let cursor = match.index + match[0].length;
    let argument;
    let end;
    if (value[cursor] === 'x') {
      argument = 'x';
      end = cursor + 1;
    } else if (value[cursor] === '(') {
      let depth = 0;
      let close = cursor;
      for (; close < value.length; close += 1) {
        if (value[close] === '(') depth += 1;
        if (value[close] === ')' && --depth === 0) break;
      }
      if (depth) {
        offset = cursor;
        continue;
      }
      argument = value.slice(cursor + 1, close);
      end = close + 1;
    } else {
      offset = cursor;
      continue;
    }
    value = `${value.slice(0, match.index)}(${match[1]}(${argument}))^(${match[2]})${value.slice(end)}`;
    offset = match.index + 1;
  }
}

function normalise(value) {
  let result = value
    .replace(/。/g, '')
    .replace(/[−–]/g, '-')
    .replace(/π/g, 'pi')
    .replace(/[\s​]/g, '')
    .replace(/⋅/g, '*')
    .replace(/⟦/g, '(')
    .replace(/¦/g, ')/(')
    .replace(/⟧/g, ')')
    .replace(/√\(([^()]+)\)/g, 'sqrt($1)')
    .replace(/√(\d+)/g, 'sqrt($1)')
    .replace(/arccos/g, 'acos')
    .replace(/arctg/g, 'atan')
    .replace(/tg/g, 'tan');
  result = expandFunctionPowers(result)
    .replace(/log_(\d)\^(\d+)\(([^()]*)\)/g, 'log_$1($3)^$2')
    .replace(/log_(\d)(\d+)/g, 'log_$1($2)')
    .replace(/(sin|cos|tan)(\d+)x/g, '$1($2*x)')
    .replace(/(sin|cos|tan)x/g, '$1(x)');
  return result;
}

function tokens(value) {
  const result = [];
  for (let index = 0; index < value.length;) {
    if (/[0-9.]/.test(value[index])) {
      let end = index + 1;
      while (/[0-9.]/.test(value[end] || '')) end += 1;
      result.push(['number', Number(value.slice(index, end))]);
      index = end;
      continue;
    }
    if ('+-*/^()'.includes(value[index])) {
      result.push([value[index]]);
      index += 1;
      continue;
    }
    const match = value.slice(index).match(/^(log_\d+|sqrt|sin|cos|tan|acos|asin|atan|pi|x)/);
    if (!match) throw new Error(`Неизвестный токен: ${value.slice(index)}`);
    result.push(['identifier', match[1]]);
    index += match[1].length;
  }
  return result;
}

function compile(source) {
  const sourceText = normalise(source);
  const input = tokens(sourceText);
  let position = 0;
  const peek = () => input[position];
  const beginsFactor = token => token && ['number', 'identifier', '('].includes(token[0]);
  const take = type => {
    if (peek()?.[0] !== type) throw new Error(`Ожидался ${type}, получен ${peek()?.join(':')}`);
    return input[position++];
  };
  const expression = () => {
    let node = product();
    while (['+', '-'].includes(peek()?.[0])) node = { type: input[position++][0], left: node, right: product() };
    return node;
  };
  const product = () => {
    let node = power();
    while (['*', '/'].includes(peek()?.[0]) || beginsFactor(peek())) {
      const type = ['*', '/'].includes(peek()?.[0]) ? input[position++][0] : '*';
      node = { type, left: node, right: power() };
    }
    return node;
  };
  const power = () => {
    let node = atom();
    if (peek()?.[0] === '^') {
      position += 1;
      node = { type: '^', left: node, right: power() };
    }
    return node;
  };
  const atom = () => {
    const token = peek();
    if (token?.[0] === '-') {
      position += 1;
      return { type: 'negate', value: atom() };
    }
    if (token?.[0] === 'number') {
      position += 1;
      return { type: 'number', value: token[1] };
    }
    if (token?.[0] === '(') {
      position += 1;
      const node = expression();
      take(')');
      return node;
    }
    if (token?.[0] === 'identifier') {
      position += 1;
      if (token[1] === 'x') return { type: 'x' };
      if (token[1] === 'pi') return { type: 'number', value: Math.PI };
      take('(');
      const value = expression();
      take(')');
      return { type: token[1], value };
    }
    throw new Error(`Неверный элемент: ${token?.join(':')}`);
  };
  const tree = expression();
  if (position !== input.length) throw new Error(`Не разобран хвост: ${input.slice(position).map(token => token.join(':')).join(' ')}`);
  const evaluate = (node, x) => {
    const left = () => evaluate(node.left, x);
    const right = () => evaluate(node.right, x);
    const value = () => evaluate(node.value, x);
    if (node.type === 'number') return node.value;
    if (node.type === 'x') return x;
    if (node.type === '+') return left() + right();
    if (node.type === '-') return left() - right();
    if (node.type === '*') return left() * right();
    if (node.type === '/') return left() / right();
    if (node.type === '^') return left() ** right();
    if (node.type === 'negate') return -value();
    if (node.type === 'sin') return Math.sin(value());
    if (node.type === 'cos') return Math.cos(value());
    if (node.type === 'tan') return Math.tan(value());
    if (node.type === 'sqrt') return Math.sqrt(value());
    if (node.type === 'acos') return Math.acos(value());
    if (node.type === 'asin') return Math.asin(value());
    if (node.type === 'atan') return Math.atan(value());
    if (node.type.startsWith('log_')) return Math.log(value()) / Math.log(Number(node.type.slice(4)));
    throw new Error(`Неизвестная операция: ${node.type}`);
  };
  return x => evaluate(tree, x);
}

function rootsInInterval(fn, start, end, steps = 30000) {
  const roots = [];
  const add = root => {
    // У границы ОДЗ вычисления с sin(kπ) и логарифмами могут давать ложный «нуль».
    if (Math.min(Math.abs(root - start), Math.abs(root - end)) < 1e-5) return;
    if (!Number.isFinite(root) || Math.abs(fn(root)) > 1e-6) return;
    if (!roots.some(value => Math.abs(value - root) < 1e-5)) roots.push(root);
  };
  const bisect = (left, right) => {
    let leftValue = fn(left);
    for (let index = 0; index < 70; index += 1) {
      const middle = (left + right) / 2;
      const middleValue = fn(middle);
      if (leftValue * middleValue <= 0) right = middle;
      else {
        left = middle;
        leftValue = middleValue;
      }
    }
    add((left + right) / 2);
  };
  let previousX = start;
  let previousValue = fn(previousX);
  let beforePreviousX = null;
  let beforePreviousValue = null;
  for (let index = 1; index <= steps; index += 1) {
    const currentX = start + ((end - start) * index) / steps;
    const currentValue = fn(currentX);
    if (Number.isFinite(previousValue) && Number.isFinite(currentValue)
      && previousValue * currentValue < 0 && Math.abs(previousValue) < 1e8 && Math.abs(currentValue) < 1e8) {
      bisect(previousX, currentX);
    }
    // Кратные корни не меняют знак. Ищем локальный минимум модуля функции.
    if (Number.isFinite(beforePreviousValue) && Number.isFinite(previousValue) && Number.isFinite(currentValue)
      && Math.abs(previousValue) < Math.abs(beforePreviousValue)
      && Math.abs(previousValue) <= Math.abs(currentValue)
      && Math.abs(previousValue) < 1e-2) {
      let left = beforePreviousX;
      let right = currentX;
      for (let iteration = 0; iteration < 60; iteration += 1) {
        const first = left + (right - left) / 3;
        const second = right - (right - left) / 3;
        if (Math.abs(fn(first)) <= Math.abs(fn(second))) right = second;
        else left = first;
      }
      add((left + right) / 2);
    }
    beforePreviousX = previousX;
    beforePreviousValue = previousValue;
    previousX = currentX;
    previousValue = currentValue;
  }
  return roots.sort((left, right) => left - right);
}

function parseInterval(value) {
  const match = value.match(/\[(.*);(.*)\]/);
  if (!match) throw new Error(`Не распознан отрезок: ${value}`);
  return [compile(match[1])(0), compile(match[2])(0)];
}

function parseAnswer(value) {
  const intervalPart = value.includes('На отрезке:') ? value.split('На отрезке:').at(-1) : value;
  if (/[a-zа-я]/iu.test(intervalPart.replace(/arccos|arctg/g, ''))) throw new Error('Ответ задан не конечным списком');
  const delimiter = intervalPart.includes(';') ? ';' : ',';
  return intervalPart.split(delimiter).map(part => part.trim()).filter(Boolean)
    .map(part => compile(part.replace(',', '.'))(0));
}

const imageTasks = {
  C4507A: { interval: [-4 * Math.PI, -5 * Math.PI / 2], fn: x => 2 * Math.sin(x) ** 3 - Math.SQRT2 * Math.cos(x) ** 2 - 2 * Math.sin(x) },
  DCD2BC: { interval: [-7 * Math.PI / 2, -2 * Math.PI], fn: x => (Math.cos(x) ** 2 - 1) * (2 * Math.cos(x) - Math.sqrt(3)) },
  // log₉(A)=x эквивалентно A=9ˣ=3^(2x), поэтому степени сокращаются.
  '92FD74': { interval: [-2 * Math.PI, -Math.PI / 2], fn: x => 5 * Math.SQRT2 * Math.sin(x) - 6 * Math.cos(x) ** 2 - 2 },
  '6CEDB3': { interval: [3 * Math.PI / 2, 3 * Math.PI], fn: x => Math.cos(x) ** 2 * (2 * Math.sin(x) + Math.SQRT2) },
  '015B20': { interval: [5 * Math.PI / 2, 4 * Math.PI], fn: x => 2 * Math.cos(x) ** 3 + Math.SQRT2 * Math.sin(x) ** 2 - 2 * Math.cos(x) },
  '858BD4': { interval: [-5 * Math.PI / 2, -Math.PI], fn: x => Math.cos(x) * Math.cos(2 * x) - Math.SQRT2 * Math.sin(x) ** 2 - Math.cos(x) },
  '0000C3': { interval: [7 * Math.PI / 2, 5 * Math.PI], fn: x => 2 * Math.sin(x) * Math.cos(x) ** 2 + Math.sqrt(3) - Math.sqrt(3) * Math.sin(x) ** 2 },
  '9EB1CA': { interval: [-7 * Math.PI / 2, -2 * Math.PI], fn: x => 2 * Math.sin(x) ** 2 * Math.cos(x) + Math.SQRT2 * Math.cos(x) ** 2 - Math.SQRT2 },
  '2CCC19': { interval: [-Math.PI, Math.PI / 2], fn: x => (2 * Math.sin(x) - Math.SQRT2) * (Math.sin(x) + Math.sqrt(3) * Math.cos(x)) },
  '34BB16': { interval: [3 * Math.PI, 9 * Math.PI / 2], fn: x => 4 * Math.sin(x) ** 2 + 2 * (Math.SQRT2 - Math.sqrt(3)) * Math.sin(x) - Math.sqrt(6) },
  '89582D': { interval: [4 * Math.PI, 11 * Math.PI / 2], fn: x => Math.sin(x) - Math.sqrt(3) / 2 },
  '72BEEC': { interval: [3 * Math.PI, 9 * Math.PI / 2], fn: x => 4 * Math.cos(x) ** 2 + 2 * (Math.SQRT2 - Math.sqrt(3)) * Math.cos(x) - Math.sqrt(6) },
  '78516C': { interval: [-3 * Math.PI, -3 * Math.PI / 2], fn: x => 2 * Math.sin(x) ** 2 + (Math.SQRT2 - 2) * Math.sin(x) - Math.SQRT2 },
  'C19C6E': { interval: [5 * Math.PI, 6 * Math.PI], fn: x => Math.cos(2 * x) - Math.sin(2 * x) + 1 },
  '716236': { interval: [-5 * Math.PI, -7 * Math.PI / 2], fn: x => 2 * Math.sin(x) ** 2 + (Math.sqrt(3) - 2) * Math.sin(x) - Math.sqrt(3) }
};

function collectEquationDefinitions() {
  const definitions = [];
  for (const match of raw.matchAll(/<div\s+class="qblock[^>]*\bid=['"]q([^'"]+)['"][^>]*>([\s\S]*?)<div\s+id=['"]i\1['"]/gi)) {
    const taskId = match[1].toUpperCase();
    const cell = match[2].match(/class=['"]cell_0['"][^>]*>([\s\S]*?)<\/TD><\/TR>/i)?.[1] || match[2];
    const text = cell.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    if (!/решите (?:данное )?(?:уравнение|систему уравнений)|найдите (?:все )?(?:корни|решения) уравнения/i.test(text)) continue;
    try {
      let fn;
      let interval;
      if (imageTasks[taskId]) ({ fn, interval } = imageTasks[taskId]);
      else {
        const formulas = [...cell.matchAll(/<m:math>[\s\S]*?<\/m:math>/gi)].map(item => renderMath(parseMathMl(item[0])));
        const [left, right, ...extra] = formulas[0].split('=');
        if (extra.length || right === undefined) throw new Error('Уравнение не распознано');
        const leftFn = compile(left);
        const rightFn = compile(right);
        fn = x => leftFn(x) - rightFn(x);
        interval = parseInterval(formulas[1]);
      }
      definitions.push({ taskId, fn, interval, expected: parseAnswer(answers.get(taskId) || '') });
    } catch (error) {
      definitions.push({ taskId, error: error.message });
    }
  }
  return definitions;
}

function auditEquationRoots() {
  const issues = [];
  for (const definition of collectEquationDefinitions()) {
    if (definition.error) {
      issues.push({ taskId: definition.taskId, error: definition.error });
      continue;
    }
    const actual = rootsInInterval(definition.fn, definition.interval[0], definition.interval[1]);
    const missing = actual.filter(value => !definition.expected.some(answer => Math.abs(answer - value) < 6e-5));
    if (missing.length) issues.push({ taskId: definition.taskId, missing });
    const invalidExpected = definition.expected.filter(value => {
      const result = definition.fn(value);
      return !Number.isFinite(result) || Math.abs(result) > 1e-5;
    });
    if (invalidExpected.length) issues.push({ taskId: definition.taskId, invalidExpected });
  }
  if (issues.length) {
    console.error(JSON.stringify(issues, null, 2));
    process.exitCode = 1;
  } else {
    console.log('Все опубликованные решения по уравнениям прошли численную проверку корней.');
  }
  return issues;
}

if (require.main === module) auditEquationRoots();

module.exports = { collectEquationDefinitions, rootsInInterval, auditEquationRoots };
