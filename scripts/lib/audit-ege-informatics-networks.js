'use strict';

const assert = require('node:assert/strict');
const { conditionText } = require('../../lib/seo-text');
const ipPattern = /\b(?:\d{1,3}\.){3}\d{1,3}\b/gu;
const octets = ip => ip.split('.').map(Number);
const bits = ip => octets(ip).map(n => { assert.ok(n >= 0 && n <= 255); return n.toString(2).padStart(8, '0'); }).join('');
const fromBits = s => [0, 8, 16, 24].map(i => parseInt(s.slice(i, i + 8), 2)).join('.');
const prefixMask = p => '1'.repeat(p) + '0'.repeat(32 - p);
const and = (a, b) => [...a].map((c, i) => c === '1' && b[i] === '1' ? '1' : '0').join('');
const ones = s => [...s].filter(c => c === '1').length;
const power = n => '2' + String(n).replace(/\d/gu, d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);

function readNetwork(text) {
  if (text.includes('Доступ к файлу')) {
    const [, file, host, scheme] = /Доступ к файлу\s+([\w.]+)\s*,.*?на сервере\s+([\w.]+),.*?протоколу\s+(\w+)/u.exec(text);
    const parts = [...text.matchAll(/([А-Ж])\)\s*(\S+)/gu)].map(m => [m[1], m[2]]);
    assert.equal(parts.length, 7);
    const target = scheme + '://' + host + '/' + file, orders = [];
    // Search by actual concatenation, independently of the role-based preparation.
    function visit(left, word, code) {
      if (!target.startsWith(word)) return;
      if (!left.length) { if (word === target) orders.push(code); return; }
      for (let i = 0; i < left.length; i++) visit(left.filter((_, j) => i !== j), word + left[i][1], code + left[i][0]);
    }
    visit(parts, '', ''); assert.equal(orders.length, 1);
    return { kind: 'url', answer: orders[0], parts, file, host, scheme };
  }
  if (text.includes('Для узла')) {
    const tail = text.slice(text.indexOf('Для узла')), [host, net] = tail.match(ipPattern);
    const a = bits(host), b = bits(net), candidates = [];
    for (let p = 0; p <= 32; p++) if (and(a, prefixMask(p)) === b) candidates.push(p);
    assert.ok(candidates.length);
    const index = tail.includes('последн') ? 3 : 2;
    const mode = tail.includes('количество нулей') ? 'min-zeros'
      : tail.includes('количество единиц') ? (tail.includes('наименьшее') ? 'min-ones' : 'max-ones')
        : tail.includes('наименьшее') ? 'min-byte' : 'fixed-byte';
    const values = candidates.map(p => octets(fromBits(prefixMask(p)))[index]);
    if (mode === 'fixed-byte') assert.equal(new Set(values).size, 1);
    const answer = mode === 'min-zeros' ? 32 - candidates.at(-1)
      : mode === 'max-ones' ? candidates.at(-1) : mode === 'min-ones' ? candidates[0] : Math.min(...values);
    return { kind: 'mask', host, net, a, b, candidates, index, mode, answer: String(answer),
      selected: ['min-zeros', 'max-ones'].includes(mode) ? candidates.at(-1) : candidates[0] };
  }
  const tail = text.slice(text.indexOf('Сеть задана')), [host, mask] = tail.match(ipPattern);
  const a = bits(host), m = bits(mask); assert.match(m, /^1*0*$/u);
  const p = ones(m), h = 32 - p, b = and(a, m), net = fromBits(b), broadcast = fromBits(b.slice(0, p) + '1'.repeat(h));
  if (tail.includes('Сколько')) {
    const modulus = Number(/кратно (\d+)/u.exec(tail)[1]), neg = tail.includes('не кратно'), fixed = ones(b.slice(0, p));
    // Count actual address strings; the preparation uses combinations/ipaddress.
    assert.ok(h <= 18);
    let answer = 0;
    const distribution = Array(h + 1).fill(0);
    for (let n = 0; n < 2 ** h; n++) {
      const suffix = n.toString(2).padStart(h, '0'), k = ones(suffix), total = ones(b.slice(0, p) + suffix);
      distribution[k]++;
      if (neg ? total % modulus !== 0 : total % modulus === 0) answer++;
    }
    // Independent Pascal recurrence also checks every printed combination.
    let row = [1];
    for (let n = 1; n <= h; n++) row = Array.from({ length: n + 1 }, (_, i) => (row[i - 1] || 0) + (row[i] || 0));
    assert.deepEqual(row, distribution);
    const included = row.map((_, k) => neg ? (fixed + k) % modulus !== 0 : (fixed + k) % modulus === 0);
    assert.equal(row.reduce((v, n, k) => v + (included[k] ? n : 0), 0), answer);
    return { kind: 'count', host, mask, net, broadcast, p, h, fixed, modulus, neg, row, included, answer: String(answer) };
  }
  const largest = tail.includes('наибольший'), sum = tail.includes('сумму');
  const target = largest ? fromBits(b.slice(0, p) + '1'.repeat(h - 1) + '0') : net;
  assert.ok(!largest || h >= 2);
  const answer = sum ? String(octets(target).reduce((v, n) => v + n, 0)) : target.replaceAll('.', '');
  return { kind: largest ? 'host-max' : 'network', host, mask, net, broadcast, p, h, target, sum, answer };
}

