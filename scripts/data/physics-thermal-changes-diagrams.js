const {cards,svg,original,txt,C,rect,line,arrow,force}=require('../lib/physics-svg');
const {records,cases}=require('./physics-thermal-changes');
const inventory=require('./physics-completion-catalog.json');
const diagrams={};
for(const[id,r]of Object.entries(records)){
 const c=cases[id],images=inventory.find(t=>t.id===id).images;
 let body='',y=72;
 if(c.kind==='piston'){
  const pic=original(images[0],115,145,235,360),yp=pic.Y(c.mode==='ball'?54/180:78/(id==='2D4D17'?128:129));
  body+=txt(35,80,'Исходный рисунок и силы',C.ink,19)+pic.body;
  body+=force(pic.X(.5),yp,0,-110,C.blue,'pS',[10,-5,'start']);
  body+=force(pic.X(.23),yp,0,100,C.red,'p_атмS',[-8,20,'middle']);
  body+=force(pic.X(.76),yp,0,100,C.purple,'Mg',[10,12,'start']);
  body+=arrow(65,260,0,-115,C.ink,'Oy',[-8,-8,'middle']);
  body+=txt(370,190,'На поршень:',C.ink,20)+txt(370,225,'pS — вверх',C.blue,20)+txt(370,260,'p_атмS — вниз',C.red,20)+txt(370,295,'Mg — вниз',C.purple,20);
  if(c.mode==='ball'){
   const bx=pic.X(.49),by=pic.Y(.835);
   body+=force(bx,by,0,-75,C.green,'F_A',[-12,-4,'end']);
   body+=force(bx,by,0,90,C.red,'m_шg',[14,5,'start']);
   body+=force(bx,pic.Y(.985),0,-30,C.purple,'N_д',[65,5,'start']);
   body+=txt(370,390,'На шарик:',C.ink,20)+txt(370,425,'F_A и N_д — вверх',C.green,20)+txt(370,460,'m_шg — вниз',C.red,20);y=565;
  }else y=pic.h+175;
 }else if(c.kind==='statements'){
  body+=txt(35,78,'Вертикальный цилиндр; Oy вверх',C.ink,19);
  body+=line(120,110,120,435)+line(300,110,300,435)+line(120,435,300,435)+rect(122,265,176,22,'#ddd');
  body+=txt(210,390,'Гелий',C.ink,22,'middle');
  body+=force(210,276,0,-120,C.blue,'pS',[12,-4,'start']);
  body+=force(160,276,0,70,C.red,'p_атмS',[-14,25,'middle']);
  body+=force(265,276,0,70,C.purple,'Mg',[18,6,'start']);
  body+=arrow(65,255,0,-120,C.ink,'Oy',[-8,-8,'middle']);
  body+=txt(365,180,'Равновесие поршня',C.ink,20)+txt(365,220,'pS = p_атмS + Mg',C.ink,20);
  body+=txt(365,310,'Песок добавляет',C.ink,19)+txt(365,340,'нагрузку m_пg вниз',C.ink,19);y=465;
 }else if(images.length){
  for(const file of images){const pic=original(file,60,y+28,550,330);body+=txt(50,y+10,'Исходный рисунок ФИПИ',C.ink,18)+pic.body;y+=pic.h+65;}
 }else if(c.kind==='carnot'){
  body+=rect(55,90,230,55,'#fff0e8')+txt(170,124,'Нагреватель T_н',C.red,21,'middle');
  body+=rect(55,215,230,55)+txt(170,250,'Рабочее тело',C.blue,21,'middle');
  body+=rect(55,340,230,55,'#e9f7f2')+txt(170,375,'Холодильник T_х',C.green,21,'middle');
  body+=arrow(170,152,0,56,C.red,'Q_н',[15,-18,'start'])+arrow(170,278,0,55,C.green,'Q_х',[15,-18,'start']);
  body+=arrow(295,240,220,0,C.blue,'A',[15,6,'start']);y=425;
 }else if(c.kind==='mixture'){
  const after=c.initial.map((v,i)=>v/2+c.added[i]),beforeSum=c.initial.reduce((a,b)=>a+b),afterSum=after.reduce((a,b)=>a+b),n=x=>String(x).replace('.',',');
  body+=rect(55,100,240,160)+rect(385,100,240,160,'#ecf8f1');
  body+=txt(175,133,'До изменения',C.ink,21,'middle')+txt(505,133,'После изменения',C.ink,21,'middle');
  body+=txt(75,175,`ν₁ = ${n(c.initial[0])} моль`)+txt(75,207,`ν₂ = ${n(c.initial[1])} моль`)+txt(75,239,`Всего ${n(beforeSum)} моль`);
  body+=txt(405,175,`ν₁′ = ${n(after[0])} моль`)+txt(405,207,`ν₂′ = ${n(after[1])} моль`)+txt(405,239,`Всего ${n(afterSum)} моль`);
  body+=arrow(307,183,65,0,C.blue)+txt(340,310,'Объём сосуда и температура постоянны',C.ink,22,'middle');y=345;
 }
 const panels=cards([['Закон и модель',r.law],['Изменение величин',r.summary],['Ответ в порядке условия',c.answer]],y);
 diagrams[id]=svg(id,r.title,r.diagramCaption,body+panels.body,panels.end+12);
}
module.exports={diagrams};
