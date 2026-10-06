const {records}=require('./physics-mechanics-analysis-statements');
const {C,txt,line,rect,dot,arrow,force,original,cards,svg}=require('../lib/physics-svg');
const circle=(x,y,r=14)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#fff1d6" stroke="${C.ink}" stroke-width="2"/>`;
const diagrams={};
for(const r of Object.values(records)){
 let b='',y=85;
 if(r.kind==='bridge'){
  b+=txt(35,y,'Силы на транспортном средстве в вершине',C.gray,20);
  b+=`<path d="M110 305 Q340 165 570 305" fill="none" stroke="${C.ink}" stroke-width="4"/>`;
  b+=rect(305,203,70,25)+circle(317,230,6)+circle(364,230,6);
  b+=force(340,215,0,100,C.red,'mg',[15,3])+force(340,215,0,-100*(1-r.v*r.v/r.R/10),C.blue,'N',[15,-4]);
  b+=arrow(382,209,85,0,C.green,'υ',[12,5])+arrow(550,175,0,95,C.gray,'y',[12,4]);
  b+=txt(45,365,'Вниз: mg − N = ma; вверх: N < mg',C.ink,22);y=402;
 }else if(r.kind==='orbit'){
  b+=txt(35,y,'Земля находится в фокусе эллипса',C.gray,20);
  b+=`<ellipse cx="330" cy="230" rx="235" ry="140" fill="none" stroke="${C.gray}" stroke-width="2"/>`;
  b+=`<circle cx="142" cy="230" r="21" fill="#dceaff" stroke="${C.blue}" stroke-width="2"/>`+txt(142,273,'Земля',C.ink,19,'middle');
  const near=r.position==='near',x=near?95:565,dir=near?1:-1;
  b+=circle(x,230,10)+force(x,230,dir*(near?125:78),0,C.red,'Fg',[dir*12,-14,near?'start':'end']);
  b+=arrow(x,230,0,near?-90:55,C.green,'υ',[15,0]);
  b+=line(142,295,x,295,C.gray,1,'5 4')+txt((142+x)/2,320,near?'rmin':'rmax',C.ink,20,'middle');
  b+=txt(near?45:468,405,near?'Перигей':'Апогей',C.ink,22);y=435;
 }else if(r.kind.startsWith('floating')){
  b+=txt(35,y,'Силы на '+(r.kind==='floating-single'?'бруске':'стопке брусков'),C.gray,20);y+=25;
  const im=original(r.images[0],130,y,325,315);b+=im.body;
  const x=im.X(.53),z=im.Y(r.id==='664373'?.36:.345);
  b+=force(x,z,0,-76,C.blue,'FA',[18,-1])+force(x,z,0,76,C.red,r.kind==='floating-single'?'mg':'2mg',[18,1]);
  b+=arrow(525,y+110,0,-70,C.gray,'y',[12,-3]);y+=im.h+38;
 }else if(r.kind==='pendulum'){
  b+=txt(35,y,'Исходная нумерация; силы в положении 1',C.gray,20);y+=30;
  const left=r.id==='6CED45',im=original(r.images[0],150,y,350,300);b+=im.body;
  const x=im.X(left?.183:.862),z=im.Y(left?.674:.608),px=im.X(left?.513:.504),pz=im.Y(left?.134:.05),dx=px-x,dy=pz-z,L=Math.hypot(dx,dy);
  b+=force(x,z,dx/L*(left?75:29),dy/L*(left?75:29),C.blue,'Tн',[left?18:-18,-10,left?'start':'end'])+force(x,z,0,left?90:34,C.red,'mg',[left?24:-22,2,left?'start':'end']);
  b+=arrow(555,y+85,0,-55,C.gray,'y',[12,-3]);y+=im.h+35;
 }else if(r.kind==='lift'){
  b+=txt(35,y,'Силы на гире',C.gray,20)+txt(405,y,'Сила гири на руку',C.gray,20);
  b+=circle(230,210,36)+txt(230,217,'m',C.ink,25,'middle');
  b+=force(230,210,0,-90,C.blue,'F=120 Н',[18,-4])+force(230,210,0,75,C.red,'mg=100 Н',[18,3]);
  b+=rect(460,195,105,18)+force(510,200,0,90,C.purple,'P=120 Н',[12,5]);
  b+=arrow(80,260,0,-95,C.gray,'y',[12,-3])+txt(50,350,'a = 2 м·с⁻² вверх; P действует на руку',C.ink,22);y=388;
 }else if(r.kind==='collision'){
  b+=txt(35,y,'До удара: шарик движется к бруску',C.gray,20);
  b+=line(70,220,600,220)+circle(170,205,15)+rect(385,165,75,55);
  b+=force(170,205,0,65,C.red,'m₂g',[15,0])+force(170,205,0,-65,C.blue,'N₂',[15,-2])+arrow(200,205,75,0,C.green,'υ',[10,-10]);
  b+=force(425,193,0,75,C.red,'m₁g',[15,0])+force(425,193,0,-75,C.blue,'N₁',[15,-2]);
  b+=txt(35,330,'После удара: общая скорость u',C.gray,20);
  b+=line(80,480,580,480)+rect(305,420,85,60)+circle(300,460,16);
  b+=force(340,445,0,90,C.red,'(m₁+m₂)g',[15,0])+force(340,445,0,-90,C.blue,'N₁+N₂',[15,-2])+arrow(390,444,110,0,C.green,'u',[12,-5]);
  b+=arrow(510,545,75,0,C.gray,'x',[10,5]);y=580;
 }else if(r.kind==='tanks'){
  b+=txt(35,y,'Исходные размеры; силы на каждом баке',C.gray,20);y+=25;
  const im=original(r.images[0],38,y,605,355);b+=im.body;
  for(const [xx,top,bottom]of [[.40,.51,.762],[.842,.20,.762]]){
   const x=im.X(xx);
   b+=force(x-8,im.Y(top),0,44,C.red,'Mg',[12,-20,'start']);
   b+=force(x+17,im.Y(bottom),0,-44,C.blue,'N',[13,0]);
  }
  y+=im.h+35;b+=txt(45,y,'Для покоящегося бака N = Mg',C.ink,22);y+=45;
 }else if(r.kind==='ballistic'){
  b+=txt(35,y,'Исходная схема до удара',C.gray,20);y+=25;
  const im=original(r.images[0],150,y,320,300);b+=im.body;
  const x=im.X(.53),z=im.Y(.898);
  b+=force(x,z,0,-70,C.blue,'Tн',[-18,-8,'end'])+force(x,z,0,70,C.red,'Mg',[17,2]);
  b+=force(im.X(.1),z,0,45,C.red,'mg',[-14,3,'end'])+arrow(im.X(.17),z,70,0,C.green,'υ₀',[5,-17]);
  y+=im.h+105;b+=txt(35,y,'После удара: шар и пуля движутся вместе',C.gray,20);
  const ox=250,oz=y+28,bx=355,bz=y+180;
  b+=line(ox-30,oz,ox+30,oz)+line(ox,oz,bx,bz)+circle(bx,bz,21);
  b+=force(bx,bz,-40,-58,C.blue,'Tн',[-15,-6,'end'])+force(bx,bz,0,65,C.red,'(M+m)g',[15,3]);
  b+=txt(430,y+105,'T не зависит',C.ink,20)+txt(430,y+133,'от M и m',C.ink,20);y+=280;
 }else if(r.kind==='two-springs'){
  b+=txt(35,y,'Исходный график ФИПИ',C.gray,20);y+=25;
  const im=original(r.images[0],40,y,600,345);b+=im.body;y+=im.h+36;
  b+=txt(35,y,'Силы на любом грузе при xᵢ > 0',C.gray,20);
  b+=line(90,y+140,560,y+140)+rect(300,y+80,75,60)+line(90,y+50,90,y+140);
  const pts=[[90,y+110],[115,y+110]];for(let i=0;i<11;i++)pts.push([125+i*15,y+110+(i%2?-10:10)]);pts.push([300,y+110]);b+=`<polyline points="${pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="${C.ink}" stroke-width="2"/>`;
  b+=force(337,y+110,0,-70,C.blue,'Nᵢ',[15,-3])+force(337,y+110,0,70,C.red,'mg',[15,0])+force(337,y+110,-90,0,C.green,'Fупр,i',[-8,-15,'end'])+arrow(470,y+120,90,0,C.gray,'x',[10,5]);y+=220;
 }else throw Error('Unknown '+r.kind);
 const box=cards([['Основная связь',r.summary],['Ответ',r.answer+'; номера верных утверждений']],y);b+=box.body;diagrams[r.id]=svg(r.id,r.title,r.diagramCaption,b,box.end+18);
}
module.exports={diagrams};
