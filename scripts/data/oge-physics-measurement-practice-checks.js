const assert = require('node:assert/strict');
const sources = require('./oge-physics-measurement-practice-sources.json');

module.exports = prepared => {
  const answer = id => prepared.find(r => r.id === id).answer;
  // Select the numbered principles from the primary conditions, independently
  // of the device cards and answer pairs used to compose the solutions.
  const principle = device => {
    if (/шлюз/i.test(device)) return /сообщающихся сосуд/;
    if (/поршневой/i.test(device)) return /действие атмосферного давления/;
    if (/пресс/i.test(device)) return /передача давления внутри жидкости/;
    if (/анероид/i.test(device)) return /деформации тела от действующей/;
    if (/манометр/i.test(device)) return /гидростатического давления от высоты/;
    if (/термометр/i.test(device)) return /расширение жидкостей при нагревании/;
    if (/психрометр/i.test(device)) return /температуры жидкости при её испарении/;
    if (/весы/i.test(device)) return /равновесия рычага/;
    if (/динамометр/i.test(device)) return /силы упругости от (?:степени )?деформации/;
    if (/высотомер/i.test(device)) return /атмосферного давления (?:при подъёме|от высоты)/;
    if (/гальванометр/i.test(device)) return /проводник с током в магнитном поле/;
    throw new Error('Unknown primary device: '+device);
  };
  let pairs = 0;
  for (const [id, source] of Object.entries(sources)) {
    const condition = source.fipiCondition;
    if (!condition.includes('Установите соответствие')) continue;
    const devices = condition.match(/А\) (.*?) Б\) (.*?) 1\)/);
    assert.ok(devices, id);
    const options = [...condition.matchAll(/([1-4])\) (.*?)(?= [1-4]\)| А Б|$)/g)];
    const result = devices.slice(1).map(device => {
      const found = options.filter(option => principle(device).test(option[2]));
      assert.equal(found.length, 1, id+': unique primary principle');
      return found[0][1];
    }).join('');
    assert.equal(answer(id), result, id+': device order and primary numbering');
    pairs++;
  }
  assert.equal(pairs, 13);

  const near = (a,b) => assert.ok(Math.abs(a-b)<1e-10, `${a} ≈ ${b}`);
  // Independently inspected primary scale: ten spaces between marked values.
  const pressureStep = (101-100)/10, pressure = 100+7*pressureStep;
  near(pressure, 100.7); near(pressureStep*1000, 100);
  const pressureOptions = [[750,5,1],[755,1,1],[107,1,1000],[100.7,.1,1000]];
  const selectedPressure = pressureOptions.findIndex(([p,e,unit]) =>
    Math.abs(p*unit-pressure*1000)<1e-8 && Math.abs(e*unit-pressureStep*1000)<1e-8)+1;
  assert.equal(answer('OGEPHYSC8D1F0'), String(selectedPressure));
  const forceStep = (5-4)/10, force = 4+8*forceStep, error = forceStep/2;
  near(force,4.8);near(error,.05);near(force-error,4.75);near(force+error,4.85);
  const forceOptions = [[4.8,null],[4.8,.05],[4.8,.1],[4.8,.2]];
  assert.equal(answer('OGEPHYSCD6F35'), String(forceOptions.findIndex(([p,e]) => p===force && e===error)+1));
};
