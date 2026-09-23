const {C,txt,line,dot}=require('../lib/physics-svg');
function refractionDiagram(kind,y,{ray}){
 let b='',h=520;
 if(kind==='water-raft'){
  const sy=y+170,bottom=sy+.8*Math.sqrt(7)*70,cx=340,edge=cx+2.4*70;
  b+=txt(340,y+25,'Предельный световой круг перекрыт плотом',C.ink,21,'middle');
  b+=`<rect x="45" y="${sy}" width="590" height="${bottom-sy}" fill="#edf6ff"/>`+line(45,sy,635,sy,C.blue,2)+line(45,bottom,635,bottom,C.ink,3)+line(cx-168,sy,edge,sy,C.ink,9);
  b+=line(cx,sy,cx,bottom,C.gray,1.5,'5 5')+ray(cx,bottom,cx,sy,C.green);
  for(const x of [cx-168,edge])b+=ray(cx,bottom,x,sy,C.blue);
  b+=ray(cx,bottom,570,sy,C.purple)+ray(570,sy,625,sy+(bottom-sy)*55/230,C.purple)+line(570,sy-45,570,sy+65,C.gray,1.5,'5 5');
  b+=dot(cx,bottom,C.red)+txt(cx,bottom+28,'S',C.red,20,'middle')+txt(cx-15,(sy+bottom)/2,'H',C.ink,20,'end')+txt(cx+30,bottom-45,'θ_кр',C.blue,18);
  b+=line(cx,sy-35,edge,sy-35,C.ink,1.5)+txt((cx+edge)/2,sy-48,'R',C.ink,20,'middle')+txt(90,sy+90,'n = 4 ÷ 3',C.ink,20);
  b+=txt(340,y+405,'Вне светового круга: полное внутреннее отражение',C.ink,18,'middle')+txt(340,y+458,'R = H tg θ_кр; H = R√(n² − 1)',C.ink,21,'middle');
 }else if(kind==='water-submerged'||kind==='water-emerged'){
  const emerged=kind==='water-emerged',depth=emerged?2:3,above=emerged?1:0,height=emerged?3:Math.sqrt(55)/4,scale=emerged?90:85,sy=y+(emerged?200:130),bottom=sy+depth*scale,px=emerged?260:285,top=bottom-height*scale,tb=3/Math.sqrt(55),ta=1/Math.sqrt(3),entry=emerged?px+above*scale*ta:px-(depth-height)*scale*tb,end=entry+depth*scale*tb;
  b+=txt(340,y+25,emerged?'Тень надводной и подводной частей сваи':'Тень полностью погружённой сваи',C.ink,22,'middle');
  b+=`<rect x="45" y="${sy}" width="590" height="${bottom-sy}" fill="#edf6ff"/>`+line(45,sy,635,sy,C.blue,2)+line(45,bottom,635,bottom,C.ink,2)+line(px,top,px,bottom,C.ink,7)+line(px,bottom,end,bottom,C.ink,8);
  const startY=emerged?top-45:sy-75,startX=entry-(sy-startY)*ta;
  b+=ray(startX,startY,entry,sy,C.blue)+ray(entry,sy,end,bottom,C.blue)+line(entry,sy-60,entry,sy+80,C.gray,1.5,'5 5');
  b+=txt(entry-28,sy-20,'α',C.ink,19,'end')+txt(entry+20,sy+48,'β',C.ink,19)+txt(px-20,top+25,emerged?'h = 1 м':'h',C.ink,19,'end')+txt(75,sy+95,'n = 4 ÷ 3',C.ink,20);
  b+=txt((px+end)/2,bottom+35,emerged?'L ≈ 1,39 м':'L = 0,75 м',C.ink,19,'middle')+txt(340,y+480,emerged?'L = h tg α + H tg β; H = 2 м':'L = h tg β; глубина воды 3 м',C.ink,20,'middle');
 }else if(kind==='prism-upper'){
  const X=x=>80+x,Y=v=>y+345-v,t=Math.tan(Math.PI/6),a=[X(0),Y(0)],bb=[X(320),Y(320*t)],c=[X(320),Y(0)],q=[X(220),Y(220*t)],dv=220*t-100*t,exit=[X(320),Y(dv)];
  b+=txt(340,y+25,'AB — зеркало; выход через вертикальную BC',C.ink,21,'middle')+`<path d="M${a}L${bb}L${c}Z" fill="#edf6ff" stroke="${C.ink}" stroke-width="2"/>`+line(...a,...bb,C.ink,6);
  b+=ray(X(220),Y(-80),...q,C.blue)+ray(...q,...exit,C.blue)+ray(...exit,X(420),Y(dv-100),C.blue);
  b+=line(q[0]-25,q[1]-43,q[0]+25,q[1]+43,C.gray,1.5,'5 5')+line(exit[0]-65,exit[1],exit[0]+110,exit[1],C.gray,1.5,'5 5');
  b+=txt(a[0]-18,a[1]+8,'A',C.ink,20)+txt(bb[0]+10,bb[1]-5,'B',C.ink,20)+txt(c[0]+10,c[1]+20,'C',C.ink,20)+txt(X(46),Y(10),'α',C.ink,20);
  b+=txt(exit[0]-42,exit[1]-13,'β',C.ink,19)+txt(exit[0]+40,exit[1]+28,'γ',C.ink,19)+txt(340,y+465,'β = 90° − 2α = 30°; γ = 45°',C.ink,20,'middle');
 }else if(kind==='prism-lower'){
  const t=Math.tan(Math.PI/12),X=x=>80+x,Y=v=>y+330-v,a=[X(0),Y(0)],bb=[X(420),Y(420*t)],c=[X(420),Y(0)],inX=260,inY=inX*t,qX=inX+inY*t,outX=qX/(1-t*t),outY=outX*t;
  b+=txt(340,y+25,'AC — зеркало; вход и выход через AB',C.ink,22,'middle')+`<path d="M${a}L${bb}L${c}Z" fill="#edf6ff" stroke="${C.ink}" stroke-width="2"/>`+line(...a,...c,C.ink,6);
  b+=ray(X(inX-80*Math.sin(Math.PI/12)),Y(inY+80*Math.cos(Math.PI/12)),X(inX),Y(inY),C.blue)+ray(X(inX),Y(inY),X(qX),Y(0),C.blue)+ray(X(qX),Y(0),X(outX),Y(outY),C.blue)+ray(X(outX),Y(outY),X(outX+100),Y(outY+100),C.blue);
  b+=line(X(qX),Y(-35),X(qX),Y(50),C.gray,1.5,'5 5')+line(X(outX-30*Math.sin(Math.PI/12)),Y(outY+30*Math.cos(Math.PI/12)),X(outX+30*Math.sin(Math.PI/12)),Y(outY-30*Math.cos(Math.PI/12)),C.gray,1.5,'5 5');
  b+=txt(a[0]-20,a[1]+8,'A',C.ink,20)+txt(bb[0]+10,bb[1]-5,'B',C.ink,20)+txt(c[0]+10,c[1]+20,'C',C.ink,20)+txt(X(55),Y(8),'α',C.ink,20);
  b+=txt(340,y+405,'На зеркале: угол падения равен углу отражения',C.ink,18,'middle')+txt(340,y+455,'На выходе: i = 2α = 30°; β = 60°',C.ink,21,'middle');
 }else throw Error('Unknown refraction '+kind);
 return{body:b,h};
}
module.exports={refractionDiagram};
