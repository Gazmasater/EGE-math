const {C,txt,line,dot}=require('../lib/physics-svg');
function waveOpticsDiagram(r,y,{ray,lensSymbol}){
 let b='',h=530;
 if(r.opticsScene==='diffraction'){
  const spectrum=r.diffraction.spectrum,ay=y+260,g=115,l=250,s=550,f=s-l;
  b+=txt(340,y+25,'Решётка, линза и её фокальная плоскость',C.ink,21,'middle')+line(35,ay,635,ay,C.gray,1.5)+lensSymbol(l,ay,145)+line(s,ay-150,s,ay+100,C.ink,3);
  b+=line(g,ay-150,g,ay+100,C.ink,3);for(let yy=ay-148;yy<ay+100;yy+=12)b+=line(g-7,yy,g+7,yy,C.ink,2);
  for(const off of [-18,18])b+=ray(40,ay+off,g,ay+off,C.gray);
  for(const [pos,color,label]of [[55,spectrum?C.purple:C.blue,spectrum?'y_ф':'y₁'],[110,spectrum?C.red:C.purple,spectrum?'y_к':'y₂']]){
   const theta=pos/f;
   for(const off of [-18,18]){const v=ay+off-theta*(l-g);b+=ray(g,ay+off,l,v,color)+ray(l,v,s,ay-pos,color);}
   b+=dot(s,ay-pos,color)+txt(s+14,ay-pos+6,label,color,18);
  }
  b+=line(608,ay-110,608,ay-55,C.ink,2)+line(601,ay-110,615,ay-110,C.ink,2)+line(601,ay-55,615,ay-55,C.ink,2)+txt(620,ay-76,'Δy',C.ink,18);
  b+=dot(s,ay,C.gray)+txt(s+14,ay+23,'0',C.ink,18)+txt(g,ay+132,'Решётка',C.ink,19,'middle')+txt(l,ay+132,'Линза',C.ink,19,'middle')+txt(s,ay+132,'Экран',C.ink,19,'middle');
  b+=txt(340,y+455,spectrum?'Один порядок k = '+r.diffraction.order+': фиолетовый ближе к оси':'Одна длина волны: максимумы k = 1 и k = 2',C.ink,19,'middle')+txt(340,y+493,'Углы и поперечные расстояния показаны увеличенно',C.ink,17,'middle');
 }else if(r.opticsScene==='camera'){
  const {F,d,alpha}=r.camera,f=F*d/(d-F),A=F/alpha,c=F*F/(alpha*d),ox=180,X=x=>ox+x*320/F,ay=y+235,rs=90;
  b+=txt(340,y+25,'Плёнка перехватывает сходящийся пучок',C.ink,21,'middle')+line(40,ay,635,ay,C.gray,1.5)+lensSymbol(ox,ay,rs)+line(X(F),ay-120,X(F),ay+120,C.ink,3);
  for(const sign of [-1,1]){const inlet=sign*rs*(1+(60-ox)/(320/F)/d),v=sign*rs*(1-F/f);b+=ray(60,ay-inlet,ox,ay-sign*rs,C.blue)+ray(ox,ay-sign*rs,X(F),ay-v,C.blue)+ray(X(F),ay-v,X(f),ay,C.purple,true);}
  b+=dot(X(f),ay,C.purple)+txt(X(f)+23,ay-15,'S′',C.purple,19)+txt(X(F),ay+148,'Плёнка: F',C.ink,19,'middle')+txt(ox-17,ay-105,'A',C.ink,19,'end')+txt(60,y+73,'Предмет далеко слева',C.ink,18);
  b+=txt(340,y+460,'Увеличенный фрагмент у плёнки',C.ink,21,'middle');
  const gap=f-F,start=F-gap,end=f+gap*.3,X2=x=>100+(x-start)/(end-start)*510,Y0=y+665,Y2=v=>Y0-v*120/c;
  b+=line(65,Y0,635,Y0,C.gray,1.5)+line(X2(F),Y0-160,X2(F),Y0+160,C.ink,3);
  for(const sign of [-1,1]){const at=v=>sign*A/2*(1-v/f);b+=ray(X2(start),Y2(at(start)),X2(F),Y2(at(F)),C.blue)+ray(X2(F),Y2(at(F)),X2(f),Y0,C.purple,true);}
  b+=line(X2(F),Y2(c/2),X2(F),Y2(-c/2),C.red,7)+dot(X2(f),Y0,C.purple)+txt(X2(f)+15,Y0-15,'S′',C.purple,20);
  b+=txt(X2(F)-15,Y0-82,'c',C.red,21,'end')+txt(X2(F),Y0+190,'Плёнка',C.ink,20,'middle')+txt(340,y+910,'c = A(1 − F ÷ f) = F² ÷ (αd); c₀ = 0,05 мм',C.ink,19,'middle');h=945;
 }else throw Error('Unknown wave-optics scene '+r.opticsScene);
 return{body:b,h};
}
module.exports={waveOpticsDiagram};
