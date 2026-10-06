const {C,txt,line,rect,dot,arrow,original,cards,svg}=require('../lib/physics-svg');
const {records}=require('./physics-elasticity');const diagrams={};
const fmt=x=>Number(x.toFixed(10)).toLocaleString('ru-RU',{maximumFractionDigits:10,useGrouping:false});
function spring(x,y,dx,dy){let s=`M${x} ${y}`;const d=Math.hypot(dx,dy),ux=dx/d,uy=dy/d;for(let i=1;i<=14;i++){const t=i/15,a=i%2?8:-8;s+=`L${x+dx*t-uy*a} ${y+dy*t+ux*a}`;}return `<path d="${s}L${x+dx} ${y+dy}" fill="none" stroke="${C.ink}" stroke-width="2"/>`;}
function endModel(y,vertical=false){
 if(vertical)return line(125,y,255,y)+spring(190,y,0,145)+dot(190,y+145)+arrow(190,y+145,0,-65,C.blue,'F_упр',[18,0])+arrow(190,y+145,0,65,C.red,'F',[18,0])+arrow(390,y+40,0,145,C.gray,'q',[12,0])+txt(310,y+25,'Ось вдоль растяжения',C.ink,18);
 return line(55,y-25,55,y+25)+spring(55,y,215,0)+dot(270,y)+arrow(270,y,-72,0,C.blue,'F_упр',[-10,-20,'end'])+arrow(270,y,110,0,C.red,'F',[10,5])+arrow(445,y,100,0,C.gray,'q',[12,5])+txt(65,y+65,'Свободный конец: F − F_упр = 0',C.ink,19);
}
function hanging(y,lift=false){
 let b=line(200,y,330,y)+spring(265,y,0,130)+rect(235,y+130,60,55)+txt(265,y+165,'m',C.ink,20,'middle');
 b+=arrow(265,y+130,0,-75,C.blue,'F_упр',[15,0])+arrow(265,y+185,0,80,C.red,'mg',[15,0])+arrow(470,y+45,0,135,C.gray,'y',[12,0]);
 if(lift)b+=arrow(400,y+45,0,85,C.purple,'a',[12,0])+txt(375,y+222,'a = 2,5 м·с⁻²',C.purple,19);
 else b+=txt(385,y+224,'a_y = 0',C.ink,19);
 return b;
}
for(const r of Object.values(records)){
 let b='',y=85;
 if(r.kind==='graph'){
  const im=original(r.images[0],45,85,480,270);b+=im.body;const h=r.graph,i=h.x.length-1;
  y=85+im.h+35;b+=txt(45,y,'Точка: x = '+fmt(h.x[i])+(h.unit==='10⁻² м'?'·':' ')+h.unit+'; F_упр = '+fmt(h.F[i])+' Н',C.ink,19);
  y+=80;b+=endModel(y);y+=115;
 }else if(r.kind==='table'){
  const xs=[145,255,365,475];b+=txt(45,94,'F_упр, Н',C.ink,18)+txt(45,145,'x, м',C.ink,18);
  for(let i=0;i<4;i++)b+=txt(xs[i]+32,94,fmt(r.forces[i]),C.ink,20,'middle')+txt(xs[i]+32,145,fmt(r.extensions[i]),C.ink,20,'middle');
  b+=line(40,111,610,111,C.gray);b+=endModel(240);y=345;
 }else if(['series','compressed'].includes(r.kind)){
  const serial=r.kind==='series',im=original(r.images[0],40,185,600,230);b+=im.body;
  const lx=im.X(serial?.289:.391),rx=im.X(serial?.432:.617),cy=im.Y(serial?.54:.57),mid=(lx+rx)/2,top=im.Y(serial?.34:.36),bottom=im.Y(serial?.84:.79);
  b+=arrow(lx,cy,serial?-85:26,0,C.blue,'F_упр1',serial?[0,-85,'middle']:[-43,-50,'end']);
  b+=arrow(rx,cy,serial?85:-26,0,C.red,'F_упр2',serial?[0,-85,'middle']:[43,-50]);
  b+=arrow(mid,top,0,-90,C.green,'N',[15,0])+arrow(mid,bottom,0,78,C.purple,'Mg',[15,0]);
  const ay=185+im.h+115;b+=arrow(465,ay,100,0,C.gray,'x',[12,5])+arrow(465,ay,0,-80,C.gray,'y',[12,0]);
  b+=txt(45,ay+42,serial?'F_упр1 = F_упр2 = F = 9 Н':'F_упр1 = F_упр2 = 24 Н',C.ink,20);y=ay+85;
 }else if(r.kind==='dynamometer'){
  const im=original(r.images[0],40,85,220,430);b+=im.body;
  b+=txt(300,125,'0,5 Н ↔ 5 см',C.ink,21)+txt(300,167,'1 Н ↔ 10 см',C.ink,21)+txt(300,209,'k = 10 Н на метр',C.ink,21)+txt(300,251,'7,5 см ↔ 0,75 Н',C.blue,21);
  b+=txt(40,68,'Исходная шкала; ниже — силы на грузе.',C.gray,17);
  const X=im.X(114/144),Y=85+im.h; b+=line(X,Y-7,X,Y+35)+rect(X-23,Y+35,46,40)+txt(X,Y+61,'m',C.ink,18,'middle');
  b+=arrow(X,Y+35,0,-66,C.blue,'F_упр',[25,-5])+arrow(X,Y+75,0,75,C.red,'mg',[18,0])+arrow(465,345,0,120,C.gray,'y',[12,0]);
  b+=txt(290,327,'Подвешиваемый груз:',C.ink,18)+txt(290,367,'mg − F_упр = 0',C.ink,20);y=Y+192;
 }else if(['mass-half','weight-k','lift'].includes(r.kind)){
  b+=hanging(85,r.kind==='lift');y=405;
  b+=txt(45,y,r.kind==='lift'?'Ускорение направлено вниз.':r.kind==='mass-half'?'m = m₀ ÷ 2; x = x₀ ÷ 2':'m = 2 кг; x = 0,04 м',C.ink,20);y+=50;
 }else{
  b+=endModel(r.vertical?90:185,r.vertical);y=r.vertical?355:315;
  const data=r.kind==='ratio-x'?'F₀ = '+fmt(r.F0)+' Н; x₀ = '+fmt(r.x0)+' см; F = '+fmt(r.F)+' Н':r.kind==='ratio-F'?'F₀ = '+fmt(r.F0)+' Н; x₀ = '+fmt(r.x0)+' см; x = '+fmt(r.x)+' см':r.kind==='stiffness'?'F = 15 Н; x = 0,05 м':'F = 400 Н; k = 2·10⁴ Н на метр';
  b+=txt(45,y,data,C.ink,20);y+=52;
 }
 const panel=cards(r.stages,y);diagrams[r.id]=svg(r.id,r.title,r.diagramCaption,b+panel.body,panel.end+10);
}
module.exports={diagrams};
