'use strict';
const assert = require('node:assert/strict');
const {conditionText, seoPlainText} = require('../../lib/seo-text');
const cache = new Map();
const superscript = n => String(n).replace(/\d/g, d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)]);
const power = n => '2' + superscript(n);
const take = (s, re, group = 1) => { const m = s.match(re); assert.ok(m, 'Cannot parse ' + re + ': ' + s); return m[group]; };
const val = (s, re, group) => Number(take(s, re, group));
function width(n) {
  let capacity = 1, b = 0;
  while (capacity < n) { capacity *= 2; b++; }
  return b;
}
function bytes(n) {
  // Fill complete bytes and allocate a final byte only if bits remain.
  const whole = Math.floor(n / 8);
  return whole + (n % 8 ? 1 : 0);
}
function alphabet(s) {
  const local = s.match(/(\d+) различных букв местного алфавита/);
  if (local) { const n = Number(local[1]); return [10,n,n]; }
  const declared = s.match(/формирования пароля используют (\d+)-символьный алфавит/);
  if (declared) {
    const parts = [10,26,26,val(s, /(\d+)-символьного набора/)];
    assert.equal(parts.reduce((a,b)=>a+b,0),Number(declared[1])); return parts;
  }
  const special = s.match(/(\d+)-символьного (?:специального алфавита|набора|алфавита)/);
  if (special) {
    const p=[];
    if (/десятичны[ех] цифр/.test(s)) p.push(10);
    if (/семнадцатеричной/.test(s)) p.push(17);
    const latin=s.match(/(\d+) латински[а-яё]* букв/); if(latin)p.push(Number(latin[1]));
    p.push(Number(special[1])); return p;
  }
  if (/автомобильный номер/i.test(s)) return [10,val(s,/используется (\d+) различны[а-яё]* букв/)];
  if (/только символы /.test(s)) {
    const count = new Set(take(s,/только символы ([^.(]+)/).split(',').map(c=>c.trim()).filter(Boolean)).size;
    const explicit = s.match(/используется (\d+) различных символов/);
    if (explicit) assert.equal(count, Number(explicit[1]));
    return [count];
  }
  return [val(s,/(\d+) различн[а-яё]* (?:символ|букв)/)];
}
function parseVolume(task) {
  if (cache.has(task.fragment)) return cache.get(task.fragment);
  const s=conditionText(task.fragment).replace(/(?<=\d)\s+(?=\d)/g,''),m={id:task.id,choices:[]};
  for (const row of task.fragment.matchAll(/<tr\b[^>]*class=['"]active-distractor['"][\s\S]*?<\/tr>/gi)) {
    const text=seoPlainText(row[0]);const q=text.match(/^(\d)\)\s*([\d\s]+?)\s*(Кбайт[а-я]*|байт[а-я]*|бит[а-я]*)?$/u);
    assert.ok(q,'Choice: '+text);m.choices.push({index:Number(q[1]),value:Number(q[2].replace(/\s/g,'')),unit:q[3]||''});
  }
  if (/двухбайтным словом|кодируется двумя байтами|кодируется 16-ю битами/.test(s)) {
    const paragraphs=[...task.fragment.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(p=>seoPlainText(p[1]));
    m.sentence=paragraphs.find(p=>/^(?:Без труда|Без охоты|Один пуд|Привычка свыше)/.test(p));assert.ok(m.sentence);
    m.kind='text';m.symbolBits=16;m.length=Array.from(m.sentence).length;m.totalBits=m.length*16;
  } else if (/Метеорологическая|В велокроссе|В марафоне|Для передачи секретного сообщения/.test(s)) {
    m.kind='bitstream';
    if (/Метеорологическая/.test(s)) {
      const range=s.match(/от (\d+) до (\d+)/);
      if(range){m.range=range.slice(1).map(Number);m.alphabet=m.range[1]-m.range[0]+1;}
      else m.alphabet=val(s,/одно из (\d+) возможных/);
      m.count=val(s,/сделала (\d+) измерений/);
    } else if (/секретного сообщения/.test(s)) {
      m.alphabet=val(s,/(\d+) различн[а-яё]* (?:символ|букв)/);m.count=val(s,/длиной в (\d+) символов/);
    } else {m.alphabet=val(s,/участвуют (\d+)/);m.count=val(s,/прошли (\d+)/);}
    m.symbolBits=width(m.alphabet);m.totalBits=m.count*m.symbolBits;
  } else if (/возможную (?:мощность алфавита|длину серийного номера)/.test(s)) {
    m.kind=/мощность алфавита/.test(s)?'alphabet-bound':'length-bound';m.minimum=/минимально возможную/.test(s);
    m.count=val(s,/Известно, что (?:для хранения )?(\d+) серийн/);
    const limit=s.match(/(не более|не менее|более|менее) (\d+) ([КМГ])байт/);assert.ok(limit);
    m.comparison=limit[1];m.limitValue=Number(limit[2]);m.unit=limit[3]+'байт';m.scale=1024**({'К':1,'М':2,'Г':3}[limit[3]]);m.limit=m.limitValue*m.scale;
    const lower=['не менее','более'].includes(m.comparison);assert.equal(m.minimum,lower);
    // Invert the memory inequality analytically. This does not enumerate
    // candidate lengths or bit widths as the preparation script does.
    const q=m.limit/m.count;
    m.byteBoundary=m.comparison==='более'?Math.floor(q)+1:m.comparison==='не менее'?Math.ceil(q):m.comparison==='менее'?Math.ceil(q)-1:Math.floor(q);
    let divisor;
    if(m.kind==='alphabet-bound'){m.length=val(s,/состоящи[йх] из (\d+) символов/);divisor=m.length;}
    else {m.parts=alphabet(s);m.alphabet=m.parts.reduce((a,b)=>a+b,0);m.symbolBits=width(m.alphabet);divisor=m.symbolBits;}
    const bound=lower?Math.floor(8*(m.byteBoundary-1)/divisor)+1:Math.floor(8*m.byteBoundary/divisor);
    assert.ok(bound>0);
    if(m.kind==='alphabet-bound'){m.symbolBits=bound;m.alphabet=lower?2**(bound-1)+1:2**bound;m.answer=String(m.alphabet);}
    else {m.length=bound;m.answer=String(bound);}
    const fit=n=>m.comparison==='более'?n>m.limit:m.comparison==='не менее'?n>=m.limit:m.comparison==='менее'?n<m.limit:n<=m.limit;
    m.boundary=[bound,bound+(lower?-1:1)].map(value=>{const payload=value*divisor,r=bytes(payload);return {value,payload,bytes:r,total:r*m.count,fits:fit(r*m.count)};});
    assert.ok(m.boundary[0].fits&&!m.boundary[1].fits);
  } else {
    if (/за которыми следуют/.test(s)) {
      m.kind='plate-split';m.digitCount=4;m.letterCount=val(s,/следуют (\d+) букв/);
      m.digits=val(s,/считаются (\d+) цифр/);m.letters=val(s,/и (\d+) заглавных/);m.digitBits=width(m.digits);m.letterBits=width(m.letters);
      m.payloadBits=4*m.digitBits+m.letterCount*m.letterBits;m.count=val(s,/хранения (\d+) автомобильных/);
    } else {
      m.kind=/Сколько байт выделено для хранения дополнительных/.test(s)?'record-extra':'record-total';
      m.parts=alphabet(s);m.alphabet=m.parts.reduce((a,b)=>a+b,0);m.symbolBits=width(m.alphabet);
      const length=take(s,/(?:состоящи[йх] из|длиной|ровно) (\d+|семи|шести) символ/);
      m.length=length==='семи'?7:length==='шести'?6:Number(length);m.payloadBits=m.length*m.symbolBits;
      m.count=val(s,/(?:хранени[ея]|записи) (?:(?:данных|сведений) о |паролей )?(\d+) (?:пользоват|объект|идентификатор|парол|номер)/);
    }
    m.recordBytes=bytes(m.payloadBits);
    if(m.kind==='record-extra') {
      m.totalBytes=val(s,/потребовалось (\d+) байт/);assert.equal(m.totalBytes%m.count,0);m.totalPerRecord=m.totalBytes/m.count;
      m.extraBytes=m.totalPerRecord-m.recordBytes;assert.ok(m.extraBytes>=0);m.answer=String(m.extraBytes);
    } else {
      const extra=s.match(/(?:отведено|выделено) (\d+) байт на одного пользователя/);m.extraBytes=extra?Number(extra[1]):0;
      m.totalBytes=(m.recordBytes+m.extraBytes)*m.count;
      const unit=s.match(/объём памяти \(в ([^)]+)\)/);m.outputUnit=unit?unit[1]:'байтах';m.divisor=({'Кбайт':1024,'Мбайт':1024**2,'байтах':1})[m.outputUnit];
      assert.equal(m.totalBytes%m.divisor,0);m.answer=String(m.totalBytes/m.divisor);
    }
  }
  if(m.choices.length) {
    assert.equal(m.choices.length,4);const total=m.totalBits??m.totalBytes*8;
    const choices=m.choices.filter(c=>c.value*(c.unit.startsWith('Кбайт')?8192:c.unit.startsWith('бит')?1:8)===total);assert.equal(choices.length,1,task.id+': choice');
    m.answer=String(choices[0].index);m.selected=choices[0];
  }
  assert.ok(m.answer,task.id);cache.set(task.fragment,m);return m;
}
function auditVolume(task,record) {
  const m=parseVolume(task),s=record.solution,lines=[];
  assert.equal(record.answer,m.answer,task.id+': answer');
  const has=t=>{assert.ok(s.includes(t),task.id+': missing proof '+t);lines.push(t);};
  const bitProof=(a,k)=>{has(`${power(k-1)} = ${2**(k-1)} — недостаточно для ${a} значений.`);has(`${power(k)} = ${2**k} — достаточно для ${a} значений.`);};
  if(m.parts){has(`Алфавит: N = ${m.parts.join(' + ')} = ${m.alphabet}.`);bitProof(m.alphabet,m.symbolBits);}
  if(m.kind==='text') {
    has('«'+m.sentence+'»');const words=m.sentence.split(' '),sizes=words.map(w=>Array.from(w).length),spaces=words.length-1,total=sizes.reduce((a,b)=>a+b,0);
    for(let i=0;i<words.length;i++)has(`«${words[i]}»: ${sizes[i]}`);
    has(`Символов без пробелов: ${sizes.join(' + ')} = ${total}.`);has(`Пробелов: ${spaces}.`);has(`Всего символов: ${total} + ${spaces} = ${m.length}.`);
    has(`В битах: I = ${m.length} · 16 = ${m.totalBits} бит.`);has(`В байтах: I = ${m.length} · 2 = ${m.length*2} байт.`);has(`Проверка: ${m.length*2} · 8 = ${m.totalBits} бит.`);
  } else if(m.kind==='bitstream') {
    bitProof(m.alphabet,m.symbolBits);if(m.range)has(`N = ${m.range[1]} − ${m.range[0]} + 1 = ${m.alphabet}.`);
    has(`Записано ${m.count} значений.`);has('I = K · b.');
    has(`Поток: I = ${m.count} · ${m.symbolBits} = ${m.totalBits} бит.`);has(`Проверка: ⟦${m.totalBits}¦${m.count}⟧ = ${m.symbolBits} бит на значение.`);
    if(m.totalBits%8===0)has(`Перевод в байты: ⟦${m.totalBits}¦8⟧ = ${m.totalBits/8} байт.`);
  } else if(m.kind.endsWith('-bound')) {
    has(`Граница памяти: ${m.limitValue} ${m.unit} = ${m.limitValue} · ${m.scale} = ${m.limit} байт.`);
    has(`Требование условия: общий объём ${m.comparison} ${m.limit} байт.`);
    for(const c of m.boundary) {
      const a=m.kind==='alphabet-bound'?m.length:c.value,k=m.kind==='alphabet-bound'?c.value:m.symbolBits;
      has(`Кандидат ${c.value} ${m.kind==='alphabet-bound'?'бит на символ':'символов в номере'}:`);
      has(`Биты: ${a} · ${k} = ${c.payload}.`);has(`Байты: ⟦${c.payload}¦8⟧ → ${c.bytes}.`);
      has(`Границы округления: ${c.bytes-1} · 8 = ${(c.bytes-1)*8} — недостаточно; ${c.bytes} · 8 = ${c.bytes*8} — достаточно.`);
      has(`Общий объём: ${m.count} · ${c.bytes} = ${c.total} байт.`);
    }
    const flags=[...s.matchAll(/Условие «([^»]+)» (выполнено|не выполнено)\./g)];assert.equal(flags.length,2);
    flags.forEach((f,i)=>{assert.equal(f[1],`${m.comparison} ${m.limit}`);assert.equal(f[2],i?'не выполнено':'выполнено');lines.push(f[0]);});
    if(m.kind==='alphabet-bound') {
      has(`N больше ${power(m.symbolBits-1)} = ${2**(m.symbolBits-1)}, но не превосходит ${power(m.symbolBits)} = ${2**m.symbolBits}.`);
      has(m.minimum?`Минимальная мощность: N = ${power(m.symbolBits-1)} + 1 = ${m.answer}.`:`Максимальная мощность: N = ${power(m.symbolBits)} = ${m.answer}.`);
    } else has(`Граничная длина номера: L = ${m.length} символов.`);
    has('Из монотонности общего объёма следует');
  } else {
    if(m.kind==='plate-split') {
      bitProof(m.digits,m.digitBits);bitProof(m.letters,m.letterBits);
      has(`Сумма битов номера: Q = 4 · ${m.digitBits} + ${m.letterCount} · ${m.letterBits} = ${m.payloadBits} бит.`);
    } else has(`Биты записи: Q = ${m.length} · ${m.symbolBits} = ${m.payloadBits} бит.`);
    const q=m.payloadBits,r=m.recordBytes;
    has(`Округление: ⟦${q}¦8⟧ → ${r} байт.`);has(`Проверка округления: ${r-1} · 8 = ${(r-1)*8} бит — недостаточно; ${r} · 8 = ${r*8} бит — достаточно.`);
    has(`Неиспользованный остаток одной записи: ${r*8} − ${q} = ${r*8-q} бит.`);
    if(m.kind==='record-extra') {
      has(`Полная запись: R = ⟦${m.totalBytes}¦${m.count}⟧ = ${m.totalPerRecord} байт.`);
      has(`Дополнительные сведения: D = ${m.totalPerRecord} − ${r} = ${m.extraBytes} байт.`);
      has(`Проверка общего объёма: ${m.count} · (${r} + ${m.extraBytes}) = ${m.totalBytes} байт.`);
    } else {
      has(`Всего: B = ${m.count} · (${r} + ${m.extraBytes}) = ${m.totalBytes} байт.`);
      has(`Проверка: ⟦${m.totalBytes}¦${m.count}⟧ − ${m.extraBytes} = ${r} байт`);
      if(m.divisor>1)has(`В требуемой единице: ⟦${m.totalBytes}¦${m.divisor}⟧ = ${m.answer} ${m.outputUnit}.`);
    }
  }
  if(m.selected)has(`Подходящий вариант — ${m.answer}: ${m.selected.value} ${m.selected.unit||'байт'}.`);
  return {kind:m.kind,answer:m.answer,proofLines:lines.length,lines};
}
module.exports={auditVolume,parseVolume};
