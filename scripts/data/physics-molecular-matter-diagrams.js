const {cards,svg,rect,txt,C}=require('../lib/physics-svg');
const {records,cases}=require('./physics-molecular-matter');
const diagrams={};
for(const[id,r]of Object.entries(records)){
 let body='',y=76;const c=cases[id];
 if(c.kind==='mix'){
  body+=rect(70,y,250,90,'#eef5ff')+rect(360,y,250,90,'#eef5ff');
  body+=txt(195,y+35,'V, T',C.ink,22,'middle')+txt(485,y+35,'V, T',C.ink,22,'middle');
  body+=txt(195,y+70,c.phi1+'%',C.blue,24,'middle')+txt(485,y+70,c.phi2+'%',C.blue,24,'middle');
  y+=120;
 }
 const panel=cards([['Физический закон',r.law.replaceAll(' ÷ ',' : ')],['Связь величин',r.summary],['Ответ',r.answer]],y);
 diagrams[id]=svg(id,r.title,r.diagramCaption,body+panel.body,panel.end+15);
}
module.exports={diagrams};
