const {createHash} = require('node:crypto');
const assignments = require('./physics-task-assignments.json');

// Учебные типы сохранённого банка, без привязки к нумерации конкретного года.
const PHYSICS_TASK_TYPES = [
  ['kinematics', 'Кинематика', [['graphs', 'Координаты и графики движения'], ['motion', 'Скорость, ускорение и перемещение']]],
  ['dynamics', 'Динамика', [['forces', 'Законы Ньютона и силы'], ['friction', 'Трение'], ['elasticity', 'Упругость'], ['gravity', 'Тяготение']]],
  ['conservation', 'Законы сохранения в механике', [['momentum', 'Импульс'], ['energy', 'Работа, мощность и энергия']]],
  ['statics-waves', 'Статика, колебания и волны', [['statics', 'Равновесие и гидростатика'], ['oscillations', 'Механические колебания'], ['waves', 'Механические волны']]],
  ['mechanics-analysis', 'Механика: анализ процессов', [['graphs', 'Графики и таблицы'], ['statements', 'Анализ утверждений']]],
  ['mechanics-change', 'Механика: изменение величин и соответствия', [['changes', 'Изменение величин'], ['matching', 'Формулы и соответствия']]],
  ['molecular', 'Молекулярная физика', [['gas', 'Идеальный газ и МКТ'], ['matter', 'Свойства вещества и влажность']]],
  ['thermodynamics', 'Термодинамика', [['heat', 'Теплообмен и фазовые переходы'], ['gas', 'Работа газа и первый закон'], ['engines', 'Тепловые машины и КПД']]],
  ['thermal-analysis', 'Молекулярная физика: анализ процессов', [['graphs', 'Графики и таблицы'], ['statements', 'Анализ утверждений']]],
  ['thermal-change', 'Молекулярная физика: изменение величин и соответствия', [['changes', 'Изменение величин'], ['matching', 'Формулы и соответствия']]],
  ['electricity', 'Электрическое поле и постоянный ток', [['field', 'Заряды и электрическое поле'], ['circuits', 'Электрические цепи']]],
  ['magnetism', 'Магнитное поле и индукция', [['field', 'Магнитное поле и силы'], ['induction', 'Электромагнитная индукция']]],
  ['optics-waves', 'Электромагнитные колебания и оптика', [['oscillations', 'Колебания и электромагнитные волны'], ['optics', 'Геометрическая и волновая оптика']]],
  ['electro-analysis', 'Электродинамика: анализ процессов', [['graphs', 'Графики и таблицы'], ['statements', 'Анализ утверждений']]],
  ['electro-change', 'Электродинамика: изменение величин и соответствия', [['changes', 'Изменение величин'], ['matching', 'Формулы и соответствия']]],
  ['quantum', 'Квантовая физика: расчётные задачи', [['photons', 'Фотоны и фотоэффект'], ['atom', 'Физика атома'], ['nucleus', 'Ядерные реакции и распад']]],
  ['quantum-change', 'Квантовая физика: анализ и соответствия', [['changes', 'Изменение величин'], ['matching', 'Формулы и соответствия'], ['analysis', 'Анализ утверждений']]],
  ['laws', 'Физические величины и законы', [['statements', 'Смысл физических законов'], ['graphs', 'Зависимости величин и графики']]],
  ['measurement', 'Измерения и погрешности', [['direct', 'Показания приборов'], ['indirect', 'Косвенные измерения']]],
  ['experiment', 'Планирование эксперимента', [['equipment', 'Выбор оборудования'], ['conditions', 'Выбор условий опыта']]],
  ['astronomy', 'Астрофизика', [['stars', 'Звёзды'], ['planets', 'Планеты и спутники']]]
].map(([code, name, children]) => ({code, name, children: children.map(([child, label]) => [`${code}.${child}`, label])}));
const types = new Map(PHYSICS_TASK_TYPES.flatMap(group => [
  [group.code, {code: group.code, name: group.name, group: group.code}],
  ...group.children.map(([code, name]) => [code, {code, name, group: group.code, groupName: group.name}])
]));
types.set('other', {code: 'other', name: 'Другие задания первой части'});
const firstFormats = new Set(['краткий ответ', 'установление соответствия', 'выбор ответов из предложенных вариантов', 'выбор ответа']);
function physicsTaskPart(task) {
  const answerType = (task?.answerType || '').toLocaleLowerCase('ru-RU');
  if (/^разв[её]рнутый ответ$/.test(answerType)) return 2;
  return firstFormats.has(answerType) ? 1 : null;
}
function physicsTaskTypeInfo(code) { return types.get(code) || null; }
function physicsTaskAssignment(task) {
  const record = Object.hasOwn(assignments, task.id) ? assignments[task.id] : null;
  if (!record || physicsTaskPart(task) !== 1 || typeof task.contentHtml !== 'string') return null;
  if (record.answerType !== task.answerType || JSON.stringify(record.sourceCodes) !== JSON.stringify(task.codes)) return null;
  if (createHash('sha256').update(task.contentHtml).digest('hex') !== record.conditionSha256) return null;
  return record;
}
const cache = new WeakMap();
function physicsTaskType(task) {
  if (physicsTaskPart(task) !== 1) return null;
  if (!cache.has(task)) cache.set(task, physicsTaskTypeInfo(physicsTaskAssignment(task)?.type || 'other'));
  return cache.get(task);
}
function firstPartPhysicsMatches(task, code) {
  const type = physicsTaskType(task);
  return Boolean(type && (code === 'all' || type.code === code || type.group === code));
}
module.exports = {PHYSICS_TASK_TYPES, assignments, physicsTaskPart, physicsTaskTypeInfo, physicsTaskAssignment, physicsTaskType, firstPartPhysicsMatches};
