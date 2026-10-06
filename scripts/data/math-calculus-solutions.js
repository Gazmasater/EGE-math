const assert=require('node:assert/strict');
const fmt=n=>Number(n.toFixed(10)).toString().replace('-','−').replace('.',',');
const F=(a,b)=>`⟦${a}¦${b}⟧`;
const Q=n=>{if(Number.isInteger(n)||Number.isInteger(n*100))return fmt(n);for(let d=2;d<=100;d++)if(Math.abs(n*d-Math.round(n*d))<1e-9)return F(fmt(Math.round(n*d)),d);throw Error('Nonexact rational '+n);};
const polynomial=(values)=>values.map((a,i)=>{const degree=values.length-1-i;if(!a)return '';const v=Math.abs(a),term=(degree&&v===1?'':fmt(v))+(degree===3?'x³':degree===2?'x²':degree===1?'x':'');return `${a<0?'−':'+'}${term}`;}).join('').replace(/^\+/,'')||'0';
const defs={};
const rows=(family,text)=>{for(const row of text.trim().split('\n')){const [id,...values]=row.split(' ');defs[id]={family,p:values.map(Number)};}};
// Последнее число каждой строки — независимо пересчитанный ответ по данным ФИПИ.
rows('cubic',`
24E5F8 1 30 225 23 -15
5750FE 1 -14 49 3 7
6888FA 1 0 -108 23 -6
6310FE 1 14 49 8 -7
597474 1 -18 81 17 9
5E7419 1 0 -27 14 -3
5A70DB 1 -27 0 17 18
AE14D4 1 0 -300 14 10
01A05E 1 16 64 12 -8
714DA4 1 -12 36 17 6
198EC9 1 0 -147 19 -7
6986C7 1 0 -192 11 8
B4CB9F 1 0 -300 5 -10
2D0BED 1 27 0 11 -18
35C66B 1 10 25 16 -5
AC8783 1 -20 100 23 10`);
rows('quadratic-log',`
47384A 1 -28 96 31 8
659A4A 3.5 -29 30 67 2
81F510 2 -23 33 -17 3
425124 1 -20 48 -97 6
688D26 0.5 -21 110 43 10
1ECEE8 1 -33 136 74 8`);
rows('root-power',`
1BFB4B 2 -21 16 49
A3D342 -1 24 15 256
27ACB1 1 -3 17 4
699DB5 2 -18 21 36
33F1B8 -1 9 4 36
221C18 1 -9 25 -83
456BD7 -1 18 3 144
D99158 1 -3 9 4
8151AA -4 12 7 23
4A47C9 -1 27 4 324
2E9992 -2 27 17 81
C68B97 -1 24 2 256
1DD2E7 2 -15 21 25`);
// a*x+b*ln(c*x+d)+e, затем проверенный ответ.
rows('linear-log',`
DF0B44 -5 5 1 9 0 40
DE13F8 9 -9 1 5 0 -36
933FFF 3 -3 1 -7 -8 8
BDEF76 12 -1 12 0 4 5
1E41B2 -10 10 1 -2 11 3
D1E7BE -2 1 1 -7 -3 7.5
97AEB6 -9 9 1 7 4 58
DF872D 10 -1 1 -5 3 5.1
9A1329 9 -9 1 11 7 -83
B224D1 5 -5 1 3 6 -2
285552 -7 7 1 3 -9 -2
C0F5A3 -5 1 1 -2 13 2.2
ACB0C6 -9 9 1 -4 -7 5
88E991 9 -9 1 3 4 -2
033968 9 -9 1 -2 -8 3
336660 -8 1 8 0 7 6`);
for(const [id,bounds] of Object.entries({'221C18':[1,50],'8151AA':[0,12],'DF0B44':[-8.5,0],'DE13F8':[-4.5,0],'BDEF76':[1/24,5/24],'97AEB6':[-6.5,0],'9A1329':[-10.5,0],'336660':[1/16,5/16]}))defs[id].bounds=bounds;
for(const [id,n] of Object.entries({'DF0B44':5,'DE13F8':9,'B224D1':5,'285552':7,'033968':9}))defs[id].logPower=n;
// a*trig(x)+b*x+c. Если pi=true, линейный коэффициент равен b/π.
for(const [id,trig,a,b,c,pi,lo,hi,answer] of [
 ['76054F','cos',10,14,9,false,0,1.5,19],['277247','cos',10,-14,5,false,-1.5,0,15],['B73557','cos',10,36,-6,true,-2/3,0,-35],['79CEAC','sin',10,-36,7,true,-5/6,0,32],['EAD99A','cos',12,45,-4,true,-2/3,0,-40],['B4B4EA','cos',3,-5,5,false,-1.5,0,8],['498736','sin',10,-42,-12,true,-5/6,0,18]
])defs[id]={family:'trig-monotone',p:[a,b,c,answer],trig,pi,bounds:[lo*Math.PI,hi*Math.PI],piBounds:[lo,hi]};
defs['3A3CE8']={family:'exponential-linear',p:[8,12,-7]};
defs['24A166']={family:'exponential-quadratic',p:[8,-40,40,4,3]};
const interval=(a,b)=>`(${Q(a)}; ${Q(b)})`;
const piText=x=>x===0?'0':Q(x).includes('⟦')?Q(x).replace('¦','π¦'):`${fmt(x)}π`;
function solveCalculus(task){
 const d=defs[task.id];if(!d)return null;const p=d.p,answer=p.at(-1),wantMax=/максимума|наибольшее/.test(task.text),point=task.text.includes('точку');
 const steps=[];let x0,fn,df,domain=-Infinity,roots=[],source;
 const conclusion=(before,after)=>`${before==='+'?'Слева функция возрастает':'Слева функция убывает'}, ${after==='+'?'справа возрастает':'справа убывает'}. Поэтому в x=${Q(x0)} находится точка ${wantMax?'максимума':'минимума'}: производная меняет знак с «${before}» на «${after}».`;
 if(d.family==='cubic'||d.family==='quadratic-log'){
  const cubic=d.family==='cubic',[a,b,c,e]=p;const A=cubic?3*a:2*a,B=cubic?2*b:b,C=c,disc=B*B-4*A*C;
  roots=[(-B-Math.sqrt(disc))/(2*A),(-B+Math.sqrt(disc))/(2*A)];assert.ok(A>0&&disc>0);x0=wantMax?roots[0]:roots[1];
  domain=cubic?-Infinity:0;
  fn=cubic?x=>a*x**3+b*x*x+c*x+e:x=>a*x*x+b*x+c*Math.log(x)+e;
  df=cubic?x=>3*a*x*x+2*b*x+c:x=>2*a*x+b+c/x;
  source=cubic?(wantMax?'77427':'77428'):(wantMax?'77490':'77491');
  steps.push(cubic?'Функция — многочлен; область определения вся числовая прямая. Найдём производную и определим, как меняется её знак.':`Для ln x требуется x>0. На этой области функция дифференцируема; знаменатель x в производной положителен.`,
   cubic?`По правилу дифференцирования степеней y′=${polynomial([A,B,C])}.`:`Производная y′=${polynomial([2*a,b])}+${F(fmt(c),'x')}=${F(polynomial([A,B,C]),'x')}.`,
   `Уравнение y′=0 ${cubic?'имеет вид':'на области x>0 равносильно'} ${polynomial([A,B,C])}=0. Дискриминант D=(${fmt(B)})²−4·${fmt(A)}·${fmt(C)}=${fmt(disc)}. Корни по формуле x=${F(`${fmt(-B)}±√(${fmt(disc)})`,fmt(2*A))}: x₁=${Q(roots[0])}, x₂=${Q(roots[1])}.`,
   `${cubic?'':'Оба корня положительны и допустимы. '}Коэффициент ${fmt(A)}>0, поэтому ${cubic?'производная':'числитель производной'} положителен вне промежутка между корнями и отрицателен внутри. Следовательно, y′>0 на ${cubic?`(−∞; ${Q(roots[0])})`:`(0; ${Q(roots[0])})`} и (${Q(roots[1])}; +∞), y′<0 на ${interval(...roots)}.`,
   conclusion(wantMax?'+':'−',wantMax?'−':'+'),
   `В ответ записываем абсциссу точки ${wantMax?'максимума':'минимума'} ${Q(x0)}, а не значение y в ней.`);
 }else if(d.family==='root-power'){
  const [a,b,c]=p,k=-2*b/(3*a);assert.ok(k>0);x0=k*k;roots=[x0];domain=0;
  fn=x=>a*x*Math.sqrt(x)+b*x+c;df=x=>1.5*a*Math.sqrt(x)+b;
  source=point?(wantMax?'77455':'77451'):(wantMax?'77456':'77452');
  steps.push(`Область определения x≥0. Запись x^(⟦3¦2⟧)=x√(x) позволяет использовать степенное правило. Для x>0 производная (x^(⟦3¦2⟧))′=⟦3¦2⟧√(x).`,
   `Поэтому y′=${Q(1.5*a)}√(x)${b<0?'−':'+'}${fmt(Math.abs(b))}. Уравнение y′=0 даёт √(x)=${F(fmt(-b),Q(1.5*a))}=${Q(k)}, откуда x=${Q(k)}²=${Q(x0)}. Возведение в квадрат допустимо, поскольку ${Q(k)}>0.`,
   `Квадратный корень возрастает: при 0<x<${Q(x0)} имеем √(x)<${Q(k)}, при x>${Q(x0)} — √(x)>${Q(k)}. Поэтому знак производной слева от ${Q(x0)} ${a>0?'отрицательный':'положительный'}, справа ${a>0?'положительный':'отрицательный'}.`,conclusion(wantMax?'+':'−',wantMax?'−':'+'));
  if(point)steps.push(`Требуется точка экстремума, поэтому ответом будет x=${Q(x0)}.`);
  else{
   const [lo,hi]=d.bounds;assert.ok(lo<=x0&&x0<=hi);
   steps.push(`Точка ${Q(x0)} принадлежит заданному отрезку [${Q(lo)}; ${Q(hi)}]. Из доказанной монотонности следует, что это ${wantMax?'наибольшее':'наименьшее'} значение на всём отрезке, включая концы.`,
    `Подставляем в исходную функцию: y(${Q(x0)})=${fmt(a)}·${Q(x0)}·${Q(k)}+(${fmt(b)})·${Q(x0)}+(${fmt(c)})=${fmt(fn(x0))}. В ответ нужно записать значение функции.`);
  }
 }else if(d.family==='linear-log'){
  const [a,b,c,e,f]=p;domain=-e/c;x0=-b/a-e/c;roots=[x0];fn=x=>a*x+b*Math.log(c*x+e)+f;df=x=>a+b*c/(c*x+e);
  const inner=polynomial([c,e]);source=point?(wantMax?'26722':'26734'):(wantMax?'26715':'26714');
  if(c!==1)source=wantMax?'26719':'26718';
  steps.push(`Область определения задаётся положительностью аргумента логарифма: ${inner}>0, то есть x>${Q(domain)}.`);
  if(d.logPower)steps.push(`В условии степень ${d.logPower} относится к аргументу: ln((${inner})^(${d.logPower})). Степень нечётная, поэтому положительность аргумента требует ${inner}>0; на этой области ln((${inner})^(${d.logPower}))=${d.logPower}ln(${inner}).`);
  steps.push(`Используем (ln u)′=${F('u′','u')}. Производная функции: y′=${fmt(a)}+${F(fmt(b*c),inner)}.`,
   `Приравниваем её к нулю и умножаем на положительный знаменатель: ${fmt(a)}·(${inner})+(${fmt(b*c)})=0. После раскрытия скобок: ${polynomial([a*c,a*e+b*c])}=0. Отсюда x=${F(fmt(-(a*e+b*c)),fmt(a*c))}=${Q(x0)}. Эта точка больше ${Q(domain)} и допустима.`,
   `Производную можно представить как y′=${F(`${fmt(a*c)}·(x−(${Q(x0)}))`,inner)}. Знаменатель положителен; знак определяет числитель. При x<${Q(x0)} знак ${a>0?'минус':'плюс'}, при x>${Q(x0)} — ${a>0?'плюс':'минус'}.`,conclusion(wantMax?'+':'−',wantMax?'−':'+'));
  if(point)steps.push(`Вопрос требует абсциссу точки экстремума: x=${Q(x0)}.`);
  else{
   const [lo,hi]=d.bounds;assert.ok(lo<x0&&x0<hi);assert.ok(Math.abs(c*x0+e-1)<1e-10);
   steps.push(`Весь заданный отрезок [${Q(lo)}; ${Q(hi)}] входит в область определения, а ${Q(lo)}<${Q(x0)}<${Q(hi)}. Доказанная смена монотонности показывает, что нужное ${wantMax?'наибольшее':'наименьшее'} значение достигается именно здесь.`,
    `Аргумент логарифма в этой точке равен ${fmt(c)}·(${Q(x0)})+(${fmt(e)})=1, поэтому ln1=0. Получаем y(${Q(x0)})=${fmt(a)}·(${Q(x0)})+${fmt(b)}·0+(${fmt(f)})=${fmt(fn(x0))}.`);
  }
 }
 else if(d.family==='trig-monotone'){
  const [a,b,c]=p,B=d.pi?b/Math.PI:b,increasing=B>0,lo=d.bounds[0],hi=d.bounds[1];
  fn=x=>a*Math[d.trig](x)+B*x+c;df=x=>(d.trig==='cos'?-a*Math.sin(x):a*Math.cos(x))+B;
  x0=wantMax===increasing?hi:lo;const endpoint=x0===lo?d.piBounds[0]:d.piBounds[1],xText=piText(endpoint),bText=d.pi?F(fmt(b),'π'):fmt(b);
  source=d.trig==='sin'?'26699':d.pi?'26698':increasing?'26696':'26694';assert.ok(Math.abs(B)>a);
  steps.push(`Функция определена и непрерывна на заданном отрезке [${piText(d.piBounds[0])}; ${piText(d.piBounds[1])}]. Найдём производную: y′=${d.trig==='cos'?'−':''}${a}${d.trig==='cos'?'sin':'cos'}x+(${bText}).`,
   `Для любого x имеем −1≤${d.trig==='cos'?'sin':'cos'}x≤1, поэтому тригонометрическое слагаемое производной лежит между −${a} и ${a}. ${d.pi?`Используя π<⟦22¦7⟧, получаем ${F(Math.abs(b),'π')}>${F(Math.abs(b)*7,22)}>${a}.`:`Модуль постоянного слагаемого ${Math.abs(b)} больше ${a}.`}`,
   `Значит, производная ${increasing?'строго положительна':'строго отрицательна'} на всём отрезке, а функция ${increasing?'возрастает':'убывает'}. Поэтому её ${wantMax?'наибольшее':'наименьшее'} значение достигается на ${x0===lo?'левом':'правом'} конце, при x=${xText}.`,
   `Подставляем: ${d.trig}(${xText})=${fmt(Math[d.trig](x0))}, линейное слагаемое равно ${fmt(B*x0)}. Тогда y(${xText})=${a}·(${fmt(Math[d.trig](x0))})+(${fmt(B*x0)})+(${fmt(c)})=${fmt(fn(x0))}.`);
 }else if(d.family==='exponential-linear'){
  const [a,b]=p;x0=1-a;roots=[x0];source='26713';fn=x=>(x+a)*Math.exp(b-x);df=x=>(1-x-a)*Math.exp(b-x);
  steps.push(`Область определения — все действительные числа. Функция y=(x+${a})e^(${b}−x) является произведением линейной и показательной функций.`,
   `Применяем правило (uv)′=u′v+uv′. Здесь u′=1, v′=−e^(${b}−x). Поэтому y′=e^(${b}−x)−(x+${a})e^(${b}−x)=(${fmt(1-a)}−x)e^(${b}−x).`,
   `Экспонента строго положительна при всех x, поэтому y′=0 только при ${fmt(1-a)}−x=0, то есть x=${fmt(x0)}. При x<${fmt(x0)} производная положительна, при x>${fmt(x0)} отрицательна.`,conclusion('+','−'),`Нужна абсцисса этой точки: ${fmt(x0)}. Значение самой функции не требуется.`);
 }else if(d.family==='exponential-quadratic'){
  const [a,b,c,e]=p;fn=x=>(a*x*x+b*x+c)*Math.exp(x+e);df=x=>(a*x*x+(b+2*a)*x+(c+b))*Math.exp(x+e);roots=[0,3];x0=3;source='26723';
  steps.push('Функция определена на всей числовой прямой. Для нахождения точки минимума исследуем знак производной произведения многочлена и экспоненты.',
   `По правилу произведения y′=(${polynomial([2*a,b])})e^(x+${e})+(${polynomial([a,b,c])})e^(x+${e}). Собираем слагаемые: y′=(${polynomial([a,b+2*a,c+b])})e^(x+${e})=8x(x−3)e^(x+${e}).`,
   'Экспонента всегда положительна. Нули производной: x=0 и x=3. Произведение x(x−3) положительно при x<0 и x>3, отрицательно при 0<x<3.',
   'В точке 0 знак меняется с плюса на минус — это максимум. В точке 3 знак меняется с минуса на плюс: функция сначала убывает, затем возрастает, значит, это минимум.',
   'В ответ записываем абсциссу точки минимума x=3.');
 }else throw Error(d.family);
 assert.ok(Number.isFinite(x0)&&fn&&df,task.id);const calculated=point?x0:fn(x0);assert.ok(Math.abs(calculated-answer)<1e-8,`${task.id}: ${calculated} != ${answer}`);
 return {id:task.id,family:d.family,answer:fmt(answer),solution:[...steps,`Ответ: ${fmt(answer)}.`].join('\n\n'),diagram_svg:'',diagram_caption:'',parameters:{x0,domain,roots,wantMax,point,source},fn,df};
}
function verifyCalculus(r){
 const {x0,domain,roots,wantMax,point}=r.parameters,d=defs[r.id],f=r.fn;
 if(r.family!=='trig-monotone'){
  assert.ok(Math.abs(r.df(x0))<1e-9*Math.max(1,Math.abs(f(x0))),r.id);
  const step=Math.min(0.001*Math.max(1,Math.abs(x0)),Number.isFinite(domain)?(x0-domain)/10:Infinity);
  assert.ok(step>0,r.id);assert.ok(wantMax?f(x0)>f(x0-step)&&f(x0)>f(x0+step):f(x0)<f(x0-step)&&f(x0)<f(x0+step),`${r.id}: numerical extremum`);
 }
 if(d.bounds){
  const [lo,hi]=d.bounds;assert.ok(x0>=lo-1e-10&&x0<=hi+1e-10);const target=f(x0);
  for(let i=0;i<=1000;i++){const y=f(lo+(hi-lo)*i/1000);assert.ok(wantMax?y<=target+1e-8:y>=target-1e-8,`${r.id}: interval check`);}
 }
 const sample=Number.isFinite(domain)?domain+Math.max(2,(x0-domain)*1.3):x0+0.7,h=1e-5;
 const numerical=(f(sample+h)-f(sample-h))/(2*h),analytic=r.df(sample);assert.ok(Math.abs(numerical-analytic)<2e-5*Math.max(1,Math.abs(analytic)),`${r.id}: derivative cross-check`);
 assert.equal(Number(r.answer.replace('−','-').replace(',','.')),d.p.at(-1));
}
module.exports={solveCalculus,verifyCalculus,definitions:defs};
