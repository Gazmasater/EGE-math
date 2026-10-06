const {records}=require('./physics-induction');
const {C,txt,line,dot,arrow,original,cards,svg}=require('../lib/physics-svg');
const n=x=>Number(x.toFixed(9)).toLocaleString('ru-RU',{useGrouping:false,maximumFractionDigits:9});
const diagrams={};
function axes(x,y,w,h,hlabel,vlabel){return arrow(x,y,w,0,C.ink,hlabel,[0,28,'end'])+arrow(x,y,0,-h,C.ink,vlabel,[-12,0,'end'])+txt(x-12,y+25,'0',C.ink,18,'end');}
for(const r of Object.values(records)){let b='',cy=570;
 if(r.images.length){
  b+=txt(55,85,'Исходный рисунок ФИПИ',C.gray,18);
  if(r.kind.startsWith('rod-')){
   const a=original(r.images[0],90,125,480,330);b+=a.body;const out=r.id==='A704AD',xx=out?194/282:114/(r.id==='245ECC'?211:210),fy=out?.66:.71;
   b+=arrow(a.X(xx),a.Y(fy),-100,0,C.red,'F_А',[-5,27,'end'])+arrow(a.X(xx),a.Y(fy),100,0,C.green,'F_тяги',[0,27,'start']);
   b+=out?arrow(a.X(xx),a.Y(.19),0,72,C.blue,'I',[18,0,'start']):arrow(a.X(xx),a.Y(.44),0,-67,C.blue,'i_инд',[15,0,'start']);
   b+=txt(65,490,out?'Ток по MN вниз; через R — от a к b':'Ток по правой перемычке вверх',C.blue,21)+txt(65,529,'Сила Ампера направлена против движения',C.red,20);cy=570;
  }else{
   const a=original(r.images[0],95,120,470,330);b+=a.body;
   if(r.kind==='faraday-max')b+=txt(60,498,'Участок 2: наибольший модуль наклона',C.blue,21)+txt(60,536,'Сравниваем изменение потока за время',C.ink,20);
   else if(r.kind==='faraday-graph')b+=txt(60,498,'Φ₁ = 4 Вб; Φ₂ = −8 Вб; Δt = 2 с',C.blue,21)+txt(60,536,'|ΔΦ| = 12 Вб; |ℰ| = 6 В',C.ink,22);
   else b+=txt(55,495,'I₁ = '+n(r.I1)+' А; I₂ = '+n(r.I2)+' А',C.blue,21)+txt(55,533,'Δt = '+n(r.dt)+' с; L = '+n(r.L)+' Гн',C.ink,21);
  }
 }else if(r.kind.startsWith('energy')){
  const L=r.L??2*r.W/r.I**2,I=r.I??Math.sqrt(2*r.W/r.L),W=r.W??r.L*r.I**2/2;
  b+=txt(60,90,'Энергия возрастает пропорционально I²',C.ink,21)+axes(135,430,440,290,'I, А','W, Дж');
  const points=Array.from({length:61},(_,j)=>`${135+360*j/60},${430-235*(j/60)**2}`).join(' ');
  b+=`<polyline points="${points}" fill="none" stroke="${C.blue}" stroke-width="3"/>`+line(495,195,495,430,C.gray,2,'6 5')+line(135,195,495,195,C.gray,2,'6 5')+dot(495,195);
  b+=txt(495,461,n(I),C.blue,19,'middle')+txt(123,201,n(W),C.blue,19,'end')+txt(270,175,'L = '+n(L)+' Гн',C.ink,20)+txt(80,525,'W = LI² ÷ 2; W ≥ 0',C.ink,22);
 }else if(r.kind.startsWith('self-')){
  const delta=r.deltaI??(r.I2!==undefined?Math.abs(r.I2-r.I1):r.emf*r.dt/r.L),L=r.L??r.emf*r.dt/r.deltaI;
  b+=txt(65,95,'Модуль изменения тока при постоянном темпе',C.ink,20)+axes(140,420,435,265,'t','|ΔI|');
  b+=line(140,420,485,190,C.blue,3)+line(485,190,485,420,C.gray,2,'6 5')+line(140,190,485,190,C.gray,2,'6 5')+dot(485,190)+txt(485,456,n(r.dt)+' с',C.blue,20,'middle')+txt(125,196,n(delta)+' А',C.blue,20,'end');
  b+=txt(65,499,'L = '+n(L)+' Гн',C.ink,21)+txt(65,537,'|ℰ_си| = L·|ΔI| ÷ Δt',C.blue,22);
 }else if(r.kind.startsWith('rotating-')){
  b+=txt(65,90,'Амплитуда потока: Φ_макс = BS',C.ink,22)+axes(145,315,425,195,'t','Φ');
  b+=line(145,315,145,470,C.ink,2)+line(145,175,535,175,C.gray,1,'6 5')+line(145,455,535,455,C.gray,1,'6 5');
  const points=Array.from({length:161},(_,j)=>`${145+390*j/160},${315-140*Math.cos(2*Math.PI*j/160)}`).join(' ');
  b+=`<polyline points="${points}" fill="none" stroke="${C.blue}" stroke-width="3"/>`+txt(137,180,'Φ_макс',C.blue,19,'end')+txt(137,460,'−Φ_макс',C.blue,19,'end')+txt(535,344,'T',C.ink,19,'middle')+txt(65,524,'Φ_макс = '+n(r.amp)+' Вб',C.ink,22);
 }else if(r.kind==='flux-ratio'){
  b+=txt(60,95,'Рамки перпендикулярны магнитному полю',C.ink,21);
  b+=`<rect x="105" y="170" width="135" height="110" fill="#edf4ff" stroke="${C.blue}" stroke-width="2"/><rect x="335" y="170" width="234" height="191" fill="#edf4ff" stroke="${C.blue}" stroke-width="2"/>`;
  for(const[x,y]of[[170,225],[375,215],[440,215],[510,215],[375,295],[440,295],[510,295]])b+=`<circle cx="${x}" cy="${y}" r="10" fill="white" stroke="${C.ink}"/>`+dot(x,y,C.ink);
  b+=txt(150,320,'S',C.ink,22)+txt(420,403,'3S',C.ink,22)+txt(125,142,'B',C.blue,23)+txt(405,142,'2B',C.blue,23)+txt(65,490,'Точки: B направлено к наблюдателю',C.gray,19)+txt(65,530,'Φ₂ = (2B)·(3S) = 6Φ₁',C.blue,23);
 }else if(r.kind==='emf-ratio'){
  b+=txt(65,90,'При меньшем времени наклон становится круче',C.ink,19)+axes(140,430,420,285,'t','B');
  b+=line(140,430,500,170,C.blue,3)+line(140,430,260,300,C.red,3)+line(260,300,260,430,C.gray,1,'6 5')+line(140,300,260,300,C.gray,1,'6 5')+txt(512,173,'B_макс',C.blue,18)+txt(170,280,'B_макс ÷ 2',C.red,18)+txt(260,465,'T ÷ 3',C.red,19,'middle')+txt(500,465,'T',C.blue,19,'middle')+txt(65,529,'Новый модуль ЭДС в 1,5 раза больше',C.ink,22);
 }else{
  let phi1=r.phi1??r.emf*r.dt,phi2=r.phi2??0,dt=r.dt??Math.abs(r.phi2-r.phi1)/r.emf;const max=Math.max(Math.abs(phi1),Math.abs(phi2)),Y=v=>430-230*v/max;
  b+=txt(65,90,'Поток меняется равномерно',C.ink,22)+axes(140,430,430,280,'t, с','Φ, Вб');
  b+=line(140,Y(phi1),495,Y(phi2),C.blue,3)+dot(140,Y(phi1))+dot(495,Y(phi2))+line(495,Y(phi2),495,430,C.gray,1,'6 5');
  b+=txt(127,Y(phi1)+6,n(phi1),C.blue,19,'end')+txt(505,Y(phi2)-14,n(phi2)+' Вб',C.blue,19)+txt(495,466,n(dt),C.blue,20,'middle')+txt(65,527,'|ℰ| = |Φ₂ − Φ₁| ÷ Δt',C.ink,23);
 }
 const cs=cards(r.stages,cy);b+=cs.body;diagrams[r.id]=svg(r.id,r.title,r.diagramCaption,b,cs.end+18);
}
module.exports={diagrams};
