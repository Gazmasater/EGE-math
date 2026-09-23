const {C,txt,line,dot,arrow,force,original}=require('../lib/physics-svg');
const normal=(x,y,out,c)=>`<circle cx="${x}" cy="${y}" r="10" fill="white" stroke="${c}" stroke-width="2.5"/>`+(out?dot(x,y,c):line(x-5,y-5,x+5,y+5,c,2.5)+line(x-5,y+5,x+5,y-5,c,2.5));
function railDiagram(id,kind,item,y){
 let b=txt(340,y+15,'Все силы на исходной схеме',C.ink,22,'middle'),h=690;
 if(kind==='horizontal-rod'){
  const p=original(item.images[0],60,y+65,550,300),x=p.X(167/263),v=p.Y(80/160);b+=p.body;
  b+=force(x,v,105,0,C.blue,'F',[12,30,'start'])+force(x,v,-105,0,C.purple,'F_тр',[-12,28,'end'])+force(x,v,-60,0,C.red,'F_A',[-10,-15,'end']);
  b+=normal(x,v,true,C.green)+txt(x+20,v-18,'N к нам',C.green,18)+txt(x+20,v+28,'mg от нас',C.red,18);
  // Gravity uses the same centre; a concentric cross denotes the opposite normal.
  b+=line(x-15,v-15,x+15,v+15,C.red,2)+line(x-15,v+15,x+15,v-15,C.red,2);
  b+=txt(340,y+420,'Вид сбоку: Oy вертикально вверх',C.ink,20,'middle')+line(110,y+535,560,y+535,C.gray,3);
  b+=force(340,y+530,0,-75,C.green,'N',[15,0,'start'])+force(340,y+530,0,80,C.red,'mg',[15,5,'start'])+force(340,y+530,110,0,C.blue,'F',[10,-12,'start'])+force(340,y+530,-110,0,C.purple,'F_тр',[-10,25,'end'])+force(340,y+530,-65,0,C.red,'F_A',[-10,-15,'end']);
  b+=txt(340,y+655,'F = F_A + F_тр; N = mg',C.ink,20,'middle');
 }else if(kind==='two-rods'){
  const p=original(item.images[0],70,y+120,520,295),X=a=>p.X(a/183),Y=a=>p.Y(a/103);b+=p.body;
  for(const [xx,num]of [[113,1],[57,2]]){
   const x=X(xx),v=Y(63);
   b+=force(x,v,0,-82,C.green,'N'+(num===1?'₁':'₂'),[-12,-4,'end'])+force(x,v,0,100,C.red,'mg',[12,0,'start']);
   b+=force(x,v,-78,0,C.purple,'F_тр',[-10,25,'end'])+force(x,v,num===1?-48:48,0,C.blue,'F_A',[num===1?-10:10,num===1?48:-20,num===1?'end':'start']);
   if(num===1)b+=force(x,v,95,0,C.ink,'F',[10,-12,'start']);
  }
  b+=txt(340,y+475,'Первый — правый, второй — левый; оба движутся вправо',C.ink,18,'middle')+txt(340,y+520,'На каждом: N = mg; магнитные силы равны по модулю',C.ink,18,'middle')+txt(340,y+565,'υ₁ > υ₂; ток стремится уменьшить рост площади',C.ink,19,'middle');h=610;
 }else if(kind==='vertical-rod'){
  const p=original(item.images[0],175,y+105,360,385),X=a=>p.X(a/115),Y=a=>p.Y(a/130),x=X(36.5),v=Y(33);b+=p.body;
  b+=force(x,v,0,-115,C.blue,'F_A',[15,-5,'start'])+force(x,v,0,70,C.red,'mg',[15,0,'start']);
  b+=force(X(3),v,35,0,C.green,'N₁',[0,-15,'middle'])+force(X(70),v,-35,0,C.green,'N₂',[0,-15,'middle']);
  b+=arrow(540,y+215,0,90,C.ink,'υ, y',[12,0,'start'])+arrow(X(18),v+20,65,0,C.purple,'I',[10,18,'start']);
  b+=txt(340,y+555,'Установившееся движение: mg = BIl; U = q ÷ C',C.ink,18,'middle')+txt(340,y+595,'Через конденсатор ток не течёт; через резистор — I',C.ink,18,'middle');h=635;
 }else if(kind.startsWith('incline')){
  const isolated=kind==='incline-isolated',friction=kind==='incline-friction',w=isolated?231:friction?208:209,hh=isolated?118:friction?131:126;
  const p=original(item.images[0],90,y+65,520,300),x=p.X((isolated?55:85)/w),v=p.Y((isolated?98:friction?71:64)/hh);b+=p.body;
  b+=force(x,v,0,85,C.red,'mg',[14,5,'start'])+force(x,v,-45,-65,C.green,'N',[-12,-2,'end']);
  if(!isolated)b+=force(x,v,100,-36,C.blue,'F_A',[10,0,'start']);
  if(friction)b+=force(x,v,-70,55,C.purple,'F_тр',[-12,5,'end']);
  if(isolated)b+=arrow(x+150,v+20,-65,48,C.ink,'υ',[5,25,'start']);
  b+=txt(340,y+452,'Вид сбоку: нормаль и проекции сил',C.ink,21,'middle');
  const sx=330,sy=y+635,ca=Math.sqrt(3)/2,sa=.5;
  b+=line(125,sy+205*sa/ca,570,sy-240*sa/ca,C.ink,3)+dot(sx,sy,C.ink);
  b+=force(sx,sy,0,90,C.red,'mg',[14,5,'start'])+force(sx,sy,-50,-50*Math.sqrt(3),C.green,'N',[-15,0,'end']);
  if(!isolated)b+=force(sx,sy,130,0,C.blue,'F_A',[10,0,'start']);
  if(friction)b+=force(sx,sy,-90*ca,90*sa,C.purple,'F_тр',[-12,5,'end']);
  b+=arrow(555,sy+95,(isolated?-1:1)*70*ca,(isolated?1:-1)*70*sa,C.ink,'x',isolated?[-12,10,'end']:[10,0,'start'])+arrow(555,sy+95,-40,-40*Math.sqrt(3),C.ink,'y',[-12,0,'end']);
  b+=txt(340,y+830,isolated?'Цепь разомкнута: I = 0; ЭДС ℰ = BLυ cos α':'N = mg cos α + IBL sin α; F_A горизонтальна',C.ink,18,'middle');h=875;
 }else throw Error('Unknown rail scene '+kind);
 return{body:b,h};
}
module.exports={railDiagram};
