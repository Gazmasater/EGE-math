#!/usr/bin/env node

const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const checkOnly = process.argv.includes('--check');
const db = new DatabaseSync(path.join(__dirname, '..', 'storage', 'solutions.sqlite'));

const updates = [
  {
    taskId: '0B28A5',
    previous: `По условию плоскость α перпендикулярна диагонали AC₁, поэтому её нормальный вектор равен направляющему вектору AC₁=(5,3,4). Уравнение плоскости, проходящей через M, получаем из скалярного произведения:
(5,3,4)·((x,y,z)−(⟦5¦2⟧,⟦3¦2⟧,2))=0.`,
    next: `По условию плоскость α перпендикулярна диагонали AC₁, поэтому её нормальный вектор равен направляющему вектору AC₁=(5,3,4). Возьмём произвольную точку X(x,y,z) плоскости α. Вектор
→MX=(x⟦−5¦2⟧,y⟦−3¦2⟧,z−2)
лежит в плоскости α, а нормаль ей перпендикулярна. Поэтому их скалярное произведение равно нулю:
(5,3,4)·(x⟦−5¦2⟧,y⟦−3¦2⟧,z−2)=0.`
  },
  {
    taskId: '1F7CE6',
    previous: `(a,b,c)·PQ=⟦b¦2⟧=0,
(a,b,c)·PM=⟦a¦3⟧⟦−c¦2⟧=0.`,
    next: `(a,b,c)·PQ=⟦b¦2⟧=0,
(a,b,c)·PM=⟦a¦3⟧+⟦−c¦2⟧=0.`
  },
  {
    taskId: '1F7CE6',
    previous: `Нормаль можно умножать на любое ненулевое число; положим c=2. Тогда a=3, и нормаль равна (3,0,2). Подставляя точку P, получаем
3(x−0)+2(z⟦−1¦2⟧)=0,`,
    next: `Нормаль можно умножать на любое ненулевое число; положим c=2. Тогда a=3, и нормаль равна (3,0,2). Для произвольной точки X(x,y,z) плоскости вектор
→PX=(x−0,y−0,z⟦−1¦2⟧)
лежит в этой плоскости, поэтому он перпендикулярен нормали. Следовательно,
(3,0,2)·(x−0,y−0,z⟦−1¦2⟧)=0,
3(x−0)+2(z⟦−1¦2⟧)=0,`
  },
  {
    taskId: 'F416AF',
    previous: `Берём b=1, c=√3. Подстановка точки M(0,0,3) даёт
y+√3(z−3)=0,`,
    next: `Берём b=1, c=√3, поэтому нормаль плоскости равна (0,1,√3). Возьмём произвольную точку X(x,y,z) плоскости CMN. Тогда вектор
→MX=(x,y,z−3)
лежит в плоскости и перпендикулярен её нормали. Значит,
(0,1,√3)·(x,y,z−3)=0,
y+√3(z−3)=0,`
  }
];

const get = db.prepare('SELECT solution FROM solutions WHERE task_id = ? AND published = 1');
const save = db.prepare('UPDATE solutions SET solution = ?, updated_at = ? WHERE task_id = ? AND published = 1');
let changed = 0;

db.exec('BEGIN');
try {
  const byTask = new Map();
  for (const update of updates) {
    const solution = byTask.get(update.taskId) ?? get.get(update.taskId)?.solution;
    if (!solution) throw new Error(`Не найдено опубликованное решение ${update.taskId}`);
    if (solution.includes(update.next)) {
      byTask.set(update.taskId, solution);
      continue;
    }
    if (!solution.includes(update.previous)) throw new Error(`Не найден фрагмент для ${update.taskId}`);
    byTask.set(update.taskId, solution.replace(update.previous, update.next));
  }
  for (const [taskId, solution] of byTask) {
    if (solution === get.get(taskId).solution) continue;
    if (!checkOnly) save.run(solution, new Date().toISOString(), taskId);
    changed++;
  }
  if (checkOnly && changed) throw new Error(`Требуется обновить решений: ${changed}`);
  db.exec('COMMIT');
  console.log(checkOnly ? 'Пояснения к уравнениям плоскостей проверены.' : `Обновлено решений: ${changed}.`);
} catch (error) {
  db.exec('ROLLBACK');
  throw error;
}
