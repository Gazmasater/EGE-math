const {C,txt,line,dot,arrow,force,original}=require('../lib/physics-svg');
function normal(x,y,out,color,label,dx=20,dy=-15,anchor='start'){
 return `<circle cx="${x}" cy="${y}" r="10" fill="white" stroke="${color}" stroke-width="2.5"/>`+(out?dot(x,y,color):line(x-5,y-5,x+5,y+5,color,2.5)+line(x-5,y+5,x+5,y-5,color,2.5))+txt(x+dx,y+dy,label,color,19,anchor);
}
function frameDiagram(id,kind,item,y){
 let b=txt(340,y+15,'Токи и силы на исходной рамке',C.ink,22,'middle'),h=590;
 if(kind.startsWith('diagonal')){
  const copper=kind.endsWith('copper'),w=copper?195:212,hh=copper?195:216,left=copper?31:30,right=copper?144:166,top=copper?41:39,bottom=copper?126:141;
  const p=original(item.images[0],145,y+60,400,370),X=a=>p.X(a/w),Y=a=>p.Y(a/hh);b+=p.body;
  const mid=(left+right)/2,v=(top+bottom)/2;
  if(copper){b+=normal(X(mid),Y(top),true,C.blue,'F_NM',0,-23,'middle')+normal(X(mid),Y(bottom),true,C.blue,'F_KL',20,-20);b+=txt(X(left)-15,Y(v),'F_KN = 0',C.ink,17,'end')+txt(X(right)+15,Y(v),'F_LM = 0',C.ink,17);}
  else{b+=normal(X(left),Y(v),true,C.blue,'F_KN',-18,-20,'end')+normal(X(right),Y(v),true,C.blue,'F_LM',18,-20);b+=txt(X(mid),Y(top)-20,'F_NM = 0',C.ink,17,'middle')+txt(X(mid),Y(bottom)-20,'F_KL = 0',C.ink,17,'middle');}
  b+=normal(X(mid),Y(v),true,C.red,'F_KM',25,22);
  b+=arrow(X(left),Y(bottom-10),0,-32,C.green)+arrow(X(left+15),Y(bottom),40,0,C.green)+arrow(X(left+15),Y(bottom-15*(bottom-top)/(right-left)),32,-32*(bottom-top)/(right-left),C.green);
  b+=txt(340,y+480,'Три ветви от K к M; все ненулевые силы к нам',C.ink,19,'middle');
  b+=txt(340,y+522,copper?'Поле вверх: поперечная длина равна l₁':'Поле влево: поперечная длина равна l₂',C.ink,19,'middle');
 }else if(kind==='split-square'){
  const small=id==='A08C82',w=small?159:215,hh=small?59:81,left=small?51:67,right=small?108:147,top=1,bottom=small?57:79;
  const p=original(item.images[0],65,y+155,550,260),X=a=>p.X(a/w),Y=a=>p.Y(a/hh);b+=p.body;
  const mid=(left+right)/2,v=(top+bottom)/2;
  b+=force(X(mid),Y(top),0,-55,C.blue,'F_верх',[14,-5,'start'])+force(X(mid),Y(bottom),0,-55,C.blue,'F_низ',[14,95,'start']);
  for(const[xx,yy,dx]of [[left,(top+v)/2,-60],[left,(v+bottom)/2,60],[right,(top+v)/2,60],[right,(v+bottom)/2,-60]])b+=force(X(xx),Y(yy),dx,0,C.red);
  b+=arrow(X(left+6),Y(top),40,0,C.green)+arrow(X(left+6),Y(bottom),40,0,C.green);
  b+=txt(340,y+495,'Каждая ветвь: I ÷ 2; боковая полусила: BIl ÷ 4',C.ink,18,'middle')+txt(340,y+535,'Обе горизонтальные стороны: сила вверх, BIl ÷ 2',C.ink,18,'middle');
 }else if(kind==='tipping-square'){
  const p=original(item.images[0],135,y+60,400,310),X=a=>p.X(a/174),Y=a=>p.Y(a/134);b+=p.body;
  b+=normal(X(39),Y(67),true,C.blue,'F_AE',-20,0,'end')+normal(X(135),Y(67),false,C.blue,'F_CD',20,0)+normal(X(87),Y(67),false,C.red,'mg',15,30);
  b+=txt(340,y+398,'Вид сбоку на границе опрокидывания',C.ink,21,'middle');
  b+=line(140,y+530,540,y+530,C.gray,3)+line(180,y+520,500,y+520,C.ink,5);
  b+=force(180,y+520,0,-85,C.blue,'F_AE',[-15,0,'end'])+force(340,y+520,0,85,C.red,'mg',[15,5,'start']);
  b+=force(500,y+520,0,85,C.blue,'F_CD',[15,5,'start'])+force(500,y+520,0,-90,C.green,'N_CD',[15,-5,'start']);
  b+=txt(180,y+552,'AE',C.ink,19,'middle')+txt(500,y+552,'CD',C.ink,19,'middle')+txt(340,y+658,'Ось CD: плечо F_AE равно a; плечо mg равно a ÷ 2',C.ink,18,'middle');h=700;
 }else throw Error('Unknown frame '+kind);
 return{body:b,h};
}
module.exports={frameDiagram};
