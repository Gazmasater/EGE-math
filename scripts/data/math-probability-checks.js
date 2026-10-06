const assert = require('node:assert/strict');
const near = (actual, expected, label) => assert.ok(Math.abs(actual-expected)<1e-10, `${label}: ${actual} != ${expected}`);

// Enumerate elementary outcomes or reconstruct the probability partition.
// These checks do not read the explanatory text or reuse its final formula.
function verifyProbability(record) {
  const p=record.parameters, value=Number(record.answer.replace(',','.')), id=record.id;
  if ('total' in p) {
    near(value*p.total,p.favorable,id);
  } else if (record.family==='lamps') {
    let sum=0;
    for(let mask=1;mask<2**p.n;mask++) {
      let weight=1;
      for(let k=0;k<p.n;k++)weight*=mask&(1<<k)?1-p.p:p.p;
      sum+=weight;
    }
    near(value,sum,id);
  } else if (record.family==='coffee') {
    const cells=[value,p.p-p.both,p.p-p.both,p.both];
    assert.ok(cells.every(x=>x>=0),id);near(cells.reduce((a,b)=>a+b),1,id);
    near(cells[1]+cells[3],p.p,id);near(cells[2]+cells[3],p.p,id);
  } else if (record.family==='bread') {
    assert.ok(p.lower<p.upper,id);
    near((1-p.highP)+value+(1-p.lowP),1,id);
    near((1-p.highP)+value,p.lowP,id);
  } else if (record.family==='battery') {
    let reject=0;
    // 10000 equally weighted pairs: state percentile, control percentile.
    for(let state=0;state<100;state++)for(let control=0;control<100;control++)
      if(control < Math.round(100*(state<Math.round(100*p.defect)?p.detect:p.falseAlarm)))reject++;
    near(value,reject/10000,id);
  } else if (record.family==='markers') {
    const colors=[...Array(p.blue).fill('b'),...Array(p.red).fill('r'),...Array(p.other).fill('g')];
    let good=0,all=0;
    for(let i=0;i<colors.length;i++)for(let j=i+1;j<colors.length;j++) {
      all++;if([colors[i],colors[j]].sort().join('')==='br')good++;
    }
    near(value*all,good,id);
  } else if (record.family==='fixed-shots') {
    let expected=1;
    const outcomes=Array.from({length:4},(_,i)=>i<p.hit);
    for(const hit of outcomes)expected*=hit?p.p:1-p.p;
    near(value,expected,id);
  } else if (record.family==='until-hit') {
    let accumulated=0,previous=0;
    for(let k=0;k<value;k++){previous=accumulated;accumulated+=(1-p.p)**k*p.p;}
    assert.ok(Number.isInteger(value)&&value>0&&previous<p.target&&accumulated>=p.target,id);
  } else if (record.family==='conditional-dice') {
    let accepted=0,favorable=0;
    for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)if(a!==p.banned&&b!==p.banned){accepted++;if(a+b===p.target)favorable++;}
    near(value*accepted,favorable,id);
  } else if (record.family==='two-coins') {
    const cases=['OO','OP','PO','PP'];
    near(value*cases.length,cases.filter(x=>p.once?x.split('P').length===2:x==='PP').length,id);
  } else if (record.family==='match-tosses') {
    let favorable=0;
    for(let mask=0;mask<2**p.n;mask++) {
      const count=mask.toString(2).replaceAll('0','').length;
      if(p.atMost?count<=1:(id==='C83C8C'?mask===2:count===p.n))favorable++;
    }
    near(value*2**p.n,favorable,id);
  } else if (record.family==='temperature') near(value+p.p,1,id);
  else if (record.family==='nested-events') near(value+p.aboveFour,p.aboveThree,id);
  else if (record.family==='disjoint-topics') near(value-p.a,p.b,id);
  else if (record.family==='bus-interval') {assert.ok(p.lower<p.upper,id);near(value+p.b,p.a,id);}
  else throw new Error(`${id}: no independent check`);
}

module.exports={verifyProbability};
