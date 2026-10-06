const {cards,svg,original,txt,C}=require('../lib/physics-svg');
const {records}=require('./physics-thermodynamics-gas');
const inventory=require('./physics-completion-catalog.json');
const diagrams={};
for(const[id,r]of Object.entries(records)){
 let body='',y=68;
 for(const file of inventory.find(t=>t.id===id).images){
  const pic=original(file,50,y+28,570,310);
  body+=txt(50,y+10,'Исходная диаграмма ФИПИ',C.ink,18)+pic.body;y+=pic.h+60;
 }
 const panels=cards([['Закон и модель',r.law],['Данные и ход процесса',r.summary],['Результат',r.diagramCaption.split('Ответ: ')[1]]],y);
 diagrams[id]=svg(id,r.title,r.diagramCaption,body+panels.body,panels.end+12);
}
module.exports={diagrams};
