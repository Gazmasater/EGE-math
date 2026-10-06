const {records}=require('./physics-magnetism-field');
const {C,txt,line,rect,dot,arrow,original,cards,svg}=require('../lib/physics-svg');
const depth=(x,y,towards,label='',color=C.red)=>`<circle cx="${x}" cy="${y}" r="11" fill="white" stroke="${color}" stroke-width="2"/>`+(towards?dot(x,y,color):line(x-6,y-6,x+6,y+6,color,2)+line(x-6,y+6,x+6,y-6,color,2))+(label?txt(x+18,y-12,label,color,19):'');
const anchors={
 '3759F5':[125/174,.43],B852E0:[113/158,.45],AB0ADF:[28/158,.42],BAC5C7:[28/158,.42],C04659:[30/174,.44],
 '06310E':[10/137,52/107],'8B2572':[124/137,56/107],'4C6BDE':[11/128,52/101],'54F5DC':[108/143,50/99],'890738':[25/174,43/96],B94783:[125/136,50/98],C5E88B:[107/137,.39],
 '70F97F':[49/100,85/165],BE5272:[49/105,82/167],FE5581:[49/100,94/165],A875DE:[77/130,43/79],'9DCB92':[38/164,57/83],'3CB89A':[94/165,63/90],'5AF5EE':[97/195,64/90],
 '86C04F':[56/113,26/93],D668FF:[58/116,26/94],'0EDD81':[59/119,30/108],'3EE5A8':[155/163,29/38]
};
const diagrams={};
for(const r of Object.values(records)){let b='',cy=535;
 if(r.images.length){
  if(r.kind==='field-wires'){
   const im=original(r.images[0],120,210,420,240);b+=im.body;const X=505,Y=300;
   b+=arrow(X-15,Y,0,-90,C.blue,'B₁',[-15,0,'end']);
   b+=arrow(X+35,Y,0,r.opposite?-90:64,C.green,'B₂',[16,0,'start']);
   b+=txt(465,410,'Поля в A',C.ink,19);
   b+=txt(60,470,r.opposite?'Оба вклада вверх: B = B₁ + B₂':'I₁ > I₂ ⇒ B₁ > B₂: сумма вверх',C.red,21);
   b+=txt(60,505,'Направление поля — по правилу правого винта',C.ink,19);
  }else if(r.kind==='ampere-direction'){
   const im=original(r.images[0],115,140,330,255);b+=im.body;const[a,d]=anchors[r.id],x=im.X(a),y=im.Y(d);
   if(r.answer.includes('наблюдателя')||r.answer==='к наблюдателю')b+=depth(x,y,r.answer==='к наблюдателю','F_А');
   else b+=arrow(x,y,r.answer==='влево'?-100:100,0,C.red,'F_А',[r.answer==='влево'?3:9,-14,'start']);
   b+=txt(65,437,'Участок '+r.side+': ток '+r.current,C.blue,21)+txt(65,470,'Магнитное поле: '+r.field,C.ink,20)+txt(65,505,'Сила Ампера: '+r.answer,C.red,21);
  }else if(r.kind==='lorentz-direction'){
   const im=original(r.images[0],155,150,330,255);b+=im.body;const[a,d]=anchors[r.id],x=im.X(a),y=im.Y(d);
   if(r.answer==='к наблюдателю'||r.answer==='от наблюдателя')b+=depth(x,y,r.answer==='к наблюдателю','F_Л');
   else b+=arrow(x,y+(r.id==='5AF5EE'?17:r.id==='3CB89A'?-16:0),0,r.answer==='вверх'?(r.wire?-32:r.id==='3CB89A'?-50:-106):92,C.red,'F_Л',r.id==='3CB89A'?[-16,20,'end']:[20,r.wire?16:r.answer==='вверх'?0:-8,'start']);
   b+=txt(65,440,(r.charge>0?'Протон: q = +e':'Электрон: q = −e')+'; v '+r.velocity,C.blue,21)+txt(65,473,'Магнитное поле: '+r.field,C.ink,20)+txt(65,508,'Магнитная сила: '+r.answer,C.red,21);
  }else if(r.kind==='parallel'){
   const im=original(r.images[0],110,185,450,250);b+=im.body;
   const y=im.Y(r.triple?51/122:r.opposite?10/90:25/99),x=im.X(r.triple?.7:.27);
   b+=arrow(x,y,0,r.answer==='вверх'?-90:r.triple?46:83,C.red,'F',[18,0,'start']);
   b+=txt(65,460,r.triple?'Средний проводник: отталкивание и притяжение':r.opposite?'Противоположные токи отталкиваются':'Сонаправленные токи притягиваются',C.ink,19)+txt(65,505,'Сила на проводник '+(r.triple?'2':'1')+': '+r.answer,C.red,21);
  }else if(r.kind==='electric-direction'){
   const im=original(r.images[0],85,230,420,160);b+=im.body;const x=im.X(155/163),y=im.Y(29/38);
   b+=arrow(x,y,105,0,C.red,'E',[4,-18,'start'])+txt(65,420,'Положительные заряды: поле от заряда',C.ink,21)+txt(65,465,'В точке A оба вклада направлены вправо',C.blue,21)+txt(65,503,'E_x = E₁ + E₂ > 0',C.red,22);
  }
  if(!b)throw Error('Unhandled original '+r.id);
 }else if(r.kind==='lorentz-ratio'){
  b+=txt(65,110,'Для модулей сил: F = |q|vB',C.ink,22);
  for(const[i,y]of [[1,215],[2,375]]){
   b+=depth(525,y,false,'B',C.gray)+dot(170,y)+txt(62,y+50,'Частица '+i+': |q'+i+'| = '+r['q'+i]+'|q|; v'+i+' = '+r['v'+i]+'v',C.ink,20);
   b+=arrow(170,y,175*r['v'+i]/Math.max(r.v1,r.v2),0,C.blue,'v'+i,[9,0,'start'])+arrow(170,y,0,-70*r['q'+i]*r['v'+i]/Math.max(r.q1*r.v1,r.q2*r.v2),C.red,'F'+i,[13,-10,'start']);
  }
  b+=txt(65,467,'Направления показаны для q > 0 и B от нас',C.gray,18)+txt(65,505,'Сравниваем модули; знак q их не меняет',C.ink,20);
 }else if(r.kind.startsWith('ampere-')){
  const angled=r.kind==='ampere-current',angle=angled?30:90;
  b+=txt(65,110,'Сила Ампера: F_А = BILsinα',C.ink,22);
  for(const y of [170,270,370])b+=arrow(80,y,500,0,C.gray,y===170?'B':'',[-40,-15,'start']);
  if(angled){b+=line(180,340,470,173,C.ink,5)+arrow(265,291,92,-53,C.blue,'I',[10,-2,'start']);b+=txt(395,325,'α = 30°',C.ink,22)+depth(235,308,false,'F_А');}
  else{b+=line(280,180,280,385,C.ink,6)+arrow(280,335,0,-105,C.blue,'I',[16,0,'start'])+depth(280,284,false,'F_А')+txt(330,310,'α = 90°',C.ink,21);}
  b+=txt(65,447,'B: вправо; I: по проводнику; F_А: от нас',C.ink,20)+txt(65,493,r.kind==='ampere-ratio'?'F₂ ÷ F₁ = (B₂ ÷ B₁)·(I₂ ÷ I₁)·(L₂ ÷ L₁)':angled?'sin30° = 0,5':'50 см = 0,5 м',C.blue,20);
 }else if(r.kind.startsWith('circle-')){
  b+=txt(65,105,'Магнитная сила создаёт ускорение к центру',C.ink,20);
  b+=txt(65,140,'Схема для положительного заряда',C.gray,18);
  b+=`<circle cx="310" cy="295" r="125" fill="none" stroke="${C.gray}" stroke-width="2" stroke-dasharray="7 5"/>`+dot(310,295,C.ink)+txt(288,321,'O',C.ink,20);
  b+=line(310,295,435,295,C.gray,1,'5 5')+txt(356,325,'R',C.ink,22)+dot(435,295);
  b+=arrow(435,295,0,-108,C.blue,'v',[13,0,'start'])+arrow(435,295,-104,0,C.red,'F_Л',[-13,-15,'end']);
  b+=depth(95,220,false,'B',C.gray)+txt(65,466,'По радиусу: mv² ÷ R = |q|vB',C.blue,22)+txt(65,503,r.kind==='circle-radius'?'R = p ÷ (|q|B)':'T = 2πR ÷ v; p = mv',C.ink,22);
 }else throw Error('Unknown diagram '+r.id);
 b=b.replace(/>([^<]*)</g,(_,text)=>'>'+text.replace(/([Fqvr])([12])(?![0-9])/g,(_,a,n)=>a+(n==='1'?'₁':'₂'))+'<');
 const cs=cards(r.stages,cy);b+=cs.body;diagrams[r.id]=svg(r.id,r.title,r.diagramCaption,b,cs.end+18);
}
module.exports={diagrams};
