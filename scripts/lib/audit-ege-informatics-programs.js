'use strict';

const assert = require('node:assert/strict');
const { conditionText, seoPlainText } = require('../../lib/seo-text');

function parseTask(task) {
  const text = conditionText(task.fragment);
  const paragraphs = [...task.fragment.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/giu)].map(m => seoPlainText(m[1]));
  const commands = paragraphs.filter(s => /^[123ABCАВС]\.\s/u.test(s)).map(s => {
    const label = s[0], name = s.slice(2).trim(), operand = Number(name.match(/\d+/u)?.[0] || 0);
    const kind = /^Прибав/u.test(name) ? 'add' : /^Умнож/u.test(name) ? 'mul' : /^Выч/u.test(name) ? 'sub' : /^Най/u.test(name) ? 'div' : /^Поменяй местами$/u.test(name) ? 'swap' : /^Возвести в квадрат$/u.test(name) ? 'square' : null;
    assert.ok(kind, task.id + ': unsupported command ' + name);
    return { label, kind, operand };
  });
  assert.ok(commands.length === 2 || commands.length === 3, task.id + ': commands');
  const question = text.match(/Сколько[^?]+\?/u)?.[0];
  assert.ok(question);
  const numbers = [...question.matchAll(/\d+/gu)].map(m => Number(m[0]));
  const [start, target] = numbers, direction = Math.sign(target - start);
  assert.ok(start > 0 && target > 0 && direction);
  const required = [], forbidden = [];
  const restriction = question.split('траектория')[1] || '';
  for (const clause of restriction.split(/,?\s+(?:и|но)\s+(?=(?:не\s+)?содержит)/u)) {
    if (!clause.includes('содержит')) continue;
    const list = clause.includes('не содержит') ? forbidden : required;
    list.push(...[...clause.matchAll(/\d+/gu)].map(m => Number(m[0])));
  }
  assert.deepEqual([...required, ...forbidden].sort((a,b) => a-b), numbers.slice(2).sort((a,b) => a-b));
  required.sort((a,b) => direction * (a-b));
  for (const n of [...required, ...forbidden]) assert.ok((n-start)*direction > 0 && (target-n)*direction > 0);
  const step = (n, command) => {
    const a = command.operand;
    if (command.kind === 'add') return n + a;
    if (command.kind === 'sub') return n - a;
    if (command.kind === 'mul') return n * a;
    if (command.kind === 'square') return n ** 2;
    if (command.kind === 'div') return (n - n % a) / a;
    const digits = String(n).padStart(2, '0').split(''), last = digits.length - 1;
    if (digits[last-1] >= digits[last]) return null;
    [digits[last-1], digits[last]] = [digits[last], digits[last-1]];
    return Number(digits.join(''));
  };
  if (commands.some(c => c.kind === 'swap')) assert.match(text, /десятков по значению меньше цифры, стоящей в разряде единиц/u);
  for (let n = Math.min(start,target); n <= Math.max(start,target); n++) for (const c of commands) {
    const next = step(n,c); assert.ok(next === null || (next-n)*direction > 0, task.id + ': nonmonotonic command');
  }
  const example = text.match(/для программы ([123ABCАВС]+) при исходном числе (\d+) траектория (?:будет состоять|состоит) из чисел ([\d, ]+)\./u);
  if (text.includes('Например')) {
    assert.ok(example, task.id + ': example parser');
    let n = Number(example[2]); const actual = [];
    for (const label of example[1].replace(/А/gu,'A').replace(/В/gu,'B').replace(/С/gu,'C')) {
      const index = '123'.includes(label) ? Number(label)-1 : 'ABC'.indexOf(label);
      n = step(n,commands[index]); assert.notEqual(n,null); actual.push(n);
    }
    assert.deepEqual(actual, example[3].split(',').map(Number), task.id + ': FIPI example');
  }
  return { start, target, direction, required, forbidden, commands, step };
}

// Exhaustive command-tree traversal, without the generator's forward dynamic table
// or its multiplication of independent segments. Different commands remain distinct.
function countPaths(spec, start=spec.start, target=spec.target, required=spec.required) {
  let visitedNodes = 0;
  function visit(n, mask) {
    visitedNodes++;
    assert.ok(visitedNodes < 5000000, 'Enumeration limit');
    if ((target-n)*spec.direction < 0 || spec.forbidden.includes(n)) return 0;
    const index = required.indexOf(n);
    if (index >= 0) mask |= 1 << index;
    if (n === target) return Number(mask === (1 << required.length)-1);
    let sum = 0;
    for (const c of spec.commands) {
      const next = spec.step(n,c);
      if (next !== null) sum += visit(next,mask);
    }
    return sum;
  }
  return { count: visit(start,0), visitedNodes };
}

