'use strict';
const assert=require('node:assert/strict');
const {conditionText}=require('../../lib/seo-text');
const SUP='⁰¹²³⁴⁵⁶⁷⁸⁹',SUB='₀₁₂₃₄₅₆₇₈₉';
const normal=(s,alphabet)=>[...s].map(c=>alphabet.indexOf(c)).join('');
const get=(s,r)=>{const m=s.match(r);assert.ok(m,r+': '+s);return m;};
const number=(code,b)=>[...code].reverse().reduce((n,c,i)=>n+parseInt(c,36)*b**i,0);
function expand(n,b){let p=1;while(p*b<=n)p*=b;const a=[];while(p>=1){const d=Math.floor(n/p);a.push(d);n-=d*p;p/=b;}return a.reverse();}
function normalize(a,b){a=[...a];for(let i=0;i<a.length;i++){let q=Math.floor((a[i]||0)/b);a[i]=(a[i]||0)-q*b;if(q){if(i+1===a.length)a.push(q);else a[i+1]=(a[i+1]||0)+q;}assert.ok(a.length<10000,'Negative value or excessive exponent');}while(a.length>1&&!a.at(-1))a.pop();return a;}
function runs(a){const out=[];for(let i=0;i<a.length;i++){if(out.length&&out.at(-1).digit===a[i]){out.at(-1).last=i;out.at(-1).count++;}else out.push({first:i,last:i,digit:a[i],count:1});}return out.reverse();}
function polynomial(raw,b){
 let root=b,degree=1;for(let r=2;r<=b;r++){let p=r,k=1;while(p<b){p*=r;k++;}if(p===b){root=r;degree=k;break;}}
 const expression=raw.replace(/[–−]/g,'-').replace(/[∙·×]/g,'*').replace(/\s/g,'');assert.ok(/^[0-9⁰¹²³⁴⁵⁶⁷⁸⁹x+*\-]+$/.test(expression));
 const a=[],terms=[];for(const t of expression.match(/[+-]?[^+-]+/g)){if(t==='-x')continue;let coefficient=t.startsWith('-')?-1:1,power=0;for(const f of t.replace(/^[+-]/,'').split('*')){const q=get(f,/^(\d+)([⁰¹²³⁴⁵⁶⁷⁸⁹]*)$/);const v=+q[1];if(!q[2]){coefficient*=v;continue;}let k=0,p=1;while(p<v){p*=root;k++;}assert.equal(p,v,'not common power '+v);power+=k*Number(normal(q[2],SUP));}
 const exponent=Math.floor(power/degree);coefficient*=root**(power%degree);a[exponent]=(a[exponent]||0)+coefficient;terms.push({term:t,coefficient,exponent});}
 return {terms,raw:Array.from({length:a.length},(_,i)=>a[i]||0),root,degree};
}
const cache = new Map();
function parseNumeral(task){
 if (cache.has(task.fragment)) return cache.get(task.fragment);
 let s=conditionText(task.fragment);const m={id:task.id};
 if(s.includes('�'))return {...m,needsReview:true};
 if(s.includes('Вычислите сумму')){
 const q=get(s,/x\s*=\s*([0-9A-F]+)₁₆,\s*y\s*=\s*([0-7]+)₈/);m.kind='mixed-sum';m.hex=q[1];m.octal=q[2];m.left=number(q[1],16);m.right=number(q[2],8);m.sum=m.left+m.right;m.binary=expand(m.sum,2).reverse().join('');m.numericResult=m.binary;
 }else if(s.includes('Вычислите значение выражения')){
 const q=get(s,/выражения ([0-9A-FА]+)₁₆ [–−-] ([0-9A-FА]+)₁₆/);m.kind='hex-difference';m.leftCode=q[1].replace(/А/g,'A');m.rightCode=q[2].replace(/А/g,'A');m.left=number(m.leftCode,16);m.right=number(m.rightCode,16);m.numericResult=m.left-m.right;
 }else if(s.includes('Сколько существует натуральных чисел')){
 const q=get(s,/([0-9A-F]+)([₀₁₂₃₄₅₆₇₈₉]+) < x < ([0-9A-F]+)([₀₁₂₃₄₅₆₇₈₉]+)/);m.kind='open-interval';m.leftCode=q[1];m.leftBase=+normal(q[2],SUB);m.rightCode=q[3];m.rightBase=+normal(q[4],SUB);m.lower=number(m.leftCode,m.leftBase);m.upper=number(m.rightCode,m.rightBase);m.integers=[];for(let i=m.lower+1;i<m.upper;i++)m.integers.push(i);m.numericResult=m.integers.length;
 }else if(s.includes('Сколько единиц в двоичной записи')||s.includes('Количество значащих нулей в двоичной записи десятичного числа')){
 const q=get(s,/числа ([0-9A-F]+)(₁₆)?/);m.kind='binary-count';m.sourceCode=q[1];m.sourceBase=q[2]?16:10;m.decimal=number(q[1],m.sourceBase);m.binary=expand(m.decimal,2).reverse().join('');m.target=s.includes('нулей')?0:1;m.numericResult=[...m.binary].filter(c=>+c===m.target).length;
 }else if(s.includes('Операнды')){
 m.kind='unknown-digit';m.base=+get(s,/с основанием (\d+)/)[1];m.codes=[...s.matchAll(/([0-9x]+)[₀₁₂₃₄₅₆₇₈₉]+/g)].map(q=>q[1]);m.divisor=+get(s,/кратно (\d+)/)[1];m.extreme=s.includes('наименьшее')?'min':'max';m.affine=m.codes.map(code=>[...code].reverse().reduce((acc,c,i)=>{acc[c==='x'?'coefficient':'constant']+=(c==='x'?1:+c)*m.base**i;return acc;},{coefficient:0,constant:0}));m.coefficient=m.affine.reduce((a,v)=>a+v.coefficient,0);m.constant=m.affine.reduce((a,v)=>a+v.constant,0);
 m.table=Array.from({length:m.base},(_,x)=>{const values=m.affine.map(a=>a.constant+a.coefficient*x),total=values.reduce((a,b)=>a+b,0);assert.ok(Number.isSafeInteger(total));return {x,values,total,remainder:total%m.divisor};});m.valid=m.table.filter(row=>row.remainder===0).map(row=>row.x);assert.ok(m.valid.length);m.chosen=m.extreme==='min'?m.valid[0]:m.valid.at(-1);m.total=m.table[m.chosen].total;m.quotient=m.total/m.divisor;m.numericResult=m.quotient;
 }else if(s.includes('все основания систем счисления')){
 const q=get(s,/числа (\d+) оканчивается на (\d+)/);m.kind='ending-bases';m.decimal=+q[1];m.last=+q[2];m.difference=m.decimal-m.last;const d=new Set();for(let k=1;k*k<=m.difference;k++)if(m.difference%k===0){d.add(k);d.add(m.difference/k);}m.divisors=[...d].sort((a,b)=>a-b);m.bases=m.divisors.filter(b=>b>m.last&&b>=2);m.numericResult=m.bases.join(',');
 }else if(s.includes('все числа, не превосходящие')){
 const q=get(s,/превосходящие (\d+).*оканчивается на ([01]+)/);m.kind='binary-ending';m.limit=+q[1];m.ending=q[2];m.modulus=2**m.ending.length;m.remainder=number(m.ending,2);m.values=[];for(let n=1;n<=m.limit;n++)if(expand(n,2).reverse().join('').endsWith(m.ending))m.values.push(n);m.numericResult=m.values.join(',');
 }else if(s.includes('с некоторым основанием число')){
 const q=get(s,/число (\d+) записывается в виде (\d+)/);m.kind='unknown-base';m.decimal=+q[1];m.code=q[2];assert.equal(m.code,'101');m.base=Math.sqrt(m.decimal-1);assert.ok(Number.isInteger(m.base)&&m.base>1);m.numericResult=m.base;
 }else{
 const q=s.match(/(?:с основанием |в )(\d+)(?:-ричной)?/);m.base=q?+q[1]:s.includes('двоичн')?2:s.includes('троичн')?3:s.includes('семеричн')?7:null;assert.ok(m.base);
 let raw;if(task.id==='EGEINFBA5430')raw='7 ∙ 512¹⁹¹² + 6 ∙ 64¹⁹⁵⁴ – 5 ∙ 8¹⁹⁹¹ – 4 ∙ 8¹⁹⁸⁰ – 2022';else if(s.includes('где x'))raw=get(s,/выражения\s*:?\s*(.*?)\s*, где x/)[1];else if(s.includes('заданного выражением'))raw=get(s,/выражением:\s*(.*?)\.?$/)[1];else if(s.includes('Сколько единиц содержится'))raw=get(s,/выражения:\s*(.*?)\?/)[1];else raw=get(s,/выражения\s*:?\s*(.*?)\s*[–−-]?\s*записали/)[1].replace(/[ –−-]+$/,'');
 m.expression=raw;m.polynomial=polynomial(raw,m.base);
 if(s.includes('где x')){
 m.kind='variable-zero-count';m.limit=+get(s,/не превышающее (\d+)/)[1];m.maximizeZeros=s.includes('максимально');m.lowWidth=Math.min(...m.polynomial.terms.map(t=>t.exponent));assert.ok(m.base**Math.min(m.lowWidth,10)>m.limit);const prefix=[...m.polynomial.raw];prefix[m.lowWidth]--;m.prefix=normalize(prefix,m.base).slice(m.lowWidth);m.fixedZeros=m.prefix.filter(v=>!v).length;
 const distribution=new Map();m.valid=[];const all=[];for(let x=1;x<=m.limit;x++){const complementary=expand(x-1,m.base);const zeros=m.fixedZeros+complementary.filter(v=>v===m.base-1).length;all.push({x,zeros});const row=distribution.get(zeros)||{zeros,count:0,maxX:0};row.count++;row.maxX=x;distribution.set(zeros,row);}
 m.counts=[...distribution.values()].sort((a,b)=>a.zeros-b.zeros);const target=s.match(/ровно (\d+|пять|один|три|два) нул/u); // Optional for maximization is handled below.
 m.target=m.maximizeZeros?m.counts.at(-1).zeros:({пять:5,один:1,три:3,два:2}[target[1]]??+target[1]);m.valid=all.filter(v=>v.zeros===m.target).map(v=>v.x);m.validCount=m.valid.length;m.validMax=m.valid.at(-1);m.numericResult=m.validMax;assert.ok(m.numericResult);const selected=[...m.polynomial.raw];selected[0]-=m.numericResult;m.chosenDigits=runs(normalize(selected,m.base));m.complementDigits=expand(m.numericResult-1,m.base).reverse();
 }else{
 m.kind='power-digits';m.digits=normalize(m.polynomial.raw,m.base);m.length=m.digits.length;m.runs=runs(m.digits);m.histogram={};for(const d of m.digits)m.histogram[d]=(m.histogram[d]||0)+1;
 m.predicate=s.includes('с числовым значением, превышающим 9')?'above9':s.includes('с чётным числовым значением')?'even':'digit';const q=s.match(/цифр\s*«?(\d+)/);m.target=m.predicate==='digit'?(q?+q[1]:s.includes('единиц')?1:0):null;m.sumDigits=s.includes('сумму всех цифр');const selected=m.digits.filter(d=>m.predicate==='above9'?d>9:m.predicate==='even'?d%2===0:d===m.target);m.numericResult=m.sumDigits?selected.reduce((a,b)=>a+b,0):selected.length;
 }
 }
 m.answer=String(m.numericResult);
 const rows=[...task.fragment.matchAll(/<tr\b[^>]*class=['"]active-distractor['"][\s\S]*?<\/tr>/gi)];if(rows.length){const {seoPlainText}=require('../../lib/seo-text');m.choices=rows.map(r=>{const text=seoPlainText(r[0].replace(/<sub\b[^>]*>[\s\S]*?<\/sub>/gi,''));const q=get(text,/^(\d)\)\s*(\d+)$/);return {index:+q[1],value:q[2]};});const chosen=m.choices.filter(c=>c.value===m.answer);assert.equal(chosen.length,1);m.answer=String(chosen[0].index);}
 cache.set(task.fragment,m);return m;
}
const sup=n=>String(n).replace(/[0-9]/g,d=>SUP[+d]);
const sub=n=>String(n).replace(/[0-9]/g,d=>SUB[+d]);
function auditNumeral(task,record){
 const m=parseNumeral(task),s=record.solution,lines=[];assert.ok(!m.needsReview,task.id+': unresolved condition');assert.equal(record.answer,m.answer,task.id+': answer');
 const has=t=>{assert.ok(s.includes(t),task.id+': missing proof '+t);lines.push(t);};
 const power=(b,n)=>String(b)+sup(n);
 const runProof=rs=>{for(const r of rs)has(`Разряды ${r.last}…${r.first}: цифра ${r.digit}; количество ${r.last} − ${r.first} + 1 = ${r.count}.`);};
 const positional=(c,b)=>{const ds=[...c].map(x=>parseInt(x,36)),terms=ds.map((d,i)=>`${d} · ${power(b,c.length-1-i)}`),values=ds.map((d,i)=>d*b**(c.length-1-i));has(`${c}${sub(b)} = ${terms.join(' + ')}.`);has(`В десятичной записи: ${values.join(' + ')} = ${values.reduce((a,b)=>a+b,0)}.`);};
 if(m.kind==='power-digits'){
 has(`N = ${m.expression}.`);has(`Основание записи: b = ${m.base}.`);
 for(const t of m.polynomial.terms)has(`Слагаемое ${t.term.replaceAll('*',' · ').replaceAll('-','−')} = ${t.coefficient} · ${power(m.base,t.exponent)}.`);
 has(`Для каждого коэффициента c записываем c = ${m.base} · q + r, где 0 ≤ r ≤ ${m.base-1}.`);has('Отрицательное q означает заимствование.');runProof(m.runs);
 const selected=m.runs.filter(r=>m.predicate==='above9'?r.digit>9:m.predicate==='even'?r.digit%2===0:r.digit===m.target),terms=selected.map(r=>m.sumDigits?`${r.digit} · ${r.count}`:r.count);
 has((m.sumDigits?'Сумма значений выбранных цифр: ':'Количество выбранных цифр: ')+(terms.join(' + ')||'0')+` = ${m.answer}.`);
 has(`Всего разрядов: ${m.runs.map(r=>r.count).join(' + ')} = ${m.length}.`);has('Все диапазоны смежные и не пересекаются');
 }else if(m.kind==='variable-zero-count'){
 has(`N = ${m.expression}.`);has(`Допустимые значения: 1 ≤ x ≤ ${m.limit}.`);has(`${power(m.base,m.lowWidth)} − x = (${power(m.base,m.lowWidth)} − 1) − y.`);
 has(`Общее число нулей: z(x) = ${m.fixedZeros} + количество цифр ${m.base-1} в записи x − 1.`);
 const rs=runs(m.prefix).map(r=>({...r,first:r.first+m.lowWidth,last:r.last+m.lowWidth}));runProof(rs);
 for(const r of m.counts)has(`Нулей ${r.zeros}: значений x — ${r.count}; наибольшее x = ${r.maxX}.`);
 has(`Проверка полноты: ${m.counts.map(r=>r.count).join(' + ')} = ${m.limit}; проверены все допустимые x.`);
 has(`Требуемое число нулей: ${m.target}.`);if(m.maximizeZeros)has('Это наибольшее значение в таблице.');has(`Среди ${m.validCount} подходящих значений наибольшее x = ${m.answer}.`);
 has(`y = ${m.answer} − 1 = ${Number(m.answer)-1}.`);has(`Цифры y в основании ${m.base}, от старшей к младшей: ${m.complementDigits.join(', ')}.`);
 has(`Цифра ${m.base-1} встречается ${m.target-m.fixedZeros} раз; нулей в N получается ${m.fixedZeros} + ${m.target-m.fixedZeros} = ${m.target}.`);
 }else if(m.kind==='unknown-digit'){
 has(`Основание b = ${m.base}, поэтому 0 ≤ x ≤ ${m.base-1}.`);
 for(let i=0;i<m.codes.length;i++){const c=m.codes[i],a=m.affine[i],terms=[...c].map((d,j)=>`${d} · ${power(m.base,c.length-1-j)}`);has(`${c}${sub(m.base)} = ${terms.join(' + ')} = ${a.constant} + ${a.coefficient} · x.`);}
 has(`Сумма S(x) = ${m.constant} + ${m.coefficient} · x.`);has(`Остаток постоянной части: ${m.constant%m.divisor}; остаток коэффициента x: ${m.coefficient%m.divisor}.`);
 for(const r of m.table)has(`x = ${r.x}: остаток ${r.remainder}.`);has(`Подходящие значения x: ${m.valid.join(', ')}.`);
 has(`Выбираем ${m.extreme==='min'?'наименьшее':'наибольшее'}: x = ${m.chosen}.`);has(`S(${m.chosen}) = ${m.constant} + ${m.coefficient} · ${m.chosen} = ${m.total}.`);has(`Q = ⟦${m.total}¦${m.divisor}⟧ = ${m.answer}.`);has(`Проверка: ${m.answer} · ${m.divisor} = ${m.total}.`);
 }else if(m.kind==='open-interval'){
 positional(m.leftCode,m.leftBase);positional(m.rightCode,m.rightBase);has(`Все подходящие числа: ${m.integers.join(', ')}.`);has(`Количество: (${m.upper} − 1) − (${m.lower} + 1) + 1 = ${m.answer}.`);has(`строго больше ${m.lower} и строго меньше ${m.upper}`);has('Обе границы целые, поэтому они не входят в перечень.');
 }else if(m.kind==='hex-difference'){
 positional(m.leftCode,16);positional(m.rightCode,16);has(`D = ${m.left} − ${m.right} = ${m.answer}.`);has(`${m.right} + ${m.answer} = ${m.left}.`);has('В ответе требуется десятичное значение');
 }else if(['mixed-sum','binary-count'].includes(m.kind)){
 let n;if(m.kind==='mixed-sum'){positional(m.hex,16);positional(m.octal,8);has(`S = ${m.left} + ${m.right} = ${m.sum}.`);n=m.sum;}else{positional(m.sourceCode,m.sourceBase);n=m.decimal;}
 while(n){const q=Math.floor(n/2),r=n-q*2;has(`${n} = 2 · ${q} + ${r}.`);n=q;}
 has(`Двоичная запись: ${m.binary}₂.`);positional(m.binary,2);has('Ведущий разряд равен единице: незначащие нули перед числом не приписываем.');
 if(m.kind==='binary-count'){const pos=[...m.binary].reverse().map((d,i)=>+d===m.target?i:null).filter(v=>v!==null);has(`Номера разрядов с цифрой ${m.target}: ${pos.join(', ')}.`);has(`Искомое количество: ${m.numericResult}.`);}
 if(m.choices){for(const c of m.choices)has(`Вариант ${c.index}: ${c.value}${String(c.index)===m.answer?' — совпадает.':' — не совпадает.'}`);has(`Записываем номер подходящего варианта: ${m.answer}.`);}
 }else if(m.kind==='ending-bases'){
 has(`${m.decimal} = b · q + ${m.last}`);has(`b · q = ${m.decimal} − ${m.last} = ${m.difference}.`);has(`строго больше последней цифры ${m.last}.`);has(`Положительные делители: ${m.divisors.join(', ')}.`);has(`После ограничения на цифру остаются: ${m.bases.join(', ')}.`);
 for(const b of m.bases)has(`b = ${b}: ${m.decimal} = ${b} · ${m.difference/b} + ${m.last}.`);has('Перечень делителей полон');
 }else if(m.kind==='binary-ending'){
 positional(m.ending,2);has(`n = ${m.modulus} · q + ${m.remainder}`);has(`n ≤ ${m.limit}, поэтому ${m.modulus} · q ≤ ${m.limit-m.remainder}.`);has(`Допустимые q: 0…${Math.floor((m.limit-m.remainder)/m.modulus)}.`);has(`Получаем числа: ${m.values.join(', ')}.`);for(const n of m.values)has(`${n}₁₀ = ${expand(n,2).reverse().join('')}₂.`);has(`Следующее число этой последовательности — ${m.values.at(-1)+m.modulus}; оно уже больше ${m.limit}.`);
 }else if(m.kind==='unknown-base'){
 has(`${m.code} = 1 · b² + 0 · b + 1 = b² + 1.`);has(`b² = ${m.decimal} − 1 = ${m.decimal-1}.`);has(`Целые корни уравнения: b = ${m.base} и b = −${m.base}.`);has('Отрицательный корень не подходит.');has(`1 · ${power(m.base,2)} + 0 · ${m.base} + 1 = ${m.base*m.base} + 0 + 1 = ${m.decimal}.`);has('квадрат положительного основания строго возрастает');
 }else assert.fail('Unknown numeral kind');
 return {kind:m.kind,answer:m.answer,proofLines:lines.length,lines};
}
function auditNumeralPrimaryImage(task,source,root) {
 const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
 assert.equal(task.id,'EGEINFBA5430','Unreviewed primary image');
 const review=source.primaryImageReview;
 assert.ok(review?.reviewed);
 assert.equal(review.transcription,parseNumeral(task).expression);
 const urls=[...task.fragment.split('КЭС:')[0].matchAll(/<img\b[^>]*src="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(urls.length,1);assert.deepEqual(review.files.map(f=>f.src),urls);
 for(const file of review.files){
  assert.ok(file.src.startsWith('/fipi/ege-informatics/'));
  const local=path.resolve(root,'fipi-assets',decodeURIComponent(file.src.slice('/fipi/'.length)));
  assert.ok(local.startsWith(path.resolve(root,'fipi-assets/ege-informatics')+path.sep));
  assert.equal(createHash('sha256').update(fs.readFileSync(local)).digest('hex'),file.sha256,'Changed primary image');
 }
}
module.exports={auditNumeral,parseNumeral,auditNumeralPrimaryImage,polynomial,normalize,expand,runs};
