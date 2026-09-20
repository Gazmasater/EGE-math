const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const taskId = '418761';
const answer = '0,35';
const solution = `Рассмотрим равновесие каждого тела. Система отсчёта, связанная со столом, инерциальна. Все тела неподвижны, поэтому их линейные и угловые ускорения равны нулю.

1. Брусок.

На брусок действуют сила тяжести Mg, направленная вниз и приложенная в его середине, сила натяжения F₁, направленная вверх и приложенная в точке B, и сила реакции стола N, направленная вверх. Трения нет, так как поверхность стола гладкая.

При максимально допустимой массе груза брусок находится на грани опрокидывания: равнодействующая реакции стола приложена у левого конца A. Запишем условие равновесия моментов относительно точки A:

F₁L=Mg·⟦L¦2⟧,

откуда

F₁=⟦Mg¦2⟧.

Условие равновесия бруска по вертикали имеет вид

N+F₁−Mg=0,

поэтому на пределе N=⟦Mg¦2⟧. Реакция не обращается в нуль: при дальнейшем увеличении массы груза поднимается конец B, а брусок начинает поворачиваться вокруг точки A.

2. Составной блок.

На меньший диск действует сила натяжения F₁ с плечом r, а на больший диск — сила натяжения F₂ с плечом R. Эти силы вращают блок в противоположных направлениях. Поскольку блок неподвижен, сумма моментов относительно оси O равна нулю:

F₁r−F₂R=0.

Сила со стороны оси F₀ проходит через O и момента относительно оси не создаёт. Условие равновесия блока по вертикали: F₀−F₁−F₂=0.

3. Груз.

На груз действуют сила тяжести mg вниз и сила натяжения F₂ вверх. Груз неподвижен, следовательно,

F₂−mg=0,

F₂=mg.

Подставим F₁=⟦Mg¦2⟧ и F₂=mg в условие равновесия моментов блока:

⟦Mg¦2⟧·r=mgR.

После сокращения на g получаем

⟦m¦M⟧=⟦r¦2R⟧=⟦7¦2·10⟧=0,35.

Ответ: 0,35.`;

const diagramSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 420" role="img" aria-label="Схемы сил для бруска, составного блока и груза">
  <defs><marker id="arrow-418761" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="context-stroke"/></marker></defs>
  <style>.panel{fill:#f8fafc;stroke:#b8c5d1;stroke-width:2}.body{fill:#dce8f2;stroke:#263746;stroke-width:3}.force{stroke-width:5;marker-end:url(#arrow-418761)}.label{font:700 24px Arial,sans-serif;fill:#172633}.note{font:18px Arial,sans-serif;fill:#405466}</style>
  <rect class="panel" x="10" y="10" width="440" height="400" rx="14"/><rect class="panel" x="465" y="10" width="285" height="400" rx="14"/><rect class="panel" x="765" y="10" width="185" height="400" rx="14"/>
  <text class="label" x="30" y="45">1. Брусок</text><line x1="50" y1="280" x2="420" y2="280" stroke="#687b8c" stroke-width="3"/><rect class="body" x="80" y="230" width="320" height="45"/><text class="note" x="225" y="259">M</text>
  <line class="force" x1="90" y1="230" x2="90" y2="145" stroke="#17865f"/><text class="label" x="103" y="165">N</text>
  <line class="force" x1="240" y1="250" x2="240" y2="345" stroke="#9b5500"/><text class="label" x="253" y="342">Mg</text>
  <line class="force" x1="400" y1="230" x2="400" y2="145" stroke="#c9362b"/><text class="label" x="365" y="135">F₁</text>
  <text class="note" x="70" y="305">A</text><text class="note" x="394" y="305">B</text>
  <text class="label" x="485" y="45">2. Составной блок</text><circle class="body" cx="607" cy="205" r="91"/><circle cx="607" cy="205" r="58" fill="#f8fafc" stroke="#263746" stroke-width="3"/><circle cx="607" cy="205" r="6" fill="#263746"/>
  <line class="force" x1="607" y1="205" x2="607" y2="85" stroke="#17865f"/><text class="label" x="620" y="102">F₀</text>
  <line class="force" x1="549" y1="205" x2="549" y2="335" stroke="#c9362b"/><text class="label" x="505" y="350">F₁</text>
  <line class="force" x1="698" y1="205" x2="698" y2="335" stroke="#2864bd"/><text class="label" x="705" y="350">F₂</text>
  <text class="note" x="565" y="198">r</text><text class="note" x="655" y="198">R</text><text class="note" x="618" y="225">O</text>
  <text class="label" x="785" y="45">3. Груз</text><rect class="body" x="825" y="190" width="65" height="85"/><text class="note" x="850" y="240">m</text>
  <line class="force" x1="857" y1="190" x2="857" y2="100" stroke="#2864bd"/><text class="label" x="870" y="120">F₂</text>
  <line class="force" x1="857" y1="275" x2="857" y2="365" stroke="#9b5500"/><text class="label" x="870" y="358">mg</text>
</svg>`;
const diagramCaption = 'Силы F₁ и F₂ — натяжения двух нитей; F₀ — сила со стороны оси блока.';

if (solution.includes('/')) throw new Error('В решении обнаружена косая черта вместо вертикальной дроби.');

const databaseFile = path.join(__dirname, '..', 'storage', 'solutions.sqlite');
const db = new DatabaseSync(databaseFile);
const now = new Date().toISOString();
const save = db.prepare(`
  INSERT INTO solutions (task_id, answer, solution, diagram_svg, diagram_caption, published, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, 1, ?, ?)
  ON CONFLICT(task_id) DO UPDATE SET
    answer = excluded.answer,
    solution = excluded.solution,
    diagram_svg = excluded.diagram_svg,
    diagram_caption = excluded.diagram_caption,
    published = 1,
    updated_at = excluded.updated_at
`);

const result = save.run(taskId, answer, solution, diagramSvg, diagramCaption, now, now);
const published = db.prepare(`
  SELECT task_id, answer, solution, diagram_svg, published
  FROM solutions
  WHERE task_id = ?
`).get(taskId);

if (!published || published.published !== 1 || published.answer !== answer || published.solution !== solution || published.diagram_svg !== diagramSvg) {
  throw new Error(`Не удалось опубликовать решение ${taskId}.`);
}

console.log(JSON.stringify({ taskId, changes: result.changes, answer, published: true }));
