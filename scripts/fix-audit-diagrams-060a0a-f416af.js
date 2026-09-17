const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const db = new DatabaseSync(path.join(__dirname, '..', 'storage', 'solutions.sqlite'));
const diagrams = [
  ['060A0A', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 260" role="img" aria-label="Равнобедренная трапеция ABCD: высота CH и середина E диагонали BD">
    <style>text{font:16px Arial,sans-serif;fill:#182b49}.edge{stroke:#596b80;stroke-width:2;fill:none}.height{stroke:#b45126;stroke-width:3;fill:none}.dash{stroke-dasharray:6 5}.pt{fill:#087ea4}</style>
    <path class="edge" d="M55 205L385 205L275 80L165 80Z M55 205L275 80M165 80L385 205"/>
    <path class="height" d="M275 80V205"/><path class="edge dash" d="M165 80V205"/>
    <circle class="pt" cx="275" cy="142.5" r="4"/>
    <text x="42" y="224">A</text><text x="151" y="76">B</text><text x="279" y="76">C</text><text x="390" y="224">D</text><text x="281" y="224">H</text><text x="283" y="140">E</text>
    <text x="210" y="198">AD = 15</text><text x="200" y="70">BC = 5</text>
  </svg>`,
    'ABCD — равнобедренная трапеция; AD:BC=3:1. H∈AD, CH⊥AD; E — середина диагонали BD и E∈CH.'],
  ['F416AF', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 450 300" role="img" aria-label="Правильная треугольная призма: M и N на боковых рёбрах, G — центр тяжести треугольника CMN">
    <style>text{font:16px Arial,sans-serif;fill:#17365d}.edge{stroke:#52687a;stroke-width:2.2;fill:none}.sec{stroke:#087ea4;stroke-width:3;fill:#087ea425}.pt{fill:#087ea4}</style>
    <path class="edge" d="M80 230L330 230L205 130ZM80 80L330 80L205 10ZM80 230L80 80M330 230L330 80M205 130L205 10"/>
    <path class="sec" d="M80 118L330 118L205 130Z"/>
    <circle class="pt" cx="80" cy="118" r="4"/><circle class="pt" cx="330" cy="118" r="4"/><circle class="pt" cx="205" cy="130" r="4"/><circle class="pt" cx="205" cy="122" r="4"/>
    <text x="62" y="248">A</text><text x="337" y="248">B</text><text x="210" y="139">C</text><text x="57" y="76">A₁</text><text x="337" y="76">B₁</text><text x="210" y="10">C₁</text>
    <text x="61" y="113">M</text><text x="337" y="113">N</text><text x="211" y="118">G</text>
  </svg>`,
    'M∈AA₁ и N∈BB₁; G — центр тяжести треугольника CMN и лежит внутри него. Плоскость сечения проходит через C, M, N.']
];

const select = db.prepare('SELECT task_id FROM solutions WHERE task_id = ? AND published = 1');
const update = db.prepare('UPDATE solutions SET diagram_svg = ?, diagram_caption = ?, updated_at = ? WHERE task_id = ?');
db.exec('BEGIN');
try {
  for (const [taskId, diagramSvg, caption] of diagrams) {
    if (!select.get(taskId)) throw new Error(`Нет опубликованного решения ${taskId}`);
    update.run(diagramSvg, caption, new Date().toISOString(), taskId);
  }
  db.exec('COMMIT');
  console.log(`Исправлено схем: ${diagrams.length}`);
} catch (error) {
  db.exec('ROLLBACK');
  throw error;
}
