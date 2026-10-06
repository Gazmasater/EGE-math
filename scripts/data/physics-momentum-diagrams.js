const {C,txt,line,rect,dot,arrow,original,cards,svg}=require('../lib/physics-svg');
const {records}=require('./physics-momentum');const diagrams={};
const f=x=>Number(x.toFixed(10)).toLocaleString('ru-RU',{useGrouping:false,maximumFractionDigits:10});
const axes=(x,y,dx=95,dy=80)=>arrow(x,y,dx,0,C.gray,'x',[12,5])+arrow(x,y,0,-dy,C.gray,'y',[12,0]);
for(const r of Object.values(records)){
 let b='',y=460;
 if(r.kind==='perpendicular'){
  const im=original(r.images[0],155,85,345,345);b+=im.body;
  const ox=im.X(28/113),oy=im.Y(83/(r.id==='DC8C1F'?120:119));
  b+=arrow(ox,oy,-60,80,C.red,'P',[-12,18,'end']);
  b+=txt(440,180,'P_x = −'+f(r.p2),C.ink,20)+txt(440,215,'P_y = −'+f(r.p1),C.ink,20)+txt(440,260,'кг·м·с⁻¹',C.ink,19);
  y=85+im.h+45;b+=txt(45,y,'Вид сверху. P→ = p₁→ + p₂→',C.ink,20);y+=50;
 }else if(r.kind==='sand-cart'){
  const im=original(r.images[0],120,140,460,327);b+=im.body;
  // Первичная схема до контакта: тяжесть камня, тяжесть тележки и опора.
  b+=arrow(im.X(60/183),im.Y(31/130),0,80,C.purple,'mg',[-13,0,'end']);
  b+=arrow(im.X(130/183),im.Y(100/130),0,95,C.purple,'Mg',[12,0]);
  b+=arrow(im.X(55/183),im.Y(108/130),0,-95,C.green,'N',[-12,0,'end']);
  b+=axes(495,105,90,40);y=140+im.h+115;
  b+=txt(45,y,'По x: mvcos60° = (M + m)V',C.ink,20);y+=36;
  b+=txt(45,y,'После удара: M + m = 18 кг; V = 0,5 м·с⁻¹',C.ink,20);y+=48;
 }else if(r.kind.startsWith('fragment-')){
  const angle=r.alpha||Math.atan2(300,400)*180/Math.PI,rad=angle*Math.PI/180;
  b+=txt(45,82,'До разрыва',C.ink,20)+dot(95,145)+arrow(95,145,130,0,C.blue,'Mv₀',[12,5]);
  b+=txt(350,82,'После разрыва',C.ink,20);
  const ox=380,oy=255,L=200,dx=L*Math.cos(rad),dy=L*Math.sin(rad);
  b+=dot(ox,oy)+arrow(ox,oy,0,-130,C.green,'m₁v₁',[-15,0,'end']);
  b+=arrow(ox,oy,dx,dy,C.red,'m₂v₂',[12,5]);
  b+=line(ox,oy,ox+205,oy,C.gray,2,'6 5');
  const ar=40;b+=`<path d="M${ox+ar} ${oy} A${ar} ${ar} 0 0 1 ${ox+ar*Math.cos(rad)} ${oy+ar*Math.sin(rad)}" fill="none" stroke="${C.gray}" stroke-width="2"/>`;
  if(r.alpha)b+=txt(ox+52,oy+24,'α = '+r.alpha+'°',C.ink,18);
  b+=axes(75,385,100,75);b+=txt(300,460,'P_y = 0; P_x = Mv₀',C.ink,21);y=505;
 }else if(r.kind==='head-on'||r.kind==='same-way'){
  const head=r.kind==='head-on';b+=txt(45,85,'До столкновения',C.ink,21);
  b+=rect(90,125,70,50)+txt(125,157,head?'M':'m',C.ink,21,'middle')+arrow(160,150,90,0,C.blue,head?'v':'2v',[12,5]);
  b+=rect(430,125,70,50)+txt(465,157,head?'m':'2m',C.ink,21,'middle');
  b+=head?arrow(430,150,-90,0,C.red,'−v',[-12,5,'end']):arrow(500,150,70,0,C.blue,'v',[12,5]);
  b+=txt(45,235,'После: тела слипаются',C.ink,21)+rect(190,275,150,55)+txt(265,310,head?'M + m':'3m',C.ink,21,'middle')+arrow(340,300,130,0,C.green,'u',[12,5]);
  b+=axes(80,420,130,55)+txt(300,420,head?'u = 0,5 м·с⁻¹':'u = 4v ÷ 3',C.ink,21);y=470;
 }else if(['mass2','truck-mass','speed-ratio','momentum-ratio','mass-ratio'].includes(r.kind)){
  b+=txt(45,83,'Сравниваем модули: p = mv',C.ink,21);
  for(let i=0;i<2;i++){
   const cy=155+i*145,idx=['₁','₂'][i];b+=rect(80,cy-25,80,50)+txt(120,cy+7,'m'+idx,C.ink,21,'middle');b+=arrow(160,cy,150,0,C.blue,'p'+idx,[12,5])+arrow(100,cy-48,95,0,C.green,'v'+idx,[12,5]);
  }
  r.rows.forEach((v,i)=>{b+=txt(385,150+i*78,v[0],C.gray,18)+txt(385,180+i*78,v[1],C.ink,20)});
  b+=txt(45,425,'Направления осей — вдоль каждой скорости.',C.ink,19);y=475;
 }else{
  const brake=['stop','slow'].includes(r.kind);
  b+=txt(45,86,'Постоянная равнодействующая F',C.ink,21);
  b+=rect(255,145,90,65)+txt(300,185,'m',C.ink,21,'middle');
  b+=brake?arrow(255,178,-140,0,C.red,'F',[-12,5,'end']):arrow(345,178,140,0,C.blue,'F',[12,5]);
  b+=arrow(255,118,110,0,C.green,brake?'v₀':['delta','time','force','force-speed'].includes(r.kind)?'Δp→':'v',[12,5]);
  b+=axes(65,320,110,65);
  r.rows.forEach((v,i)=>{b+=txt(280,275+i*68,v[0],C.gray,18)+txt(280,304+i*68,v[1],C.ink,21)});
  y=485;
 }
 const panel=cards(r.stages,y);diagrams[r.id]=svg(r.id,r.title,r.diagramCaption,b+panel.body,panel.end+10);
}
module.exports={diagrams};
