const {C,txt,line,rect,dot,arrow,original,cards,svg}=require('../lib/physics-svg');
const {cases}=require('./physics-nucleus-cases');
const {records,reactionResult}=require('./physics-nucleus-solutions');
const catalog=require('./physics-completion-catalog.json');
const diagrams={};
for(const [id,r]of Object.entries(records)){
 const c=cases[id],t=catalog.find(t=>t.id===id);let body='',y=80;
 if(t.images.length){
  for(const file of t.images){const p=original(file,60,y,555,c.kind==='decay'?65:355);body+=p.body;y+=p.h+28;}
  y+=12;
 }else if(c.kind==='count'){
  body+=rect(55,100,245,130)+rect(380,100,245,130,'#ecf8f1')+
  txt(177,150,String(c.Z),C.blue,36,'middle')+txt(177,195,'протонов',C.ink,22,'middle')+
  txt(502,150,String(c.A-c.Z),C.green,36,'middle')+txt(502,195,'нейтронов',C.ink,22,'middle')+
  txt(340,170,'+',C.ink,30,'middle')+txt(340,285,`Всего ${c.A} нуклонов`,C.ink,25,'middle');y=325;
 }else if(c.kind==='reaction'){
  const {A,Z}=reactionResult(c);
  body+=rect(70,90,540,100)+txt(340,130,'Суммы A и Z сохраняются',C.ink,24,'middle')+
  txt(340,165,'до реакции → после реакции',C.ink,22,'middle')+
  arrow(340,205,0,50,C.blue)+rect(170,278,340,110,'#ecf8f1')+
  txt(340,320,'Неизвестное ядро X',C.ink,23,'middle')+txt(340,361,`A = ${A}; Z = ${Z}`,C.green,27,'middle');y=420;
 }else if(['decay','time','lambda'].includes(c.kind)){
  const x=80,Y=325,w=520,h=210;
  body+=arrow(x,Y,w+20,0,C.ink)+arrow(x,Y,0,-h-25,C.ink)+txt(30,78,'Доля нераспавшихся ядер',C.ink,21);
  const points=[];for(let i=0;i<=100;i++){const u=4*i/100;points.push(`${x+w*u/4},${Y-h*2**(-u)}`);}
  body+=`<polyline points="${points.join(' ')}" fill="none" stroke="${C.blue}" stroke-width="3"/>`;
  for(let i=0;i<=4;i++){const X=x+w*i/4,v=2**(-i);body+=line(X,Y,X,Y+6,C.ink)+txt(X,Y+28,String(i),C.ink,18,'middle')+dot(X,Y-h*v,C.blue);}
  body+=txt(x-16,Y-h+5,'1',C.ink,18,'end')+txt(x-16,Y-h/2+5,'0,5',C.ink,18,'end')+
  line(x,Y-h/2,x+w/4,Y-h/2,C.gray,1,'5 4')+line(x+w/4,Y-h/2,x+w/4,Y,C.gray,1,'5 4')+
  txt(340,Y+67,'Число прошедших периодов',C.ink,21,'middle');y=435;
 }
 const stage=cards(r.stages,y);diagrams[id]=svg(id,r.title,r.diagramCaption,body+stage.body,stage.end+15);
}
module.exports={diagrams};
