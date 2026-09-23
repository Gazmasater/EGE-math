const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync('storage/solutions.sqlite');
const now = new Date().toISOString();
const sourceImagePath = path.join(
  __dirname,
  '..',
  'fipi-assets',
  'docs',
  'BA1F39653304A5B041B656915DC36B38',
  'questions',
  'F31C39C7D3029891488E0CD648F34DBB(copy2)',
  'xs3qstsrcF31C39C7D3029891488E0CD648F34DBB_1_1548163485.png'
);
const sourceImage = fs.readFileSync(sourceImagePath).toString('base64');

const diagramSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 660 480" role="img" aria-label="Исходная схема ФИПИ с железным шаром у гладкой стенки и силами, действующими на шар">
  <defs>
    <marker id="force-arrow-6AB9E6" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="#c62828"/></marker>
    <marker id="axis-arrow-6AB9E6" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#183153"/></marker>
  </defs>
  <rect x="18" y="14" width="382" height="452" rx="10" fill="#f8fafc" stroke="#b8c5d1" stroke-width="2"/>
  <text x="42" y="48" fill="#183153" font-family="Arial, sans-serif" font-size="20" font-weight="700">Исходная геометрия ФИПИ и силы</text>
  <image x="80" y="20" width="261" height="429" href="data:image/png;base64,${sourceImage}"/>

  <!-- Все силы изображены на шаре; сила натяжения направлена вдоль нити через его центр. -->
  <line x1="195" y1="320" x2="137" y2="220" stroke="#c62828" stroke-width="5" marker-end="url(#force-arrow-6AB9E6)"/>
  <text x="118" y="252" fill="#c62828" font-family="Arial, sans-serif" font-size="23" font-weight="700">T</text>
  <line x1="195" y1="320" x2="195" y2="208" stroke="#c62828" stroke-width="5" marker-end="url(#force-arrow-6AB9E6)"/>
  <text x="208" y="215" fill="#c62828" font-family="Arial, sans-serif" font-size="23" font-weight="700">F<tspan baseline-shift="sub" font-size="70%">А</tspan></text>
  <line x1="195" y1="320" x2="195" y2="434" stroke="#c62828" stroke-width="5" marker-end="url(#force-arrow-6AB9E6)"/>
  <text x="208" y="430" fill="#c62828" font-family="Arial, sans-serif" font-size="23" font-weight="700">mg</text>
  <line x1="93" y1="320" x2="174" y2="320" stroke="#c62828" stroke-width="5" marker-end="url(#force-arrow-6AB9E6)"/>
  <text x="106" y="304" fill="#c62828" font-family="Arial, sans-serif" font-size="23" font-weight="700">N</text>

  <rect x="420" y="126" width="218" height="292" rx="10" fill="#f8fafc" stroke="#b8c5d1" stroke-width="2"/>
  <text x="442" y="160" fill="#183153" font-family="Arial, sans-serif" font-size="20" font-weight="700">Оси и направления</text>
  <line x1="480" y1="356" x2="590" y2="356" stroke="#183153" stroke-width="4" marker-end="url(#axis-arrow-6AB9E6)"/>
  <line x1="480" y1="356" x2="480" y2="216" stroke="#183153" stroke-width="4" marker-end="url(#axis-arrow-6AB9E6)"/>
  <text x="465" y="380" fill="#183153" font-family="Arial, sans-serif" font-size="21">O</text>
  <text x="596" y="362" fill="#183153" font-family="Arial, sans-serif" font-size="21">Ox</text>
  <text x="490" y="218" fill="#183153" font-family="Arial, sans-serif" font-size="21">Oy</text>
  <text x="442" y="404" fill="#526273" font-family="Arial, sans-serif" font-size="17">Ox — вправо, Oy — вверх</text>
</svg>`;

const record = {
  taskId: '6AB9E6',
  answer: '25 Н',
  solution: `Рассмотрим железный шар в системе отсчёта, связанной со стенкой сосуда; она инерциальна. Ось Ox направим горизонтально вправо, ось Oy — вертикально вверх.

На шар действуют: сила тяжести mg, направленная вниз и приложенная в центре шара; сила Архимеда F_А, направленная вверх и приложенная в центре вытесненного объёма; сила натяжения нити T, направленная вдоль нити вверх и влево; реакция гладкой стенки N, направленная вправо в точке контакта. Трения нет. Шар покоится, поэтому линия действия силы натяжения проходит через центр шара: иначе появился бы ненулевой момент силы T.

Условие равновесия шара в проекциях на выбранные оси:
N−T·sin α=0,
T·cos α+F_А−mg=0.

По закону Архимеда и по формуле плотности:
F_А=ρ_водыgV,
V=⟦m¦ρ_железа⟧.

Следовательно, общая формула для модуля натяжения нити имеет вид
T=⟦mg−F_А¦cos α⟧=⟦mg(1−⟦ρ_воды¦ρ_железа⟧)¦cos α⟧.

Подставим численные данные отдельно. Сила Архимеда равна
F_А=1000 кг·м⁻³·10 м·с⁻²·⟦2,5 кг¦7800 кг·м⁻³⟧=3,2 Н.

Тогда
T=⟦2,5 кг·10 м·с⁻²−3,2 Н¦cos 30°⟧=25,2 Н≈25 Н.

Размерность силы Архимеда проверяется так: кг·м⁻³·м·с⁻²·м³=кг·м·с⁻²=Н. Проверка равновесия по Oy: 25,2 Н·cos 30°+3,2 Н=25 Н=mg. По третьему закону Ньютона шар действует на нить с силой того же модуля, что и нить на шар.

Ответ: 25 Н.`,
  diagramSvg,
  diagramCaption: 'Исходная схема ФИПИ: на шар действуют сила Архимеда, натяжение нити, реакция гладкой стенки и сила тяжести.'
};

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

save.run(record.taskId, record.answer, record.solution, record.diagramSvg, record.diagramCaption, now, now);
console.log(`Опубликовано решение ${record.taskId}.`);
