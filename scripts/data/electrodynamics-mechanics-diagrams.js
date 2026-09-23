const {C,txt,line,dot,arrow,force,original}=require('../lib/physics-svg');
function mechanicsDiagram(id,kind,item,y){
 let b=txt(340,y+15,'Все силы и выбранные направления',C.ink,22,'middle'),h=535;
 if(kind==='vertical-charge-loop'){
  const p=original(item.images[0],229,y+300,250,310),x=p.X(68/131),o=p.Y(29/190),v=p.Y(165/190),r=v-o,top=o-r;
  b+=`<circle cx="${x}" cy="${o}" r="${r}" fill="none" stroke="${C.gray}" stroke-width="2" stroke-dasharray="6 7"/>`+p.body;
  b+=force(x,v,0,-90,C.green,'T',[-13,0,'end'])+force(x,v,0,75,C.red,'mg',[-15,5,'end'])+force(x,v,0,45,C.blue,'F_Л',[15,0,'start']);
  b+=dot(x,top,C.ink)+force(x,top,0,-60,C.blue,'F_Л',[15,-4,'start'])+force(x,top,0,60,C.red,'mg',[15,0,'start'])+arrow(x,top,-70,0,C.green,'υ_в',[-10,0,'end']);
  b+=txt(x-25,top+34,'T_в = 0',C.ink,20,'end')+arrow(600,top+65,-45,0,C.ink,'τ',[-10,0,'end'])+arrow(600,top+65,0,60,C.ink,'n');
  b+=txt(340,y+685,'Вверху: mg вниз, F_Л вверх, натяжение на границе нулевое',C.ink,18,'middle');h=725;
 }else if(kind==='rod-unload'){
  b+=line(180,y+55,180,y+220)+line(480,y+55,480,y+220)+line(180,y+220,480,y+220,C.ink,7)+line(155,y+55,205,y+55,C.ink,4)+line(455,y+55,505,y+55,C.ink,4);
  for(const x of [180,480])b+=force(x,y+220,0,-85,C.green,'T',[12,0,'start']);
  b+=force(330,y+220,0,95,C.red,'mg',[15,0,'start'])+force(330,y+220,0,-90,C.blue,'F_A',[15,0,'start'])+arrow(285,y+258,-60,0,C.purple,'I',[-10,0,'end']);
  b+=`<circle cx="550" cy="${y+220}" r="13" fill="white" stroke="${C.ink}" stroke-width="2"/>`+dot(550,y+220,C.ink)+txt(550,y+265,'B к нам',C.ink,18,'middle');
  b+=arrow(100,y+330,0,-85,C.ink,'y')+txt(340,y+410,'После включения тока: T = mg ÷ 4, F_A = mg ÷ 2',C.ink,18,'middle');h=455;
 }else{
  const p=original(item.images[0],kind==='rod-friction'?80:140,y+75,520,330),X=p.X,Y=p.Y;b+=p.body;
  if(kind==='conical-charge'){
   const x=X(110/149),v=Y(142/168);
   b+=force(x,v,0,70,C.red,'mg',[15,0,'start'])+force(x,v,-90,0,C.blue,'F_Л',[-5,-15,'end'])+force(x,v,-31,-78,C.green,'T',[10,-3,'start']);
   b+=arrow(550,y+295,-60,0,C.ink,'n',[-10,0,'end'])+arrow(550,y+295,0,-75,C.ink,'y');
   b+=txt(340,y+485,'Сила Лоренца и горизонтальная часть T направлены к центру',C.ink,17,'middle');
  }else if(kind.startsWith('rod-pulse')){
   const tilted=kind.endsWith('tilted'),w=tilted?125:147,hh=tilted?235:236;
   const pts=tilted?[[68,218],[119,189]]:[[22,214],[75,185]],x=X((pts[0][0]+pts[1][0])/2/w),v=Y((pts[0][1]+pts[1][1])/2/hh);
   pts.forEach(([xx,yy],j)=>b+=force(X(xx/w),Y(yy/hh),tilted?-18:0,-68,C.green,j?'T₂':'T₁',[j?13:-12,-2,j?'start':'end']));
   b+=force(x,v,95,0,C.blue,'F_A',[10,0,'start'])+force(x,v,0,70,C.red,'mg',[15,5,'start']);
   b+=arrow(535,y+310,60,0,C.ink,'x')+arrow(535,y+310,0,-65,C.ink,'y');
   b+=txt(340,y+485,'Короткий толчок: горизонтальное действие подвеса мало',C.ink,18,'middle');
  }else if(kind==='rod-friction'){
   const x=X(121/240),v=Y(118/150);
   b+=force(x,v,0,-90,C.green,'N',[15,-5,'start'])+force(x,v,0,75,C.red,'mg',[15,5,'start'])+force(x,v,110,0,C.blue,'F_A',[10,-15,'start'])+force(x,v,-95,0,C.purple,'F_тр',[-12,-15,'end']);
   b+=arrow(555,y+450,65,0,C.ink,'x')+arrow(555,y+450,0,-65,C.ink,'y');
   b+=txt(300,y+485,'F_A = F_тр; N = mg',C.ink,20,'middle');
  }else throw Error('Unknown mechanics diagram '+kind);
 }
 return{body:b,h};
}
module.exports={mechanicsDiagram};
