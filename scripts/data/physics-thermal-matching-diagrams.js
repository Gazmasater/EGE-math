const {cards,svg,original,txt,C,rect,line,arrow,force}=require('../lib/physics-svg');
const {records,cases}=require('./physics-thermal-matching');
const inventory=require('./physics-completion-catalog.json');
const diagrams={};
for(const[id,r]of Object.entries(records)){
 const c=cases[id],images=inventory.find(t=>t.id===id).images;
 let body='',y=78;
 if(images.length){
  for(const[i,file]of images.entries()){
   const pic=original(file,60,y+26,550,330);
   body+=txt(50,y+8,images.length===2?(i?'Б: исходный график':'А: исходный график'):'Исходный рисунок ФИПИ',C.ink,19)+pic.body;
   y+=pic.h+62;
  }
 }else if(c.kind==='piston'){
  const light=['light','argon'].includes(c.mode);
  body+=txt(35,80,'Поршень в равновесии; ось Oy вверх',C.ink,19);
  body+=line(120,110,120,430)+line(300,110,300,430)+line(120,430,300,430)+rect(122,245,176,24,'#ddd');
  body+=txt(210,355,c.mode==='helium'?'Гелий':c.mode==='light'?'Газ':'Аргон',C.ink,22,'middle');
  body+=force(210,257,0,-118,C.blue,'pS',[12,-4,'start']);
  body+=force(160,257,0,86,C.red,'p_атмS',[-14,24,'middle']);
  if(!light)body+=force(265,257,0,86,C.purple,'Mg',[15,6,'start']);
  body+=arrow(65,252,0,-125,C.ink,'Oy',[-8,-8,'middle']);
  body+=txt(365,178,'Баланс сил',C.ink,20)+txt(365,217,light?'pS = p_атмS':'pS = p_атмS + Mg',C.ink,20);
  body+=txt(365,288,light?'Весом пренебрегаем':'M и S постоянны',C.ink,19)+txt(365,327,'Давление постоянно',C.ink,19);
  y=460;
 }else if(c.kind==='carnot'){
  body+=rect(55,90,240,55,'#fff0e8')+txt(175,124,'Нагреватель T₁',C.red,21,'middle');
  body+=rect(55,215,240,55)+txt(175,250,'Рабочее тело',C.blue,21,'middle');
  body+=rect(55,340,240,55,'#e9f7f2')+txt(175,375,'Холодильник T₂',C.green,21,'middle');
  body+=arrow(175,153,0,55,C.red,'Q₁',[15,-18,'start'])+arrow(175,278,0,55,C.green,'Q₂',[15,-18,'start']);
  body+=arrow(310,241,200,0,C.blue,'A',[15,6,'start']);y=425;
 }
 const panels=cards([['Физические законы',r.law],['Соответствие',r.summary],['Ответ: А, затем Б',c.answer]],y);
 diagrams[id]=svg(id,r.title,r.diagramCaption,body+panels.body,panels.end+12);
}
module.exports={diagrams};
