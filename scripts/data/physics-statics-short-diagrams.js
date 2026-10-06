const {C,txt,line,rect,dot,arrow,original,cards,svg}=require('../lib/physics-svg');
const {records}=require('./physics-statics-short');const diagrams={};
const f=x=>Number(x.toFixed(8)).toLocaleString('ru-RU',{useGrouping:false,maximumFractionDigits:8});
const axes=(x=555,y=150)=>arrow(x,y,60,0,C.gray,'x',[8,5])+arrow(x,y,0,-50,C.gray,'y',[10,0]);
const ball=(x,y,r=20)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#edf4ff" stroke="${C.ink}" stroke-width="2"/>`;
for(const r of Object.values(records)){
 let b='',y=535;const k=r.kind;
 if(r.images.length){
  const im=original(r.images[0],100,145,445,300);b+=im.body;
  const a=(x,z,dx,dz,c,label,off)=>arrow(im.X(x),im.Y(z),dx,dz,c,label,off);
  if(['5E50FD','97B7FB','C7E001'].includes(r.id)){
   const ox=r.id==='97B7FB'?.38:.596;
   b+=a(ox,.29,0,-20,C.green,'N',[24,0]);
   b+=txt(70,490,'F₁ = '+f(r.F1)+' Н; l₁ = '+f(r.l1*100)+' см',C.ink,21)+txt(70,523,'F₂ = '+f(r.F2)+' Н; l₂ = '+f(r.l2*100)+' см',C.ink,21);y=555;
  }else if(k==='arm-ratio'){
   b+=a(.065,.443,0,52,C.blue,'T₁',[-12,0,'end'])+a(.875,.443,0,52,C.blue,'T₂',[12,0]);
   b+=a(.58,.443,0,-48,C.green,'N',[15,0]);
   b+=txt(60,498,'m₁′ = 2m₁; d₁′ = d₁ ÷ 2',C.ink,22);
  }else if(k==='masses'){
   const pts=r.id==='D52A7D'?[.302,.795,.50,.48]:r.fish?[.105,.813,.50,.292]:[.098,.903,.345,.245];
   b+=a(pts[0],pts[3],0,58,C.blue,'T₁',[-12,0,'end'])+a(pts[1],pts[3],0,58,C.blue,'T₂',[12,0]);
   b+=a(pts[2],pts[3],0,-58,C.green,'N',[15,0]);
   b+=txt(65,491,r.divisions?'Плечи от оси: '+r.l1+'a и '+r.l2+'a':'m₁ = 0,5 кг; m₂ = 0,2 кг; l₂ = 15 см',C.ink,21);
   b+=txt(65,524,'На рычаг: T₁ = m₁g; T₂ = m₂g',C.ink,20);y=555;
  }else if(k==='stick'){
   b+=a(.347,.27,0,73,C.blue,'P = 80 Н',[-10,0,'end'])+a(.808,.273,0,78,C.blue,'F = 30 Н',[15,0]);
   b+=a(.51,.27,0,-95,C.green,'N',[18,0]);
   b+=txt(60,495,'OA = 30 см; OB = 80 см',C.ink,22);
  }else if(k==='bottom-tether'){
   b+=a(.49,.51,0,-80,C.green,'F_A',[15,0]);
   b+=a(.58,.48,0,85,C.purple,'mg',[15,0])+a(.424,.61,0,70,C.blue,'T',[-15,0,'end']);
   b+=txt(390,300,'F_A = 10 Н',C.green,20)+txt(390,341,'mg = 2 Н',C.purple,20)+txt(390,382,'T = 8 Н',C.blue,20);
   b+=txt(60,495,'Нить тянет коробку вниз',C.ink,22);
  }else if(k==='fluid-density'){
   b+=a(.515,.52,0,-65,C.blue,'T = 12 Н',[15,0]);
   b+=a(.44,.615,0,-65,C.green,'F_A',[-14,0,'end'])+a(.595,.61,0,75,C.purple,'mg',[15,0]);
   b+=txt(60,495,'T + F_A = 20 Н; F_A = 8 Н',C.ink,22);
  }else if(k==='support'){
   b+=a(.493,.323,0,87,C.purple,'P = 7,5 Н',[-18,15,'end']);
   b+=txt(60,497,'На рычаг: N ↑; на опору: P ↓',C.ink,22);
  }else if(k==='massive-lever'){
   b+=a(.278,.4,0,-88,C.green,'N',[-16,0,'end']);
   b+=a(.485,.4,0,63,C.blue,'T',[-14,0,'end'])+a(.595,.4,0,104,C.purple,'mg',[16,0]);
   b+=txt(65,495,'b = 1 м; L = 4 м; центр: L ÷ 2',C.ink,21);
  }else if(k==='wall-rod'){
   b+=a(.92,.758,-65,0,C.blue,'N_x',[0,25,'middle'])+a(.92,.758,0,-75,C.green,'N_y',[16,0]);
   b+=a(.503,.507,0,35,C.blue,'T',[18,0]);
   b+=txt(390,300,'α = 45°',C.ink,22)+txt(390,340,'T = mg = 10 Н',C.ink,20)+txt(390,380,'N = 5 Н',C.ink,22);
   b+=txt(60,495,'Реакции стен — горизонтальны',C.ink,21);
  }else if(k==='winch'){
   b+=a(.745,.885,0,64,C.purple,'mg',[15,0])+a(.745,.76,0,-62,C.blue,'T',[15,0]);
   b+=txt(450,320,'l = 0,6 м',C.ink,20)+txt(450,355,'R = 0,15 м',C.ink,20);
   b+=txt(60,514,'Плечо силы F максимально и равно l',C.ink,21);y=550;
  }else throw Error('Unhandled original '+r.id);
  b+=axes(570,105);
 }else if(k==='lever'||k==='moment'){
  const F1=r.F1??100,F2=r.F2??100,l1=r.l1??.5,l2=r.l2??.5;
  const left=100,right=555,ox=left+(right-left)*l1/(l1+l2),cy=230;
  b+=rect(left,cy-6,right-left,12,'#edf4ff')+`<path d="M${ox} ${cy+8}l-24 42h48z" fill="#fff5e8" stroke="${C.ink}" stroke-width="2"/>`;
  b+=arrow(left,cy,0,85,C.blue,'F₁',[-15,0,'end'])+arrow(right,cy,0,85,C.blue,'F₂',[15,0])+arrow(ox,cy,0,-85,C.green,'N',[15,0]);
  b+=txt(ox+15,cy-15,'O',C.ink,20)+line(left,370,ox,370,C.gray)+line(ox,370,right,370,C.gray);
  b+=txt((left+ox)/2,400,k==='moment'?'Первый момент':f(l1)+' м',C.ink,21,'middle')+txt((ox+right)/2,400,f(l2)+' м',C.ink,21,'middle');
  b+=txt(55,475,k==='moment'?'M₁ = 50 Н·м; F₂ = 100 Н':'F₁ = '+f(F1)+' Н; F₂ = '+f(F2)+' Н',C.ink,22);b+=axes();
 }else if(k.startsWith('hydro')||k==='patch'){
  b+=rect(145,170,290,240,'#e9f7ff')+line(140,115,140,415,C.ink,3)+line(440,115,440,415,C.ink,3)+line(140,415,440,415,C.ink,3)+line(145,170,435,170,C.blue);
  const depthEnd=k==='patch'?345:405;
  b+=line(95,170,95,depthEnd,C.gray)+line(86,170,104,170,C.gray)+line(86,depthEnd,104,depthEnd,C.gray)+txt(72,k==='patch'?257.5:294,'h',C.ink,22,'end');
  if(k==='patch'){
   b+=rect(432,326,16,35,'#fff5e8')+arrow(440,345,85,0,C.blue,'F',[10,5])+txt(180,275,'Керосин',C.ink,22)+txt(178,313,'h = 2 м',C.ink,21)+txt(70,473,'S = 10 см²; F = 16 Н',C.ink,22);
  }else{
   b+=txt(185,290,'ρ = '+f(r.rho)+' кг·м⁻³',C.ink,20)+txt(180,335,'h = '+f(r.h)+' м',C.ink,22);
   b+=arrow(290,410,0,53,C.blue,'pS',[15,0])+txt(55,510,'p — давление сверх атмосферного',C.ink,20);y=550;
  }b+=axes();
 }else if(k.startsWith('contact-')){
  b+=rect(205,213,240,130,'#fff5e8')+line(115,345,560,345,C.ink,4);
  b+=arrow(312,275,0,90,C.purple,'mg',[-15,0,'end'])+arrow(350,342,0,-105,C.green,'N',[15,0]);
  b+=txt(230,412,'Площадь S = '+f(r.S*10000)+' см²',C.ink,21)+txt(75,468,'P = N = mg; p = P ÷ S',C.ink,22)+axes();
 }else if(k==='float-force'||k==='float-mass'){
  b+=rect(100,265,465,140,'#e9f7ff')+line(100,265,565,265,C.blue);
  if(k==='float-force')b+=ball(315,280,68);else b+=`<path d="M185 222h260l-45 80H230z" fill="#fff5e8" stroke="${C.ink}" stroke-width="2"/>`;
  b+=arrow(285,268,0,-113,C.green,'F_A',[-15,0,'end'])+arrow(345,268,0,110,C.purple,'mg',[15,0]);
  b+=txt(65,468,'Плавание: F_A = mg',C.ink,23)+axes();
 }else if(['arch-volume','arch-cube','displaced-mass'].includes(k)){
  b+=rect(160,180,310,230,'#e9f7ff')+line(155,140,155,415,C.ink,3)+line(475,140,475,415,C.ink,3)+line(155,415,475,415,C.ink,3)+line(160,180,470,180,C.blue);
  b+=rect(270,255,90,90,'#fff5e8')+arrow(275,300,0,-80,C.green,'F_A',[-15,0,'end'])+arrow(355,300,0,78,C.purple,'mg',[15,0]);
  if(r.suspended){b+=line(320,85,320,255,C.gray)+line(280,85,360,85,C.ink,3)+arrow(320,255,0,-72,C.blue,'T',[15,0]);}
  b+=txt(65,478,k==='displaced-mass'?'F_A = вес вытесненной воды':'Полное погружение: V_погр = V',C.ink,22)+axes();
 }else throw Error('Unknown statics diagram '+k);
 const card=cards(r.stages,y);b+=card.body;
 diagrams[r.id]=svg(r.id,r.title,r.diagramCaption,b,card.end+14);
}
module.exports={diagrams};
