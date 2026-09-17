const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const databaseFile = path.join(__dirname, '..', 'storage', 'solutions.sqlite');
const taskId = '6CEDB3';
const answer = '⟦3π¦2⟧; ⟦7π¦4⟧; ⟦5π¦2⟧';
const originalWrongSolution = `Используем cos(2x)+1=2cos²x:
sin x·cos(2x)+√2cos²x+sin x=0,
cos²x·(2sin x+√2)=0.

Следовательно, cos x=0 или sin x=−⟦√2¦2⟧.

На отрезке [⟦3π¦2⟧;3π] получаем ⟦3π¦2⟧, ⟦7π¦4⟧, ⟦5π¦2⟧, ⟦11π¦4⟧.

Ответ: ⟦3π¦2⟧; ⟦7π¦4⟧; ⟦5π¦2⟧; ⟦11π¦4⟧.

а) Общее решение: x=⟦π¦2⟧+πn; x=⟦5π¦4⟧+2πn; x=⟦7π¦4⟧+2πn, n∈ℤ.

б) Корни на заданном отрезке: ⟦3π¦2⟧; ⟦7π¦4⟧; ⟦5π¦2⟧; ⟦11π¦4⟧.`;
const intermediateWrongSolution = `Используем cos(2x)+1=2cos²x:
sin x·cos(2x)+√2cos²x+sin x=0,
cos²x·(2sin x+√2)=0.

Следовательно, cos x=0 или sin x=−⟦√2¦2⟧.

На отрезке [⟦3π¦2⟧;3π] получаем ⟦3π¦2⟧, ⟦7π¦4⟧, ⟦9π¦4⟧, ⟦5π¦2⟧.

Ответ: ⟦3π¦2⟧; ⟦7π¦4⟧; ⟦9π¦4⟧; ⟦5π¦2⟧.

а) Общее решение: x=⟦π¦2⟧+πn; x=⟦5π¦4⟧+2πn; x=⟦7π¦4⟧+2πn, n∈ℤ.

б) Корни на заданном отрезке: ⟦3π¦2⟧; ⟦7π¦4⟧; ⟦9π¦4⟧; ⟦5π¦2⟧.`;
const correctedSolution = `Используем cos(2x)+1=2cos²x:
sin x·cos(2x)+√2cos²x+sin x=0,
cos²x·(2sin x+√2)=0.

Следовательно, cos x=0 или sin x=−⟦√2¦2⟧.

На отрезке [⟦3π¦2⟧;3π] получаем ⟦3π¦2⟧, ⟦7π¦4⟧, ⟦5π¦2⟧.

Ответ: ⟦3π¦2⟧; ⟦7π¦4⟧; ⟦5π¦2⟧.

а) Общее решение: x=⟦π¦2⟧+πn; x=⟦5π¦4⟧+2πn; x=⟦7π¦4⟧+2πn, n∈ℤ.

б) Корни на заданном отрезке: ⟦3π¦2⟧; ⟦7π¦4⟧; ⟦5π¦2⟧.`;

const db = new DatabaseSync(databaseFile);
const row = db.prepare('SELECT solution FROM solutions WHERE task_id = ? AND published = 1').get(taskId);
if (!row) throw new Error(`Не найдено опубликованное решение ${taskId}.`);
const solution = row.solution.includes(intermediateWrongSolution)
  ? row.solution.replace(intermediateWrongSolution, correctedSolution)
  : (row.solution.includes(originalWrongSolution) ? row.solution.replace(originalWrongSolution, correctedSolution) : row.solution);
const result = db.prepare(`
  UPDATE solutions
  SET answer = ?, solution = ?, updated_at = ?
  WHERE task_id = ? AND published = 1
`).run(answer, solution, new Date().toISOString(), taskId);
if (result.changes !== 1) throw new Error(`Не удалось обновить ${taskId}.`);
console.log(JSON.stringify({ taskId, changes: result.changes, textUpdated: solution !== row.solution, answer }));
