'use strict';
const { conditionText } = require('../../lib/seo-text');

// Classify the actual question, never its old KES code or numbers in examples.
// Each independent rule must agree on exactly one family, otherwise stop review.
const rules = [
  { id: 'text-volume', type: '1', topics: ['2.1', '2.2'], match: t => /каждый символ кодируется \d+ битами/i.test(t) },
  { id: 'decode', type: '2', topics: ['2.1'], match: t => /шифрует русские слова|шифрованная радиограмма|играли в шпионов|Сообщение было зашифровано кодом|Разведчик передал в штаб радиограмму/i.test(t) },
  { id: 'logic', type: '3', topics: ['2.7'], match: t => /(?:истинно|ложно) (?:логическое выражение|высказывание)|логическое выражение (?:истинно|ложно)/i.test(t) },
  { id: 'shortest-path', type: '4', topics: ['2.11'], match: t => /длину кратчайшего пути|Определите кратчайший путь/i.test(t) },
  { id: 'executor-sequence', type: '5', topics: ['3.4'], sourceTypes: ['Д13'], match: t => /У исполнителя .+ две команды/i.test(t) && /Составьте алгоритм/i.test(t) },
  { id: 'conditional-program', type: '6', topics: ['3.2'], match: t => /Ниже приведена программа, записанная на пяти языках/i.test(t) },
  { id: 'web-address', type: '7', topics: ['1.2'], match: t => /Доступ к файлу.+осуществляется по протоколу/i.test(t) },
  { id: 'search-sets', type: '8', topics: ['1.2'], match: t => /языке запросов поискового сервера|сегмент сети Интернет состоит/i.test(t) },
  { id: 'path-count', type: '9', topics: ['2.11'], match: t => /Сколько существует (?:различных )?путей/i.test(t) },
  { id: 'numeral-systems', type: '10', topics: ['2.6'], match: t => !/Напишите программу/i.test(t) && /систем[а-яё]* счисления|двоичн[а-яё]* числ|арифметического выражения:.+[₂₈₁₆]/i.test(t) },
  { id: 'text-search', type: '11', topics: ['1.1'], match: t => /поисковых средств операционной системы и текстового редактора/i.test(t) },
  { id: 'file-search', type: '12', topics: ['1.1'], match: t => /Сколько (?:всего )?файлов [cс] расширени/i.test(t) },
  { id: 'presentation', type: '13', topics: ['4.3'], match: t => /создайте презентацию из тр[её]х слайдов/i.test(t) },
  { id: 'document', type: '13', topics: ['4.1'], match: t => /Создайте в текстовом редакторе документ/i.test(t) },
  { id: 'spreadsheet', type: '14', topics: ['4.5'], match: t => /В электронную таблицу занесли/i.test(t) },
  { id: 'robot', type: '15', topics: ['3.1'], match: t => /Исполнитель Робот умеет перемещаться по лабиринту/i.test(t) },
  { id: 'write-program', type: '16', topics: ['3.5'], match: t => /^Напишите программу/i.test(t) }
];

function classifyInformatics(task) {
  const text = conditionText(task.fragment);
  const matching = rules.filter(rule => rule.match(text));
  if (matching.length !== 1) throw new Error(`${task.id}: ${matching.length} rules (${matching.map(r => r.id)}) — ${text.slice(0,180)}`);
  const rule = matching[0];
  const topics = rule.id === 'write-program' && /по двум данным натуральным числам/i.test(text) ? ['3.2'] : rule.topics;
  return { type: `type.${rule.type}`, topics, rule: rule.id, ...(rule.sourceTypes ? { sourceTypes: rule.sourceTypes } : {}) };
}
module.exports = { classifyInformatics };
