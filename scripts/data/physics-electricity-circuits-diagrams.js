const {cards,svg,original,txt,C}=require('../lib/physics-svg');
const {records}=require('./physics-electricity-circuits');
const inventory=require('./physics-completion-catalog.json');
const diagrams={};
for(const[id,r]of Object.entries(records)){
 let body='',y=80;
 for(const file of inventory.find(t=>t.id===id).images){
  const pic=original(file,55,y+35,560,350);
  body+=txt(40,y+5,'Исходная схема или график ФИПИ',C.ink,19)+pic.body;
  y+=pic.h+75;
 }
 const panels=cards([['Физический закон',r.law],['Расчёт по условию',r.summary],['Ответ',r.answer]],y);
 diagrams[id]=svg(id,r.title,r.diagramCaption,body+panels.body,panels.end+12);
}
module.exports={diagrams};
