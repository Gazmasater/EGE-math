const {C,txt,line,rect,dot,arrow,original,cards,svg}=require('../lib/physics-svg');
const {records,cases}=require('./physics-molecular-gas');
const catalog=require('./physics-completion-catalog.json'),diagrams={};
for(const[id,r]of Object.entries(records)){
 const c=cases[id];let body='',y=76;const images=catalog.find(t=>t.id===id).images;
 for(const file of images){
  // FIPI's second 0771EE image is a 2×2 transparent spacer; retain its exact bytes without magnifying it.
  const spacer=id==='0771EE'&&file.includes('_2_1604581244');
  const im=original(file,70,y,spacer?2:540,spacer?2:390);body+=im.body;y+=im.h+(spacer?0:25);
 }
 if(c.kind.startsWith('piston-')){
  body+=rect(100,y+25,480,170,'#f8fbff')+rect(330,y+25,20,170,'#d8e1ed');
  body+=txt(190,y+65,c.kind==='piston-energy'?c.gas1:'неона',C.blue,23,'middle')+txt(470,y+65,c.kind==='piston-energy'?c.gas2:'аргона',C.green,23,'middle');
  body+=arrow(340,y+118,110,0,C.blue,'p₁S',[4,-18,'end'])+arrow(340,y+118,-110,0,C.red,'p₂S',[-4,-18,'start'])+dot(340,y+118,C.ink);
  body+=arrow(100,y+230,470,0,C.ink,'x',[18,5,'start'])+txt(340,y+267,'p₁S − p₂S = 0',C.ink,24,'middle');
  if(id==='0A3E4F')body+=txt(340,y+298,'Вес и реакция стенок уравновешены поперёк оси',C.ink,18,'middle');
  y+=335;
 }
 const stages=[['Физический закон',r.law],['Связь величин',r.summary]];
 if(c.kind==='table')stages.splice(1,0,['Масштаб таблицы','p — в 10⁵ Па; V — в 10⁻³ м³; T — в К']);
 stages.push(['Ответ',r.answer]);
 const panel=cards(stages,y);diagrams[id]=svg(id,r.title,r.diagramCaption,body+panel.body,panel.end+15);
}
module.exports={diagrams};
