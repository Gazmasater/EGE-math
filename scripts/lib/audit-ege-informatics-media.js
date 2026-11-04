'use strict';
const assert=require('node:assert/strict');
const {conditionText,seoPlainText}=require('../../lib/seo-text');
const SUP='⁰¹²³⁴⁵⁶⁷⁸⁹';
const gcd=(a,b)=>b?gcd(b,a%b):a<0n?-a:a;
class Q {
 constructor(n,d=1n){n=BigInt(n);d=BigInt(d);assert.notEqual(d,0n);if(d<0n){n=-n;d=-d;}const g=gcd(n,d);this.n=n/g;this.d=d/g;}
 static from(x){if(x instanceof Q)return x;const s=String(x).replace(',','.');if(s.includes('.')){const a=s.split('.');return new Q(a.join(''),10n**BigInt(a[1].length));}return new Q(s);}
 add(x){x=Q.from(x);return new Q(this.n*x.d+x.n*this.d,this.d*x.d);}
 neg(){return new Q(-this.n,this.d);}
 sub(x){return this.add(Q.from(x).neg());}
 mul(x){x=Q.from(x);return new Q(this.n*x.n,this.d*x.d);}
 div(x){x=Q.from(x);return new Q(this.n*x.d,this.d*x.n);}
 floor(){assert.ok(this.n>=0n);return this.n/this.d;}
 ceil(){return this.floor()+(this.n%this.d?1n:0n);}
 integer(){assert.equal(this.d,1n);return this.n;}
 gt(x){return this.sub(x).n>0n;}
 eq(x){return this.sub(x).n===0n;}
 toJSON(){return this.d===1n?Number(this.n):{numerator:Number(this.n),denominator:Number(this.d)};}
}
const get=(s,r)=>{const q=s.match(r);assert.ok(q,r+': '+s);return q;};
const num=(s,r)=>Number(get(s,r)[1]);
const width=n=>{let i=0,space=1;while(space<n){space*=2;i++;}return i;};
function parse(t){
 const s=conditionText(t.fragment).replace(/(?<=\d)\s+(?=\d)/g,''),m={id:t.id};const dims=[...s.matchAll(/(\d+)\s*(?:×|´|на)\s*(\d+) пиксел/g)].map(q=>[+q[1],+q[2]]);let value;
 if(s.startsWith('Впишите правильный ответ. Документ')){
  if(s.includes('Документ объёмом')){
   const token=get(s,/составляет (2[⁰¹²³⁴⁵⁶⁷⁸⁹]+|\d+)\s*бит/)[1];if(/^\d+$/.test(token))return {id:t.id,kind:'archive-compare',needsReview:true};
   m.kind='archive-compare';m.sizeMB=num(s,/объёмом (\d+) Мбайт/);m.rateExponent=Number([...token.slice(1)].map(c=>SUP.indexOf(c)).join(''));m.rate=2**m.rateExponent;m.percent=num(s,/равен (\d+)%/);m.packSeconds=num(s,/на сжатие документа, [–—-] (\d+) секунд/);m.unpackSeconds=num(s,/на распаковку [–—-] (\d+) секунд/);
   // Work in the number of uncompressed bits saved; compare it directly with
   // the channel capacity during packing/unpacking, before dividing by speed.
   m.originalBits=m.sizeMB*8*1024**2;m.savedBits=Q.from(m.originalBits).mul(100-m.percent).div(100);m.overheadBits=(m.packSeconds+m.unpackSeconds)*m.rate;const advantage=m.savedBits.sub(m.overheadBits);m.signedAdvantageSeconds=advantage.div(m.rate);value=m.signedAdvantageSeconds.integer();m.answer=(value>0n?'А':'Б')+String(value>0n?value:-value);m.plainSeconds=Q.from(m.originalBits).div(m.rate);m.archiveSeconds=m.plainSeconds.sub(m.signedAdvantageSeconds);
  }else{
   m.kind='archive-overhead';const q=get(s,/за (\d+) (секунд|минут)/);m.plainSeconds=+q[1]*(q[2]==='минут'?60:1);m.totalSeconds=num(s,/составит (\d+) секунд/);m.percent=num(s,/составляет (\d+)%/);value=Q.from(m.totalSeconds).mul(100).sub(m.plainSeconds*m.percent).div(100);m.transferSeconds=Q.from(m.plainSeconds).mul(m.percent).div(100);
  }
 }else if(s.includes('ADSL-соединение')){
  m.kind='adsl-volume';m.rate=num(s,/равна (\d+) бит/);m.minutes=num(s,/заняла (\d+) минут/);m.totalBits=m.rate*m.minutes*60;value=Q.from(m.rate).div(8).div(1024).mul(m.minutes).mul(60);
 }else if(s.includes('Музыкальный фрагмент')){
  m.resolutionFactor=Q.from(get(s,/разрешением в ([\d,]+) раза выше/)[1]);m.frequencyDivisor=Q.from(get(s,/дискретизации в ([\d,]+) раза меньше/)[1]);
  if(s.includes('в город А')){m.kind='audio-transfer-ratio';m.originalSeconds=num(s,/за (\d+) секунд/);m.channelFactor=Q.from(get(s,/городом Б в ([\d,]+) раза выше/)[1]);value=Q.from(m.originalSeconds).mul(m.resolutionFactor).div(m.frequencyDivisor.mul(m.channelFactor));}
  else{m.kind='audio-volume-ratio';m.oldChannels=s.includes('в формате квадро')?4:2;assert.ok(s.includes('в формате моно'));m.newChannels=1;m.originalMB=num(s,/файла [–—-] (\d+) Мбайт/);value=Q.from(m.originalMB).div(m.oldChannels).mul(m.resolutionFactor).div(m.frequencyDivisor);}
 }else if(s.includes('Производилась четырёхканальная')){
  m.kind='audio-duration';m.channels=4;m.frequency=num(s,/дискретизации (\d+) кГц/)*1000;m.depth=num(s,/(\d+)-битным/);m.sizeMB=num(s,/размером (\d+) Мбайт/);m.bitsPerMinute=m.channels*m.frequency*m.depth*60;const bits=m.sizeMB*1024**2*8;m.exactMinutes=Q.from(bits).div(m.bitsPerMinute);const floor=m.exactMinutes.floor();value=Q.from(bits).sub(Q.from(floor).mul(m.bitsPerMinute)).mul(2).gt(m.bitsPerMinute-1)?floor+1n:floor;
  assert.ok(!Q.from(value).sub(m.exactMinutes).gt(new Q(1,2)));assert.ok(!m.exactMinutes.sub(value).gt(new Q(1,2)));
 }else if(s.includes('Лена записывает')){
  m.kind='audio-memory';m.frequency=num(s,/дискретизации (\d+) Гц/);m.depth=num(s,/кодирования (\d+) бит/);m.channels=2;const q=get(s,/длительность [–—-] (\d+) минут[а-я]* (\d+) секунд/);m.minutes=+q[1];m.secondsPart=+q[2];m.durationSeconds=m.minutes*60+m.secondsPart;m.totalBits=m.durationSeconds*m.channels*m.frequency*m.depth;m.exactKB=Q.from(m.totalBits).div(8192);value=m.exactKB.ceil();assert.ok(Q.from(value).mul(8192).sub(m.totalBits).n>=0n);assert.ok(Q.from(value-1n).mul(8192).sub(m.totalBits).n<0n);
 }else if(s.includes('Голосовое сообщение')){
  m.kind='audio-send';m.durationSeconds=num(s,/продолжительностью (\d+) с/);m.depth=num(s,/кодирования (\d+) бит/);m.frequency=num(s,/дискретизации (\d+) измерений/);m.rate=num(s,/которого (\d+) бит/);m.channels=2;m.totalBits=m.durationSeconds*2*m.depth*m.frequency;value=Q.from(m.durationSeconds).mul(m.frequency).div(m.rate).mul(m.depth*2);
 }else if(s.includes('Виталий')){
  assert.equal(dims.length,2);m.kind='image-savings';m.dimensions=dims;m.oldDepth=Number([...get(s,/из 2([⁰¹²³⁴⁵⁶⁷⁸⁹]+) цветов/)[1]].map(c=>SUP.indexOf(c)).join(''));m.newDepth=num(s,/глубину цвета (\d+) бит/);m.count=num(s,/передаче (\d+) фотографий/);m.oldBits=dims[0][0]*dims[0][1]*m.oldDepth;m.newBits=dims[1][0]*dims[1][1]*m.newDepth;m.savedBits=(m.oldBits-m.newBits)*m.count;assert.ok(m.savedBits>0);m.exactKB=Q.from(m.savedBits).div(8192);value=m.exactKB.floor();assert.ok(Q.from(value).mul(8192).sub(m.savedBits).n<=0n);assert.ok(Q.from(value+1n).mul(8192).gt(m.savedBits));
 }else if(s.includes('Прибор автоматической фиксации')){
  assert.equal(dims.length,1);m.dimensions=dims[0];m.colors=num(s,/из (\d+) цветов/);m.depth=width(m.colors);m.rate=num(s,/данных (\d+) бит/);m.imageBits=dims[0][0]*dims[0][1]*m.depth;
  if(s.includes('по несколько штук')){m.kind='image-packet-count';m.maxSeconds=num(s,/более (\d+) секунд/);m.packetCapacityBits=m.rate*m.maxSeconds;let count=0;while((count+1)*m.imageBits<=m.packetCapacityBits)count++;value=BigInt(count);assert.ok(count*m.imageBits<=m.packetCapacityBits&&(count+1)*m.imageBits>m.packetCapacityBits);}
  else{m.kind='image-packet-time';m.count=num(s,/по (\d+) шт/);m.packetBits=m.count*m.imageBits;m.exactSeconds=Q.from(m.packetBits).div(m.rate);value=m.exactSeconds.floor();assert.ok(Q.from(value).mul(m.rate).sub(m.packetBits).n<=0n);assert.ok(Q.from(value+1n).mul(m.rate).gt(m.packetBits));}
 }else if(s.includes('обычному модему')){
  assert.equal(dims.length,1);m.kind='image-send';m.dimensions=dims[0];m.rate=num(s,/скоростью (\d+) бит/);m.byteDepth=num(s,/кодируется (\d+) байт/);m.imageBits=dims[0][0]*dims[0][1]*m.byteDepth*8;value=Q.from(dims[0][0]).mul(dims[0][1]).div(m.rate).mul(m.byteDepth*8);
 }else if(s.includes('зеленую составляющую')){
  assert.deepEqual(dims,[[8,8]]);assert.ok(s.includes('по пять бит'));m.kind='rgb-component';m.dimensions=dims[0];m.bytes=num(s,/занимает (\d+) байт/);m.red=5;m.blue=5;m.totalDepth=Q.from(m.bytes).mul(8).div(64);value=Q.from(m.bytes*8-64*(m.red+m.blue)).div(64);
 }else if(s.includes('минимальный объем памяти')||s.includes('минимальный объём памяти')){
  assert.equal(dims.length,1);m.kind='image-memory';m.dimensions=dims[0];m.colors=num(s,/(?:палитра из |использоваться )(\d+) (?:различных )?цвет/);m.depth=width(m.colors);m.totalBits=dims[0][0]*dims[0][1]*m.depth;value=Q.from(dims[0][0]).div(1024).mul(dims[0][1]).mul(m.depth).div(8);
 }else{
  assert.equal(dims.length,1);assert.match(s,/максимальн[а-я]+(?: возможное)? (?:количество|число) цветов/);m.kind='image-colors';m.dimensions=dims[0];const cap=get(s,/(\d+(?:,\d+)?) (Мбайт|Кбайт|байт)/);m.capacityValue=Q.from(cap[1]);m.capacityUnit=cap[2];m.allocatedBits=m.capacityValue.mul({'Мбайт':1024**2,'Кбайт':1024,'байт':1}[m.capacityUnit]).mul(8);m.compressionFactor=Q.from(1);
  if(s.includes('больше сжатого'))m.compressionFactor=Q.from(100+num(s,/больше сжатого на (\d+)%/)).div(100);
  if(s.includes('уменьшается'))m.compressionFactor=Q.from(100).div(100-num(s,/уменьшается на (\d+)%/));m.rawCapacityBits=m.allocatedBits.mul(m.compressionFactor);const pixels=dims[0][0]*dims[0][1];let depth=0;while(!Q.from(pixels*(depth+1)).gt(m.rawCapacityBits)){depth++;assert.ok(depth<64);}assert.ok(depth>0);m.depth=depth;m.candidateBits=pixels*depth;m.neighborBits=pixels*(depth+1);value=2n**BigInt(depth);assert.ok(!Q.from(m.candidateBits).gt(m.rawCapacityBits)&&Q.from(m.neighborBits).gt(m.rawCapacityBits));
 }
 if(!m.answer){value=Q.from(value).integer();m.numericResult=Number(value);m.answer=String(value);}
 const choices=[...t.fragment.matchAll(/<tr\b[^>]*class=['"]active-distractor['"][\s\S]*?<\/tr>/gi)].map(r=>{const q=get(seoPlainText(r[0]),/^(\d)\)\s*(\d+)$/);return {index:+q[1],value:+q[2]};});
 if(choices.length){const good=choices.filter(c=>c.value===m.numericResult);assert.equal(good.length,1);m.choices=choices;m.selectedValue=good[0].value;m.answer=String(good[0].index);}
 return m;
}

const show=x=>{x=Q.from(x);return x.d===1n?String(x.n):`⟦${x.n}¦${x.d}⟧`;};
const div=(a,b)=>`⟦${a}¦${b}⟧`;
const sup=n=>String(n).replace(/\d/g,d=>'⁰¹²³⁴⁵⁶⁷⁸⁹'[+d]);
function auditMedia(task,record){
 const m=parse(task),s=record.solution,lines=[];
 assert.ok(!m.needsReview,task.id+': unresolved rate');
 assert.equal(record.answer,m.answer,task.id+': answer');
 const has=line=>{assert.ok(s.includes(line),task.id+': missing proof '+line);lines.push(line);};
 const k=m.kind,v=Q.from(m.numericResult||0);
 has('1 байт = 8 бит, 1 Кбайт = 1024 байт = 8192 бит, 1 Мбайт = 1024² байт = 8388608 бит.');
 if(k==='archive-compare'){
  const orig=Q.from(m.originalBits),packed=orig.mul(m.percent).div(100),plain=Q.from(m.plainSeconds),arch=Q.from(m.archiveSeconds),p=m.percent,pack=m.packSeconds,unpack=m.unpackSeconds,rate=m.rate;
  const min=plain.gt(arch)?arch:plain,max=plain.gt(arch)?plain:arch;
  has(`V = ${m.sizeMB} · 8388608 = ${show(orig)} бит.`);
  has(`v = 2${sup(m.rateExponent)} = ${rate} бит в секунду.`);
  has('t = ⟦V¦v⟧.');has(`Без архиватора: tБ = ${div(show(orig),rate)} = ${show(plain)} с.`);
  has(`Vарх = V · ${div(p,100)}.`);has(`Vарх = ${show(orig)} · ${div(p,100)} = ${show(packed)} бит.`);
  has('tА = tсж + ⟦Vарх¦v⟧ + tрасп.');has(`tА = ${pack} + ${div(show(packed),rate)} + ${unpack} = ${show(arch)} с.`);
  has(`Быстрее способ ${m.answer[0]}, поскольку ${show(min)} с меньше ${show(max)} с.`);
  has(`Разность: ${show(max)} − ${show(min)} = ${show(max.sub(min))} с.`);
  has(`${show(plain)} · ${div(p,100)} + ${pack} + ${unpack} = ${show(arch)} с.`);
 }else if(k==='archive-overhead'){
  has('время передачи пропорционально объёму');
  has(`tарх = tисх · ${div(m.percent,100)} = ${m.plainSeconds} · ${div(m.percent,100)} = ${show(m.transferSeconds)} с.`);
  has('tобр = tвсего − tарх.');has(`tобр = ${m.totalSeconds} − ${show(m.transferSeconds)} = ${show(v)} с.`);
  has(`Проверка: ${show(v)} + ${show(m.transferSeconds)} = ${m.totalSeconds} с.`);
 }else if(k==='adsl-volume'){
  const t=m.minutes*60;
  has(`t = ${m.minutes} · 60 = ${t} с.`);has('V = v · t.');has(`V = ${m.rate} · ${t} = ${m.totalBits} бит.`);
  has(`V = ${div(m.totalBits,8192)} = ${show(v)} Кбайт.`);has(`${show(v)} · 8192 = ${m.totalBits} бит`);
  has(`v = ${div(m.rate,8)} = ${show(Q.from(m.rate).div(8))} байт в секунду.`);
  has(`V = ${show(Q.from(m.rate).div(8))} · ${t} = ${show(Q.from(m.totalBits).div(8))} байт.`);
  has(`${div(show(Q.from(m.totalBits).div(8)),1024)} = ${show(v)} Кбайт.`);
 }else if(k==='image-colors'){
  const [w,h]=m.dimensions,p=w*h,i=m.depth,cap=Q.from(m.allocatedBits),raw=Q.from(m.rawCapacityBits);
  has(`Отведено ${show(m.capacityValue)} ${m.capacityUnit}, то есть ${show(cap)} бит.`);
  if(!m.compressionFactor.eq(1))has(`V = ${show(cap)} · ${show(m.compressionFactor)} = ${show(raw)} бит.`);
  else has(`Без сжатия допустимый объём V = ${show(raw)} бит.`);
  has(`Пикселей: P = ${w} · ${h} = ${p}.`);has('P · i ≤ V.');
  has(`i ≤ ${div(show(raw),p)} = ${show(raw.div(p))}. Наибольшее целое i = ${i}.`);
  has(`Проверка допустимого значения: ${p} · ${i} = ${m.candidateBits} ≤ ${show(raw)}.`);
  has(`Следующее значение: ${p} · ${i+1} = ${m.neighborBits}, что больше ${show(raw)}.`);
  has(`N = 2${sup(i)} = ${show(v)}.`);has('верхняя граница достижима');
 }else if(['image-memory','image-packet-count','image-packet-time'].includes(k)){
  const [w,h]=m.dimensions,i=m.depth,bits=m.imageBits||m.totalBits;
  has('наименьшее целое i, для которого 2ⁱ ≥ N.');
  has(`2${sup(i-1)} = ${2**(i-1)} меньше ${m.colors}; 2${sup(i)} = ${2**i} ≥ ${m.colors}. Поэтому i = ${i} бит на пиксель.`);
  has('V = ширина · высота · i.');has(`V = ${w} · ${h} · ${i} = ${bits} бит.`);
  if(k==='image-memory'){
   has(`V = ${div(bits,8192)} = ${show(v)} Кбайт.`);has(`Проверка: ${show(v)} · 8192 = ${bits} бит.`);
   has('память для палитры по условию не учитывается');
  }else if(k==='image-packet-count'){
   const rate=m.rate,t=m.maxSeconds,cap=m.packetCapacityBits,n=m.numericResult;
   has('n · V ≤ v · t.');has(`Допустимый объём пакета: ${rate} · ${t} = ${cap} бит.`);
   has(`n ≤ ${div(cap,bits)} = ${show(Q.from(cap).div(bits))}. Наибольшее целое n = ${n}.`);
   has(`Проверка: ${n} · ${bits} = ${n*bits} ≤ ${cap}.`);
   has(`При ${n+1} снимках: ${n+1} · ${bits} = ${(n+1)*bits}, что больше ${cap}.`);has('Это доказывает максимальность.');
  }else{
   const rate=m.rate,total=m.packetBits,n=m.numericResult;
   has(`Vпак = ${m.count} · ${bits} = ${total} бит.`);has('t = ⟦Vпак¦v⟧.');
   has(`t = ${div(total,rate)} = ${show(m.exactSeconds)} с.`);
   has(`Проверка целой части: ${n} · ${rate} = ${n*rate} ≤ ${total}, а ${n+1} · ${rate} = ${(n+1)*rate}, что больше ${total}.`);
   has(`По условию нужна целая часть: ${n}.`);
  }
 }else if(k==='image-send'){
  const [w,h]=m.dimensions,byte=m.byteDepth,bits=m.imageBits,rate=m.rate;
  has(`Глубина цвета: ${byte} · 8 = ${byte*8} бит.`);has('V = ширина · высота · глубина цвета.');
  has(`V = ${w} · ${h} · ${byte*8} = ${bits} бит.`);has('t = ⟦V¦v⟧.');
  has(`t = ${div(bits,rate)} = ${show(v)} с.`);has(`Проверка: ${show(v)} · ${rate} = ${bits} бит`);
  has(`Получаем ${w} · ${h} · ${byte} = ${w*h*byte} байт.`);
  has(`${div(rate,8)} = ${show(Q.from(rate).div(8))} байт в секунду.`);
  has(`${show(v)} · ${show(Q.from(rate).div(8))} = ${w*h*byte} байт.`);
 }else if(k==='image-savings'){
  const [[w,h],[nw,nh]]=m.dimensions,old=m.oldDepth,depth=m.newDepth,n=m.numericResult,bits=m.savedBits;
  has(`Палитра 2${sup(old)} цветов требует ${old} бит на пиксель.`);
  has(`Vдо = ${w} · ${h} · ${old} = ${m.oldBits} бит.`);has(`Vпосле = ${nw} · ${nh} · ${depth} = ${m.newBits} бит.`);
  has('ΔV = (Vдо − Vпосле) · n.');has(`ΔV = (${m.oldBits} − ${m.newBits}) · ${m.count} = ${bits} бит.`);
  has(`ΔV = ${div(bits,8192)} = ${show(m.exactKB)} Кбайт.`);
  has(`Проверка: ${n} · 8192 = ${n*8192} ≤ ${bits}; ${n+1} · 8192 = ${(n+1)*8192}, что больше ${bits}.`);
  has(`Целая часть равна ${n}.`);has('Округлять объём каждой фотографии заранее нельзя');
 }else if(['audio-memory','audio-send','audio-duration'].includes(k)){
  const c=m.channels,hz=m.frequency,depth=m.depth,flow=c*hz*depth,n=m.numericResult;
  has(`Каналов: ${c}; частота дискретизации: ${hz} измерений в секунду на канал; глубина кодирования: ${depth} бит.`);
  has('r = число каналов · частота · глубина.');has(`r = ${c} · ${hz} · ${depth} = ${flow} бит в секунду.`);has('объём V = r · T.');
  if(k==='audio-duration'){
   const size=m.sizeMB*8388608;
   has(`V = ${m.sizeMB} · 8388608 = ${size} бит.`);has('Tмин = ⟦V¦r · 60⟧.');
   has(`Tмин = ${div(size,flow*60)} = ${show(m.exactMinutes)} мин.`);
   has(`Границы округления: ${show(new Q(2*n-1,2))} меньше ${show(m.exactMinutes)}, а ${show(m.exactMinutes)} меньше ${show(new Q(2*n+1,2))}.`);
   has(`Поэтому ближайшее целое число минут — ${n}.`);
   has(`Проверка обратной подстановкой: ${show(m.exactMinutes)} · 60 · ${flow} = ${size} бит.`);
  }else{
   if(k==='audio-memory')has(`Длительность: T = ${m.minutes} · 60 + ${m.secondsPart} = ${m.durationSeconds} с.`);
   else has(`Длительность исходной записи: T = ${m.durationSeconds} с.`);
   has(`V = ${flow} · ${m.durationSeconds} = ${m.totalBits} бит.`);
   if(k==='audio-send'){
    has('t = ⟦V¦vканала⟧.');has(`t = ${div(m.totalBits,m.rate)} = ${show(v)} с.`);
    has(`Проверка: ${show(v)} · ${m.rate} = ${m.totalBits} бит.`);has('Скорость канала отличается от потока звукозаписи');
   }else{
    has(`V = ${div(m.totalBits,8192)} = ${show(m.exactKB)} Кбайт.`);has('округляем вверх');
    has(`Проверка достаточности: ${n} · 8192 = ${n*8192} ≥ ${m.totalBits} бит.`);
    has(`Предыдущее целое: ${n-1} · 8192 = ${(n-1)*8192} бит, что меньше ${m.totalBits}.`);
   }
  }
 }else if(['audio-volume-ratio','audio-transfer-ratio'].includes(k)){
  const r=Q.from(m.resolutionFactor),f=Q.from(m.frequencyDivisor);let factor=r.div(f);
  has('V = число каналов · частота · глубина кодирования · длительность.');has('Длительность того же музыкального фрагмента не меняется.');
  has(`Глубина возрастает в ${show(r)} раза, частота уменьшается в ${show(f)} раза.`);
  if(k==='audio-volume-ratio'){
   const c=m.oldChannels;factor=factor.div(c);
   has(`Число каналов меняется с ${c} до 1`);has(`Отношение объёмов: k = ${show(r)} · ${show(Q.from(1).div(f))} · ${div(1,c)} = ${show(factor)}.`);
   has('Vнов = Vисх · k.');has(`Vнов = ${m.originalMB} · ${show(factor)} = ${show(v)} Мбайт.`);
   has(`${show(v)} · ${show(Q.from(1).div(factor))} = ${m.originalMB} Мбайт.`);
  }else{
   const c=Q.from(m.channelFactor),t=m.originalSeconds;
   has('Число каналов остаётся тем же');has(`Отношение объёмов: k = ${show(r)} · ${show(Q.from(1).div(f))} = ${show(factor)}.`);
   has('Время пропорционально объёму и обратно пропорционально скорости.');has(`Скорость канала в город Б выше в ${show(c)} раза.`);
   has(`tБ = tА · k · ${show(Q.from(1).div(c))}.`);
   has(`tБ = ${t} · ${show(factor)} · ${show(Q.from(1).div(c))} = ${show(v)} с.`);
   has(`Проверка отношения времён: ${show(v)} · ${show(c)} = ${show(factor.mul(t))}; ${t} · ${show(factor)} = ${show(factor.mul(t))}.`);
  }
 }else if(k==='rgb-component'){
  const [w,h]=m.dimensions,size=m.bytes,depth=m.totalDepth;
  has(`Пикселей: ${w} · ${h} = ${w*h}.`);has(`Объём: ${size} · 8 = ${size*8} бит.`);
  has(`Глубина цвета: i = ${div(size*8,w*h)} = ${show(depth)} бит на пиксель.`);
  has('Полная глубина складывается из красной, зелёной и синей частей.');has(`iзел = ${show(depth)} − ${m.red} − ${m.blue} = ${show(v)} бит.`);
  has(`Проверка: (${m.red} + ${show(v)} + ${m.blue}) · ${w*h} = ${size*8} бит, что равно ${size} байт.`);
 }else assert.fail(k);
 if(m.choices){
  for(const c of m.choices)has(`Вариант ${c.index}: ${c.value} — ${String(c.index)===m.answer?'совпадает.':'не совпадает.'}`);
  has(`В ответ записываем номер подходящего варианта: ${m.answer}.`);
 }
 has(`Ответ: ${m.answer}.`);
 return {kind:k,answer:m.answer,proofLines:lines.length,lines};
}

module.exports={auditMedia,parseMedia:parse};
