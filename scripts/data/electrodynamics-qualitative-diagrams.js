const {C,txt,line,dot,arrow}=require('../lib/physics-svg');
function qualitativeDiagram(r,y,{ray,lensSymbol}){
 let b='';
 for(const changed of [false,true]){
  const top=y+(changed?470:0),ay=top+220,ox=390;
  b+=txt(340,top+25,changed?'После изменения':'До изменения',C.ink,22,'middle')+line(40,ay,640,ay,C.gray,1.5)+lensSymbol(ox,ay,145)+txt(ox+12,ay+26,'O',C.ink,18);
  if(r.opticsScene==='plate'){
   const m=.38*r.plateSign,F=160,focus=ox+F,a=270,z=315,n=1.5,angle=Math.atan(m),inside=Math.asin(Math.sin(angle)/n),delta=(z-a)*(Math.tan(inside)-m),Y=h=>ay-h;
   b+=line(focus,ay-150,focus,ay+150,C.gray,1.5,'5 5')+dot(ox-F,ay,C.ink)+txt(ox-F,ay+28,'F',C.ink,18,'middle')+dot(focus,ay,C.ink)+txt(focus,ay+28,'F',C.ink,18,'middle');
   if(changed)b+='<rect x="'+a+'" y="'+(ay-150)+'" width="'+(z-a)+'" height="300" fill="#dbeafe" stroke="'+C.gray+'"/>'+txt((a+z)/2,ay+175,'n',C.ink,20,'middle');
   for(const t of [0,r.plateSign*85]){
    const inlet=t+m*(90-ox),at=t+m*(a-ox),out=at+(z-a)*Math.tan(inside),hit=t+delta;
    if(changed){b+=ray(90,Y(inlet),ox,Y(t),C.gray,true)+ray(ox,Y(t),focus,Y(m*F),C.gray,true);b+=ray(90,Y(inlet),a,Y(at),C.blue)+ray(a,Y(at),z,Y(out),C.blue)+ray(z,Y(out),ox,Y(hit),C.blue)+ray(ox,Y(hit),focus,Y(m*F),C.purple);}
    else b+=ray(90,Y(inlet),ox,Y(t),C.blue)+ray(ox,Y(t),focus,Y(m*F),C.purple);
   }
   b+=dot(focus,Y(m*F),C.red)+txt(focus+14,Y(m*F)-12,'S′',C.red,20);
   b+=txt(340,top+428,changed?'Пучок сместился; точка S′ осталась прежней':'Параллельный пучок → точка фокальной плоскости',C.ink,18,'middle');
  }else{
   const obj=90,screen=540,height=70;
   b+=line(screen,ay-160,screen,ay+145,C.ink,3)+txt(screen,top+48,'Э',C.ink,21,'middle')+arrow(obj,ay,0,-height,C.green)+arrow(screen,ay,0,height/2,changed?C.gray:C.red);
   if(changed)b+=line(355,ay,355,ay+145,C.ink,8)+txt(337,ay+115,'К',C.ink,21,'end');
   for(const [name,h,color]of [['A',0,C.blue],['B',height,C.purple]]){
    for(const pupil of changed?[40,105]:[-100,100])b+=ray(obj,ay-h,ox,ay-pupil,color)+ray(ox,ay-pupil,screen,ay+h/2,color);
    b+=dot(obj,ay-h,C.green)+txt(obj-14,ay-h+(h?-12:25),name,C.green,20,'end')+dot(screen,ay+h/2,C.red)+txt(screen+15,ay+h/2+(h?25:-12),name+'′',C.red,20);
   }
   b+=txt(340,top+430,changed?'Лучей меньше; обе точки A′ и B′ на прежних местах':'Лучи от каждой точки идут через обе половины',C.ink,18,'middle');
  }
 }
 return{body:b,h:945};
}
module.exports={qualitativeDiagram};
