const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync(path.join(__dirname, '..', 'storage', 'solutions.sqlite'));
const now = new Date().toISOString();
const records = {
  '418761': {
    answer: '0,35',
    solution: `Рассмотрим систему в инерциальной системе отсчёта, связанной со столом. Нити невесомы и нерастяжимы, поэтому натяжение каждой нити постоянно по всей её длине.

1. Груз массой m неподвижен. По второму закону Ньютона в вертикальном направлении: T₂ − mg = 0, поэтому T₂ = mg.

2. Брусок находится на границе опрокидывания, когда сила реакции стола приложена в точке A. Для равновесия моментов относительно A: T₁·AB = Mg·AB·⟦1¦2⟧. Следовательно, T₁ = Mg·⟦1¦2⟧.

3. Для невесомого блока без трения в оси сумма моментов сил относительно его оси равна нулю: T₁·r = T₂·R.

Подставим найденные натяжения: (Mg·⟦1¦2⟧)·r = mg·R. После сокращения g и M получаем ⟦m¦M⟧ = ⟦r¦2R⟧ = 7·⟦1¦2·10⟧ = 0,35.

Ответ: 0,35.`
  }
};

const save = db.prepare(`INSERT INTO solutions (task_id, answer, solution, diagram_svg, diagram_caption, published, created_at, updated_at)
  VALUES (?, ?, ?, '', '', 1, ?, ?)
  ON CONFLICT(task_id) DO UPDATE SET answer=excluded.answer, solution=excluded.solution, published=1, updated_at=excluded.updated_at`);
for (const [taskId, record] of Object.entries(records)) save.run(taskId, record.answer, record.solution, now, now);
console.log(`Опубликовано решений по физике: ${Object.keys(records).length}`);
