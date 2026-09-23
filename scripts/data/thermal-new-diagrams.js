const fs=require('node:fs'),path=require('node:path');
const {records}=require('./thermal-new');
const catalog=require('./thermal-catalog.json');
const C={ink:'#263b53',blue:'#175cd3',red:'#b42318',green:'#087f6d',purple:'#6941c6',gray:'#a6b3c2'};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const label=s=>esc(s).replace(/_([А-Яа-яA-Za-z0-9]+)/g,'<tspan baseline-shift="sub" font-size="70%">$1</tspan>');
const txt=(x,y,s,color=C.ink,size=20,anchor='start')=>`<text x="${x}" y="${y}" fill="${color}" font-size="${size}" text-anchor="${anchor}" paint-order="stroke" stroke="white" stroke-width="3" stroke-linejoin="round">${label(s)}</text>`;
const line=(x,y,X,Y,c=C.ink,w=2,dash='')=>`<line x1="${x}" y1="${y}" x2="${X}" y2="${Y}" stroke="${c}" stroke-width="${w}" ${dash?`stroke-dasharray="${dash}"`:''}/>`;
const rect=(x,y,w,h,c='#eef5ff')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}" stroke="${C.ink}" stroke-width="2"/>`;
const dot=(x,y,c=C.blue)=>`<circle cx="${x}" cy="${y}" r="4" fill="${c}"/>`;
function arrow(x,y,dx,dy,color=C.blue,s='',off=[10,-10,'start']){
 const key=Object.keys(C).find(k=>C[k]===color);
 return `<path d="M${x} ${y}l${dx} ${dy}" stroke="white" stroke-width="7" fill="none"/><path d="M${x} ${y}l${dx} ${dy}" stroke="${color}" stroke-width="3" fill="none" marker-end="url(#th-${key})"/>`+(s?txt(x+dx+off[0],y+dy+off[1],s,color,18,off[2]):'');
}
const force=(...a)=>arrow(...a)+dot(a[0],a[1],a[4]);
function dimensions(b){
 if(b[0]===137)return[b.readUInt32BE(16),b.readUInt32BE(20)];
 if(b.subarray(0,3).toString()==='GIF')return[b.readUInt16LE(6),b.readUInt16LE(8)];
 if(b[0]!==255||b[1]!==216)throw Error('Unknown raster');
 let n=2;while(n<b.length){if(b[n++]!==255)continue;let m=b[n++];if(m===0xd8||m===0xd9)continue;const len=b.readUInt16BE(n);if([0xc0,0xc1,0xc2].includes(m))return[b.readUInt16BE(n+5),b.readUInt16BE(n+3)];n+=len;}throw Error('JPEG dimensions');
}
function original(file,x,y,maxw,maxh){
 const b=fs.readFileSync(path.join(__dirname,'../../fipi-assets',file)),[iw,ih]=dimensions(b),s=Math.min(maxw/iw,maxh/ih),w=iw*s,h=ih*s;
 return {w,h,X:v=>x+w*v,Y:v=>y+h*v,body:`<image data-fipi-source="${esc(file)}" x="${x}" y="${y}" width="${w}" height="${h}" href="data:image/${b[0]===137?'png':b[0]===71?'gif':'jpeg'};base64,${b.toString('base64')}"/>`};
}
function forceOverlay(type,p,id){
 const f=(x,y,dx,dy,c,s,off)=>force(p.X(x),p.Y(y),dx,dy,c,s,off);
 let b='';
 if(type==='accelerated-piston'){
  b+=f(.35,.53,0,-90,C.blue,'pS',[-12,-10,'end'])+f(.62,.45,0,90,C.red,'p₀S',[14,9,'start'])+f(.50,.5,0,140,C.purple,'mg',[8,12,'start']);
  b+=arrow(575,290,0,-85,C.green,'a',[10,-5,'start']);
 }else if(type==='spring-piston'||type==='spring-open'){
  const open=type==='spring-open',x=open?.5:.43;
  b+=f(x,.4,95,0,C.blue,open?'p₀S':'pS',[-20,-16,'middle']);
  b+=f(x+.045,.65,-100,0,C.red,open?'pS':'p₀S',[-5,28,'middle']);
  b+=f(x,.54,open?100:-100,0,C.purple,'F_упр',[-10,-16,'middle']);
  b+=f(x+.02,.52,0,95,C.red,'mg',[12,8,'start']);
  b+=f(x+.02,.7,0,-140,C.green,'N',[12,-8,'start']);
 }else if(type==='stops-piston'||type==='stops-graph'){
  // The two raster cylinders remain untouched; arrows refer to their actual pistons.
  b+=f(.16,.45,0,-70,C.blue,'p₀S',[-10,-8,'end'])+f(.28,.39,0,90,C.red,'p₀S',[12,8,'start']);
  b+=f(.215,.43,0,135,C.purple,'Mg',[-10,8,'end'])+f(.32,.46,0,-115,C.green,'N',[10,-8,'start']);
  b+=f(.65,.28,0,-65,C.blue,'pS',[-10,-8,'end'])+f(.79,.22,0,85,C.red,'p₀S',[10,7,'start'])+f(.72,.26,0,130,C.purple,'Mg',[-9,8,'end']);
 }else if(type==='bullet-piston'){
  b+=f(.52,.48,110,0,C.blue,'pS',[8,-15,'start'])+f(.52,.48,0,85,C.red,'(M+m)g',[12,12,'start'])+f(.52,.72,0,-110,C.green,'N',[12,-8,'start']);
  b+=arrow(550,325,-95,0,C.ink,'Ox',[-12,7,'end']);
 }else if(type==='mercury-down'||type==='mercury-up'){
  const down=type==='mercury-down',x=down?.815:.79,y=down?.37:.53;
  b+=f(x-.012,y+.06,0,-105,C.blue,down?'p₀S':'p₂S',[-12,-8,'end']);
  b+=f(x+.012,y-.06,0,115,C.red,down?'p₂S':'p₀S',[14,5,'start']);
  b+=f(x+.02,y,0,150,C.purple,'mg',[25,8,'start']);
 }else if(type==='hot-balloon'){
  b+=f(.48,.4,0,-100,C.blue,'F_А',[-15,-6,'end'])+f(.55,.57,0,105,C.red,'(M+m)g',[12,8,'start']);
 }else if(type==='submerged-piston'){
  b+=f(.39,.44,0,-95,C.blue,'F_А',[-10,-7,'end'])+f(.56,.44,0,95,C.red,'mg',[15,8,'start'])+f(.47,.91,0,60,C.purple,'F_н',[12,9,'start']);
 }else if(type==='rotating-mercury'){
  b+=f(.77,.45,-110,0,C.blue,'pS',[-3,-15,'middle'])+f(.65,.49,110,0,C.red,'p₀S',[-5,30,'middle']);
  b+=f(.72,.46,0,80,C.purple,'mg',[12,10,'start'])+f(.72,.55,0,-95,C.green,'N',[12,-8,'start']);
  b+=arrow(450,335,-140,0,C.ink,'Ox к оси',[-8,8,'end']);
 }else if(type==='valve'){
  b+=f(.47,.29,0,-85,C.blue,'F',[10,-6,'start'])+f(.94,.72,0,90,C.red,'mg',[12,8,'start'])+f(.10,.26,0,105,C.purple,'R_A',[-14,5,'end']);
  b+=f(.47,.62,0,95,C.green,'F рычага',[12,5,'start']);
  b+=f(.34,.62,0,-70,C.blue,'ΔpS',[-15,-9,'end']);
 }else throw Error(id+': missing original force overlay '+type);
 return b;
}
function ownMechanical(type,id){
 let b='',h=390;
 if(['helium-balloon','hot-balloon','probe'].includes(type)){
  const gravity=id==='158BDB'||id==='2118C2'?'(m+nρгV)g':id==='2F460C'?'(M+m+q)g':id==='45F3AF'?'(M+m+ρV)g':'mg';
  const system=id==='158BDB'||id==='2118C2'?'Система: n шаров и человек':id==='2F460C'?'Гелий, оболочка и груз':'Оболочка, груз и горячий воздух';
  b+=`<ellipse cx="340" cy="155" rx="95" ry="100" fill="#ecf6ff" stroke="${C.ink}" stroke-width="2"/>`;
  b+=line(275,230,308,285)+line(405,230,372,285)+rect(307,285,66,42,'#fff2df');
  b+=txt(340,165,type==='hot-balloon'?'тёплый воздух':'гелий',C.ink,22,'middle');
  b+=force(285,150,0,-95,C.blue,'F_А',[-12,-8,'end'])+force(385,195,0,105,C.red,gravity,[12,8,'start']);
  b+=txt(340,365,type==='probe'?'У земли дополнительно F вниз':system,C.ink,19,'middle');
  if(type==='probe')b+=force(340,310,0,30,C.purple,'F',[12,5,'start']);
  b+=arrow(135,305,0,-175,C.ink,'Oy',[-10,-10,'middle']);
 }else if(type==='bubble'){
  b+=rect(115,80,440,240,'#e9f6ff')+line(110,80,560,80,C.blue,3);
  b+=`<circle cx="270" cy="270" r="20" fill="white" stroke="${C.blue}" stroke-width="2"/><circle cx="430" cy="145" r="29" fill="white" stroke="${C.blue}" stroke-width="2"/>`;
  b+=arrow(190,87,0,230,C.ink,'z',[12,0,'start'])+arrow(295,255,110,-83,C.green,'подъём',[-60,30,'middle']);
  b+=txt(270,310,'V₁',C.ink,20,'middle')+txt(430,112,'V₂',C.ink,20,'middle')+txt(340,360,'p(z) = p₀ + ρgz; p₁V₁ = p₂V₂',C.ink,22,'middle');
 }else if(type.startsWith('mercury')){
  const down=type==='mercury-down';
  b+=line(255,65,255,325,C.ink,3)+line(380,65,380,325,C.ink,3)+line(255,down?65:325,380,down?65:325,C.ink,3)+rect(257,177,121,55,'#bac2ce');
  b+=txt(317,down?132:280,'воздух',C.ink,20,'middle');
  b+=force(280,232,0,-105,C.blue,down?'p₀S':'p₂S',[-12,-8,'end'])+force(350,177,0,120,C.red,down?'p₂S':'p₀S',[12,6,'start'])+force(317,203,0,120,C.purple,'ρgSl',[12,8,'start']);
  b+=txt(340,365,down?'Отверстие внизу':'Отверстие вверху',C.ink,22,'middle');
  b+=arrow(135,305,0,-175,C.ink,'Oy',[-10,-10,'middle']);
 }else if(['horizontal-piston','friction-piston','horizontal-double-piston','cork'].includes(type)){
  const cork=type==='cork';
  if(cork&&id==='18E99E'){
   b+=`<path d="M230 325V190L280 160V100H360V160L410 190V325Z" fill="#eef5ff" stroke="${C.ink}" stroke-width="3"/>`+rect(282,90,76,35,'#dcb88b');
   b+=force(292,125,0,-75,C.blue,'pS',[-12,-9,'end'])+force(342,90,0,115,C.red,'p₀S',[12,8,'start'])+force(318,107,0,170,C.purple,'mg',[12,5,'start'])+force(282,107,0,120,C.green,'F_тр',[-12,5,'end']);
  }else{
   b+=rect(130,110,430,150)+rect(350,112,20,146,'#c9d0d8')+txt(235,190,cork?'газ':'газ 1',C.ink,22,'middle');
   b+=force(350,157,90,0,C.blue,cork?'ps':id==='399D49'?'p_г S':type==='horizontal-double-piston'?'p₁S':'pS',[0,-16,'middle']);
   if(type!=='friction-piston')b+=force(370,220,-100,0,C.red,type==='horizontal-double-piston'?'p₂S':cork?'p₀s':id==='399D49'?'pS':'p₀S',[-8,25,'middle']);
   if(type==='friction-piston'||cork)b+=force(365,188,-95,0,C.purple,id==='1D4573'?'F':'F_тр',[-10,-16,'middle']);
   if(!cork)b+=force(360,180,0,115,C.red,'Mg',[12,5,'start'])+force(360,255,0,-180,C.green,'N',[12,-8,'start']);
   b+=txt(470,190,type==='horizontal-double-piston'?'газ 2':type==='friction-piston'?'вакуум':'снаружи',C.ink,20,'middle');
  }
  b+=id==='18E99E'?arrow(140,320,0,-160,C.ink,'Oy',[-12,-8,'middle']):arrow(160,345,340,0,C.ink,'Ox',[12,5,'start']);
 }else{
  const double=type==='double-piston',vapor=type==='vapor-piston';
  if(!['double-piston','loaded-piston','sand-piston','vapor-piston'].includes(type))throw Error(id+': own mechanical '+type);
  b+=line(220,60,220,325,C.ink,3)+line(460,60,460,325,C.ink,3)+line(220,325,460,325,C.ink,3)+rect(222,180,236,22,'#c5ceda');
  if(double)b+=line(220,60,460,60,C.ink,3);
  if(type==='loaded-piston'||type==='sand-piston')b+=rect(308,141,64,38,'#edd8b4');
  if(vapor)b+=rect(222,295,236,28,'#b8ddf4');
  b+=txt(340,267,vapor?'пар':'газ',C.ink,23,'middle')+txt(340,104,double?'верхний газ':'p₀',C.ink,22,'middle');
  b+=force(270,202,0,-90,C.blue,double?'p_н S':'pS',[-12,-8,'end'])+force(425,180,0,100,C.red,double?'p_в S':'p₀S',[12,7,'start']);
  if(!vapor)b+=force(345,190,0,125,C.purple,type==='loaded-piston'?'(M+m)g':'mg',[12,6,'start']);
  b+=arrow(125,325,0,-215,C.ink,'Oy',[-12,-10,'middle']);
  if(vapor)b+=txt(340,365,'Весом лёгкого поршня пренебрегаем',C.ink,18,'middle');
 }
 return{body:b,h};
}
function plot(g,y){
 const maxX=Math.max(...g.points.map(p=>p[0]))*1.13,maxY=Math.max(...g.points.map(p=>p[1]))*1.18,X=x=>100+x/maxX*480,Y=v=>y+325-v/maxY*275;
 let b=txt(340,y+25,'Построение по уравнению состояния',C.ink,22,'middle');
 b+=arrow(100,y+325,515,0,C.ink)+arrow(100,y+325,0,-275,C.ink)+txt(617,y+359,g.x,C.ink,20,'end')+txt(105,y+48,g.y,C.ink,20);
 const xx=[...new Set(g.points.map(p=>p[0]))],yy=[...new Set(g.points.map(p=>p[1]))];
 for(const x of xx)b+=line(X(x),y+70,X(x),y+325,C.gray,1,'4 5')+txt(X(x),y+348,String(x).replace('.',','),C.ink,16,'middle');
 for(const v of yy)b+=line(100,Y(v),580,Y(v),C.gray,1,'4 5')+txt(89,Y(v)+5,String(v).replace('.',','),C.ink,16,'end');
 const pts=g.closed?[...g.points,g.points[0]]:g.points;
 for(let i=0;i<pts.length-1;i++){
  const a=pts[i],c=pts[i+1],kind=g.kinds[i];if(kind==='skip')continue;
  const at=t=>{const x=a[0]+(c[0]-a[0])*t;return[X(x),Y(kind==='hyperbola'?a[0]*a[1]/x:a[1]+(c[1]-a[1])*t)]};
  const coordinates=Array.from({length:41},(_,j)=>at(j/40));
  b+=`<path data-process-kind="${kind}" d="${coordinates.map((p,j)=>(j?'L':'M')+p.join(' ')).join('')}" fill="none" stroke="${C.blue}" stroke-width="3"/>`;
  const a1=at(.47),a2=at(.54);b+=arrow(a1[0],a1[1],a2[0]-a1[0],a2[1]-a1[1],C.blue);
 }
 g.points.forEach((p,i)=>{b+=dot(X(p[0]),Y(p[1]))+txt(X(p[0])+9,Y(p[1])-13,g.labels[i],C.ink,18)});
 return{body:b,h:395};
}
function words(s,max=53){const rows=[];let row='';for(const w of String(s).split(/\s+/)){if(row.length+w.length>max){rows.push(row);row=w}else row+=(row?' ':'')+w}if(row)rows.push(row);return rows;}
function cards(stages,y){let b='';for(const[i,stage]of stages.entries()){
 const rows=stage.flatMap((s,j)=>words(s,j?56:49).map(t=>({t,j}))),h=24+rows.length*27;
 b+=`<rect x="28" y="${y}" width="624" height="${h}" rx="12" fill="${['#edf4ff','#fff5e8','#ecf8f1'][i]}" stroke="#c6d3e1"/>`;
 rows.forEach((r,j)=>b+=txt(48,y+29+j*27,r.t,C.ink,r.j?18:20));y+=h+16;
 }return{body:b,end:y};}
