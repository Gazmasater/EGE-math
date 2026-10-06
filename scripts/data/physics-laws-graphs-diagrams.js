const {records}=require('./physics-laws-graphs');
const {original,cards,svg,txt,C}=require('../lib/physics-svg');
const diagrams={};
for(const r of Object.values(records)){
 let body=txt(28,76,'Графики из условия ФИПИ',C.gray,19);
 for(const [i,file] of r.images.entries()){
  const x=32+(i%3)*216,y=110+Math.floor(i/3)*212;
  body+=txt(x,y,String(i+1)+')',C.ink,20)+original(file,x,y+14,190,172).body;
 }
 const panels=cards(r.stages,550);body+=panels.body+txt(32,panels.end+28,'Ответ: '+r.answer,C.green,24);
 diagrams[r.id]=svg(r.id,r.title,r.diagramCaption,body,panels.end+58);
}
module.exports={diagrams};
