const assert=require('node:assert/strict');
const sources=require('./oge-physics-thermal-particles-sources.json');
module.exports=prepared=>{
 const rows=new Map(prepared.map(r=>[r.id.slice(7),r]));
 const answer=id=>rows.get(id).answer;
 const condition=id=>sources['OGEPHYS'+id].fipiCondition;
 const option=(id,re)=>{
  const t=condition(id).split(/Список слов(?: и словосочетаний)?:/).at(-1).split('Запишите в таблицу')[0];
  const choices=[...t.matchAll(/(?:^|\s)(\d)\)\s*([\s\S]*?)(?=\s\d\)|$)/g)];
  const hits=choices.filter(m=>re.test(m[2].trim()));assert.equal(hits.length,1,id+': unique source choice '+re);return hits[0][1];
 };
 for(const id of ['45170B','519BB3','0D0B2F'])assert.equal(answer(id),option(id,/^диффузия/));
 for(const id of ['8802C8','23578D'])assert.equal(answer(id),option(id,/^броуновское движение/));
 const trials=[
  ['057E77',false,['density','speed']],['A2001A',true,['speed','mass']],['611719',false,['density','speed']],
  ['71F955',false,['density','energy']],['79DEC9',true,['speed','density']],['982199',true,['energy','distance']],
  ['618E9D',true,['density','energy']],['DC65EA',true,['density','speed']]
 ];
 for(const [id,heat,qs] of trials){
  const m=.1,V0=.001,V1=V0*(heat?1.01:.99),T0=293,T1=heat?303:283;
  const before={density:m/V0,speed:Math.sqrt(T0),mass:m,energy:T0,distance:Math.cbrt(V0)};
  const after={density:m/V1,speed:Math.sqrt(T1),mass:m,energy:T1,distance:Math.cbrt(V1)};
  const result=qs.map(q=>after[q]>before[q]?'1':after[q]<before[q]?'2':'3').join('');
  assert.equal(answer(id),result,id+': volume, mass and thermal motion');
  assert.ok(Math.abs(after.density*V1-m)<1e-12);assert.match(condition(id),/1\) увелич/);assert.match(condition(id),/2\) уменьш/);assert.match(condition(id),/3\) не измен/);
 }
 assert.ok(10>4 && 25>10);assert.match(rows.get('79DEC9').solution,/выше 4 °C/);
 for(const id of ['6E8FB0','11F555','7AE665','AE8169']){
  const heat=['6E8FB0','AE8169'].includes(id),isDensity=id==='7AE665';
  const expected=[option(id,/^тепловое (расширение|сжатие)/),option(id,/^скорость теплового движения/),option(id,isDensity?/^уменьшается$/:/^не изменяется$/),option(id,isDensity||heat?/^увеличивается$/:/^уменьшается$/)].join('');
  assert.equal(answer(id),expected,id+': primary word numbering');
 }
 assert.equal(answer('F7573E'),[/^горячая$/,/^нагревание$/,/^давление$/,/^равный$/].map(re=>option('F7573E',re)).join(''));
 assert.equal(answer('8CDFEC'),[/^низкая$/,/^давление$/,/^уменьшаться$/,/^равный$/].map(re=>option('8CDFEC',re)).join(''));
 for(const id of ['F7573E','8CDFEC'])assert.match(rows.get(id).solution,/упругость|упругое/);
 // Controlled variables: both liquids and observation interval stay fixed; temperature differs.
 const experiments=[{phase:'liquid',substances:'water,copper sulfate',days:3,T:293,blur:10},{phase:'liquid',substances:'water,copper sulfate',days:3,T:278,blur:4}];
 assert.equal(experiments[0].phase,experiments[1].phase);assert.equal(experiments[0].substances,experiments[1].substances);assert.equal(experiments[0].days,experiments[1].days);
 const conclusions=[experiments.every(e=>e.phase==='liquid'),(experiments[0].T-experiments[1].T)*(experiments[0].blur-experiments[1].blur)>0,new Set(experiments.map(e=>e.phase)).size>1,new Set(experiments.map(e=>e.substances)).size>1,experiments.some(e=>e.phase==='solid')];
 assert.equal(answer('BAC646'),conclusions.flatMap((yes,i)=>yes?[i+1]:[]).join(''));
 // Stern model: a wider range of deposition positions cannot be represented by one speed.
 const R=.2,r=.1,u=10,arc=[.002,.004,.008],speeds=arc.map(a=>u*(R-r)/a);
 assert.ok(new Set(speeds).size>1);assert.equal(speeds[0],2*speeds[1]);
 for(let i=0;i<arc.length;i++)assert.ok(Math.abs((R-r)/speeds[i]-arc[i]/u)<1e-12);
 assert.match(answer('95BABF'),/^Нет/);assert.match(rows.get('95BABF').solution,/размытую полоску M/);assert.ok(sources.OGEPHYS95BABF.sourceLimitation);
 assert.equal(Object.keys(sources).length,21);
};
