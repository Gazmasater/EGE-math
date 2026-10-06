const {C,txt,line,rect,arrow,original,cards,svg}=require('../lib/physics-svg');
const {records}=require('./physics-friction');const diagrams={};
const fmt=x=>Number(x.toFixed(10)).toLocaleString('ru-RU',{useGrouping:false,maximumFractionDigits:10});
function sliding(y,uniform=false){
 let b=line(65,y+60,475,y+60)+rect(225,y,85,60)+txt(267,y+37,'m',C.ink,20,'middle');
 b+=arrow(267,y,0,-80,C.green,'N',[15,0])+arrow(267,y+60,0,90,C.purple,'mg',[15,0]);
 b+=arrow(225,y+43,-105,0,C.red,'F_тр',[-10,-16,'end']);
 if(uniform)b+=arrow(310,y+30,100,0,C.blue,'F',[12,4]);
 b+=arrow(130,y-65,80,0,C.gray,'v',[10,0])+arrow(530,y+110,75,0,C.gray,'x',[12,4])+arrow(530,y+110,0,-85,C.gray,'y',[12,0]);
 return b;
}
for(const r of Object.values(records)){
 let b='',y;
 if(['graph','table','pressure'].includes(r.kind)){
  if(r.kind==='graph'){
   const im=original(r.images[0],70,80,540,340);b+=im.body;y=80+im.h+45;
   const i=r.N.length-1;b+=txt(45,y,'N = '+fmt(r.N[i])+' Н; F_тр = '+fmt(r.F[i])+' Н',C.ink,21);y+=48;
  }else if(r.kind==='table'){
   b+=txt(45,110,'F_тр, Н',C.ink,19)+txt(45,170,'N, Н',C.ink,19)+line(40,130,625,130,C.gray);
   for(let i=0;i<r.N.length;i++)b+=txt(195+115*i,110,fmt(r.F[i]),C.ink,21,'middle')+txt(195+115*i,170,fmt(r.N[i]),C.ink,21,'middle');
   y=220;
  }else{b+=txt(45,110,'Нормальное давление: 40 Н',C.ink,22)+txt(45,155,'Трение скольжения: 10 Н',C.ink,22);y=210;}
  b+=txt(45,y,'Модули сил: F_тр = μN',C.blue,22)+txt(45,y+40,'Коэффициент μ безразмерен.',C.ink,20);y+=85;
 }else if(r.kind==='spring'){
  const im=original(r.images[0],40,185,600,230);b+=im.body;
  const left=im.X(190/620),right=im.X(288/620),mid=(left+right)/2,cy=im.Y(96/164);
  b+=arrow(left,cy,-95,0,C.blue,'F_упр1',[0,-84,'middle'])+arrow(right,cy,95,0,C.red,'F_упр2',[0,-84,'middle']);
  b+=arrow(mid,im.Y(60/164),0,-90,C.green,'N',[15,0])+arrow(mid,im.Y(140/164),0,82,C.purple,'Mg',[15,0]);
  y=185+im.h+115;b+=arrow(480,y,100,0,C.gray,'x',[12,5])+arrow(480,y,0,-75,C.gray,'y',[12,0]);
  b+=txt(45,y+44,'k₂ = 800 Н на метр; x₂ = 0,02 м',C.ink,20);y+=85;
 }else if(r.kind.startsWith('pulley-')){
  const up=r.kind==='pulley-up',im=original(r.images[0],55,175,510,360);b+=im.body;
  if(up){
   b+=txt(im.X(.384),im.Y(.29),'M',C.ink,24,'middle')+txt(im.X(.735)-12,im.Y(.77),'m',C.ink,20,'end');
   b+=arrow(im.X(.384),im.Y(.12),0,-80,C.green,'N',[15,0]);
   b+=arrow(im.X(.384),im.Y(.415),0,85,C.purple,'Mg',[-10,0,'end']);
   b+=arrow(im.X(.49),im.Y(.27),85,0,C.blue,'T',[8,-15]);
   b+=arrow(im.X(.49),im.Y(.395),80,0,C.red,'F_тр',[-20,-14,'end']);
   b+=arrow(im.X(.776),im.Y(.61),0,-65,C.blue,'T',[15,20])+arrow(im.X(.776),im.Y(.865),0,85,C.purple,'mg',[-15,0,'end']);
  }else{
   b+=arrow(im.X(.458),im.Y(.175),0,-75,C.green,'N',[15,0]);
   b+=arrow(im.X(.425),im.Y(.35),0,85,C.purple,'Mg',[-12,0,'end']);
   b+=arrow(im.X(.46),im.Y(.255),95,0,C.blue,'T',[10,-14]);
   b+=arrow(im.X(.38),im.Y(.333),-85,0,C.red,'F_тр',[-10,25,'end']);
   b+=arrow(im.X(.822),im.Y(.61),0,-65,C.blue,'T',[15,0])+arrow(im.X(.822),im.Y(.705),0,100,C.purple,'mg',[15,0]);
  }
  const ax=585,ay=up?440:375;
  b+=arrow(ax,ay,0,up?-100:100,C.gray,'z',[12,0]);
  y=175+im.h+105;
  b+=arrow(195,y,up?-90:90,0,C.gray,'x',up?[-12,5,'end']:[12,5])+arrow(195,y,0,-70,C.gray,'y',[12,0]);
  b+=txt(365,y-20,up?'m: ускорение вверх':'m: ускорение вниз',C.ink,19)+txt(365,y+13,up?'M: ускорение влево':'M: ускорение вправо',C.ink,19);y+=55;
 }else if(r.kind==='inclined-force'){
  const im=original(r.images[0],155,145,460,330);b+=im.body;
  b+=arrow(im.X(148/477),im.Y(229/360),0,-90,C.green,'N',[-15,0,'end']);
  b+=arrow(im.X(148/477),im.Y(294/360),0,100,C.purple,'mg',[15,0]);
  b+=arrow(im.X(44/477),im.Y(291/360),-105,0,C.red,'F_тр',[-8,-18,'end']);
  y=145+im.h+110;b+=arrow(495,y,95,0,C.gray,'x',[12,5])+arrow(495,y,0,-70,C.gray,'y',[12,0]);
  b+=txt(45,y+40,'N = 14 Н; F sin 30° = 6 Н',C.ink,21);y+=80;
 }else{
  b+=sliding(190,r.kind.startsWith('uniform-'));y=395;
  b+=txt(45,y,r.kind==='mass-ratio'?'m = 1,5m₀; μ не меняется':r.kind==='area-ratio'?'m = 3m₀; S = 2S₀; μ не меняется':r.kind==='uniform-mass'?'F = 35 Н; μ = 0,25':r.kind==='uniform-mu'?'m = 10 кг; F = 25 Н':'m = '+fmt(r.m)+' кг; F_тр = '+fmt(r.F)+' Н',C.ink,21);y+=55;
 }
 const panels=cards(r.stages,y);diagrams[r.id]=svg(r.id,r.title,r.diagramCaption,b+panels.body,panels.end+10);
}
module.exports={diagrams};
