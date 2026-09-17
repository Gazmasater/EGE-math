const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const db = new DatabaseSync(path.join(__dirname, '..', 'storage', 'solutions.sqlite'));
const taskId = 'D7147A';
const diagramSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 450 300" role="img" aria-label="Цилиндр: A, B, C лежат на нижнем основании, B1 и C1 — соответствующие точки верхнего основания">
  <style>
    text{font:16px Arial,sans-serif;fill:#17365d}.edge{stroke:#52687a;stroke-width:2;fill:none}.base{stroke:#40566d;stroke-width:2.4;fill:none}.line{stroke:#087ea4;stroke-width:3;fill:none}.aux{stroke:#087ea4;stroke-width:2;stroke-dasharray:6 5;fill:none}.dash{stroke-dasharray:6 5}.pt{fill:#087ea4}
  </style>
  <ellipse class="edge" cx="225" cy="82" rx="135" ry="35"/>
  <path class="edge" d="M90 82L90 222M360 82L360 222"/>
  <path class="edge" d="M90 222C90 268 360 268 360 222"/>
  <path class="edge dash" d="M90 222C90 176 360 176 360 222"/>
  <path class="base" d="M90 222L157.5 252.3L360 222L90 222"/>
  <path class="edge" d="M157.5 112.3L157.5 252.3"/>
  <path class="line" d="M157.5 112.3L360 82M90 222L360 82"/>
  <path class="aux" d="M90 222L157.5 112.3"/>
  <circle class="pt" cx="90" cy="222" r="4"/>
  <circle class="pt" cx="157.5" cy="252.3" r="4"/>
  <circle class="pt" cx="360" cy="222" r="4"/>
  <circle class="pt" cx="157.5" cy="112.3" r="4"/>
  <circle class="pt" cx="360" cy="82" r="4"/>
  <text x="76" y="244">A</text><text x="143" y="274">B</text><text x="366" y="244">C</text>
  <text x="137" y="105">B₁</text><text x="366" y="75">C₁</text>
</svg>`;
const caption = 'A, B, C∈ нижней окружности; AC — диаметр, ∠ACB=30°. B₁, C₁∈ верхней окружности; BB₁ и CC₁ — образующие. Показаны AB, BC, B₁C₁, AB₁ и AC₁.';

const row = db.prepare('SELECT task_id FROM solutions WHERE task_id = ? AND published = 1').get(taskId);
if (!row) throw new Error(`Нет опубликованного решения ${taskId}`);
db.prepare('UPDATE solutions SET diagram_svg = ?, diagram_caption = ?, updated_at = ? WHERE task_id = ?')
  .run(diagramSvg, caption, new Date().toISOString(), taskId);
console.log(`Схема ${taskId} исправлена`);
