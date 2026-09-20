const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const taskId = '418761';
const answer = '0,35';
const solution = `Рассмотрим равновесие каждого тела. Система отсчёта, связанная со столом, инерциальна. Все тела неподвижны, поэтому их линейные и угловые ускорения равны нулю.

1. Брусок.

На брусок действуют сила тяжести Mg, направленная вниз и приложенная в его середине, сила натяжения T₁, направленная вверх и приложенная в точке B, и сила реакции стола N, направленная вверх. Трения нет, так как поверхность стола гладкая.

При максимально допустимой массе груза брусок находится на грани опрокидывания: равнодействующая реакции стола приложена у левого конца A. Запишем условие равновесия моментов относительно точки A:

T₁L=Mg·⟦L¦2⟧,

откуда

T₁=⟦Mg¦2⟧.

Условие равновесия бруска по вертикали имеет вид

N+T₁−Mg=0,

поэтому на пределе N=⟦Mg¦2⟧. Реакция не обращается в нуль: при дальнейшем увеличении массы груза поднимается конец B, а брусок начинает поворачиваться вокруг точки A.

2. Составной блок.

На меньший диск действует сила натяжения T₁ с плечом r, а на больший диск — сила натяжения T₂ с плечом R. Эти силы вращают блок в противоположных направлениях. Поскольку блок неподвижен, сумма моментов относительно оси O равна нулю:

T₁r−T₂R=0.

Сила со стороны оси F₀ проходит через O и момента относительно оси не создаёт. Условие равновесия блока по вертикали: F₀−T₁−T₂=0.

3. Груз.

На груз действуют сила тяжести mg вниз и сила натяжения T₂ вверх. Груз неподвижен, следовательно,

T₂−mg=0,

T₂=mg.

Подставим T₁=⟦Mg¦2⟧ и T₂=mg в условие равновесия моментов блока:

⟦Mg¦2⟧·r=mgR.

После сокращения на g получаем

⟦m¦M⟧=⟦r¦2R⟧=⟦7¦2·10⟧=0,35.

Ответ: 0,35.`;

if (solution.includes('/')) throw new Error('В решении обнаружена косая черта вместо вертикальной дроби.');

const databaseFile = path.join(__dirname, '..', 'storage', 'solutions.sqlite');
const db = new DatabaseSync(databaseFile);
const now = new Date().toISOString();
const save = db.prepare(`
  INSERT INTO solutions (task_id, answer, solution, diagram_svg, diagram_caption, published, created_at, updated_at)
  VALUES (?, ?, ?, '', '', 1, ?, ?)
  ON CONFLICT(task_id) DO UPDATE SET
    answer = excluded.answer,
    solution = excluded.solution,
    published = 1,
    updated_at = excluded.updated_at
`);

const result = save.run(taskId, answer, solution, now, now);
const published = db.prepare(`
  SELECT task_id, answer, solution, published
  FROM solutions
  WHERE task_id = ?
`).get(taskId);

if (!published || published.published !== 1 || published.answer !== answer || published.solution !== solution) {
  throw new Error(`Не удалось опубликовать решение ${taskId}.`);
}

console.log(JSON.stringify({ taskId, changes: result.changes, answer, published: true }));
