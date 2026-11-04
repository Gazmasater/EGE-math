'use strict';

const assert = require('node:assert/strict');
const { conditionText } = require('../../lib/seo-text');
const cache = new Map(), shapeCache = new Map([[0, [[]]], [1, [[0]]]]);
const alphabetLetters = text => text.match(/[A-ZА-ЯЁ]/gu) || [];
const bitword = (n, length) => n.toString(2).padStart(length, '0');
const num = s => parseInt(s, 2);
const prefix = (a, b) => a.length <= b.length && Math.floor(num(b) / 2 ** (b.length - a.length)) === num(a);
function prefixFree(words) {
  return words.every((a, i) => words.every((b, j) => i === j || !prefix(a, b)));
}

// A binary word occupies a dyadic interval at the finest known depth.
// Decompose the unoccupied intervals into maximal aligned power-of-two blocks.
// This is independent of the preparation script's recursive trie traversal.
function freeRoots(words) {
  const depth = Math.max(...words.map(w => w.length));
  const used = new Uint8Array(2 ** depth);
  for (const w of words) used.fill(1, num(w) * 2 ** (depth - w.length), (num(w) + 1) * 2 ** (depth - w.length));
  const roots = [];
  for (let i = 0; i < used.length;) {
    if (used[i]) { i++; continue; }
    let size = 1;
    while (i % (size * 2) === 0 && i + size * 2 <= used.length && !used.slice(i, i + size * 2).some(Boolean)) size *= 2;
    const length = depth - Math.log2(size);
    assert.ok(length > 0);
    roots.push(bitword(i / size, length)); i += size;
  }
  return roots;
}

// Enumerate every full binary tree's sorted leaf-depth multiset. Up to four
// unknown letters occur here. Assignment is then the rearrangement inequality:
// descending weights paired with ascending depths. No subset-cost recurrence
// from the preparation script is reused.
function shapes(n) {
  if (shapeCache.has(n)) return shapeCache.get(n);
  const result = new Map();
  for (let left = 1; left < n; left++) for (const a of shapes(left)) for (const b of shapes(n - left)) {
    const leaves = [...a, ...b].map(d => d + 1).sort((x, y) => x - y);
    result.set(leaves.join(','), leaves);
  }
  const out = [...result.values()]; shapeCache.set(n, out); return out;
}
function minimumCost(roots, weights) {
  const sorted = [...weights].sort((a, b) => b - a);
  let best = Infinity;
  function enumerate(i, remaining, depths) {
    if (i === roots.length) {
      if (remaining) return;
      const ordered = [...depths].sort((a, b) => a - b);
      const value = ordered.reduce((sum, d, j) => sum + d * sorted[j], 0);
      best = Math.min(best, value); return;
    }
    for (let k = 0; k <= remaining; k++) for (const tree of shapes(k)) {
      enumerate(i + 1, remaining - k, [...depths, ...tree.map(d => d + roots[i].length)]);
    }
  }
  enumerate(0, weights.length, []); return best;
}

