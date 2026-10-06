const {C,txt,line,dot,arrow,cards,svg}=require('../lib/physics-svg');
const {records}=require('./physics-kinematics-motion');const diagrams={};
for(const[id,r]of Object.entries(records)){
 let b='',y=360;
 if(['8A3445','B5CFF9','913207'].includes(id)){
  b+=`<circle cx="220" cy="200" r="100" fill="none" stroke="${C.ink}" stroke-width="2"/>`+dot(220,200,C.ink)+txt(198,222,'O');
  b+=line(220,200,320,200)+txt(256,226,'R')+dot(320,200)+arrow(320,200,0,-82,C.blue,id==='913207'?'u':'v',[14,5,'start'])+arrow(320,200,-68,0,C.red,'aц',[-5,-17,'start']);
  b+=txt(398,150,'Скорость — по касательной',C.blue,17)+txt(398,185,'Ускорение — к центру',C.red,17)+txt(398,228,id==='913207'?'aцR = u²; u = ωR':'aцR = v²; v = ωR',C.ink,19);
 }else if(id==='5E532C'){
  b+=arrow(65,220,540,0,C.ink,'x, км',[0,-14,'end']);
  for(const[x,label]of [[100,'A: 0'],[340,'B: 30'],[500,'Встреча: 50']])b+=dot(x,220)+txt(x,251,label,C.ink,19,'middle');
  b+=dot(100,140,C.blue)+arrow(100,140,110,0,C.blue,'50 км·ч⁻¹',[-20,-18,'middle'])+txt(100,185,'Мотоциклист',C.blue,18,'middle');
  b+=dot(340,140,C.green)+arrow(340,140,70,0,C.green,'20 км·ч⁻¹',[0,-18,'middle'])+txt(340,185,'Трактор',C.green,18,'middle');
  b+=txt(70,300,'Через 1 ч: 50 · 1 = 30 + 20 · 1 = 50 км',C.ink,23);
 }else{
  const coord=id==='3CF615',v0=coord?5:id==='B5F7C7'?5:15,v1=coord?-3:id==='B5F7C7'?15:5;
  const X=t=>90+220*t,Y=v=>coord?250-30*v:350-16*v;
  b+=arrow(90,coord?350:350,0,coord?-280:-280,C.ink,'vₓ, м·с⁻¹',[10,-5,'start'])+arrow(90,Y(0),480,0,C.ink,'t, с',[15,6,'start']);
  for(const v of [v0,v1])b+=line(83,Y(v),97,Y(v))+txt(76,Y(v)+6,String(v).replace('-', '−'),C.ink,18,'end');
  b+=line(X(0),Y(v0),X(2),Y(v1),C.blue,3)+line(X(2),Y(0),X(2),Y(v1),C.gray,1,'5 4');
  b+=txt(X(2),Y(0)+26,'2',C.ink,18,'middle')+txt(75,Y(0)+25,'0',C.ink,18);
  b+=txt(410,90,coord?'vₓ = 5 − 4t':id==='B5F7C7'?'vₓ = 5 + 5t':'vₓ = 15 − 5t',C.blue,22);y=405;
 }
 const panel=cards(r.stages,y);diagrams[id]=svg(id,r.title,r.diagramCaption,b+panel.body,panel.end+12);
}
module.exports={diagrams};
