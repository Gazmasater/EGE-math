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
  'E4DED5A9BFB1975A4BD24B77A0D578E7(copy5)',
  'xs3qstsrcE4DED5A9BFB1975A4BD24B77A0D578E7_9_1669966628.png'
);
const sourceImage = fs.readFileSync(sourceImagePath).toString('base64');

const diagramSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 820 560" role="img" aria-label="Исходная схема ФИПИ со стержнем в гладком стакане и силами, действующими на стержень">
  <defs>
    <marker id="force-arrow-7018C7" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="#c62828"/></marker>
    <marker id="axis-arrow-7018C7" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#183153"/></marker>
  </defs>
  <rect x="28" y="24" width="392" height="512" rx="10" fill="#f8fafc" stroke="#b8c5d1" stroke-width="2"/>
  <text x="52" y="58" fill="#183153" font-family="Arial, sans-serif" font-size="20" font-weight="700">Исходная геометрия ФИПИ и силы</text>
  <image x="60" y="70" width="339" height="384" href="data:image/png;base64,${sourceImage}"/>

  <!-- A — нижний конец палочки, B — верхний. Силы N_д и N_л приложены в A. -->
  <text x="126" y="480" fill="#183153" font-family="Arial, sans-serif" font-size="20" font-weight="700">A</text>
  <text x="405" y="92" fill="#183153" font-family="Arial, sans-serif" font-size="20" font-weight="700">B</text>
  <line x1="391" y1="100" x2="278" y2="100" stroke="#c62828" stroke-width="5" marker-end="url(#force-arrow-7018C7)"/>
  <text x="303" y="88" fill="#c62828" font-family="Arial, sans-serif" font-size="23" font-weight="700">N</text>
  <line x1="222" y1="346" x2="222" y2="263" stroke="#c62828" stroke-width="5" marker-end="url(#force-arrow-7018C7)"/>
  <text x="232" y="274" fill="#c62828" font-family="Arial, sans-serif" font-size="23" font-weight="700">F<tspan baseline-shift="sub" font-size="70%">А</tspan></text>
  <line x1="273" y1="274" x2="273" y2="372" stroke="#c62828" stroke-width="5" marker-end="url(#force-arrow-7018C7)"/>
  <text x="284" y="362" fill="#c62828" font-family="Arial, sans-serif" font-size="23" font-weight="700">mg</text>
  <line x1="147" y1="448" x2="147" y2="368" stroke="#c62828" stroke-width="5" marker-end="url(#force-arrow-7018C7)"/>
  <text x="158" y="386" fill="#c62828" font-family="Arial, sans-serif" font-size="21" font-weight="700">N<tspan baseline-shift="sub" font-size="70%">д</tspan></text>
  <line x1="147" y1="448" x2="236" y2="448" stroke="#c62828" stroke-width="5" marker-end="url(#force-arrow-7018C7)"/>
  <text x="183" y="438" fill="#c62828" font-family="Arial, sans-serif" font-size="21" font-weight="700">N<tspan baseline-shift="sub" font-size="70%">л</tspan></text>

  <rect x="458" y="132" width="324" height="292" rx="10" fill="#f8fafc" stroke="#b8c5d1" stroke-width="2"/>
  <text x="483" y="168" fill="#183153" font-family="Arial, sans-serif" font-size="20" font-weight="700">Оси и точки приложения</text>
  <line x1="525" y1="357" x2="694" y2="357" stroke="#183153" stroke-width="4" marker-end="url(#axis-arrow-7018C7)"/>
  <line x1="525" y1="357" x2="525" y2="202" stroke="#183153" stroke-width="4" marker-end="url(#axis-arrow-7018C7)"/>
  <text x="509" y="382" fill="#183153" font-family="Arial, sans-serif" font-size="21">A</text>
  <text x="701" y="363" fill="#183153" font-family="Arial, sans-serif" font-size="21">Ox</text>
  <text x="535" y="204" fill="#183153" font-family="Arial, sans-serif" font-size="21">Oy</text>
  <text x="483" y="401" fill="#526273" font-family="Arial, sans-serif" font-size="17">Ox — вправо, Oy — вверх</text>
  <text x="483" y="250" fill="#526273" font-family="Arial, sans-serif" font-size="17">N — в B, к центру стакана</text>
  <text x="483" y="278" fill="#526273" font-family="Arial, sans-serif" font-size="17">F<tspan baseline-shift="sub" font-size="70%">А</tspan> — в центре погружённой части</text>
  <text x="483" y="306" fill="#526273" font-family="Arial, sans-serif" font-size="17">mg — в центре палочки</text>
  <text x="483" y="334" fill="#526273" font-family="Arial, sans-serif" font-size="17">N<tspan baseline-shift="sub" font-size="70%">д</tspan>, N<tspan baseline-shift="sub" font-size="70%">л</tspan> — в A</text>
