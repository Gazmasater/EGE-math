const {records}=require('./physics-laws-statements');
const {cards,svg,txt,C}=require('../lib/physics-svg');
const diagrams={};
for(const r of Object.values(records)){
 const panels=cards(r.stages,98);
 const body=txt(28,74,'Законы для оценки каждого пункта',C.gray,19)+panels.body+txt(32,panels.end+28,'Ответ: '+r.answer,C.green,24);
 diagrams[r.id]=svg(r.id,r.title,r.diagramCaption,body,panels.end+58);
}
module.exports={diagrams};
