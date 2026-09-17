#!/usr/bin/env node

const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync(path.join(__dirname, '..', 'storage', 'solutions.sqlite'));

const generalAnswers = {
  FDA042: 'x=⟦π¦4⟧+2πn, n∈ℤ.',
  '638272': 'x=⟦π¦6⟧+2πn; x=⟦π¦2⟧+2πn, n∈ℤ.',
  '617B18': 'x=⟦π¦3⟧+2πn; x=⟦2π¦3⟧+2πn; x=⟦4π¦3⟧+2πn; x=⟦5π¦3⟧+2πn, n∈ℤ.',
  AD8FD9: 'x=⟦π¦3⟧+2πn; x=⟦2π¦3⟧+2πn; x=⟦4π¦3⟧+2πn; x=⟦5π¦3⟧+2πn, n∈ℤ.',
  A6BC58: 'x=⟦π¦6⟧+2πn, n∈ℤ.',
  B2FAAF: 'x=⟦π¦2⟧+2πn; x=⟦5π¦6⟧+2πn, n∈ℤ.',
  F22045: 'x=1 или x=⟦3¦2⟧.',
  '1CAE46': 'x=⟦π¦6⟧+2πn; x=⟦5π¦6⟧+2πn; x=⟦7π¦6⟧+2πn; x=⟦11π¦6⟧+2πn, n∈ℤ.',
  A1A34D: 'x=⟦π¦2⟧+πn; x=⟦π¦4⟧+2πn; x=⟦3π¦4⟧+2πn, n∈ℤ.',
  '0448F1': 'x=π+2πn; x=⟦π¦3⟧+2πn; x=−⟦π¦3⟧+2πn, n∈ℤ.',
  '5E5CF2': 'x=−⟦π¦4⟧+πn, n∈ℤ.',
  '913EF3': 'x=−⟦π¦4⟧+πn, n∈ℤ.',
  EE74FD: 'x=⟦1¦2⟧ или x=2.',
  '6671FD': 'x=πn; x=−⟦π¦6⟧+2πn; x=⟦7π¦6⟧+2πn, n∈ℤ.',
  '8413F6': 'x=⟦π¦2⟧+πn; x=⟦5π¦6⟧+2πn; x=⟦7π¦6⟧+2πn, n∈ℤ.',
  '54D407': 'x=⟦π¦6⟧+2πn; x=⟦5π¦6⟧+2πn; x=⟦π¦2⟧+2πn, n∈ℤ.',
  '3BB500': 'x=⟦π¦2⟧+πn; x=−⟦π¦4⟧+πn, n∈ℤ.',
  '712A7B': 'x=⟦π¦2⟧+πn; x=⟦π¦3⟧+2πn; x=−⟦π¦3⟧+2πn, n∈ℤ.',
  '209E7E': 'x=⟦π¦6⟧+2πn; x=−⟦π¦6⟧+2πn; x=⟦2π¦3⟧+2πn; x=−⟦2π¦3⟧+2πn, n∈ℤ.',
  D1D574: 'x=1 или x=⟦3¦2⟧.',
  '5AE77D': 'x=⟦π¦4⟧+πn, n∈ℤ.',
  C4507A: 'x=⟦π¦2⟧+πn; x=⟦5π¦4⟧+2πn; x=⟦7π¦4⟧+2πn, n∈ℤ.',
  '92FD74': 'x=⟦π¦4⟧+2πn; x=⟦3π¦4⟧+2πn, n∈ℤ.',
  '2D54B0': 'x=⟦π¦6⟧+2πn; x=⟦5π¦6⟧+2πn; x=⟦π¦2⟧+2πn, n∈ℤ.',
  '2247B7': 'x=πn; x=⟦π¦6⟧+2πn; x=⟦5π¦6⟧+2πn, n∈ℤ.',
  DCD2BC: 'x=πn; x=⟦π¦6⟧+2πn; x=−⟦π¦6⟧+2πn, n∈ℤ.',
  '9B4DBD': 'x=⟦π¦3⟧+πn, n∈ℤ.',
  '6CEDB3': 'x=⟦π¦2⟧+πn; x=⟦5π¦4⟧+2πn; x=⟦7π¦4⟧+2πn, n∈ℤ.',
  B8F61F: 'x=⟦π¦2⟧+πn; x=⟦π¦3⟧+2πn; x=−⟦π¦3⟧+2πn, n∈ℤ.',
  '2CCC19': 'x=−⟦π¦3⟧+πn; x=⟦π¦4⟧+2πn; x=⟦3π¦4⟧+2πn, n∈ℤ.',
  '53A21E': 'x=⟦π¦3⟧+πn, n∈ℤ.',
  '9BA813': 'x=πn; x=⟦π¦6⟧+2πn; x=⟦5π¦6⟧+2πn, n∈ℤ.',
  E6F116: 'x=⟦π¦3⟧+2πn; x=−⟦π¦3⟧+2πn, n∈ℤ.',
  '685C13': 'x=πn; x=⟦π¦4⟧+2πn; x=⟦3π¦4⟧+2πn, n∈ℤ.',
  '350814': 'x=⟦5π¦4⟧+2πn; x=⟦7π¦4⟧+2πn, n∈ℤ.',
  '34BB16': 'x=⟦π¦3⟧+2πn; x=⟦2π¦3⟧+2πn; x=⟦5π¦4⟧+2πn; x=⟦7π¦4⟧+2πn, n∈ℤ.',
  '889715': 'x=⟦π¦6⟧+πn, n∈ℤ.',
  '0BD320': 'x=⟦1¦2⟧ или x=2.',
  '015B20': 'x=πn; x=⟦π¦4⟧+2πn; x=−⟦π¦4⟧+2πn, n∈ℤ.',
  '1D3525': 'x=2πn; x=−⟦π¦6⟧+2πn; x=−⟦5π¦6⟧+2πn, n∈ℤ.',
  E4EA28: 'x=⟦π¦3⟧+πn; x=⟦π¦6⟧+πn, n∈ℤ.',
  '89582D': 'x=⟦π¦3⟧+2πn; x=⟦2π¦3⟧+2πn, n∈ℤ.',
  F438D2: 'x=⟦π¦3⟧+2πn; x=−⟦π¦3⟧+2πn; x=⟦2π¦3⟧+2πn; x=−⟦2π¦3⟧+2πn, n∈ℤ.',
  '24AAD1': 'x=⟦π¦2⟧+πn; x=⟦π¦4⟧+2πn; x=−⟦π¦4⟧+2πn, n∈ℤ.',
  '858BD4': 'x=πn; x=⟦3π¦4⟧+2πn; x=⟦5π¦4⟧+2πn, n∈ℤ.',
  '8EB2DA': 'x=⟦π¦2⟧+πn; x=⟦π¦3⟧+2πn; x=−⟦π¦3⟧+2πn, n∈ℤ.',
  '0AD550': 'x=πn; x=⟦5π¦4⟧+2πn; x=⟦7π¦4⟧+2πn, n∈ℤ.',
  '74C1A9': 'x=⟦5π¦6⟧+2πn; x=⟦7π¦6⟧+2πn, n∈ℤ.',
  '9D14AA': 'x=⟦3π¦2⟧+2πn; x=⟦2π¦3⟧+2πn; x=⟦4π¦3⟧+2πn, n∈ℤ.',
  '30EEA9': 'x=⟦π¦2⟧+πn; x=−⟦π¦3⟧+πn, n∈ℤ.',
  '0000C3': 'x=⟦π¦2⟧+πn; x=⟦4π¦3⟧+2πn; x=⟦5π¦3⟧+2πn, n∈ℤ.',
  '9EB1CA': 'x=πn; x=⟦π¦4⟧+2πn; x=−⟦π¦4⟧+2πn, n∈ℤ.',
  E0B0CA: 'x=⟦3π¦2⟧+2πn; x=⟦7π¦6⟧+2πn; x=⟦11π¦6⟧+2πn, n∈ℤ.',
  '34CAC3': 'x=2πn; x=⟦2π¦3⟧+2πn; x=−⟦2π¦3⟧+2πn, n∈ℤ.',
  '46249A': 'x=⟦3π¦2⟧+2πn; x=⟦7π¦6⟧+2πn; x=⟦11π¦6⟧+2πn, n∈ℤ.',
  A67297: 'x=⟦π¦3⟧+2πn; x=⟦2π¦3⟧+2πn; x=⟦7π¦6⟧+2πn; x=⟦11π¦6⟧+2πn, n∈ℤ.',
  F98BE9: 'x=−⟦π¦6⟧+πn, n∈ℤ.',
  '0C47ED': 'x=π+2πn; x=⟦π¦3⟧+2πn; x=−⟦π¦3⟧+2πn, n∈ℤ.',
  '72BEEC': 'x=⟦3π¦4⟧+2πn; x=⟦5π¦4⟧+2πn; x=⟦π¦6⟧+2πn; x=−⟦π¦6⟧+2πn, n∈ℤ.',
  '8A88E1': 'x=πn; x=−⟦π¦6⟧+2πn; x=−⟦5π¦6⟧+2πn, n∈ℤ.',
  '4FF160': 'x=πn; x=⟦π¦4⟧+2πn; x=−⟦π¦4⟧+2πn, n∈ℤ.',
  '78516C': 'x=⟦π¦2⟧+2πn; x=⟦5π¦4⟧+2πn; x=⟦7π¦4⟧+2πn, n∈ℤ.',
  D7FC6F: 'x=⟦π¦2⟧+πn; x=⟦π¦3⟧+2πn; x=−⟦π¦3⟧+2πn, n∈ℤ.',
  C19C6E: 'x=⟦π¦2⟧+πn; x=⟦π¦4⟧+πn, n∈ℤ.',
  '4EFD3D': 'x=πn; x=⟦π¦4⟧+2πn; x=−⟦π¦4⟧+2πn, n∈ℤ.',
  '716236': 'x=⟦π¦2⟧+2πn; x=⟦4π¦3⟧+2πn; x=⟦5π¦3⟧+2πn, n∈ℤ.',
  '51D289': 'x=⟦3π¦2⟧+2πn; x=⟦7π¦6⟧+2πn; x=⟦11π¦6⟧+2πn, n∈ℤ.'
};

const existing = db.prepare('SELECT task_id, answer, solution FROM solutions WHERE task_id = ? AND published = 1');
const update = db.prepare('UPDATE solutions SET solution = ?, updated_at = ? WHERE task_id = ? AND published = 1');
const now = new Date().toISOString();
let changed = 0;

db.exec('BEGIN');
try {
  for (const [taskId, general] of Object.entries(generalAnswers)) {
    const row = existing.get(taskId);
    if (!row) throw new Error(`Не найдено опубликованное решение ${taskId}`);
    if (row.solution.includes('а) Общее решение:')) continue;
    const addition = `\n\nа) Общее решение: ${general}\n\nб) Корни на заданном отрезке: ${row.answer}.`;
    if (update.run(`${row.solution.trim()}${addition}`, now, taskId).changes !== 1) throw new Error(`Не обновлено решение ${taskId}`);
    changed += 1;
  }
  db.exec('COMMIT');
} catch (error) {
  db.exec('ROLLBACK');
  throw error;
}

console.log(JSON.stringify({ total: Object.keys(generalAnswers).length, changed }));
