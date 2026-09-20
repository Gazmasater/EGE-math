const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync(path.join(__dirname, '..', 'storage', 'solutions.sqlite'));
const solution = 'Ось Oy направим вверх. На шар действуют mg вниз и силы Архимеда F₁ и F₂ вверх. Равновесие: F₁+F₂−mg=0. По закону Архимеда: ρводы g⟦1¦4⟧V + ρкеросина g⟦3¦4⟧V = ρшара gV. Поэтому ρшара=1000·⟦1¦4⟧+800·⟦3¦4⟧=850 кг·м⁻³. Ответ: 850 кг·м⁻³.';
const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 180"><circle cx="150" cy="80" r="35" fill="#fff" stroke="#183153"/><path d="M150 80V25M150 80v70" stroke="#c62828" stroke-width="2"/><text x="160" y="30">F₁+F₂</text><text x="160" y="150">mg</text><path d="M20 120h260" stroke="#286090"/><text x="25" y="115">керосин</text><text x="25" y="170">вода</text></svg>';
const now = new Date().toISOString();
db.prepare('INSERT INTO solutions (task_id,answer,solution,diagram_svg,diagram_caption,published,created_at,updated_at) VALUES (?,?,?,?,?,1,?,?) ON CONFLICT(task_id) DO UPDATE SET answer=excluded.answer,solution=excluded.solution,diagram_svg=excluded.diagram_svg,diagram_caption=excluded.diagram_caption,published=1,updated_at=excluded.updated_at').run('29960D', '850 кг·м⁻³', solution, svg, 'Силы Архимеда и сила тяжести', now, now);
console.log('Опубликовано решение 29960D');
