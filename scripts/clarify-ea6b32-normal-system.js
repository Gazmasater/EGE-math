const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const db = new DatabaseSync(path.join(__dirname, '..', 'storage', 'solutions.sqlite'));
const taskId = 'EA6B32';
const before = `Выведем уравнение плоскости CEF. В ней лежат векторы
CE=(−20/9,−10√14/9,0), CF=(−9/2,−9√14/5,√19/10). Пусть нормаль равна (u,v,w). Условия перпендикулярности дают
2u+√14v=0,
−(9/2)u−(9√14/5)v+(√19/10)w=0.
Берём v=−2. Тогда u=√14, w=9√14/√19. Поэтому, подставляя точку C(5,2√14,0), получаем`;
const after = `Выведем уравнение плоскости CEF. В ней лежат векторы
CE=(−20/9,−10√14/9,0), CF=(−9/2,−9√14/5,√19/10). Пусть нормаль равна n=(u,v,w). Она перпендикулярна обоим этим векторам, поэтому её скалярные произведения с ними равны нулю:
n·CE=(−20/9)u−(10√14/9)v=0,
n·CF=−(9/2)u−(9√14/5)v+(√19/10)w=0.
Первое равенство умножим на −9/10. Получаем систему
2u+√14v=0,
−9u/2−9√14v/5+√19w/10=0.
Нормаль можно умножать на любое ненулевое число, поэтому для удобства положим v=−2. Тогда из первого уравнения u=√14. Подставляем это и v=−2 во второе:
−9√14/2+18√14/5+(√19/10)w=0,
−45√14+36√14+√19w=0,
w=9√14/√19.
Поэтому, подставляя точку C(5,2√14,0), получаем`;

const row = db.prepare('SELECT solution FROM solutions WHERE task_id = ? AND published = 1').get(taskId);
if (!row || !row.solution.includes(before)) {
  throw new Error(`Не найден исходный фрагмент решения ${taskId}`);
}
db.prepare('UPDATE solutions SET solution = ?, updated_at = ? WHERE task_id = ?')
  .run(row.solution.replace(before, after), new Date().toISOString(), taskId);
console.log(`Уточнён вывод системы для ${taskId}`);
