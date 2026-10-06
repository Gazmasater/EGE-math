const assert=require('node:assert/strict');
const fmt=n=>Number(n.toFixed(10)).toString().replace('-','−').replace('.',',');
const pair=v=>`(${v.map(fmt).join('; ')})`;
const graphical={
  '0432E9':{a:[[1,2],[8,5]],b:[[1,1],[6,3]]},
  '3F02C4':{a:[[1,1],[3,5]],b:[[2,1],[6,5]]},
  '579B74':{a:[[1,1],[4,5]],b:[[3,3],[5,2]]},
  'A288A1':{a:[[1,1],[3,4]],b:[[3,3],[5,2]]},
  'E5399A':{a:[[1,2],[9,7]],b:[[1,1],[8,4]]}
};
const expected={ '028837':10.5,'0432E9':41,'0A394E':82,'166200':2,'1C7454':2,'1FEA81':26,'238861':7.5,'34F395':20,'3F02C4':10,'3FF85B':9,'40B442':29,'44700A':15,'4A073E':5,'579B74':11,'58E4C5':3,'602093':15,'713E60':20,'71AC6C':63,'8E0D68':4,'A288A1':1,'C9EE7C':25,'D331CB':13,'D891F7':17,'E21E0B':20,'E5399A':71,'E68A17':86,'EE1AA2':4,'F6942C':20,'FC0F78':2,'FC87A4':25,'FFBFD7':62 };
const norm2=v=>v.reduce((s,x)=>s+x*x,0);
function coefficients(expression){
 const m=expression.replace(/\s/g,'').match(/^(\d*)a→([+−])(\d*)b→$/);assert.ok(m,expression);
 return [Number(m[1]||1),(m[2]==='−'?-1:1)*Number(m[3]||1)];
}
function solveVector(task){
 if(task.codes.join(',')!=='7.5')return null;
 const s=task.text,steps=[];let a,b,c,d,answer,family,parameters;
 const angle=s.match(/равны (\d+) и (\d+), а угол между ними равен (\d+)°/);
 if(angle){
  const [la,lb,degrees]=angle.slice(1).map(Number);assert.equal(degrees,60);
  answer=la*lb/2;family='angle';parameters={la,lb,degrees};
  steps.push(`Даны длины |a→|=${la}, |b→|=${lb} и угол α=${degrees}° между векторами. Для скалярного произведения нужны именно эти три величины; положение векторов на плоскости результата не меняет.`,
   'По определению скалярного произведения a→·b→=|a→|·|b→|·cosα. Для угла 60° значение cos60°=⟦1¦2⟧.',
   `Подставляем данные: a→·b→=${la}·${lb}·⟦1¦2⟧=${fmt(answer)}. Угол острый, поэтому произведение положительно; его модуль меньше произведения длин ${la*lb}.`);
 }else{
  if(graphical[task.id]){
   const ends=graphical[task.id];a=ends.a[1].map((v,i)=>v-ends.a[0][i]);b=ends.b[1].map((v,i)=>v-ends.b[0][i]);
   steps.push(`Считываем по клеткам начала и концы стрелок. Вектор a→ направлен из ${pair(ends.a[0])} в ${pair(ends.a[1])}, вектор b→ — из ${pair(ends.b[0])} в ${pair(ends.b[1])}. Одна клетка соответствует одной единице.`,
    `Координаты вектора получаются вычитанием координат начала из координат конца: a→=${pair(a)}, b→=${pair(b)}. Важны перемещения вдоль осей, а не координаты концов стрелок сами по себе.`);
  }else{
   const m=s.match(/a→\((−?\d+);(−?\d+)\) и b→\((−?\d+);(−?\d+)\)/);assert.ok(m,task.id);
   [a,b]=[m.slice(1,3),m.slice(3,5)].map(v=>v.map(n=>Number(n.replace('−','-'))));
   steps.push(`По условию a→=${pair(a)}, b→=${pair(b)}. Первые координаты относятся к оси x, вторые — к оси y. Действия с векторами выполняем покоординатно, сохраняя знаки отрицательных координат.`);
  }
  const combination=s.match(/длину вектора (.*)\.$/);
  if(combination){
   family='length';const [ka,kb]=coefficients(combination[1]);c=a.map((v,i)=>ka*v+kb*b[i]);answer=Math.sqrt(norm2(c));parameters={a,b,ka,kb,c};
   steps.push(`Обозначим c→=${combination[1]}. Умножение на число умножает каждую координату, а при сложении складываются соответствующие координаты. Поэтому cₓ=${ka}·(${fmt(a[0])})+(${kb})·(${fmt(b[0])})=${fmt(c[0])}; cᵧ=${ka}·(${fmt(a[1])})+(${kb})·(${fmt(b[1])})=${fmt(c[1])}.`,
    `Получен вектор c→=${pair(c)}. Его длина — гипотенуза прямоугольного треугольника с катетами |cₓ| и |cᵧ|: |c→|=√(cₓ²+cᵧ²).`,
    `Вычисляем |c→|=√((${fmt(c[0])})²+(${fmt(c[1])})²)=√(${norm2(c)})=${fmt(answer)}. Длина неотрицательна, поэтому берём арифметический квадратный корень. Проверка: (${fmt(answer)})²=${norm2(c)}.`);
  }else{
   family='dot';c=a;d=b;
   if(task.id==='44700A'){
    c=a.map((v,i)=>v+b[i]);d=a.map((v,i)=>7*v-b[i]);
    steps.push(`Сначала найдём векторы, произведение которых требуется: c→=a→+b→=(${a[0]}+${b[0]}; ${a[1]}+(${b[1]}))=${pair(c)}; d→=7a→−b→=(7·${a[0]}−${b[0]}; 7·${a[1]}−(${b[1]}))=${pair(d)}.`);
   }
   answer=c[0]*d[0]+c[1]*d[1];parameters={a,b,c,d};
   steps.push('В прямоугольной системе координат скалярное произведение равно сумме произведений соответствующих координат: c→·d→=cₓdₓ+cᵧdᵧ. Для исходных векторов здесь c→=a→, d→=b→.'.replace(task.id==='44700A'?' Для исходных векторов здесь c→=a→, d→=b→.':'__never__',''),
    `Подставляем координаты: (${fmt(c[0])})·(${fmt(d[0])})+(${fmt(c[1])})·(${fmt(d[1])})=${fmt(c[0]*d[0])}+(${fmt(c[1]*d[1])})=${fmt(answer)}. Получено число — скалярное произведение, а не координаты нового вектора.`);
  }
 }
 assert.equal(answer,expected[task.id],`${task.id}: checked answer`);
 return {id:task.id,family,parameters,answer:fmt(answer),solution:[...steps,`Ответ: ${fmt(answer)}.`].join('\n\n').replace(/([abcd])→/g,'→$1'),diagram_svg:'',diagram_caption:''};
}
function verifyVector(record){
 const p=record.parameters,n=Number(record.answer.replace('−','-').replace(',','.'));assert.equal(n,expected[record.id]);
 if(record.family==='angle')assert.ok(Math.abs(p.la*p.lb*Math.cos(p.degrees*Math.PI/180)-n)<1e-10);
 else if(record.family==='dot')assert.equal((norm2(p.c.map((x,i)=>x+p.d[i]))-norm2(p.c)-norm2(p.d))/2,n);
 else {assert.equal(n*n,p.ka*p.ka*norm2(p.a)+2*p.ka*p.kb*(p.a[0]*p.b[0]+p.a[1]*p.b[1])+p.kb*p.kb*norm2(p.b));assert.ok(n>=0);}
}
module.exports={solveVector,verifyVector};
