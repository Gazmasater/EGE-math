const fs=require('node:fs'),assert=require('node:assert/strict');
const P=__dirname,R=require('node:path').resolve(P,'../../..');
const machine=require(R+'/scripts/lib/ege-informatics-mirror-robot-machine');
const inputs=require('./robot-inputs.json'),tasks=Object.entries(inputs).map(([id,t])=>({id,...t})),python=require('./robot-independent-python.json'),out={};
for(const task of tasks){
  const d=task.grid;
  const model=machine.modelFromCondition(task.condition);
  assert.deepEqual(model,{finish:'bottom-right',order:'max-min'});
  const result=machine.solve(d,model),p=python[task.id];
  for(const key of ['minimum','maximum','paths'])assert.equal(result[key],p[key]);
  for(const key of ['minimum','maximum']){
    const route=result[key+'Route'];assert.equal(route.length,2*d.n-1);
    assert.deepEqual([route[0].row,route[0].col],[0,0]);
    assert.deepEqual([route.at(-1).row,route.at(-1).col],[d.n-1,d.n-1]);
    assert.equal(route.reduce((s,x)=>s+d.grid[x.row][x.col],0),result[key]);
    for(let i=1;i<route.length;i++){
      const a=route[i-1],b=route[i];
      assert.ok(b.row===a.row&&b.col===a.col+1&&!d.rightWalls[a.row][a.col] || b.row===a.row+1&&b.col===a.col&&!d.downWalls[a.row][a.col]);
    }
  }
  const original=d.grid[0][0];
  for(let x=1;x<=100;x++){
    const changed=structuredClone(d);changed.grid[0][0]=x;
    const alternative=machine.solve(changed,model);
    assert.equal(alternative.maximum,result.maximum-original+x);
    assert.equal(alternative.minimum,result.minimum-original+x);
    for(const k of ['minimumRoute','maximumRoute'])assert.deepEqual(alternative[k].map(v=>v.cell),result[k].map(v=>v.cell));
    assert.equal(alternative.paths,result.paths);
  }
  out[task.id]=result;console.log(task.id,result.answer,'independent agreement; 100 A1 alternatives checked');
}
assert.deepEqual(out,require('./robot-calculations.json'));
for(const d of require('./robot-conditional-drafts.json'))assert.equal(d.answer,null);
console.log('OK: all saved calculations match; 700 A1 counterfactuals preserve routes and shift both answers.');
const gcd=(a,b)=>b?gcd(b,a%b):a;
const fraction=(n,z)=>{const k=gcd(n<0n?-n:n,z);return z/k===1n?String(n/k):String(n/k)+'/'+String(z/k)};
for(const record of require('./rate-conditional-drafts.json')){
  const p=record.parameters,bits=BigInt(p.megabytes)*8388608n;
  assert.equal(record.answer,null);
  for(const [mode,a] of Object.entries(record.alternatives)){
    const speed=mode==='literal'?BigInt(p.literalRate):2n**BigInt(p.hypothesizedExponent);
    const den=100n*speed,an=bits*BigInt(p.percent)+den*BigInt(p.packSeconds+p.unpackSeconds),bn=100n*bits;
    assert.equal(a.secondsA,fraction(an,den));assert.equal(a.secondsB,fraction(bits,speed));
    assert.equal(a.differenceSeconds,fraction(an>bn?an-bn:bn-an,den));
    assert.equal(a.faster,bn>an?'А':'Б');
  }
}
console.log('OK: 14 exact rational rate alternatives independently verified with BigInt.');
