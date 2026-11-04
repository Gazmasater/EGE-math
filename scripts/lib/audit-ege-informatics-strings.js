'use strict';

const assert = require('node:assert/strict');
const { conditionText } = require('../../lib/seo-text');
const { compile, execute, turing, params, word, runs, find } = require('./ege-informatics-string-machine');
const cache = new Map();
const sum = s => [...s].reduce((n, c) => n + Number(c), 0);
const counter = s => [...s].reduce((a, c) => (a[c] = (a[c] || 0) + 1, a), {});
const fmt = s => s.length <= 18 ? `«${s}»` : runs(s).map(([c, n]) => `«${c}»` + (n > 1 ? ` × ${n}` : '')).join(' + ');
const sorted = a => [...new Set(a)].sort((a, b) => a - b);
const qsub = s => s.replace(/q([0-3])/g, (_, n) => 'q' + '₀₁₂₃'[n]);
const decomposition = s => [...s].flatMap((c, i) => c === '1' ? [2 ** (s.length - i - 1)] : []).join(' + ');

function solve(task) {
  const condition = conditionText(task.fragment), key = condition + task.fragment;
  if (cache.has(key)) return cache.get(key);
  const t = { ...task, condition }, m = params(t);
  if (m.kind === 'turing') Object.assign(m, turing(t));
  else {
    m.program = compile(condition);
    m.rules = m.program.code.filter(c => c.op === 'replace').map(c => [word(c.p), word(c.to)]);
    if (['fixed', 'zeros'].includes(m.kind)) {
      Object.assign(m, execute(m.program, m.initial, true));
      m.answer = m.kind === 'zeros' ? String(counter(m.text)['0']) : m.sum === true ? String(sum(m.text)) : m.text;
      // execute.sum is numeric; use the condition to retain the requested answer kind.
      if (m.kind === 'fixed') m.answer = condition.includes('Чему равна сумма') ? String(sum(m.text)) : m.text;
    } else if (m.kind === 'marker') {
      assert.equal(m.rules.length, 3);m.digitCounts = {};m.total = 0;
      for (let i = 1; i <= 3; i++) {
        const rule = m.rules.find(([a]) => a === '>' + i);assert(rule);assert(rule[1].endsWith('>'));
        const output = rule[1].slice(0, -1);assert.match(output, /^[123]+$/);
        m.total += sum(output) * m.counts[i - 1];
        for (const c of output) m.digitCounts[c] = (m.digitCounts[c] || 0) + m.counts[i - 1];
      }
      m.answer = String(m.total);
      for (const order of ['123', '132', '213', '231', '312', '321']) {
        const result = execute(m.program, '>' + [...order].map(d => d.repeat(m.counts[Number(d) - 1])).join(''));
        assert.equal(result.sum, m.total);assert(result.text.endsWith('>'));
      }
    } else if (m.kind === 'sorting') {
      assert.equal(m.rules.length, 3);
      const edges = m.rules.map(([a, b]) => { assert.equal(a.length, 2);assert.equal(b, [...a].reverse().join(''));return b; });
      m.order = m.counts.map(([d]) => d).sort((a, b) => edges.includes(a + b) ? -1 : 1);
      for (const edge of edges) assert(m.order.indexOf(edge[0]) < m.order.indexOf(edge[1]));
      m.text = m.order.map(d => d.repeat(m.counts.find(([c]) => c === d)[1])).join('');
      m.answer = m.positions.map(p => m.text[p - 1]).join('');
      assert.equal(execute(m.program, [...m.text].reverse().join('')).text, m.text);
    } else {
      assert(['min-n', 'max-sum'].includes(m.kind));m.histogram = {};m.checked = [];let best = -1;
      const upper = m.upper || 100000;
      for (let n = 4; n < upper; n++) {
        const v = execute(m.program, m.first + m.repeat.repeat(n));
        if (m.kind === 'max-sum') {
          m.histogram[v.sum] = (m.histogram[v.sum] || 0) + 1;
          if (v.sum > best) { best = v.sum;m.witness = n; }
        } else {
          const value = m.target === 'sum' ? v.sum : m.target === 'count' ? (counter(v.text)[m.digit] || 0) : [...v.text].every(c => c === m.digit);
          m.checked.push([n, v.text, value]);
          if (value === m.value) { m.witness = n;break; }
        }
      }
      assert(m.witness, task.id + ': no witness');m.answer = String(m.kind === 'max-sum' ? best : m.witness);
      Object.assign(m, execute(m.program, m.first + m.repeat.repeat(m.witness), true));
    }
  }
  cache.set(key, m);return m;
}