function diagram(id,r){
 const item=catalog.find(t=>t.id===id);let b='',y=65;
 if(item.images.length){
  if(r.mechanical){
   const p=original(item.images[0],110,155,460,310);b+=txt(340,88,'Исходный рисунок ФИПИ и силы',C.ink,22,'middle')+p.body+forceOverlay(r.mechanical,p,id);
   y=Math.max(490,155+p.h+140);
   b+=arrow(55,y-65,0,-85,C.ink,'Oy',[-10,-10,'middle']);
   if(['spring-piston','spring-open'].includes(r.mechanical))b+=arrow(400,y-65,145,0,C.ink,'Ox',[10,6,'start']);
   if(r.mechanical==='spring-piston')b+=txt(340,y-24,'Вначале F_упр = 0; после смещения F_упр = kb',C.ink,19,'middle');
   for(const file of item.images.slice(1)){const p2=original(file,110,y,460,230);b+=p2.body;y+=p2.h+25;}
  }else{
   b+=txt(340,88,'Исходный рисунок ФИПИ',C.ink,22,'middle');y=108;
   for(const [index,file] of item.images.entries()){const p=original(file,70,y,540,id==='4E7BA7'&&index>0?60:300);b+=p.body;y+=p.h+25;}
  }
 }else if(r.mechanical){const p=ownMechanical(r.mechanical,id);b+=`<g transform="translate(0 ${y})" data-force-scheme="${r.mechanical}">${p.body}</g>`;y+=p.h+15;}
 let graph=r.graph;
 if(id==='A9E186')graph=null; // The dissociation curve already supplies the meaningful visual.
 if(id==='BB79C3')graph={points:[[1,1],[2,2]],kinds:['line'],labels:['1','2'],x:'V ÷ V₁',y:'p ÷ p₁'};
 if(graph){const p=plot(graph,y);b+=p.body;y+=p.h;}
 const c=cards(r.stages,y);b+=c.body;const h=c.end+15;
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 ${h}" role="img" aria-labelledby="th-title-${id}" data-thermal-diagram="${id}"><title id="th-title-${id}">${esc(r.diagramCaption)}</title><defs>${Object.entries(C).map(([k,c])=>`<marker id="th-${k}" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="${c}"/></marker>`).join('')}</defs><rect width="680" height="${h}" rx="14" fill="white"/><g font-family="Arial,sans-serif">${txt(28,36,id+' · Молекулярная физика и термодинамика',C.ink,22)}${b}</g></svg>`;
}
const diagrams=Object.fromEntries(Object.entries(records).map(([id,r])=>[id,diagram(id,r)]));
module.exports={diagrams,dimensions};
