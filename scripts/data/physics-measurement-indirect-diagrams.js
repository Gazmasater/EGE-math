const {cards,svg,txt,line,rect,arrow,C}=require('../lib/physics-svg');
const {records}=require('./physics-measurement-indirect');
const diagrams={};
for(const[id,r]of Object.entries(records)){
 let body='';
 if(['F13F4D','617BD6'].includes(id)){
  body+=rect(110,114,450,92,'#f4ebd5');
  const count=id==='F13F4D'?20:40,step=400/count;
  for(let i=0;i<count;i++)body+=`<ellipse cx="${135+(i+.5)*step}" cy="160" rx="${step/2}" ry="58" fill="none" stroke="${C.blue}" stroke-width="2"/>`;
  body+=line(135,229,135,251)+line(535,229,535,251)+line(135,241,535,241);
  body+=txt(335,276,'L — осевая длина намотки',C.ink,20,'middle')+arrow(555,242,60,0,C.gray,'x');
 }else if(id==='2EC822'){
  body+=rect(190,112,300,106,'#edf4ff');
  for(let y=120;y<218;y+=8)body+=line(190,y,490,y,C.blue,1);
  body+=txt(340,93,'250 листов — показана часть слоёв',C.ink,18,'middle');
  body+=line(160,112,160,218)+line(149,112,171,112)+line(149,218,171,218)+txt(143,171,'L',C.ink,20,'end');
  body+=arrow(530,112,0,106,C.gray,'x',[12,4]);
  body+=txt(340,276,'Толщина стопки: L = 250h',C.ink,20,'middle');
 }else{
  body+=rect(185,160,310,92,'#edf4ff')+line(160,144,520,144,C.ink,4);
  body+=rect(230,195,220,36,'white')+txt(340,221,id==='B044CF'?'75 г':'60 г',C.green,24,'middle');
  body+=`<path d="M240 142L250 98Q340 76 430 98L440 142Z" fill="#fff5e8" stroke="${C.ink}" stroke-width="2"/>`;
  body+=txt(340,72,id==='B044CF'?'150 одинаковых болтов':'200 одинаковых гаек',C.ink,20,'middle');
  body+=txt(340,282,'Масса пакета не учитывается',C.ink,20,'middle');
 }
 const panels=cards(r.stages,310);
 diagrams[id]=svg(id,r.title,r.diagramCaption,body+panels.body,panels.end+12);
}
module.exports={diagrams};
