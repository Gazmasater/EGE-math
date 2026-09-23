const {C,txt,line,dot,arrow,force,original}=require('../lib/physics-svg');
function magneticDiagram(id,kind,item,y){
 let b=txt(340,y+15,'Геометрия, поля и действующие силы',C.ink,22,'middle'),h=460;
 if(kind.startsWith('three-wires')){
  const opposite=kind.endsWith('opposite');let at=y+45;
  for(let j=0;j<item.images.length;j++){
   const p=original(item.images[j],j?220:145,at,j?330:400,j?280:210);b+=p.body;
   if(j){const x=p.X(opposite?86/175:94/189),v=p.Y(opposite?20/151:21/165);
    b+=arrow(x,v,opposite?75:-75,opposite?-43:43,C.blue,'B₂',opposite?[10,0,'start']:[-10,20,'end']);
    b+=arrow(x,v,-75,-43,C.green,'B₃',[-10,-5,'end']);
    b+=arrow(x,v,opposite?0:-135,opposite?-95:0,C.purple,'B',[-10,-10,'end']);
    b+=force(x,v,opposite?-125:0,opposite?0:100,C.red,'F',opposite?[-5,25,'end']:[15,0,'start']);
   }
   at+=p.h+(j?25:125);
  }
  b+=txt(340,at+20,opposite?'B вверх; сила на проводник 1 влево':'B влево; сила на проводник 1 вниз',C.ink,20,'middle');h=at-y+60;
 }else if(item.images.length){
  const p=original(item.images[0],kind==='magnetic-strip'?225:120,y+60,440,310),X=p.X,Y=p.Y;b+=p.body;h=p.h+200;
  if(kind.startsWith('crossed')){
   const x=X(id==='FCBBA3'?58/126:61/131),v=Y(id==='B5C430'?109/157:id==='FCBBA3'?108/143:109/144),left=kind.endsWith('left');
   b+=force(x,v,left?55:95,0,C.blue,'F_э',[0,47,'middle'])+force(x,v,left?-95:-55,0,C.red,'F_Л',[0,47,'middle']);
   b+=arrow(560,y+240,65,0,C.ink,'x')+arrow(560,y+240,0,-75,C.ink,'y');
   b+=txt(340,y+h-60,left?'После изменения F_Л > F_э':'После изменения F_э > F_Л',C.ink,20,'middle');
  }else if(kind==='ion-entry'){
   const x=X(id==='59DF22'?158/244:169/253),v=Y(42/(id==='59DF22'?110:111));
   b+=force(x,v,0,90,C.red,'F_Л',[14,2,'start'])+arrow(530,y+220,60,0,C.ink,'τ')+arrow(530,y+220,0,80,C.ink,'n');
   b+=txt(340,y+h-55,'При входе: скорость вправо, магнитная сила вниз',C.ink,18,'middle');
  }else if(kind==='magnetic-strip'){
   const x=X(57/141),v=Y(78/177),r=p.w*(82/141);
   b+=`<path d="M${x} ${v} A${r} ${r} 0 0 1 ${x+r} ${v+r}" fill="none" stroke="${C.green}" stroke-width="3"/>`;
   b+=force(x,v,0,60,C.red,'F_Л',[-12,0,'end'])+dot(x,v+r,C.green)+line(x,v+r,x+r,v+r,C.green,2,'4 4');
   b+=txt(x+r*.5,v+r-12,'R = h',C.green,20,'middle')+arrow(555,y+170,60,0,C.ink,'x')+arrow(555,y+170,0,75,C.ink,'y');
   h=Math.max(h,v+r-y+100);b+=txt(340,y+h-35,'Граничная дуга касается дальней границы',C.ink,18,'middle');
  }else throw Error('Unknown original magnetic scene '+kind);
 }else{
  const negative=kind==='circle-negative',x=320,v=y+(negative?260:130),sgn=negative?-1:1;
  for(const xx of [190,460,530])for(const yy of [y+95,y+210,y+320])b+=`<circle cx="${xx}" cy="${yy}" r="8" fill="white" stroke="${C.gray}" stroke-width="1.5"/>`+dot(xx,yy,C.gray);
  b+=txt(540,y+70,'B к нам',C.ink,19,'end');
  b+=`<path d="M${x} ${v} A100 100 0 0 ${negative?0:1} ${x} ${v+sgn*200}" fill="none" stroke="${C.green}" stroke-width="3"/>`;
  b+=dot(x,v,C.ink)+force(x,v,0,sgn*90,C.red,'F_Л',[-15,0,'end'])+arrow(x,v,110,0,C.blue,'υ',[0,-15,'middle']);
  if(kind==='adiabatic-circle')b+=force(x,v,70,0,C.purple,'F_и',[-40,35,'end']);
  b+=line(x,v,x,v+sgn*100,C.gray,1,'4 4')+dot(x,v+sgn*100,C.green)+txt(x-16,v+sgn*55,'R',C.ink,19,'end');
  b+=arrow(150,y+270,55,0,C.ink,'τ')+arrow(150,y+270,0,sgn*60,C.ink,'n');
  b+=txt(340,y+400,kind==='adiabatic-circle'?'F_и ускоряет; F_Л искривляет траекторию':negative?'Электрон: сила против направления для q > 0':'Показан положительный заряд; сила к центру',C.ink,18,'middle');
 }
 return{body:b,h};
}
module.exports={magneticDiagram};
