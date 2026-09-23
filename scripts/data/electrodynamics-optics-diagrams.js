const {C,txt,line,dot,arrow,force,original}=require('../lib/physics-svg');
const {systemDiagram}=require('./electrodynamics-optical-system-diagrams');
const {waveOpticsDiagram}=require('./electrodynamics-waveoptics-diagrams');
const {refractionDiagram}=require('./electrodynamics-refraction-diagrams');
const {figureDiagram}=require('./electrodynamics-figure-diagrams');
const {qualitativeDiagram}=require('./electrodynamics-qualitative-diagrams');
function lensSymbol(x,ay,span=145,diverging=false){
 let b=line(x,ay-span,x,ay+span,C.ink,2.5);
 for(const sign of [-1,1]){const yy=ay+sign*span,tip=diverging?yy-sign*12:yy;b+=line(x-9,diverging?yy:yy-sign*12,x,tip,C.ink,2.5)+line(x+9,diverging?yy:yy-sign*12,x,tip,C.ink,2.5);}
 return b;
}
function ray(x,y,X,Y,c=C.blue,dashed=false){
 let b=line(x,y,X,Y,c,2,dashed?'6 5':'');
 if(!dashed){const t=.55,dx=X-x,dy=Y-y,len=Math.hypot(dx,dy);if(len>35)b+=arrow(x+dx*t,y+dy*t,dx/len*16,dy/len*16,c);}
 return b;
}
function basicPanel(p,y){
 const {F,d,f}=p,G=Math.abs(f/d),h=Math.min(60,110/G),end=f>0?f*1.10:F*1.20;
 const xmin=Math.min(-d*1.12,f<0?f*1.08:-F*1.25),xmax=Math.max(end,F*1.25),X=x=>65+(x-xmin)/(xmax-xmin)*550,Y=v=>y+215-v*h,ay=Y(0),ox=X(0),obj=X(-d),im=X(f);
 let b=txt(340,y+23,p.caption,C.ink,20,'middle')+line(45,ay,635,ay,C.gray,1.5);
 for(const sign of [-1,1]){const x=X(sign*F);b+=dot(x,ay,C.ink)+txt(x,ay+45,'F',C.ink,18,'middle');}
 b+=ray(obj,Y(1),ox,Y(1),C.blue)+ray(ox,Y(1),X(end),Y(1-end/F),C.blue);
 b+=ray(obj,Y(1),ox,ay,C.purple)+ray(ox,ay,X(end),Y(-end/d),C.purple);
 if(f<0)b+=ray(ox,Y(1),im,Y(-f/d),C.blue,true)+ray(ox,ay,im,Y(-f/d),C.purple,true);
 b+=lensSymbol(ox,ay)+txt(ox+12,ay+23,'O',C.ink,18);
 b+=arrow(obj,ay,0,-h,C.green)+txt(obj-10,ay+23,'A',C.green,18,'end')+txt(obj-12,Y(1)-10,'B',C.green,18,'end');
 b+=arrow(im,ay,0,f/d*h,C.red)+txt(im+10,ay-12,'A′',C.red,18)+txt(im+12,Y(-f/d)+(f>0?22:-10),'B′',C.red,18);
 b+=txt(340,y+412,'d = '+(p.dLabel||d)+' см; f = '+f+' см; F = '+F+' см',C.ink,19,'middle');
 return{body:b,h:452};
}
function axialPanel(p,y){
 const points=p.points.map(t=>({...t,f:p.F*t.d/(t.d-p.F)})),extent=Math.max(...points.flatMap(t=>[t.d,Math.abs(t.f)]))*1.12,X=x=>340+x*275/extent,ay=y+200;
 let b=txt(340,y+25,'Изображения двух крайних точек на оси',C.ink,20,'middle')+line(40,ay,640,ay,C.gray,1.5)+lensSymbol(340,ay,135);
 for(const sign of [-1,1])b+=dot(X(sign*p.F),ay,C.ink)+txt(X(sign*p.F),ay+45,'F',C.ink,18,'middle');
 for(const [i,t]of points.entries()){
  const color=C[t.color],ht=65+i*45;
  for(const sign of [-1,1])b+=ray(X(-t.d),ay,340,ay+sign*ht,color)+ray(340,ay+sign*ht,X(t.f),ay,color);
  b+=dot(X(-t.d),ay,color)+txt(X(-t.d),ay+(i?-18:27),t.label,color,19,'middle')+dot(X(t.f),ay,color)+txt(X(t.f),ay+(i?-18:27),t.label+'′',color,19,'middle');
 }
 b+=txt(352,ay-15,'O',C.ink,18)+txt(340,y+380,'F = 2 см; S₁′S₂′ = 2 см',C.ink,20,'middle');return{body:b,h:420};
}
function aperturePanel(p,y){
 const {F,d,f,screen,r}=p,xmin=Math.min(-d*1.08,f<0?f*1.1:0),xmax=Math.max(screen,f>0?f:screen)*1.16,X=x=>60+(x-xmin)/(xmax-xmin)*560,ay=y+220,R=r*Math.abs(1-screen/f),scale=115/Math.max(r,R),Y=v=>ay-v*scale,ox=X(0);
 let b=txt(340,y+25,'Крайние лучи и световое пятно',C.ink,22,'middle')+line(35,ay,645,ay,C.gray,1.5)+lensSymbol(ox,ay,r*scale,F<0);
 // Opaque mount beyond the open circular aperture.
 b+=line(ox,ay-r*scale-8,ox,ay-155,C.ink,7)+line(ox,ay+r*scale+8,ox,ay+155,C.ink,7);
 for(const sign of [-1,1]){
  b+=ray(X(-d),ay,ox,Y(sign*r),C.blue)+ray(ox,Y(sign*r),X(screen),Y(sign*r*(1-screen/f)),C.blue);
  if(f<0)b+=ray(ox,Y(sign*r),X(f),ay,C.purple,true);
  if(f>screen)b+=ray(X(screen),Y(sign*r*(1-screen/f)),X(f),ay,C.purple,true);
 }
 b+=line(X(screen),ay-155,X(screen),ay+155,C.ink,3)+line(X(screen),Y(R),X(screen),Y(-R),C.red,7)+txt(X(screen),y+48,'Экран',C.ink,20,'middle');
 b+=dot(X(-d),ay,C.green)+txt(X(-d),ay+28,'S',C.green,20,'middle')+dot(X(f),ay,C.purple)+(f<0?txt(X(f)-12,ay+7,'S′',C.purple,20,'end'):txt(X(f),ay+28,'S′',C.purple,20,'middle'))+txt(ox+10,ay+27,'O',C.ink,18);
 b+=txt(340,y+414,'r = 5 см; L = '+screen+' см; f = '+f+' см',C.ink,20,'middle');return{body:b,h:455};
}
function rotatedPanel(theta,y){
 const ca=Math.cos(theta),sa=Math.sin(theta),s=800/(40*ca-20),X=x=>300+x*4.5,Y=v=>y+210-v*4.5,ay=Y(0),x=X(0),span=140;
 let b=txt(340,y+25,theta?'После поворота: cos α = 0,9':'До поворота: источник на 2F',C.ink,21,'middle')+line(45,ay,635,ay,C.gray,1.5)+txt(45,ay-12,'A',C.ink,18)+txt(633,ay-12,'B',C.ink,18);
 if(theta){
  b+=line(X(-48*ca),Y(-48*sa),X(62*ca),Y(62*sa),C.gray,1.5,'5 5');
  b+=line(x+span*sa,ay+span*ca,x-span*sa,ay-span*ca,C.ink,3);
  const px=-40*sa*sa,py=40*ca*sa;
  b+=ray(X(-40),ay,X(px),Y(py),C.blue)+ray(X(px),Y(py),X(s),ay,C.blue)+ray(X(-40),ay,X(s),ay,C.purple);
  b+=dot(X(20*ca),Y(20*sa),C.ink)+txt(X(20*ca)+8,Y(20*sa)-12,'F′',C.ink,18);
  b+=dot(X(40),ay,C.gray)+txt(X(40),ay+45,'S′',C.gray,18,'middle');
 }else{
  b+=lensSymbol(x,ay,span);
  for(const sign of [-1,1])b+=ray(X(-40),ay,x,ay+sign*95,C.blue)+ray(x,ay+sign*95,X(s),ay,C.blue);
  b+=dot(X(20),ay,C.ink)+txt(X(20),ay+40,'F',C.ink,18,'middle');
 }
 b+=dot(X(-40),ay,C.green)+txt(X(-40),ay+27,'S',C.green,20,'middle')+dot(X(s),ay,C.red)+txt(X(s)+8,ay-15,theta?'S″':'S′',C.red,20)+txt(x+8,ay+24,'O',C.ink,18);
 b+=txt(340,y+410,theta?'d′ = 36 см; f′ = 45 см; OS″ = 50 см':'OS = OS′ = 40 см; F = 20 см',C.ink,19,'middle');return{body:b,h:450};
}
function opticsDiagram(id,r,item,y){
 let b='',h=0;
 if(item.images.length){b+=txt(340,y+15,'Исходный рисунок ФИПИ',C.ink,21,'middle');h+=40;for(const file of item.images){const p=original(file,110,y+h,460,320);b+=p.body;
  if(r.nativeOpticsForces==='spring'){const first=id==='52C56F',x=p.X((first?83:90)/(first?268:263)),v=p.Y((first?125:129)/(first?250:264));b+=force(x,v,0,-62,C.green,'F_упр',[13,-22,'start'])+force(x,v,0,75,C.red,'mg',[13,5,'start']);}
  if(r.nativeOpticsForces==='pendulum'){const x=p.X(78/290),v=p.Y(96/157);b+=force(x,v,-28,-75,C.green,'T',[10,-5,'start'])+force(x,v,0,65,C.red,'mg',[14,5,'start']);}
  h+=p.h+30;}}
 if(r.opticsScene==='basic')for(const panel of r.lensPanels){const p=basicPanel(panel,y+h);b+=p.body;h+=p.h;}
 else if(r.opticsScene==='axial-pair'){const p=axialPanel(r.axial,y+h);b+=p.body;h+=p.h;}
 else if(r.opticsScene==='aperture'){const p=aperturePanel(r.aperture,y+h);b+=p.body;h+=p.h;}
 else if(r.opticsScene==='rotated-lens')for(const theta of [0,Math.acos(.9)]){const p=rotatedPanel(theta,y+h);b+=p.body;h+=p.h;}
 else if(['slit','split-lens','two-lenses','opposite-sources'].includes(r.opticsScene)){const p=systemDiagram(r,y+h,{ray,lensSymbol});b+=p.body;h+=p.h;}
 else if(['diffraction','camera'].includes(r.opticsScene)){const p=waveOpticsDiagram(r,y+h,{ray,lensSymbol});b+=p.body;h+=p.h;}
 else if(r.opticsScene.startsWith('water-')||r.opticsScene.startsWith('prism-')){const p=refractionDiagram(r.opticsScene,y+h,{ray});b+=p.body;h+=p.h;}
 else if(r.opticsScene==='figure'){const p=figureDiagram(r.figure,y+h,{ray,lensSymbol});b+=p.body;h+=p.h;}
 else if(['plate','half-covered'].includes(r.opticsScene)){const p=qualitativeDiagram(r,y+h,{ray,lensSymbol});b+=p.body;h+=p.h;}
 else throw Error('Unknown optics scene '+r.opticsScene);
 return{body:b,h};
}
module.exports={opticsDiagram,basicPanel,lensSymbol,ray};
