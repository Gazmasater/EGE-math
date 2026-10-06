const assert=require('node:assert/strict');
const fmt=n=>Number(n.toFixed(10)).toString().replace('-','−').replace('.',',');
const F=(a,b)=>`⟦${a}¦${b}⟧`;
const defs={};
// Объём или путь, разность скоростей, разность времени, нужен ли более быстрый, ответ.
for(const [family,rows] of Object.entries({workers:`
02F1DB 323 2 2 1 19
071261 209 8 8 0 11
444D03 198 7 7 1 18
BB421B 192 4 4 0 12
D32AC4 112 2 1 0 14`,pipes:`
1E4FB8 112 6 6 1 14
6ABF35 285 4 4 0 15
768665 672 4 4 1 28
FAC22B 104 5 5 0 8`,cycling:`
274BE8 190 9 9 1 19
366C0F 90 5 3 1 15
591D2E 80 2 2 0 8
65356D 220 9 9 1 20
667524 144 8 9 0 8
8C7829 112 2 1 1 16
BAF165 160 6 6 0 10
BC64EB 140 4 4 1 14
BEEFB3 70 4 2 0 10`,return:`
296B11 288 1 4 0 8
33B385 108 6 3 0 12
68610A 90 6 4 1 15
8B3972 264 2 1 0 22`,chase:`
4ECA34 323 2 2 1 19
641D12 168 2 2 0 12
DBC2D4 285 4 4 0 15`})){
 for(const row of rows.trim().split('\n')){const [id,...p]=row.split(' ');defs[id]={family,p:p.map(Number)};}
}
for(const [id,times,answer] of [['39F54E',[40,24],15],['581F33',[42,21],14],['B533A0',[36,12],9],['DDFADF',[11,15,110],6]])defs[id]={family:'joint-work',times,answer,units:id==='DDFADF'?'минут':'часов'};
for(const [id,together,other,answer] of [['AB5ECB',24,42,56],['AD55CA',24,120,30],['FC0337',24,36,72]])defs[id]={family:'individual-work',together,other,answer};
function solveWord(task){
 const d=defs[task.id];if(!d)return null;const steps=[];let answer,parameters,source;
 if(d.p&&['workers','pipes','cycling','return','chase'].includes(d.family)){
  const [n,delta,time,fast,expected]=d.p,m=n*delta/time,D=delta*delta+4*m,slower=(-delta+Math.sqrt(D))/2,faster=slower+delta,negative=(-delta-Math.sqrt(D))/2;
  answer=slower+fast*delta;assert.equal(answer,expected,task.id);parameters={n,delta,time,fast,slower,faster};
  const work=['workers','pipes'].includes(d.family),pipe=d.family==='pipes',units=pipe?'литров в минуту':work?'деталей в час':'км в час';
  const lower=pipe?'первой трубы':work?'второго рабочего':d.family==='cycling'?'второго велосипедиста':d.family==='chase'?'первого теплохода':'на пути из A в B';
  steps.push(`Пусть x — ${work?'производительность':'скорость'} ${lower}. Единица измерения — ${units}. Эта величина положительна: x>0. ${work?'Большая производительность':'Большая скорость'} равна x+${delta}.`,
   `Время равно отношению ${work?'объёма работы к производительности':'расстояния к скорости'}. Поэтому для ${work?pipe?`${n} литров`:`${n} деталей`:`пути ${n} км`} получаем времена ${F(n,'x')} и ${F(n,`x+${delta}`)}.`);
  if(d.family==='return')steps.push(`На обратном пути скорость больше, но есть остановка на ${time} ч. Полные времена равны, поэтому ${F(n,'x')}=${F(n,`x+${delta}`)}+${time}; чистое время движения обратно на ${time} ч меньше.`);
  else if(d.family==='chase')steps.push(`Второй теплоход вышел на ${time} ч позже, а прибыл одновременно с первым. Значит, время движения первого больше времени движения второго на ${time} ч.`);
  else steps.push(`${pipe?'Поток через вторую трубу':work?'Более производительный участник':'Более быстрый велосипедист'} ${pipe?'заполняет резервуар за время':'затратил времени'} на ${time} ${pipe?'мин.':'ч'} меньше. Поэтому из большего времени вычитаем меньшее.`);
  steps.push(`Составляем уравнение: ${F(n,'x')}−${F(n,`x+${delta}`)}=${time}. При x>0 знаменатели положительны; приводим к общему знаменателю: ${F(`${n}·${delta}`,`x(x+${delta})`)}=${time}.`,
   `Отсюда x(x+${delta})=${F(n*delta,time)}=${fmt(m)}, то есть x²+${delta}x−${fmt(m)}=0. Дискриминант D=${delta}²+4·${fmt(m)}=${fmt(D)}. Корни: x=${F(`−${delta}±√(${fmt(D)})`,2)}, то есть ${fmt(slower)} и ${fmt(negative)}. Отрицательный корень не подходит по смыслу.`,
   `Меньшая ${work?'производительность':'скорость'} равна ${fmt(slower)}, большая — ${fmt(slower)}+${delta}=${fmt(faster)}. Вопрос требует ${fast?'большую':'меньшую'} величину: ${fmt(answer)} ${units}.`,
   `Проверка исходных времён: ${F(n,fmt(slower))}−${F(n,fmt(faster))}=${fmt(n/slower)}−${fmt(n/faster)}=${time} ${pipe?'мин.':'ч'}. Разность совпадает с условием.`);
  source=d.family==='workers'?(fast?'26593':'26592'):d.family==='pipes'?(fast?'26598':'26597'):d.family==='cycling'?(fast?'26583':'26584'):d.family==='return'?(['296B11','8B3972'].includes(task.id)?'27482':fast?'26581':'26582'):(fast?'26591':'26590');
 }else if(d.family==='joint-work'){
  const rate=d.times.reduce((s,t)=>s+1/t,0);answer=d.answer;parameters={times:d.times};source=d.times.length===3?'99615':'99614';
  steps.push(`Примем весь ${d.times.length===3?'объём бака':'заказ'} за одну единицу работы. Предполагается, что участники работают с постоянной производительностью и не мешают друг другу. Тогда при совместной работе их производительности складываются.`);
  if(d.times.length===3)steps.push('Время третьего насоса переводим в минуты: 1 ч 50 мин=60+50=110 мин. Все три времени теперь заданы в одинаковых единицах.');
  steps.push(`Производительности равны ${d.times.map(t=>F(1,t)).join(', ')} единицы работы за ${d.units==='часов'?'час':'минуту'}. Общая производительность: ${d.times.map(t=>F(1,t)).join('+')}=${F(1,answer)}.`,
   `Пусть t — искомое время. За него будет сделана работа ${F('t',answer)}=1, откуда t=${answer} ${d.units}.`,
   `Проверка: за ${answer} ${d.units} участники выполнят доли ${d.times.map(t=>F(answer,t)).join('+')}=1. Время меньше каждого индивидуального времени, что соответствует совместной работе.`);
 }else if(d.family==='individual-work'){
  answer=d.answer;parameters={together:d.together,other:d.other};source='99617';
  steps.push('Примем всю грядку за единицу работы. Производительность показывает, какую долю грядки можно прополоть за одну минуту. При совместной работе производительности складываются.',
   `Вместе участницы выполняют ${F(1,d.together)} грядки в минуту, известная участница — ${F(1,d.other)}. Поэтому производительность другой равна ${F(1,d.together)}−${F(1,d.other)}=${F(d.other-d.together,d.together*d.other)}=${F(1,answer)}.`,
   `На всю грядку требуется время, обратное производительности: t=${answer} мин. Вычитаем производительности, а не времена, потому что одна и та же минута работы даёт разные доли готовой грядки.`,
   `Проверка: ${F(1,answer)}+${F(1,d.other)}=${F(1,d.together)}, значит, совместное время действительно равно ${d.together} мин.`);
 }else if(d.family.startsWith('river-'))return solveRiver(task,d);
 else if(d.family==='misc'){answer=d.answer;source=d.source;parameters={custom:true};steps.push(...d.steps);}
 else throw Error(task.id);
 return {id:task.id,family:d.family,parameters,source,answer:fmt(answer),solution:[...steps,`Ответ: ${fmt(answer)}.`].join('\n\n'),diagram_svg:'',diagram_caption:''};
}
function verifyWord(r){const p=r.parameters,n=Number(r.answer.replace('−','-').replace(',','.'));if(p.custom){assert.ok(Math.abs(defs[r.id].check()-n)<1e-9);}else if(p.river){assert.ok(p.v>p.u&&p.u>=0);const up=p.S/(p.v-p.u),down=p.S/(p.v+p.u);assert.ok(Math.abs((p.difference?up-down:up+down)-p.T)<1e-10);assert.equal(n,p.distance?2*p.S:r.family.endsWith('flow')?p.u:p.v);}else if(p.slower){assert.ok(p.slower>0);assert.equal(p.faster-p.slower,p.delta);assert.ok(Math.abs(p.n/p.slower-p.n/p.faster-p.time)<1e-10);assert.equal(n,p.fast?p.faster:p.slower);}else if(p.times){assert.ok(Math.abs(p.times.reduce((s,t)=>s+n/t,0)-1)<1e-10);}else assert.ok(Math.abs(1/n+1/p.other-1/p.together)<1e-10);}
module.exports={solveWord,verifyWord,definitions:defs};
// Речное движение: расстояние в одну сторону, известная скорость, время движения или разность времени.
for(const [family,rows] of Object.entries({
 'river-difference-flow':`24E361 280 15 14 5\n33D8E1 72 9 6 3\n598D07 77 9 4 2\n5EB1A5 48 8 8 4\nF23E04 168 13 2 1`,
 'river-difference-own':`A08F25 117 2 4 11\nA42A12 255 1 2 16\nCF56D0 91 3 6 10\nF2CCA3 143 1 2 12`,
 'river-round-own':`06B9F5 80 2 9 18\n17A0D7 567 3 48 24\n4A4AB8 48 4 5 20\n720230 180 1 19 19\nBCABB7 40 3 3 27\nF017B1 35 3 4 18\n4BA055 192 4 20 20`,
 'river-round-flow':`65E80F 468 22 44 4\nB4C164 609 25 50 4`
}))for(const row of rows.split('\n')){const [id,...p]=row.split(' ');defs[id]={family,p:p.map(Number)};}
const clocks={'06B9F5':[13,4],'17A0D7':[54,6],'4A4AB8':[10,5],'720230':[20,1],'BCABB7':[6,3],'F017B1':[8,4],'65E80F':[47,3],'B4C164':[51,1]};
defs['205CF2']={family:'river-distance',p:[27,1,27,728]};
const Q=n=>{if(Number.isInteger(n)||Number.isInteger(n*100))return fmt(n);for(let d=2;d<=1000;d++)if(Math.abs(n*d-Math.round(n*d))<1e-9)return F(fmt(Math.round(n*d)),d);throw Error('Nonexact rational '+n);};
function solveRiver(task,d){
 const steps=[],difference=d.family.includes('difference'),flow=d.family.endsWith('flow'),distance=d.family==='river-distance';
 let [S,known,T,answer]=d.p,v,u,source;
 if(distance){v=S;u=known;S=answer/2;source='99601';}
 else {v=flow?known:answer;u=flow?answer:known;source=difference?(flow?'26585':'26586'):(flow?'26588':'26589');}
 if(task.id==='4BA055'){source='99602';steps.push('Плот движется со скоростью течения 4 км в час. До возвращения яхты прошло ⟦92¦4⟧=23 ч с отправления плота. Яхта вышла на 3 ч позже, поэтому её движение туда и обратно заняло 23−3=20 ч.');}
 else if(clocks[task.id]){const [all,stop]=clocks[task.id];steps.push(`${['BCABB7','F017B1'].includes(task.id)?'От выхода в 10:00 до возвращения прошло':'Общее время рейса составляет'} ${all} ч. Стоянка заняла ${stop} ч, значит, чистое время движения туда и обратно T=${all}−${stop}=${T} ч.`);if(['BCABB7','F017B1'].includes(task.id))source='26587';}
 else if(distance)steps.push('Из общих 32 ч исключаем 5 ч стоянки: движение заняло 27 ч. Расстояния туда и обратно одинаковы; обозначим путь в одну сторону через S.');
 const variable=flow?'u':'v';
 steps.push(`Собственная скорость судна — v, скорость течения — u. По течению скорость v+u, против течения v−u. Требуется v>u≥0, чтобы судно могло идти против течения. ${distance?`Здесь v=${v}, u=${u} км в час.`:flow?`Известно v=${v}; искомая скорость u удовлетворяет 0≤u<${v}.`:`Известно u=${u}; искомая скорость v>${u}.`}`);
 if(distance){
  steps.push(`Время на двух участках равно ${F('S',v+u)} и ${F('S',v-u)}. Их сумма: S·(${F(1,v+u)}+${F(1,v-u)})=${T}.`,
   `Сумма обратных скоростей равна ${F(2*v,v*v-u*u)}. Поэтому S=${F(`${T}·${v*v-u*u}`,2*v)}=${fmt(S)} км.`,
   `За весь рейс пройдено два таких расстояния: 2S=2·${fmt(S)}=${answer} км. Нельзя ограничиться длиной пути в одну сторону.`);
 }else if(difference){
  steps.push(`Каждый участок имеет длину ${S} км. Против течения путь занимает ${F(S,flow?`${v}−u`:`v−${u}`)} ч, по течению — ${F(S,flow?`${v}+u`:`v+${u}`)} ч. Первое время больше второго на ${T} ч.`,
   `Уравнение: ${F(S,flow?`${v}−u`:`v−${u}`)}−${F(S,flow?`${v}+u`:`v+${u}`)}=${T}. После приведения к общему знаменателю: ${F(flow?`${2*S}u`:2*S*u,flow?`${v*v}−u²`:`v²−${u*u}`)}=${T}. Знаменатель положителен по условию v>u.`);
  if(flow){
   const b=2*S/T,D=b*b+4*v*v,negative=-b-u;
   steps.push(`Умножаем на знаменатель и делим на ${T}: u²+${Q(b)}u−${v*v}=0. Дискриминант D=(${Q(b)})²+4·${v*v}=${Q(D)}. Корни u=${F(`−${Q(b)}±√(${Q(D)})`,2)}: ${u} и ${Q(negative)}. Отрицательный корень исключаем; ${u}<${v}, поэтому положительный корень допустим.`);
  }else steps.push(`Получаем v²=${u*u}+${F(2*S*u,T)}=${v*v}. Отсюда v=±${v}; по смыслу скорости и условию v>${u} выбираем v=${v}.`);
 }else{
  steps.push(`Длина пути в каждом направлении ${S} км. Сумма времён движения: ${F(S,flow?`${v}+u`:`v+${u}`)}+${F(S,flow?`${v}−u`:`v−${u}`)}=${T}.`,
   `Общий знаменатель положителен: v²−u²>0. После сложения дробей: ${F(flow?2*S*v:`${2*S}v`,flow?`${v*v}−u²`:`v²−${u*u}`)}=${T}.`);
  if(flow)steps.push(`Следовательно, u²=${v*v}−${F(2*S*v,T)}=${u*u}. Скорость течения неотрицательна, поэтому u=${u}. Условие ${u}<${v} выполнено.`);
  else{
   const B=2*S/T,D=B*B+4*u*u,neg=B-v;
   steps.push(`Умножаем на знаменатель и делим на ${T}: v²−${Q(B)}v−${u*u}=0. Дискриминант D=(${Q(B)})²+4·${u*u}=${Q(D)}. По формуле квадратного уравнения v=${F(`${Q(B)}±√(${Q(D)})`,2)}. Получаем корни ${v} и ${Q(neg)}. Второй отрицателен; выбираем ${v}>${u}.`);
  }
 }
 const up=S/(v-u),down=S/(v+u);
 steps.push(`Проверка: время против течения ${F(S,v-u)}=${Q(up)} ч, по течению ${F(S,v+u)}=${Q(down)} ч. ${difference?`Разность ${Q(up)}−${Q(down)}=${T} ч`:`Сумма ${Q(up)}+${Q(down)}=${T} ч`} совпадает с условием.`,
  `Искомая ${distance?'длина всего пути':'скорость'} равна ${answer} ${distance?'км':'км в час'}.`);
 return {id:task.id,family:d.family,source,parameters:{river:true,S,v,u,T,difference,distance},answer:fmt(answer),solution:[...steps,`Ответ: ${fmt(answer)}.`].join('\n\n'),diagram_svg:'',diagram_caption:''};
}
for(const [id,times,speeds,answer] of [['081941',[1,3,2],[115,45,40],55],['0B236A',[1,3,3],[120,105,65],90]]){
 const totalTime=times.reduce((a,b)=>a+b),parts=times.map((t,i)=>t*speeds[i]),total=parts.reduce((a,b)=>a+b);
 defs[id]={family:'misc',answer,source:'99606',check:()=>total/totalTime,steps:[
 'Средняя скорость за весь путь равна отношению общего расстояния к общему времени. Скорости нельзя просто сложить и разделить на три: продолжительности участков различаются.',
 `На отдельных участках автомобиль проехал ${times.map((t,i)=>`${t}·${speeds[i]}=${parts[i]} км`).join('; ')}. Общий путь S=${parts.join('+')}=${total} км.`,
 `Общее время t=${times.join('+')}=${totalTime} ч. Поэтому v_ср=${F('S','t')}=${F(total,totalTime)}=${answer} км в час. Проверка: ${answer}·${totalTime}=${total} км.`]};
}
for(const [id,distances,speeds,answer] of [['5504F2',[120,200,160],[60,100,120],90],['6D24D0',[200,180,140],[60,90,120],80]]){
 const times=distances.map((s,i)=>s/speeds[i]),time=times.reduce((a,b)=>a+b),total=distances.reduce((a,b)=>a+b);
 defs[id]={family:'misc',answer,source:'99607',check:()=>total/time,steps:[
 'Для средней скорости сначала найдём время каждого участка. Оно равно расстоянию, делённому на скорость. Общее время — сумма этих времён.',
 `Получаем t₁=${F(distances[0],speeds[0])}=${Q(times[0])} ч, t₂=${F(distances[1],speeds[1])}=${Q(times[1])} ч, t₃=${F(distances[2],speeds[2])}=${Q(times[2])} ч.`,
 `Общий путь S=${distances.join('+')}=${total} км, общее время t=${times.map(Q).join('+')}=${Q(time)} ч. Средняя скорость v_ср=${F(total,Q(time))}=${answer} км в час.`,
 `Проверка: ${answer}·(${Q(time)})=${total} км. Усреднять три исходные скорости арифметически нельзя: на участки затрачено неодинаковое время.`]};
}
for(const [id,p1,p2,pm,delta,heavier,m1,m2,answer] of [['29D730',60,10,20,90,2,30,120,150],['6D55BD',40,25,35,10,1,20,10,30],['FD5B44',45,20,40,30,1,40,10,50]]){
 const coefficient=p1+p2-2*pm,rhs=(pm-(heavier===1?p1:p2))*delta,x=heavier===1?m2:m1;
 const first=heavier===1?`x+${delta}`:'x',second=heavier===2?`x+${delta}`:'x';
 defs[id]={family:'misc',answer,source:'99576',check:()=>{assert.equal((p1*m1+p2*m2)/(m1+m2),pm);assert.equal(Math.abs(m1-m2),delta);return m1+m2;},steps:[
 `Пусть x кг — масса меньшего сплава; тогда больший весит x+${delta} кг, а общий сплав — 2x+${delta} кг. По условию масса первого равна ${first}, второго — ${second}. Требуется x>0.`,
 'При смешивании масса меди сохраняется. Масса меди в каждом сплаве равна его массе, умноженной на процентное содержание и делённой на 100.',
 `Уравнение баланса после умножения на 100: ${p1}·(${first})+${p2}·(${second})=${pm}·(2x+${delta}). Раскрывая скобки и перенося слагаемые, получаем ${fmt(coefficient)}x=${fmt(rhs)}, откуда x=${F(fmt(rhs),fmt(coefficient))}=${x} кг.`,
 `Массы исходных сплавов: ${m1} и ${m2} кг. Искомая масса третьего сплава ${m1}+${m2}=${answer} кг. Проверка содержания: ${F(`${p1}·${m1}+${p2}·${m2}`,answer)}=${pm}%.`]};
}
defs['ADEDE3']={family:'misc',answer:10,source:'99578',check:()=>{assert.equal((40*10+25*62)/65,30);assert.equal((10+62)/2,36);return 10;},steps:[
 'Пусть x% и y% — концентрации кислоты в первом и втором сосудах. При смешивании равных масс концентрация является средним арифметическим: ⟦x+y¦2⟧=36, то есть x+y=72.',
 'Если смешать все растворы, общая масса будет 40+25=65 кг. Баланс кислоты: ⟦40x+25y¦100⟧=⟦30·65¦100⟧. После умножения на 100 получаем 40x+25y=1950.',
 'Подставляем y=72−x: 40x+25(72−x)=1950. Отсюда 15x+1800=1950, 15x=150, x=10. Тогда y=62; обе концентрации находятся между 0% и 100%.',
 'Проверка: 40·0,10+25·0,62=19,5 кг кислоты, а ⟦19,5¦65⟧=0,30. При равных массах ⟦10+62¦2⟧=36%. Спрашивается концентрация первого раствора, значит, 10%.']};
