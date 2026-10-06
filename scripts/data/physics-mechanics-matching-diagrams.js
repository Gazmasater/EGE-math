const {records}=require('./physics-mechanics-matching');
const {C,txt,line,rect,dot,arrow,force,dimensions,original,cards,svg}=require('../lib/physics-svg');
const fs=require('node:fs'),filePath=require('node:path');
const path=(d,c=C.ink,dash='')=>`<path d="${d}" fill="none" stroke="${c}" stroke-width="2" ${dash?`stroke-dasharray="${dash}"`:''}/>`;
const circle=(x,y,r=12)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#fff1d6" stroke="${C.ink}" stroke-width="2"/>`;
const axes=(x=505,y=265)=>arrow(x,y,76,0,C.gray,'x',[8,5])+arrow(x,y,0,-76,C.gray,'y',[12,-4]);
const sceneKinds=new Set(['incline','incline-up','pendulum','pendulum-kick','vertical','balcony','spring-horizontal','spring-vertical']);
const diagrams={};
for(const r of Object.values(records)){
 let b='',y=90,remaining=[...r.images];
 if(sceneKinds.has(r.kind)&&remaining.length){
  b+=txt(35,80,'Схема ФИПИ с силами',C.gray,20);
  const im=original(remaining.shift(),190,116,380,255);b+=im.body;
  let x,z;
  if(r.kind==='incline'||r.kind==='incline-up'){
   const sloped=r.kind==='incline-up',jpeg=r.id==='F9DC54';x=im.X(jpeg?.207:sloped?.15:.125);z=im.Y(jpeg?.736:sloped?.69:.78);
   b+=force(x,z,0,64,C.red,'mg',[16,0])+force(x,z,sloped?-18:-24,sloped?-55:-73,C.blue,'N',sloped?[-25,2,'end']:[-12,-6,'end']);
   if(sloped)b+=force(x,z,-76,25,C.green,'Fтр',[-8,10,'end']);
  }else if(r.kind==='pendulum'){
   const oval=r.id==='474911';x=im.X(oval?.09:.14);z=im.Y(oval?.62:.69);
   b+=force(x,z,31,-75,C.blue,'Tн',[14,-5])+force(x,z,0,60,C.red,'mg',[-17,5,'end']);
  }else if(r.kind==='balcony'){
   x=im.X(.113);z=im.Y(.464);b+=force(x,z,0,62,C.red,'mg',[17,3]);
  }else if(r.kind==='vertical'){
   x=im.X(['6EC514','1E5167'].includes(r.id)?.48:.52);z=im.Y(.885);b+=force(x,z,0,65,C.red,'mg',[16,6]);
  }else if(r.kind==='pendulum-kick'){
   x=im.X(.493);z=im.Y(.755);b+=force(x,z,0,-88,C.blue,'Tн',[17,-4])+force(x,z,0,65,C.red,'mg',[18,6])+axes(505,260);
  }else if(r.kind==='spring-vertical'){
   x=im.X(.5);z=im.Y(.927);b+=force(x,z,0,-85,C.blue,'Fупр',[-16,-4,'end'])+force(x,z,0,62,C.red,'mg',[16,6])+arrow(490,190,0,100,C.gray,'x',[14,0]);
  }else throw Error('Unhandled primary scene '+r.id);
  y=460;
 }
 if(!r.images.length||(!sceneKinds.has(r.kind)&&!['polynomial','parabola-down','parabola-up'].includes(r.kind))){
  let f='';
  if(r.kind.startsWith('circle-')){
   b+=`<circle cx="290" cy="235" r="112" fill="none" stroke="${C.gray}" stroke-width="2"/>`+dot(290,235)+circle(402,235)+line(290,235,390,235,C.gray,2,'6 5')+txt(343,264,'R',C.gray,20);
   b+=force(402,235,-85,0,C.red,'ΣFₙ',[0,-16])+arrow(402,235,0,-75,C.blue,'υ',[13,-5])+txt(115,385,'За один оборот: 2πR и 2π радиан',C.green,21);f='υ = ωR = 2πRν';
  }else if(r.kind==='truck'){
   b+=line(90,280,580,280)+rect(262,233,75,46,'#fff1d6')+force(300,255,0,-105,C.blue,'N',[14,-4])+force(313,255,0,105,C.red,'mg',[16,3])+force(300,255,-111,0,C.green,'Fтр',[-10,-15,'end'])+arrow(354,216,80,0,C.purple,'υ',[8,-7])+axes();f='N = mg; Fтр = μN; aₓ < 0';
  }else if(r.kind==='incline-length'||r.kind==='rest-accel'){
   b+=path('M115 160L550 345L115 345Z')+`<g transform="translate(307 242) rotate(23.04)">${rect(-29,-38,58,38,'#fff1d6')}</g>`+force(314,224,0,97,C.red,'mg',[12,8])+force(314,224,36,-85,C.blue,'N',[12,-3])+force(314,224,-85,-36,C.green,'Fтр',[-12,-5,'end']);
   b+=arrow(560,200,76,33,C.gray,'x',[8,5])+arrow(560,200,30,-71,C.gray,'y',[10,0])+txt(79,267,'h',C.gray,21)+txt(450,288,r.kind==='incline-length'?'S':'l',C.gray,21);if(r.kind==='rest-accel')b+=txt(340,385,'Fтр показана для шероховатой поверхности',C.gray,18,'middle');f='Ox — вниз по плоскости; Oy — по нормали';
  }else if(r.kind==='collision'){
   b+=line(65,282,610,282)+rect(147,242,55,40)+rect(397,242,75,40)+txt(174,227,'m',C.ink,23,'middle')+txt(434,227,'M',C.ink,23,'middle')+arrow(212,250,94,0,C.blue,'υ',[8,-6])+txt(434,385,'До удара: покой',C.gray,18,'middle')+arrow(340,163,148,0,C.green,'u',[10,-6])+txt(340,137,'После удара — вместе',C.green,20);
   b+=force(162,253,0,-58,C.blue,'Nₘ',[-10,-5,'end'])+force(187,253,0,58,C.red,'mg',[12,5])+force(412,253,0,-58,C.blue,'N_M',[-10,-5,'end'])+force(452,253,0,58,C.red,'Mg',[12,5]);f='mυ = (m + M)u';
  }else if(['spring-horizontal','spring-sine'].includes(r.kind)){
   b+=line(90,165,90,288)+line(90,288,570,288)+path('M90 263H120l12-12 24 24 24-24 24 24 24-24 24 24 12-12H312')+rect(312,242,64,46,'#fff1d6')+force(345,265,0,-93,C.blue,'N',[13,-5])+force(355,265,0,93,C.red,r.kind==='spring-horizontal'?'Mg':'mg',[13,5])+force(345,265,-100,0,C.green,'Fупр',[-10,-15,'end'])+arrow(465,240,100,0,C.gray,'x',[10,5]);f='Сила направлена к равновесию';
  }else if(r.kind==='cube'){
   b+=rect(95,149,470,254,'#e3f3ff')+line(95,149,565,149,C.blue)+line(320,90,320,224)+rect(284,224,72,72,'#fff1d6')+force(320,224,0,-88,C.purple,'Tн',[14,-4])+force(340,260,0,-49,C.blue,'FА',[18,-6])+force(320,260,0,112,C.red,'mg',[14,6])+line(445,149,445,224,C.gray,2,'6 5')+txt(455,193,'a',C.gray,20)+arrow(515,275,0,-85,C.gray,'y',[12,0]);f='Tн + FА = mg; верхняя грань на глубине a';
  }else if(r.kind==='light'){
   b+=rect(340,120,270,253,'#e3f3ff')+txt(165,152,'Воздух',C.ink,24)+txt(434,152,'Вода',C.ink,24)+arrow(75,251,525,0,C.gray,'',[]);
   for(let x=106;x<330;x+=56)b+=line(x,208,x,295,C.blue,3);
   for(let x=361;x<594;x+=34)b+=line(x,208,x,295,C.blue,3);
   b+=txt(175,349,'c',C.blue,22)+txt(437,349,'c · n⁻¹',C.blue,22);f='Частота сохраняется; λ в воде меньше';
  }else if(r.kind==='oblique'){
   b+=line(80,356,594,356)+path('M104 356Q340 -45 565 356',C.gray,'7 5')+circle(334.5,155.5)+force(334.5,155.5,0,106,C.red,'mg',[14,4])+arrow(104,356,63,-109,C.blue,'υ',[10,-8])+axes(512,185)+txt(127,339,'α',C.gray,22);f='На вершине υᵧ = 0; при падении υᵧ < 0';
  }else if(r.kind==='hill'){
   b+=path('M125 183L180 194C280 214 250 355 390 355H580')+circle(137.35,173.23)+force(137.35,173.23,0,80,C.red,'mg',[13,4])+force(137.35,173.23,15.38,-76.92,C.blue,'N',[13,-3])+line(77,185,77,355,C.gray,2,'6 5')+txt(46,272,'h',C.gray,23)+arrow(433,335,102,0,C.blue,'p',[8,-7]);f='Потенциальная энергия переходит в кинетическую';
  }else if(r.kind==='polynomial'){
   b+=arrow(95,244,215,0,C.gray,'t',[9,4])+arrow(95,310,0,-177,C.gray,'υₓ',[-12,-5,'end'])+line(95,170,285,309,C.blue,3)+txt(73,177,'5',C.blue,20);
   b+=arrow(410,200,184,0,C.gray,'t',[9,4])+arrow(410,310,0,-177,C.gray,'Fₓ',[-12,-5,'end'])+line(410,268,571,268,C.red,3)+txt(391,291,'−1,2 Н',C.red,18);f='Скорость убывает; сила постоянна';
  }else if(r.kind==='coordinate-pairs'){
   b+=arrow(100,319,470,0,C.gray,'t',[9,4])+arrow(100,319,0,-192,C.gray,'υₓ',[-12,-5,'end'])+line(100,249,508,133,C.blue,3)+line(100,319,508,203,C.green,3)+txt(522,138,'А',C.blue,24)+txt(522,211,'Б',C.green,24)+txt(76,255,'5',C.blue,20)+txt(80,343,'0',C.gray,20);f='Ускорения одинаковы; начальные скорости различны';
  }else if(r.images.length===0)throw Error('Missing diagram '+r.id);
  if(f){b+=txt(340,423,f,C.green,19,'middle');y=460;}
 }
 if(remaining.length){
  b+=txt(35,y,'Исходные графики и обозначения ФИПИ',C.gray,20);y+=25;
  for(let i=0;i<remaining.length;i+=2){
   let h=0;for(let j=0;j<2&&i+j<remaining.length;j++){
    const [iw,ih]=dimensions(fs.readFileSync(filePath.join(__dirname,'../../fipi-assets',remaining[i+j])));
    const small=iw<90&&ih<70,isolated=iw<25&&ih<30;
    const im=original(remaining[i+j],55+j*315,y+26,small?iw*2:255,isolated?40:small?ih*2:218);b+=txt(55+j*315,y+14,'Фрагмент '+(r.images.length-remaining.length+i+j+1),C.gray,16)+im.body;h=Math.max(h,im.h);
   }y+=h+65;
  }
 }
 const cs=cards(r.stages,y+15);b+=cs.body;diagrams[r.id]=svg(r.id,r.title,r.diagramCaption,b,cs.end+16);
}
module.exports={diagrams};
