const assert = require('node:assert/strict');
const sources = require('./oge-physics-concepts-sources.json');
module.exports = prepared => {
  const rows=new Map(prepared.map(r=>[r.id,r]));let checked=0;
  const vocabulary={
    quantity:'скорость|удельная теплота плавления|давление|энергия|оптическая сила линзы|сила тока|работа силы|удельная теплоёмкость|электрическое напряжение|мощность|длина волны|масса|мощность излучения|объём|центростремительное ускорение|электрический заряд|сила трения скольжения|количество теплоты|сила тяжести|перемещение|внутренняя энергия|фокусное расстояние линзы',
    unit:'литр|гектопаскаль|кулон|диоптрия|ватт|миллиметр|килограмм|градус Цельсия|ампер|секунда|герц|ньютон|джоуль|минута|нанометр|миллиампер|километр|метр',
    instrument:'измерительный цилиндр|барометр|манометр|дозиметр|оптический микроскоп|амперметр|линейка|ртутный барометр|гальванометр|лупа|психрометр|призма|весы|индивидуальный дозиметр|динамометр|электронный секундомер|электроскоп|калориметр|спидометр|микроскоп|электрометр|телескоп',
    phenomenon:'конвекция|упругая деформация|дисперсия|всемирное тяготение|испарение|неупругая деформация|электризация|трение качения|взаимодействие молекул|отражение света|электрический ток|диффузия|конденсация|теплопередача|плавление|преломление света|ионизация|равномерное движение|механическое движение|диффузия газов|парообразование|испарение воды|естественная радиоактивность'
  };
  const categories=Object.fromEntries(Object.entries(vocabulary).flatMap(([cat,words])=>words.split('|').map(w=>[w,cat])));
  // Dimensional vectors in the independent basis kg, m, s, A, K.
  const dim={force:[1,1,-2,0,0],energy:[1,2,-2,0,0],power:[1,2,-3,0,0],mass:[1,0,0,0,0],length:[0,1,0,0,0],time:[0,0,1,0,0],current:[0,0,0,1,0]};
  const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]);
  dim.charge=add(dim.current,dim.time);dim.voltage=sub(dim.energy,dim.charge);dim.resistance=sub(dim.voltage,dim.current);dim.resistivity=add(dim.resistance,dim.length);dim.pressure=sub(dim.force,dim.length.map(v=>v*2));dim.volume=dim.length.map(v=>v*3);dim.speed=sub(dim.length,dim.time);dim.impulse=add(dim.mass,dim.speed);dim.specific=sub(dim.energy,dim.mass);dim.capacity=sub(dim.specific,[0,0,0,0,1]);dim.stiffness=sub(dim.force,dim.length);dim.frequency=dim.time.map(v=>-v);
  const quantities={
    'количество теплоты':'energy','мощность':'power','удельная теплота сгорания топлива':'specific','скорость':'speed','сила':'force','масса':'mass','сила тока':'current','сопротивление':'resistance','внутренняя энергия':'energy','удельная теплота плавления':'specific','удельная теплоёмкость':'capacity','атмосферное давление':'pressure','объём':'volume','плечо силы':'length','момент силы':'torque','электрическое напряжение':'voltage','электрический заряд':'charge','работа электрического тока':'energy','импульс тела':'impulse','работа':'energy','длина волны':'length','частота колебаний':'frequency','период колебаний':'time','удельное электрическое сопротивление':'resistivity','удельная теплота конденсации':'specific','жёсткость пружины':'stiffness','вес тела':'force',
    'мощность тока':'power','мощность электрического тока':'power','удельная теплоёмкость вещества':'capacity','электрическое сопротивление':'resistance','работа тока':'energy','работа силы':'energy','механическая работа':'energy'
  };
  dim.torque=add(dim.force,dim.length);
  const unitKinds={'джоуль':'energy','джоуль на килограмм':'specific','джоуль на килограмм – градус Цельсия':'capacity','джоуль на градус Цельсия':'whole-capacity','джоуль-килограмм':'energy-mass','ватт':'power','вольт':'voltage','ньютон':'force','паскаль':'pressure','килограмм':'mass','метр в секунду':'speed','ом':'resistance','ампер':'current','кубический метр':'volume','ньютон-метр':'torque','метр':'length','кулон':'charge','ньютон-секунда':'impulse','ньютон на метр':'stiffness','герц':'frequency','секунда':'time','ом-метр':'resistivity'};
  dim['whole-capacity']=sub(dim.energy,[0,0,0,0,1]);dim['energy-mass']=add(dim.energy,dim.mass);
  const definitionSelections={
    BB1221:[/инертность/,/взаимодействие тел/,/быстрота изменения скорости/],
    '246CE1':[/вектор, соединяющий начальное/,/быстроту изменения скорости/,/направление и быстроту перемещения/],
    '88CB6C':[/линия, по которой/,/мера инертности/,/вектор, соединяющий начальное/],
    '43324D':[/энергия движения тела/,/плотность водяного пара/,/энергия движения и взаимодействия/],
    '0A784C':[/какой объём занимает вещество заданной массы/,/коэффициент, который связывает силу/,/противоположно направлению относительного движения/],
    DC9046:[/энергия, которую получает или теряет/,/отношение.*количества теплоты к массе тела и изменению/,/отношение.*кристаллизации.*к массе/],
    '26520B':[/энергия движения тела/,/мера инертности/,/направление и быстроту перемещения/],
    A1B901:[/отношение.*сгорании топлива.*к массе/,/отношение.*количества теплоты к массе тела и изменению/,/отношение.*кристаллизации.*к массе/],
    '034E27':[/^сила тока$/,/^электрическое напряжение$/,/^электрический заряд$/],
    CA2DD9:[/направление и быстроту перемещения/,/быстроту изменения скорости/,/мера инертности/],
    FB4591:[/отношение заряда, прошедшего/,/отношению работы электрического поля/,/способность частиц или тел вступать/],
    '4A77E5':[/воздействие одного тела на другое/,/быстроту изменения скорости/,/мера инертности/],
    DE7FE0:[/^сила тока$/,/^электрическое сопротивление$/,/^удельное электрическое сопротивление вещества$/],
    '89293F':[/энергия, которую получает или теряет/,/отношение.*количества теплоты к массе тела и изменению/,/отношение.*плавления.*к массе/]
  };
  for(const [id,source] of Object.entries(sources)) {
    const row=rows.get(id);assert.ok(row,id);
    const text=source.fipiCondition.replace(/ А Б В(?: [1-7])+.*$/,'');
    const opts=[...text.matchAll(/(\d)\) (.*?)(?= \d\) |$)/g)].map(m=>({n:m[1],text:m[2].trim()}));assert.equal(opts.length,5,id);
    let expected;
    if(/ФИЗИЧЕСКИЕ ПОНЯТИЯ/.test(text)) {
      const letters=text.match(/А\) (.*?) Б\) (.*?) В\) (.*?) 1\)/).slice(1);
      expected=letters.map(label=>{
        const category=/единица/.test(label)?'unit':/явление/.test(label)?'phenomenon':/прибор/.test(label)?'instrument':'quantity';
        const candidates=opts.filter(o=>categories[o.text]===category);assert.equal(candidates.length,1,id+': '+category);return candidates[0].n;
      }).join('');
    } else if(/ЕДИНИЦЫ/.test(text)) {
      const labels=text.match(/А\) (.*?) Б\) (.*?) В\) (.*?) 1\)/).slice(1);
      expected=labels.map(label=>{
        const kind=quantities[label];assert.ok(kind,label);
        const candidates=opts.filter(o=>{
          const name=o.text.split(' (')[0];const k=unitKinds[name];
          // Non-SI alternatives (litres, km/h, mmHg) intentionally excluded.
          if(!k)return false;
          if(kind==='torque'||kind==='energy')return kind===k;
          return JSON.stringify(dim[k])===JSON.stringify(dim[kind]);
        });assert.equal(candidates.length,1,id+': '+label);return candidates[0].n;
      }).join('');
    } else {
      const patterns=definitionSelections[source.sourceId];assert.ok(patterns,id);
      expected=patterns.map(p=>{const candidates=opts.filter(o=>p.test(o.text));assert.equal(candidates.length,1,id+': '+p);return candidates[0].n;}).join('');
    }
    assert.equal(row.answer,expected,id);checked++;
  }
  assert.equal(checked,62);
};
