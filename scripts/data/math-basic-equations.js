const assert=require('node:assert/strict');
const fmt=n=>Number(n.toFixed(10)).toString().replace('-', '−').replace('.', ',');
const frac=(a,b)=>`⟦${a}¦${b}⟧`;
const normalize=s=>s.replace(/[−–]/g,'-').replace(/\s/g,'');
const powers={'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','+':'⁺','-':'⁻','−':'⁻','x':'ˣ','(':'⁽',')':'⁾'};
const superscript=s=>[...String(s)].map(c=>{assert.ok(powers[c],`Unknown exponent ${s}`);return powers[c];}).join('');
const subs={'₂':2,'₃':3,'₄':4,'₅':5,'₆':6,'₇':7,'₈':8,'₉':9};

function linear(expression){
  const s=normalize(expression),terms=s.match(/[+-]?(?:\d+)?x|[+-]?\d+/g)||[];
  assert.equal(terms.join(''),s,`Not a linear expression: ${expression}`);
  let a=0,b=0;
  for(const term of terms){
    if(term.endsWith('x')){const coefficient=term.slice(0,-1);a+=coefficient===''||coefficient==='+'?1:coefficient==='-'?-1:Number(coefficient);}
    else b+=Number(term);
  }
  return {a,b};
}
function linearText(a,b){return `${a===1?'x':a===-1?'−x':`${fmt(a)}x`}${b>0?'+':''}${b===0?'':fmt(b)}`;}
function scalar(s){
  s=normalize(s);
  const fraction=s.match(/^\((-?\d+)\)÷\((\d+)\)$/);
  if(fraction)return Number(fraction[1])/Number(fraction[2]);
  assert.ok(/^-?\d+$/.test(s),s);return Number(s);
}
function displayScalar(s){const m=normalize(s).match(/^\((-?\d+)\)÷\((\d+)\)$/);return m?frac(m[1],m[2]):s.replace(/-/g,'−');}
function powerSide(s){
  const m=s.match(/^(\d+|\(\(1\) ÷ \(\d+\)\))\^\((.*)\)$/);
  if(!m)return {base:scalar(s),a:0,b:1};
  const inverse=m[1].match(/^\(\(1\) ÷ \((\d+)\)\)$/);
  return {base:inverse?1/Number(inverse[1]):Number(m[1]),...linear(m[2])};
}