function auditPrograms(task, record) {
  const spec = parseTask(task), enumerated = countPaths(spec);
  assert.equal(record.answer, String(enumerated.count), task.id + ': answer');
  const text = record.solution;
  assert.ok(text.includes(`Начало: ${spec.start}. Цель: ${spec.target}.`));
  const expressions = spec.commands.map(c => ({add:`n + ${c.operand}`,sub:`n − ${c.operand}`,mul:`n · ${c.operand}`,div:`⌊⟦n¦${c.operand}⟧⌋`,square:'n²',swap:'s(n)'})[c.kind]);
  assert.equal(text.match(/^Команды: (.+)\.$/mu)?.[1],spec.commands.map((c,i)=>c.label+' — '+expressions[i]).join('; '),task.id+': printed commands');
  const terms = spec.commands.flatMap(c => {
    if(c.kind === 'div') return Array.from({length:c.operand},(_,i)=>`F(${c.operand}n${i?' + '+i:''})`);
    return [({add:`F(n − ${c.operand})`,sub:`F(n + ${c.operand})`,mul:`F(⟦n¦${c.operand}⟧)`,square:'F(√n)',swap:'T(n)'})[c.kind]];
  });
  assert.equal(text.match(/^F\(n\) = (.+)\.$/mu)?.[1],terms.join(' + '),task.id+': recurrence');
  const printedRequired = text.match(/^Обязательные числа: (.+)\.$/mu)?.[1];
  const printedForbidden = text.match(/^Запрещённые числа: (.+)\.$/mu)?.[1];
  const list = ns => ns.length ? ns.join(', ') : 'нет';
  assert.equal(printedRequired,list(spec.required));
  assert.equal(printedForbidden,list([...spec.forbidden].sort((a,b)=>a-b)));
  const blocks = [...text.matchAll(/^Этап (\d+): (\d+) → (\d+)\.\n([\s\S]*?)(?=\n\n|(?![\s\S]))/gmu)];
  const stops = [spec.start,...spec.required,spec.target];
  assert.equal(blocks.length,stops.length-1);
  let rowsChecked=0, product=1;
  for (let i=0;i<blocks.length;i++) {
    const [,index,aText,bText,body]=blocks[i], a=Number(aText), b=Number(bText), symbol='FGH'[i];
    assert.equal(Number(index),i+1); assert.equal(a,stops[i]); assert.equal(b,stops[i+1]);
    const lines=body.split('\n').filter(line=>line.startsWith(symbol+'('));
    assert.equal(lines.length,Math.abs(b-a)+1);
    for(let j=0;j<lines.length;j++) {
      const n=a+j*spec.direction, line=lines[j];
      const value=countPaths(spec,a,n,[]).count;
      assert.ok(line.startsWith(`${symbol}(${n}) = `), task.id+': row order');
      assert.equal(Number(line.match(/= (\d+)\.$/u)?.[1]),value,task.id+': arithmetic');
      if(n===a || spec.forbidden.includes(n)) assert.equal(line,`${symbol}(${n}) = ${value}.`);
      else {
        const parents=[];
        for(let p=a;p!==n;p+=spec.direction) {
          if(spec.forbidden.includes(p)) continue;
          for(const c of spec.commands) if(spec.step(p,c)===n) parents.push(p);
        }
        const printed=[...line.slice(line.indexOf(' = ')+3).matchAll(new RegExp(symbol+'\\((\\d+)\\)','gu'))].map(m=>Number(m[1]));
        assert.deepEqual(printed.sort((x,y)=>x-y),parents.sort((x,y)=>x-y),task.id+': predecessors');
        const parts=line.slice(0,-1).split(' = ');
        if(parents.length) {
          assert.equal(parts.length,parents.length === 1 ? 3 : 4);
          const nums=parts[2].split(' + ').map(Number);
          const ordered=[...parts[1].matchAll(/\((\d+)\)/gu)].map(m=>Number(m[1]));
          assert.deepEqual(nums,ordered.map(p=>countPaths(spec,a,p,[]).count),task.id+': arithmetic operands');
          assert.equal(nums.reduce((x,y)=>x+y,0),value,task.id+': arithmetic sum');
        } else assert.equal(line,`${symbol}(${n}) = 0.`);
      }
      rowsChecked++;
    }
    product*=countPaths(spec,a,b,[]).count;
  }
  assert.equal(product,enumerated.count,task.id+': segmentation');
  assert.ok(text.includes(`Всего программ: ${product}.`));
  return { answer:record.answer, enumeratedNodes:enumerated.visitedNodes, rowsChecked, rejectedEdits:0 };
}

module.exports={parseTask,countPaths,auditPrograms};
