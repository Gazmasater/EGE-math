const { reviewedOgeAssignment } = require('./oge-classification');
const OGE_PROJECT = 'DE0E276E497AB3784C3FC4CC20248DC0';
const OGE_ORIGIN = 'https://oge.fipi.ru';
const OGE_PAGE_SIZE = 12;
const OGE_TOPICS = [
  { code: '1', name: 'Числа и вычисления', children: [
    ['1.1', 'Натуральные и целые числа. Признаки делимости целых чисел'],
    ['1.2', 'Обыкновенные и десятичные дроби, проценты, бесконечные периодические дроби'],
    ['1.3', 'Рациональные числа. Арифметические операции с рациональными числами'],
    ['1.4', 'Действительные числа. Арифметические операции с действительными числами'],
    ['1.5', 'Приближённые вычисления, правила округления, прикидка и оценка результата вычислений']
  ] },
  { code: '2', name: 'Алгебраические выражения', children: [
    ['2.1', 'Буквенные выражения (выражения с переменными)'],
    ['2.2', 'Степень с целым показателем. Степень с рациональным показателем. Свойства степени'],
    ['2.3', 'Многочлены'], ['2.4', 'Алгебраическая дробь'],
    ['2.5', 'Арифметический корень натуральной степени. Действия с арифметическими корнями натуральной степени']
  ] },
  { code: '3', name: 'Уравнения и неравенства', children: [
    ['3.1', 'Целые и дробно-рациональные уравнения. Системы и совокупности уравнений'],
    ['3.2', 'Целые и дробно-рациональные неравенства. Системы и совокупности неравенств'],
    ['3.3', 'Решение текстовых задач']
  ] },
  { code: '4', name: 'Числовые последовательности', children: [
    ['4.1', 'Последовательности, способы задания последовательностей'],
    ['4.2', 'Арифметическая и геометрическая прогрессии. Формула сложных процентов']
  ] },
  { code: '5', name: 'Функции', children: [
    ['5.1', 'Функция и её график. Область определения и множество значений, нули, знакопостоянство, монотонность и экстремумы']
  ] },
  { code: '6', name: 'Координаты на прямой и плоскости', children: [
    ['6.1', 'Координатная прямая'], ['6.2', 'Декартовы координаты на плоскости']
  ] },
  { code: '7', name: 'Геометрия', children: [
    ['7.1', 'Геометрические фигуры и их свойства'], ['7.2', 'Треугольник'],
    ['7.3', 'Многоугольники'], ['7.4', 'Окружность и круг'],
    ['7.5', 'Измерение геометрических величин'], ['7.6', 'Векторы на плоскости']
  ] },
  { code: '8', name: 'Вероятность и статистика', children: [
    ['8.1', 'Описательная статистика'], ['8.2', 'Вероятность'],
    ['8.3', 'Комбинаторика'], ['8.4', 'Множества'], ['8.5', 'Графы']
  ] }
];
const OGE_BANKS = {
  oge: { section: 'oge', project: OGE_PROJECT, path: '/oge', filePrefix: 'oge', assetPrefix: '/fipi/oge/', publicIdPrefix: '', name: 'ОГЭ — математика', subject: 'математике', shortName: 'математика', topics: OGE_TOPICS },
  'oge-physics': { section: 'oge-physics', project: 'B24AFED7DE6AB5BC461219556CCA4F9B', path: '/oge-physics', filePrefix: 'oge-physics', assetPrefix: '/fipi/oge-physics/', publicIdPrefix: 'OGEPHYS', name: 'ОГЭ — физика', subject: 'физике', shortName: 'физика', topics: require('./oge-physics-topics.json') }
};
// Cross-subject skills have no single leaf in the subject-only FIPI tree.
OGE_BANKS['oge-physics'].topics = [...OGE_BANKS['oge-physics'].topics.map(group => ({ ...group,
  children: group.children.map(([code, name]) => [code, code === '2.3' ? 'Поверхностное натяжение, смачивание и капиллярные явления' : name])
})), {
  code: 'methods', name: 'Методы, измерения и работа с данными', children: [
    ['methods.concepts', 'Физические понятия, формулы и единицы величин'],
    ['methods.measurements', 'Измерительные приборы, шкалы и погрешности'],
    ['methods.experiments', 'Планирование и анализ эксперимента'],
    ['methods.text', 'Работа с физическим текстом и данными']
  ]
}];
const topicMaps = new Map(Object.entries(OGE_BANKS).map(([section, bank]) => [section, new Map(bank.topics.flatMap(group => [
  [group.code, { code: group.code, name: group.name }],
  ...group.children.map(([code, name]) => [code, { code, name }])
]))]));

