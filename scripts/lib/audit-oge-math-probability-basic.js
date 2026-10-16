const assert = require('node:assert/strict');

// Separate transcription from reviewed primary GIFs; [A branches, all first
// branches, B branches after A, B branches after not A, all second branches].
const trees = {
  '3E7FF9':[1,4,3,7,8], 'B41B7F':[1,4,1,3,5], 'DA5775':[3,4,3,1,5],
  'A61D76':[3,4,1,3,5], '8D76DB':[1,4,3,4,5], '3D425B':[1,4,3,1,5],
  '49A7AB':[3,4,4,1,5], '4321AE':[3,4,4,3,5], 'CAF864':[1,4,2,1,5],
  'EBDC3D':[3,4,2,4,5]
};
const counts = {
  '98F2BF':[30,27], '44D721':[35,21], 'F7752C':[28,21], '027A54':[25,10],
  '62C8AF':[18,9], '9443CA':[40,28], '037FEF':[20,4], 'B7416C':[24,6],
  '06CF3C':[50,15], 'EEF183':[15,12]
};
const words = {два:2,три:3,четыре:4,пять:5,шесть:6,семь:7,восемь:8,девять:9,десять:10,двенадцать:12,пятнадцать:15,восемнадцать:18};
function decimal(s) {
  assert.match(s,/^\d+(?:,\d+)?$/);
  const places=(s.split(',')[1]||'').length;
  return [BigInt(s.replace(',','')),10n**BigInt(places)];
}
function choose(n,k) {
  let result=1n;
  for(let i=1;i<=k;i++)result=result*BigInt(n-i+1)/BigInt(i);
  return result;
}
function auditProbabilityBasic(task,source,record,text) {
  const nums=Array.from(text.matchAll(/\d+/g),m=>Number(m[0]));
  let good,total,kind;
  if(trees[task.id]) {
    kind='tree';assert.match(text,/дерево случайного опыта/);
    const [a,n,u,v,d]=trees[task.id];good=0;total=0;
    // Count equiprobable subbranches, independent of the generator's weighted
    // sum of two paths. The second-stage weights depend on the first outcome.
    for(let first=0;first<n;first++)for(let second=0;second<d;second++) {
      total++;if(second<(first<a?u:v))good++;
    }
    assert.deepEqual(source.model.data.map(Number),[a/n,u/d,v/d]);
    assert.equal(source.model.event,'B');
    assert.ok(record.solution.includes('условн')&&record.solution.includes('несовместн'));
    assert.equal(source.images.length,2);
    assert.ok(source.externalImages?.length && source.externalImages.every(i=>i.reviewed));
  } else if(counts[task.id]) {
    kind='count-image';assert.match(text,/равновозможных элементарных событий/);
    [total,good]=counts[task.id];assert.deepEqual(source.model.data,[total,good]);
    assert.equal(source.model.event,'A');assert.equal(source.images.length,4);
  } else if(text.includes('У бабушки')) {
    kind='cups';assert.equal(nums.length,2);
    const [n,red]=nums;total=n;good=0;
    for(let cup=0;cup<n;cup++)if(cup>=red)good++;
  } else if(text.includes('карманных фонариков')) {
    kind='flashlights';assert.equal(nums.length,1);
    const word=text.match(/,\s*([а-я]+) неисправных/)[1],bad=words[word];assert.ok(bad);
    total=nums[0];good=total-bad;assert.ok(record.solution.includes('модель'));
  } else if(text.includes('В фирме такси')) {
    kind='taxi';assert.equal(nums.length,4);const [n,black,yellow,green]=nums;
    const fleet=[...Array(black).fill('black'),...Array(yellow).fill('yellow'),...Array(green).fill('green')];
    assert.equal(fleet.length,n);total=fleet.length;good=fleet.filter(c=>c==='yellow').length;
    assert.ok(record.solution.includes('равными шансами'));
  } else if(text.includes('шариковая ручка пишет плохо')) {
    kind='pen-complement';const p=text.match(/равна (0,\d+)/)[1];const [bad,den]=decimal(p);
    total=den;good=den-bad;assert.ok(record.solution.includes('противоположны'));
  } else if(text.includes('На экзамене')) {
    kind='tickets';assert.equal(nums.length,2);total=nums[0];good=total-nums[1];
  } else if(text.includes('Родительский комитет')) {
    kind='puzzles';assert.equal(nums.length,4);const [n,cars,cities,kids]=nums;
    assert.equal(cars+cities,n);assert.equal(kids,n);total=n;good=cars;
  } else if(text.includes('В магазине канцтоваров')) {
    kind='pen-colors';assert.equal(nums.length,4);const [n,red,green,purple]=nums;
    const remainder=n-red-green-purple;assert.ok(remainder>=0&&remainder%2===0);
    const colors={красной:red,зелёной:green,фиолетовой:purple,синей:remainder/2,чёрной:remainder/2};
    const question=text.split('Найдите вероятность')[1];
    const selected=Object.keys(colors).filter(c=>question.includes(c));assert.equal(selected.length,2);
    const pens=Object.entries(colors).flatMap(([name,count])=>Array(count).fill(name));
    total=pens.length;assert.equal(total,n);good=pens.filter(c=>selected.includes(c)).length;
    assert.ok(record.solution.includes('несовместны'));
  } else if(text.includes('Монету бросили')) {
    kind='coin';assert.equal(nums.length,2);const [n,heads]=nums;
    // Condition on the known count of heads, then fix the requested position
    // to tails. This checks exchangeability via binomial counts.
    total=choose(n,heads);good=choose(n-1,heads);
    assert.ok(record.solution.includes('независимых')&&record.solution.includes('позиции равноправны'));
  } else if(text.includes('Из ящика')) {
    kind='pencils';assert.equal(nums.length,2);const [yellow,green]=nums;
    const pencils=[...Array(yellow).fill('yellow'),...Array(green).fill('green')];
    total=0;good=0;
    // Count all ordered pairs conditional on a green first draw, without
    // replacement. This is distinct from subtracting one in the generator.
    for(let i=0;i<pencils.length;i++)if(pencils[i]==='green')for(let j=0;j<pencils.length;j++)if(i!==j){total++;if(pencils[j]==='green')good++;}
    assert.ok(record.solution.includes('без возвращения')&&record.solution.includes('не умножаем'));
  } else if(text.includes('Под классной доской')) {
    kind='markers';assert.equal(nums.length,2);total=nums[0]+nums[1];good=nums[1];
  } else if(text.includes('В лыжных гонках')) {
    kind='ski';const entrants=Array.from(text.matchAll(/(\d+) спортсмен[а-я]* из (России|Норвегии|Швеции)/g),m=>[m[2],Number(m[1])]);
    assert.equal(entrants.length,3);const question=text.split('Найдите вероятность')[1];
    const countries=entrants.flatMap(([country,n])=>Array(n).fill(country));total=countries.length;
    good=countries.filter(c=>question.includes('не из России')?c!=='России':question.includes(c)).length;
    assert.ok(record.solution.includes('стартовать первым'));
  } else throw Error('No independent probability model for '+task.id);
  assert.equal(source.model.kind,kind,task.id+': classification');
  const n=BigInt(good),d=BigInt(total);assert.ok(d>0n&&n>=0n&&n<=d);
  const [answer,scale]=decimal(record.answer);
  assert.equal(answer*d,n*scale,task.id+': independent exact probability');
  assert.ok(source.methodSource?.reviewed && source.methodSource.steps.length>60);
  assert.ok(record.solution.includes('Проверка'));
}
module.exports={auditProbabilityBasic};
