const {C,txt,line,rect,arrow,cards,svg,original}=require('../lib/physics-svg');
const {records}=require('./physics-experiment-tables');
const diagrams={};
const ball=(x,y,r)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#eef5ff" stroke="${C.ink}" stroke-width="2"/>`;
for(const r of Object.values(records)){
 let body='',y=76;
 const xs=[28,80,264,436,652],rowh=45;
 for(let n=0;n<6;n++){
  const selected=n&&r.answer.includes(r.rows[n-1][0]);
  body+=rect(28,y+n*rowh,624,rowh,n===0?'#edf4ff':selected?'#e5f5e8':'white');
  const row=n?[...r.rows[n-1]]:['№',...r.headers];
  for(let j=0;j<4;j++){
   if(j)body+=line(xs[j],y+n*rowh,xs[j],y+(n+1)*rowh,C.gray,1);
   body+=txt((xs[j]+xs[j+1])/2,y+n*rowh+29,row[j],selected?C.green:C.ink,16,'middle');
  }
 }
 y+=6*rowh+32;
 body+=txt(34,y,'Выбраны строки '+r.answer[0]+' и '+r.answer[1],C.green,19);y+=30;
 if(r.images.length){
  const pic=original(r.images[0],230,y,240,215);body+=pic.body;
  body+=arrow(185,y+55,0,100,C.blue,'I',[-15,5,'end']);
  y+=pic.h+30;
 }else if(r.kind.startsWith('pendulum')){
  const ox=280,oy=y+5,x=365,by=y+165;
  body+=line(220,oy,440,oy)+line(ox,oy,x,by)+line(ox,oy,ox,by+30,C.gray,2,'4 4')+ball(x,by,18);
  body+=txt(304,y+94,'l',C.ink,20)+txt(286,y+50,'θ',C.ink,18);
  body+=arrow(x,by,-46,-87,C.blue,'T_н',[23,-2])+arrow(x,by,0,76,C.red,'mg',[16,1]);
  body+=arrow(x+20,by-11,98,-52,C.gray,'τ',[12,1]);
  y+=278;
 }else if(r.kind.startsWith('spring')){
  body+=line(245,y,420,y)+line(330,y,330,y+18);
  body+=`<path d="M330 ${y+18}l-14 10 28 10 -28 10 28 10 -28 10 28 10 -14 10v20" fill="none" stroke="${C.ink}" stroke-width="3"/>`;
  body+=rect(303,y+108,54,50)+txt(330,y+139,'m',C.ink,18,'middle');
  body+=arrow(330,y+108,0,-83,C.blue,'F_упр',[32,4])+arrow(330,y+140,0,63,C.red,'mg',[18,1]);
  body+=line(375,y+110,535,y+110,C.gray,2,'5 5')+txt(545,y+116,'0',C.gray,18);
  body+=arrow(508,y+110,0,110,C.gray,'x',[12,3]);
  y+=249;
 }else if(r.kind.startsWith('buoyancy')){
  body+=rect(218,y+16,235,185,'#e8f4ff')+line(218,y+49,453,y+49,C.blue)+ball(338,y+130,29);
  body+=arrow(326,y+133,0,-74,C.green,'F_А',[-17,-2,'end']);
  if(r.id==='FB279F'){
   body+=line(353,y+156,353,y+201)+arrow(355,y+146,0,87,C.purple,'F_уд',[18,0]);
   body+=arrow(327,y+147,0,50,C.red,'mg',[-16,-10,'end']);
  }else{
   body+=line(349,y-5,349,y+105)+arrow(349,y+110,0,-99,C.blue,'T_н',[18,-3]);
   body+=arrow(348,y+144,0,88,C.red,'mg',[18,0]);
  }
  body+=arrow(160,y+184,0,-92,C.gray,'y',[11,0])+txt(333,y+264,'Полное погружение',C.ink,18,'middle');
  y+=291;
 }
 if(r.id==='FCC2D6'){
  const note=cards([['Единица объёма','В условии опечатка «см²»; для объёма верно «см³». Равные значения 60 сохраняются.']],y);body+=note.body;y=note.end;
 }
 const stages=r.stages.map(stage=>[...stage]);
 if(r.kind.startsWith('lc')){const a=r.rows.find(row=>row[0]===r.answer[0]);stages[1][1]=(r.id==='27C6C4'?'I_max = ':'U_max = ')+a[1]+' '+r.units[0]+'; L = '+a[3]+' мГн';}
 const panel=cards(stages,y);body+=panel.body;
 diagrams[r.id]=svg(r.id,r.title,r.diagramCaption,body,panel.end+12);
}
module.exports={diagrams};
