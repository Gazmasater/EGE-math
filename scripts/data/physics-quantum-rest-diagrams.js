const {C,txt,rect,line,arrow,original,cards,svg}=require('../lib/physics-svg');
const {records}=require('./physics-quantum-rest');
const catalog=require('./physics-completion-catalog.json');
const diagrams={};
for(const [id,r]of Object.entries(records)){
 let body='',y=80;
 for(const file of catalog.find(t=>t.id===id).images){const p=original(file,300,y,80,80);body+=p.body;y+=p.h+25;}
 if(r.kind==='photo'){
  body+=rect(55,y,245,95)+txt(177,y+40,'Фотон',C.blue,25,'middle')+txt(177,y+77,'Энергия E',C.ink,22,'middle')+
  arrow(315,y+47,55,0,C.blue)+rect(395,y,230,95,'#ecf8f1')+txt(510,y+40,'Электрон',C.green,25,'middle')+
  txt(510,y+77,'K = E − A',C.ink,22,'middle')+txt(340,y+148,'E = A + K',C.ink,29,'middle')+
  txt(340,y+184,'A — работа выхода из металла',C.ink,22,'middle');y+=222;
 }else if(r.kind==='refraction'){
  body+=rect(50,y,285,130)+rect(335,y,295,130,'#ecf8f1')+line(335,y,335,y+130,C.gray,2)+
  txt(190,y+34,'Воздух',C.blue,24,'middle')+txt(480,y+34,'Стекло',C.green,24,'middle')+
  txt(190,y+74,'v ≈ c',C.ink,23,'middle')+txt(480,y+74,'v = c · 1,5⁻¹',C.ink,23,'middle')+
  txt(340,y+177,'ν сохраняется; λ пропорциональна v',C.ink,22,'middle');y+=215;
 }else if(r.kind==='atom'){
  body+=rect(70,y,540,90)+txt(340,y+39,'90 протонов + 90 электронов',C.ink,25,'middle')+
  txt(340,y+76,'+90e − 90e = 0',C.green,24,'middle');y+=125;
 }else if(r.kind==='decay'){
  body+=rect(60,y,560,90)+txt(340,y+40,'За один период — половина остатка',C.ink,24,'middle')+
  txt(340,y+75,'2,4 → 1,2 → 0,6 → 0,3 мг',C.blue,26,'middle');y+=125;
 }else{
  body+=rect(65,y,550,100)+txt(340,y+42,r.kind==='flow'?'Энергия потока фотонов':'Свойства отдельного фотона',C.ink,25,'middle')+
  txt(340,y+81,r.kind==='flow'?'W = NE = Pt':'E = hν; E = pc; pλ = h',C.blue,25,'middle');y+=138;
 }
 const panel=cards(r.stages,y);diagrams[id]=svg(id,r.title,r.diagramCaption,body+panel.body,panel.end+15);
}
module.exports={diagrams};
