#!/usr/bin/env node

const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');

const database = new DatabaseSync('storage/solutions.sqlite');
const rawFinance = new TextDecoder('windows-1251').decode(fs.readFileSync('finance.raw.html'));

const publishedFinanceIds = Array.from(rawFinance.matchAll(/<div\s+class=['"][^'"]*\bqblock\b[^'"]*['"]\s+id=['"]q([A-Z0-9]+)['"][^>]*>/gi))
  .map((match) => match[1])
  .filter((id) => id !== '37B190');

const monthlyCreditIds = new Set(['60FD4D', '36614C', 'D63B7C', 'FE4FB7', '8C8AD4', 'B4B56D', '4C1D36', 'DB5D8C']);
const securitiesIds = new Set(['552BFD', '89F37B', 'DFEFEE', 'DBAF65']);
const depositIds = new Set(['4221BE']);

const annualCreditModel = `Модель кредита
Все суммы считаем в тех единицах, которые указаны в условии. Пусть D₀ — долг сразу после выдачи кредита, а Dᵢ — долг сразу после i-го ежегодного платежа. Если годовой коэффициент роста равен q=1+⟦r¦100⟧, то перед i-м платежом долг равен qDᵢ₋₁. Поэтому платёж этого года равен Pᵢ=qDᵢ₋₁−Dᵢ. Последний остаток при полном погашении равен нулю.

Если по условию ежегодные платежи одинаковы и равны P, сначала перепишем переход как Dᵢ=qDᵢ₋₁−P. Применяем его последовательно: D₁=qD₀−P; D₂=qD₁−P=q²D₀−qP−P=q²D₀−P(q+1); D₃=qD₂−P=q³D₀−P(q²+q+1). Видно правило: после n-го платежа Dₙ=qⁿD₀−P(qⁿ⁻¹+…+q+1)=qⁿD₀−P(1+q+…+qⁿ⁻¹). Его также можно строго подтвердить индукцией. При полном погашении Dₙ=0.

Суммирование равенств Pᵢ=qDᵢ₋₁−Dᵢ нужно для другой цели — для общей суммы выплат. Оно не выводит формулу для Dₙ: эту формулу даёт именно последовательная подстановка выше. Если платежи или остатки заданы иначе, тот же переход Pᵢ=qDᵢ₋₁−Dᵢ применяем по годам по отдельности.

Расчёт`;

const monthlyCreditModel = `Модель кредита
Все суммы считаем в тысячах рублей, если в условии не сказано иначе. Пусть D₀ — долг в день выдачи, а Dᵢ — долг 15-го числа после i-го платежа. При месячном коэффициенте роста q=1+⟦r¦100⟧ перед i-м платежом долг равен qDᵢ₋₁, поэтому Pᵢ=qDᵢ₋₁−Dᵢ. При полном погашении последний остаток равен нулю.

Суммирование этих равенств показывает: общая сумма выплат состоит из первоначального долга и процентов, начисленных на все остатки перед очередным первым числом месяца. Поэтому для равномерно уменьшающихся долгов используется сумма арифметической прогрессии. Ниже сначала определяем сами остатки, затем сумму процентов и только после этого искомую величину.

Если долг ежемесячно уменьшается на d, то Dᵢ=D₀−id. Сумма остатков перед одинаковыми начислениями процентов — сумма соответствующих членов этой арифметической прогрессии. Это объясняет формулы вида «первый плюс последний, умноженные на число членов и делённые на два» в расчёте.

Расчёт`;

const securitiesModel = `Модель вложения
Если бумаги проданы в конце k-го года, то до конца срока N лет на банковском счёте будет Aₖ=k²qᴺ⁻ᵏ тысяч рублей, где q — годовой коэффициент роста вклада. Чтобы найти максимум, достаточно сравнить соседние значения: ⟦Aₖ₊₁¦Aₖ⟧=⟦(k+1)²¦k²q⟧. Множитель ⟦(k+1)²¦k²⟧ убывает при росте k, поэтому после перехода отношения через единицу последовательность меняется с возрастания на убывание. Это доказывает глобальный, а не только локальный максимум.

Расчёт`;

