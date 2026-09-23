const {C,txt,line,dot,arrow,force,original}=require('../lib/physics-svg');
function inductionDiagram(id,kind,item,y){
 let b=txt(340,y+15,'Исходная схема и направления',C.ink,22,'middle'),h=500;
 const p=original(item.images[0],kind==='coil-ring'?230:kind==='rotation-charge'?160:80,y+(kind==='magnetic-frame'?100:60),520,kind==='coil-ring'?390:310),X=p.X,Y=p.Y;b+=p.body;
 // The second image in 67E72E is the inline velocity symbol, not another setup.
 for(const file of item.images.slice(1)){const s=original(file,600,y+62,38,40);b+=s.body;}
 if(kind.startsWith('diode-')){
  const away=kind.endsWith('away'),x=X((away?31:82)/291),v=Y((away?100:118)/190);
  b+=arrow(x,v,0,away?25:-25,C.red,away?'I₁':'I₂',[away?-25:20,0,away?'end':'start']);
  b+=arrow(X(.51),Y(.83),away?-80:80,0,C.blue,'B_и',[0,25,'middle']);
  b+=txt(340,y+440,away?'Через лампу 1: A → Б, сверху вниз':'Через лампу 2: Б → A, снизу вверх',C.ink,20,'middle');
 }else if(kind==='wire-loop'){
  const x=X(45.5/107),u=X(101.5/107),v=Y(78/136);
  b+=force(x,v,65,0,C.red,'F_б',[0,-16,'middle'])+force(u,v,-30,0,C.blue,'F_д',[0,30,'middle']);
  b+=arrow(x,Y(100/136),0,-52,C.green,'I',[-14,-2,'end'])+arrow(u,Y(70/136),0,52,C.green,'I',[12,0,'start']);
  b+=arrow(470,y+395,85,0,C.ink,'x')+txt(340,y+458,'Показаны силы со стороны прямого провода',C.ink,18,'middle');
 }else if(kind==='coil-ring'){
  const x=X(27/175),v=Y(113/274);
  b+=force(x,v,-80,0,C.red,'F_A',[-8,-15,'end'])+force(x,v,0,70,C.blue,'mg',[15,0,'start']);
  b+=force(X(17/175),Y(74/274),-8,-70,C.green,'T₁',[-12,0,'end'])+force(X(34/175),Y(74/274),9,-70,C.green,'T₂',[12,0,'start']);
  b+=arrow(535,y+390,-65,0,C.ink,'x',[-10,0,'end'])+arrow(535,y+390,0,-65,C.ink,'y');
  b+=txt(340,y+488,'Движок вверх: ток катушки возрастает, кольцо влево',C.ink,18,'middle');h=535;
 }else if(kind==='moving-emf'){
  const x=X(101/159),v=Y(78/137);
  b+=force(x,v,-95,0,C.red,'F_A',[0,28,'middle'])+force(x,v,80,0,C.blue,'F_внеш',[0,30,'middle']);
  b+=txt(340,y+440,'Постоянная скорость: F_внеш = F_A; B от наблюдателя',C.ink,18,'middle');
 }else if(kind==='magnetic-frame'){
  b+=force(X(145/238),Y(38/125),0,-65,C.red,'F_б',[-35,-15,'end'])+force(X(197/238),Y(38/125),0,70,C.blue,'F_д',[35,-15,'start']);
  b+=force(X(171/238),Y(38/125),0,80,C.gray,'mg',[-12,8,'end'])+arrow(545,y+100,0,-50,C.ink,'y');
  b+=txt(340,y+435,'Ближняя сторона вверх, дальняя вниз',C.ink,20,'middle')+txt(340,y+470,'Тяжесть приложена на оси: её момент равен нулю',C.ink,18,'middle');h=510;
 }else if(kind==='rotation-charge'){
  for(const[x,c,into]of [[X(17/119),C.red,true],[X(101/119),C.blue,false]]){const v=Y(63/132);b+=`<circle cx="${x}" cy="${v}" r="11" fill="white" stroke="${c}" stroke-width="2"/>`+(into?line(x-6,v-6,x+6,v+6,c,2)+line(x-6,v+6,x+6,v-6,c,2):dot(x,v,c))+txt(x+(into?-17:17),v-15,into?'F_A внутрь':'F_A к нам',c,18,into?'end':'start');}
  b+=txt(340,y+420,'Поток за поворот: 0 → BS → 0',C.ink,20,'middle')+txt(340,y+455,'Ток меняет знак после 90°',C.ink,20,'middle');
 }else throw Error('Unknown induction diagram '+kind);
 return{body:b,h};
}
module.exports={inductionDiagram};
