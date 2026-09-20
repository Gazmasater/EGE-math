const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync(path.join(__dirname, '..', 'storage', 'solutions.sqlite'));
const now = new Date().toISOString();
const records = {
  '418761': {
    answer: '0,35',
    diagramSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 300" role="img" aria-label="Схема сил для бруска, груза и блока"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#183153"/></marker></defs><rect x="55" y="170" width="300" height="42" fill="#d9e8f5" stroke="#183153" stroke-width="2"/><line x1="45" y1="212" x2="390" y2="212" stroke="#183153" stroke-width="3"/><text x="62" y="195" font-family="Arial" font-size="18">брусок M</text><circle cx="455" cy="100" r="48" fill="#fff" stroke="#183153" stroke-width="2"/><circle cx="455" cy="100" r="30" fill="none" stroke="#526273" stroke-width="2"/><line x1="355" y1="190" x2="455" y2="130" stroke="#183153" stroke-width="2"/><line x1="503" y1="100" x2="600" y2="100" stroke="#183153" stroke-width="2"/><rect x="580" y="100" width="42" height="80" fill="#f0b429" stroke="#183153" stroke-width="2"/><text x="586" y="205" font-family="Arial" font-size="18">m</text><line x1="180" y1="170" x2="180" y2="125" stroke="#183153" stroke-width="2" marker-end="url(#arrow)"/><text x="187" y="130" font-family="Arial" font-size="16">N</text><line x1="250" y1="212" x2="250" y2="260" stroke="#183153" stroke-width="2" marker-end="url(#arrow)"/><text x="258" y="258" font-family="Arial" font-size="16">Mg</text><line x1="355" y1="190" x2="310" y2="190" stroke="#183153" stroke-width="2" marker-end="url(#arrow)"/><text x="305" y="180" font-family="Arial" font-size="16">T₁</text><line x1="600" y1="100" x2="600" y2="55" stroke="#183153" stroke-width="2" marker-end="url(#arrow)"/><text x="610" y="62" font-family="Arial" font-size="16">T₂</text><line x1="80" y1="245" x2="140" y2="245" stroke="#183153" stroke-width="2" marker-end="url(#arrow)"/><text x="145" y="250" font-family="Arial" font-size="16">x</text><line x1="80" y1="245" x2="80" y2="220" stroke="#183153" stroke-width="2" marker-end="url(#arrow)"/><text x="70" y="220" font-family="Arial" font-size="16">y</text></svg>',
    solution: `Рассмотрим систему в инерциальной системе отсчёта, связанной со столом. Нити невесомы и нерастяжимы, поэтому натяжение каждой нити постоянно по всей её длине.

Выберем ось Ox горизонтально вправо, а ось Oy вертикально вверх. На брусок действуют сила тяжести Mg, реакция стола N и натяжение нити T₁. На груз действуют сила тяжести mg и натяжение T₂. На блок действуют натяжения T₁ и T₂ и реакция оси. Схема этих сил и осей приведена выше.

1. Груз массой m неподвижен. По второму закону Ньютона в вертикальном направлении: T₂ − mg = 0, поэтому T₂ = mg.

2. Брусок находится на границе опрокидывания, когда сила реакции стола приложена в точке A. Для равновесия моментов относительно A: T₁·AB = Mg·AB·⟦1¦2⟧. Следовательно, T₁ = Mg·⟦1¦2⟧.

3. Для невесомого блока без трения в оси сумма моментов сил относительно его оси равна нулю: T₁·r = T₂·R.

Подставим найденные натяжения: (Mg·⟦1¦2⟧)·r = mg·R. После сокращения g и M получаем ⟦m¦M⟧ = ⟦r¦2R⟧ = 7·⟦1¦2·10⟧ = 0,35.

Ответ: 0,35.`
  }
};
for (const record of Object.values(records)) {
  record.diagramSvg = record.diagramSvg.replace('</svg>', '<line x1="600" y1="180" x2="600" y2="225" stroke="#183153" stroke-width="2" marker-end="url(#arrow)"/><text x="610" y="222" font-family="Arial" font-size="16">mg</text></svg>');
}

const save = db.prepare(`INSERT INTO solutions (task_id, answer, solution, diagram_svg, diagram_caption, published, created_at, updated_at)
  VALUES (?, ?, ?, '', '', 1, ?, ?)
  ON CONFLICT(task_id) DO UPDATE SET answer=excluded.answer, solution=excluded.solution, diagram_svg=excluded.diagram_svg, diagram_caption=excluded.diagram_caption, published=1, updated_at=excluded.updated_at`);
const saveWithDiagram = db.prepare(`INSERT INTO solutions (task_id, answer, solution, diagram_svg, diagram_caption, published, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, 1, ?, ?)
  ON CONFLICT(task_id) DO UPDATE SET answer=excluded.answer, solution=excluded.solution, diagram_svg=excluded.diagram_svg, diagram_caption=excluded.diagram_caption, published=1, updated_at=excluded.updated_at`);
for (const [taskId, record] of Object.entries(records)) saveWithDiagram.run(taskId, record.answer, record.solution, record.diagramSvg || '', 'Силы и оси координат', now, now);
console.log(`Опубликовано решений по физике: ${Object.keys(records).length}`);