// Recover Python nesting from independent branch targets, including the distinction
// between consecutive IF commands and a mutually exclusive IF/ELSE pair.
function python(m) {
  const code = m.program.code, out = m.kind === 'max-sum' ? ['best = 0'] : [];
  out.push(`for n in range(4, ${m.kind === 'max-sum' ? m.upper : Number(m.answer) + 1}):`, `    s = '${m.first}' + '${m.repeat}' * n`, '    while (');
  m.program.guard.forEach((p, i) => out.push(`        ${i ? 'or ' : ''}'${word(p)}' in s`));out.push('    ):');
  function emit(start, end, level) {
    const pad = '    '.repeat(level);
    for (let i = start; i < end;) {
      const c = code[i];
      if (c.op === 'replace') { out.push(`${pad}s = s.replace('${word(c.p)}', '${word(c.to)}', 1)`);i++; }
      else {
        assert.equal(c.op, 'test');out.push(`${pad}if '${word(c.p)}' in s:`);
        const skip = code[c.jump - 1];
        if (skip.op === 'jump') { emit(i + 1, c.jump - 1, level + 1);out.push(pad + 'else:');emit(c.jump, skip.jump, level + 1);i = skip.jump; }
        else { emit(i + 1, c.jump, level + 1);i = c.jump; }
      }
    }
  }
  emit(0, code.length, 2);
  if (m.kind === 'max-sum') out.push('    total = sum(map(int, s))', '    best = max(best, total)', 'print(best)');
  else {
    const expr = m.target === 'sum' ? `sum(map(int, s)) == ${m.value}` : m.target === 'count' ? `s.count('${m.digit}') == ${m.value}` : `set(s) == {'${m.digit}'}`;
    out.push('    if ' + expr + ':', '        print(n)', '        break');
  }
  return out.join('\n');
}

