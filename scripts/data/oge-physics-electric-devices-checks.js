const assert = require('node:assert/strict');
const sources = require('./oge-physics-electric-devices-sources.json');

module.exports = prepared => {
  const rows = new Map(prepared.map(r=>[r.id,r]));
  const expected = {
    '30C5F8':[/взаимодействие электрических зарядов/,/взаимодействие проводника/],
    '601D73':[/преломление света/,/тепловое действие/],
    'E63C19':[/зависимость силы, действующ/,/зависимость силы отталкивания/],
    'CC9E29':[/взаимодействие проводника/,/взаимодействие постоянных магнитов/],
    'D511D0':[/зависимость сопротивления проводника от его длины/,/зависимость силы, действующ/],
    '3BEEA5':[/электромагнитная индукция/,/действие магнитного поля/],
    '435097':[/преломление света/,/тепловое действие/],
    '5E553B':[/зависимость сопротивления проводника от его длины/,/зависимость силы отталкивания/],
    '94F69D':[/взаимодействие постоянных магнитов/,/тепловое действие/],
    '99D548':[/электрометр/,/вольтметр/],
    '37DFF1':[/электрометр/,/ваттметр/],
    '30D7B4':[/вольтметр/,/омметр/],
    'B92A26':[/электрометр/,/амперметр/],
    'A9B82C':[/амперметр/,/вольтметр/],
    'CD5D5D':[/электрометр/,/омметр/],
    '4473B2':[/индивидуальный дозиметр/,/спектрометр/],
    'F75EE1':[/спектроскоп/,/камера Вильсона/]
  };
  // Parse option numbers from the primary text, so changes in their ordering
  // cannot silently preserve an obsolete answer code.
  for (const [id,patterns] of Object.entries(expected)) {
    const text=sources['OGEPHYS'+id].fipiCondition;
    const options=[...text.matchAll(/([1-4])\)\s*([\s\S]*?)(?=\s+[1-4]\)|$)/g)].map(m=>({n:m[1],label:m[2]}));
    const code=patterns.map(pattern=>{const matches=options.filter(o=>pattern.test(o.label));assert.equal(matches.length,1,id);return matches[0].n;}).join('');
    assert.equal(rows.get('OGEPHYS'+id).answer,code,id);
  }
  for(const [id,range,ticks] of [['E0C149',3,14],['0DB6B1',6,24]]) {
    const delta=range/30,U=ticks*delta;
    const options=[...sources['OGEPHYS'+id].fipiCondition.matchAll(/([1-4])\)\s*\((\d+,\d+) ± (\d+,\d+)\) В/g)];
    assert.equal(options.length,4);
    const valid=options.filter(m=>Math.abs(Number(m[2].replace(',','.'))-U)<1e-12&&Math.abs(Number(m[3].replace(',','.'))-delta)<1e-12);
    assert.equal(valid.length,1);assert.equal(rows.get('OGEPHYS'+id).answer,valid[0][1]);
    assert.ok(U-delta>=0&&U+delta<=range);
  }
  assert.equal(Object.keys(sources).length,19);
};