function ogeBank(section = 'oge') {
  const bank = Object.hasOwn(OGE_BANKS, section) ? OGE_BANKS[section] : null;
  if (!bank) throw new Error(`Неизвестный банк ОГЭ: ${section}`);
  return bank;
}

function ogePublicTaskId(sourceId, section = 'oge') {
  const prefix = ogeBank(section).publicIdPrefix;
  const id = String(sourceId).toUpperCase();
  return prefix && !id.startsWith(prefix) ? prefix + id : id;
}

function ogeSourceTaskId(publicId, section = 'oge') {
  const prefix = ogeBank(section).publicIdPrefix;
  return prefix && publicId.startsWith(prefix) ? publicId.slice(prefix.length) : publicId;
}

function ogeTopicInfo(code, section = 'oge') {
  if (code === 'all') return { code, name: 'Все задания' };
  if (code === 'practical') return { code, name: section === 'oge' ? 'Практические задачи с общим условием' : 'Задания с общим условием' };
  if (code === 'unclassified') return { code, name: 'Без указанной темы КЭС' };
  return topicMaps.get(ogeBank(section).section).get(code) || null;
}

function ogeTaskCodes(task) {
  if (task.ogeCodes) return task.ogeCodes;
  // Only FIPI's KES cell is authoritative; numbers in the condition are not topics.
  const cell = task.fragment.match(/КЭС:<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>/i)?.[1] || '';
  return [...new Set([...cell.matchAll(/(?:^|>)\s*([1-8](?:\.\d+)*)\s/g)].map(match => match[1]))];
}

function ogeTopicCodes(task, section = 'oge') {
  const assignment = reviewedOgeAssignment(task, ogeBank(section).section);
  return assignment ? assignment.topics : ogeTaskCodes(task);
}

function ogeTaskMatchesTopic(task, code, section = 'oge') {
  if (code === 'all') return true;
  if (code === 'practical') return task.fragment.includes('class="oge-shared-condition"');
  const codes = ogeTopicCodes(task, section);
  const topics = topicMaps.get(ogeBank(section).section);
  if (code === 'unclassified') return !codes.some(item => topics.has(item) || topics.has(item.split('.').slice(0, 2).join('.')));
  return codes.some(item => item === code || item.startsWith(`${code}.`));
}

function ogeTopicStats(tasks, section = 'oge') {
  const topics = topicMaps.get(ogeBank(section).section);
  const counts = Object.fromEntries([...topics.keys()].map(code => [code, 0]));
  counts.unclassified = 0;
  counts.practical = 0;
  for (const task of tasks) {
    for (const code of topics.keys()) if (ogeTaskMatchesTopic(task, code, section)) counts[code]++;
    if (ogeTaskMatchesTopic(task, 'unclassified', section)) counts.unclassified++;
    if (ogeTaskMatchesTopic(task, 'practical', section)) counts.practical++;
  }
  return { total: tasks.length, counts };
}

function ogeCataloguePath({ topic = '', page = 1, query = '', added = false, section = 'oge' } = {}) {
  const bank = ogeBank(section);
  const params = new URLSearchParams();
  if (added) params.set('section', section);
  if (topic) params.set('topic', topic);
  if (query) params.set('q', query);
  if (page > 1) params.set('page', String(page));
  return `${added ? '/added' : bank.path}${params.size ? `?${params}` : ''}`;
}

function ogePageNumber(value) {
  if (value === null || value === undefined || value === '') return 1;
  if (!/^[1-9]\d*$/.test(String(value))) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
}

