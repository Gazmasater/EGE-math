const {C,txt,rect,arrow,original,cards,svg}=require('../lib/physics-svg');
const {records}=require('./physics-experiment-pictures');
const diagrams={};
for(const r of Object.values(records)){
 let body='',y=65;
 // Every primary option remains an unaltered embedded raster.
 for(let i=0;i<5;i++){
  const x=28+(i%2)*316,Y=y+Math.floor(i/2)*270,selected=r.answer.includes(String(i+1));
  body+=rect(x,Y,300,252,selected?'#ecf8f1':'#f7f9fc')+txt(x+14,Y+27,'Установка '+(i+1)+(selected?' · выбрана':''),selected?C.green:C.ink,19);
  const o=original(r.images[i],x+16,Y+40,268,198);body+=o.body;
 }
 y+=810;
 if(r.kind==='slope'){
  body+=txt(28,y+15,'Силы на выбранных исходных установках',C.ink,21);y+=55;
  [...r.answer].forEach((n,i)=>{
   const x=45+i*316,o=original(r.images[Number(n)-1],x,y+82,250,160);
   body+=txt(x,y+10,'№ '+n,C.green,20)+o.body;
   body+=arrow(o.X(.46),o.Y(.37),0,96,C.red,'mg',[13,4]);
   body+=arrow(o.X(.55),o.Y(.47),22,-82,C.blue,'N',[12,-3]);
   body+=arrow(o.X(.39),o.Y(.42),-72,-19,C.purple,'F_тр',[-4,-14]);
   body+=arrow(x+170,y+292,61,16,C.gray,'x',[12,6])+arrow(x+170,y+292,14,-52,C.gray,'y',[10,0]);
  });y+=350;
 }else if(r.kind.startsWith('buoyancy')){
  body+=txt(28,y+15,'Равновесие полностью погружённых шариков',C.ink,21);y+=48;
  [...r.answer].forEach((n,i)=>{
   const x=46+i*316,o=original(r.images[Number(n)-1],x,y+29,278,253);
   const center=r.id==='72FC30'&&n==='1'?.55:.48,X=o.X(center),Y=o.Y(.86);
   body+=txt(x,y+8,'№ '+n,C.green,20)+o.body;
   body+=arrow(X+5,Y-7,0,-94,C.blue,'T_н',[18,0]);
   body+=arrow(X-10,Y-2,0,-58,C.green,'F_А',[-13,-2,'end']);
   body+=arrow(X,Y+7,0,72,C.red,'mg',[15,3]);
   body+=arrow(x+247,y+273,0,-57,C.gray,'y',[11,0]);
  });y+=348;
 }else if(r.kind.startsWith('charge')){
  body+=txt(44,y+15,'После зарядки: I_C = 0; I_R = ℰ ÷ (R + r)',C.blue,20);y+=49;
 }else if(r.kind.startsWith('current')){
  body+=txt(44,y+15,'Один ток через источник, амперметр и резистор',C.blue,19);y+=49;
 }
 const panel=cards(r.stages,y);diagrams[r.id]=svg(r.id,r.title,r.diagramCaption,body+panel.body,panel.end+12);
}
module.exports={diagrams};
