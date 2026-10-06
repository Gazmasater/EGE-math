const {cards,svg,original,txt,C,arrow,line,dot,esc}=require('../lib/physics-svg');
const {records,cases}=require('./physics-electricity-field');
const inventory=require('./physics-completion-catalog.json');
const diagrams={};
const axes=(x,y)=>arrow(x,y,52,0,C.gray,'x',[9,5])+arrow(x,y,0,-52,C.gray,'y',[-5,-10])+txt(x-12,y+23,'Оси',C.gray,16);
const geometry={
 '72454E':{size:[152,112],point:[31,59],delta:[65,28]},
 '2FB019':{size:[112,142],point:[61,28],delta:[28,65]},
 CCAAA1:{size:[142,106],point:[28,55],delta:[65,28]},
 FC35C8:{size:[142,106],point:[29,55],delta:[65,28]},
 '8FA4CE':{size:[151,115],point:[121,57],delta:[65,28]},
 '170361':{size:[120,150],point:[65,120],delta:[28,65]}
};
function decoratedOriginal(id,file,c){
 let body='',end=465;
 if(c.kind==='acceleration'){
  const g=geometry[id],pic=original(file,220,142,310,230),px=pic.X(g.point[0]/g.size[0]),py=pic.Y(g.point[1]/g.size[1]);
  body+=txt(40,82,'Исходная схема ФИПИ и силы на заряд',C.ink,20)+pic.body;
  for(const[sign,name,color]of[[c.vplus,'F₊',C.blue],[c.vminus,'F₋',C.red]]){
   const dx=sign[0]*g.delta[0]*1.1,dy=-sign[1]*g.delta[1]*1.1;
   const vector=arrow(px,py,dx,dy,color,name,[dx>0?10:-10,dy>0?22:-12,dx>0?'start':'end']);
   if(id==='8FA4CE'&&name==='F₋'){
    body+=`<defs><mask id="field-label-${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="680" height="465"><rect width="680" height="465" fill="white"/><rect x="${px+8}" y="${py+12}" width="49" height="32" fill="black"/></mask></defs><g mask="url(#field-label-${id})">${vector}</g>`;
   }else body+=vector;
  }
  body+=dot(px,py,C.ink)+axes(85,355)+txt(45,414,'F₊ — от +Q; F₋ — от −Q',C.ink,20)+txt(45,445,'Ускорение: '+c.answer,C.green,22);
 }else if(c.kind==='square'){
  const pic=original(file,230,140,300,260),cx=pic.X(70/(id==='144026'?135:142)),cy=pic.Y(63/124);
  body+=txt(40,82,'Исходная схема ФИПИ и четыре силы',C.ink,20)+pic.body;
  for(const[label,x,y]of[['A',.2,0],['B',.8,0],['C',.2,1],['D',.8,1]])body+=txt(pic.X(x),pic.Y(y)+(y===0?-12:26),label,C.purple,19,'middle');
  const forces=c.mode==='right'?[[68,-68,'F_B, F_C'],[68,68,'F_A, F_D']]:[[-68,-68,'F_A, F_D'],[68,-68,'F_B, F_C']];
  // Пропуск в стрелке сохраняет исходную подпись −q под центральной точкой.
  const maskId='field-force-mask-'+id;
  if(c.mode==='right')body+=`<defs><mask id="${maskId}" maskUnits="userSpaceOnUse" x="0" y="0" width="680" height="480"><rect width="680" height="480" fill="white"/><rect x="${cx-5}" y="${cy+9}" width="54" height="34" fill="black"/></mask></defs>`;
  for(const[dx,dy,label]of forces){
   const vector=arrow(cx,cy,dx,dy,C.blue);
   body+=c.mode==='right'?`<g mask="url(#${maskId})">${vector}</g>`:vector;
   body+=txt(dx>0?pic.X(1)+16:pic.X(0)-16,cy+dy+5,label,C.blue,18,dx>0?'start':'end');
  }
  body+=dot(cx,cy,C.ink)+axes(85,365)+txt(40,450,'Попарно совпадающие силы подписаны вместе',C.ink,19);end=478;
 }else if(c.kind==='field-direction'){
  const pic=original(file,160,145,350,145),coords={BCB00B:[81,29,166,57],EB53BC:[155,29,163,38],'7C1EDE':[51,35,208,72],'1A0E58':[155,29,163,38],'2241AF':[51,36,197,62]}[id];
  const px=pic.X(coords[0]/coords[2]),py=pic.Y(coords[1]/coords[3]),dx=c.answer==='вправо'?85:-85;
  body+=txt(40,82,'Исходная схема ФИПИ и суммарное поле',C.ink,20)+pic.body+arrow(px,py,dx,0,C.blue)+txt(px+dx/2,py-38,'E⃗',C.blue,18,'middle')+dot(px,py,C.ink)+axes(85,340);end=385;
 }else if(c.kind==='triangle'){
  const pic=original(file,200,120,310,270);body+=txt(40,82,'Исходный прямоугольный треугольник',C.ink,20)+pic.body+axes(85,355);
  body+=txt(40,426,'Силы вдоль AC и AB; сравниваем их модули',C.ink,19);end=454;
 }else{
  const pic=original(file,90,120,500,345),X=x=>pic.X(x/235),Y=y=>pic.Y(y/161);
  body+=txt(40,82,'Разложение поля на исходной сетке ФИПИ',C.ink,20)+pic.body;
  body+=arrow(X(101),Y(54),X(134.5)-X(101),Y(18.5)-Y(54),C.green,'E_A',[8,-10]);
  body+=arrow(X(101),Y(54),X(168)-X(101),Y(125)-Y(54),C.red,'E_B',[20,-15]);
  body+=line(X(134.5),Y(18.5),X(201.5),Y(89.5),C.gray,2,'5 5')+line(X(168),Y(125),X(201.5),Y(89.5),C.gray,2,'5 5');
  body+=axes(75,540)+txt(180,516,'E_A=(2; 2), E_B=(4; −4)',C.ink,20)+txt(180,547,'Сумма: E⃗=(6; −2)',C.green,22);end=575;
 }
 return{body,end};
}
for(const[id,r]of Object.entries(records)){
 const c=cases[id],files=inventory.find(t=>t.id===id).images;let body='',y=90;
 if(files.length){const d=decoratedOriginal(id,files[0],c);body=d.body;y=d.end;}
 else if(c.kind==='capacitor'){
  body+=txt(45,95,'Первый конденсатор',C.ink,20)+txt(365,95,'Второй конденсатор',C.ink,20);
  for(const[x,a,b]of[[165,'3C','U₁=ℰ'],[480,'C','U₂=3ℰ']])body+=line(x-16,125,x-16,200,C.blue,4)+line(x+16,125,x+16,200,C.blue,4)+txt(x,229,a,C.ink,22,'middle')+txt(x,265,b,C.ink,22,'middle');
  y=305;
 }else{
  const left=c.kind==='contact'?`${c.q1>0?'+':''}${c.q1}${c.wire?'q':' нКл'}`:'q₁',right=c.kind==='contact'?`${c.q2}${c.wire?'q':' нКл'}`:'q₂';
  body+=line(160,160,520,160,C.gray,2,'6 6')+dot(160,160,C.blue)+dot(520,160,C.red)+txt(160,127,left,C.blue,23,'middle')+txt(520,127,right,C.red,23,'middle')+txt(340,194,'r',C.ink,22,'middle');
  body+=txt(45,242,c.kind==='contact'?'Одинаковые проводящие шарики':'Два точечных заряда',C.ink,20);
  y=274;
 }
 const panels=cards([['Физический закон',r.law],['Вывод по условию',r.summary],['Ответ',r.answer]],y);
 diagrams[id]=svg(id,r.title,r.diagramCaption,body+panels.body,panels.end+12);
}
module.exports={diagrams};
