const {records}=require('./physics-optics');
const {C,txt,line,dot,arrow,original,cards,svg}=require('../lib/physics-svg');
const n=x=>Number(x.toFixed(5)).toLocaleString('ru-RU',{useGrouping:false,maximumFractionDigits:5});
// Coordinates are fractions of the unchanged primary raster, read from FIPI.
const points={
 '2DB2F4':{o:[.486,.495],s:[.946,.098],i:[.255,.688]},
 '6D59F8':{o:[.5,.447],s:[.73,.235],i:[.039,.87]},
 '8BB009':{o:[.5,.5],s:[.064,.5],i:[.739,.5]},
 '56A371':{o:[.553,.525],s:[.679,.377],i:[.807,.228]},
 '49A315':{o:[.5,.497],s:[.151,.2],i:[.674,.65]},
 '50081F':{o:[.5,.5],s:[.064,.103],i:[.733,.714]},
 CCFF23:{o:[.493,.5],s:[.949,.5],i:[.264,.5]},
 D43150:{o:[.481,.523],s:[.945,.05],i:[.249,.759]},
 BCB2C7:{o:[.5,.505],s:[.184,.8],i:[.903,.121]},
 '217B9D':{o:[.505,.5],s:[.739,.295],i:[.043,.97]},
 '6B2A9E':{o:[.5,.5],s:[.842,.257],i:[.235,.693]},
 '343D86':{o:[.5,.507],s:[.056,.83],i:[.739,.329]}
};
const ring=(x,y)=>`<circle cx="${x}" cy="${y}" r="10" fill="none" stroke="${C.green}" stroke-width="2.5"/>`;
function dimension(x1,x2,y,label){return line(x1,y,x2,y,C.blue,2)+line(x1,y-6,x1,y+6,C.blue,2)+line(x2,y-6,x2,y+6,C.blue,2)+txt((x1+x2)/2,y+28,label,C.blue,19,'middle');}
function lens(x,y,h,diverging=false){return line(x,y-h,x,y+h,C.ink,2)+line(x,y-h,x-8,y-h+(diverging?-12:12),C.ink,2)+line(x,y-h,x+8,y-h+(diverging?-12:12),C.ink,2)+line(x,y+h,x-8,y+h+(diverging?12:-12),C.ink,2)+line(x,y+h,x+8,y+h+(diverging?12:-12),C.ink,2);}
const diagrams={};
for(const r of Object.values(records)){let b='',cy=565;
 if(r.images.length){
  const im=original(r.images[0],55,120,570,325);b+=txt(55,87,'Исходный рисунок ФИПИ',C.gray,18)+im.body;
  if(points[r.id]){
   const p=points[r.id],S=[im.X(p.s[0]),im.Y(p.s[1])],O=[im.X(p.o[0]),im.Y(p.o[1])],I=[im.X(p.i[0]),im.Y(p.i[1])];
   if(r.region==='inside'){
    b+=line(O[0],O[1],I[0],I[1],C.blue,1.7,'6 4')+line(S[0],S[1],O[0],O[1],C.blue,1.7)+line(O[0],O[1],O[0]-.65*(S[0]-O[0]),O[1]-.65*(S[1]-O[1]),C.blue,1.7);
   }else if(r.height!=='axis')b+=line(S[0],S[1],I[0],I[1],C.blue,1.7);
   b+=ring(I[0],I[1]);
   b+=txt(55,485,(r.kind==='lens-object'?'Искомый предмет':'Изображение')+' выделен'+(r.kind==='lens-object'?'':'о')+' зелёным',C.green,20);
   b+=txt(55,521,r.region==='inside'?'Пунктир — продолжение луча через O':r.height==='axis'?'Изображение остаётся на главной оси':'Синий — луч через оптический центр O',C.blue,20);
  }else if(r.kind==='lens-focus-grid'){
   const xF=im.X(57/369),xO=im.X(99/369),y=im.Y(71/128);b+=ring(xF,y)+txt(xF,im.Y(1)+32,'F',C.green,20,'middle')+dimension(xF,xO,im.Y(1)+57,'3 клетки');
   b+=txt(55,470,'После линзы луч параллелен главной оси',C.blue,21)+txt(55,510,'Передний фокус: 3 клетки по 2 см',C.green,21);
  }else if(r.kind==='lens-focus-distances'){
   const s=im.X(57/286),o=im.X(143/286),i=im.X(185/286);b+=dimension(s,o,im.Y(1)+38,'d = 30 см')+dimension(o,i,im.Y(1)+103,'f = 15 см');
   b+=txt(55,470,'20 см — это 4 клетки; одна клетка 5 см',C.blue,21)+txt(55,510,'F = df ÷ (d + f) = 10 см',C.green,22);
  }else{
   b+=txt(55,492,r.summary,C.blue,21);
   b+=txt(55,530,r.kind==='mirror-rotation'?'Нормаль поворачивается вместе с зеркалом':'Углы падения и отражения отсчитываем от нормали',C.ink,19);
  }
 }else if(r.kind.startsWith('mirror-')&& !['mirror-distance','mirror-factor'].includes(r.kind)){
  const a=(r.alpha??r.gamma/2)*Math.PI/180,ox=340,oy=365,l=220;
  b+=line(75,oy,605,oy,C.ink,3)+line(ox,oy,ox,110,C.gray,2,'7 5');for(let x=80;x<605;x+=20)b+=line(x,oy,x-15,oy+16,C.gray,1);
  b+=arrow(ox-l*Math.sin(a),oy-l*Math.cos(a),l*Math.sin(a),l*Math.cos(a),C.blue)+arrow(ox,oy,l*Math.sin(a),-l*Math.cos(a),C.red);
  b+=txt(350,125,'Нормаль',C.gray,20)+txt(55,435,'α = β; γ = α + β = 2α',C.ink,23)+txt(55,485,r.summary,C.green,22)+txt(55,529,r.kind==='mirror-surface'?'Угол с поверхностью: θ = 90° − α':'Угол с нормалью и угол с поверхностью в сумме 90°',C.ink,19);
 }else if(['mirror-distance','mirror-factor'].includes(r.kind)){
  const ox=340,y=260; b+=txt(55,105,'Симметрия относительно плоскости зеркала',C.ink,22)+line(ox,145,ox,410,C.ink,3)+line(90,y,590,y,C.gray,1,'6 4');
  b+=dot(155,y,C.blue)+dot(525,y,C.green)+txt(155,y-25,'S',C.blue,24,'middle')+txt(525,y-25,'S′',C.green,24,'middle')+txt(355,170,'Зеркало',C.ink,20);
  b+=dimension(155,ox,335,'d')+dimension(ox,525,335,'d')+dimension(155,525,420,'D = 2d');
  b+=txt(55,510,r.summary,C.green,22);
 }else if(r.kind==='lens-image-distance'){
  const S=80,O=413.333,I=580,Y=300,F=111.111;
  b+=txt(55,100,'Источник и изображение на главной оси',C.ink,22)+line(55,Y,630,Y,C.gray,1,'6 4')+lens(O,Y,135)+txt(O+12,Y+26,'O',C.ink,20);
  for(const y of [210,390])b+=line(S,Y,O,y,C.blue,2)+line(O,y,I,Y,C.blue,2);
  for(const x of [O-F,O+F])b+=line(x,Y-5,x,Y+5,C.ink,2)+txt(x,Y+25,'F',C.ink,19,'middle');
  b+=dot(S,Y,C.blue)+dot(I,Y,C.green)+txt(S,Y-22,'S',C.blue,23,'middle')+txt(I,Y-22,'S′',C.green,23,'middle');
  b+=dimension(S,O,440,'d = 3F')+dimension(O,I,440,'f = 1,5F')+txt(55,526,r.summary,C.green,21);
 }else if(r.kind.startsWith('lens-')){
  const virtual=['lens-virtual-object','lens-diverging-focus'].includes(r.kind),diverging=r.kind==='lens-diverging-focus';
  const scaleData=r.kind==='lens-total-distance'?{d:30,f:60,F:20}:r.kind==='lens-virtual-object'?{d:24,f:-60,F:40}:r.kind==='lens-diverging-focus'?{d:48,f:-16,F:-24}:r.kind==='lens-image-height'?{d:60,f:30,F:20}:r.kind==='lens-object-magnification'?{d:.6,f:3,F:.5}:r.kind==='lens-object-distance'?{d:30,f:15,F:10}:{d:3,f:1.5,F:1};
  const {d,f,F}=scaleData,min=-Math.max(d,f<0?-f:0,Math.abs(F)*1.1),max=Math.max(f,Math.abs(F)*1.1),sc=500/(max-min),O=80-min*sc,Y=300,H=Math.min(75,100*d/Math.abs(f)),S=O-d*sc,I=O+f*sc,hi=-f/d*H;
  b+=txt(55,100,'Ход лучей в тонкой линзе',C.ink,22)+line(55,Y,630,Y,C.gray,1,'6 4')+lens(O,Y,135,diverging)+txt(O+10,Y+24,'O',C.ink,20);
  b+=arrow(S,Y,0,-H,C.blue,'Предмет',[-5,virtual&&!diverging?-48:-12,'middle'])+arrow(I,Y,0,-hi,C.green,'Изображение',[0,diverging?-65:hi<0?26:-12,'middle']);
  for(const x of[O-Math.abs(F)*sc,O+Math.abs(F)*sc])b+=line(x,Y-5,x,Y+5,C.ink,2)+txt(x,Y+25,'F',C.ink,19,'middle');
  b+=line(S,Y-H,O,Y-H,C.blue,2)+line(S,Y-H,O,Y,C.red,2);
  if(virtual){
   const endpoint=Math.min(625,O+100),proportion=(endpoint-O)/(I-O);
   b+=line(O,Y-H,endpoint,Y-H+proportion*(H-hi),C.blue,2)+line(O,Y,endpoint,Y+(endpoint-O)*H/(O-S),C.red,2);
   b+=line(I,Y-hi,O,Y-H,C.blue,1.5,'5 4')+line(I,Y-hi,O,Y,C.red,1.5,'5 4');
  }else b+=line(O,Y-H,I,Y-hi,C.blue,2)+line(O,Y,I,Y-hi,C.red,2);
  b+=txt(55,482,virtual?'Пунктир — продолжения лучей к мнимому изображению':'Действительное изображение по другую сторону линзы',C.ink,20)+txt(55,526,r.summary,C.green,21);
 }else if(r.kind==='coil-energy'){
  b+=txt(55,108,'Энергия магнитного поля',C.ink,24);let curve='M130 280';for(let j=0;j<6;j++){let x=130+j*55;curve+=` C${x+10} 180 ${x+45} 180 ${x+55} 280`;}
  b+=line(80,280,130,280,C.ink,3)+`<path d="${curve}" stroke="${C.ink}" stroke-width="3" fill="none"/>`+line(460,280,590,280,C.ink,3)+arrow(510,250,65,0,C.blue,'I = 2 А',[0,-20,'end'])+txt(220,330,'L = 0,2 мГн',C.ink,24)+txt(95,420,'W = LI² ÷ 2',C.blue,26)+txt(95,485,'W = 0,4 мДж',C.green,26);
 }else if(['grating-count','grating-order'].includes(r.kind)){
  const k=r.maxOrder,step=500/(2*k);b+=txt(55,105,'Порядки главных максимумов',C.ink,23)+line(65,300,615,300,C.gray,2);
  for(let j=-k;j<=k;j++){const x=340+j*step;b+=line(x,280,x,320,j===0?C.red:C.blue,3)+txt(x,353,String(j),j===0?C.red:C.blue,k>5?17:20,'middle');}
  b+=txt(340,240,'Центральный максимум: k = 0',C.red,22,'middle')+txt(55,427,'Предел: |k|λ ≤ d',C.ink,24)+txt(55,480,r.summary,C.green,25)+txt(55,527,'Расположение отметок условное; показаны порядки',C.gray,18);
 }else{
  const withLens=r.kind!=='grating-screen';
  b+=txt(55,105,'Положение максимумов на экране',C.ink,23)+line(110,150,110,475,C.ink,4)+line(555,150,555,430,C.ink,3)+line(110,350,555,350,C.gray,2,'6 4');
  // For each diffraction order select the ray through the lens optical centre.
  // It keeps its direction; different orders originate at different grating points.
  for(let k=0;k<3;k++){const y=350-k*80,startY=withLens?350+k*80*180/265:350;b+=line(110,startY,555,y,k===0?C.gray:C.blue,2)+dot(555,y,k===0?C.red:C.blue)+txt(575,y+5,'k = '+k,C.ink,19);}
  b+=txt(75,145,'Решётка',C.ink,18)+txt(530,135,'Экран',C.ink,18);
  if(r.kind!=='grating-screen'){b+=lens(290,350,145)+txt(255,190,'Линза',C.ink,18)+dimension(290,555,441,'F');}else b+=dimension(110,555,441,'L');
  b+=txt(55,510,r.kind==='grating-screen'?'x₂ = 2λL ÷ d = 36 мм':'Δx = x₂ − x₁ = Fλ ÷ d',C.green,22);
 }
 const cs=cards(r.stages,cy);b+=cs.body;diagrams[r.id]=svg(r.id,r.title,r.diagramCaption,b,cs.end+18);
}
module.exports={diagrams,points};
