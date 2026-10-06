const {records,slopes}=require('./physics-electro-analysis-graphs');
const {C,txt,line,arrow,force,original,cards,svg}=require('../lib/physics-svg');
const diagrams={};
for(const r of Object.values(records)){
 let b='',y=100;
 if(r.kind==='lc-table'){
  b+=txt(35,83,'Электрическая и магнитная энергия',C.gray,20);
  const x0=90,y0=310,w=500,h=150;
  b+=arrow(x0,y0,w+20,0,C.gray,'t, мкс',[5,7])+arrow(x0,y0,0,-h-25,C.gray,'W',[-14,-7]);
  b+=line(x0,y0-h,x0+w,y0-h,C.gray,1,'5 5');
  for(const [key,col]of [['C',C.blue],['L',C.green]]){
   const d=Array.from({length:201},(_,j)=>{const a=2*Math.PI*j/200,q=r.quantity==='U'?Math.sin(a)**2:Math.cos(a)**2,v=key==='C'?q:1-q;return `${j?'L':'M'}${x0+w*j/200} ${y0-h*v}`;}).join(' ');
   b+=`<path d="${d}" fill="none" stroke="${col}" stroke-width="3"/>`;
  }
  b+=txt(195,115,'W_C',C.blue,21)+txt(315,115,'W_L',C.green,21)+txt(440,115,'W_C + W_L = W',C.ink,18);
  for(let j=0;j<=4;j++)b+=txt(x0+w*j/4,y0+28,String(r.T*j/4),C.gray,17,'middle');y=378;
 }else if(r.kind==='rod'){
  const rates=slopes(r.t,r.s),idx=rates.findIndex(v=>v!==0),direction=Math.sign(rates[idx]);
  b+=txt(35,82,`Силы внутри интервала ${r.t[idx]}–${r.t[idx+1]} с`,C.gray,20);
  const im=original(r.images[0],120,138,470,260);b+=im.body;
  const relx=r.id==='86F713'?.128:.203,px=im.X(relx),py=im.Y(.33);
  b+=force(px,py,72*direction,0,C.red,'F_А',[0,-14,'middle'])+force(px,py,-72*direction,0,C.green,'F_внеш',[0,-14,'middle']);
  b+=arrow(480,110,95,0,C.gray,'x',[9,5]);y=138+im.h+46;
  b+=txt(35,y,direction>0?'S растёт: проводник движется влево.':'S убывает: проводник движется вправо.',C.ink,19);
  const graph=original(r.images[1],170,y+34,360,360);b+=graph.body;y+=graph.h+105;
 }else{
  b+=txt(35,82,'Исходные рисунки ФИПИ',C.gray,20);
  if(r.images.length>1){let h=0;for(const[j,file]of r.images.entries()){const im=original(file,42+j*310,126,282,330);b+=im.body;h=Math.max(h,im.h);}y=126+h+46;}
  else{const im=original(r.images[0],r.kind==='lamp'?35:105,118,r.kind==='lamp'?610:470,390);b+=im.body;y=118+im.h+42;}
 }
 const cs=cards(r.stages,y);b+=cs.body;diagrams[r.id]=svg(r.id,r.title,r.diagramCaption,b,cs.end+18);
}
module.exports={diagrams};
