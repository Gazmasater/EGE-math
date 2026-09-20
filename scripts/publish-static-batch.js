const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('storage/solutions.sqlite');
const now = new Date().toISOString();
const marker = '<defs><marker id="a" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8z" fill="#c62828"/></marker></defs>';
const records = {
  A48FB7: {
    answer: '867 кг·м⁻³',
    solution: 'Ось Oy направим вверх. На шар действуют сила тяжести mg вниз и силы Архимеда Fкер и Fв вверх: Fкер — со стороны керосина, Fв — со стороны воды. Равновесие: Fкер + Fв − mg = 0. При погружении ⟦2¦3⟧V в керосин и ⟦1¦3⟧V в воду: ρкер g⟦2¦3⟧V + ρв g⟦1¦3⟧V = ρш gV. Отсюда ρш = 800·⟦2¦3⟧ + 1000·⟦1¦3⟧ = 866,7 кг·м⁻³ ≈ 867 кг·м⁻³. Ответ: 867 кг·м⁻³.',
    caption: 'Шар в керосине и воде: Fкер, Fв и mg',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 300">${marker}<rect x="20" y="20" width="220" height="260" fill="#fff4d6" stroke="#333" stroke-width="3"/><rect x="23" y="130" width="214" height="147" fill="#dceeff"/><line x1="23" y1="130" x2="237" y2="130" stroke="#286090" stroke-width="3"/><circle cx="130" cy="115" r="55" fill="#fff" stroke="#222" stroke-width="3"/><text x="35" y="52">керосин</text><text x="35" y="265">вода</text><line x1="100" y1="95" x2="100" y2="35" stroke="#c62828" stroke-width="4" marker-end="url(#a)"/><text x="38" y="88" fill="#c62828">Fкер</text><line x1="160" y1="150" x2="160" y2="90" stroke="#c62828" stroke-width="4" marker-end="url(#a)"/><text x="170" y="94" fill="#c62828">Fв</text><line x1="130" y1="115" x2="130" y2="220" stroke="#c62828" stroke-width="4" marker-end="url(#a)"/><text x="140" y="215" fill="#c62828">mg</text><line x1="320" y1="230" x2="320" y2="70" stroke="#183153" stroke-width="3" marker-end="url(#a)"/><text x="330" y="80">Oy</text></svg>`
  },
  DB692A: {
    answer: '800 кг·м⁻³',
    solution: 'Ось Oy направим вверх. На шар действуют mg вниз, сила Архимеда FА вверх и реакция дна N вверх. Для равновесия: N + FА − mg = 0. По условию N = 6 Н, m = 1,6 кг, поэтому FА = mg − N = 1,6·10 − 6 = 10 Н. Погружена половина объёма, значит FА = ρводы gV⟦1¦2⟧. Тогда V = ⟦2FА¦ρводы g⟧ = ⟦2·10¦1000·10⟧ = 0,002 м³. Плотность дерева ρ = ⟦m¦V⟧ = ⟦1,6¦0,002⟧ = 800 кг·м⁻³. Ответ: 800 кг·м⁻³.',
    caption: 'Шар у дна сосуда: N, FА и mg',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 300">${marker}<rect x="30" y="35" width="210" height="240" fill="#dceeff" stroke="#333" stroke-width="3"/><circle cx="135" cy="175" r="55" fill="#d5a46b" stroke="#222" stroke-width="3"/><line x1="100" y1="135" x2="100" y2="75" stroke="#c62828" stroke-width="4" marker-end="url(#a)"/><text x="45" y="72" fill="#c62828">FА</text><line x1="170" y1="215" x2="170" y2="270" stroke="#c62828" stroke-width="4" marker-end="url(#a)"/><text x="180" y="265" fill="#c62828">mg</text><line x1="135" y1="230" x2="135" y2="185" stroke="#c62828" stroke-width="4" marker-end="url(#a)"/><text x="145" y="190" fill="#c62828">N</text><text x="315" y="70">Oy</text><line x1="310" y1="230" x2="310" y2="80" stroke="#183153" stroke-width="3" marker-end="url(#a)"/></svg>`
  },
  '62CDEC': {
    answer: 'увеличится на 0,9 Н',
    solution: 'Рассмотрим тяжёлое тело. В жидкости на него действуют mg вниз, сила Архимеда FА вверх и натяжение нити T вверх. Равновесие: T + FА − mg = 0, поэтому Tжидк = mg − FА. После выливания жидкости FА = 0, и Tвозд = mg. Следовательно, изменение натяжения ΔT = Tвозд − Tжидк = FА. По закону Архимеда FА = ρж gV = 900·10·100·10⁻⁶ = 0,9 Н. Значит, натяжение нити увеличится на 0,9 Н. Ответ: увеличится на 0,9 Н.',
    caption: 'Система с блоком и пружиной: T, FА и mg',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 300">${marker}<circle cx="210" cy="80" r="30" fill="#fff" stroke="#222" stroke-width="3"/><line x1="80" y1="80" x2="180" y2="80" stroke="#222" stroke-width="3"/><line x1="240" y1="80" x2="320" y2="80" stroke="#222" stroke-width="3"/><rect x="55" y="80" width="50" height="60" fill="#d5a46b" stroke="#222" stroke-width="3"/><path d="M320 80v120q0 25 20 25q20 0 20-25V80" fill="none" stroke="#222" stroke-width="3"/><line x1="80" y1="110" x2="80" y2="55" stroke="#c62828" stroke-width="4" marker-end="url(#a)"/><text x="88" y="60" fill="#c62828">T</text><line x1="80" y1="140" x2="80" y2="205" stroke="#c62828" stroke-width="4" marker-end="url(#a)"/><text x="88" y="200" fill="#c62828">mg</text><line x1="105" y1="105" x2="105" y2="55" stroke="#c62828" stroke-width="4" marker-end="url(#a)"/><text x="112" y="58" fill="#c62828">FА</text><text x="270" y="270">пружина</text></svg>`
  }
};
const save = db.prepare('INSERT INTO solutions (task_id,answer,solution,diagram_svg,diagram_caption,published,created_at,updated_at) VALUES (?,?,?,?,?,1,?,?) ON CONFLICT(task_id) DO UPDATE SET answer=excluded.answer,solution=excluded.solution,diagram_svg=excluded.diagram_svg,diagram_caption=excluded.diagram_caption,published=1,updated_at=excluded.updated_at');
for (const [id, r] of Object.entries(records)) save.run(id, r.answer, r.solution, r.svg, r.caption, now, now);
console.log(`Опубликовано решений: ${Object.keys(records).length}`);