defs['2A6A94']={family:'misc',answer:65,source:'99591',check:()=>{assert.equal(65*4+80*3,500);return 260/4;},steps:[
 'К моменту встречи первый автомобиль проехал от города A 260 км. Второй двигался из B, поэтому его путь составил 500−260=240 км.',
 'При скорости 80 км в час второй автомобиль затратил t₂=⟦240¦80⟧=3 ч. Первый вышел на час раньше, значит, был в пути t₁=3+1=4 ч.',
 'Скорость первого автомобиля v₁=⟦260¦4⟧=65 км в час. Проверка: за 4 ч первый проехал 260 км, за 3 ч второй — 240 км; сумма 500 км равна расстоянию между городами, а разность времени равна одному часу.']};
defs['AA1851']={family:'misc',answer:750,source:'99612',check:()=>(85+35)*1000/3600*30-250,steps:[
 'Поезда движутся навстречу, поэтому их относительная скорость равна сумме: 85+35=120 км в час. Переведём её в метры в секунду: 120·⟦1000¦3600⟧=⟦100¦3⟧.',
 'От первой встречи локомотивов до полного прохождения поездов относительное перемещение равно сумме их длин. За 30 с оно составляет ⟦100¦3⟧·30=1000 м.',
 'Пусть L — длина скорого поезда. Тогда L+250=1000, откуда L=750 м. Проверка: ⟦750+250¦⟦100¦3⟧⟧=30 с, как в условии.']};
