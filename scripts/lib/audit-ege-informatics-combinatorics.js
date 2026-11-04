'use strict';
const assert = require('node:assert/strict');
const { conditionText } = require('../../lib/seo-text');
const cache = new Map();
const pow = (b, n) => String(b) + String(n).replace(/\d/gu, c => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(c)]);
const list = a => a.join(', ') || 'нет';
const product = a => a.reduce((x, y) => x * y, 1);
const wordNumbers = { 'одну': 1, 'одной': 1, 'две': 2, 'двух': 2 };
function length(s) {
  const literal = s.match(/(?:Все |составляет |использует )(\d)-буквенные/u);
  if (literal) return Number(literal[1]);
  if (/четыр[её]х(?:буквенные|значных)/u.test(s)) return 4;
  if (/пяти(?:буквенные|значных)/u.test(s)) return 5;
  if (/шести(?:буквенные|значных)/u.test(s)) return 6;
  throw Error('Unknown length ' + s);
}
function alphabet(s) {
  const m = s.match(/букв(?:ы)? ([А-ЯЁ](?:, [А-ЯЁ])+)/u);
  assert.ok(m, 'alphabet'); return m[1].replaceAll(', ', '');
}
function readLex(s) {
  const abc = [...alphabet(s)].sort().join(''), b = abc.length, n = length(s);
  const rank = s.match(/стоит слово ([А-ЯЁ]+)/u);
  const prefix = s.match(/первое слово, которое начинается с буквы ([А-ЯЁ])/u);
  const spec = { kind: 'lex', abc, b, n, limits: {}, ban: '', startban: '', adjban: '', parity: null };
  if (rank || prefix) {
    spec.mode = rank ? 'rank' : 'prefix'; spec.word = rank ? rank[1] : prefix[1] + abc[0].repeat(n - 1);
    spec.answer = [...spec.word].reduce((v, c) => b * v + abc.indexOf(c), 0) + 1;
    return spec;
  }
  spec.mode = /количество слов/u.test(s) ? 'count' : /первое слово/u.test(s) ? 'min' : 'max';
  for (const m of s.matchAll(/(ровно|только|не более|не менее) (одну|одной|две|двух) букв[уы]? ([А-ЯЁ])/gu)) {
    const k = wordNumbers[m[2]]; spec.limits[m[3]] = m[1] === 'не более' ? [0, k] : m[1] === 'не менее' ? [k, n] : [k, k];
  }
  for (const m of s.matchAll(/содержит (?:в своей записи )?букву ([А-ЯЁ])/gu)) spec.limits[m[1]] = [1, n];
  const ban = s.match(/не содержит (?:ни одной )?букв[уы]? ([А-ЯЁ])(?!, стоящих рядом)/u); if (ban) spec.ban = ban[1];
  const start = s.match(/не начина(?:ется|ются) с (?:букв[ы ]+)?([А-ЯЁ](?:(?:, | или )[А-ЯЁ])*)/u);
  if (start) spec.startban = start[1].replace(/[^А-ЯЁ]/gu, '');
  const adj = s.match(/не содержит букв ([А-ЯЁ]), стоящих рядом/u); if (adj) spec.adjban = adj[1];
  if (/неч[её]тным номером/u.test(s)) spec.parity = 1;
  else if (/ч[её]тным(?:и)? номер(?:ом|ами)/u.test(s)) spec.parity = 0;
  assert.ok(Object.keys(spec.limits).length || spec.adjban, 'No constraints parsed');
  function count(prefix = '', override = null) {
    const limits = override || spec.limits, letters = Object.keys(limits), memo = new Map();
    function visit(pos, counts, prev, remainder) {
      if (letters.some((c, i) => counts[i] > limits[c][1] || counts[i] + n - pos < limits[c][0])) return 0;
      if (pos === n) return spec.parity === null || (remainder + 1) % 2 === spec.parity ? 1 : 0;
      const key = [pos, ...counts, prev, remainder].join(':'); if (memo.has(key)) return memo.get(key);
      let total = 0;
      for (const c of pos < prefix.length ? prefix[pos] : abc) {
        if (spec.ban.includes(c) || (!pos && spec.startban.includes(c)) || (c === prev && spec.adjban.includes(c))) continue;
        const next = counts.map((v, i) => v + Number(c === letters[i]));
        total += visit(pos + 1, next, c, (remainder * b + abc.indexOf(c)) % 2);
      }
      memo.set(key, total); return total;
    }
    return visit(0, letters.map(() => 0), '', 0);
  }
  spec.total = count(); assert.ok(spec.total > 0);
  if (spec.mode === 'count') {
    const target = Object.keys(spec.limits)[0], [lo, hi] = spec.limits[target];
    spec.rows = [...abc].map(c => ({ first: c, counts: Array.from({ length: hi - lo + 1 }, (_, k) => count(c, { [target]: [k + lo, k + lo] })) }));
    spec.answer = spec.total;
  } else {
    let word = ''; spec.prefixRows = [];
    for (let i = 0; i < n; i++) {
      const counts = [...abc].map(c => count(word + c));
      const choices = [...abc].filter((c, j) => counts[j] > 0); assert.ok(choices.length);
      const chosen = spec.mode === 'min' ? choices[0] : choices.at(-1);
      spec.prefixRows.push({ prefix: word, counts, chosen }); word += chosen;
    }
    spec.word = word; spec.answer = [...word].reduce((v, c) => v * b + abc.indexOf(c), 0) + 1;
  }
  return spec;
}
function readNumbers(s) {
  const n = length(s), b = /шестнадцатерич/u.test(s) ? 16 : /восьмерич/u.test(s) ? 8 : /шестерич/u.test(s) ? 6 : /девятерич/u.test(s) ? 9 : 10;
  const unique = s.includes('все цифры различны'), single = s.includes('ровно одна цифра');
  const kind = unique ? 'alternating' : single ? 'single-digit' : 'digit-count';
  const spec = { kind, n, b, answer: 0, groups: {}, enumerated: b ** n - b ** (n - 1) };
  const banned = s.match(/не содержащих в своей записи цифру (\d)/u);
  const targetMatch = single ? s.match(/ровно одна цифра (\d)/u) : s.match(/(?:не более|не менее) (?:одной|двух) цифр(?:ы)? (\d)/u);
  const target = targetMatch ? Number(targetMatch[1]) : null;
  const lo = /не менее двух/u.test(s) ? 2 : single ? 1 : 0;
  const hi = single || /не более одной/u.test(s) ? 1 : /не более двух/u.test(s) ? 2 : n;
  const ending = s.match(/не оканчиваются цифрами (\d) или (\d)/u);
  const evenStart = s.includes('не начинаются с нечётных'), div5 = s.includes('делящихся на 5');
  const bad = single ? (/никакая из цифр/u.test(s) ? [5, 6, 7, 8] : Array.from({ length: b }, (_, d) => d).filter(d => d % 2 === (s.includes('нечётная') ? 1 : 0))) : [];
  Object.assign(spec, { target, lo, hi, evenStart, div5, banned: banned ? Number(banned[1]) : null, bad });
  for (let number = b ** (n - 1); number < b ** n; number++) {
    const digits = Array(n); let x = number;
    for (let j = n - 1; j >= 0; j--) { digits[j] = x % b; x = Math.floor(x / b); }
    if (unique) {
      if (new Set(digits).size !== n || (banned && digits.includes(Number(banned[1]))) || digits.some((d, j) => j && d % 2 === digits[j - 1] % 2) || (div5 && number % 5 !== 0)) continue;
      const key = digits[0] % 2 + ':' + (div5 ? digits.at(-1) : 'any'); spec.groups[key] = (spec.groups[key] || 0) + 1;
    } else {
      const k = digits.filter(d => d === target).length;
      if (k < lo || k > hi || (evenStart && digits[0] % 2) || (ending && [Number(ending[1]), Number(ending[2])].includes(digits.at(-1)))) continue;
      if (single && digits.some((d, j) => d === target && ((j && bad.includes(digits[j - 1])) || (j + 1 < n && bad.includes(digits[j + 1]))))) continue;
      const key = single ? digits.indexOf(target) + 1 : k; spec.groups[key] = (spec.groups[key] || 0) + 1;
    }
    spec.answer++;
  }
  if (kind === 'digit-count' || kind === 'single-digit') {
    spec.options = Array.from({ length: n }, (_, j) => Array.from({ length: b }, (_, d) => d).filter(d => (j || d !== 0) && (j || !evenStart || d % 2 === 0) && (j !== n - 1 || !ending || ![Number(ending[1]), Number(ending[2])].includes(d))));
    if (single) spec.rows = Array.from({ length: n }, (_, pos) => {
      const options = spec.options.map((o, j) => o.filter(d => (pos === j ? d === target : d !== target) && (Math.abs(j - pos) !== 1 || !bad.includes(d))));
      const count = product(options.map(o => o.length)); assert.equal(count, spec.groups[pos + 1] || 0); return { pos: pos + 1, options, count };
    });
    else {
      let polynomial = [1]; spec.rows = [];
      for (let j = 0; j < n; j++) {
        const next = Array(polynomial.length + 1).fill(0), o = spec.options[j];
        // Multiplication of the generating polynomial by the allowed digits.
        for (let k = 0; k < polynomial.length; k++) for (const d of o) next[k + Number(d === target)] += polynomial[k];
        spec.rows.push({ i: j + 1, other: o.filter(d => d !== target).length, special: Number(o.includes(target)), counts: next }); polynomial = next;
      }
      assert.equal(polynomial.slice(lo, hi + 1).reduce((a, b) => a + b, 0), spec.answer);
    }
  }
  return spec;
}
function readWords(s) {
  const n = length(s), abc = alphabet(s), vowel = s.includes('гласная буква и она'), cherry = s.includes('не более одного раза');
  const target = vowel ? [...abc].filter(c => 'АЕЁИОУЫЭЮЯ'.includes(c)).join('') : s.match(/буква ([А-ЯЁ])/u)[1];
  const kind = cherry ? 'cherry' : vowel ? 'one-vowel' : 'one-letter';
  const spec = { kind, n, abc, target, answer: 0, groups: Array(n + 1).fill(0), enumerated: abc.length ** n };
  function visit(word, occurrences) {
    if (occurrences > 1) return;
    if (word.length === n) {
      if (!cherry && occurrences !== 1) return;
      if (cherry && (word[0] === 'Ш' || 'АЕЁИОУЫЭЮЯ'.includes(word.at(-1)))) return;
      spec.answer++; spec.groups[occurrences ? word.indexOf(target) + 1 : 0]++; return;
    }
    for (const c of abc) visit(word + c, occurrences + Number(target.includes(c)));
  }
  visit('', 0);
  if (cherry) spec.rows = Array.from({ length: n + 1 }, (_, pos) => {
    const options = Array.from({ length: n }, (_, j) => [...abc].filter(c => (j === pos - 1 ? c === target : c !== target) && (j || c !== 'Ш') && (j !== n - 1 || !'АЕЁИОУЫЭЮЯ'.includes(c))));
    const count = product(options.map(o => o.length)); assert.equal(count, spec.groups[pos]); return { pos, options, count };
  });
  return spec;
}
function readChoices(s) {
  const options = [...s.matchAll(/\d\) (\S+)/gu)].map(m => m[1]), spec = { kind: 'choice', options };
  if (s.includes('Морзе')) { spec.subkind = 'morse'; spec.value = 2 ** 5 + 2 ** 6; spec.answer = options.indexOf(String(spec.value)) + 1; }
  else if (s.includes('лампочек')) {
    const signals = Number(s.match(/передать (\d+) различных/u)[1]); let n = 0; while (2 ** n < signals) n++;
    Object.assign(spec, { subkind: 'lamps', n, signals, answer: options.indexOf(String(n)) + 1 });
  } else {
    spec.subkind = 'beads';
    const four = s.includes('четвертом'), latin = s.includes('M, N, O, P, S');
    spec.rows = options.map(w => {
      const vowels = latin ? 'O' : 'АЕ';
      const rules = four ? [w[0] !== 'Д' && w[0] !== 'Е', vowels.includes(w[1]) === vowels.includes(w[0]), 'БВДЕ'.includes(w[2]) && w[2] !== w[0] && w[2] !== w[1], !vowels.includes(w[3]) && w[3] !== w[1] && w[3] !== w[2]]
        : latin ? ['OPS'.includes(w[0]) && w[0] !== w[1], 'MOS'.includes(w[1]), vowels.includes(w[0]) !== vowels.includes(w[2])]
          : ['БВГ'.includes(w[0]) && w[0] !== w[1] && w[0] !== w[2], 'АБВ'.includes(w[1]), 'АВГ'.includes(w[2])];
      return { word: w, rules };
    });
    const good = spec.rows.map((r, i) => r.rules.every(Boolean) ? i + 1 : 0).filter(Boolean); assert.equal(good.length, 1); spec.answer = good[0];
  }
  assert.ok(spec.answer > 0); return spec;
}
function calculate(s) {
  if (cache.has(s)) return cache.get(s);
  const value = /алфавитном порядке/u.test(s) ? readLex(s) : /Выберите правильный ответ/u.test(s) ? readChoices(s) : /значных чисел/u.test(s) ? readNumbers(s) : readWords(s);
  cache.set(s, value); return value;
}
function auditCombinatorics(task, record) {
  const s = conditionText(task.fragment), m = calculate(s), text = record.solution;
  assert.equal(record.answer, String(m.answer), task.id + ': answer');
  let linesChecked = 0;
  const has = value => { assert.ok(text.includes(value), task.id + ': derivation missing or wrong: ' + value); linesChecked++; };
  if (m.kind === 'lex') {
    has(`Длина слова n = ${m.n}. Алфавит в порядке возрастания: ${list([...m.abc])}`);
    has([...m.abc].map((c, i) => `${c} → ${i}`).join(', '));
    has('N = 1 + d₁ · bⁿ⁻¹ + d₂ · bⁿ⁻² + … + dₙ');
    if (m.mode === 'count') {
      for (const r of m.rows) has(`Первая ${r.first}: ${list(r.counts)}; сумма = ${r.counts.reduce((a, b) => a + b, 0)}.`);
      has('Новый остаток равен остатку от r + d · bⁿ⁻ⁱ');
      has('Всего слов = ' + m.rows.map(r => r.counts.reduce((a, b) => a + b, 0)).join(' + ') + ` = ${m.answer}.`);
    } else {
      const digits = [...m.word].map(c => m.abc.indexOf(c)), terms = digits.map((d, i) => d * m.b ** (m.n - i - 1));
      if (m.prefixRows) for (const r of m.prefixRows) has(`Начало «${r.prefix || 'пусто'}»: ` + [...m.abc].map((c, i) => `${c}: ${r.counts[i]}`).join(', ') + `; выбираем ${r.chosen}.`);
      has('Код слова: ' + digits.join('') + '.');
      for (let i = 0; i < m.n; i++) has(`Место ${i + 1}: ${m.word[i]} → ${digits[i]}; вклад = ${digits[i]} · ${pow(m.b, m.n - i - 1)} = ${terms[i]}.`);
      has('N = 1 + ' + terms.join(' + ') + ` = ${m.answer}.`);
    }
    for (const [c, [lo, hi]] of Object.entries(m.limits)) has(`число букв ${c} от ${lo} до ${hi} включительно`);
    if (m.startban) has('первая буква не входит в ' + list([...m.startban]));
    if (m.ban) has('полностью исключены буквы ' + list([...m.ban]));
    if (m.adjban) has('запрещены соседние пары ' + list([...m.adjban].map(c => c + c)));
    if (m.parity !== null) has('номер ' + (m.parity ? 'нечётный' : 'чётный'));
  } else if (m.kind === 'alternating') {
    has(`Основание системы b = ${m.b}, длина n = ${m.n}`);
    const rows = [...text.matchAll(/Шаблон ([ЧН]+)(?:, последняя цифра (\d))?\. Первую цифру выбираем из ([\d, ]+)\. После фиксации крайних цифр остаётся выбрать (\d+) чётных из (\d+) и (\d+) нечётных из (\d+)\.\nЧисло способов = (\d+) · A\((\d+), (\d+)\) · A\((\d+), (\d+)\) = (\d+) · (\d+) · (\d+) = (\d+)\./gu)];
    assert.equal(rows.length, Object.keys(m.groups).length, 'alternating rows');
    const seen = new Set();
    for (const r of rows) {
      const parity = r[1][0] === 'Ч' ? 0 : 1, last = r[2] === undefined ? null : Number(r[2]), digits = Array.from({ length: m.b }, (_, d) => d).filter(d => d !== m.banned);
      assert.equal(r[1], Array.from({ length: m.n }, (_, j) => (j + parity) % 2 ? 'Н' : 'Ч').join(''));
      const first = digits.filter(d => d && d % 2 === parity && d !== last); assert.equal(r[3], list(first));
      const available = [0, 1].map(p => digits.filter(d => d % 2 === p).length - Number(parity === p) - Number(last !== null && last % 2 === p));
      const remain = [0, 1].map(p => [...r[1]].filter(c => c === (p ? 'Н' : 'Ч')).length - Number(parity === p) - Number(last !== null && last % 2 === p));
      const arrangements = (n, k) => product(Array.from({ length: k }, (_, i) => n - i));
      assert.deepEqual(r.slice(4, 8).map(Number), [remain[0], available[0], remain[1], available[1]]);
      assert.deepEqual(r.slice(8, 13).map(Number), [first.length, available[0], remain[0], available[1], remain[1]]);
      const factors = [first.length, arrangements(available[0], remain[0]), arrangements(available[1], remain[1])];
      assert.deepEqual(r.slice(13, 16).map(Number), factors);
      const key = parity + ':' + (last === null ? 'any' : last); assert.ok(!seen.has(key)); seen.add(key);
      assert.equal(Number(r[16]), m.groups[key]); assert.equal(product(factors), m.groups[key]); linesChecked++;
    }
  } else if (m.kind === 'single-digit' || m.kind === 'cherry') {
    for (const r of m.rows) has((r.pos ? `Положение ${r.pos}` : 'Особого символа нет') + ': ' + r.options.map(o => '{' + list(o) + '}').join('; ') + '.\nСпособов = ' + r.options.map(o => o.length).join(' · ') + ` = ${r.count}.`);
    has('Всего = ' + m.rows.map(r => r.count).join(' + ') + ` = ${m.answer}.`);
  } else if (m.kind === 'digit-count') {
    for (const r of m.rows) has(`i = ${r.i}: a = ${r.other}, z = ${r.special}; значения ${list(r.counts)}.`);
    has('Fᵢ(k) = a · Fᵢ₋₁(k) + z · Fᵢ₋₁(k − 1)');
    has('Суммируем разрешённые количества особой цифры: ' + m.rows.at(-1).counts.slice(m.lo, m.hi + 1).join(' + ') + ` = ${m.answer}.`);
  } else if (m.kind === 'one-letter' || m.kind === 'one-vowel') {
    const c = m.abc.length - m.target.length, q = m.target.length;
    has(`Подстановка: Q = ${m.n} · ${q} · ${pow(c, m.n - 1)} = ${m.n} · ${q} · ${c ** (m.n - 1)} = ${m.answer}.`);
    has('Q = n · q · cⁿ⁻¹');
  } else if (m.subkind === 'beads') {
    for (let i = 0; i < m.rows.length; i++) { const r = m.rows[i]; has(`Вариант ${i + 1}, ${r.word}: ` + r.rules.map(v => v ? 'да' : 'нет').join(', ') + (r.rules.every(Boolean) ? '. Подходит.' : '. Не подходит.')); }
  } else if (m.subkind === 'morse') {
    has('Q(5) = 2⁵ = 32'); has('Q(6) = 2⁶ = 64'); has('Q = 32 + 64 = 96');
  } else {
    has(`${pow(2, m.n - 1)} = ${2 ** (m.n - 1)} — недостаточно для ${m.signals} сигналов.`);
    has(`${pow(2, m.n)} = ${2 ** m.n} — достаточно для ${m.signals} сигналов.`);
  }
  assert.ok(text.endsWith('Ответ: ' + m.answer + '.'));
  return { kind: m.kind, linesChecked, enumerated: m.enumerated || 0, rejectedEdits: 0 };
}
module.exports = { auditCombinatorics, calculate };
