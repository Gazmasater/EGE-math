const {records,model}=require('./physics-electro-statements');
const {C,txt,line,arrow,force,original,cards,svg}=require('../lib/physics-svg');
const diagrams={};
for(const r of Object.values(records)){
 let b='',y=102;const m=model(r);
 if(r.kind==='lc-constants'){
  b+=txt(35,86,'Обмен энергией в идеальном контуре',C.gray,21);
  const ox=80,oy=295,w=520,h=140;b+=arrow(ox,oy,w+18,0,C.gray,'t',[8,6])+arrow(ox,oy+12,0,-h-23,C.gray,'W',[-12,-5]);
  for(const[fn,col,label]of [[x=>Math.cos(2*Math.PI*x)**2,C.blue,'W_C'],[x=>Math.sin(2*Math.PI*x)**2,C.green,'W_L']]){
   const d=Array.from({length:161},(_,i)=>`${i?'L':'M'}${ox+w*i/160} ${oy-h*fn(i/160)}`).join(' ');b+=`<path d="${d}" stroke="${col}" stroke-width="3" fill="none"/>`;b+=txt(label==='W_C'?160:280,108,label,col,22);
  }
  b+=line(ox,oy-h,ox+w,oy-h,C.gray,1,'5 5')+txt(470,135,'W_C + W_L = const',C.ink,19,'middle');
  for(const [t,label]of [[.25,'T·0,25'],[.5,'T·0,5'],[.75,'T·0,75'],[1,'T']])b+=txt(ox+w*t,oy+29,label,C.gray,17,'middle');y=368;
 }else if(r.kind==='ampere'){
  b+=txt(35,81,'Силы на исходной схеме ФИПИ',C.gray,20);
  const im=original(r.images[0],110,125,435,350);b+=im.body;
  const A=r.northLeft?[.443,.972]:[.076,.908],B=r.northLeft?[.683,.746]:[.43,.687];
  const ax=im.X(A[0]),ay=im.Y(A[1]),bx=im.X(B[0]),by=im.Y(B[1]),mx=(ax+bx)/2,my=(ay+by)/2;
  b+=force(ax,ay,0,-58,C.green,'T₁',[-10,-7,'end'])+force(bx,by,0,-65,C.green,'T₂',[14,-6]);
  b+=force(mx,my,0,104,C.blue,'mg',[-12,12,'end'])+force(mx,my,0,r.northRight?-60:62,C.red,'F_А',[13,r.northRight?-8:7]);
  b+=arrow(600,249,0,-66,C.gray,'y',[10,-4])+arrow(556,283,61,0,C.gray,'x',[6,5]);
  b+=txt(562,339,'I: A → Б',C.blue,19)+txt(562,371,'вглубь',C.blue,18);
  y=125+im.h+112;
 }else if(r.kind==='beads'){
  b+=txt(35,82,'Силы взаимодействия; ось x вправо',C.gray,20);
  const im=original(r.images[0],90,158,500,170);b+=im.body;
  const points={
   '7D9E2D':[[.0762,.5079],[.481,.5079],[.881,.5079]],
   '1D068A':[[.063,.4848],[.4826,.4924],[.9087,.4848]],
   'BC0DA8':[[.0738,.5],[.4536,.4811],[.8279,.4811]],
   'AFC0C2':[[.071,.4906],[.4508,.4811],[.8224,.4717]],
   '07A6C6':[[.038,.5114],[.488,.5],[.94,.4886]],
   '602ECA':[[.0378,.5],[.4861,.4881],[.9343,.4762]]
  }[r.id];
  const cx=im.X(points[1][0]),cy=im.Y(points[1][1]),ax=im.X(points[0][0]),ay=im.Y(points[0][1]),bx=im.X(points[2][0]),by=im.Y(points[2][1]),dir=m.facts.FA;
  b+=force(ax,ay,dir*62,0,C.red,'F_A',[0,-21,'middle'])+force(bx,by,-dir*62,0,C.red,'F_B',[0,-21,'middle']);
  b+=arrow(495,107,93,0,C.gray,'x',[8,5]);
  const yy=158+im.h+67;b+=line(cx,cy+16,cx,yy,C.gray,1,'4 4')+arrow(cx,yy,m.facts.E*94,0,C.blue,'E_C',[m.facts.E*10,-12,m.facts.E>0?'start':'end']);y=yy+51;
 }else if(r.kind==='shuttle'){
  b+=txt(35,82,'Силы при движении к заземлённой пластине',C.gray,19);
  const im=original(r.images[0],135,117,320,420);b+=im.body;const x=im.X(r.id==='2786AC'?.4434:.431),z=im.Y(r.id==='2786AC'?.5123:.507);
  b+=force(x,z,0,-92,C.green,'T',[-14,-7,'end'])+force(x,z,0,85,C.blue,'mg',[-14,12,'end'])+force(x,z,65,0,C.red,'F_э',[13,-13]);
  b+=txt(471,238,'q > 0',C.red,23)+arrow(492,354,72,0,C.gray,'x',[7,6])+arrow(492,354,0,-60,C.gray,'y',[10,-3]);y=117+im.h+46;
 }else{
  b+=txt(35,82,'Исходный рисунок ФИПИ',C.gray,20);
  for(const [j,file]of r.images.entries()){
   const multi=r.images.length>1,im=original(file,multi?90+j*285:125,y+30,multi?230:420,multi?325:370);b+=im.body;
   if(r.kind==='plate'){
    const ax=im.X(r.rotated?.2905:.198),ay=im.Y(r.rotated?.1524:.644);
    // The hypothetical positive test charge is placed at the marked A.
    b+=force(ax,ay,r.rotated?65:0,r.rotated?0:-60,C.red,'F_э',[r.rotated?10:-14,r.rotated?-12:-7,r.rotated?'start':'end']);
    b+=txt(532,y+150,'q > 0',C.red,19);b+=r.rotated?arrow(532,y+212,70,0,C.gray,'x',[8,6]):arrow(586,y+244,0,-67,C.gray,'y',[11,-6]);
   }
   if(r.kind==='coils'){
    b+=txt(550,y+122,'z ⊙',C.gray,21)+txt(550,y+158,'к нам',C.gray,17);
    b+=txt(550,y+215,m.facts.B2toward?'B₂ ⊙':'B₂ ⊗',C.blue,22);
   }
   if(r.kind==='sphere')b+=txt(545,y+174,'E_B = 0',C.blue,19);
   if(!multi)y+=im.h+68;else if(j===r.images.length-1)y+=im.h+80;
  }
 }
 const cs=cards(r.stages,y+10);b+=cs.body;diagrams[r.id]=svg(r.id,r.title,r.diagramCaption,b,cs.end+16);
}
module.exports={diagrams};
