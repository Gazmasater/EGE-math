const assert=require('node:assert/strict');
const {conditionText}=require('../../lib/seo-text');
const {parseMath}=require('./audit-oge-math-powers');
const abs=n=>n<0n?-n:n;
function rat(n,d=1n){assert.notEqual(d,0n);if(d<0n){n=-n;d=-d;}let a=abs(n),b=d;while(b)[a,b]=[b,a%b];return [n/a,d/a];}
function decimal(s){s=s.replace(/[−–]/g,'-').replace(/\s/g,'');assert.match(s,/^-?\d+(?:[.,]\d+)?$/);const negative=s.startsWith('-');const [w,f='']=s.replace('-','').split(/[.,]/);return rat((negative?-1n:1n)*BigInt(w+f),10n**BigInt(f.length));}
const mul=(a,b)=>rat(a[0]*b[0],a[1]*b[1]);
const div=(a,b)=>rat(a[0]*b[1],a[1]*b[0]);
const add=(a,b)=>rat(a[0]*b[1]+b[0]*a[1],a[1]*b[1]);
const sub=(a,b)=>add(a,[-b[0],b[1]]);
const integer=n=>[BigInt(n),1n];
const two=integer(2),thousand=integer(1000),gravity=rat(49n,5n);
function linear(s){
  const out=[0n,0n,0n];let consumed='';
  for(const m of s.matchAll(/([+-]?)(\d*)([ab]?)/g)){
    if(!m[0])continue;assert.ok(m[2]||m[3]);consumed+=m[0];
    out[m[3]==='a'?0:m[3]==='b'?1:2]+=(m[1]==='-'?-1n:1n)*BigInt(m[2]||1);
  }
  assert.equal(consumed,s);return out;
}
function checkExpressions(task,record){
  const t=conditionText(task.fragment),answer=decimal(record.answer);
  const capture=re=>{const m=t.match(re);assert.ok(m,task.id+': primary data');return decimal(m[1]);};
  let expected,kind;
  if(t.includes('Мощность постоянного тока')){
    kind='power';assert.ok(t.includes('P=I²R'));
    const current=capture(/сила тока равна ([\d,]+)/),power=capture(/мощность составляет ([\d,]+)/);
    expected=div(power,mul(current,current));
  }else if(t.includes('Центростремительное')){
    kind='centripetal';assert.ok(t.includes('a=ω²R'));
    const speed=capture(/угловая скорость равна ([\d,]+)/),acceleration=capture(/ускорение равно ([\d,]+)/);
    expected=div(acceleration,mul(speed,speed));
  }else if(t.includes('температуры по шкале')){
    const input=capture(/соответствует\s*([−–-]?\s*\d+)\s*град/);
    if(t.includes('t_(F)=1,8t_(C)+32')){kind='celsius-to-fahrenheit';expected=add(mul(rat(9n,5n),input),integer(32));}
    else{kind='fahrenheit-to-celsius';assert.ok(t.includes('t_(C)=(5) ÷ (9)(t_(F)−32)'));expected=mul(rat(5n,9n),sub(input,integer(32)));}
  }else if(t.includes('Площадь четырёхугольника')){
    kind='diagonal';assert.ok(t.includes('S=(d₁d₂sinα) ÷ (2)'));
    const want=t.match(/найдите длину диагонали d([₁₂])/)[1],data=t.match(/если d([₁₂])=([\d,]+), sinα=\((\d+)\) ÷ \((\d+)\), a S=([\d,]+)/);
    assert.ok(data);assert.notEqual(want,data[1]);expected=div(mul(two,decimal(data[5])),mul(decimal(data[2]),div(decimal(data[3]),decimal(data[4]))));
  }else if(t.includes('Сила Архимеда')){
    kind='archimedes';assert.ok(t.includes('F=ρgV')&&t.includes('ρ=1000')&&t.includes('g=9,8'));
    expected=mul(mul(thousand,gravity),capture(/объёмом ([\d,]+)/));
  }else if(t.includes('Кинетическая энергия')){
    kind='kinetic';const mass=capture(/автомобиль массой (\d+)/),energy=mul(thousand,capture(/энергией (\d+) тысяч/));
    assert.ok(answer[0]>0n);assert.deepEqual(mul(mul(answer,answer),mass),mul(two,energy),task.id+': kinetic energy identity');return kind;
  }else if(t.includes('потенциальная энергия')){
    kind='potential';const energy=capture(/энергия равна (\d+)/),height=capture(/на высоте (\d+) м над поверхностью/);
    expected=div(energy,mul(gravity,height));
  }else{
    kind='linear-ratio';const maths=task.fragment.match(/<m:math\b[^>]*>[\s\S]*?<\/m:math>/g);assert.equal(maths.length,2);
    const target=linear(parseMath(maths[0])),eq=parseMath(maths[1]);const m=eq.match(/^\(\(([^()]+)\)\/\(([^()]+)\)\)=(\d+)$/);assert.ok(m,eq);
    const numerator=linear(m[1]),denominator=linear(m[2]),k=BigInt(m[3]),relation=numerator.map((n,i)=>n-k*denominator[i]);
    assert.notEqual(relation[0],0n);
    const factor=rat(target[0],relation[0]);assert.deepEqual(mul(factor,integer(relation[1])),integer(target[1]));
    expected=sub(integer(target[2]),mul(factor,integer(relation[2])));
    // A concrete admissible point rules out a contradictory or empty premise.
    const a=rat(-relation[2],relation[0]),b=integer(0);
    const evalAt=p=>add(add(mul(integer(p[0]),a),mul(integer(p[1]),b)),integer(p[2]));
    const d=evalAt(denominator);assert.notEqual(d[0],0n);assert.deepEqual(div(evalAt(numerator),d),integer(k));assert.deepEqual(evalAt(target),expected);
  }
  assert.deepEqual(answer,expected,task.id+': independent exact calculation');return kind;
}
function auditExpressions(task,source,record){assert.equal(source.model.kind,checkExpressions(task,record));assert.ok(source.methodSource?.reviewed&&source.methodSource.steps.length>80);}
module.exports={checkExpressions,auditExpressions};