function auditStrings(task, record) {
  const m = solve(task), lines = [], text = record.solution;
  assert.equal(record.answer, m.answer, task.id + ': answer');
  const has = line => { assert(text.includes(line), task.id + ': missing proof ' + line);lines.push(line); };
  if (m.kind === 'fixed') {
    const [[a, b], [c, d]] = m.rules, n = m.initial.length, digit = m.initial[0];assert.equal(m.rules.length, 2);
    has(`Исходная строка: ${fmt(m.initial)}.`);
    has(`Проверка ${a} выполняется первой. Если она истинна, в этом проходе заменяется только первое вхождение ${a} на ${b}. Иначе выполняется замена ${c} на ${d}, если такая цепочка есть.`);
    if ([...a].every(x => x === digit)) {
      const q = Math.floor(n / a.length), r = n % a.length, length = q * b.length, delta = c.length - d.length;
      let k = 0, left = length;while (left >= c.length) { left -= delta;k++; }
      assert.equal(b[0].repeat(left) + digit.repeat(r), m.text);assert.equal(q + k, m.cycles);
      has(`${n} = ${q} · ${a.length} + ${r}.`);
      has(`Получаем ${q} · ${b.length} = ${length} цифр ${b[0]} и ${r} цифр ${digit} в конце.`);
      has(`Оно уменьшает число цифр ${b[0]} на ${c.length} − ${d.length} = ${delta}.`);
      has(`Число таких замен — ${k}: ${length} − ${k} · ${delta} = ${left}.`);
      has(k ? `Перед последней заменой было ${left + delta} цифр ${b[0]}, то есть не меньше ${c.length}; после неё осталось ${left}, что меньше ${c.length}.` : `Уже ${length} меньше ${c.length}, поэтому вторая замена не выполняется.`);
      has(`Итоговая строка: ${fmt(m.text)}.`);
    } else {
      assert.equal(a.length % d.length, 0);const q = a.length / d.length, need = q * c.length;
      const prefix = b.replace(new RegExp(digit + '+$'), ''), rest = b.length - prefix.length, delta = need - rest;
      let k = 0, remaining = n;while (remaining >= need) { remaining -= delta;k++; }
      const tailInitial = prefix.repeat(k) + digit.repeat(remaining), tail = execute(m.program, tailInitial, true);
      assert.equal(tail.text, m.text);assert.equal(k * (q + 1) + tail.cycles, m.cycles);
      has(`Если число цифр ${digit} не меньше ${need}, сначала выполняем замену ${c} → ${d}; число её повторений — ${q}.`);
      has(`Число обработанных цифр ${digit}: ${q} · ${c.length} = ${need}. Число образовавшихся цифр ${a[0]}: ${q} · ${d.length} = ${a.length}.`);
      has(`блок из ${q + 1} проходов заменяет ${fmt(digit.repeat(need))} на ${fmt(b)}.`);
      has(prefix ? `число необработанных цифр ${digit} уменьшается на ${need} − ${rest} = ${delta}.` : `её длина уменьшается на ${need} − ${rest} = ${delta}.`);
      has(`Выполняем ${k} полных блоков: ${n} − ${k} · ${delta} = ${remaining}.`);
      if (k) has(`Перед последним блоком число цифр ${digit} было равно ${remaining + delta}, что не меньше ${need}; теперь ${remaining} меньше ${need}, поэтому полный блок больше не повторится.`);
      has(`Оставшаяся строка: ${fmt(tailInitial)}.`);tail.trace.slice(1).forEach((s, i) => has(`${i + 1}) ${fmt(s)}.`));
    }
    for (const p of m.program.guard) assert(!find(runs(m.text), p));
    has(`Проверка остановки: в строке ${fmt(m.text)} нет ни ${m.program.guard.map(word).join(', ни ')}. Общее число проходов — ${m.cycles}.`);
    if (conditionText(task.fragment).includes('Чему равна сумма')) has('Сумма цифр: ' + Object.entries(counter(m.text)).map(([d, n]) => `${d} · ${n}`).join(' + ') + ` = ${m.answer}.`);
  } else if (m.kind === 'zeros') {
    const n = m.initial.length - 1, a = counter(m.rules.find(([s]) => s === '10')[1])['0'], b = counter(m.rules.find(([s]) => s === '1')[1])['0'];
    assert.equal(m.text, '0'.repeat(a * n + b));assert.equal(m.cycles, n + 1);
    has(`Начальное число нулей справа от единицы равно ${n}.`);
    has(`При замене 10 → ${'0'.repeat(a)}1 единица сдвигается вправо через один исходный нуль, оставляя слева ${a} нуля.`);
    has(`После k таких замен слева стоят ${a}k нулей, затем одна единица, затем ${n} − k ещё не обработанных нулей.`);
    has(`замена 10 выполняется ровно ${n} раз: справа от единицы не останется нулей, слева будет ${a} · ${n} = ${a * n} нулей.`);
    has(`В ветви ИНАЧЕ она заменяется на ${'0'.repeat(b)}, добавляя ещё ${b} нуля.`);
    has('Созданные слева нули повторно не обрабатываются');
    has(`Итого ${a} · ${n} + ${b} = ${a * n + b} нулей.`);
    has(`Проверка: начальная длина ${n + 1}; первые ${n} замен увеличивают её на ${a - 1} каждая, последняя — на ${b - 1}. Получаем ${n + 1} + ${n} · ${a - 1} + ${b - 1} = ${m.answer}.`);
  } else if (m.kind === 'marker') {
    has('одна исходная цифра обрабатывается ровно один раз');has('порядок цифр влияет на порядок результата, но не на его сумму.');
    const terms = [];
    for (const [a, b] of m.rules) {
      const d = a.at(-1), output = b.slice(0, -1), n = m.counts[Number(d) - 1], v = sum(output);terms.push(n * v);
      has(`Цифра ${d} даёт цепочку ${output} с суммой ${[...output].join(' + ')} = ${v}. Таких исходных цифр ${n}, их вклад ${n} · ${v} = ${n * v}.`);
    }
    has('Сумма всех вкладов: ' + terms.join(' + ') + ` = ${m.answer}.`);
    has('маркер находится в конце и больше не соседствует справа с цифрами 1, 2 или 3: цикл заканчивается.');
    has('Проверка по количеству итоговых цифр: ' + Object.entries(m.digitCounts).map(([d, n]) => `цифр ${d} — ${n}`).join('; ') + '.');
    has('Их сумма: ' + Object.entries(m.digitCounts).map(([d, n]) => `${d} · ${n}`).join(' + ') + ` = ${m.answer}.`);
  } else if (m.kind === 'sorting') {
    for (const [a, b] of m.rules) has(`${a} → ${b}.`);
    has(`Эти правила переставляют соседей в порядок ${m.order.join(', затем ')}.`);
    has('Каждая указанная соседняя перестановка уменьшает число инверсий ровно на единицу.');
    has('Если строка ещё не упорядочена, в ней обязательно есть соседняя пара в обратном порядке.');
    has('Для каждой такой пары есть правило замены. Значит, остановка возможна только в полностью упорядоченной строке.');
    let start = 1;for (const d of m.order) { const n = m.counts.find(([c]) => c === d)[1];has(`Позиции ${start}–${start + n - 1} заняты цифрой ${d} (${n} штук).`);start += n; }
    for (const p of m.positions) has(`На позиции ${p} стоит ${m.text[p - 1]}.`);
    has(`Записываем цифры в требуемом порядке позиций: ${m.answer}.`);
  } else if (m.kind === 'turing') {
    has(`Переведём исходное число в двоичную систему: ${m.number} = ${decomposition(m.initial)} = ${m.initial}₂.`);
    has('Головка начинает в состоянии q₀ в пустой ячейке сразу справа от числа.');
    has('Сначала записывается символ, затем выполняется сдвиг; S означает остановку после записи.');
    for (const row of m.table.slice(2)) has(qsub('В состоянии ' + row[0] + ': ' + row.slice(1).flatMap((c, i) => c ? [m.table[0][i + 1] + ' → ' + c] : []).join('; ') + '.'));
    for (const [step, pos, state, old, value, move, next] of m.trace) has(qsub(`Шаг ${step + 1}: позиция ${pos}, ${state}, читаем ${old}, записываем ${value}; ` + (move === 'S' ? 'останавливаемся.' : `шаг ${move === 'L' ? 'влево' : 'вправо'}, состояние ${next}.`)));
    has(`На ленте осталось слово ${m.final}.`);
    has(`${m.final}₂ = ${decomposition(m.final)} = ${m.answer}.`);
    has(`Проверка: последняя команда содержит S; выполнено ${m.steps} шагов, запись остаётся непрерывной двоичной последовательностью.`);
  } else {
    has(`Начальное слово состоит из цифры ${m.first} и n цифр ${m.repeat}. Начинаем с n = 4`);
    has('Следующая проверка учитывает изменения предыдущей команды. В конструкции с ИНАЧЕ выполняется только одна ветвь. Каждая замена затрагивает только первое слева вхождение.');
    if (m.rules.every(([a, b]) => a.length > b.length)) has('Каждая выполненная замена уменьшает длину строки. За один проход цикла выполняется хотя бы одна замена, поэтому обработка любого выбранного n завершится.');
    else {
      const weightsLine = text.split('\n').find(s => s.startsWith('Для доказательства остановки'));assert(weightsLine);
      const weights = Object.fromEntries([...weightsLine.matchAll(/(\d) → (\d+)/g)].map(x => [x[1], Number(x[2])]));
      assert(Object.values(weights).every(n => n > 0));has(weightsLine);
      for (const [a, b] of m.rules) { const diff = [...a].reduce((n, c) => n + weights[c], 0) - [...b].reduce((n, c) => n + weights[c], 0);assert(diff > 0);has(`Замена ${a} → ${b} уменьшает этот вес на ${diff}.`); }
      has('На каждом проходе выполняется хотя бы одна замена; неотрицательный целый вес строго убывает. Поэтому цикл обязательно завершится.');
    }
    has('```python\n' + python(m) + '\n```');
    if (m.kind === 'min-n') {
      has(`Проверены все целые значения от 4 до ${m.answer}, всего ${Number(m.answer) - 3}, без пропусков.`);
      const before = sorted(m.checked.slice(0, -1).map(x => x[2]));
      if (m.target === 'sum') has('При меньших допустимых n получаются только следующие суммы: ' + before.join(', ') + `. Значения ${m.value} среди них нет.`);
      else if (m.target === 'count') has(`При n от 4 до ${Number(m.answer) - 1} количество цифр ${m.digit} принимает значения ` + before.join(', ') + `; ${m.value} среди них нет.`);
      else has(`При каждом n от 4 до ${Number(m.answer) - 1} в конечном слове сохраняется хотя бы одна цифра, отличная от ${m.digit}.`);
      for (const [n, s, v] of m.checked.slice(-4)) has(`n = ${n}: ${fmt(s)}; ` + (m.target === 'sum' ? `сумма ${v}.` : m.target === 'count' ? `количество цифр ${m.digit} равно ${v}.` : v ? 'только требуемые цифры.' : 'есть другие цифры.'));
    } else {
      has(`Допустимые значения n: от 4 до ${m.upper - 1}. Перебираем все допустимые значения (${m.upper - 4})`);
      has(`Полный перебор даёт максимум ${m.answer}. Он впервые достигается при n = ${m.witness}; итоговое слово ${fmt(m.text)}.`);
      has('Контроль распределения: ' + Object.entries(m.histogram).map(([s, n]) => `сумма ${s} — ${n} значений n`).join('; ') + '.');
      has(`Число всех рассмотренных n равно сумме этих частот: ${m.upper - 4}. Ни одной суммы больше ${m.answer} нет.`);
    }
    has(`Проверка случая n = ${m.witness} по выполненным заменам:`);
    for (const [rule, n] of Object.entries(m.counts)) has(`${rule}: число замен — ${n}.`);
    has(`По окончании цикла (число проходов — ${m.cycles}) получаем ${fmt(m.text)}. Ни одна из цепочек ${m.program.guard.map(word).join(', ')} больше не встречается.`);
    has('Сумма цифр этого слова: ' + Object.entries(counter(m.text)).map(([d, n]) => `${d} · ${n}`).join(' + ') + ` = ${sum(m.text)}.`);
  }
  has(`Ответ: ${m.answer}.`);
  return { answer: m.answer, kind: m.kind, lines, rejectedEdits: 0 };
}

module.exports = { auditStrings, solve, python };
