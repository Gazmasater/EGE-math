const fs=require('node:fs'),path=require('node:path');
const sources=require('./conservation-sources.json');
const C={ink:'#344054',blue:'#175cd3',red:'#b42318',green:'#087f6d',purple:'#6941c6',orange:'#b54708',grid:'#98a2b3'};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const sub=s=>esc(s).replace(/_([А-Яа-яA-Za-z0-9]+)/g,'<tspan baseline-shift="sub" font-size="70%">$1</tspan>');
const text=(x,y,s,c=C.ink,size=19,anchor='start')=>`<text x="${x}" y="${y}" fill="${c}" font-size="${size}" text-anchor="${anchor}" paint-order="stroke" stroke="white" stroke-width="4" stroke-linejoin="round">${sub(s)}</text>`;
const line=(x,y,X,Y,c=C.ink,w=2,dash='')=>`<line x1="${x}" y1="${y}" x2="${X}" y2="${Y}" stroke="${c}" stroke-width="${w}" ${dash?`stroke-dasharray="${dash}"`:''}/>`;
const dot=(x,y,c=C.ink,r=3)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;
function arrow(x,y,dx,dy,c=C.blue,label='',offset){const[lx,ly,anchor]=offset||[dx< -5?-9:9,dy>5?22:-10,dx< -5?'end':'start'];return `<path d="M${x} ${y}l${dx} ${dy}" stroke="white" stroke-width="7" fill="none"/><path d="M${x} ${y}l${dx} ${dy}" stroke="${c}" stroke-width="3" fill="none" marker-end="url(#cs-${Object.keys(C).find(k=>C[k]===c)})"/>`+(label?text(x+dx+lx,y+dy+ly,label,c):'');}
const force=(...a)=>arrow(...a)+dot(a[0],a[1],a[4]||C.blue);
const ball=(x,y,r=16,c=C.blue)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#eff8ff" stroke="${c}" stroke-width="2"/>`;
const block=(x,y,w=65,h=42)=>`<rect x="${x-w/2}" y="${y-h/2}" width="${w}" height="${h}" rx="4" fill="#eff8ff" stroke="${C.ink}" stroke-width="2"/>`;
const axes=(x,y,dx=1)=>arrow(x,y,dx*65,0,C.ink,'Ox')+arrow(x,y,0,-55,C.ink,'Oy');
function wrap(id,title,body,h=610){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 ${h}" role="img" aria-labelledby="cs-title-${id}" data-conservation-diagram="${id}"><title id="cs-title-${id}">${esc(title)}</title><defs>${Object.entries(C).map(([k,c])=>`<marker id="cs-${k}" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="${c}"/></marker>`).join('')}</defs><g font-family="Arial,sans-serif"><rect width="680" height="${h}" rx="12" fill="white"/>${text(26,34,title,C.ink,22)}${body}</g></svg>`;}
function original(id,x=100,y=150,w=470){const p=sources[id].images[0],bytes=fs.readFileSync(path.join(__dirname,'../../fipi-assets',p)),gif=/\.gif$/i.test(p),iw=gif?bytes.readUInt16LE(6):bytes.readUInt32BE(16),ih=gif?bytes.readUInt16LE(8):bytes.readUInt32BE(20),s=w/iw,h=ih*s;return{body:`<image data-fipi-source="${p}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet" href="data:image/${gif?'gif':'png'};base64,${bytes.toString('base64')}"/>`,X:a=>x+s*a,Y:a=>y+s*a,s,w,h,iw,ih};}
const diagrams={};

for(const id of ['17257D','63FE2B']){
 const p=original(id,115,95,450),down=id==='17257D',a=down?[152,106]:[95,156],b=down?[176,155]:[119,109];
 diagrams[id]=wrap(id,'Скорость по наклону графика координаты',p.body+line(p.X(a[0]),p.Y(a[1]),p.X(b[0]),p.Y(b[1]),C.blue,5)+dot(p.X(a[0]),p.Y(a[1]),C.blue,5)+dot(p.X(b[0]),p.Y(b[1]),C.blue,5)+text(340,495,down?'4–5 мин: vₓ=−10 м·с⁻¹':'2–3 мин: vₓ=10 м·с⁻¹',C.blue,23,'middle')+text(340,547,down?'E_к=85 кДж':'E_к=87,5 кДж',C.ink,24,'middle'),590);
}
{
 const id='49A293',p=original(id,100,115,480);
 diagrams[id]=wrap(id,'Полная энергия и выход из ямы',p.body+line(p.X(62),p.Y(53),p.X(207),p.Y(53),C.blue,3,'8 6')+text(325,90,'E=4 Дж',C.blue,24,'middle')+arrow(p.X(166),p.Y(95),-85,0,C.orange,'v₀',[-8,35,'end'])+arrow(420,490,105,0,C.green,'выход',[0,30,'middle'])+text(340,557,'Левый барьер > E; правый барьер < E',C.ink,21,'middle'),600);
}
{
 const id='24CD61',p=original(id,145,215,410);
 diagrams[id]=wrap(id,'Разгон при распрямлении пружины',p.body+force(p.X(25),p.Y(36),0,110,C.red,'mg')+force(p.X(25),p.Y(61),0,-150,C.green,'N')+force(p.X(51),p.Y(37),-115,0,C.purple,'F_упр')+axes(105,520,-1)+text(440,476,'x₀=1 см',C.blue,25,'middle')+text(340,559,'Энергия пружины = энергия бруска',C.ink,22,'middle'));
}
{
 const id='C594F9',p=original(id,105,135,470),x=p.X(106),y=p.Y(159);
 diagrams[id]=wrap(id,'Пробой шара в нижней точке',p.body+force(x,y,0,-130,C.green,'T',[12,-9,'start'])+force(x,y,0,100,C.red,'Mg')+arrow(x-6,y-18,-85,0,C.purple,'v → u',[-10,-10,'end'])+axes(540,530,-1)+text(120,560,'v=3; u=2 м·с⁻¹',C.purple,23)+text(340,620,'|Δp|=1 кг·м·с⁻¹',C.blue,24,'middle'),665);
}
{
 const id='2C62B8',p=original(id,210,95,260);
 diagrams[id]=wrap(id,'Отдача пробирки и предел натяжения',p.body+force(p.X(52),p.Y(116),0,-95,C.green,'T',[-12,-8,'end'])+force(p.X(102),p.Y(116),0,-95,C.green,'T',[12,-30,'start'])+force(p.X(80),p.Y(124),0,85,C.red,'Mg')+arrow(225,445,-90,0,C.purple,'u')+arrow(480,445,80,0,C.blue,'v')+axes(150,560)+text(400,545,'2T−Mg=Mu²·L⁻¹',C.ink,22,'middle')+text(400,590,'L_max=20 см',C.blue,24,'middle'),640);
}
{
 const id='5BCC1F',p=original(id,125,205,410),x=p.X(20),y=p.Y(57),slope=.64;
 diagrams[id]=wrap(id,'Подъём с трением и отрыв от трубы',p.body+force(x,y,0,95,C.red,'mg')+force(x,y,-52,-81.25,C.green,'N')+force(x,y,-75,48,C.orange,'F_тр',[-8,30,'end'])+arrow(p.X(70),p.Y(18),70,42,C.ink,'Or',[10,15,'start'])+text(450,150,'В B: N_B=0',C.green,22,'middle')+arrow(380,500,65,-65*slope,C.ink,'Os')+arrow(380,500,-25,-44,C.ink,'On')+text(440,560,'μ≈0,146',C.blue,25,'middle'),615);
}
{
 const id='B46C29',p=original(id,125,135,420),x=p.X(46),y=p.Y(67);
 diagrams[id]=wrap(id,'Упругое отражение от наклонной доски',p.body+force(x,y,55,-95,C.green,'N')+force(x,y,0,82,C.red,'mg')+arrow(x+8,y-8,110,-63.5,C.blue,'v после',[10,0,'start'])+axes(120,515)+text(390,510,'cos2α=0,5',C.blue,23,'middle')+text(390,558,'α=30°',C.ink,25,'middle'),610);
}
for(const id of ['B8E9D0','7CF459']){
 const p=original(id,90,220,510),numeric=id==='B8E9D0',xy=numeric?[43,94]:[35,79],x=p.X(xy[0]),y=p.Y(xy[1]);
 diagrams[id]=wrap(id,'Энергия пружины и дальность полёта',p.body+force(x,y,0,105,C.red,'mg')+force(x,y,-45,-78,C.green,'N')+force(x,y,94,-54.3,C.purple,'F_упр')+axes(80,550)+text(440,455,'Подъём в стволе: b sinα',C.ink,20,'middle')+text(440,507,'Вылет: E=mv²·0,5+mgb sinα',C.ink,20,'middle')+text(340,566,numeric?'L≈0,987 м':'L=v²sin2α·g⁻¹',C.blue,24,'middle'),620);
}
{
 const id='BE3A9E',p=original(id,80,210,520);
 let b=p.body+force(p.X(38),p.Y(43),0,110,C.red,'m₁g')+force(p.X(343),p.Y(43),0,110,C.red,'m₂g')+force(p.X(125),p.Y(30),0,-70,C.green,'N_C')+force(p.X(297),p.Y(30),0,-140,C.green,'N_D');
 b+=axes(75,485)+text(415,455,'N_D=2N_C',C.green,25,'middle')+text(340,524,'AC=0,2 м; CD=0,6 м; AB=1 м',C.ink,22,'middle');
 diagrams[id]=wrap(id,'Равновесие стержня с двумя шарами',b,580);
}
{
 const id='DA269B',p=original(id,105,150,455);
 let b=p.body+force(p.X(182),p.Y(58),-93,0,C.green,'N₁',[-8,-15,'end'])+force(p.X(182),p.Y(58),0,95,C.red,'mg',[12,20,'start'])+force(p.X(115),p.Y(126),0,-120,C.green,'N₂',[-12,-8,'end'])+force(p.X(115),p.Y(119),0,102,C.red,'Mg')+force(p.X(115),p.Y(126),100,0,C.orange,'F_тр',[10,30,'start'])+axes(125,540)+text(435,535,'M≥140 г',C.blue,25,'middle');
 diagrams[id]=wrap(id,'Гантель: реакции, трение и моменты',b,610);
}
{
 const id='049666',p=original(id,235,90,230),x=p.X(80),y=p.Y(83),X=p.X(86);
 diagrams[id]=wrap(id,'Неупругий удар двух подвешенных шариков',p.body+force(x,y,0,-105,C.green,'T₁',[-12,-6,'end'])+force(X+5,y,0,-150,C.green,'T₂')+force(x,y,0,80,C.red,'mg',[-14,22,'end'])+force(X+5,y,0,120,C.red,'Mg')+arrow(x-110,y+25,85,0,C.blue,'v',[0,30,'middle'])+axes(140,505)+text(430,485,'u=v·⅓',C.blue,24,'middle')+text(430,537,'Q=2E_к',C.ink,26,'middle'),595);
}
{
 const id='01DB3F',p=original(id,80,195,520),x=p.X(189),y=p.Y(21);
 diagrams[id]=wrap(id,'Давление на стенку мёртвой петли',p.body+force(x,y,-60,41.25,C.green,'N=F',[0,-118,'middle'])+force(x,y,0,105,C.red,'mg')+text(450,440,'Or — к центру окружности',C.ink,18,'middle')+axes(140,495)+text(420,480,'v²=15 м²·с⁻²',C.blue,23,'middle')+text(420,535,'H=3,25 м',C.ink,25,'middle'),590);
}
{
 const id='587384',p=original(id,170,105,340),x=p.X(106),y=p.Y(109);
 diagrams[id]=wrap(id,'Разрыв нити и столкновение с бруском',p.body+force(x,y,0,-130,C.green,'T₀',[-14,-8,'end'])+force(x,y,0,102,C.red,'mg',[-14,22,'end'])+force(p.X(140),p.Y(122),0,-100,C.green,'N')+force(p.X(140),p.Y(108),0,116,C.red,'Mg')+arrow(x-5,y+35,75,0,C.blue,'v',[-10,29,'middle'])+axes(140,530)+text(440,511,'v=2,4 м·с⁻¹',C.blue,23,'middle')+text(440,561,'M=2,5 кг',C.ink,25,'middle'),620);
}

for(const id of ['E17A4E','3B9FD0']){
 const plastic=id==='E17A4E',left=plastic?'m₂=20 г':'3m',right=plastic?'m₁=10 г':'m';
 let b=text(340,90,'До столкновения',C.ink,22,'middle')+ball(170,185,24)+ball(500,185,17)+text(170,145,left,C.ink,20,'middle')+text(500,145,right,C.ink,20,'middle')+arrow(198,185,100,0,C.blue,plastic?'u₂':'u')+arrow(478,185,-100,0,C.purple,plastic?'u₁':'u')+force(170,185,0,75,C.red,plastic?'m₂g':'3mg')+force(500,185,0,75,C.red,plastic?'m₁g':'mg')+text(340,345,'После слипания',C.ink,22,'middle')+ball(285,410,30)+arrow(322,410,130,0,C.blue,plastic?'v=1,5 м·с⁻¹':'v=0,5 м·с⁻¹')+axes(145,535)+text(420,546,plastic?'Общая масса 30 г':'Общая масса 4m',C.ink,23,'middle');
 diagrams[id]=wrap(id,'Сохранение импульса при встречном ударе',b,610);
}
for(const id of ['136E1B','30E296']){
 let b=text(340,88,'До прыжка',C.ink,22,'middle')+block(190,240,92,48)+ball(174,272,10,C.ink)+ball(215,272,10,C.ink)+text(190,205,'M=50 кг',C.ink,20,'middle')+arrow(242,234,100,0,C.blue,'V=1')+ball(105,145,14,C.purple)+line(105,160,105,204,C.purple,3)+line(105,178,130,194,C.purple,3)+line(105,204,86,233,C.purple,3)+line(105,204,130,218,C.purple,3)+arrow(130,140,80,0,C.purple,'u=2')+text(62,102,'m=50 кг',C.ink,19)+line(55,284,610,284,C.ink,2)+text(340,322,'После прыжка',C.ink,22,'middle')+block(280,420,110,60)+text(325,480,'M+m',C.ink,20,'middle')+arrow(340,420,90,0,C.blue,'v=1,5 м·с⁻¹')+force(280,450,0,-90,C.green,'N')+force(280,420,0,100,C.red,'(M+m)g')+axes(115,540);
 diagrams[id]=wrap(id,'Мальчик догоняет тележку',b,605);
}
{
 const id='FA79E4';
 let b=text(340,83,'Вид сверху: горизонтальная плоскость',C.ink,21,'middle')+arrow(260,325,255,0,C.ink,'Ox')+arrow(260,325,0,-170,C.ink,'Oy')+ball(125,325,17)+arrow(145,325,90,0,C.blue,'v₁=2',[-45,-18,'middle'])+ball(260,455,17)+arrow(260,435,0,-85,C.purple,'v₂=1',[-20,45,'end'])+ball(260,325,23)+arrow(260,325,180,-90,C.green,'V')+line(440,235,440,325,C.grid,2,'6 5')+line(260,235,440,235,C.grid,2,'6 5')+text(356,356,'Vₓ=1',C.green,21,'middle')+text(448,295,'Vᵧ=0,5',C.green,20)+text(340,530,'|V|≈1,12 м·с⁻¹; β≈26,6°',C.ink,24,'middle')+text(340,575,'По вертикали: N₁+N₂=2mg',C.ink,20,'middle');
 diagrams[id]=wrap(id,'Перпендикулярные начальные импульсы',b,620);
}
for(const id of ['2177EF','60B2BE','58AC2F']){
 const sled=id==='2177EF';
 let b=text(340,86,sled?'После выстрела':'Вылет снаряда и отдача ствола',C.ink,22,'middle')+block(260,240,135,65)+text(260,218,sled?'M=120 кг':'M',C.ink,22,'middle')+ball(505,232,10)+arrow(175,233,-75,0,C.purple,'V')+arrow(520,233,75,0,C.blue,sled?'u':'v')+force(260,274,0,-120,C.green,'N')+force(260,240,0,105,C.red,'Mg')+line(80,276,405,276)+axes(120,495);
 if(sled)b+=text(405,439,'mu=MV',C.ink,24,'middle')+text(405,503,'V=0,09 м·с⁻¹',C.blue,25,'middle');
 else b+=force(325,245,75,0,C.orange,'F_упр',[10,26,'start'])+text(340,411,'Пружина: η=⅙ энергии отдачи',C.ink,22,'middle')+text(405,475,'v=600; V=6 м·с⁻¹',C.blue,22,'middle')+text(405,529,id==='60B2BE'?'M=1000 кг':'m=10 кг',C.ink,25,'middle');
 diagrams[id]=wrap(id,sled?'Отдача саней с охотником':'Импульс и энергия отдачи',b,590);
}
for(const id of ['E7211F','037654','88406D']){
 let b=text(340,85,'До взрыва',C.ink,22,'middle')+block(240,160,100,45)+text(240,167,'M',C.ink,22,'middle')+arrow(295,160,100,0,C.blue,'v₀=400')+text(340,268,'Сразу после взрыва',C.ink,22,'middle')+ball(220,345,21)+ball(420,345,21)+text(220,311,'M·½',C.ink,21,'middle')+text(420,311,'M·½',C.ink,21,'middle')+arrow(190,345,-85,0,C.purple,'v₂=100',[-6,29,'middle'])+arrow(450,345,120,0,C.blue,'v₁=900',[-20,29,'middle'])+axes(130,505)+text(435,478,'Mv₀=M(v₁−v₂)·½',C.ink,23,'middle')+text(435,535,id==='88406D'?'M=2 кг; ΔE=0,25 МДж':'M=4 кг; ΔE=0,5 МДж',C.ink,23,'middle');
 diagrams[id]=wrap(id,'Распад снаряда на два равных осколка',b,590);
}
for(const id of ['338EF9','FDD351']){
 const x0=100,y0=490,bx=340,by=260;
 let curve='';for(let i=0;i<=40;i++){let t=i/40;curve+=`${i?'L':'M'}${x0+240*t} ${y0-307*t+77*t*t}`;}
 let after='';for(let i=0;i<=40;i++){let t=i/40;after+=`${i?'L':'M'}${bx+210*t} ${by+230*t*t}`;}
 let b=axes(x0,y0)+line(75,y0,610,y0)+`<path d="${curve}" fill="none" stroke="${C.blue}" stroke-width="3"/><path d="${after}" fill="none" stroke="${C.green}" stroke-width="3"/>`+ball(x0,y0,12)+arrow(x0,y0,65,-83,C.blue,'v₀')+ball(bx,104,13,C.purple)+line(bx,120,bx,by,C.purple,2,'6 5')+force(bx,105,0,70,C.red,'mg')+ball(bx,by,17,C.green)+arrow(bx,by,100,0,C.green,'u')+force(bx,by,0,75,C.red,'2mg')+text(295,230,'удар',C.ink,20,'end')+line(bx,by,bx,y0,C.grid,1,'6 6')+line(bx,540,550,540,C.ink,2)+text(445,569,'d',C.ink,23,'middle')+text(340,615,id==='338EF9'?'τ — только время после столкновения':'d — только путь после столкновения',C.ink,21,'middle');
 diagrams[id]=wrap(id,'Встреча летящего и падающего шариков',b,660);
}
for(const id of ['3D2308','29FE54']){
 const theta=id==='3D2308'?Math.acos(.8):Math.acos(2/3),ox=300,oy=430,R=220,x=ox+R*Math.sin(theta),y=oy-R*Math.cos(theta);
 let b=`<path d="M${ox-R} ${oy}A${R} ${R} 0 0 1 ${ox+R} ${oy}Z" fill="#f2f4f7" stroke="${C.ink}" stroke-width="2"/>`+line(60,oy,620,oy)+dot(ox,oy)+text(ox-15,oy+27,'O')+line(ox,oy,ox,oy-R,C.grid,2,'6 5')+line(ox,oy,x,y,C.ink,2)+text((ox+x)/2-18,(oy+y)/2,'R')+ball(x,y,11)+force(x,y,0,97,C.red,id==='3D2308'?'(M+m)g':'mg')+arrow(x,y,90*Math.cos(theta),90*Math.sin(theta),C.blue,'v',[8,20,'start'])+arrow(x,y,-80*Math.sin(theta),80*Math.cos(theta),C.ink,'Or',[-7,26,'end'])+text(570,182,'N=0',C.green,22,'middle')+line(x+25,y,x+25,oy,C.grid,2,'5 5')+text(x+35,(y+oy)/2,'h')+axes(130,540)+text(430,540,id==='3D2308'?'h=0,80 м':'h=2R·⅓; t≈0,348 с',C.ink,23,'middle');
 if(id==='3D2308')b+=ball(300,210,13)+ball(155,210,7,C.purple)+arrow(170,210,85,0,C.purple,'v₀')+text(350,105,'u=2 м·с⁻¹',C.blue,22,'middle');
 else b+=ball(300,210,11)+text(300,165,'Начало: v≈0',C.ink,22,'middle');
 diagrams[id]=wrap(id,'Скольжение по внешней стороне полусферы',b,610);
}
{
 const id='A5F07E';
 let b=axes(95,490)+line(75,490,620,490)+`<path d="M95 490Q190 220 320 220" stroke="${C.grid}" stroke-width="2" fill="none" stroke-dasharray="7 5"/>`+ball(320,220,16)+text(320,175,'Взрыв: H=1500 м',C.ink,22,'middle')+arrow(320,220,220,0,C.blue,'u₁≈404,1',[0,-13,'middle'])+arrow(320,242,-95,0,C.purple,'u₂ₓ≈−52,1',[-6,30,'middle'])+force(320,220,0,90,C.red,'Mg до взрыва')+line(320,220,320,490,C.grid,2,'5 6')+text(450,375,'Время падения',C.ink,20,'middle')+text(450,412,'t=10√3 с',C.ink,24,'middle')+text(340,558,'S₁=7 км отсчитывается от взрыва',C.ink,22,'middle');
 diagrams[id]=wrap(id,'Скорость второго осколка в вершине',b,610);
}
for(const id of ['0EA255','EDA6E2']){
 let b=`<circle cx="320" cy="310" r="170" fill="none" stroke="${C.grid}" stroke-width="2" stroke-dasharray="7 6"/>`+dot(320,310)+text(340,316,'O')+line(320,140,320,480,C.grid,2)+text(345,409,'l')+ball(320,480,15)+ball(320,140,15)+force(320,480,0,-103,C.green,'T',[15,-5,'start'])+force(320,480,0,70,C.red,'(M+m)g')+force(320,140,0,80,C.red,'(M+m)g')+arrow(342,474,100,0,C.blue,'u=5')+arrow(305,133,-95,0,C.blue,'v')+text(450,170,'T_верх=0',C.green,22)+ball(140,480,7,C.purple)+arrow(155,480,95,0,C.purple,'v₀',[0,-13,'middle'])+axes(110,360)+text(340,615,id==='0EA255'?'v₀=120 м·с⁻¹ → m=10 г':'m=10 г → v₀=130 м·с⁻¹',C.ink,23,'middle');
 diagrams[id]=wrap(id,'Минимальная скорость для полного оборота',b,660);
}
{
 const id='888D31';
 let b=text(340,83,'До удара',C.ink,22,'middle')+block(155,170)+block(415,170,105,55)+text(155,145,'m',C.ink,21,'middle')+text(415,134,'4m',C.ink,21,'middle')+arrow(192,170,115,0,C.blue,'υ₀=5')+arrow(472,170,70,0,C.purple,'υ₀·½=2,5',[-5,30,'middle'])+text(340,273,'После удара и при торможении',C.ink,22,'middle')+block(320,390,110,65)+text(350,409,'5m',C.ink,21,'middle')+force(320,423,0,-110,C.green,'N')+force(320,390,0,100,C.red,'5mg')+force(298,423,-100,0,C.orange,'F_тр',[-10,30,'end'])+arrow(380,390,90,0,C.blue,'V=3 → u=2')+axes(135,540)+text(440,550,'s=0,50 м',C.ink,25,'middle');
 diagrams[id]=wrap(id,'Слипание брусков и работа трения',b,605);
}
{
 const id='030E68';
 let b=text(145,95,'Электрический разгон',C.ink,20,'middle')+line(85,130,85,330,C.orange,5)+line(200,130,200,330,C.blue,5)+text(78,120,'+')+text(195,120,'−')+ball(142,250,8)+force(142,250,100,0,C.orange,'qE')+text(144,375,'U=2000 В',C.ink,21,'middle')+`<circle cx="450" cy="230" r="135" fill="#f2f4f7" stroke="${C.blue}" stroke-width="2"/>`;
 for(const x of[365,430,495,550])for(const y of[160,230,300])if(Math.hypot(x-450,y-230)<118)b+=line(x-4,y-4,x+4,y+4,C.grid)+line(x-4,y+4,x+4,y-4,C.grid);
 b+=ball(450,365,10)+arrow(450,365,90,0,C.blue,'v')+force(450,365,0,-100,C.green,'F_Л=qvB')+line(450,230,450,365,C.grid,1,'5 5')+text(430,279,'R')+dot(450,230)+text(472,237,'O')+text(450,94,'B=0,5 Тл за рисунок',C.ink,20,'middle')+axes(140,530)+text(450,496,'R≈8,66 см',C.blue,25,'middle')+text(450,544,'q>0; v⊥B',C.ink,22,'middle');
 diagrams[id]=wrap(id,'Ион в электрическом и магнитном полях',b,605);
}
{
 const id='AF318D',left={x:205,y:105,L:320},right={x:425,y:283,L:142},a=.52,base=425;
 let b=text(340,80,'Начальные положения на одной высоте',C.ink,20,'middle')+line(left.x-45,left.y,left.x+45,left.y,C.ink,4)+line(right.x-45,right.y,right.x+45,right.y,C.ink,4)+line(left.x,left.y,left.x,base,C.grid,2,'6 5')+line(right.x,right.y,right.x,base,C.grid,2,'6 5')+ball(left.x,base,13)+ball(right.x,base,18)+text(left.x-40,base-18,'m₁')+text(right.x+85,base+60,'m₂=1,5m₁')+line(left.x,left.y,left.x-left.L*Math.sin(a),left.y+left.L*Math.cos(a),C.blue,2)+ball(left.x-left.L*Math.sin(a),left.y+left.L*Math.cos(a),13)+line(right.x,right.y,right.x+right.L*Math.sin(a),right.y+right.L*Math.cos(a),C.purple,2)+ball(right.x+right.L*Math.sin(a),right.y+right.L*Math.cos(a),18)+text(130,260,'l₁',C.blue,22)+text(492,340,'l₂',C.purple,22)+text(182,157,'α',C.blue,22)+text(442,322,'α',C.purple,22)+force(left.x,base,0,-80,C.green,'T₁')+force(right.x,base,0,-70,C.green,'T₂')+force(left.x,base,0,73,C.red,'m₁g')+force(right.x,base,0,73,C.red,'m₂g');
 let spring='M228 425';for(let i=0;i<14;i++)spring+=`l11 ${i%2?16:-16}`;spring+='L404 425';b+=`<path d="${spring}" stroke="${C.orange}" fill="none" stroke-width="2"/>`+arrow(195,455,-65,0,C.blue,'v₁',[-5,30,'end'])+arrow(455,455,65,0,C.purple,'v₂')+axes(100,575)+text(420,585,'l₁=2,25l₂',C.ink,25,'middle');
 diagrams[id]=wrap(id,'Равные углы при разных длинах нитей',b,640);
}
module.exports={diagrams};
