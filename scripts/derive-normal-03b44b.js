const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const db = new DatabaseSync(path.join(__dirname, '..', 'storage', 'solutions.sqlite'));
const taskId = '03B44B';
const before = `Векторы CM = (−6,−8,0) и CK = (−24/7,−32/7,6√17/7) лежат в плоскости CKM. Вектор n=(4,−3,0) перпендикулярен каждому из них, так как
n·CM=4·(−6)−3·(−8)=0,
n·CK=4·(−24/7)−3·(−32/7)=0.
Значит, n — нормаль к плоскости CKM.`;
const after = `Векторы CM = (−6,−8,0) и CK = (−24/7,−32/7,6√17/7) лежат в плоскости CKM. Ищем нормаль в виде n=(u,v,w). Она перпендикулярна обоим векторам, поэтому
n·CM=−6u−8v=0,
n·CK=−(24/7)u−(32/7)v+(6√17/7)w=0.
После умножения первого уравнения на −1/2, а второго — на 7 получаем систему
3u+4v=0,
−24u−32v+6√17w=0.
Второе уравнение имеет вид −8(3u+4v)+6√17w=0. По первому уравнению его первая часть равна нулю, значит w=0. Нормаль можно умножать на любое ненулевое число; возьмём u=4. Тогда из 3u+4v=0 получаем v=−3. Итак, n=(4,−3,0) — нормаль к плоскости CKM.`;

const row = db.prepare('SELECT solution FROM solutions WHERE task_id = ? AND published = 1').get(taskId);
if (!row || !row.solution.includes(before)) throw new Error(`Не найден исходный фрагмент решения ${taskId}`);
db.prepare('UPDATE solutions SET solution = ?, updated_at = ? WHERE task_id = ?')
  .run(row.solution.replace(before, after), new Date().toISOString(), taskId);
console.log(`Добавлен вывод нормали для ${taskId}`);
