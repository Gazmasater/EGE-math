const {C,txt,line,rect,dot,arrow,original,cards,svg}=require('../lib/physics-svg');
const {records}=require('./quantum-solutions');
const catalog=require('./quantum-catalog.json');
const diagrams={};
const atomIds=new Set(Object.keys(require('./quantum-atoms').records));
const stopIds=new Set(['19794E','3F1F2B','3926A9','3E43EA','BD8A11','DD17C6']);
const crossIds=new Set(['3CE1A2','45ECE8','B387DC','F4B3A9']);
function energy(){return {body:txt(38,80,'Баланс энергии одного фотона',C.ink,20)+rect(55,110,220,66,'#edf4ff')+txt(165,152,'ε = hν',C.blue,24,'middle')+arrow(295,143,60,0,C.ink)+rect(375,105,245,42,'#fff5e8')+txt(497,134,'Работа выхода A',C.red,20,'middle')+rect(375,165,245,42,'#ecf8f1')+txt(497,194,'Энергия электрона K',C.green,19,'middle')+txt(60,246,'ε = A + K; на красной границе K = 0',C.ink,20),end:276};}
function electric(accelerating=false,capacitor=false,voltage=false){
 let b=txt(34,77,accelerating?'Поле ускоряет электрон от пластины':'Поле тормозит электрон',C.ink,20);
 b+=rect(65,106,13,125,'#dce8f3')+txt(72,254,'Катод',C.ink,17,'middle');
 if(capacitor||voltage)b+=rect(560,106,13,125,'#dce8f3')+txt(567,254,'Анод −',C.ink,17,'middle')+txt(80,95,'+',C.red,22);
 b+=`<circle cx="285" cy="164" r="10" fill="#edf4ff" stroke="${C.ink}"/>`+txt(285,170,'−',C.ink,17,'middle');
 b+=arrow(285,153,115,0,C.blue,'v₀',[8,-12,'start']);
 b+=arrow(285,177,accelerating?135:-135,0,C.red,'F_эл',[0,28,'middle']);
 b+=arrow(accelerating?420:145,237,accelerating?-160:160,0,C.green,'E',[0,28,'middle']);
 b+=arrow(87,293,510,0,C.gray,'x',[8,5,'start'])+txt(90,317,'0',C.ink,16)+txt(340,332,voltage?'K = eU_з':capacitor?'K₀ = eQ ÷ C':accelerating?'K = K₀ + eEL':'K₀ = eEd',C.ink,21,'middle');
 return{body:b,end:359};
}
function magnetic(){let b=txt(36,78,'Магнитная сила меняет направление скорости',C.ink,19)+`<circle cx="335" cy="190" r="94" fill="none" stroke="${C.gray}" stroke-width="2"/>`;
 b+=line(335,190,429,190,C.gray,2,'5 4')+dot(335,190)+txt(377,218,'R',C.ink,19)+txt(335,151,'⊙ B',C.purple,24,'middle');
 b+=`<circle cx="429" cy="190" r="9" fill="#edf4ff" stroke="${C.ink}"/>`+txt(429,196,'−',C.ink,17,'middle');
 b+=arrow(429,180,0,-85,C.blue,'v',[15,0,'start'])+arrow(417,190,-65,0,C.red,'F_Л',[-15,39,'middle'])+txt(40,324,'B направлена к читателю; F_Л — к центру',C.ink,20);
 return{body:b,end:354};}