function auditNetworks(task, record) {
  const model = readNetwork(conditionText(task.fragment));
  assert.equal(record.answer, model.answer, task.id + ': answer');
  const text = record.solution, needs = (s, reason = 'derivation') => assert.ok(text.includes(s), task.id + ': ' + reason + ': ' + s);
  let linesChecked = 0;
  if (model.kind === 'url') {
    needs('Последовательность букв: ' + [...model.answer].join(' → ') + '.', 'URL order');
    const displayed = [...text.matchAll(/^(\d)\. (.+): буква ([А-Ж])\.$/gmu)];
    assert.equal(displayed.length, 7);
    const mapping = Object.fromEntries(model.parts);
    const values = [...model.answer].map(k => mapping[k]);
    const roles = ['Протокол ' + values[0], 'Двоеточие и две косые черты', 'Начало имени сервера ' + values[2], 'Окончание имени сервера ' + values[3], 'Одна косая черта', 'Начало имени файла ' + values[5], 'Расширение файла ' + values[6]];
    displayed.forEach((m, i) => { assert.equal(Number(m[1]), i + 1); assert.equal(m[2], roles[i]); assert.equal(m[3], model.answer[i]); });
    linesChecked = 7;
  } else {
    let mask = model.mask;
    if (model.kind === 'mask') {
      const { candidates, mode, selected, a, b } = model;
      mask = fromBits(prefixMask(selected));
      const printed = [...text.matchAll(/^p = (\d+): M = ([\d.]+); единиц (\d+), нулей (\d+)\.$/gmu)];
      assert.equal(printed.length, candidates.length);
      printed.forEach((m, i) => {
        const p = candidates[i];
        assert.equal(Number(m[1]), p); assert.equal(m[2], fromBits(prefixMask(p)));
        assert.equal(Number(m[3]), p); assert.equal(Number(m[4]), 32 - p);
      });
      const binary = [...text.matchAll(/^(Узел|Сеть), октет (\d): (\d+) = ([01]{8})₂\.$/gmu)];
      assert.equal(binary.length, 8);
      binary.forEach((m, i) => {
        const bytes = octets(i < 4 ? model.host : model.net), index = i % 4;
        assert.equal(m[1], i < 4 ? 'Узел' : 'Сеть'); assert.equal(Number(m[2]), index + 1);
        assert.equal(Number(m[3]), bytes[index]); assert.equal(m[4], bytes[index].toString(2).padStart(8, '0'));
      });
      const lastOne = b.lastIndexOf('1') + 1, firstDiff = [...a].findIndex((c, i) => c !== b[i]) + 1;
      needs('Самая правая единица адреса сети находится на позиции ' + lastOne);
      needs('Первое различие A и S находится на позиции ' + firstDiff);
      needs(`Итак, ${candidates[0]} ≤ p ≤ ${candidates.at(-1)}.`);
      needs('Проверка выбранной маски M = ' + mask);
      if (mode.endsWith('byte')) {
        const values = [...new Set(candidates.map(p => octets(fromBits(prefixMask(p)))[model.index]))].sort((a, b) => a - b);
        needs(`Возможные значения октета ${model.index + 1}: ${values.join(', ')}.`);
      } else if (mode === 'min-zeros') needs(`32 − ${selected} = ${model.answer}.`);
      else needs(`допустимое p = ${selected}.`);
      linesChecked += binary.length + printed.length;
    } else {
      needs(`Адрес сети S = ${model.net}.`);
      needs(`В маске p = ${model.p} единиц; свободных разрядов h = 32 − ${model.p} = ${model.h}.`);
      needs(`Всего адресов ${power(model.h)} = ${2 ** model.h}.`);
    }
    const andRows = [...text.matchAll(/^Октет (\d): ([01]{8}) ∧ ([01]{8}) = ([01]{8})₂ = (\d+)\.$/gmu)];
    assert.equal(andRows.length, model.kind === 'host-max' ? 8 : 4);
    andRows.forEach((m, i) => {
      const input = bits(i < 4 ? model.host : model.target), maskBits = bits(mask), index = (i % 4) * 8;
      assert.equal(Number(m[1]), i % 4 + 1);
      assert.equal(m[2], input.slice(index, index + 8)); assert.equal(m[3], maskBits.slice(index, index + 8));
      const expected = and(m[2], m[3]); assert.equal(m[4], expected); assert.equal(Number(m[5]), parseInt(expected, 2));
    });
    linesChecked += andRows.length;
    if (model.kind === 'count') {
      needs(`Число единиц в фиксированной части: w = ${model.fixed}.`);
      needs(`По условию это число ${model.neg ? 'не делится' : 'делится'} на ${model.modulus}.`);
      needs('C(h, k) = ⟦h!¦k! · (h − k)!⟧');
      needs('C(h, k + 1) = ⟦C(h, k) · (h − k)¦k + 1⟧');
      const rows = [...text.matchAll(/^k = (\d+): w \+ k = (\d+); C\((\d+), (\d+)\) = (\d+); (не подходит|подходит)\.$/gmu)];
      assert.equal(rows.length, model.h + 1);
      rows.forEach((m, k) => {
        assert.deepEqual(m.slice(1, 6).map(Number), [k, model.fixed + k, model.h, k, model.row[k]]);
        assert.equal(m[6], model.included[k] ? 'подходит' : 'не подходит');
      });
      needs('Подходящие k: ' + model.row.map((_, k) => k).filter(k => model.included[k]).join(', ') + '.');
      needs('Число адресов = ' + model.row.filter((_, k) => model.included[k]).join(' + ') + ' = ' + model.answer + '.');
      needs(`всех ${2 ** model.h} адресов от ${model.net} до ${model.broadcast}`);
      needs('сетевой и широковещательный адреса здесь не исключаются');
      linesChecked += rows.length;
    }
    if (model.kind === 'host-max') {
      needs(`B = S + ${power(model.h)} − 1. Для данной сети B = ${model.broadcast}.`);
      needs(`Наибольший допустимый адрес H = B − 1 = ${model.target}.`);
      const n = parseInt(bits(model.net), 2), b = parseInt(bits(model.broadcast), 2), h = parseInt(bits(model.target), 2);
      assert.equal(h, b - 1); assert.ok(h > n);
      needs(`В целочисленной записи S = ${n}, B = ${b}, H = ${h};`);
    }
    if (model.kind === 'network' || model.kind === 'host-max') {
      if (model.sum) needs(`Сумма октетов ${model.kind === 'network' ? 'S' : 'H'} = ${model.target.split('.').join(' + ')} = ${model.answer}.`);
      else needs(`Получаем ${model.answer}; это запись октетов подряд`);
    }
  }
  return { kind: model.kind, answer: model.answer, linesChecked, enumeratedAddresses: model.kind === 'count' ? 2 ** model.h : 0, rejectedEdits: 0 };
}

module.exports = { readNetwork, auditNetworks };
