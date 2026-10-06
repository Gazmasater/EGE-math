const {records}=require('./physics-oscillations-short');
const {C,txt,line,rect,dot,arrow,original,cards,svg}=require('../lib/physics-svg');
const f=x=>Number(x.toFixed(8)).toLocaleString('ru-RU',{useGrouping:false,maximumFractionDigits:8});
const circle=(x,y,r=21)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#edf4ff" stroke="${C.ink}" stroke-width="2"/>`;
const path=(pts,c=C.blue)=>`<path d="${pts.map(([x,y],i)=>(i?'L':'M')+x.toFixed(2)+' '+y.toFixed(2)).join(' ')}" stroke="${c}" stroke-width="3" fill="none"/>`;
const diagrams={};
for(const r of Object.values(records)){let b='',cy=520;
 if(r.kind.startsWith('graph-')){
  const im=original(r.images[0],65,105,535,300);b+=im.body;
  b+=txt(60,455,r.kind==='graph-frequency'?'Ось времени: 10⁻³ с; один цикл: 8 мс':r.id==='4D1A28'?'Один цикл: T₁ = 4 клетки, T₂ = 2 клетки':'Один цикл: T₁ = 2 клетки, T₂ = 4 клетки',C.blue,20);
  b+=txt(60,490,'Частота обратна периоду: ν = 1 ÷ T',C.ink,20);
 }else if(r.kind==='wave-period-image'){
  const im=original(r.images[0],60,160,540,230);b+=im.body;
  b+=txt(65,115,'Мгновенная фотография шнура',C.ink,21)+txt(65,405,'Между соседними гребнями: λ = 6 м',C.blue,21)+txt(65,450,'Скорость волны v = 12 м·с⁻¹',C.ink,21);
 }else if(r.kind==='pendulum-path'){
  const im=original(r.images[0],100,100,330,310);b+=im.body;
  const bx=im.X(.50),by=im.Y(.89);
  b+=arrow(bx-6,by,-0,-85,C.green,'F_н',[-18,-6,'end'])+arrow(bx+8,by,0,75,C.purple,'mg',[12,0,'start']);
  b+=arrow(470,355,100,0,C.gray,'x',[10,5,'start'])+txt(445,310,'t = 0: x = 0',C.ink,19)+txt(65,490,'До ближайшего края: путь A, время T ÷ 4',C.blue,21);
 }else if(r.kind==='pendulum'){
  b+=rect(210,92,100,12,'#d7dde7')+line(260,105,350,335)+line(260,105,260,350,C.gray,1,'5 5')+circle(350,335);
  b+=arrow(350,335,-32,-83,C.green,'F_н',[-12,0,'end'])+arrow(350,335,0,96,C.purple,'mg',[12,0,'start']);
  b+=txt(327,210,'l',C.ink,24)+txt(273,171,'φ',C.ink,24)+arrow(475,340,85,-33,C.gray,'τ',[10,5,'start']);
  b+=txt(62,466,'Малые колебания: T = 2π√(l ÷ g)',C.blue,21)+txt(62,499,'Масса не входит в период',C.ink,20);cy=532;
 }else if(r.kind==='spring'){
  b+=rect(220,92,100,12,'#d7dde7')+line(270,104,270,132);
  let pts=[[270,132]];for(let i=0;i<12;i++)pts.push([270+(i%2?18:-18),145+i*11]);pts.push([270,284],[270,318]);b+=path(pts,C.ink)+circle(270,340,23);
  b+=arrow(260,340,0,-110,C.green,'F_упр',[-16,0,'end'])+arrow(282,340,0,80,C.purple,'mg',[12,0,'start']);
  b+=line(340,298,570,298,C.gray,1,'5 5')+txt(392,282,'равновесие',C.gray,18)+arrow(385,298,0,125,C.gray,'x',[12,0,'start']);
  b+=txt(450,355,'ma_x = −kx',C.ink,20)+txt(62,482,'T = 2π√(m ÷ k); ν = 1 ÷ T',C.blue,21);
 }else if(r.kind==='spring-path'){
  b+=txt(62,100,'Ось x направлена вниз от равновесия',C.ink,20);
  b+=line(290,154,290,444,C.gray,2)+arrow(290,444,0,40,C.gray,'x',[14,0,'start']);
  for(const[y,s]of [[185,'−A = −0,1 м'],[305,'0'],[425,'+A = +0,1 м']])b+=circle(290,y,17)+txt(335,y+6,s,C.ink,20);
  b+=arrow(285,425,0,-90,C.green,'F_упр',[-16,-3,'end'])+arrow(299,425,0,40,C.purple,'mg',[14,0,'start']);
  b+=arrow(175,420,0,-230,C.blue,'s = 2A',[-14,120,'end'])+txt(335,495,'Старт: v = 0',C.ink,19);cy=525;
 }else if(r.kind==='energy-time'){
  if(r.images.length)b+=original(r.images[0],70,75,210,60).body;
  b+=txt(370,111,'T = '+f(r.T)+' с',C.ink,22);
  const x=90,y=373,w=480,h=176;
  b+=arrow(x,y,510,0,C.gray,'t',[12,6,'start'])+arrow(x,y,0,-210,C.gray,r.target==='kinetic-zero'?'K ÷ Kmax':'U ÷ Umax',[-18,-8,'start']);
  b+=line(x,y-h,x+w,y-h,C.gray,1,'5 5')+txt(x-18,y-h+5,'1',C.ink,18,'end')+txt(x-15,y+6,'0',C.ink,18,'end');
  const pts=[];for(let i=0;i<=160;i++){let t=i/160;pts.push([x+w*t,y-h*Math.cos(2*Math.PI*t)**2]);}b+=path(pts);
  for(const [t,s]of [[.25,'T ÷ 4'],[.5,'T ÷ 2'],[1,'T']])b+=line(x+w*t,y,x+w*t,y+8,C.gray)+txt(x+w*t,y+32,s,C.ink,17,'middle');
  const frac=r.fraction,ex=x+w*frac,ey=y-h*Math.cos(2*Math.PI*frac)**2;
  b+=line(ex,ey,ex,y,C.red,1,'5 5')+dot(ex,ey,C.red);
  if(frac===.125)b+=txt(ex+14,ey-12,'Umax ÷ 2',C.red,18);
  b+=txt(65,457,'Первое достижение: t = '+r.answer+' с',C.red,21)+txt(65,493,frac===.125?'Фаза π ÷ 4; x = A ÷ √2':'Фаза π ÷ 2; cos(ωt) = 0',C.ink,20);cy=530;
 }else if(r.kind.startsWith('echo-')||r.kind.startsWith('sound-')){
  if(r.kind==='echo-lightning'){
   for(const[x,s]of [[95,'Наблюдатель O'],[320,'Дерево A'],[550,'Скала B']])b+=dot(x,230)+txt(x,190,s,C.ink,18,x===95?'start':'middle');
   b+=line(95,230,550,230,C.gray)+txt(206,256,'d',C.ink,22)+txt(431,256,'d',C.ink,22)+rect(550,205,14,210,'#d7dde7');
   b+=arrow(315,284,-215,0,C.green,'прямой: d',[105,31,'middle'])+arrow(322,348,225,0,C.blue,'d',[-115,-12,'middle'])+arrow(547,404,-445,0,C.blue,'2d',[215,31,'middle']);
   b+=txt(65,490,'Отражённый путь A → B → O: 3d',C.blue,21);
  }else if(r.shaft){
   b+=line(200,175,200,413)+line(430,175,430,413)+line(200,413,430,413,C.ink,6)+txt(255,135,'Устье шахты',C.ink,21);
   b+=arrow(258,195,0,195,C.blue,'d',[-20,-87,'end'])+arrow(370,390,0,-195,C.green,'d',[20,105,'start']);b+=txt(70,477,'Двойной путь: 2d = '+f(2*r.d)+' м',C.blue,22);
  }else if(r.kind==='echo-time'){
   b+=txt(70,130,'Источник и приёмник',C.ink,20)+txt(446,130,'Преграда',C.ink,20)+rect(552,175,18,215,'#d7dde7');
   b+=arrow(108,210,440,0,C.blue,'d = '+f(r.d)+' м',[-225,-18,'middle'])+arrow(548,336,-440,0,C.green,'d = '+f(r.d)+' м',[225,35,'middle']);b+=txt(65,470,'Путь туда и обратно: '+f(2*r.d)+' м',C.blue,22);
  }else{
   b+=txt(75,155,r.kind==='sound-distance'?'Молния':'Удар копра',C.ink,22)+txt(458,155,'Наблюдатель',C.ink,21)+dot(98,228)+dot(547,228);
   b+=arrow(98,228,445,0,C.blue,'v = '+f(r.v)+' м·с⁻¹',[-225,-23,'middle'])+txt(280,293,'d = '+f(r.d)+' м',C.ink,23,'middle')+txt(65,403,'Время звука: t = '+f(r.t)+' с',C.blue,23)+txt(65,458,'Время света пренебрежимо мало',C.ink,21);
  }
 }else if(r.kind==='wave'||r.kind==='wave-ratio'){
  b+=txt(65,110,'Одинаковая фаза за T проходит путь λ',C.ink,21);
  const x=80,y=300,w=490,h=68; b+=arrow(65,y,550,0,C.gray,'x',[10,5,'start']);
  const pts=[];for(let i=0;i<=160;i++){const t=i/160;pts.push([x+w*t,y-h*Math.cos(t*4*Math.PI)]);}b+=path(pts);
  b+=line(x,y-h-35,x+w/2,y-h-35,C.green,2)+line(x,y-h-43,x,y-h-27,C.green)+line(x+w/2,y-h-43,x+w/2,y-h-27,C.green)+txt(x+w/4,y-h-48,'λ',C.green,23,'middle');
  b+=arrow(455,175,90,0,C.blue,'v',[-40,-12,'middle'])+txt(65,420,r.kind==='wave-ratio'?'λ₁ν₁ = λ₂ν₂ = v':'v = λν; λ = vT',C.blue,23);
  b+=txt(65,471,r.kind==='wave-ratio'?'ν₁ = '+f(r.nu1)+' Гц; ν₂ = '+f(r.nu2)+' Гц':'v = '+f(r.v)+' м·с⁻¹; λ = '+f(r.lam)+' м',C.ink,21);
 }else throw Error('Diagram kind '+r.kind);
 const cs=cards(r.stages,cy);diagrams[r.id]=svg(r.id,r.title,r.diagramCaption,b+cs.body,cs.end+14);
}
module.exports={diagrams};