function levels(id){
 if(id==='FCD901')return {body:txt(34,77,'Захват движущегося электрона на уровень n = 2',C.ink,19)+
  line(60,125,390,125,C.blue,2)+txt(410,131,'K₀ > 0',C.blue,20)+
  line(60,185,390,185,C.gray,2,'5 4')+txt(410,191,'0: свободные частицы',C.ink,18)+
  line(60,270,390,270,C.gray,2)+txt(410,276,'E₂ = −3,4 эВ',C.ink,19)+
  line(60,352,390,352,C.gray,2)+txt(410,358,'E₁ = −13,6 эВ',C.ink,19)+
  arrow(220,132,0,128,C.purple,'hν',[20,-48,'start'])+
  txt(48,397,'hν = K₀ − E₂: энергия движения + энергия связи',C.ink,19),end:425};
 let b=txt(34,77,'Энергетические уровни атома водорода',C.ink,20);
 for(const[y,label]of [[108,'0: свободные частицы'],[153,'n = 3'],[203,'n = 2; −3,4 эВ'],[313,'n = 1; −13,6 эВ']])b+=line(60,y,393,y,C.gray,2,y===108?'5 4':'')+txt(412,y+6,label,C.ink,18);
 if(id==='FCD901'){b+=arrow(220,112,0,80,C.purple,'hν',[15,-22,'start'])+txt(54,355,'До захвата: K₀ > 0; hν = K₀ − E₂',C.ink,20);}
 else {b+=arrow(180,208,0,94,C.blue,'10,2 эВ',[16,-38,'start']);if(id==='0D14B6')b+=arrow(325,158,0,34,C.red,'3 → 2',[-15,-55,'middle']);if(id==='BF110A')b+=arrow(326,112,0,80,C.red,'∞ → 2',[-70,-55,'middle']);b+=txt(55,355,id==='0D14B6'?'Максимальная λ — минимальная энергия':id==='BF110A'?'Максимальная частота Бальмера — предел серии':'Испущенный фотон вызывает фотоэффект',C.ink,19);}
 return{body:b,end:382};
}
function cross(id,file){
 const wide=['45ECE8','F4B3A9'].includes(id),im=original(file,165,95,wide?350:300,235);
 const x=im.X(wide?112/208:71/136),y=im.Y(wide?122/144:79/91),isWest=id==='F4B3A9';
 let b=im.body;
 // Arrows start on the particle rim. The original E arrow and raster labels
 // remain unobscured, including the origin label below the electron.
 const radius=wide?13:18;
 b+=arrow(x+radius,y,isWest?145:190,0,C.red,'F_эл',[0,27,'middle']);
 b+=arrow(x-radius/2,y+radius*.87,isWest?-190:-150,0,C.green,'F_Л',[0,27,'middle']);
 b+=txt(40,365,'F_эл: восток (−Oy); F_Л: запад (+Oy)',C.ink,20)+txt(40,397,isWest?'Требуется: F_Л > F_эл':'Требуется: F_эл > F_Л',C.ink,20);
 return{body:b,end:425};
}
function originals(t){
 let b='',y=78;
 if(t.id==='871B1A'){
  const one=original(t.images[0],55,y,185,210);b+=one.body+txt(276,120,'Отрицательный заряд',C.ink,20)+txt(276,157,'Фотоэффект при λ < 290 нм',C.blue,20);y=320;
  for(const[i,file]of t.images.slice(1).entries()){let im=original(file,30+i*330,y,300,295);b+=im.body;}y+=320;
 }else if(['00B1EF','4DE913'].includes(t.id)){
  for(const[i,file]of t.images.entries()){const im=original(file,35+i*330,y,285,230);b+=im.body;}
  y=342;b+=txt(34,y,'После увеличения частоты (только границы):',C.ink,19);y+=36;
  b+=arrow(45,y+100,570,0,C.gray,'U',[8,5,'start'])+arrow(285,y+120,0,-125,C.gray,'I',[10,3,'start']);
  b+=line(370,y+5,595,y+5,C.blue,3)+txt(598,y+10,'1',C.blue,18);
  b+=line(370,y+49,595,y+49,C.red,3)+txt(598,y+54,'2',C.red,18);
  b+=dot(205,y+100,C.blue)+dot(120,y+100,C.red)+txt(197,y+126,'U_з,1',C.blue,17,'middle')+txt(108,y+126,'U_з,2',C.red,17,'middle')+txt(292,y+122,'0',C.ink,17);
  b+=txt(40,y+168,'1 — до; 2 — после. Промежуточная форма не задана.',C.ink,18);y+=200;
 }else{
  const im=original(t.images[0],65,y,545,245);b+=im.body;y+=im.h+34;
  if(['6C6442','83BB19'].includes(t.id)){b+=txt(45,y+10,'Считываем плато исходного графика: I_нас = 2 мА',C.blue,20);y+=44;}
 }
 return{body:b,end:y};
}
function radiation(id){
 if(id==='4EABE9')return {body:txt(36,80,'От потребляемой мощности к энергии фотона',C.ink,20)+
  rect(45,119,210,95,'#edf4ff')+txt(150,156,'Лампа: P = 60 Вт',C.blue,20,'middle')+txt(150,189,'КПД η = 6%',C.blue,20,'middle')+
  arrow(270,167,72,0,C.ink)+rect(361,119,278,95,'#ecf8f1')+txt(500,156,'Свет: P_св = ηP',C.green,20,'middle')+txt(500,189,'P_св = 3,6 Вт',C.green,20,'middle')+
  txt(50,277,'ε_ср = P_св ÷ ṅ;   λ = hc ÷ ε_ср',C.ink,22),end:325};
 let b='';
 if(['6D6EAB','EBB156'].includes(id)){
  const nuclear=id==='EBB156';b+=txt(38,82,'Закон сохранения импульса: сумма равна нулю',C.ink,20)+dot(340,166,C.purple)+arrow(330,166,-205,0,C.red,nuclear?'p_He':'p_ат',[0,-17,'middle'])+arrow(350,166,205,0,C.blue,nuclear?'p_пр':'p_ф',[0,-17,'middle'])+txt(340,225,nuclear?'K_He = K_пр ÷ 4':'K = p_ат² ÷ (2M)',C.ink,22,'middle')+txt(340,270,nuclear?'Q = K_пр + K_He':'p_ат = p_ф = ε ÷ c',C.ink,22,'middle');
 }else if(['968C16','2F6B86'].includes(id)){
  b+=rect(420,90,18,175,'#e6edf4')+arrow(95,125,310,0,C.blue,'Падающий свет',[-155,-22,'middle'])+arrow(410,194,-280,0,C.red,'Отражённый свет',[110,35,'middle']);
  if(id==='2F6B86')b+=arrow(450,247,150,0,C.green,'30% проходят',[-60,34,'middle'])+txt(87,266,'70% отражаются',C.red,18);
  else b+=txt(462,160,'Зеркало',C.ink,19);
  b+=txt(46,320,'Отражение передаёт поверхности удвоенный импульс',C.ink,19);
 }else if(id==='179F0F'){
  b+=txt(40,88,'Одинаковые модули импульса — разные энергии',C.ink,19)+arrow(100,150,390,0,C.blue,'p_ф = h ÷ λ',[-120,-18,'middle'])+arrow(100,236,390,0,C.red,'pₑ = √(2mₑK)',[-120,-18,'middle'])+txt(340,303,'p_ф = pₑ',C.ink,23,'middle');
 }else if(id==='5765F0'){
  b+=dot(150,180,C.red)+txt(150,139,'Источник',C.red,19,'middle')+`<path d="M265 66A180 180 0 0 1 265 294" fill="none" stroke="${C.gray}" stroke-width="2" stroke-dasharray="6 5"/>`+rect(525,140,8,80)+arrow(160,180,350,0,C.blue,'R = 6 м',[-170,-20,'middle'])+txt(505,110,'S = 8 мм²',C.ink,19,'middle')+txt(45,334,'Доля мощности на площадке: S ÷ (4πR²)',C.ink,20);
 }else if(id==='A087CE'){
  b+=rect(60,110,220,105,'#edf4ff')+txt(170,148,'Раствор V₀',C.blue,21,'middle')+txt(170,184,'Начало: a₀V₀',C.ink,20,'middle')+arrow(294,163,71,0,C.ink)+rect(380,110,235,105,'#ecf8f1')+txt(497,148,'Кровь V = 6 л',C.green,21,'middle')+txt(497,184,'Через t: aV',C.ink,20,'middle')+txt(45,276,'aV = a₀V₀·2⁻ˣ; x = t ÷ T',C.ink,22);
 }else{
  const heat=['002D3A','B8794C'].includes(id);b+=txt(40,82,heat?'Излучение полностью поглощается веществом':'Энергия потока складывается из энергий фотонов',C.ink,19)+rect(50,118,185,85,'#edf4ff')+txt(142,155,'N фотонов',C.blue,22,'middle')+txt(142,183,'ε = hc ÷ λ',C.blue,18,'middle')+arrow(250,160,105,0,C.blue)+rect(373,118,250,85,'#ecf8f1')+txt(498,153,heat?'Теплота Q = Nε':'Энергия W = Nε',C.green,21,'middle')+txt(498,184,heat?(id==='B8794C'?'Плавление + нагрев':'Нагрев воды'):'Мощность P = W ÷ t',C.ink,18,'middle')+txt(40,264,id==='4EABE9'?'В свет переходит только доля η потребляемой энергии':'Сначала энергия одного фотона, затем всего потока',C.ink,19);
 }
 return{body:b,end:361};
}
for(const[id,r]of Object.entries(records)){
 const t=catalog.find(t=>t.id===id);let fig;
 if(crossIds.has(id))fig=cross(id,t.images[0]);
 else if(t.images.length)fig=originals(t);
 else if(atomIds.has(id))fig=levels(id);
 else if(id==='DD17C6')fig=electric(false,false,true);
 else if(stopIds.has(id))fig=electric();
 else if(['6F2B31','95DAA2'].includes(id))fig=electric(true);
 else if(id==='3ECAE5')fig=electric(false,true);
 else if(['5BD390','D4025B'].includes(id))fig=magnetic();
 else if(Object.hasOwn(require('./quantum-photoelectric').records,id))fig=energy();
 else fig=radiation(id);
 const flow=cards(r.stages,fig.end);
 diagrams[id]=svg(id,'Квантовая физика',r.diagramCaption,fig.body+flow.body,flow.end+10);
}
module.exports={diagrams};
