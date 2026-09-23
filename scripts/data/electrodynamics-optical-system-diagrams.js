const {C,txt,line,dot}=require('../lib/physics-svg');
function systemDiagram(r,y,{ray,lensSymbol}){
 let b='',h=460;
 if(r.opticsScene==='slit'){
  const {F,b:dist,H,a,cross}=r.slit,f=dist*F/(dist-F),hi=-F*H/(dist-F),yp=(dist*a-F*H)/(dist-F),end=Math.max(f,cross)*1.13;
  const xmin=-dist*1.08,X=x=>55+(x-xmin)/(end-xmin)*560,ay=y+225,scale=120/Math.max(H,Math.abs(yp)),Y=v=>ay-v*scale,ox=X(0),ax=X(-F);
  b+=txt(340,y+25,'Луч через отверстие A и его преломление',C.ink,21,'middle')+line(35,ay,642,ay,C.gray,1.5)+lensSymbol(ox,ay,150);
  b+=ray(X(-dist),Y(H),ox,Y(H),C.purple,true)+ray(ox,Y(H),X(f),Y(hi),C.purple,true)+ray(X(-dist),Y(H),X(f),Y(hi),C.green,true);
  b+=line(ax,ay-155,ax,Y(a)-8,C.ink,5)+line(ax,Y(a)+8,ax,ay+155,C.ink,5);
  b+=ray(X(-dist),Y(H),ox,Y(yp),C.blue)+ray(ox,Y(yp),X(end),Y(yp-a*end/F),C.blue);
  for(const[x,v,label,c,dy]of [[-dist,H,'S',C.green,-14],[-F,a,'A',C.ink,a>0?-15:25],[0,yp,'P',C.blue,yp>0?-16:25],[f,hi,'S′',C.purple,25],[cross,0,'X',C.blue,-17]])b+=dot(X(x),Y(v),c)+txt(X(x)+10,Y(v)+dy,label,c,18);
  b+=dot(X(F),ay,C.ink)+txt(X(F),ay+45,'F',C.ink,18,'middle')+txt(ox-12,ay+25,'O',C.ink,18,'end');
  b+=txt(340,y+420,'Пунктир: вспомогательное построение без экрана',C.ink,18,'middle');
 }else if(r.opticsScene==='split-lens'){
  const X=x=>170+x*14,Y=v=>y+235-v*10,ay=Y(0);
  b+=txt(340,y+25,'Раздвинутые половины: лучи проходят через стекло',C.ink,20,'middle')+line(55,ay,635,ay,C.gray,1.5);
  for(const sign of [-1,1]){
   const color=sign>0?C.blue:C.purple,axis=Y(sign*2);
   b+=line(55,axis,635,axis,C.gray,1,'5 5')+line(X(0),Y(sign*2),X(0),Y(sign*10),C.ink,4)+line(X(0)-8,Y(sign*10)+sign*12,X(0),Y(sign*10),C.ink,3)+line(X(0)+8,Y(sign*10)+sign*12,X(0),Y(sign*10),C.ink,3);
   for(const height of [3,5])b+=ray(X(-6),ay,X(0),Y(sign*height),color)+ray(X(0),Y(sign*height),X(30),Y(sign*12),color);
   b+=dot(X(30),Y(sign*12),color)+txt(X(30)+10,Y(sign*12)+(sign>0?-12:25),sign>0?'S₁′':'S₂′',color,20);
   b+=dot(X(0),axis,C.ink)+txt(X(0)-12,axis+(sign>0?-9:23),sign>0?'O₁':'O₂',C.ink,18,'end');
  }
  b+=dot(X(-6),ay,C.green)+txt(X(-6)-10,ay+28,'S',C.green,20,'end')+txt(340,y+425,'Оси: y = ±2 см; изображения: y = ±12 см',C.ink,19,'middle');
 }else if(r.opticsScene==='two-lenses'){
  const X=x=>70+x*14,ay=y+225;
  b+=txt(340,y+25,'Рассеивающая и собирающая линзы',C.ink,22,'middle')+line(35,ay,640,ay,C.gray,1.5)+lensSymbol(X(10),ay,155,true)+lensSymbol(X(25),ay,155);
  for(const sign of [-1,1])b+=ray(X(0),ay,X(10),ay+sign*30,C.blue)+ray(X(10),ay+sign*30,X(25),ay+sign*120,C.blue)+ray(X(25),ay+sign*120,630,ay+sign*120,C.blue)+ray(X(10),ay+sign*30,X(5),ay,C.purple,true);
  for(const[xx,label]of [[0,'S'],[5,'S′'],[10,'O₁'],[25,'O₂']])b+=dot(X(xx),ay,C.ink)+txt(X(xx),ay+28,label,C.ink,19,'middle');
  b+=txt(340,y+425,'Координаты: S = 0; S′ = 5; O₁ = 10; O₂ = 25 см',C.ink,19,'middle');
 }else if(r.opticsScene==='opposite-sources'){
  const {F,near,far,a}=r.opposite,xmin=-a*1.08,xmax=far*1.1,X=x=>55+(x-xmin)/(xmax-xmin)*560;
  for(const [i,virtual]of [true,false].entries()){
   const yy=y+i*450,ay=yy+220,ox=X(0),height=65,source=virtual?-near:far;
   b+=txt(340,yy+25,virtual?'Источник S₁: мнимое изображение слева':'Источник S₂: действительное изображение слева',C.ink,21,'middle')+line(35,ay,640,ay,C.gray,1.5)+lensSymbol(ox,ay,145);
   for(const sign of [-1,1]){
    b+=ray(X(source),ay,ox,ay+sign*height,C.blue);
    if(virtual){const end=Math.min(far,a*.6);b+=ray(ox,ay+sign*height,X(end),ay+sign*height*(1+end/a),C.blue)+ray(ox,ay+sign*height,X(-a),ay,C.purple,true);}
    else b+=ray(ox,ay+sign*height,X(-a),ay,C.blue);
   }
   b+=dot(X(source),ay,C.green)+txt(X(source),ay+30,virtual?'S₁':'S₂',C.green,20,'middle')+dot(X(-a),ay,C.red)+txt(X(-a),ay-17,'S′',C.red,20,'middle')+txt(ox+10,ay+26,'O',C.ink,18);
   b+=txt(340,yy+420,virtual?'Продолжения расходящихся лучей пересекаются в S′':'Свет идёт справа налево и сходится в той же точке S′',C.ink,18,'middle');
  }h=900;
 }else throw Error('Unknown optical system '+r.opticsScene);
 return{body:b,h};
}
module.exports={systemDiagram};
