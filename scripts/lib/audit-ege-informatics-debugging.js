'use strict';
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { conditionText, seoPlainText, decodeEntities } = require('../../lib/seo-text');
const M = require('./ege-informatics-debug-machine');
const cache = new Map();
const sha = s => createHash('sha256').update(s).digest('hex');
const inputText = v => Array.isArray(v) ? v.join(', ') : String(v);
const outputText = v => v.join() === 'NO' ? '«NO»' : v.join(' и ') + (v.length > 1 ? ' в отдельных строках' : '');
function primaryProgram(task, language) {
  const rows = [...task.fragment.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/giu)].map(m =>
    [...m[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/giu)].map(c => c[1]));
  const index = rows.findIndex(row => row.some(cell => seoPlainText(cell) === language));
  assert.ok(index >= 0, language + ': primary language missing');
  const col = rows[index].findIndex(cell => seoPlainText(cell) === language);
  const paragraphs = [...rows[index + 1][col].matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/giu)];
  return paragraphs.map(p => decodeEntities(p[1].replace(/<[^>]*>/gu, '')).replaceAll('\u00a0', ' ').trimEnd()).filter(p => p.trim()).join('\n') + '\n';
}
function canonical(node) {
  if (Array.isArray(node)) return node.map(canonical);
  if (!node || typeof node !== 'object') return node;
  const clean = Object.fromEntries(Object.entries(node).filter(([key]) => key !== 'source').map(([key, value]) => [key, canonical(value)]));
  if (clean.type === 'assign' && clean.add) { clean.add = false; clean.value = { op: '+', a: { name: clean.name }, b: clean.value }; }
  // Nonnegative remainders are positive exactly when nonzero.
  if (clean.op === '>' && clean.a?.op === '%' && clean.b?.value === 0) clean.op = '!=';
  return clean;
}
function proveStructure(fixed, s) {
  const predicate = name => ({ mod: `${name} % ${s.parameter} == 0`, notmod: `${name} % ${s.parameter} != 0`, gt: `${name} > ${s.parameter}`, lt: `${name} < ${s.parameter}` })[s.predicate];
  let choices;
  if (s.kind === 'power') choices = [`n = int(input())\nk = 0\nwhile n % ${s.parameter} == 0:\n    k = k + 1\n    n = n // ${s.parameter}\nif n == 1:\n    print(k)\nelse:\n    print("NO")`];
  else {
    const name = s.kind === 'digits' ? { min: 'minDigit', max: 'maxDigit', sum: 'sum', count: 'count' }[s.target] : { min: 'minimum', max: 'maximum', sum: 'sum' }[s.target];
    const initial = s.target === 'min' ? (s.kind === 'digits' ? 10 : 1001) : s.target === 'max' && s.kind === 'digits' ? -1 : 0;
    const value = s.kind === 'digits' ? 'digit' : 'x';
    const update = ['min', 'max'].includes(s.target)
      ? `        if ${value} ${s.target === 'min' ? '<' : '>'} ${name}:\n            ${name} = ${value}`
      : `        ${name} = ${name} + ${s.target === 'count' ? 1 : value}`;
    if (s.kind === 'list') choices = [`n = 4\ncount = 0\n${name} = ${initial}\nfor i in range(1, n+1):\n    x = int(input())\n    if ${predicate('x')}:\n        count = count + 1\n${update}\nif count > 0:\n    print(count)\n    print(${name})\nelse:\n    print("NO")`];
    else {
      const prefix = `N = int(input())\n${name} = ${initial}\nwhile N > 0:\n    digit = N % 10\n    if ${predicate('digit')}:\n${update}\n    N = N // 10\n`;
      const present = s.target === 'min' ? `${name} <= 9` : s.target === 'max' ? `${name} >= 0` : `${name} > 0`;
      choices = [prefix + `if ${present}:\n    print(${name})\nelse:\n    print("NO")`, prefix + `if ${name} == ${initial}:\n    print("NO")\nelse:\n    print(${name})`];
    }
  }
  const actual = JSON.stringify(canonical(M.parse(fixed)));
  assert.ok(choices.some(code => JSON.stringify(canonical(M.parse(code))) === actual), 'corrected algorithm does not implement the invariant');
  if (s.kind === 'digits') return M.proveDigits(M.parse(fixed), s);
  if (s.kind === 'power') for (let n = 1; n <= 1000; n++) assert.deepEqual(M.execute(M.parse(fixed), n).output, M.expected(n, s));
  return { invariant: s.kind, fullDomain: true };
}
function traceLines(run, s) {
  return run.steps.map(({before:a,after:b}, i) => {
    if (s.kind === 'power') return `Шаг ${i+1}: перед итерацией n = ${a.n}, k = ${a.k}; после итерации n = ${b.n}, k = ${b.k}.`;
    if (s.kind === 'list') return `Шаг ${i+1}: i = ${b.i}, x = ${b.x}; ` + ['count','minimum','maximum','sum'].filter(n => Object.hasOwn(b,n)).map(n => `${n} = ${b[n]}`).join(', ') + '.';
    const digit = a.N % 10;
    let text = `Шаг ${i+1}: N = ${a.N}, извлекается цифра ${digit}; ` + ['minDigit','maxDigit','count','sum'].filter(n => Object.hasOwn(b,n)).map(n => `${n} = ${b[n]}`).join(', ') + `; после удаления последней цифры N = ${b.N}.`;
    if (b.digit !== digit) text += ` Ошибочное присваивание изменяет digit на ${b.digit}, но искомый экстремум не обновляет.`;
    return text;
  });
}
function summaryCode(code) {
  return code.trim().replace(/;$/u, '').replace('if ', 'условие ').replace('while ', 'условие цикла ').replace(/ then$|:$/u, '')
    .replaceAll('>=','≥').replaceAll('<=','≤').replaceAll('!=','≠').replaceAll('==','=')
    .replaceAll('>','больше').replaceAll('<','меньше').replaceAll(' -1',' −1');
}
function auditDebugging(task, record, source) {
  const original = primaryProgram(task, 'Python');
  assert.equal(original, source.originalPython, 'primary Python');
  const s = M.condition(conditionText(task.fragment));
  assert.equal(sha(original), source.pythonVerification.originalSha256);
  const fixedLines = original.trimEnd().split('\n');
  assert.equal(source.edits.length, 2);
  for (const e of source.edits) { assert.equal(fixedLines[e.line-1], e.wrong); fixedLines[e.line-1] = e.right; }
  const fixed = fixedLines.join('\n') + '\n';
  assert.equal(sha(fixed), source.pythonVerification.fixedSha256);
  assert.equal(fixedLines.filter((line, i) => line !== original.trimEnd().split('\n')[i]).length, 2);
  const key = sha(original + fixed + JSON.stringify(s));
  if (!cache.has(key)) cache.set(key, proveStructure(fixed, s));
  const a = M.parse(original), b = M.parse(fixed), example = source.example;
  if (s.kind === 'digits') assert.ok(Number.isInteger(example) && example >= 100 && example <= 999);
  else if (s.kind === 'power') assert.ok(Number.isInteger(example) && example >= 1 && example <= 1000);
  else assert.ok(Array.isArray(example) && example.length === 4 && example.every(v => Number.isInteger(v) && v >= 0 && v <= 1000));
  const given = M.execute(a,s.given,{trace:true}), exampleRun = M.execute(a,example,{trace:true});
  assert.deepEqual(M.execute(b,s.given).output,M.expected(s.given,s));
  assert.deepEqual(exampleRun.output,M.expected(example,s));
  if (s.kind !== 'digits') assert.notDeepEqual(exampleRun.output,['NO']);
  const blocks = [...record.solution.matchAll(/^```(python|pascal)\n([\s\S]*?)\n```[ \t]*(?:\n|$)/gmu)];
  assert.equal(blocks.length,4,'four correction code blocks');
  const display = source.displayEdits;
  assert.equal(display.length,2);
  assert.ok(['python','pascal'].includes(source.displayLanguage));
  if (source.displayLanguage === 'python') assert.deepEqual(display,source.edits);
  else {
    assert.equal(task.id,'EGEINF6F2E2D');
    assert.equal(primaryProgram(task,'Паскаль'),source.originalPascal);
    assert.deepEqual(display,[{wrong:'k := k + n div 4;',right:'k := k + 1;'}, {wrong:'if n > 0 then',right:'if n = 1 then'}]);
    for (const e of display) assert.equal(source.originalPascal.split('\n').filter(line => line.trim() === e.wrong).length,1);
    assert.deepEqual(source.edits.map(e=>[e.wrong.trim(),e.right.trim()]),[['k = k + n // 4','k = k + 1'],['if n > 0:','if n == 1:']]);
  }
  display.forEach((e,i)=>{assert.equal(blocks[i*2][1],source.displayLanguage);assert.equal(blocks[i*2+1][1],source.displayLanguage);assert.equal(blocks[i*2][2],e.wrong,'original code line');assert.equal(blocks[i*2+1][2],e.right,'corrected code line');});
  const answer = '1) '+outputText(given.output)+'; 2) '+inputText(example)+'; 3) '+display.map(e=>summaryCode(e.right)).join('; ');
  assert.equal(record.answer,answer,'answer');
  const lines = [
    '1. Выполнение исходной ошибочной программы.', 'Ввод: '+inputText(s.given)+'.', ...traceLines(given,s),
    'Вывод программы: '+outputText(given.output)+'.',
    'Этот вывод относится именно к исходному коду. Требуемый по условию результат для тех же данных: '+outputText(M.expected(s.given,s))+'.',
    '2. Пример, на котором исходная программа случайно даёт верный ответ.', 'Возьмём '+inputText(example)+'.', ...traceLines(exampleRun,s),
    'Вывод исходной программы: '+outputText(exampleRun.output)+'.',
    '3. Исправление ровно двух строк: '+(source.displayLanguage==='python'?'Python':'Паскаль')+'.',
    'Все остальные строки и отступы сохраняются.', 'Проверка исправленной программы.',
    'Для исходного ввода '+inputText(s.given)+' исправленная программа выводит '+outputText(M.expected(s.given,s))+'.', 'Ответ: '+answer+'.'
  ];
  if (s.kind === 'power') {
    lines.push(`Это верный показатель: ${s.parameter}¹ = ${example}.`, `Обозначим исходное число через N₀. После k успешных делений выполняется равенство N₀ = ${s.parameter}ᵏ · n. Сначала k = 0 и n = N₀, поэтому равенство верно. На очередном шаге n делится на ${s.parameter} без остатка, а k увеличивается на 1; произведение не меняется.`, `Положительное n при каждом делении уменьшается, поэтому цикл заканчивается. При n = 1 получаем N₀ = ${s.parameter}ᵏ. Если оставшееся n не равно 1 и уже не делится на ${s.parameter}, требуемого показателя нет. Для N₀ = 1 цикл не выполняется, выводится k = 0: ${s.parameter}⁰ = 1.`);
  } else {
    const vals = s.kind==='digits' ? String(example).split('').map(Number) : example;
    const selected = vals.filter(x => ({mod:()=>x%s.parameter===0,notmod:()=>x%s.parameter!==0,gt:()=>x>s.parameter,lt:()=>x<s.parameter})[s.predicate]());
    lines.push('Подходящие '+(s.kind==='digits'?'цифры':'числа')+': '+inputText(selected)+'. По условию получается '+outputText(M.expected(example,s))+', что совпадает с фактическим выводом.');
    lines.push(s.kind==='digits' ? 'После каждого шага последняя цифра удаляется целочисленным делением на 10. Положительное N уменьшается до 0, поэтому будут рассмотрены все цифры ровно по одному разу; при N ≤ 10⁹ требуется не более десяти шагов.' : 'Цикл выполняется для i от 1 до 4, то есть обрабатывает все четыре числа ровно один раз. После него count = 0 ровно при отсутствии выбранных чисел; иначе выводятся count и полученный результат в двух строках.');
    const scope = s.kind === 'digits' ? 'любого количества последних цифр' : 'первых k элементов последовательности';
    const word = {min:'минимум',max:'максимум',sum:'сумму',count:'количество'}[s.target];
    lines.push(('После обработки '+scope+' накопленная переменная хранит '+word+' подходящих значений этой части. '+(s.kind==='list'?'Переменная count одновременно хранит количество выбранных чисел.':'')).trimEnd());
    if (['min','max'].includes(s.target)) {
      const sentinel = s.kind==='digits' ? (s.target==='min'?'10':'−1') : (s.target==='min'?'1001':'0');
      lines.push('Вначале обработанных значений нет: используется начальная граница '+sentinel+(s.kind==='list'?', а count = 0.':'.')+' При неподходящем значении экстремум не меняется. При подходящем значение сравнивается с сохранённым: '+(s.target==='min'?'меньшее заменяет минимум.':'большее заменяет максимум.')+' Поэтому утверждение сохраняется на каждом шаге.');
    } else lines.push('Вначале накопленное значение равно 0. Неподходящее значение ничего не меняет; подходящее '+(s.target==='count'?'увеличивает счётчик на 1.':'прибавляется к сумме.')+(s.kind==='list'?' Одновременно count увеличивается на 1.':'')+' Это сохраняет утверждение после следующего шага.');
    if (s.kind==='digits') lines.push(s.target==='sum'?'Все подходящие цифры в этой задаче положительны. Поэтому сумма равна 0 ровно при отсутствии подходящих цифр; существующее заключительное условие проверяет это правильно.':s.target==='count'?'Счётчик равен 0 ровно при отсутствии подходящих цифр; заключительное ветвление выводит либо NO, либо найденное количество.':'Если подходящих цифр не было, сохраняется начальный признак отсутствия результата; иначе сохранена допустимая цифра от 0 до 9. Заключительное ветвление различает эти два случая.');
  }
  assert.equal(source.singleErrorWitnesses.length,2);
  source.singleErrorWitnesses.forEach((w,j)=>{
    const mutant=[...fixedLines];mutant[source.edits[j].line-1]=source.edits[j].wrong;
    const actual=M.execute(M.parse(mutant.join('\n')),w.input).output,expected=M.expected(w.input,s);
    assert.notDeepEqual(actual,expected);assert.deepEqual(actual,w.output);assert.deepEqual(expected,w.expected);
    lines.push(`Необходимость исправления ${j+1}: если оставить только эту ошибку, при вводе `+inputText(w.input)+' получится '+outputText(actual)+' вместо '+outputText(expected)+'.');
  });
  for (const line of lines) assert.ok(record.solution.split('\n').includes(line),task.id+': missing or corrupted derivation '+line);
  return {kind:s.kind,target:s.target,answer,lines,proof:cache.get(key),rejectedEdits:0};
}
module.exports={auditDebugging,primaryProgram,proveStructure};
