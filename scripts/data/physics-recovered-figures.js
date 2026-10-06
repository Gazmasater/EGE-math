const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const {C, txt, arrow, cards, svg} = require('../lib/physics-svg');
const figure = require('../../lib/physics-condition-figures.json')['13442E'];
const image = fs.readFileSync(path.join(__dirname, '../../fipi-assets', figure.asset));
const solution = [
  'Рассматриваем установившийся постоянный ток в неподвижной цепи. Сопротивления проводов и внутреннее сопротивление аккумулятора считаем нулевыми. Положительное направление тока во внешней цепи выберем от амперметра через резистор к лампе; напряжения U₀ и U понимаем как положительные показания. При смене полярности направления токов поменяются, но найденные сопротивление и потребляемая мощность останутся положительными. Механические силы и оси перемещения для этой задачи не требуются.',
  'Идеальный вольтметр имеет бесконечно большое сопротивление, поэтому ток через него равен нулю. Идеальный амперметр имеет нулевое сопротивление, и падение напряжения на нём равно нулю. Следовательно через резистор и лампу проходит один и тот же ток I, измеряемый амперметром.',
  'По схеме оба вывода вольтметра соединены с выводами лампы. Он показывает напряжение именно на лампе: U_л=U. Обозначим напряжение на резисторе U_R. Для последовательного соединения сумма падений напряжения равна напряжению аккумулятора: U₀=U_R+U_л. Отсюда U_R=U₀−U. Для работающей цепи с положительными сопротивлениями 0<U<U₀ и I>0.',
  'А) По закону Ома для резистора U_R=IR, поэтому R=⟦U_R¦I⟧. Подставляем U_R=U₀−U: R=⟦U₀−U¦I⟧. Это формула 2. Размерность: В·А⁻¹=Ом. Формула 1, R=⟦U¦I⟧, определяла бы сопротивление лампы в данном рабочем состоянии.',
  'Б) Работа электрического поля при переносе заряда Δq через резистор равна ΔA=U_R·Δq. Мощность P_R=⟦ΔA¦Δt⟧, а I=⟦Δq¦Δt⟧, поэтому P_R=U_R·I. Подставляем найденное напряжение: P_R=(U₀−U)I. Это формула 3. Размерность: В·А=Вт. Формула 4, P=UI, даёт мощность лампы, поскольку U измерено на ней.',
  'Проверка. Подставим сопротивление обратно в закон Ома: IR=I·⟦U₀−U¦I⟧=U₀−U; добавляя напряжение лампы U, получаем U₀. Мощность аккумулятора равна сумме мощностей потребителей: P_R+P_л=(U₀−U)I+UI=U₀I. Все мощности неотрицательны. Например, при U₀=12 В, U=4 В и I=0,5 А сначала U_R=U₀−U=12 В−4 В=8 В; затем R=⟦U_R¦I⟧=⟦8 В¦0,5 А⟧=16 Ом, P_R=U_R·I=8 В·0,5 А=4 Вт. Мощность лампы равна 2 Вт, а аккумулятора 6 Вт: баланс выполняется.',
  'В порядке А, Б получаем 2, 3. Ответ: 23.'
].join('\n\n');
const caption = 'Вольтметр измеряет напряжение лампы U. На резисторе U_R=U₀−U; R=(U₀−U)·I⁻¹; P_R=(U₀−U)I. Ответ: 23.';
let body = txt(40,83,'Вольтметр подключён параллельно лампе',C.gray,20);
body += `<image data-user-provided-source="${figure.asset}" x="60" y="115" width="560" height="369.51" href="data:image/svg+xml;base64,${image.toString('base64')}"/>`;
body += txt(224,443,'R',C.blue,22,'middle');
body += arrow(93,192,0,61,C.blue,'I',[16,0]);
const stages = cards([
  ['Напряжение резистора','U_R = U₀ − U; ток через резистор равен I.'],
  ['А — сопротивление','R = (U₀ − U)·I⁻¹. Выбираем формулу 2.'],
  ['Б — мощность','P_R = (U₀ − U)I. Выбираем формулу 3.']
], 520);
const records = [{id:'13442E', answer:'23', solution, diagram_caption:caption,
  diagram_svg:svg('13442E','Резистор и идеальные приборы',caption,body+stages.body,stages.end+18)}];

function verifyPhysics() {
  assert.equal(createHash('sha256').update(image).digest('hex'), figure.assetSha256);
  assert.equal(records[0].answer, '23');
  for (const R of [2,7,16]) for (const lampResistance of [3,9]) for (const I of [.25,.5,2]) {
    const U=I*lampResistance, U0=I*(R+lampResistance), power=I*I*R;
    const options=[U/I,(U0-U)/I,(U0-U)*I,U*I];
    assert.ok(Math.abs(options[1]-R)<1e-10);
    assert.ok(Math.abs(options[2]-power)<1e-10);
    assert.ok(Math.abs(options[2]+U*I-U0*I)<1e-10);
    assert.ok(Math.abs(I*options[1]+U-U0)<1e-10);
    assert.notEqual(options[0],R);
    assert.notEqual(options[3],power);
  }
  return true;
}

module.exports={records,verifyPhysics};
