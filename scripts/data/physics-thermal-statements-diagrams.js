const {cards,svg,original,txt,C}=require('../lib/physics-svg');
const {records}=require('./physics-thermal-statements');
const inventory=require('./physics-completion-catalog.json');
const diagrams={};
for(const[id,r]of Object.entries(records)){
 let body='',y=78;
 for(const file of inventory.find(t=>t.id===id).images){
  const pic=original(file,60,y+26,550,340);
  body+=txt(50,y+8,'Исходный рисунок ФИПИ',C.ink,19)+pic.body;
  y+=pic.h+62;
 }
 const panels=cards([['Физические законы',r.law],['Вывод по условию',r.summary],['Верные утверждения',r.answer.split('').join(', ')]],y);
 diagrams[id]=svg(id,r.title,r.diagramCaption,body+panels.body,panels.end+12);
}
module.exports={diagrams};
