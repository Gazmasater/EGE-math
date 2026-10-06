const {createHash} = require('node:crypto');
const assignments = require('./math-task-assignments.json');

// Учебные типы, а не коды КЭС или номера заданий конкретного года.
const MATH_TASK_TYPES = [
  {code: 'plane', name: 'Планиметрия', children: [['triangles', 'Треугольники'], ['quadrilaterals', 'Четырёхугольники'], ['circles', 'Окружности']]},
  {code: 'vectors', name: 'Векторы', children: [['coordinates', 'Координаты и длина вектора'], ['scalar', 'Скалярное произведение']]},
  {code: 'solid', name: 'Стереометрия', children: [['polyhedra', 'Многогранники'], ['round', 'Тела вращения'], ['combinations', 'Комбинации тел']]},
  {code: 'probability-basic', name: 'Начала теории вероятностей', children: [['classical', 'Равновероятные исходы и частоты']]},
  {code: 'probability-compound', name: 'Вероятности сложных событий', children: [['events', 'Сумма и пересечение событий'], ['independent', 'Независимые испытания'], ['conditional', 'Условная и полная вероятность']]},
  {code: 'basic-equations', name: 'Простейшие уравнения', children: [['rational', 'Рациональные'], ['roots', 'Иррациональные'], ['exponential', 'Показательные'], ['logarithms', 'Логарифмические']]},
  {code: 'expressions', name: 'Вычисления и преобразования', children: [['powers', 'Степени'], ['roots', 'Корни'], ['logarithms', 'Логарифмы'], ['trigonometry', 'Тригонометрия']]},
  {code: 'derivative', name: 'Производная и её применение', children: [['tangent', 'Касательная и наклон графика'], ['graph', 'Чтение графиков функции и производной']]},
  {code: 'applied', name: 'Задачи с прикладным содержанием', children: [['algebraic', 'Алгебраические модели'], ['roots', 'Модели с корнями'], ['exponential-log', 'Показательные и логарифмические модели'], ['trigonometry', 'Тригонометрические модели']]},
  {code: 'word-problems', name: 'Текстовые задачи', children: [['percent', 'Проценты, смеси и сплавы'], ['motion', 'Движение и средняя скорость'], ['water', 'Движение по воде'], ['work', 'Работа и производительность']]},
  {code: 'graphs', name: 'Графики функций', children: [['linear', 'Прямые'], ['quadratic', 'Параболы'], ['inverse', 'Гиперболы'], ['roots', 'Корневые функции'], ['exponential-log', 'Показательные и логарифмические функции'], ['intersection', 'Пересечения графиков']]},
  {code: 'function-study', name: 'Исследование функций', children: [['extrema', 'Точки максимума и минимума'], ['values', 'Наибольшее и наименьшее значения']]}
].map(group => ({...group, children: group.children.map(([code, name]) => [`${group.code}.${code}`, name])}));

function mathTaskTypeInfo(code) {
  if (code === 'other') return {code, name: 'Другие задания первой части'};
  for (const group of MATH_TASK_TYPES) {
    if (group.code === code) return {code, name: group.name, group: group.code};
    const child = group.children.find(([childCode]) => childCode === code);
    if (child) return {code, name: child[1], group: group.code, groupName: group.name};
  }
  return null;
}

function isFirstPartMathTask(task) {
  const answerType = task.answerType || task.meta?.match(/тип ответа:\s*(краткий ответ|разв[её]рнутый ответ)/i)?.[1] || '';
  return answerType.toLocaleLowerCase('ru-RU') === 'краткий ответ';
}

function mathTaskAssignment(task) {
  const record = Object.hasOwn(assignments, task.id) ? assignments[task.id] : null;
  if (!record || typeof task.contentHtml !== 'string') return null;
  if ((record.part === 1) !== isFirstPartMathTask(task)) return null;
  if (JSON.stringify(task.codes) !== JSON.stringify(record.sourceCodes)) return null;
  if (createHash('sha256').update(task.contentHtml).digest('hex') !== record.conditionSha256) return null;
  return record;
}

function mathTaskType(task) {
  if (!isFirstPartMathTask(task)) return null;
  return mathTaskTypeInfo(mathTaskAssignment(task)?.type || 'other');
}

module.exports = {MATH_TASK_TYPES, assignments, mathTaskTypeInfo, isFirstPartMathTask, mathTaskAssignment, mathTaskType};
