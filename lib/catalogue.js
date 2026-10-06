const {conditionText} = require('./seo-text');

const CATALOGUE_PAGE_SIZE = 12;
const MATH_CATALOGUE_ALIASES = {'7.5': 'vectors', '2.3': 'applied.trigonometry'};
const LEGACY_MATH_NAMES = {
  '2.1': 'Уравнения и задачи с уравнениями',
  '7.1': 'Геометрия на плоскости и в пространстве'
};
const LEGACY_PHYSICS_NAMES = {'1.1': 'Движение и измерения в механике'};

function catalogueUrl(basePath, {page = 1, query = '', taskId = ''} = {}) {
  const url = new URL(basePath, 'https://ege-fipi.ru');
  url.searchParams.delete('page');
  url.searchParams.delete('q');
  if (query) url.searchParams.set('q', query);
  if (page > 1) url.searchParams.set('page', String(page));
  return url.pathname + url.search + (taskId ? '#task-' + encodeURIComponent(taskId) : '');
}

function normalizeCatalogueQuery(value) {
  return String(value || '').normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, 80);
}
function catalogueMatches(task, query) {
  if (!query) return true;
  const normalize = value => value.toLocaleLowerCase('ru-RU').replace(/ё/g, 'е');
  const terms = normalize(query).match(/[\p{L}\p{N}]+/gu) || [];
  if (!terms.length) return false;
  const text = normalize(task.id + ' ' + conditionText(task.contentHtml));
  return terms.every(term => text.includes(term));
}
function catalogueWindow(tasks, page = 1) {
  const totalPages = Math.max(1, Math.ceil(tasks.length / CATALOGUE_PAGE_SIZE));
  if (!Number.isSafeInteger(page) || page < 1 || page > totalPages) return null;
  const offset = (page - 1) * CATALOGUE_PAGE_SIZE;
  return {page, pageSize: CATALOGUE_PAGE_SIZE, total: tasks.length, totalPages, offset,
    tasks: tasks.slice(offset, offset + CATALOGUE_PAGE_SIZE)};
}
function cataloguePageNumbers(page, totalPages) {
  return [...new Set([1, page - 1, page, page + 1, totalPages])].filter(n => n > 0 && n <= totalPages).sort((a, b) => a - b);
}

module.exports = {CATALOGUE_PAGE_SIZE, MATH_CATALOGUE_ALIASES, LEGACY_MATH_NAMES, LEGACY_PHYSICS_NAMES,
  catalogueUrl, normalizeCatalogueQuery, catalogueMatches, catalogueWindow, cataloguePageNumbers};
