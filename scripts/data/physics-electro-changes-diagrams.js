const {records}=require('./physics-electro-changes');
const {C,txt,line,rect,dot,arrow,original,cards,svg}=require('../lib/physics-svg');
const diagrams={};
for(const r of Object.values(records)){let b='',cy=580;
 if(r.images.length){
  const im=original(r.images[0],55,115,565,330);b+=txt(55,84,'Исходный рисунок ФИПИ',C.gray,18)+im.body;
  if(r.kind==='electric-particle'){
   const x=im.X(.731),y=im.Y(.686);b+=arrow(x,y,0,im.h*.105,C.red,'Fэ',[16,-2,'start']);
   b+=arrow(im.X(.54),im.Y(.23),0,im.h*.20,C.blue,'E',[12,-7,'start']);
   b+=txt(55,490,'Ox — вправо; Oy — вниз; Fэ = |q|E',C.ink,21)+txt(55,532,'vₓ = v₀; t = ℓ ÷ v₀',C.green,24);
  }else{
   b+=txt(55,492,r.summary,C.green,26);
   b+=txt(55,535,r.kind==='refraction'?'ν сохраняется; v = c ÷ n; λ = v ÷ ν':r.kind==='battery'?'I = ℰ ÷ (R + r); U = ℰ − Ir':'Сначала определяем работающие ветви цепи',C.ink,21);
  }
 }else if(r.kind==='magnetic-particle'){
  b+=txt(55,105,'Локальные оси в точке P',C.ink,23);
  b+=`<circle cx="290" cy="280" r="155" fill="none" stroke="${C.gray}" stroke-width="2" stroke-dasharray="7 5"/>`;
  b+=dot(290,280,C.gray)+txt(265,313,'O',C.gray,20)+line(290,280,445,280,C.gray,1,'5 4')+txt(342,310,'R',C.gray,20);
  b+=dot(445,280,C.ink)+txt(460,300,'P',C.ink,21);
  b+=arrow(445,280,-125,0,C.red,'Fл; Ox',[5,-16,'middle'])+arrow(445,280,0,-100,C.blue,'v; Oy',[13,0,'start']);
  b+=txt(55,475,'Сила направлена к центру; B ⟂ плоскости',C.ink,21)+txt(55,525,r.summary,C.green,27);
 }else if(r.kind==='wire'){
  b+=txt(55,108,'Геометрия и материал проводника',C.ink,23);
  b+=rect(140,220,380,90,'#edf4ff')+line(75,265,140,265,C.ink,3)+line(520,265,605,265,C.ink,3);
  b+=arrow(180,175,170,0,C.blue,'I',[10,7,'start'])+txt(290,273,'ρ',C.ink,27)+txt(548,225,'S',C.ink,24);
  b+=line(140,345,520,345,C.gray)+line(140,336,140,354,C.gray)+line(520,336,520,354,C.gray)+txt(330,379,'ℓ',C.gray,25,'middle');
  b+=txt(55,451,'R = ρℓ ÷ S; I = U ÷ R; P = U² ÷ R',C.ink,23)+txt(55,525,r.summary,C.green,27);
 }else if(r.kind==='battery'){
  b+=txt(55,108,'Нагрузка и внутреннее сопротивление',C.ink,22);
  b+=line(115,205,290,205)+line(320,205,565,205)+line(290,180,290,230,C.ink,4)+line(320,190,320,220,C.ink,4)+txt(283,165,'+',C.ink,23)+txt(319,165,'−',C.ink,23);
  b+=line(115,205,115,365)+line(565,205,565,365)+line(115,365,240,365)+rect(240,345,190,40)+line(430,365,565,365)+txt(328,412,'R',C.ink,23,'middle');
  b+=txt(355,174,'ℰ, r',C.ink,24)+arrow(115,260,0,70,C.blue,'I',[-20,0,'end']);
  b+=txt(55,474,'I = ℰ ÷ (R + r); U = ℰ − Ir',C.ink,23)+txt(55,525,r.summary,C.green,27);
 }else if(r.kind==='capacitor'){
  b+=txt(55,106,'Ёмкость задаётся конструкцией',C.ink,23);
  b+=line(235,175,235,380,C.ink,5)+line(450,175,450,380,C.ink,5)+txt(215,151,'+',C.ink,25)+txt(444,151,'−',C.ink,25);
  b+=rect(260,196,163,160,'#edf4ff')+txt(340,227,'ε',C.gray,24,'middle')+arrow(275,284,130,0,C.blue,'E; Ox',[-65,-22,'middle']);
  b+=line(235,423,450,423,C.gray)+line(235,415,235,431,C.gray)+line(450,415,450,431,C.gray)+txt(342,452,'d',C.gray,22,'middle');
  b+=txt(55,496,'C = ε₀εS ÷ d; Q = CU',C.ink,23)+txt(55,544,r.summary,C.green,27);cy=590;
 }else if(r.kind==='oscillator'){
  b+=txt(55,106,'Связь периода, частоты и длины волны',C.ink,23);
  for(const[x,y,label]of[[100,190,'L, C'],[380,190,'T'],[100,360,'ν = 1 ÷ T'],[380,360,'λ = cT']])b+=rect(x,y,175,80)+txt(x+87,y+47,label,C.ink,23,'middle');
  b+=arrow(287,230,76,0,C.blue)+arrow(465,284,0,55,C.blue)+arrow(370,317,-94,29,C.blue);
  b+=txt(55,515,r.summary,C.green,27);
 }else if(r.kind==='lens'){
  // Two illustrative positions obey the thin-lens equation exactly (F=1).
  const D=r.id==='AFC008'?[3,4]:r.id==='138A15'?[1.5,1.25]:[1.5,2],Y=270,O=r.id==='AFC008'?345:r.id==='138A15'?210:250,F=r.id==='AFC008'?65:r.id==='138A15'?73:95,H=28;
  b+=txt(55,101,'Два положения предмета и изображения',C.ink,22)+line(40,Y,625,Y,C.gray,1,'5 4')+line(O,135,O,405,C.ink,2);
  b+=line(O,135,O-8,148)+line(O,135,O+8,148)+line(O,405,O-8,392)+line(O,405,O+8,392);
  for(const x of[O-F,O+F])b+=line(x,Y-5,x,Y+5)+txt(x,Y+25,'F',C.ink,20,'middle');
  b+=txt(O+10,Y+24,'O',C.ink,19);
  for(let j=0;j<2;j++){const d=D[j],f=d/(d-1),x=O-d*F,z=O+f*F,h=f/d*H,col=j===0?C.blue:C.green;
   b+=arrow(x,Y,0,-H,col,String(j+1),[0,-10,'middle'])+arrow(z,Y,0,h,col,r.id==='AFC008'?'':String(j+1),[12,0,'start'])+line(x,Y-H,z,Y+h,col,1.2,j?'5 4':'');
   if(r.id==='AFC008'){
    const labelX=j===0?500:445,labelY=j===0?330:370;
    b+=line(z,Y+h+3,labelX,labelY-16,col,1)+txt(labelX,labelY,String(j+1),col,20,'middle');
   }
  }
  b+=txt(55,455,'1 — начальное; 2 — следующее положение',C.ink,20)+txt(55,492,'Луч через O сохраняет направление',C.ink,21)+txt(55,540,r.summary,C.green,27);cy=586;
 }else if(r.kind==='diffraction-medium'){
  b+=txt(55,105,'Меньший n — большая длина волны',C.ink,23)+line(255,150,255,432,C.ink,4)+arrow(70,370,170,0,C.gray,'',[0,0]);
  b+=line(255,370,600,370,C.gray,1,'6 4')+txt(606,377,'Ox',C.gray,20);
  b+=arrow(255,370,295,-90,C.blue,'k = 2, до',[0,-15,'end'])+arrow(255,370,295,-175,C.green,'k = 2, после',[0,-15,'end']);
  b+=txt(60,463,'d sinφ₂ = 2λ; λ = c ÷ (nν)',C.ink,23)+txt(55,525,r.summary,C.green,27);
 }else throw Error('Unillustrated '+r.id);
 const cs=cards(r.stages,cy);b+=cs.body;diagrams[r.id]=svg(r.id,r.title,r.diagramCaption,b,cs.end+16);
}
module.exports={diagrams};
