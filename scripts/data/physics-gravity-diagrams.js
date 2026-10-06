const {C,txt,line,arrow,original,cards,svg}=require('../lib/physics-svg');
const {records}=require('./physics-gravity');
const diagrams={};
const ball=(x,y,r,label,fill='#edf4ff')=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${C.ink}" stroke-width="2"/>`+txt(x,y+6,label,C.ink,18,'middle');
for(const r of Object.values(records)){
 let b='',start=105;
 if(r.images.length){b+=txt(30,77,'В условии требуется отношение',C.ink,18);b+=original(r.images[0],345,48,44,58).body;start=145;}
 r.diagramRows.forEach((row,i)=>{
  const y=start+i*218;
  b+=txt(35,y-18,r.pair?(i?'Новая пара':'Исходная пара'):(r.kind.startsWith('planet')?'Планета '+(i+1):i?'На новой орбите':'Исходное положение'),C.ink,20);
  if(r.pair){
   b+=ball(180,y+50,28,'')+ball(500,y+50,28,'')+txt(180,y+11,row[0],C.ink,18,'middle')+txt(500,y+11,row[1],C.ink,18,'middle');
   b+=arrow(202,y+50,90,0,C.blue,'F_A',[-44,-18])+arrow(478,y+50,-90,0,C.red,'F_B',[18,-18]);
   b+=line(180,y+103,500,y+103,C.gray,2,'4 4')+line(180,y+93,180,y+111,C.gray)+line(500,y+93,500,y+111,C.gray)+txt(340,y+131,row[2],C.ink,20,'middle');
   b+=arrow(470,y+153,90,0,C.gray,'x',[10,5]);
  }else{
   const surface=r.kind==='surface',height=r.kind==='height',center=170,radius=surface?55:height?45:32;
   const X=surface?center+r.radii[i]*radius:height?center+r.radii[i]*radius:480;
   b+=ball(center,y+48,radius,'M','#fff5e8')+ball(X,y+48,11,'');
   b+=txt(X+17,y+29,row[0],C.ink,19);
   const flen=surface&&i===0?40:height?55:84;
   b+=arrow(X,y+48,-flen,0,C.blue,row[2],height?[flen-15,-30,'middle']:[0,-16,'middle']);
   if(surface&&i===0)b+=arrow(X+12,y+48,65,0,C.green,'N',[10,5]);
   b+=line(center,y+119,X,y+119,C.gray,2,'4 4')+line(center,y+111,center,y+126,C.gray)+line(X,y+111,X,y+126,C.gray)+txt(385,y+146,row[1],C.ink,20,'middle');
   b+=arrow(555,y+79,-48,0,C.gray,'n',[-12,5,'end'])+arrow(555,y+79,0,-53,C.gray,'τ',[11,0]);
  }
 });
 const y=start+438;
 b+=txt(32,y,'Размеры, расстояния и длины стрелок условны.',C.gray,17);
 const panel=cards(r.stages,y+28);diagrams[r.id]=svg(r.id,r.title,r.diagramCaption,b+panel.body,panel.end+12);
}
module.exports={diagrams};
