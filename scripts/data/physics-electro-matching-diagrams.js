const {records}=require('./physics-electro-matching');
const {C,txt,line,rect,dot,arrow,force,dimensions,original,cards,svg}=require('../lib/physics-svg');
const fs=require('node:fs'),path=require('node:path');
const curve=(d,c=C.blue,dash='')=>`<path d="${d}" fill="none" stroke="${c}" stroke-width="2.5" ${dash?`stroke-dasharray="${dash}"`:''}/>`;
const ring=(x,y,r,c=C.ink)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${c}" stroke-width="2"/>`;
const diagrams={};
for(const r of Object.values(records)){
 let b='',y=80;
 if(r.kind==='lens'){
  const a=r.near?40:120,F=80,lx=300,h=32;
  for(const [j,converging]of [true,false].entries()){
   const yy=200+j*290,f=converging?F:-F,dist=a*f/(a-f),mag=-dist/a,ix=lx+dist,oy=yy-h,iy=yy-mag*h;
   b+=txt(35,yy-108,converging?'Собирающая линза':'Рассеивающая линза',C.ink,21)+line(55,yy,625,yy,C.gray);
   b+=line(lx,yy-85,lx,yy+96,C.ink,2)+curve(converging?`M291 ${yy-75}l9-10 9 10M291 ${yy+86}l9 10 9-10`:`M291 ${yy-85}l9 10 9-10M291 ${yy+96}l9-10 9 10`,C.ink);
   for(const k of [-2,-1,1,2])b+=dot(lx+k*F,yy,C.gray)+txt(lx+k*F,yy+24,Math.abs(k)===1?'F':'2F',C.gray,16,'middle');
   b+=arrow(lx-a,yy,0,-h,C.blue,'предмет',r.near&&converging?[-8,-48,'middle']:[-12,-10,'end'])+arrow(ix,yy,0,-mag*h,C.green,'',[0,0]);
   b+=txt(dist<0?lx-20:ix,yy+(dist<0?76:108),'изображение',C.green,19,dist<0?'end':'middle');
   const end=converging&&!r.near?580:400,parallelY=x=>oy+h*(x-lx)/f,centerY=x=>yy+h*(x-lx)/a;
   b+=line(lx-a,oy,lx,oy,C.red)+line(lx,oy,end,parallelY(end),C.red)+line(lx-a,oy,end,centerY(end),C.purple);
   if(dist<0)b+=line(ix,iy,lx,oy,C.red,2,'6 4')+line(ix,iy,lx,yy,C.purple,2,'6 4');
   b+=txt(340,yy+134,converging?(r.near?'Мнимое, прямое, увеличенное':'Действительное, перевёрнутое, увеличенное'):'Мнимое, прямое, уменьшенное',C.green,19,'middle');
  }y=665;
 }else if(r.kind==='cyclotron'){
  b+=txt(35,84,'Положительный заряд; B — в плоскость рисунка',C.gray,19);
  for(const x of[90,195,300,405,510,615])for(const z of[125,225,325])b+=line(x-5,z-5,x+5,z+5,C.gray)+line(x-5,z+5,x+5,z-5,C.gray);
  b+=ring(320,247,105)+dot(320,247)+dot(425,247,C.red)+line(320,247,419,247,C.gray,2,'6 4')+txt(360,274,'R',C.gray,20);
  b+=force(425,247,-83,0,C.red,'FЛ',[-10,-13,'end'])+arrow(425,247,0,-82,C.blue,'υ',[14,-3])+arrow(547,269,-58,0,C.gray,'n',[-4,24,'end'])+txt(437,272,'q > 0',C.red,18);
  b+=txt(340,395,'FЛ = qυB; maₙ = FЛ; aτ = 0',C.green,22,'middle');y=428;
 }else if(r.kind==='light'){
  const reversed=r.id==='AE8774',left=reversed?'Вода':'Воздух',right=reversed?'Воздух':r.id==='626E20'?'Стекло':'Вода';
  b+=rect(reversed?45:340,120,295,230,'#e3f3ff')+txt(170,105,left,C.ink,23,'middle')+txt(489,105,right,C.ink,23,'middle')+line(340,120,340,350,C.gray);
  b+=arrow(60,230,558,0,C.gray,'',[0,0]);
  for(let x=76;x<323;x+=reversed?32:48)b+=line(x,187,x,272,C.blue,3);
  for(let x=360;x<625;x+=reversed?48:32)b+=line(x,187,x,272,C.blue,3);
  b+=txt(175,315,reversed?'υ':'c',C.blue,22,'middle')+txt(490,315,reversed?'c':'v = c · n⁻¹',C.blue,22,'middle')+txt(340,390,'Частота ν одинакова по обе стороны границы',C.green,21,'middle');y=425;
 }else if(r.kind==='ohm'){
  b+=line(100,206,247,206)+rect(247,174,183,64)+line(430,206,581,206)+txt(338,215,'R',C.ink,24,'middle')+arrow(129,150,83,0,C.blue,'I',[10,4]);
  b+=line(221,280,456,280,C.gray)+line(221,273,221,287,C.gray)+line(456,273,456,287,C.gray)+txt(339,310,'U',C.gray,23,'middle');
  b+=txt(340,365,'U = IR',C.green,26,'middle')+txt(340,409,`${r.powerSymbol} = UI = I²R`,C.green,25,'middle')+txt(340,447,`${r.powerSymbol} — мощность; A = ${r.powerSymbol}t — работа`,C.gray,20,'middle');y=477;
 }else if(r.kind==='lc-formula'){
  b+=txt(35,82,'Фазы и обмен энергией',C.gray,21);
  const funcs=r.id==='1FA129'?[[t=>Math.sin(2*Math.PI*t),'u',C.blue],[t=>Math.sin(2*Math.PI*t)**2,'WС',C.green]]:[[t=>Math.cos(2*Math.PI*t),'i',C.blue],[t=>Math.cos(2*Math.PI*t)**2,'WL',C.green]];
  funcs.forEach(([fn,name,col],j)=>{
   const ox=80+j*315,oy=225; b+=arrow(ox,oy,240,0,C.gray,'t',[6,4])+arrow(ox,oy+75,0,-165,C.gray,name,[-9,-4,'end']);
   const d=Array.from({length:121},(_,k)=>`${k?'L':'M'}${ox+k*220/120} ${oy-65*fn(k/120)}`).join('');b+=curve(d,col)+txt(ox+220,oy+97,'T',C.gray,17,'middle');
  });
  b+=txt(340,365,r.id==='1FA129'?'u пропорционально q; WС пропорционально q²':'i опережает u; WL пропорционально i²',C.green,21,'middle');y=405;
 }
 if(r.images.length){
  if(r.kind==='trajectory'){
   for(let j=0;j<2;j++){
    b+=txt(35,y+5,j?'Б · Магнитное поле':'А · Электрическое поле',C.gray,21);y+=30;
    const im=original(r.images[j],155,y,335,255);b+=im.body;
    if(r.id==='AE92AD'){
     const x=im.X(j?.303:.166),z=im.Y(j?.28:.50);b+=force(x,z,0,65,C.red,j?'FЛ':'Fэ',j?[-13,10,'end']:[15,10]);
     b+=txt(520,y+84,j?'q < 0':'q > 0',C.red,19,'middle')+arrow(520,y+151,0,-51,C.gray,'y',[13,-2]);
    }else if(!j){
     const x=im.X(.59),z=im.Y(.49);b+=line(x+12,z,505,z,C.red,2)+txt(520,z+6,'Fэ ⊙',C.red,20);
    }else b+=txt(520,y+125,'FЛ = 0',C.red,21,'middle');
    y+=im.h+28;b+=txt(340,y,r.id==='DDF127'?(j?'υ₀ противоположна B; a = 0':'Fэ — к наблюдателю, перпендикулярно рисунку'):(j?'Начальная FЛ направлена вниз':'Fэ вниз; сначала торможение'),C.green,18,'middle');y+=40;
   }
   for(const file of r.images.slice(2)){const im=original(file,60,y,190,30);b+=txt(60,y-8,'Обозначение из условия',C.gray,16)+im.body;y+=im.h+35;}
  }else if(r.kind==='induction-ring'){
   b+=txt(35,y+5,'Исходная схема; магнит обращён полюсом N',C.gray,19);y+=30;
   const im=original(r.images[0],165,y,350,335);b+=im.body;y+=im.h+45;
   b+=txt(45,y,'А: приближение',C.ink,20)+arrow(235,y-6,115,0,C.blue,'',[0,0])+txt(290,y-19,'Bмагн',C.blue,18,'middle')+arrow(505,y-6,-95,0,C.red,'',[0,0])+txt(458,y-19,'Bинд',C.red,18,'middle');y+=44;
   b+=txt(45,y,'Отталкивание; ток по ближней стороне: 3 → 2 → 1',C.green,20);y+=45;
   b+=txt(45,y,'Б: удаление',C.ink,20)+arrow(235,y-6,115,0,C.blue,'',[0,0])+txt(290,y-19,'Bмагн',C.blue,18,'middle')+arrow(425,y-6,95,0,C.red,'',[0,0])+txt(472,y-19,'Bинд',C.red,18,'middle');y+=44;
   b+=txt(45,y,'Притяжение; ток по ближней стороне: 1 → 2 → 3',C.green,20);y+=30;
  }else if(r.kind==='lc-graph'){
   const circuit=r.mode==='charged',first=r.images.length===3;
   if(first){b+=txt(35,y+5,circuit?'Исходная полярность и переключатель':'Заданный график тока',C.gray,20);y+=30;const im=original(r.images[0],195,y,290,230);b+=im.body;y+=im.h+40;}
   const remaining=r.images.slice(first?1:0);
   for(let j=0;j<remaining.length;j++){const im=original(remaining[j],40+j*330,y+34,270,210);b+=txt(40+j*330,y+13,j?'График Б':'График А',C.gray,19)+im.body;}
   y+=285;
  }else{
   b+=txt(35,y+5,'Исходная схема ФИПИ',C.gray,20);y+=35;
   for(const file of r.images){const im=original(file,150,y,385,275);b+=im.body;y+=im.h+45;}
  }
 }
 const cs=cards(r.stages,y+10);b+=cs.body;diagrams[r.id]=svg(r.id,r.title,r.diagramCaption,b,cs.end+16);
}
module.exports={diagrams};
