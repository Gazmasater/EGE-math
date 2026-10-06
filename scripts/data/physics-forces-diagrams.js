const {C,txt,line,rect,dot,arrow,original,cards,svg}=require('../lib/physics-svg');
const {records}=require('./physics-forces');const diagrams={};
const fmt=x=>Number(x.toFixed(10)).toLocaleString('ru-RU',{useGrouping:false,maximumFractionDigits:10});
const geometry={'1E061B':{o:[130/168,99/200],cell:[32/168,32/200]},'9B55C6':{o:[28/142,146/204],cell:[28/142,28/204]},'12E192':{o:[57/171,87/176],cell:[28/171,28/176]},'5E2935':{o:[29/141,86/171],cell:[28/141,28/171]}};
for(const r of Object.values(records)){
 let b='',y;
 if(r.kind==='vectors'){
  const im=original(r.images[0],55,85,440,365),h=geometry[r.id];b+=im.body;
  const rx=r.vectors.reduce((s,v)=>s+v[0],0),ry=r.vectors.reduce((s,v)=>s+v[1],0);
  b+=arrow(im.X(h.o[0]),im.Y(h.o[1]),rx*h.cell[0]*im.w,-ry*h.cell[1]*im.h,C.red,'R',rx<0?[-10,-12,'end']:[10,25]);
  b+=arrow(530,235,80,0,C.gray,'x',[12,5])+arrow(530,235,0,-85,C.gray,'y',[12,0]);
  b+=txt(500,290,'1 клетка',C.ink,18)+txt(500,320,'равна 1 Н',C.ink,18);
  y=85+im.h+50;b+=txt(45,y,'R_x = '+fmt(rx)+' Н; R_y = '+fmt(ry)+' Н',C.ink,21);y+=52;
 }else if(r.kind==='graph'){
  const im=original(r.images[0],50,80,470,300);b+=im.body;y=80+im.h+40;
  b+=txt(45,y,'Точка: F = 6 Н; a = 0,25 м·с⁻²',C.ink,20);y+=110;
  b+=line(65,y+50,420,y+50)+rect(185,y,80,50)+txt(225,y+33,'m',C.ink,20,'middle');
  b+=arrow(225,y,0,-65,C.green,'N',[15,0])+arrow(225,y+50,0,75,C.purple,'mg',[15,0])+arrow(265,y+25,110,0,C.blue,'F',[12,5]);
  b+=arrow(490,y+75,105,0,C.gray,'x',[12,5])+arrow(490,y+75,0,-85,C.gray,'y',[12,0]);y+=175;
 }else if(r.kind==='rope'){
  const im=original(r.images[0],40,185,600,160);b+=im.body;
  b+=arrow(im.X(27/239),im.Y(24/52),0,-90,C.green,'N₂',[-12,0,'end']);
  b+=arrow(im.X(154/239),im.Y(24/52),0,-90,C.green,'N₁',[15,0]);
  b+=arrow(im.X(42/239),im.Y(45/52),0,95,C.purple,'M₂g',[-12,0,'end'])+arrow(im.X(127/239),im.Y(45/52),0,95,C.purple,'M₁g',[15,0]);
  b+=arrow(im.X(60/239),im.Y(35/52),34,0,C.blue,'T',[-4,30])+arrow(im.X(98/239),im.Y(35/52),-34,0,C.red,'T',[0,-20]);
  y=185+im.h+125;b+=arrow(510,y,90,0,C.gray,'x',[12,5])+arrow(510,y,0,-70,C.gray,'y',[12,0]);
  b+=txt(45,y+42,'Перед обрывом: T = 4 Н; F = 12 Н',C.ink,20);y+=85;
 }else if(r.kind==='atwood'){
  const im=original(r.images[0],165,85,380,380);b+=im.body;
  b+=arrow(im.X(43/144),im.Y(109/156),0,-85,C.blue,'T',[-15,0,'end'])+arrow(im.X(43/144),im.Y(132/156),0,90,C.purple,'Mg',[-15,0,'end']);
  b+=arrow(im.X(98/144),im.Y(114/156),0,-85,C.blue,'T',[15,0])+arrow(im.X(98/144),im.Y(128/156),0,90,C.purple,'mg',[15,0]);
  b+=arrow(90,320,0,125,C.gray,'y',[12,0])+arrow(590,445,0,-125,C.gray,'z',[12,0]);
  y=85+im.h+70;b+=txt(45,y,'M = 1 кг — левый груз; a = 4 м·с⁻²',C.ink,20);y+=50;
 }else{
  b+=txt(40,84,'Силы и ускорения направлены вдоль оси x.',C.ink,20);
  for(let i=0;i<2;i++){
   const cy=155+i*180,idx=i?'':'₀';
   b+=rect(90,cy-25,65,50)+txt(122,cy+8,'m'+idx,C.ink,20,'middle');
   b+=arrow(155,cy,125,0,C.blue,'F'+idx,[12,5])+arrow(110,cy-48,80,0,C.green,'a'+idx,[12,5]);
   b+=txt(340,cy-18,r.rows[i][0],C.ink,19);
   const split=r.rows[i][1].split('; ');for(let j=0;j<split.length;j++)b+=txt(340,cy+18+j*29,split[j],C.ink,20);
  }
  b+=arrow(90,440,180,0,C.gray,'x',[12,5])+txt(340,443,'Схема направлений',C.gray,18);y=495;
 }
 const panel=cards(r.stages,y);diagrams[r.id]=svg(r.id,r.title,r.diagramCaption,b+panel.body,panel.end+10);
}
module.exports={diagrams};
