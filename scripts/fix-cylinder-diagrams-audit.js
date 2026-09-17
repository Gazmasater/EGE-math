const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const db = new DatabaseSync(path.join(__dirname, '..', 'storage', 'solutions.sqlite'));

function cylinderSvg({ includeB1, includeO, showBC1 }) {
  const bGenerator = includeB1 ? '<path class="edge" d="M157.5 112.3L157.5 252.3"/>' : '';
  const topChord = includeB1 ? '<path class="line" d="M157.5 112.3L360 82"/>' : '';
  const bc1 = showBC1 ? '<path class="aux" d="M157.5 252.3L360 82"/>' : '';
  const b1Point = includeB1 ? '<circle class="pt" cx="157.5" cy="112.3" r="4"/><text x="137" y="105">B₁</text>' : '';
  const center = includeO ? '<circle class="center" cx="225" cy="222" r="3.5"/><text x="213" y="216">O</text>' : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 450 300" role="img" aria-label="Схема цилиндра с точками A, B, C нижнего основания и соответствующими точками верхнего основания">
  <style>
    text{font:16px Arial,sans-serif;fill:#17365d}.edge{stroke:#52687a;stroke-width:2;fill:none}.base{stroke:#40566d;stroke-width:2.4;fill:none}.line{stroke:#087ea4;stroke-width:3;fill:none}.aux{stroke:#087ea4;stroke-width:2;stroke-dasharray:6 5;fill:none}.dash{stroke-dasharray:6 5}.pt{fill:#087ea4}.center{fill:#52687a}
  </style>
  <ellipse class="edge" cx="225" cy="82" rx="135" ry="35"/>
  <path class="edge" d="M90 82L90 222M360 82L360 222"/>
  <path class="edge" d="M90 222C90 268 360 268 360 222"/>
  <path class="edge dash" d="M90 222C90 176 360 176 360 222"/>
  <path class="base" d="M90 222L157.5 252.3L360 222L90 222"/>
  ${bGenerator}
  ${topChord}
  <path class="line" d="M90 222L360 82"/>
  ${bc1}
  <circle class="pt" cx="90" cy="222" r="4"/><circle class="pt" cx="157.5" cy="252.3" r="4"/>
  <circle class="pt" cx="360" cy="222" r="4"/><circle class="pt" cx="360" cy="82" r="4"/>
  ${b1Point}${center}
  <text x="76" y="244">A</text><text x="143" y="274">B</text><text x="366" y="244">C</text><text x="366" y="75">C₁</text>
</svg>`;
}

const diagrams = [
  ['13D60B', cylinderSvg({ includeB1: true, includeO: true, showBC1: true }),
    'A, B, C∈ нижней окружности; AC — диаметр. B₁, C₁∈ верхней окружности; BB₁ и CC₁ — образующие. O — центр нижнего основания; AC₁ пересекает ось цилиндра.'],
  ['416B0F', cylinderSvg({ includeB1: true, includeO: true, showBC1: true }),
    'A, B, C∈ нижней окружности; AC — диаметр. B₁, C₁∈ верхней окружности; BB₁ и CC₁ — образующие. O — центр нижнего основания; AC₁ пересекает ось цилиндра.'],
  ['77C190', cylinderSvg({ includeB1: true, includeO: false, showBC1: true }),
    'A, B, C∈ нижней окружности; AC — диаметр. B₁, C₁∈ верхней окружности; BB₁ и CC₁ — образующие. Показаны AC₁ и BC₁.'],
  ['8EBB9F', cylinderSvg({ includeB1: true, includeO: false, showBC1: true }),
    'A, B, C∈ нижней окружности; AC — диаметр. B₁, C₁∈ верхней окружности; BB₁ и CC₁ — образующие. Показаны AC₁ и BC₁.'],
  ['E8FAA5', cylinderSvg({ includeB1: false, includeO: false, showBC1: false }),
    'A, B, C∈ нижней окружности; AC — диаметр. C₁∈ верхней окружности; CC₁ — образующая. Показаны AC₁ и BC.']
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
  console.log(`Исправлено схем цилиндров: ${diagrams.length}`);
} catch (error) {
  db.exec('ROLLBACK');
  throw error;
}
