const assert = require('node:assert/strict');
const sources = require('./oge-physics-nuclear-decay-sources.json');

module.exports = prepared => {
  const rows = new Map(prepared.map(r => [r.id, r]));
  const checked = new Set();
  const answer = id => { checked.add(id); const row = rows.get('OGEPHYS'+id); assert.ok(row,id); return row.answer; };
  // Read-off points from the five original graphs; no generated model data.
  for (const [id,points] of [
    ['643D4C',[[0,4],[2,2],[4,1]]],
    ['32B505',[[0,60],[20,30]]],
    ['4F4AC3',[[0,3],[1,1.5]]],
    ['07F66A',[[0,2],[4,1],[8,0.5]]],
    ['642A64',[[0,80],[40,40],[80,20],[120,10]]]
  ]) {
    const T = Number(answer(id));
    assert.ok(T > 0);
    for(const [time,value] of points)assert.equal(points[0][1]*2**(-time/T),value,id+': original graph');
  }
  const years = Number(answer('1AAFD9').replace(/\D/g,''));
  assert.equal(2**(-years/5730),0.25);
  assert.equal(answer('A66128'),'Деревянная кухонная утварь.');
  assert.match(sources.OGEPHYSA66128.fipiCondition,/деревянн/i);
  // Independently enumerate proton/neutron compositions after emission. Each
  // alpha particle removes two of each; reverse tasks reconstruct the parent.
  const alpha = [
    ['02ED46',179,79,1,false,'A'],['EF05FF',224,88,2,false,'A'],
    ['606C06',226,88,1,true,'A'],['D12B7A',140,58,2,true,'A'],
    ['AE6E1A',230,90,1,false,'A'],['F17427',230,90,1,false,'Z'],
    ['8E4527',140,58,2,true,'Z'],['9053D8',179,79,1,false,'Z'],
    ['06EFAB',222,86,1,true,'A'],['00149E',224,88,2,false,'Z'],
    ['4B1867',210,84,1,false,'A']
  ];
  for(const [id,A,Z,count,reverse,target] of alpha) {
    const sign=reverse?1:-1;
    const particles=Array.from({length:Z},()=> 'p').concat(Array.from({length:A-Z},()=> 'n'));
    for(let i=0;i<2*count;i++)for(const kind of ['p','n']) {
      if(sign===1)particles.push(kind);else particles.splice(particles.indexOf(kind),1);
    }
    const p=particles.filter(k=>k==='p').length;
    assert.equal(Number(answer(id)),target==='A'?particles.length:p,id);
    assert.equal(Math.abs(p-Z),2*count);assert.equal(Math.abs(particles.length-A),4*count);
  }
  for(const [id,A,Z,target] of [
    ['F51272',240,93,'A'],['FB8575',95,41,'Z'],['D9CF79',90,38,'A'],
    ['575474',214,83,'A'],['F7A41C',195,76,'Z'],['619D26',214,83,'Z'],['682DCC',22,11,'A']
  ]) {
    const neutronCount=A-Z;
    const finalProtons=Z+1,finalNeutrons=neutronCount-1;
    assert.equal(finalProtons+finalNeutrons,A);
    assert.equal(finalProtons-1,Z);
    assert.equal(Number(answer(id)),target==='A'?finalProtons+finalNeutrons:finalProtons,id);
  }
  // Back-substitute into both balances of the primary reactions, including
  // the incident neutron and coefficients of emitted particles.
  const n=id=>Number(answer(id));
  const helium=n('9D23F9');assert.equal(helium*4,1+7);assert.equal(helium*2,1+3);
  assert.equal(n('0A2956')+4,238+12);
  assert.equal(n('21CE59')+3,252+4);assert.equal(n('36C69F'),98+2);
  assert.equal(141+92+n('579C59'),235+1);assert.equal(56+36,92);
  assert.equal(n('70FBAD')+50,255+3);assert.equal(n('D1746D')+22,104);
  assert.equal(n('E15DC4'),92+7);assert.equal(n('C5E667')+6,238+14);
  assert.equal(146+92+n('C8296F'),238+1);
  assert.equal(n('5BA43D')+8,9+1);assert.equal(4+16,19+1);
  assert.equal(checked.size,36);
  assert.deepEqual([...checked].map(id=>'OGEPHYS'+id).sort(),Object.keys(sources).sort());
};