function ogeStaticPictures(html, filesLocation = '', section = 'oge') {
  return html.replace(/<script\b[^>]*>\s*(ShowPictureQ|ShowPicture)\(\s*(['"])([^'"]+)\2(?:\s*,[^)]*)?\);?\s*<\/script>/gi,
    (script, method, quote, filename) => {
      const relative = method === 'ShowPictureQ' ? filename : filesLocation + filename;
      if (!relative.startsWith('docs/') || relative.split('/').includes('..')) throw new Error(`Некорректный путь рисунка ОГЭ: ${relative}`);
      const src = ogeBank(section).assetPrefix + relative.split('/').map(encodeURIComponent).join('/');
      return `<img class="fipi-picture" loading="lazy" src="${src}" alt="Рисунок из условия ФИПИ">`;
    });
}

function normalizeOgeSourceHtml(html, section = 'oge') {
  // FIPI emits a qblock WITHOUT an ID for the common text of a practical block.
  // Attach it to each subsequent question, rather than the preceding question.
  const starts = [...html.matchAll(/<div\s+class=['"][^'"]*\bqblock\b[^'"]*['"][^>]*>/gi)];
  if (!starts.length) return html;
  const bodyEnd = html.search(/<\/body\s*>/i);
  const lastEnd = bodyEnd < 0 ? html.length : bodyEnd;
  let result = html.slice(0, starts[0].index);
  let shared = '';
  let filesLocation = '';
  for (const [index, start] of starts.entries()) {
    const part = html.slice(start.index, starts[index + 1]?.index ?? lastEnd);
    const id = start[0].match(/\bid=['"]q([A-Z0-9]+)['"]/i)?.[1];
    if (!id) {
      filesLocation = part.match(/files_abs_location\s*=\s*['"]([^'"]+)['"]/)?.[1] || '';
      const content = part.slice(start[0].length).replace(/<div[^>]*\bclass=['"]hint['"][^>]*>[\s\S]*?<\/div>/i, '').replace(/<\/div>\s*$/i, '');
      shared = `<section class="oge-shared-condition" aria-label="Общее условие"><h2>Общее условие</h2>${ogeStaticPictures(content, filesLocation, section)}</section>`;
    } else {
      const publicId = ogePublicTaskId(id, section);
      let question = ogeStaticPictures(part.slice(start[0].length), filesLocation, section);
      if (publicId !== id) {
        // Keep source form names/handlers, but namespace task/control IDs and properties.
        question = question.replace(new RegExp(`(\\bid=['"]|['"])i${id}(['"])`, 'g'), `$1i${publicId}$2`);
      }
      result += start[0].replace(`q${id}`, `q${publicId}`) + shared + question;
    }
  }
  return result + html.slice(lastEnd);
}

function ogeAssetPaths(html, section = 'oge') {
  const paths = new Set();
  for (const match of html.matchAll(/(?:src|href)=["']\.\.\/\.\.\/([^"'?#]+)(?:\?[^"']*)?["']/gi)) paths.add(match[1]);
  for (const match of html.matchAll(/["'](docs\/[^"']+)["']/gi)) paths.add(match[1]);
  // Relative ShowPicture calls inside common conditions also need offline assets.
  const normalized = normalizeOgeSourceHtml(html, section);
  const prefix = ogeBank(section).assetPrefix;
  for (const match of normalized.matchAll(/src=["']([^"']+)["']/gi)) {
    if (match[1].startsWith(prefix)) paths.add(decodeURIComponent(match[1].slice(prefix.length)));
  }
  return paths;
}

module.exports = { OGE_PROJECT, OGE_ORIGIN, OGE_PAGE_SIZE, OGE_TOPICS, OGE_BANKS, ogeBank, ogePublicTaskId, ogeSourceTaskId, ogeTopicInfo, ogeTaskCodes, ogeTopicCodes, ogeTaskMatchesTopic, ogeTopicStats, ogeCataloguePath, ogePageNumber, normalizeOgeSourceHtml, ogeAssetPaths };
