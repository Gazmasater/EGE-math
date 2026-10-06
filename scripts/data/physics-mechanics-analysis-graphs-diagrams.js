const {records}=require('./physics-mechanics-analysis-graphs');
const {C,txt,line,rect,dot,arrow,force,original,cards,svg}=require('../lib/physics-svg');
const n=x=>String(Number(x.toFixed(3))).replace('.',',');
const circle=(x,y,r=12)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#fff1d6" stroke="${C.ink}" stroke-width="2"/>`;
const diagrams={};
for(const r of Object.values(records)){
 let b='',y=85;
 if(r.images.length){
  b+=txt(35,y,'Исходный график ФИПИ',C.gray,20);y+=25;
  for(const file of r.images){const im=original(file,40,y,600,340);b+=im.body;y+=im.h+25;}
 }else if(r.kind==='spring'){
  b+=txt(35,y,'Силы на грузе при ξ > 0',C.gray,20);
  b+=line(80,140,80,230)+line(80,230,510,230)+rect(305,170,70,60);
  const pts=[[80,195],[105,195]];for(let i=0;i<13;i++)pts.push([115+i*14,i%2?183:207]);pts.push([300,195]);
  b+=`<polyline points="${pts.map(x=>x.join(',')).join(' ')}" fill="none" stroke="${C.ink}" stroke-width="2"/>`;
  b+=force(340,195,0,75,C.red,'mg',[15,0])+force(340,195,0,-75,C.blue,'N',[15,-2])+force(340,195,-80,0,C.green,'Fупр',[-12,-12,'end']);
  b+=arrow(470,205,100,0,C.gray,'x',[10,4]);y=320;
  b+=txt(35,y,'Гармоническая модель табличных данных',C.gray,20);y+=30;
  const left=90,top=y,wide=480,high=150,center=top+high/2;
  b+=arrow(left,top+high+15,wide+25,0,C.gray,'t',[10,5])+arrow(left,top+high+15,0,-high-35,C.gray,'x',[12,-2]);
  b+=line(left,center,left+wide,center,C.gray,1,'5 5')+txt(72,center+5,n(r.eq),C.gray,16,'end');
  const pts2=[];for(let i=0;i<=120;i++){const ang=i/120*2*Math.PI;const z=r.phase==='sin'?Math.sin(ang):(r.phase==='minus-cos'?-1:1)*Math.cos(ang);pts2.push([left+i/120*wide,center-z*high/2]);}
  b+=`<polyline points="${pts2.map(x=>x.join(',')).join(' ')}" fill="none" stroke="${C.blue}" stroke-width="3"/>`;
  b+=txt(68,top+5,n(r.eq+r.A),C.gray,16,'end')+txt(68,top+high+5,n(r.eq-r.A),C.gray,16,'end');
  b+=txt(left+wide,top+high+40,'T='+n(r.T)+' с',C.ink,18,'middle')+txt(120,top-8,'x, '+r.unit,C.gray,17);
  y=top+high+70;
 }else if(r.kind==='force-table'){
  b+=txt(35,y,'Силы на бруске',C.gray,20);
  b+=line(80,245,590,245)+rect(290,175,90,70);
  const fr=r.F-r.mass*r.a;
  b+=force(335,210,0,-85,C.blue,'N',[15,0])+force(335,210,0,85,C.red,'mg',[15,0]);
  b+=force(335,210,120,0,C.purple,'F',[12,-6])+force(335,210,-120*fr/r.F,0,C.green,'Fтр',[-12,-10,'end']);
  b+=arrow(510,285,80,0,C.gray,'x',[10,5])+arrow(510,285,0,-75,C.gray,'y',[12,-4]);
  b+=txt(80,355,'ΣFₓ = F − Fтр = maₓ',C.ink,23);y=390;
 }else if(r.kind==='incline-friction'){
  b+=txt(35,y,'Скольжение вниз по наклонной плоскости',C.gray,20);
  b+=line(120,315,545,135)+line(120,315,545,315,C.gray,1);
  b+=`<rect x="272" y="193" width="65" height="42" rx="3" fill="#edf4ff" stroke="${C.ink}" stroke-width="2" transform="rotate(-23 304 214)"/>`;
  b+=force(304,214,0,80,C.red,'mg',[15,5])+force(304,214,-28,-66,C.blue,'N',[-15,-4,'end'])+force(304,214,64,-27,C.green,'Fтр',[15,-4]);
  b+=arrow(235,280,-70,30,C.gray,'x',[-10,15,'end'])+arrow(465,270,-28,-66,C.gray,'y',[-10,-8,'end']);
  b+=txt(215,355,'N = mg cosα; Fтр = μN',C.ink,23);y=390;
 }else if(r.kind==='pendulum-height'){
  b+=txt(35,y,'Крайнее положение маятника',C.gray,20);
  const ox=255,oy=125,l=190,co=1-r.height/r.length,si=Math.sqrt(1-co*co),x=ox+l*si,z=oy+l*co;
  b+=line(ox-35,oy,ox+35,oy)+line(ox,oy,ox,oy+l,C.gray,1,'5 5')+line(ox,oy,x,z)+circle(x,z)+dot(ox,oy);
  b+=force(x,z,-70*co*si,-70*co*co,C.blue,'Tн',[-15,-4,'end'])+force(x,z,0,70,C.red,'mg',[15,3]);
  b+=line(175,oy+l,545,oy+l,C.gray,1,'5 5')+line(510,z,510,oy+l,C.gray,2)+txt(524,(z+oy+l)/2,'hmax',C.gray,18);
  b+=txt(ox+l*si/2+18,oy+l*co/2,'l',C.ink,19)+arrow(555,160,0,-50,C.gray,'y',[12,-4]);
  b+=txt(70,365,'В крайней точке υ = 0; Tн = mg cosθ',C.ink,21);y=400;
 }else if(r.kind==='distance-table'){
  b+=txt(35,y,'Путь по табличным данным',C.gray,20);
  const X=t=>85+t*65,Y=s=>345-s*4.6;
  b+=arrow(85,345,500,0,C.gray,'t, с',[10,5])+arrow(85,345,0,-240,C.gray,'L, м',[14,-4]);
  const ps=[];for(let i=0;i<=140;i++){let t=i/20;ps.push([X(t),Y(t*t)]);}
  b+=`<polyline points="${ps.map(x=>x.join(',')).join(' ')}" fill="none" stroke="${C.blue}" stroke-width="3"/>`;
  for(let t=0;t<=7;t++){b+=dot(X(t),Y(t*t))+txt(X(t),370,String(t),C.gray,17,'middle');}
  for(const v of [10,25,49])b+=line(80,Y(v),580,Y(v),C.gray,1,'4 5')+txt(72,Y(v)+5,String(v),C.gray,17,'end');
  b+=txt(225,145,'L = t²; a = 2 м·с⁻²',C.ink,22);y=405;
 }else if(r.kind==='vertical-table'){
  b+=txt(35,y,'Подъём и спуск: меняется знак скорости',C.gray,20);
  b+=line(90,325,570,325)+arrow(120,325,0,-210,C.gray,'y',[12,-5]);
  b+=circle(235,210)+force(235,210,0,75,C.red,'mg',[15,5])+arrow(275,235,0,-85,C.blue,'υᵧ > 0',[12,-5]);
  b+=circle(450,210)+force(450,210,0,75,C.red,'mg',[15,5])+arrow(495,170,0,80,C.blue,'υᵧ < 0',[15,0]);
  b+=txt(155,360,'Наверху υᵧ = 0; ускорение направлено вниз',C.ink,20);y=395;
 }else throw Error('Missing scene '+r.id+' '+r.kind);
 const box=cards([['Основная связь',r.summary],['Ответ',r.answer+'; номера верных утверждений']],y);b+=box.body;
 diagrams[r.id]=svg(r.id,r.title,r.diagramCaption,b,box.end+18);
}
module.exports={diagrams};
