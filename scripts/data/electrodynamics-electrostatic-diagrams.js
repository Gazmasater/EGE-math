const {C,txt,line,rect,dot,arrow,force,original}=require('../lib/physics-svg');
function electroDiagram(id,kind,item,y){
 let b='',h=440;
 if(kind==='cavity'){
  const p=original(item.images[0],165,y+85,350,350);b+=p.body;
  b+=txt(340,y+15,'Поле в трёх областях: по восемь линий',C.ink,22,'middle');
  const cx=p.X(84/169),cy=p.Y(84/169),qx=p.X(84/169),qy=p.Y(112/169);
  for(let j=0;j<8;j++){
   const a=(j+.5)*Math.PI/4,dx=Math.cos(a),dy=Math.sin(a);
   b+=arrow(qx+22*dx,qy+22*dy,58*dx,58*dy,C.blue);
   b+=arrow(cx+177*dx,cy+177*dy,63*dx,63*dy,C.red);
  }
  b+=txt(340,p.Y(.30),'E = 0',C.ink,25,'middle')+txt(340,y+515,'Синее: центр полости; красное: центр шара',C.ink,19,'middle');h=555;
 }else if(kind==='square-charges'){
  b+=txt(340,y+10,'Сложение четырёх напряжённостей в центре',C.ink,22,'middle');
  b+=rect(190,y+70,280,280,'white');
  for(const[x,v,s]of [[190,70,'+q'],[470,70,'−q'],[190,350,'−q'],[470,350,'−q']])b+=dot(x,y+v,C.ink)+txt(x+(x===190?-15:15),y+v,s,C.ink,23,x===190?'end':'start');
  const x=330,v=y+210;b+=dot(x,v,C.ink);
  b+=arrow(x,v,70,-70,C.gray,'E₀',[10,-5,'start'])+arrow(x,v,-70,70,C.gray,'E₀',[-10,15,'end']);
  b+=arrow(x,v,95,95,C.blue,'E = 2E₀',[15,0,'start']);
  b+=txt(340,y+395,'Серые векторы компенсируются; синий — сумма',C.ink,18,'middle');
 }else{
  b+=txt(340,y+15,'Исходная геометрия и действующие силы',C.ink,22,'middle');
  const p=original(item.images[0],145,y+55,440,310),X=p.X,Y=p.Y;b+=p.body;h=p.h+180;
  if(kind==='shuttle-horizontal'){
   const cylinder=id==='35E8E5',x=X(cylinder?43/124:51/114),v=Y(cylinder?83/168:90/155);
   b+=force(x,v,95,0,C.blue,'F_э',[10,-13,'start'])+force(x,v,0,70,C.red,'mg',[-14,5,'end'])+force(x,v,0,-100,C.green,'T',[13,-5,'start']);
   b+=arrow(530,y+245,65,0,C.ink,'x')+arrow(530,y+245,0,-75,C.ink,'y');
   b+=txt(340,y+h-50,'Показан этап q > 0 после контакта с левой пластиной',C.ink,18,'middle');
  }else if(kind==='shuttle-vertical'){
   const x=X(36/115),v=Y(80/150);
   b+=force(x,v,0,-95,C.blue,'F_э',[14,-5,'start'])+force(x,v,0,70,C.red,'mg',[14,10,'start'])+arrow(540,y+260,0,-115,C.ink,'y');
   b+=txt(340,y+h-55,'Начало отрыва: q < 0; реакция N = 0',C.ink,19,'middle');
  }else if(kind==='curved-selector'){
   const x=X(id==='41974A'?43/259:38/250),v=Y(id==='41974A'?94/169:86/(id==='F430DC'?155:154));
   b+=force(x,v,65,-57,C.blue,'F_э',[12,-4,'start']);
   b+=arrow(480,y+205,50,-50,C.ink,'n')+arrow(480,y+205,-50,-50,C.ink,'τ',[-12,0,'end']);
   b+=txt(340,y+h-55,'Сила к центру кривизны, скорость по касательной',C.ink,18,'middle');
  }else throw Error('Unknown electrostatic diagram '+kind);
 }
 return{body:b,h};
}
module.exports={electroDiagram};
