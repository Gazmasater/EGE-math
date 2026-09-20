const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('storage/solutions.sqlite');
const solution = 'Ось Oy направим вверх. На шар действуют mg вниз и силы Архимеда F₁ и F₂ вверх. Равновесие: F₁ + F₂ − mg = 0. По закону Архимеда: ρв g⟦1¦4⟧V + ρкер g⟦3¦4⟧V = ρш gV, где ρв — плотность воды, ρкер — плотность керосина, ρш — плотность материала шара. Поэтому ρш = ρв⟦1¦4⟧ + ρкер⟦3¦4⟧ = 1000·⟦1¦4⟧ + 800·⟦3¦4⟧ = 850 кг·м⁻³. Ответ: 850 кг·м⁻³.';
db.prepare("UPDATE solutions SET solution=?, answer='850 кг·м⁻³', updated_at=? WHERE task_id='29960D'").run(solution, new Date().toISOString());
console.log('Обновлены обозначения плотностей 29960D');
