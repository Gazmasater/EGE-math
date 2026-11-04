'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const m=require('./lib/ege-informatics-mirror-clusters-machine'),conditions=require('./data/ege-informatics-mirror-clusters-condition-texts.json');
const model=m.conditionModel(Object.values(conditions)[0]);
const boxes=[[[-2.25,2.25,-3,3],[7.75,12.25,-3,3]],
  [[-2.5,2.5,97,103],[7.5,12.5,97,103],[17.5,22.5,97,103]]];
function fixture(offsets) {
  const files=[[],[]];let at=0;
  for(let k=0;k<2;k++) for(let c=0;c<(k===0?2:3);c++) {
    const base=c*10,offset=offsets[at++];
    for(const x of [base-1,base+offset,base+1.4])files[k].push(`${x.toFixed(1)} ${k*100}`);
  }
  files[1].push('-100 -100','100 -100','0 -100');
  return files.map(lines=>'X Y\n'+lines.reverse().join('\n')+'\n');
}
test('243 asymmetric collinear clusters: medoid is median, not arithmetic mean',()=>{
  for(let code=0;code<243;code++) {
    let n=code;const os=[];for(let j=0;j<5;j++){os.push([.1,.5,.8][n%3]);n=Math.floor(n/3);}
    const r=m.solve(fixture(os),model,boxes);
    const expectedA=[100000+Math.round(os[0]*10000)+Math.round(os[1]*10000),0];
    const centers=[os[2],10+os[3],20+os[4]];
    const diffs=[centers[1]-centers[0],centers[2]-centers[1],centers[2]-centers[0]].map(x=>Math.round(x*10000));
    assert.deepEqual(r.files[0].answer,expectedA);assert.deepEqual(r.files[1].answer,[Math.min(...diffs),Math.max(...diffs)]);
    assert.ok(r.files.flatMap(f=>f.clusters).every(c=>c.count===3));
  }
});
test('decimal coordinates and header are validated without silently dropping points',()=>{
  assert.equal(m.parse('\uFEFFX\tY\n-0,0000001 0\n0 1\n').length,2);
  for(const text of ['0 1\n2 3','X Y\nNaN 2','X Y\n1.12345678 2','X Y\n1 2 3','X Y\nInfinity 0','X Y\nX Y'])assert.throws(()=>m.parse(text));
});
test('rectangle certificate rejects changed sizes, intersections, extra and nonisolated omissions',()=>{
  const texts=fixture([.1,.1,.1,.1,.1]);
  let bad=structuredClone(boxes);bad[0][0][1]+=1;assert.throws(()=>m.solve(texts,model,bad));
  bad=structuredClone(boxes);bad[0][1]=bad[0][0];assert.throws(()=>m.solve(texts,model,bad));
  assert.throws(()=>m.solve([texts[0]+'2.25 0\n',texts[1]],model,boxes));
  assert.throws(()=>m.solve([texts[0],texts[1].replace('-100 -100','3 100')],model,boxes));
  assert.throws(()=>m.solve([texts[0],texts[1]+'200 -100\n'],model,boxes));
});
test('condition binds requested statistics; no centroid shortcut or ambiguous medoid',()=>{
  for(const condition of Object.values(conditions))assert.deepEqual(m.conditionModel(condition),model);
  const base=Object.values(conditions)[0];
  for(const [from,to] of [['сумму абсцисс','среднее абсцисс'],['минимальное расстояние между центрами','максимальное расстояние между центрами'],['ровно трёх','ровно двух'],['W = 4,5','W = 5']])assert.throws(()=>m.conditionModel(base.replace(from,to)));
  const texts=fixture([.1,.1,.1,.1,.1]);
  const lines=texts[0].trim().split('\n');const withoutMiddle=lines.filter(s=>s!=='0.1 0').join('\n');
  assert.throws(()=>m.solve([withoutMiddle,texts[1]],model,boxes));
});
