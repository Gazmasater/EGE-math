'use strict';

// Read-only by default; use --db for preview and --apply after review.
const assert = require('node:assert/strict');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { readMathematicsCatalog } = require('./lib/mathematics-catalog');

const taskId = 'C84642';
const marker = 'б) Способ 2. Геометрическое решение через площадь треугольника';
const previousAddition = `${marker}

Рассмотрим треугольник ABC₁. Как установлено выше, угол ABC прямой, AB=BC=2√3, AC=2√6.

Докажем, что AB⊥BC₁. Образующая CC₁ перпендикулярна плоскости основания ABC, поэтому проекцией наклонной BC₁ на эту плоскость является отрезок BC. Прямая AB лежит в плоскости основания и перпендикулярна BC. По теореме о трёх перпендикулярах AB⊥BC₁. Значит, треугольник ABC₁ прямоугольный с прямым углом B.

Найдём его стороны. В прямоугольном треугольнике BCC₁ по теореме Пифагора:
BC₁²=BC²+CC₁²=(2√3)²+(2√6)²=12+24=36,
BC₁=6.
Аналогично, из прямоугольного треугольника ACC₁:
AC₁²=AC²+CC₁²=24+24=48,
AC₁=4√3.

Опустим из B перпендикуляр BH на гипотенузу AC₁, где H — основание перпендикуляра. По определению искомое расстояние от точки B до прямой AC₁ равно BH.

Вычислим площадь треугольника ABC₁ двумя способами: через его катеты и через гипотенузу с проведённой к ней высотой:
S=⟦AB·BC₁¦2⟧=⟦AC₁·BH¦2⟧.
Следовательно,
BH=⟦AB·BC₁¦AC₁⟧=⟦2√3·6¦4√3⟧=3.

Проверка: площадь через катеты равна 6√3; через гипотенузу и найденную высоту получаем ⟦4√3·3¦2⟧=6√3. Оба способа дают одинаковую площадь и тот же ответ, что и координатное решение.

Ответ к пункту б: 3.`;
const attribution = 'Второе решение добавлено по просьбе посетителя сайта.';
const addition = previousAddition + '\n\n' + attribution;

const args = process.argv.slice(2);
const dbIndex = args.indexOf('--db');
assert.ok(dbIndex < 0 || args[dbIndex + 1], 'Missing --db path');
const filename = path.resolve(dbIndex < 0 ? path.join(__dirname, '../storage/solutions.sqlite') : args[dbIndex + 1]);
const apply = args.includes('--apply');
const task = readMathematicsCatalog().get(taskId);
assert.equal(task.sourceHash, '3712cfa63f3ab52c289b1a8a7617b52fdb8c8b8c0730d7e73388140eeed8c8d1', 'Primary condition changed');

// Independent coordinate check of the geometric height and its foot.
const r = Math.sqrt(6), A = [-r, 0, 0], B = [0, r, 0], C1 = [r, 0, 2*r];
const dot = (a, b) => a.reduce((s, x, i) => s + x*b[i], 0);
const sub = (a, b) => a.map((x, i) => x-b[i]);
const AB = sub(B, A), BC1 = sub(C1, B), AC1 = sub(C1, A);
const near = (a, b) => assert.ok(Math.abs(a-b) < 1e-10, `${a} != ${b}`);
near(dot(AB, BC1), 0);
near(dot(BC1, BC1), 36);
near(dot(AC1, AC1), 48);
const t = dot(AB, AC1) / dot(AC1, AC1);
near(t, 0.25);
const H = A.map((x, i) => x+t*AC1[i]), BH = sub(H, B);
near(dot(BH, AC1), 0);
near(dot(BH, BH), 9);
near(Math.sqrt(dot(AB, AB)*dot(BC1, BC1)/dot(AC1, AC1)), 3);
assert.ok(!addition.includes('/') && !addition.includes('<'));

const db = new DatabaseSync(filename, { readOnly: !apply });
try {
  if (apply) db.exec('BEGIN IMMEDIATE');
  const row = db.prepare('SELECT * FROM solutions WHERE task_id=?').get(taskId);
  assert.equal(row?.published, 1);
  assert.equal(row.answer, '3');
  let solution = row.solution;
  if (!solution.includes(marker)) {
    const startA = 'Выберем координаты:', startB = 'Найдём расстояние от B до прямой AC₁.';
    assert.ok(solution.includes(startA) && solution.includes(startB), 'Original methods changed');
    solution = solution.replace(startA, `а) Угол между прямыми\n\n${startA}`)
      .replace(startB, `б) Способ 1. Координатное решение\n\n${startB}`) + '\n\n' + addition;
  } else if (solution.endsWith(previousAddition)) {
    solution += '\n\n' + attribution;
  } else {
    assert.ok(solution.endsWith(addition), 'Alternative solution differs; review before rewriting');
  }
  const changed = solution !== row.solution;
  if (apply && changed) {
    const result = db.prepare('UPDATE solutions SET solution=?, updated_at=? WHERE task_id=?').run(solution, new Date().toISOString(), taskId);
    assert.equal(result.changes, 1);
  }
  if (apply) db.exec('COMMIT');
  console.log(JSON.stringify({ taskId, apply, changed, answer: row.answer, geometryChecks: 'ok' }));
} catch (error) {
  if (apply) db.exec('ROLLBACK');
  throw error;
} finally {
  db.close();
}