</svg>`;

const record = {
  taskId: '7018C7',
  answer: '4 см',
  solution: `Обозначим нижний конец палочки через A, верхний — через B, а высоту точки B над дном — через H. Рассматриваем палочку в системе отсчёта, связанной с Землёй; она инерциальна. Начало координат поместим в A, ось Ox направим вправо, ось Oy — вверх.

Палочка покоится и моделируется абсолютно твёрдым телом, поэтому сумма сил и сумма моментов сил относительно точки A равны нулю. Стакан гладкий: трения нет. На палочку действуют реакция правой стенки N в точке B, направленная влево; реакции дна N_д и левой стенки N_л в точке A, направленные соответственно вверх и вправо; сила тяжести mg, приложенная в центре палочки и направленная вниз; сила Архимеда F_А, направленная вверх и приложенная в центре погружённой части палочки. Жидкость покоится, а погружённая часть палочки вытесняет её объём, поэтому к ней применим закон Архимеда. По третьему закону Ньютона модуль N равен модулю силы, с которой палочка давит на правую стенку.

Из геометрии прямоугольного треугольника AВ:
H=√(l²−(2R)²).
Подставим численные данные отдельно:
H=√((0,10 м)²−(2·0,04 м)²)=0,06 м.

Пусть l_погр и V_погр — длина и объём погружённой части, V — объём всей палочки. Так как палочка тонкая и имеет постоянное сечение,
⟦l_погр¦l⟧=⟦V_погр¦V⟧=⟦h¦H⟧,
V_погр=⟦hV¦H⟧.

Общая формула силы Архимеда:
F_А=ρ_жидкостиgV_погр=⟦ρ_жидкости¦ρ_палочки⟧mg·⟦h¦H⟧=0,75mg·⟦h¦H⟧.
Сила F_А приложена к середине погружённой части. Её плечо относительно A равно
d_А=⟦l_погр¦2⟧cos α=⟦R h¦H⟧,
так как cos α=⟦2R¦l⟧.

Выберем положительным направление моментов против часовой стрелки. Силы N_д и N_л проходят через A и не создают момента. Условие равновесия по моментам имеет вид
NH+F_А·⟦R h¦H⟧−mgR=0.
Отсюда общая формула для реакции верхней стенки:
N=⟦mgR¦H⟧(1−⟦ρ_жидкости¦ρ_палочки⟧(⟦h¦H⟧)²).

Подставим численные данные отдельно:
0,008 Н=⟦0,0018 кг·10 м·с⁻²·0,04 м¦0,06 м⟧(1−0,75(⟦h¦0,06 м⟧)²)=0,012 Н(1−0,75(⟦h¦0,06 м⟧)²).
Следовательно,
1−⟦0,008 Н¦0,012 Н⟧=⟦1¦3⟧,
0,75(⟦h¦0,06 м⟧)²=⟦1¦3⟧,
(⟦h¦0,06 м⟧)²=⟦4¦9⟧,
h=⟦2¦3⟧·0,06 м=0,04 м=4 см.

Проверим результат. При найденной высоте
F_А=0,75·0,0018 кг·10 м·с⁻²·⟦0,04 м¦0,06 м⟧=0,009 Н.
Из равновесия по Oy получаем N_д=mg−F_А=0,009 Н>0, а по Ox: N_л=N=0,008 Н>0; оба контакта действительно сохраняются. Проверка моментов:
0,008 Н·0,06 м+0,009 Н·0,04 м·⟦0,04 м¦0,06 м⟧=0,00072 Н·м=0,018 Н·0,04 м.
Размерность формулы для N: (кг·м·с⁻²)·м·м⁻¹=кг·м·с⁻²=Н. Кроме того, 4 см<6 см=H, поэтому палочка погружена лишь частично, как принято в решении.

Ответ: 4 см.`,
  diagramSvg,
  diagramCaption: 'Исходная схема ФИПИ: палочка AB; N — реакция правой стенки в B, N₍д₎ и N₍л₎ — реакции дна и левой стенки в A; F₍А₎ и mg приложены к указанным центрам.'
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