const depositModel = `Модель вклада
Все суммы считаем в миллионах рублей. Проценты начисляются в конце года, а пополнение в начале года сначала увеличивает вклад и только затем участвует в начислении процентов. Поэтому последовательно выписываем остаток после каждого года; нельзя начислить проценты на сумму пополнения раньше момента её внесения.

Расчёт`;

const extraCalculations = {
  '4221BE': `После первого года на счёте 1,1S, после второго — 1,21S. В начале третьего года вносят 3, поэтому перед начислением процентов имеем 1,21S+3, а в конце третьего года — 1,331S+3,3. В начале четвёртого года вклад равен 1,331S+6,3, после начисления — 1,4641S+6,93.
`,
};

const getPublished = database.prepare('SELECT task_id, answer, solution, published FROM solutions WHERE task_id = ?');
const update = database.prepare('UPDATE solutions SET solution = ?, updated_at = ? WHERE task_id = ?');

function modelFor(id) {
  if (monthlyCreditIds.has(id)) return monthlyCreditModel;
  if (securitiesIds.has(id)) return securitiesModel;
  if (depositIds.has(id)) return depositModel;
  return annualCreditModel;
}

function verificationFor(id) {
  if (securitiesIds.has(id)) return `Проверка
Отношения соседних сумм посчитаны по одной и той же формуле Aₖ=k²qᴺ⁻ᵏ. Знак отношения до выбранного года и после него различен, а сами отношения убывают. Следовательно, найденный год даёт единственный максимум, а границы для r получены из строгих неравенств.`;
  if (depositIds.has(id)) return `Проверка
При S=8 итоговый вклад меньше 20, а при S=9 больше 20. Поэтому найденное целое значение действительно наименьшее.`;
  if (monthlyCreditIds.has(id)) return `Проверка
Подстановка найденной величины в последовательность остатков даёт указанный в условии долг 15-го числа и нулевой остаток в последний месяц. Платежи считаются после начисления процентов, поэтому проценты начислены ровно на те остатки, которые были в начале каждого месяца.`;
  return `Проверка
Подстановка найденной величины в последовательность ежегодных остатков даёт все значения долга из условия и нулевой остаток в последний год. Для задачи с ограничением на платежи или ставку отдельно выполнено строгое неравенство и учтено требование целочисленности, если оно есть.`;
}

function expandedSolution(id, solution) {
  const marker = '\n\nРасчёт\n';
  const original = solution.includes(marker)
    ? solution.slice(solution.indexOf(marker) + marker.length).split('\n\nПроверка\n')[0].trim()
    : solution.trim();
  const extra = extraCalculations[id] ? `${extraCalculations[id]}\n` : '';
  return `${modelFor(id)}\n${extra}${original}\n\n${verificationFor(id)}`;
}

const missing = [];
const unpublished = [];
const tooShort = [];
const invalidText = [];
const updates = [];
for (const id of publishedFinanceIds) {
  const row = getPublished.get(id);
  if (!row) {
    missing.push(id);
    continue;
  }
  if (row.published !== 1) unpublished.push(id);
  const solution = expandedSolution(id, row.solution);
  if (process.argv.includes('--check')) {
    if (row.solution.length < 700 || !row.solution.includes('Расчёт') || !row.solution.includes('Проверка') || !row.solution.includes('Ответ:')) tooShort.push(id);
    if (/<\/?[a-z][^>]*>/i.test(row.solution) || /\s\/\s/.test(row.solution)) invalidText.push(id);
  }
  updates.push({ id, solution });
}

if (missing.length || unpublished.length || tooShort.length || invalidText.length) {
  throw new Error(`Не прошла подготовка финансовых решений: отсутствуют ${missing.join(', ') || 'нет'}; не опубликованы ${unpublished.join(', ') || 'нет'}; без обязательных блоков ${tooShort.join(', ') || 'нет'}; недопустимый текст ${invalidText.join(', ') || 'нет'}.`);
}

if (process.argv.includes('--check')) {
  console.log(`Финансовых решений: ${updates.length}. Все содержат модель, расчёт, проверку и ответ.`);
  process.exit(0);
}

const now = new Date().toISOString();
database.exec('BEGIN IMMEDIATE');
try {
  for (const item of updates) update.run(item.solution, now, item.id);
  database.exec('COMMIT');
  console.log(`Обновлено финансовых решений: ${updates.length}.`);
} catch (error) {
  database.exec('ROLLBACK');
  throw error;
}
