const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('storage/solutions.sqlite');
const solution = 'Ось Oy направим вверх. На шар действуют сила тяжести mg вниз и силы Архимеда Fкер и Fв вверх: Fкер действует со стороны керосина, Fв — со стороны воды. Условие равновесия: Fкер + Fв − mg = 0. По закону Архимеда: Fкер = ρ_кер g⟦3¦4⟧V, Fв = ρ_в g⟦1¦4⟧V, поэтому ρ_кер g⟦3¦4⟧V + ρ_в g⟦1¦4⟧V = ρ_ш gV, где ρ_в — плотность воды, ρ_кер — плотность керосина, ρ_ш — плотность материала шара. Сокращая gV, получаем ρ_ш = ρ_кер⟦3¦4⟧ + ρ_в⟦1¦4⟧ = 800·⟦3¦4⟧ + 1000·⟦1¦4⟧ = 850 кг·м⁻³. Ответ: 850 кг·м⁻³.';
db.prepare("UPDATE solutions SET solution=?, answer='850 кг·м⁻³', updated_at=? WHERE task_id='29960D'").run(solution, new Date().toISOString());
console.log('Обновлены обозначения плотностей 29960D');
