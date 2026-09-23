const {records}=require('./electrodynamics-solutions');
const catalog=require('./electrodynamics-catalog.json');
const {C,txt,line,rect,dot,arrow,force,original,cards,svg}=require('../lib/physics-svg');
const {fieldDiagram}=require('./electrodynamics-field-diagrams');
const {electroDiagram}=require('./electrodynamics-electrostatic-diagrams');
const {magneticDiagram}=require('./electrodynamics-magnetic-diagrams');
const {inductionDiagram}=require('./electrodynamics-induction-diagrams');
const {mechanicsDiagram}=require('./electrodynamics-mechanics-diagrams');
const {frameDiagram}=require('./electrodynamics-frame-diagrams');
const {railDiagram}=require('./electrodynamics-rail-diagrams');
const {opticsDiagram}=require('./electrodynamics-optics-diagrams');
function dcSchematic(y){
 const Y=v=>y+v,circle=(x,v,r,s)=>`<circle cx="${x}" cy="${Y(v)}" r="${r}" fill="white" stroke="${C.ink}" stroke-width="2"/>`+txt(x,Y(v)+7,s,C.ink,21,'middle');
 let b=txt(340,Y(25),'Принципиальная схема по фотографии',C.ink,22,'middle');
 b+=line(140,Y(80),230,Y(80))+circle(250,80,20,'A')+line(270,Y(80),300,Y(80))+line(300,Y(80),300,Y(220))+line(300,Y(220),320,Y(220));
 b+=line(140,Y(80),140,Y(143))+line(118,Y(143),162,Y(143),C.ink,3)+line(129,Y(157),151,Y(157),C.ink,3)+line(140,Y(157),140,Y(195))+txt(180,Y(155),'ℰ',C.ink,20);
 b+=rect(130,Y(195),20,40)+txt(169,Y(220),'r',C.ink,20)+line(140,Y(235),140,Y(300));
 b+=line(140,Y(80),70,Y(80))+line(70,Y(80),70,Y(170))+circle(70,190,20,'V')+line(70,Y(210),70,Y(300))+line(70,Y(300),140,Y(300));
 b+=rect(320,Y(208),180,24)+line(500,Y(220),530,Y(220))+txt(540,Y(226),'R',C.ink,20);
 b+=line(140,Y(300),215,Y(300))+dot(215,Y(300),C.ink)+line(215,Y(300),270,Y(300),C.ink,3)+dot(270,Y(300),C.ink)+txt(243,Y(330),'K замкнут',C.ink,18,'middle')+line(270,Y(300),400,Y(300));
 b+=arrow(400,Y(300),0,-67,C.ink)+arrow(412,Y(185),-55,0,C.blue)+txt(425,Y(184),'движок влево',C.blue,18);
 for(const v of [80,300])b+=dot(140,Y(v),C.ink);
 b+=txt(340,Y(367),'Рабочая часть: от левого вывода до движка',C.ink,18,'middle');
 return{body:b,h:397};
}
function lcPlot(kind,y){
 const current=kind==='current-charge',X=t=>95+t*59,Y=u=>y+190-u*110;
 let b=txt(340,y+25,current?'Ток и заряд: сдвиг на четверть периода':'Восстановленная зависимость U(t)',C.ink,22,'middle');
 b+=arrow(95,Y(0),510,0,C.ink)+arrow(95,Y(-1.2),0,-265,C.ink)+txt(604,Y(0)+28,'t, мкс',C.ink,17,'end');
 for(const t of [0,2,4,6,8])b+=line(X(t),Y(-1),X(t),Y(1),C.gray,1,'4 5')+txt(X(t),Y(-1)-12,String(t),C.ink,16,'middle');
 for(const u of [-1,1])b+=txt(83,Y(u)+5,current?String(u):String(4*u),C.ink,17,'end');
 const curve=(fn,c)=>`<path d="${Array.from({length:161},(_,j)=>{const t=j/20;return (j?'L':'M')+X(t)+' '+Y(fn(t))}).join(' ')}" fill="none" stroke="${c}" stroke-width="3"/>`;
 b+=curve(t=>Math.sin(Math.PI*t/4),C.blue);
 if(current){b+=curve(t=>-Math.cos(Math.PI*t/4),C.red)+txt(155,y+355,'I ÷ Iₘ',C.blue,19)+txt(380,y+355,'q ÷ Qₘ',C.red,19);b+=line(X(3),Y(-1),X(3),Y(1),C.green,2,'4 4')+dot(X(3),Y(Math.SQRT1_2),C.green)+txt(X(3),y+325,'t = 3',C.green,18,'middle');}
 else{b+=txt(82,y+48,'U, В',C.ink,18,'end');for(let t=0;t<=8;t++)b+=dot(X(t),Y(Math.sin(Math.PI*t/4)),C.red);b+=txt(340,y+355,'Точки таблицы; T = 8 мкс',C.ink,19,'middle');}
 return{body:b,h:385};
}
function diodeEquivalent(y){
 let b=txt(340,y+25,'Эквивалентные цепи: идеальные диоды',C.ink,22,'middle');
 for(const [i,caption]of ['B: плюс; C: минус','B: минус; C: плюс'].entries()){
  const Y=y+70+i*240,mid=Y+85;
  b+=txt(340,Y,caption,C.ink,21,'middle')+line(90,mid,270,mid)+line(270,Y+45,270,Y+125)+line(270,Y+45,360,Y+45)+rect(360,Y+33,70,24)+line(430,Y+45,565,Y+45)+line(270,Y+125,360,Y+125)+rect(360,Y+113,70,24)+line(430,Y+125,480,Y+125)+`<circle cx="500" cy="${Y+125}" r="20" fill="white" stroke="${C.ink}" stroke-width="2"/>`+txt(500,Y+132,'A',C.ink,20,'middle')+line(520,Y+125,565,Y+125)+line(565,Y+45,565,Y+125)+line(565,mid,605,mid);
  if(!i)b+=rect(160,mid-12,70,24)+txt(195,mid-23,'R',C.ink,19,'middle');
  b+=dot(90,mid)+dot(605,mid)+dot(270,mid)+dot(565,mid)+txt(72,mid+7,'B',C.ink,20,'end')+txt(620,mid+7,'C',C.ink,20)+txt(395,Y+20,'R',C.ink,19,'middle')+txt(395,Y+158,'R',C.ink,19,'middle');
  b+=arrow(i?552:460,Y+168,i?-85:85,0,C.red)+txt(340,Y+207,i?'I_A = 6 А влево; левый R закорочен':'I_A = 2 А вправо; левый R последователен',C.ink,18,'middle');
 }
 return{body:b,h:550};
}
function switchPhoto(y){
 const Y=v=>y+v;
 let b=txt(340,Y(25),'Принципиальная схема по фотографии',C.ink,22,'middle');
 b+=line(165,Y(70),360,Y(70))+`<circle cx="380" cy="${Y(70)}" r="20" fill="white" stroke="${C.ink}" stroke-width="2"/>`+txt(380,Y(77),'A',C.ink,20,'middle')+line(400,Y(70),560,Y(70))+line(560,Y(70),560,Y(300));
 b+=line(165,Y(70),165,Y(150))+line(143,Y(150),187,Y(150),C.ink,3)+line(155,Y(165),175,Y(165),C.ink,3)+line(165,Y(165),165,Y(190))+rect(155,Y(190),20,45)+line(165,Y(235),165,Y(300))+txt(203,Y(160),'ℰ',C.ink,20)+txt(203,Y(221),'r',C.ink,20);
 b+=line(165,Y(70),80,Y(70))+line(80,Y(70),80,Y(165))+`<circle cx="80" cy="${Y(185)}" r="20" fill="white" stroke="${C.ink}" stroke-width="2"/>`+txt(80,Y(192),'V',C.ink,20,'middle')+line(80,Y(205),80,Y(300))+line(80,Y(300),230,Y(300));
 b+=rect(230,Y(288),80,24)+line(310,Y(300),425,Y(300))+rect(425,Y(288),80,24)+line(505,Y(300),560,Y(300))+txt(270,Y(340),'R₁ = 3 Ом',C.ink,19,'middle')+txt(465,Y(340),'R₂ = 2 Ом',C.ink,19,'middle');
 b+=line(200,Y(300),200,Y(240))+line(200,Y(240),240,Y(240))+dot(240,Y(240))+line(240,Y(240),290,Y(214))+dot(310,Y(240))+line(310,Y(240),340,Y(240))+line(340,Y(240),340,Y(300))+txt(276,Y(203),'K',C.ink,20,'middle');
 for(const [x,v]of [[165,70],[165,300],[200,300],[340,300]])b+=dot(x,Y(v),C.ink);
 return{body:b,h:375};
}
function inductionPlot(kind,y){
 const Y=y+255,X0=100,X1=340,X2=580;
 let b=txt(340,y+25,kind==='brightness'?'Яркость лампы в модели условия':'Плавное установление тока катушки',C.ink,22,'middle');
 b+=arrow(X0,Y,505,0,C.ink)+arrow(X0,Y+15,0,-205,C.ink)+txt(604,Y+29,'t',C.ink,20)+txt(78,y+68,kind==='brightness'?'J':'I, А',C.ink,20,'end');
 if(kind==='brightness'){
  b+=line(X0,y+110,X1,y+110,C.blue,4)+line(X1,Y,X2,Y,C.blue,4)+line(X1,y+80,X1,Y,C.gray,1,'5 5')+txt(85,y+117,'J₀',C.ink,20,'end')+txt(X1,Y+30,'t₀',C.ink,20,'middle');
  for(const z of [y+110,Y])b+=`<circle cx="${X1}" cy="${z}" r="5" fill="white" stroke="${C.blue}" stroke-width="2"/>`;
  b+=txt(340,Y+68,'Значение в точке излома отдельно не задано',C.ink,18,'middle');
 }else{
  const I=v=>Y-v*27;
  for(const v of [3,6])b+=line(X0,I(v),X2,I(v),C.gray,1,'5 5')+txt(83,I(v)+6,String(v),C.ink,20,'end');
  b+=`<path d="${Array.from({length:101},(_,j)=>(j?'L':'M')+(X0+j*4.8)+' '+I(6-3*Math.exp(-j/23))).join(' ')}" fill="none" stroke="${C.blue}" stroke-width="3"/>`+dot(X0,I(3),C.blue)+txt(340,Y+65,'Время показано без масштаба; предел — 6 А',C.ink,18,'middle');
 }
 return{body:b,h:350};
}
function diagram(id,r){
 const item=catalog.find(t=>t.id===id);let b='',y=75;
 if(r.opticsScene){const p=opticsDiagram(id,r,item,y);b+=p.body;y+=p.h;}
 else if(r.railScene){const p=railDiagram(id,r.railScene,item,y);b+=p.body;y+=p.h;}
 else if(r.frameScene){const p=frameDiagram(id,r.frameScene,item,y);b+=p.body;y+=p.h;}
 else if(r.mechanicsScene){const p=mechanicsDiagram(id,r.mechanicsScene,item,y);b+=p.body;y+=p.h;}
 else if(r.inductionScene){const p=inductionDiagram(id,r.inductionScene,item,y);b+=p.body;y+=p.h;}
 else if(r.magScene){const p=magneticDiagram(id,r.magScene,item,y);b+=p.body;y+=p.h;}
 else if(r.electroScene){const p=electroDiagram(id,r.electroScene,item,y);b+=p.body;y+=p.h;}
 else if(r.fieldScene){const p=fieldDiagram(id,r.fieldScene,item,y);b+=p.body;y+=p.h;}
 else if(item.images.length){b+=txt(340,y,'Исходный рисунок ФИПИ',C.ink,22,'middle');y+=25;
  for(const file of item.images){const p=original(file,70,y,540,310);b+=p.body;
   if(id==='37DF77'){const x=p.X(91.5/187),v=p.Y(72/130);b+=force(x,v,0,-60,C.blue,'F_Л',[15,-2,'start'])+force(x,v,0,60,C.red,'F_э',[15,5,'start'])+txt(x-15,v+5,'+e',C.ink,18,'end');}
   if(r.coilArrows){b+=arrow(p.X(.13),p.Y(.38),p.w*.18,0,C.blue,'B_A',[0,-13,'middle'])+arrow(p.X(.85),p.Y(.38),-p.w*.18,0,C.red,'B_Б',[0,-13,'middle']);b+=arrow(p.X(.71),p.Y(.87),p.w*.20,0,C.green,'I',[12,0,'start']);}
   y+=p.h+30;}
 }
 if(r.lcGraph){const p=lcPlot(r.lcGraph,y);b+=p.body;y+=p.h;}
 if(r.dcSchematic){const p=dcSchematic(y);b+=p.body;y+=p.h;}
 if(r.diodeEquivalent){const p=diodeEquivalent(y);b+=p.body;y+=p.h;}
 if(r.switchPhoto){const p=switchPhoto(y);b+=p.body;y+=p.h;}
 if(r.brightnessGraph||r.rlGraph){const p=inductionPlot(r.brightnessGraph?'brightness':'current',y);b+=p.body;y+=p.h;}
 const c=cards(r.stages,y);b+=c.body;
 // Greek subscripts are scoped to this new set; old published SVGs stay byte-identical.
 return svg(id,'Электродинамика',r.diagramCaption,b,c.end+15).replace(/(<text\b[^>]*>)([\s\S]*?)(<\/text>)/g,(_,a,t,z)=>a+t.replace(/_([α-ωΑ-Ω]+)/g,'<tspan baseline-shift="sub" font-size="70%">$1</tspan>')+z);
}
const diagrams=Object.fromEntries(Object.entries(records).map(([id,r])=>[id,diagram(id,r)]));
module.exports={diagrams};