function solveBasicEquation(task){
  const match=task.text.match(/^Найдите корень уравнения (.*)\.$/);
  if(!match||task.images.length)return null;
  const equation=match[1].replace(/–/g,'−'),[left,right]=equation.split('=');
  let value,family,parts,parameters;
  const finish=(f,p,x,...steps)=>{family=f;parameters=p;value=x;parts=steps;};
  const reduce=(a,b,target)=>{
    assert.notEqual(a,0,task.id);
    return `Получаем ${linearText(a,b)}=${fmt(target)}. Переносим свободное слагаемое: ${linearText(a,0)}=${fmt(target)}−(${fmt(b)})=${fmt(target-b)}. Делим обе части на ${fmt(a)}: x=${frac(fmt(target-b),fmt(a))}=${fmt((target-b)/a)}.`;
  };
  let m;
  if((m=left.match(/^(³)?√\((.*)\)$/))){
    const degree=m[1]?3:2,{a,b}=linear(m[2]),target=scalar(right),raised=target**degree,x=(raised-b)/a;
    if(degree===2)assert.ok(target>=0,task.id);
    finish(degree===2?'square-root':'cube-root',{left,right,degree,a,b,target},x,
      degree===2?`Область допустимых значений: ${m[2]}≥0. Правая часть равна ${fmt(target)}≥0, поэтому можно возвести обе части в квадрат. При этих условиях преобразование равносильно.`:'Кубический корень определён для всех действительных чисел. Кубическая функция строго возрастает, поэтому возведение обеих частей в куб — равносильное преобразование и не создаёт лишних корней.',
      `После возведения в степень ${degree}: ${m[2]}=${fmt(target)}${superscript(degree)}=${fmt(raised)}.`,
      reduce(a,b,raised),
      `Проверка в исходном уравнении: выражение под корнем при x=${fmt(x)} равно ${fmt(a)}·(${fmt(x)})+(${fmt(b)})=${fmt(raised)}; ${degree===3?'³':''}√(${fmt(raised)})=${fmt(target)}. ${degree===2?'Подкоренное выражение неотрицательно. ':''}После равносильных преобразований получено линейное уравнение с ненулевым коэффициентом, поэтому других корней нет.`);
  }else if((m=left.match(/^\((.*)\)³$/))){
    const {a,b}=linear(m[1]),target=scalar(right),root=Math.cbrt(target),x=(root-b)/a;assert.ok(Number.isInteger(root),task.id);
    finish('cube',{left,right,a,b,target},x,'Кубическая функция строго возрастает на всей числовой прямой, поэтому кубический корень из обеих частей позволяет получить равносильное уравнение. Ограничений на x нет.',
      `${fmt(target)}=(${fmt(root)})³, следовательно ${m[1]}=${fmt(root)}.`,reduce(a,b,root),
      `Проверка: при x=${fmt(x)} выражение в скобках равно ${fmt(root)}; его куб (${fmt(root)})³=${fmt(target)}, как в правой части. Линейное уравнение имеет единственное решение.`);
  }else if((m=left.match(/^log([₂₃₄₅₆₇₈₉])\((.*)\)$/))){
    const base=subs[m[1]],{a,b}=linear(m[2]),other=right.match(/^log([₂₃₄₅₆₇₈₉])(\d+)$/);
    const target=other?Number(other[2]):base**scalar(right),x=(target-b)/a;
    if(other)assert.equal(subs[other[1]],base,task.id);
    finish('logarithm',{left,right,base,a,b,target},x,
      `Область допустимых значений: аргумент логарифма положителен, то есть ${m[2]}>0. Основание ${base} положительно и не равно 1.`,
      other?`При одном и том же основании логарифмы равны тогда и только тогда, когда равны их положительные аргументы. Поэтому ${m[2]}=${target}.`:`По определению логарифма log${m[1]}(${m[2]})=${right} означает ${m[2]}=${base}${superscript(right)}=${fmt(target)}.`,
      reduce(a,b,target),
      `Проверка: при x=${fmt(x)} аргумент равен ${fmt(a)}·(${fmt(x)})+(${fmt(b)})=${fmt(target)}>0. ${other?'Оба логарифма имеют одинаковые основание и аргумент.':`${base}${superscript(right)}=${fmt(target)}, поэтому логарифм действительно равен ${right}.`} Все преобразования равносильны, а полученное линейное уравнение имеет один корень.`);
  }else if((m=left.match(/^\((\d+)\) ÷ \((.*)\)$/))){
    const numerator=Number(m[1]),{a,b}=linear(m[2]),target=scalar(right),denominator=numerator/target,x=(denominator-b)/a;
    finish('reciprocal',{left,right,numerator,a,b,target},x,
      `Область допустимых значений: знаменатель ${m[2]}≠0. Уравнение имеет вид ${frac(numerator,m[2])}=${fmt(target)}.`,
      `Умножаем на ненулевой знаменатель и делим на ${fmt(target)}: ${m[2]}=${frac(numerator,fmt(target))}=${fmt(denominator)}.`,reduce(a,b,denominator),
      `Проверка: при x=${fmt(x)} знаменатель равен ${fmt(denominator)}≠0, а ${frac(numerator,fmt(denominator))}=${fmt(target)}. Значит, найденный корень допустим; линейное уравнение других решений не имеет.`);
  }else if(left.includes('^')){
    const l=powerSide(left),r=powerSide(right),base=l.base<1?1/l.base:l.base,ls=l.base<1?-1:1,factor=Math.log(r.base)/Math.log(base);
    assert.ok(Math.abs(factor-Math.round(factor))<1e-10,task.id);const k=Math.round(factor);
    const a=ls*l.a-k*r.a,b=ls*l.b-k*r.b,x=-b/a;
    const le=linearText(ls*l.a,ls*l.b),re=r.a===0?fmt(k*r.b):linearText(k*r.a,k*r.b);
    const lhsDisplay=`${l.base<1?'('+frac(1,fmt(base))+')':fmt(base)}${superscript(linearText(l.a,l.b).replace(/−/g,'-'))}`;
    finish('exponential',{left,right,l,r,base},x,
      `Основания степеней положительны и не равны 1; уравнение определено при всех действительных x. Приведём обе стороны к основанию ${fmt(base)}.`,
      `Используем ${l.base<1?`${frac(1,fmt(base))}=${fmt(base)}⁻¹ и `:''}правило (aᵘ)ᵛ=aᵘᵛ. Правая часть: ${displayScalar(right.includes('^')?right.split('^')[0]:right)}${right.includes('^')?superscript(right.match(/\^\((.*)\)$/)[1]):''}=${fmt(base)}${superscript(re.replace(/−/g,'-'))}. Левая часть ${lhsDisplay}=${fmt(base)}${superscript(le.replace(/−/g,'-'))}.`,
      `Показательная функция с основанием ${fmt(base)}>1 строго возрастает. Равенство её значений равносильно равенству показателей: ${le}=${re}.`,
      reduce(a,b,0),
      `Проверка подстановкой x=${fmt(x)}: показатель при общем основании слева равен ${fmt(ls*(l.a*x+l.b))}, справа — ${fmt(k*(r.a*x+r.b))}. Они совпали. Ненулевой коэффициент ${fmt(a)} в линейном уравнении гарантирует единственность корня.`);
  }else return null;
  assert.ok(Number.isFinite(value),task.id);
  return {id:task.id,family,parameters,answer:fmt(value),solution:[...parts,`Ответ: ${fmt(value)}.`].join('\n\n'),diagram_svg:'',diagram_caption:''};
}

function verifyBasicEquation(record){
  const x=Number(record.answer.replace('−','-').replace(',','.')),p=record.parameters;
  let left,right;
  if(record.family==='exponential'){left=p.l.base**(p.l.a*x+p.l.b);right=p.r.base**(p.r.a*x+p.r.b);}
  else if(record.family==='square-root'){assert.ok(p.a*x+p.b>=0);left=Math.sqrt(p.a*x+p.b);right=p.target;}
  else if(record.family==='cube-root'){left=Math.cbrt(p.a*x+p.b);right=p.target;}
  else if(record.family==='cube'){left=(p.a*x+p.b)**3;right=p.target;}
  else if(record.family==='logarithm'){assert.ok(p.a*x+p.b>0);left=Math.log(p.a*x+p.b)/Math.log(p.base);right=Math.log(p.target)/Math.log(p.base);}
  else if(record.family==='reciprocal'){assert.notEqual(p.a*x+p.b,0);left=p.numerator/(p.a*x+p.b);right=p.target;}
  else throw new Error(record.id);
  assert.ok(Math.abs(left-right)<1e-9*Math.max(1,Math.abs(left),Math.abs(right)),`${record.id}: substitution failed`);
}

module.exports={solveBasicEquation,verifyBasicEquation};
