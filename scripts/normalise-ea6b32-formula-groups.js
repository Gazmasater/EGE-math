const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const db = new DatabaseSync(path.join(__dirname, '..', 'storage', 'solutions.sqlite'));
const taskId = 'EA6B32';
const row = db.prepare('SELECT solution FROM solutions WHERE task_id = ? AND published = 1').get(taskId);
if (!row) throw new Error(`Нет опубликованного решения ${taskId}`);

const solution = row.solution
  .replace('−9u/2−9√14v/5+√19w/10=0.', '−(9/2)u−(9√14/5)v+(√19/10)w=0.')
  .replace('−9√14/2+18√14/5+√19w/10=0,', '−9√14/2+18√14/5+(√19/10)w=0,');

if (solution === row.solution) throw new Error(`Не найдены группы дробей для ${taskId}`);
db.prepare('UPDATE solutions SET solution = ?, updated_at = ? WHERE task_id = ?')
  .run(solution, new Date().toISOString(), taskId);
console.log(`Нормализована запись дробей в ${taskId}`);
