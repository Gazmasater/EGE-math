const {C,txt,line,rect,dot,arrow,original,cards,svg}=require('../lib/physics-svg');
const {records}=require('./physics-energy');const diagrams={};
const axes=(x,y,dx=65,dy=55)=>arrow(x,y,dx,0,C.gray,'x',[10,5])+arrow(x,y,0,-dy,C.gray,'y',[10,0]);
const ball=(x,y,r=18)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#edf4ff" stroke="${C.ink}" stroke-width="2"/>`;
const coil=(x,y,w)=>line(x,y,x+15,y)+`<polyline points="${Array.from({length:17},(_,i)=>`${x+15+i*(w-30)/16},${y+(i===0||i===16?0:i%2?13:-13)}`).join(' ')}" fill="none" stroke="${C.ink}" stroke-width="2"/>`+line(x+w-15,y,x+w,y);
for(const r of Object.values(records)){
 let b='',y=490;const k=r.kind;
 if(k==='cart-energy'){
  const im=original(r.images[0],70,90,485,355);b+=im.body;
  b+=arrow(im.X(.335),im.Y(.18),0,73,C.purple,'mg',[-12,0,'end']);
  b+=arrow(im.X(.58),im.Y(.80),0,105,C.purple,'Mg',[12,0]);
  b+=arrow(im.X(.36),im.Y(.92),0,-98,C.green,'N',[-12,0,'end']);
  b+=axes(540,140,65,50);y=535;
  b+=txt(45,480,'mvcos60° = (M + m)V',C.ink,22)+txt(45,515,'24 кг · 1 м·с⁻¹; K = 12 Дж',C.ink,21);
 }else if(k==='spring-launch-mass'){
  const im=original(r.images[0],100,115,200,290);b+=im.body;
  const cx=im.X(.49),cy=im.Y(.25);
  b+=arrow(cx-14,cy-16,0,-70,C.green,'F_упр',[-10,0,'end']);
  b+=arrow(cx+15,cy,0,73,C.purple,'mg',[70,0]);b+=axes(520,165,70,65);
  b+=txt(355,235,'Сжатие x = 1 см',C.ink,21)+txt(355,278,'Подъём при разгоне: x',C.ink,20)+txt(355,321,'v = 10 м·с⁻¹',C.ink,21);
  b+=txt(45,455,'Энергия пружины = K + mgx',C.ink,22);y=500;
 }else if(k==='gravity-ratio'){
  for(const[j,n,L]of [[0,'З',440],[1,'М',176]]){
   const cy=145+j*155;b+=ball(95,cy,30)+txt(95,cy+6,'С',C.ink,22,'middle');
   b+=line(125,cy,95+L-18,cy,C.gray,2,'5 5')+ball(95+L,cy);
   b+=txt(95+L+25,cy+6,n,C.ink,22)+arrow(95+L-18,cy,-90,0,C.blue,'F_'+n,[0,-18,'middle']);
   b+=line(95,cy+48,95+L,cy+48,C.gray)+txt(95+L/2,cy+72,'r_'+n,C.ink,20,'middle');
  }b+=txt(45,430,'r направлен от Солнца; сила — к Солнцу',C.ink,20);y=470;
 }else if(k==='closed-work'){
  b+=dot(275,95,C.ink)+line(275,95,385,275,C.ink,3)+ball(385,275);
  b+=arrow(385,275,0,95,C.purple,'mg',[12,0])+arrow(380,266,-55,-90,C.green,'T',[-10,0,'end']);
  b+=`<ellipse cx="275" cy="275" rx="110" ry="26" fill="none" stroke="${C.gray}" stroke-width="2" stroke-dasharray="5 5"/>`;
  b+=txt(415,210,'l = 1 м',C.ink,20)+txt(45,415,'Высота постоянна: ΔU = 0',C.ink,22)+txt(45,452,'A_тяж = −ΔU = 0',C.ink,22);b+=arrow(100,235,-65,0,C.gray,'x',[-10,5,'end'])+arrow(100,235,0,-55,C.gray,'y',[10,0]);y=495;
 }else if(k.startsWith('spring-')||k==='gun-k'){
  if(k==='gun-k'){
   b+=line(180,390,300,390,C.ink,3)+rect(223,300,34,80,'#fff5e8')+ball(240,270);
   b+=arrow(226,262,0,-80,C.green,'F_упр',[-10,0,'end'])+arrow(254,272,0,75,C.purple,'mg',[12,0]);
   b+=ball(465,125)+arrow(465,125,0,75,C.purple,'mg',[12,0]);b+=line(535,125,535,270,C.gray)+txt(550,200,'h = 2 м',C.ink,21);
   b+=txt(360,88,'Верхняя точка: v = 0',C.ink,21)+txt(45,450,'Начало отсчёта высоты — до выстрела',C.ink,20);b+=axes(80,230);y=495;
  }else{
   const pair=k!=='spring-energy';
   for(let j=0;j<(pair?2:1);j++){const cy=140+j*160,w=k==='spring-change'?(j===0?155:r.x2>r.x1?235:115):k==='spring-ratio'?(j===0?220:145):190;b+=line(70,cy-35,70,cy+35,C.ink,4)+coil(70,cy,w)+line(70+w,cy-23,70+w,cy+23,C.ink,3);b+=arrow(70+w,cy-23,k==='spring-energy'?60:-60,0,C.green,'F_упр',[0,-13,'middle']);}
   r.rows.forEach((v,i)=>{b+=txt(355,115+i*100,v[0],C.gray,19)+txt(355,146+i*100,v[1],C.ink,21)});
   b+=txt(45,435,'Сила упругости возвращает к x = 0',C.ink,20);y=480;
  }
 }else if(k==='traction-work'){
  b+=line(45,320,635,320,C.ink,3)+rect(235,260,100,60)+arrow(335,275,100,r.horizontal?0:-60,C.blue,'F',[12,0]);
  b+=arrow(235,300,-105,0,C.red,'F_тр',[-10,5,'end'])+arrow(275,260,0,-90,C.green,'N',[12,0])+arrow(295,285,0,105,C.purple,'mg',[12,0]);
  b+=arrow(375,350,125,0,C.gray,'s',[12,5]);b+=axes(60,225,65,50);b+=txt(385,420,'Скорость постоянна',C.ink,20);y=475;
 }else if(k.startsWith('stop-')){
  b+=line(65,115,300,305,C.ink,3)+line(300,305,630,305,C.ink,3)+ball(142,160,13);
  b+=arrow(142,160,0,80,C.purple,'mg',[-12,0,'end'])+arrow(142,160,50,-62,C.green,'N',[12,0]);
  b+=rect(410,267,65,38)+arrow(410,286,-85,0,C.red,'F_тр',[-8,-10,'end'])+arrow(438,267,0,-65,C.green,'N',[12,0])+arrow(455,286,0,85,C.purple,'mg',[12,0]);
  b+=line(45,115,45,305,C.gray)+txt(27,222,'h',C.ink,21,'end');b+=arrow(315,399,235,0,C.gray,'s',[12,5]);
  b+=txt(65,72,'Гладкий склон',C.ink,21)+txt(475,235,'Торможение',C.ink,21)+txt(45,455,'Начало и конец: скорость равна нулю',C.ink,20);y=495;
 }else if(k.startsWith('hill-')||k.startsWith('slope-')||k==='down-speed'){
  b+=line(120,120,525,355,C.ink,3)+line(120,355,525,355,C.gray,2,'5 5')+ball(290,198);
  b+=arrow(290,198,0,98,C.purple,'mg',[12,0])+arrow(290,198,45,-78,C.green,'N',[12,0]);
  const down=k.startsWith('slope')||k==='down-speed';b+=arrow(350,205,down?82:-82,down?48:-48,C.blue,'v',[12,0]);
  b+=line(90,120,90,355,C.gray)+txt(65,245,'h',C.ink,22,'end');
  if(r.alpha)b+=txt(455,333,'30°',C.ink,20);
  b+=txt(380,148,'N ⟂ склон',C.ink,21)+txt(45,425,'Работа N = 0; K + U сохраняется',C.ink,21);y=480;
 }else if(k==='potential-mass'){
  b+=line(55,240,330,240,C.ink,3)+line(55,390,330,390,C.blue,3);
  for(const [cx,lab]of [[120,'m₁'],[270,'m₂']]){
   b+=rect(cx-38,195,76,45)+txt(cx,223,lab,C.ink,22,'middle');
   b+=arrow(cx-20,195,0,-60,C.green,'N',[-10,0,'end'])+arrow(cx+20,219,0,85,C.purple,lab+'g',[10,0]);
  }
  b+=line(55,240,55,390,C.gray)+txt(42,320,'h',C.ink,21,'end')+txt(80,420,'Поверхность воды: U = 0',C.ink,20);
  r.rows.forEach((v,i)=>{b+=txt(365,125+i*95,v[0],C.gray,19)+txt(365,159+i*95,v[1],C.ink,21)});
  b+=txt(55,465,'Оба автомобиля находятся на одной высоте',C.ink,20);y=490;
 }else if(k==='kinetic'||k==='mass-ratio'){
  const pair=k!=='kinetic';for(let j=0;j<(pair?2:1);j++){
   const cy=170+j*150,lab=pair?'m'+['₁','₂'][j]:'m';b+=rect(90,cy-30,100,60)+txt(140,cy+7,lab,C.ink,22,'middle')+arrow(190,cy,110,0,C.blue,'v'+(pair?['₁','₂'][j]:''),[12,5]);
  }r.rows.forEach((v,i)=>{b+=txt(365,125+i*95,v[0],C.gray,19)+txt(365,159+i*95,v[1],C.ink,21)});
  b+=axes(80,435,85,55);y=490;
 }else{
  const loss=k.startsWith('loss-'),up=k==='ascent-energy'||k==='ascent-height'||k==='potential-change';
  b+=line(55,385,350,385,C.ink,3)+ball(195,135)+ball(195,355);
  b+=arrow(195,135,0,85,C.purple,'mg',[12,0]);if(loss)b+=arrow(178,130,0,-60,C.red,'R',[-12,0,'end']);
  b+=line(280,135,280,355,C.gray)+txt(299,255,k==='potential-change'?'Δh':'h',C.ink,22);
  b+=arrow(110,270,0,up?-85:70,C.blue,'v',[-12,0,'end']);b+=axes(55,340,60,60);
  r.rows.forEach((v,i)=>{b+=txt(385,155+i*100,v[0],C.gray,19)+txt(385,188+i*100,v[1],C.ink,21)});y=490;
 }
 const panel=cards(r.stages,y);diagrams[r.id]=svg(r.id,r.title,r.diagramCaption,b+panel.body,panel.end+10);
}
module.exports={diagrams};