function parseCondition(text) {
  if (cache.has(text)) return cache.get(text);
  const m = { text, known: {} };
  if (text.includes('шестнадцатеричным кодом')) {
    const letters = alphabetLetters(text.match(/букв (.+?) решили/u)[1]);
    assert.equal(letters.length, 4);
    letters.forEach((c, i) => { m.known[c] = bitword(i, 2); });
    m.word = text.match(/символов ([А-ЯЁ]+)/u)[1];
    m.bits = [...m.word].map(c => m.known[c]).join('');
    m.hex = num(m.bits).toString(16).toUpperCase();
    m.options = [...text.matchAll(/\d\) ([A-Z0-9]+)/gu)].map(x => x[1]);
    m.answer = String(m.options.indexOf(m.hex) + 1); m.kind = 'hex';
  } else if (text.includes('только одно прошло без ошибки')) {
    const table = text.match(/таблице: (.+?) Из четырех/u)[1].split(' ');
    const letters = table.filter(w => /^[А-ЯЁ]$/u.test(w));
    const codes = table.filter(w => /^[01]+$/u.test(w));
    assert.equal(letters.length, codes.length);
    letters.forEach((c, i) => { m.known[c] = codes[i]; });
    assert.ok(prefixFree(codes)); m.kind = 'decode';
    m.rows = [...text.matchAll(/(\d)\) ([01]+)/gu)].map(x => {
      const bits = x[2]; let pos = 0; const parts = [];
      while (pos < bits.length) {
        let end = pos + 1, found = null;
        while (end <= bits.length) {
          const current = bits.slice(pos, end);
          found = Object.entries(m.known).find(([, w]) => w === current);
          if (found) break; end++;
        }
        if (!found) break;
        parts.push(found); pos = end;
      }
      return { option: Number(x[1]), bits, parts, rest: bits.slice(pos), valid: pos === bits.length };
    });
    const good = m.rows.filter(r => r.valid); assert.equal(good.length, 1); m.answer = String(good[0].option);
  } else {
    const colors = text.includes('красок');
    m.alphabet = colors ? ['Белый', 'Зелёный', 'Красный', 'Синий', 'Фиолетовый', 'Чёрный']
      : alphabetLetters(text.match(/[A-ZА-ЯЁ](?:, [A-ZА-ЯЁ]){2,}(?: и [A-ZА-ЯЁ])?/u)[0]);
    if (m.alphabet.some(c => /^[BCDEFXYZ]$/u.test(c))) m.alphabet = m.alphabet.map(c => c === 'А' ? 'A' : c);
    for (const pair of text.matchAll(/(?:^|[\s;])([A-ZА-ЯЁ]|Белый|Зелёный|Красный|Синий|Фиолетовый|Чёрный)\s*(?:[—–−-]\s*)?([01]+)(?=[\s;,.]|$)/gu)) m.known[pair[1]] = pair[2];
    const listed = text.match(/Для букв (.+?) (?:используются|использовали)(?: соответственно)? кодовые слова ([01, ]+)/u);
    if (listed) {
      const letters = alphabetLetters(listed[1]), codes = listed[2].match(/[01]+/gu);
      assert.equal(letters.length, codes.length);
      letters.forEach((c, i) => { m.known[c] = codes[i]; });
    }
    for (const pair of text.matchAll(/[Дд]ля буквы ([A-ZА-ЯЁ]) (?:использовали кодовое слово|[—–−-] кодовое слово) ([01]+)/gu)) m.known[pair[1]] = pair[2];
    const known = Object.values(m.known);
    assert.ok(known.length && prefixFree(known));
    assert.ok(Object.keys(m.known).every(c => m.alphabet.includes(c)));
    m.unknown = m.alphabet.filter(c => !(c in m.known)); m.free = freeRoots(known);
    if (text.includes('Укажите кратчайшее')) {
      m.kind = 'shortest';
      m.target = colors ? { красного: 'Красный', синего: 'Синий', фиолетового: 'Фиолетовый' }[text.match(/для кодирования (\S+) цвета/u)[1]] : text.match(/кодовое слово для буквы ([A-ZА-ЯЁ])/u)[1];
      if (m.target === 'А' && m.alphabet.includes('A')) m.target = 'A';
      assert.ok(m.unknown.includes(m.target)); m.maximum = text.includes('наибольшим'); m.rows = [];
      const capacity = known.reduce((sum, w) => sum + 2 ** -w.length, 0);
      for (let length = 1; length < 16; length++) {
        const candidates = [];
        for (let i = 0; i < 2 ** length; i++) {
          const code = bitword(i, length);
          if (prefixFree([...known, code])) candidates.push({ code, canComplete: m.unknown.length === 1 || capacity + 2 ** -length < 1 });
        }
        m.rows.push({ length, candidates });
        const valid = candidates.filter(c => c.canComplete);
        if (valid.length) { m.answer = valid[m.maximum ? valid.length - 1 : 0].code; break; }
      }
      assert.ok(m.answer);
    } else {
      m.word = text.match(/для кодирования слова ([А-ЯЁ]+)/u)?.[1] || null;
      m.kind = m.word ? 'word-length' : 'sum-length';
      m.allcodes = /сумма длин всех/u.test(text);
      m.weights = m.unknown.map(c => m.word ? [...m.word].filter(x => x === c).length : 1);
      m.fixed = Object.entries(m.known).reduce((sum, [c, w]) => sum + w.length * (m.word ? [...m.word].filter(x => x === c).length : Number(m.allcodes)), 0);
      m.cost = minimumCost(m.free, m.weights); m.answer = String(m.fixed + m.cost);
      m.tables = m.free.map((root, i) => ({ root, costs: Array.from({ length: 2 ** m.unknown.length }, (_, mask) => minimumCost(m.free.slice(0, i + 1), m.weights.filter((_, j) => mask & 2 ** j))) }));
    }
  }
  cache.set(text, m); return m;
}

