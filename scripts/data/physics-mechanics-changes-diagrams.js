const {records}=require('./physics-mechanics-changes');
const {C,txt,line,rect,dot,arrow,force,original,cards,svg}=require('../lib/physics-svg');
const circle=(x,y,r,c='#eef5ff')=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" stroke="${C.ink}" stroke-width="2"/>`;
const path=(d,c=C.ink,dash='')=>`<path d="${d}" fill="none" stroke="${c}" stroke-width="2" ${dash?`stroke-dasharray="${dash}"`:''}/>`;
function axes(x=510,y=210,up=true){return arrow(x,y,90,0,C.gray,'x',[2,20])+arrow(x,y,0,up?-85:85,C.gray,'y',[-15,up?-4:20])+txt(x-19,y+22,'O',C.gray,17);}
function spring(x,top,bottom){let d=`M${x} ${top}v12`;for(let y=top+12;y<bottom-14;y+=16)d+=`l-12 4l24 8l-12 4`;d+=`L${x} ${bottom}`;return path(d);}
const diagrams={};
for(const r of Object.values(records)){
 let body='',foot='';
 if(r.images.length){
  body+=txt(44,83,'Исходная схема ФИПИ и силы',C.gray,20);
  if(r.kind==='horizontal-launch'){
   const im=original(r.images[0],110,128,355,300),xy=r.id==='C89B35'?[.158,.123]:r.id==='CA81AC'?[.296,.164]:[.291,.12];
   body+=im.body+force(im.X(xy[0]),im.Y(xy[1]),0,92,C.red,'mg',[14,5])+axes(510,205);
   foot='Ox — вправо; Oy — вверх; aᵧ = −g';
  }else if(r.kind==='oblique-launch'){
   const im=original(r.images[0],65,115,545,330);body+=im.body+force(im.X(.38),im.Y(.325),0,87,C.red,'mg',[14,5]);foot='В любой точке полёта действует только тяжесть';
  }else if(r.kind==='incline-slide'){
   const im=original(r.images[0],70,175,505,240),shallow=r.id==='E53EF5',xy=shallow?[.56,.60]:[.45,.48],ang=shallow?Math.atan(.35):Math.atan(.57),x=im.X(xy[0]),y=im.Y(xy[1]);
   body+=im.body+force(x,y,0,95,C.red,'mg',[10,15])+force(x,y,75*Math.sin(ang),-75*Math.cos(ang),C.blue,'N',[12,0])+force(x,y,-95*Math.cos(ang),-95*Math.sin(ang),C.green,'Fтр',[-10,-12,'end']);
   body+=arrow(486,125,77*Math.cos(ang),77*Math.sin(ang),C.gray,'x',[8,5])+arrow(486,125,55*Math.sin(ang),-55*Math.cos(ang),C.gray,'y',[10,0]);foot='N — по нормали; Fтр — против скольжения';
  }else if(r.kind==='spring-phase'){
   const im=original(r.images[0],75,174,430,220),x=im.X(.645),y=im.Y(.4);body+=im.body+force(x,y,0,-45,C.blue,'N',[14,-6])+force(x,y,0,45,C.red,'mg',[42,-8])+axes(545,230);foot='В точке 2: Fупр = 0; при x > 0 сила влево';
  }else throw Error('Unhandled original '+r.id);
 }else if(r.kind==='oblique-launch'){
  body+=line(83,365,600,365)+path('M115 365Q330 -80 545 365',C.gray,'7 5')+circle(235.4,185.576,10,'#fff1d6')+force(235.4,185.576,0,91,C.red,'mg',[13,4]);
  body+=arrow(115,365,60,-124.186,C.blue,'υ₀',[-8,-12,'end'])+axes(524,163)+txt(153,351,'α',C.gray,21);foot='Полёт до исходного уровня; aₓ = 0, aᵧ = −g';
 }else if(r.kind==='orbit'){
  body+=circle(255,248,143,'none')+circle(255,248,39,'#ecf8f1')+txt(255,253,'M',C.ink,24,'middle')+circle(398,248,11,'#ffebcd');
  body+=line(294,248,386,248,C.gray,2,'7 5')+txt(342,281,'R',C.gray,22)+force(398,248,-105,0,C.red,'Fт',[10,-15])+arrow(398,248,0,-95,C.blue,'υ',[12,0])+txt(420,324,'Ox — к центру',C.gray,18)+txt(420,353,'Oy — по касательной',C.gray,18);foot='Гравитация обеспечивает центростремительное ускорение';
 }else if(['spring','spring-energy'].includes(r.kind)){
  const energy=r.kind==='spring-energy',y=energy?231:265;
  body+=line(255,100,420,100)+spring(336,102,y-20)+rect(314,y-20,44,40)+line(215,energy?300:225,440,energy?300:225,C.gray,2,'7 5')+txt(225,energy?323:215,'Равновесие',C.gray,18);
  body+=force(328,y,0,-(energy?69:112),C.blue,'Fупр',[-12,-5,'end'])+force(345,y,0,90,C.red,'mg',[12,5]);
  if(energy)body+=arrow(410,y,0,-72,C.green,'υ',[13,0])+arrow(505,270,0,-106,C.gray,'y',[12,0]);
  else body+=arrow(505,160,0,120,C.gray,'x',[12,0]);
  foot=energy?'Выше равновесия: Δℓ > 0 уменьшается':'Ось Ox вниз; x отсчитывается от равновесия';
 }else if(['floating','floating-block'].includes(r.kind)){
  body+=rect(95,206,485,162,'#e4f5ff')+line(95,206,580,206,C.blue,3)+(r.condition.includes('шарик')?circle(340,212,58,'#fff1d6'):rect(270,155,140,114,'#fff1d6'));
  body+=force(340,212,0,-100,C.blue,'FА',[14,0])+force(340,212,0,100,C.red,'mg',[14,5])+arrow(520,170,0,-64,C.gray,'y',[12,0]);
  body+=line(440,206,440,269,C.green,2)+line(433,206,447,206,C.green)+line(433,269,447,269,C.green)+txt(455,244,'h',C.green,21)+txt(130,329,'ρж',C.blue,22);foot='Равновесие: FА = mg; ρжVпогр = m';
 }else if(['incline-pull','incline-rest'].includes(r.kind)){
  // Plane rises to the right. Both axes match the written projections.
  body+=path('M90 365L555 145L555 365Z')+`<g transform="translate(327 253) rotate(-25.32)">${rect(-29,-42,58,42,'#fff1d6')}</g>`;
  const x=319,y=235;body+=force(x,y,0,96,C.red,'mg',[13,10])+force(x,y,-42,-88,C.blue,'N',[-10,-10,'end']);
  if(r.kind==='incline-pull')body+=force(x,y,-88,42,C.green,'Fтр',[-12,12,'end'])+force(x,y,112,-53,C.purple,'T',[10,-8]);
  else body+=force(x,y,99,-47,C.green,'Fтр',[12,-3]);
  body+=arrow(472,302,74,-35,C.gray,'x',[10,5])+arrow(472,302,-32,-68,C.gray,'y',[-12,0,'end']);
  foot=r.kind==='incline-pull'?'Показана параллельная нить: β = 0':'Покой: Fтр = mg sinα; N = mg cosα';
 }else if(r.kind==='rotating-disk'){
  body+=`<ellipse cx="295" cy="304" rx="189" ry="55" fill="#eef5ff" stroke="${C.ink}" stroke-width="2"/>`+dot(220,304,C.gray)+line(220,304,382,304,C.gray,2,'6 5')+rect(357,260,51,44,'#fff1d6')+txt(285,335,'r',C.gray,22);
  body+=force(382,281,0,-96,C.blue,'N',[15,0])+force(394,281,0,109,C.red,'mg',[13,5])+force(382,281,-103,0,C.green,'Fтр',[2,-15])+txt(452,258,'Ox — к центру',C.gray,17)+txt(452,287,'Oy — вверх',C.gray,17);foot='N = mg; трение направлено к центру';
 }else if(r.kind==='pendulum'){
  const x=397,y=292;body+=dot(273,110,C.ink)+line(273,110,x,y)+line(273,110,273,330,C.gray,2,'6 5')+circle(x,y,17,'#fff1d6');body+=force(x,y,-58,-85,C.blue,'Tн',[-11,-4,'end'])+force(x,y,0,97,C.red,'mg',[12,5])+txt(293,166,'θ',C.gray,20)+txt(359,183,'ℓ',C.gray,22);body+=arrow(475,198,65,-44,C.gray,'касательная',[0,-10,'end']);foot='Длина и амплитуда прежние; масса шарика меньше';
 }else if(r.kind==='projectile-phase'){
  body+=circle(280,233,19,'#fff1d6')+force(280,233,0,112,C.red,'mg',[14,4])+arrow(232,233,0,r.id==='9D3F89'?85:-85,C.blue,'υ',[r.id==='9D3F89'?-16:12,0,r.id==='9D3F89'?'end':'start'])+axes();foot=r.id==='D443B8'?'Вертикальная проекция: aᵧ = −g; υₓ = const':'Единственная сила — тяжесть; aᵧ = −g';
  if(r.id==='D443B8'){// Replace the illustrative velocity by an oblique one.
   body=circle(280,233,19,'#fff1d6')+force(280,233,0,112,C.red,'mg',[14,4])+arrow(280,233,85,-75,C.blue,'υ',[10,-8])+axes();
  }
 }else if(r.kind==='terminal-fall'){
  body+=circle(310,236,22,'#fff1d6')+force(303,236,0,-98,C.blue,'T',[-12,-5,'end'])+force(320,236,0,98,C.red,'mg',[12,5])+arrow(430,200,0,93,C.green,'υ',[12,5])+arrow(535,280,0,-115,C.gray,'y',[10,0]);foot='Равномерный спуск: T = mg';
 }else if(r.kind==='bathyscaphe'){
  body+=rect(90,115,495,300,'#e4f5ff')+`<ellipse cx="303" cy="253" rx="85" ry="31" fill="#edf0f4" stroke="${C.ink}" stroke-width="2"/>`;
  body+=force(272,253,0,-95,C.blue,'FА',[-12,-6,'end'])+force(333,253,0,-61,C.green,'Fс',[13,-5])+force(304,253,0,124,C.red,'mg',[14,4])+arrow(480,183,0,95,C.purple,'υ',[12,0])+arrow(550,235,0,-95,C.gray,'y',[12,0]);foot='Плотность воды и полный объём постоянны';
 }else if(r.kind==='sound'){
  body+=rect(355,123,235,258,'#eef0f4')+txt(193,111,'Воздух',C.ink,23,'middle')+txt(470,111,'Сталь',C.ink,23,'middle')+arrow(70,263,540,0,C.gray,'x',[0,23,'end']);
  for(let x=95;x<330;x+=25)body+=line(x,206,x,304,C.blue,3);
  for(let x=379;x<590;x+=67)body+=line(x,206,x,304,C.blue,3);
  body+=txt(113,350,'меньше λ',C.blue,20)+txt(423,350,'больше λ',C.blue,20)+txt(293,405,'ν₁ = ν₂',C.green,23);foot='Частота сохраняется; скорость и длина волны растут';
 }else if(r.kind==='submerged-cube'){
  body+=rect(95,145,470,265,'#e4f5ff')+line(320,85,320,251)+rect(285,251,70,70,'#fff1d6');body+=force(320,251,0,-102,C.purple,'T',[-17,-5,'end'])+force(344,286,0,-15,C.blue,'FА',[24,-3])+force(320,286,0,117,C.red,'mg',[13,0]);body+=line(439,145,439,321,C.gray,2,'6 5')+txt(453,234,'hн',C.gray,22)+arrow(528,270,0,-85,C.gray,'y',[12,0]);foot='Подъём: pниж уменьшается; FА и T постоянны';
 }else throw Error('Missing diagram '+r.kind);
 body+=txt(340,476,foot,C.green,19,'middle');
 const cs=cards(r.stages,504);body+=cs.body;diagrams[r.id]=svg(r.id,r.title,r.diagramCaption,body,cs.end+16);
}
module.exports={diagrams};
