const {C,txt,line,rect,dot,arrow,force,original}=require('../lib/physics-svg');
const ball=(x,y,s='q')=>`<circle cx="${x}" cy="${y}" r="9" fill="#dce8f5" stroke="${C.ink}" stroke-width="2"/>`+txt(x+15,y-13,s,C.ink,19);
function fieldDiagram(id,kind,item,y){
 let b=txt(340,y+10,item.images.length?'Исходная геометрия и действующие силы':'Силы и выбранные направления',C.ink,22,'middle'),end=y+400;
 if(item.images.length){
  const p=original(item.images[0],70,y+35,540,310),X=p.X,Y=p.Y;b+=p.body;end=y+35+p.h+105;
  const updown=(x,v,up=65,down=65)=>force(X(x),Y(v),0,down,C.red,'mg',[-15,8,'end'])+force(X(x),Y(v),0,-up,C.blue,'F_э',[15,-3,'start']);
  if(kind==='drop-balance')b+=updown(81/170,67/162,60,60)+arrow(555,y+200,0,-100,C.ink,'y')+txt(340,end-25,'F_э вверх, хотя E направлено вниз: q < 0',C.ink,18,'middle');
  else if(kind.startsWith('transverse-')){
   const negative=kind.endsWith('negative'),x=X(.163),v=Y(.5),dy=negative?-68:68;
   b+=force(x,v,0,dy,C.blue,'F_э',[16,0,'start'])+arrow(540,y+150,65,0,C.ink,'x',[0,22,'middle'])+arrow(540,y+150,0,negative?-65:65,C.ink,'y',[12,0,'start']);
   b+=txt(340,end-35,negative?'Знак на рисунке: минус; при q > 0 отклонение вниз':'Положительный протон отклоняется вниз',C.ink,18,'middle');
  }else if(kind==='inclined-beads'){
   const x=X(154/228),v=Y(37/134);
   b+=force(x,v,0,85,C.red,'mg')+force(x,v,73,-49,C.blue,'F_к',[10,0,'start'])+force(x,v,-43,-64,C.green,'N',[-8,-6,'end']);
   b+=arrow(175,end-57,65,-44,C.ink,'x')+arrow(175,end-57,-38,-57,C.ink,'y');
  }else if(kind==='horizontal-pendulum'){
   const x=X(65/187),v=Y(108/130);
   // Move only the q,m label away from the horizontal force; preserve all geometry.
   b+=`<rect x="${X(22/187)}" y="${Y(94/130)}" width="${p.w*39/187}" height="${p.h*22/130}" fill="white"/>`+txt(x-20,v-23,'q, m',C.ink,19,'end');
   b+=force(x,v,0,65,C.red,'mg')+force(x,v,-93,0,C.blue,'F_э',[-4,24,'middle'])+force(x,v,42,-70,C.green,'T',[14,-4,'start']);
   b+=arrow(510,end-43,-50,-30,C.ink,'τ',[-8,-4,'end'])+arrow(510,end-43,30,-50,C.ink,'n');
  }else if(kind==='dust-down')b+=updown(57/183,33/66,28,58)+arrow(600,y+130,0,100,C.ink,'y',[13,0,'start'])+txt(340,end-28,'Показаны силы до раздвигания: F_э = mg ÷ 2',C.ink,18,'middle');
  else if(kind==='rheostat-dust')b+=updown(42/212,58/94,38,57)+arrow(590,y+130,0,95,C.ink,'y',[13,0,'start'])+txt(340,end-28,'После сдвига вправо F_э уменьшается; mg неизменно',C.ink,18,'middle');
  else if(kind==='two-charges'){
   const v=Y(77/96),x=X(19/113),u=X(80/113);
   b+=force(x,v,-63,0,C.blue,'|Q|E',[0,-17,'middle'])+force(x,v,65,0,C.green,'F_к',[0,28,'middle']);
   b+=force(u,v,-63,0,C.green,'F_к',[0,28,'middle'])+force(u,v,85,0,C.blue,'qE',[0,-17,'middle']);
   b+=arrow(500,end-48,85,0,C.ink,'x');
  }else throw Error('Missing field overlay: '+id+' '+kind);
 }else{
  const Y=v=>y+v;let x=330,v=Y(175);
  if(kind==='mercury'){
   b+=line(150,Y(65),490,Y(65),C.ink,4)+line(150,Y(290),490,Y(290),C.ink,4)+txt(140,Y(60),'−',C.ink,25)+txt(140,Y(295),'+',C.ink,25);
   b+=ball(x,v,'q > 0')+force(x,v,0,75,C.red,'mg',[-15,0,'end'])+force(x,v,0,-75,C.blue,'F_э')+arrow(150,Y(230),0,-90,C.purple,'E');
   b+=arrow(570,Y(225),0,-110,C.ink,'y');
  }else if(kind==='electron-stop'){
   b+=ball(x,v,'−e')+force(x,v,-110,0,C.blue,'F_э',[0,-16,'middle'])+arrow(x,v,115,0,C.green,'υ₀',[0,26,'middle']);
   b+=arrow(180,Y(80),260,0,C.purple,'E')+arrow(150,Y(300),380,0,C.ink,'x');
  }else if(kind==='drop-free'||kind==='vertical-plates'){
   if(kind==='vertical-plates')b+=line(160,Y(55),160,Y(330),C.ink,4)+line(510,Y(55),510,Y(330),C.ink,4)+txt(140,Y(160),'+',C.ink,24,'end')+txt(530,Y(160),'−',C.ink,24);
   b+=ball(x,v,kind==='vertical-plates'?'Q > 0':'q > 0')+force(x,v,95,0,C.blue,'F_э',[0,-18,'middle'])+force(x,v,0,105,C.red,kind==='vertical-plates'?'Mg':'mg');
   b+=arrow(250,Y(65),150,0,C.purple,'E')+arrow(555,Y(245),60,0,C.ink,'x',[0,-10,'middle'])+arrow(555,Y(245),0,95,C.ink,'y');
  }else if(kind.startsWith('pendulum-')){
   x=380;v=Y(210);const positive=kind==='pendulum-positive';
   b+=rect(275,Y(35),145,12,'#d1d9e0')+line(320,Y(47),x,v)+line(320,Y(47),320,Y(255),C.gray,1,'5 5')+ball(x,v,positive?'q > 0':'q < 0');
   b+=force(x,v,0,100,C.red,'mg',[-13,2,'end'])+force(x,v,0,62,C.blue,'F_э',[17,0,'start'])+force(x,v,-30,-81.5,C.green,'T');
   b+=line(160,Y(345),510,Y(345),C.ink,5)+txt(330,Y(376),positive?'−   −   −   −   −   −':'+   +   +   +   +   +',C.ink,24,'middle');
   b+=arrow(165,positive?Y(155):Y(265),0,positive?80:-80,C.purple,'E');
   b+=arrow(550,Y(240),-20,-55,C.ink,'n')+arrow(550,Y(240),52,-19,C.ink,'τ');
   end=y+415;
  }else throw Error('Missing native field scene: '+id+' '+kind);
 }
 return{body:b,h:end-y};
}
module.exports={fieldDiagram};