function auditCodes(task, record) {
  const m = parseCondition(conditionText(task.fragment));
  const s = record.solution, id = task.id; let checkedLines = 0;
  assert.equal(record.answer, m.answer, id + ': answer');
  const expect = line => { assert.ok(s.includes(line), id + ': missing/incorrect derivation: ' + line); checkedLines++; };
  const pairs = Object.fromEntries([...s.split('\n')[0].matchAll(/([A-ZА-ЯЁ]|Белый|Зелёный|Красный|Синий|Фиолетовый|Чёрный) → ([01]+)/gu)].map(x => [x[1], x[2]]));
  assert.deepEqual(pairs, m.known, id + ': known codes'); checkedLines++;
  if (m.kind === 'hex') {
    expect(`${m.word} → ${[...m.word].map(c => m.known[c]).join(' | ')} → ${m.bits}₂.`);
    expect('1101₂ = 1 · 8 + 1 · 4 + 0 · 2 + 1 = 13, то есть D.');
    expect('1000₂ = 1 · 8 + 0 · 4 + 0 · 2 + 0 = 8.');
    expect(`Итоговая шестнадцатеричная запись: ${m.hex}.`);
    expect(`D8₁₆ = 13 · 16 + 8 = ${num(m.bits)}.`);
    expect('128 + 64 + 16 + 8 = 216.');
    expect('Вариант D8 стоит под номером 3.');
  } else if (m.kind === 'decode') {
    for (const r of m.rows) {
      expect(`Вариант ${r.option}: ${r.bits}.\nПрочитанные коды: ${r.parts.map(p => p[1]).join(' | ')}.\nПолученные буквы: ${r.parts.map(p => p[0]).join('')}.\n` + (r.valid ? 'Остатка нет: сообщение полностью декодировано.' : `Остаток ${r.rest} не разбивается на кодовые слова. Вариант отклоняем.`));
      assert.equal(r.parts.map(p => p[1]).join('') + r.rest, r.bits);
    }
  } else {
    expect('После исключения занятых ветвей остаются свободные начала: ' + m.free.join(', ') + '.');
    if (m.kind === 'shortest') {
      expect(`Ищем кратчайший код символа ${m.target}; среди равных длин выбираем ${m.maximum ? 'наибольшее' : 'наименьшее'} двоичное значение.`);
      for (const r of m.rows) expect(`Длина ${r.length}: ` + (r.candidates.length ? r.candidates.map(c => c.code + ' — ' + (c.canComplete ? 'подходит' : 'не оставляет места другим символам')).join('; ') : 'совместимых кодов нет') + '.');
      expect(`Первый допустимый уровень имеет длину ${m.answer.length}.`);
      expect(`выбираем ${m.answer}. Пример полного дополнения:`);
      const assignmentText = s.match(/Пример полного дополнения: (.+?)\./u)[1];
      const assignment = Object.fromEntries([...assignmentText.matchAll(/([A-ZА-ЯЁ]|Белый|Зелёный|Красный|Синий|Фиолетовый|Чёрный) → ([01]+)/gu)].map(x => [x[1], x[2]]));
      assert.deepEqual(Object.keys(assignment).sort(), [...m.unknown].sort());
      assert.equal(assignment[m.target], m.answer); assert.ok(prefixFree([...Object.values(m.known), ...Object.values(assignment)])); checkedLines++;
    } else {
      const assignment = {};
      for (const line of s.matchAll(/^([A-ZА-ЯЁ]): код ([01]+), длина (\d+), вес (\d+); вклад = (\d+) · (\d+) = (\d+)\.$/gmu)) {
        const [, c, code, length, weight, a, b, product] = line;
        assert.ok(m.unknown.includes(c) && !(c in assignment)); assignment[c] = code;
        assert.equal(Number(length), code.length); assert.equal(Number(weight), m.weights[m.unknown.indexOf(c)]);
        assert.equal(Number(a), Number(weight)); assert.equal(Number(b), code.length); assert.equal(Number(product), Number(a) * Number(b)); checkedLines++;
      }
      assert.deepEqual(Object.keys(assignment).sort(), [...m.unknown].sort(), id + ': assignment rows');
      assert.ok(prefixFree([...Object.values(m.known), ...Object.values(assignment)]), id + ': prefix-free witness');
      assert.equal(m.unknown.reduce((sum, c, i) => sum + assignment[c].length * m.weights[i], 0), m.cost, id + ': optimal witness');
      expect(`Получен минимум для неизвестных кодов: ${m.cost}.`);
      for (const row of m.tables) {
        const values = m.kind === 'sum-length' ? Array.from({ length: m.unknown.length + 1 }, (_, k) => row.costs[2 ** k - 1]) : row.costs;
        expect(`После ветви ${row.root}: ${values.join(', ')}.`);
      }
      expect('F(d, ∅) = 0'); expect('F(d, {a}) = d · wₐ');
      expect('F(d, S) = min [F(d + 1, T) + F(d + 1, S ∖ T)]');
      if (m.kind === 'word-length') {
        expect(`Кодируем слово ${m.word}.`);
        expect('частоты букв равны: ' + m.unknown.map((c, i) => `${c}: ${m.weights[i]}`).join(', ') + '.');
        const keys = Object.keys(pairs);
        expect('Вклад известных кодов: ' + keys.map(c => `${[...m.word].filter(x => x === c).length} · ${m.known[c].length}`).join(' + ') + ` = ${m.fixed}.`);
        const full = { ...m.known, ...assignment };
        expect('Код слова по буквам: ' + [...m.word].map(c => full[c]).join(' | ') + '.');
        assert.equal([...m.word].map(c => full[c]).join('').length, Number(m.answer));
        const subsets = Array.from({ length: 2 ** m.unknown.length }, (_, mask) => m.unknown.filter((_, j) => mask & 2 ** j).join('') || '∅');
        expect('Порядок наборов в следующих строках: ' + subsets.join(', ') + '.');
      } else if (m.allcodes) {
        expect('сумму длин всех кодовых слов, включая известные.');
        expect('Их вклад = ' + Object.values(pairs).map(c => c.length).join(' + ') + ` = ${m.fixed}.`);
      } else expect('Известные коды не входят в требуемую сумму: вопрос касается только оставшихся букв.');
      expect(`Искомая длина = ${m.fixed} + ${m.cost} = ${m.answer}.`);
    }
  }
  expect('Ответ: ' + m.answer + '.');
  return { kind: m.kind, answer: m.answer, checkedLines, rejectedEdits: 0 };
}

module.exports = { auditCodes, parseCondition, minimumCost, freeRoots, prefixFree };
