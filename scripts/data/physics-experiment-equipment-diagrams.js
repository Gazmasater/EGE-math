const {C,txt,line,rect,arrow,dot,cards,svg}=require('../lib/physics-svg');
const {records}=require('./physics-experiment-equipment');
const diagrams={};
const circle=(x,y,r,label,color=C.ink)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="white" stroke="${color}" stroke-width="2"/>`+(label?txt(x,y+7,label,color,20,'middle'):'');
for(const r of Object.values(records)){
 let b='',end=330;
 if(r.kind.startsWith('elastic')){
  if(r.kind==='elastic-mass'){
   b+=line(170,88,490,88)+line(330,88,330,115);
   b+='<path d="M330 115l-15 10 30 10 -30 10 30 10 -30 10 30 10 -15 10v25" fill="none" stroke="#263b53" stroke-width="3"/>';
   b+=rect(301,210,58,50)+txt(330,239,'m',C.ink,18,'middle');
   b+=arrow(330,210,0,-67,C.blue,'F_упр',[24,-5])+arrow(330,242,0,65,C.red,'mg',[16,-1]);
   b+=arrow(520,273,0,-100,C.gray,'y',[10,0]);
   b+=line(230,115,230,210,C.gray,2,'4 4')+txt(211,170,'l',C.ink,20,'end');end=345;
  }else{
   b+=line(110,110,110,265)+line(110,180,160,180);
   b+='<path d="M160 180l10 -14 12 28 12 -28 12 28 12 -28 12 28 10 -14H300" fill="none" stroke="#263b53" stroke-width="3"/>';
   b+=rect(380,154,130,52)+txt(445,186,'динамометр',C.ink,16,'middle')+line(300,180,380,180);
   b+=arrow(327,180,-63,0,C.blue,'F_упр',[-8,-20,'end'])+arrow(327,180,53,0,C.red,'T',[0,-21,'end']);
   b+=arrow(160,280,340,0,C.gray,'x',[12,6])+txt(310,250,'x = l − l₀',C.ink,20,'middle');end=320;
  }
 }else if(r.kind==='friction'){
  b+=line(80,215,600,215)+rect(260,145,130,70)+txt(320,185,'сталь',C.ink,18,'middle')+txt(180,248,'дерево',C.ink,18);
  b+=arrow(390,176,120,0,C.blue,'T',[13,6])+arrow(288,215,-100,0,C.red,'F_тр',[-10,-13,'end']);
  b+=arrow(306,212,0,-106,C.green,'N',[-12,-8,'end'])+arrow(345,180,0,106,C.purple,'mg',[16,1]);
  b+=arrow(98,128,60,0,C.gray,'x',[12,6])+arrow(98,128,0,-49,C.gray,'y',[10,0]);end=325;
 }else if(r.kind==='pendulum'){
  const x=395,y=258;b+=line(205,83,450,83)+line(290,83,x,y)+line(290,83,290,280,C.gray,2,'5 5');
  b+=circle(x,y,19,'');b+=txt(308,167,'l',C.ink,20)+txt(303,117,'θ',C.ink,20);
  b+=arrow(x,y,-49,-82,C.blue,'T_н',[23,-3])+arrow(x,y,0,91,C.red,'mg',[16,0]);
  b+=arrow(110,255,60,0,C.gray,'x',[12,6])+arrow(110,255,0,-65,C.gray,'y',[10,0]);end=385;
 }else if(r.kind==='density-force'||r.kind==='density-liquid'){
  const liquid=r.kind==='density-liquid';
  b+=txt(175,92,'В воздухе',C.ink,20,'middle')+(liquid?rect(150,169,50,60):circle(175,199,30,''))+txt(175,200,'m',C.ink,18,'middle');
  b+=line(175,108,175,169)+arrow(175,169,0,-50,C.blue,'T₀',[15,0])+arrow(175,208,0,79,C.red,'mg',[17,0]);
  b+=rect(396,128,170,165,'#e8f4ff')+line(396,162,566,162,C.blue)+(liquid?rect(465,207,42,54):circle(486,234,27,''))+line(486,102,486,207);
  if(!liquid)b+=line(396,190,566,190,C.gray,2,'5 5')+txt(578,168,'V₂',C.blue,18)+txt(578,196,'V₁',C.gray,18);
  if(liquid){b+=arrow(486,207,0,-88,C.blue,'T',[15,1])+arrow(474,248,0,-53,C.green,'F_А',[-15,0,'end'])+arrow(498,239,0,73,C.red,'mg',[17,1]);}
  b+=txt(480,333,liquid?'Полное погружение':'V = V₂ − V₁',C.ink,18,'middle');
  b+=arrow(72,248,0,-75,C.gray,'y',[10,0]);end=360;
 }else if(r.kind==='density-balance'){
  b+=rect(84,218,165,43)+txt(167,247,'весы: m',C.ink,20,'middle')+circle(167,188,30,'');
  b+=rect(397,114,131,162,'#e8f4ff')+line(397,157,528,157,C.blue)+circle(460,233,26,'');
  b+=line(397,193,528,193,C.gray,2,'5 5')+txt(543,163,'V₂',C.blue,20)+txt(543,199,'V₁',C.gray,20);end=315;
 }else if(['power','resistance','resistance-source'].includes(r.kind)){
  b+=line(105,150,220,150)+line(264,150,367,150)+(r.id==='0E00AC'?line(367,150,396,150)+circle(418,150,22,'')+line(404,136,432,164)+line(404,164,432,136)+line(440,150,468,150):rect(367,134,101,32))+line(468,150,567,150)+line(567,150,567,287)+line(567,287,372,287)+line(311,287,105,287)+line(105,287,105,150);
  b+=circle(242,150,22,'A')+txt(418,r.id==='0E00AC'?112:126,r.id==='0E00AC'?'лампа':'R',C.ink,18,'middle');
  b+=line(346,150,346,219)+line(346,219,396,219)+circle(419,219,23,'V')+line(442,219,491,219)+line(491,219,491,150)+dot(346,150)+dot(491,150);
  b+=line(336,267,336,307)+line(353,277,353,297)+line(311,287,336,287)+line(353,287,372,287)+txt(327,324,'+',C.ink,18)+txt(349,324,'−',C.ink,18);
  b+=arrow(122,115,70,0,C.blue,'I',[8,5])+txt(340,360,'Ключ и реостат в основной ветви не показаны',C.ink,17,'middle');end=385;
 }else if(r.kind==='lens'){
  b+=arrow(62,245,540,0,C.gray,'x',[13,6]);
  b+=arrow(130,245,0,-81,C.ink,'свеча',[-5,-15,'end']);
  b+=line(330,108,330,381,C.blue,3)+arrow(330,153,0,-44,C.blue)+arrow(330,338,0,42,C.blue);
  b+=line(530,115,530,373,C.ink,3)+txt(534,100,'экран',C.ink,18,'middle');
  b+=line(130,164,330,164,C.red)+line(330,164,530,326,C.red)+line(130,164,530,326,C.green);
  b+=arrow(530,245,0,81,C.ink)+txt(340,96,'линза',C.blue,18,'middle');
  b+=line(130,405,330,405,C.gray)+line(330,405,530,405,C.gray)+txt(230,433,'a',C.ink,20,'middle')+txt(430,433,'b',C.ink,20,'middle');end=460;
 }else if(r.kind==='refraction'){
  b+=rect(112,238,466,156,'#e8f4ff')+txt(500,370,'стекло',C.ink,18)+txt(495,165,'воздух',C.ink,18);
  b+=line(330,88,330,414,C.gray,2,'5 5')+arrow(179,87,151,151,C.blue)+arrow(330,238,63,156,C.red);
  b+='<circle cx="330" cy="238" r="135" stroke="#a6b3c2" stroke-dasharray="4 5" fill="none"/>';
  b+=line(234.54,142.54,330,142.54,C.green)+txt(275,130,'h₁',C.green,18,'middle');
  b+=line(330,363.18,380.56,363.18,C.purple)+txt(351,389,'h₂',C.purple,18,'middle');
  b+=txt(305,205,'α',C.blue,20)+txt(338,310,'β',C.red,20)+txt(339,91,'y',C.gray,18)+arrow(330,238,265,0,C.gray,'x',[10,7]);end=455;
 }
 const panel=cards(r.stages,end);diagrams[r.id]=svg(r.id,r.title,r.diagramCaption,b+panel.body,panel.end+12);
}
module.exports={diagrams};
