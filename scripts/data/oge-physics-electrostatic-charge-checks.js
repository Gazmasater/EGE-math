const assert=require('node:assert/strict');
const sources=require('./oge-physics-electrostatic-charge-sources.json');
const models=require('./oge-physics-electrostatic-charge-models.json');
module.exports=prepared=>{
 const rows=new Map(prepared.map(r=>[r.id.slice(7),r]));let checked=0;
 const select=(id,re)=>{
  const c=sources['OGEPHYS'+id].fipiCondition;
  const matches=[...c.matchAll(/(\d)\)\s*([\s\S]*?)(?=\s\d\)|$)/g)].filter(m=>re.test(m[2]));
  assert.equal(matches.length,1,id+': physical choice '+re);return matches[0][1];
 };
 const code=delta=>delta>0?'1':delta<0?'2':'3';
 for(const [id,m]of Object.entries(models)){
  const r=rows.get(id),condition=sources['OGEPHYS'+id].fipiCondition;assert.ok(r,id);checked++;
  if(m.kind==='transfer'){
   const negative=condition.includes('приобрела отрицательный заряд');
   const deltaRod=negative?17:-17,deltaCloth=-deltaRod;
   const initial=100,qRod=initial-(initial+deltaRod),qCloth=initial-(initial+deltaCloth);
   assert.equal(qRod+qCloth,0);assert.equal(qRod<0,negative);
   const expected=m.labels.map(label=>code(label.includes('протонов')?0:label.includes('палочке')?deltaRod:deltaCloth)).join('');
   assert.equal(r.answer,expected,id);assert.match(r.solution,/N_п − N_э/);
  }else if(m.kind==='ion'){
   const Z=8,ne=m.positive?Z-1:Z+1,charge=Z-ne,protonDelta=0,nuclearMassDelta=0;
   assert.equal(charge>0,m.positive);
   assert.equal(r.answer,m.positive?code(ne-Z)+code(protonDelta):code(nuclearMassDelta)+code(ne-Z));
   if(!m.positive){assert.match(r.solution,/не следствие малости массы электрона/);assert.equal(sources['OGEPHYS'+id].discrepancy.status,'resolved');}
  }else if(m.kind==='influence-fill'){
   const near=m.negative?/^положительный заряд/:/^отрицательный заряд/;
   assert.equal(r.answer,[/^притягивается/,/^электризация через влияние/,/^перераспредел/,near].map(re=>select(id,re)).join(''));
   // For separated opposite charges, the nearer attractive force is larger for either external sign.
   for(const sign of [-1,1]){const nearCharge=-sign,farCharge=sign;assert.equal(nearCharge+farCharge,0);assert.ok(-sign*nearCharge/4-sign*farCharge/9>0);}
   if(m.metal)assert.match(r.solution,/суммарный заряд|Суммарный заряд/);
  }else if(m.kind==='repulsion'){
   assert.equal(r.answer,[/^отталкивается от варежки/,/^взаимодействие заряженных тел/,/^одноимённо/,/^положительный/].map(re=>select(id,re)).join(''));
  }else if(m.kind==='neutral-ambiguity'){
   assert.equal(r.answer,select(id,/^Нельзя, так как (?:первоначально|изначально) незаряженн/));
   assert.match(r.solution,/суммарный заряд остаётся нулевым/);assert.match(r.solution,/Мы не доказываем/);
  }else if(m.kind==='influence-choice'){
   assert.equal(r.answer,select(id,m.full?/^(?:При трении о волосы расчёска|Шарик получил избыточный).*(?:через влияние)/:/^электризация через влияние/));
   if(!m.pepper&&!m.foil)assert.match(r.solution,/ионы/);
  }else if(m.kind==='replace-rod'){
   assert.equal(r.answer,select(id,/^Гильза притянется.*за счёт электризации через влияние/));
   assert.match(r.solution,/изначально нейтральна/);assert.match(r.solution,/не определялся бы однозначно/);assert.equal(sources['OGEPHYS'+id].discrepancy.status,'resolved');
  }else if(m.kind==='three-experiments'){
   const chosen=[select(id,/^(?:Палочка электризуется при трении|При трении палочка приобрела электрический заряд)/),select(id,/^Угол расхождения лепестков электроскопа зависит/)];
   assert.equal(r.answer,chosen.sort().join(''));assert.match(r.solution,/при сопоставимых|При сопоставимых/);assert.match(r.solution,/ткани отдельно не исследовали/);
  }else if(['two-experiments','four-experiments'].includes(m.kind)){
   const chosen=[select(id,/^(?:И палочка, и ткань электризуются|Палочка и ткань электризуются|При трении электризуются и палочка, и ткань)/),select(id,/^При трении палочка и ткань приобретают разные по знаку заряды/)];
   assert.equal(r.answer,chosen.sort().join(''));assert.match(r.solution,/не измерен|не измерялись/);
   if(m.kind==='four-experiments')assert.match(r.solution,/угол уменьшается/);
  }else if(m.kind==='electroscope-neutral'){
   assert.match(r.answer,/Угол.*уменьшится/);assert.match(r.solution,/суммарный заряд изолированного электроскопа не обязан уменьшаться/);assert.match(r.solution,/угол восстановятся/);
  }else if(m.kind==='grounding'){
   assert.match(r.answer,/автоцистерны/);assert.match(r.solution,/металлические колёса и рельсы/);assert.match(r.solution,/резиновых шинах/);
  }else if(m.kind==='insulation'){
   assert.match(r.answer,/стального/);assert.match(r.solution,/Изолированный проводник удерживает заряд/);assert.match(r.solution,/Сухая резина плохо проводит/);
  }else throw new Error('Unhandled electrical model '+m.kind);
 }
 assert.equal(checked,36);
};
