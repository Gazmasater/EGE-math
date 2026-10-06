const {cards,svg,original,txt,C,rect,arrow}=require('../lib/physics-svg');
const {records,cases}=require('./physics-thermodynamics-engines');
const inventory=require('./physics-completion-catalog.json');
const diagrams={};
for(const[id,r]of Object.entries(records)){
 let body='',y=68;
 const images=inventory.find(t=>t.id===id).images;
 for(const file of images){const pic=original(file,50,y+28,570,310);body+=txt(50,y+10,'Исходная диаграмма ФИПИ',C.ink,18)+pic.body;y+=pic.h+60;}
 if(!images.length){
  body+=rect(60,70,230,60,'#fff0e8')+txt(175,106,'Нагреватель',C.red,22,'middle');
  body+=rect(60,210,230,60)+txt(175,246,'Рабочее тело',C.blue,22,'middle');
  body+=rect(60,350,230,60,'#e9f7f2')+txt(175,386,'Холодильник',C.green,22,'middle');
  body+=arrow(175,137,0,65,C.red,'Q_н',[20,-25,'start']);
  body+=arrow(175,277,0,65,C.green,'Q_х',[20,-25,'start']);
  body+=arrow(300,240,230,0,C.blue,'A',[12,6,'start']);
  body+=txt(355,217,'Полезная работа',C.ink,19);y=435;
 }
 const panels=cards([['Закон и модель',r.law],['Данные и ход процесса',r.summary],['Результат',r.diagramCaption.split('Ответ: ')[1]]],y);
 diagrams[id]=svg(id,r.title,r.diagramCaption,body+panels.body,panels.end+12);
}
module.exports={diagrams};
