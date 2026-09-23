const fs=require('node:fs'),path=require('node:path');
const sources=require('./dynamics-sources.json'),sizes=require('./dynamics-image-sizes.json');
const C={ink:'#344054',blue:'#175cd3',red:'#b42318',green:'#087f6d',purple:'#6941c6',orange:'#b54708',grid:'#d0d5dd'};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const sub=s=>esc(s).replace(/_([А-Яа-яA-Za-z0-9]+)/g,'<tspan baseline-shift="sub" font-size="70%">$1</tspan>');
const text=(x,y,s,color=C.ink,size=18,anchor='start')=>`<text x="${x}" y="${y}" fill="${color}" font-size="${size}" text-anchor="${anchor}" paint-order="stroke" stroke="white" stroke-width="4" stroke-linejoin="round">${sub(s)}</text>`;
const line=(x,y,X,Y,color=C.ink,width=2,dash='')=>`<line x1="${x}" y1="${y}" x2="${X}" y2="${Y}" stroke="${color}" stroke-width="${width}" ${dash?`stroke-dasharray="${dash}"`:''}/>`;
const dot=(x,y,c=C.ink,r=3)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;
function arrow(x,y,dx,dy,color=C.blue,label='',offset){const [lx,ly,anchor]=offset||[dx< -5?-10:10,dy< -5?-8:dy>5?8:-10,dx< -5?'end':'start'];return `<path d="M${x} ${y}l${dx} ${dy}" stroke="white" stroke-width="7" fill="none"/><path d="M${x} ${y}l${dx} ${dy}" stroke="${color}" stroke-width="3" fill="none" marker-end="url(#d-${Object.keys(C).find(k=>C[k]===color)})"/>`+(label?text(x+dx+lx,y+dy+ly,label,color):'');}
const force=(...a)=>arrow(...a)+dot(a[0],a[1],a[4]||C.blue);
function wrap(id,title,body,h=660){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 ${h}" role="img" aria-labelledby="d-title-${id}" data-dynamics-diagram="${id}"><title id="d-title-${id}">${esc(title)}</title><defs>${Object.entries(C).map(([k,c])=>`<marker id="d-${k}" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="${c}"/></marker>`).join('')}</defs><g font-family="Arial,sans-serif"><rect width="680" height="${h}" rx="12" fill="white"/>${text(26,34,title,C.ink,21)}${body}</g></svg>`;}
function original(id,index=0,x=110,y=140,w=460){const p=sources[id].images[index],[iw,ih]=sizes[p],scale=w/iw,h=ih*scale,mime=/\.jpg$/i.test(p)?'image/jpeg':'image/png';return {body:`<image data-fipi-source="${p}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet" href="data:${mime};base64,${fs.readFileSync(path.join(__dirname,'../../fipi-assets',p)).toString('base64')}"/>`,X:a=>x+a*scale,Y:a=>y+a*scale,scale,x,y,w,h,iw,ih};}
function axes(x,y,dir=1,label='Ox'){return arrow(x,y,dir*70,0,C.ink,label)+arrow(x,y,0,-55,C.ink,'Oy');}
function vertical(p,x,y,label='mg',len=65){return force(p.X(x),p.Y(y),0,len,C.red,label);}
function normal(p,x,y,label='N',dx=0,dy=-80){return force(p.X(x),p.Y(y),dx,dy,C.green,label);}
const diagrams={};
for(const id of ['04DCB4','087023']){
 const p=original(id),a=id==='04DCB4'?{M:[58,45],base:[58,79],m:[161,62],mb:[161,77],pulley:[92,41],top:[92,27],bot:[92,54]}:{M:[82,78],base:[82,111],m:[185,96],mb:[185,109],pulley:[117,75],top:[117,61],bot:[117,88]};
 let b=p.body+vertical(p,...a.M,'Mg',110)+normal(p,...a.base,'N₁')+vertical(p,...a.m)+normal(p,...a.mb,'N₂')+
 force(p.X(a.top[0]),p.Y(a.top[1]),75,0,C.blue,'T',[8,-10,'start'])+force(p.X(a.bot[0]),p.Y(a.bot[1]),45,0,C.blue,'T',[0,-12,'middle'])+
 force(p.X(a.m[0]-15),p.Y(a.bot[1]),-22,0,C.blue,'T',[0,30,'middle'])+
 axes(175,530,-1)+arrow(315,500,-55,0,C.purple,'a')+arrow(550,500,-100,0,C.purple,'2a')+text(290,588,'b=2a;  F−2T=Ma',C.ink,23,'middle');
 diagrams[id]=wrap(id,'Подвижный блок: связь ускорений',b);
}
for(const id of ['170B54','36B168']){
 const p=original(id,0,210,105,245),q=original(id,1,165,455,360),small=id==='170B54',cx=small?42:47,cy=small?127:169,base=small?143:189;
 let b=p.body+vertical(p,cx,cy)+normal(p,cx,base,'N',0,-30)+force(p.X(cx),p.Y(cy-17),0,-100,C.blue,'T',[-12,-8,'end'])+axes(120,350)+text(470,185,'T=F',C.blue,21)+text(470,220,'N≥0',C.green,21)+text(470,255,`mg=${small?4:3} Н`,C.red,20)+q.body;
 // График наносится на сохранённую сетку исходного рисунка.
 const grid=small?{ox:54,oy:132,unit:15.8}:{ox:48,oy:123,unit:14};const W=small?4:3;
 const X=f=>q.X(grid.ox+grid.unit*f),Y=n=>q.Y(grid.oy-grid.unit*n);
 b+=line(X(0),Y(W),X(W),Y(0),C.blue,4)+line(X(W),Y(0),X(10),Y(0),C.blue,4)+dot(X(W),Y(0),C.blue,5)+text(340,740,'После отрыва N=0',C.ink,21,'middle');
 diagrams[id]=wrap(id,'Реакция стола и отрыв груза',b,780);
}
for(const id of ['1A1FBB','746AB3']){
 const p=original(id,0,100,130,185),q=original(id,1,390,110,205);
 let b=text(190,88,'Пирамидка № 1',C.ink,19,'middle')+text(485,88,'Пирамидка № 2',C.ink,19,'middle')+p.body+q.body+
 vertical(p,61,33)+force(p.X(61),p.Y(44),0,-60,C.purple,'F_упр1',[-15,-5,'end'])+
 vertical(q,70,46)+force(q.X(64),q.Y(55),0,110,C.purple,'F_упр2',[-10,20,'end'])+force(q.X(78),q.Y(46),0,-60,C.green,'F_А',[14,-4,'start'])+
 axes(100,445)+text(300,430,'До падения:',C.ink,20)+text(300,463,'l₁<l₀,  l₂>l₀',C.ink,23)+
 text(70,540,'При свободном падении: F_А=0.',C.ink,21)+text(70,582,'Новое равновесие: l=l₀.',C.ink,21)+text(70,620,'Длина № 1 растёт; длина № 2 убывает.',C.ink,20);
 diagrams[id]=wrap(id,'Пружины при переходе к невесомости',b,660);
}
for(const id of ['24D9C3','8CF4D1']){
 const p=original(id,0,125,125,430),old=id==='24D9C3';const M=old?[162,48,73]:[162,43,65],m=old?[17,165]:[28,152];
 let b=p.body+vertical(p,M[0],M[1],'Mg')+normal(p,M[0],M[2])+force(p.X(M[0]-28),p.Y(M[1]),-65,0,C.blue,'T')+force(p.X(M[0]-12),p.Y(M[2]),-72,0,C.orange,'F_тр',[-6,25,'end'])+
 vertical(p,...m)+force(p.X(m[0]),p.Y(m[1]-10),0,-78,C.blue,'T')+axes(430,545)+arrow(150,550,0,-65,C.purple,'a')+
 text(340,620,'N=Mg−F sinα',C.green,23,'middle');diagrams[id]=wrap(id,'Подъём груза наклонной силой',b,670);
}
for(const id of ['2593A8','82C08B']){
 const p=original(id,0,95,120,490),old=id==='2593A8';const a=old?[[40,150],[66,140],[235,149],[261,97]]:[[36,177],[70,164],[282,176],[317,110]];
 let b=p.body;
 a.forEach(([x,y],i)=>{b+=vertical(p,x,y,i%2?'m₂g':'m₁g',60)+force(p.X(x),p.Y(y-6),0,-72,C.blue,i<2?'T':'T₀',[i%2?10:-10,-8,i%2?'start':'end']);});
 b+=force(p.X(a[2][0]+6),p.Y(a[2][1]),0,-123,C.green,'F_А',[12,-7,'start'])+text(195,88,'Движение в воздухе',C.ink,19,'middle')+text(500,88,'Равновесие',C.ink,19,'middle')+
 arrow(125,560,0,62,C.ink,'Oy₁')+arrow(235,625,0,-62,C.ink,'Oy₂')+text(395,585,'m₂=m₁−ρV',C.ink,22)+text(395,620,'T₀=m₂g',C.blue,22);
 diagrams[id]=wrap(id,'Два опыта с подвешенными телами',b,680);
}
for(const id of ['309C22','89181B']){
 const p=original(id,0,85,145,510),old=id==='309C22',mx=old?103:85,my=old?38:47,bottom=old?46:53,gx=old?296:274,gy=old?107:101;
 let b=p.body+vertical(p,mx,my,'Mg')+normal(p,mx,bottom)+force(p.X(mx+13),p.Y(my-5),80,0,C.blue,'T')+vertical(p,gx,gy)+force(p.X(gx),p.Y(gy),0,-65,C.blue,'T')+axes(115,465)+
 text(305,425,'После толчка влево:',C.ink,20)+arrow(435,468,-75,0,C.purple,'v')+arrow(360,525,75,0,C.orange,'F_тр')+arrow(360,580,75,0,C.blue,'T')+arrow(165,580,70,0,C.purple,'a');
 b+=force(p.X(mx),p.Y(bottom),65,0,C.orange,'F_тр',[7,25,'start']);
 diagrams[id]=wrap(id,'Тележка: скорость и ускорение',b,650);
}
for(const id of ['3B6EAD','E068D9']){
 const p=original(id,0,240,105,200),old=id==='3B6EAD',L=old?[24,159]:[22,154],R=old?[73,171]:[87,179],small=old?[73,151]:[85,158];
 let b=p.body+vertical(p,...L,'Mg',68)+force(p.X(L[0]),p.Y(L[1]-8),0,-95,C.blue,'T',[-10,-6,'end'])+
 vertical(p,...R,'Mg',72)+force(p.X(R[0]+2),p.Y(R[1]-8),0,-115,C.blue,'T',[14,-8,'start'])+
 vertical(p,...small,'mg',55)+force(p.X(small[0]),p.Y(small[1]+6),0,-67,C.green,'N',[-12,-6,'end'])+
 force(p.X(R[0]-6),p.Y(R[1]-8),0,100,C.orange,'P',[-12,18,'end'])+
 arrow(170,550,0,-75,C.ink,'Oy (слева)')+arrow(495,475,0,75,C.ink,'Oy (справа)',[-5,32,'middle'])+
 text(340,630,'P=N=m(g−a)',C.ink,23,'middle');diagrams[id]=wrap(id,'Давление груза на движущийся брусок',b,685);
}
{
 const id='3ECDA4',p=original(id,0,95,170,490);
 let b=p.body+normal(p,19,69,'N₁')+normal(p,96,69,'N₂')+vertical(p,19,61,'mg')+vertical(p,96,55,'Mg')+axes(120,585)+text(340,455,'Во время контакта с пружиной',C.ink,21,'middle')+
 block(440,515,80,45)+text(440,487,'3m',C.ink,18,'middle')+line(370,538,615,538)+line(610,465,610,538,C.ink,4)+
 `<path d="M480 515l12 -12l12 24l12 -24l12 24l12 -24l12 24l12 -12H610" fill="none" stroke="${C.purple}" stroke-width="2"/>`+
 force(480,515,-120,0,C.purple,'F_упр',[-10,-12,'end'])+text(340,635,'До пружины и обратно: время 2L·u⁻¹',C.ink,20,'middle')+text(340,678,'Контакт: половина периода',C.ink,22,'middle');
 diagrams[id]=wrap(id,'Неупругий удар и отражение от пружины',b,725);
}
{
 const id='48129F',p=original(id,0,140,165,400);
 let b=p.body+vertical(p,41,69,'m₁g')+normal(p,41,73,'N₁')+force(p.X(51),p.Y(64),55,0,C.blue,'T',[7,-12,'start'])+vertical(p,143,72,'m₂g')+normal(p,143,73,'N₂')+force(p.X(132),p.Y(70),-60,0,C.blue,'T',[-8,25,'end'])+
 arrow(130,525,70,0,C.ink,'Ox₁')+arrow(540,525,-70,0,C.ink,'Ox₂')+text(340,445,'r₁=12 см;  r₂=8 см',C.ink,23,'middle')+text(340,585,'T=m₁ω²r₁=m₂ω²r₂',C.blue,23,'middle');
 diagrams[id]=wrap(id,'Равные натяжения при разных радиусах',b);
}
for(const id of ['4F0963','873381']){
 const p=original(id,0,245,105,185),old=id==='4F0963',L=old?[13,107]:[39,107],R=old?[60,107]:[86,107];
 let b=p.body+vertical(p,...L,'Mg',85)+force(p.X(L[0]),p.Y(L[1]-5),0,-100,C.blue,'T',[-10,-6,'end'])+vertical(p,...R,'mg',70)+force(p.X(R[0]),p.Y(R[1]-5),0,-100,C.blue,'T')+
 arrow(130,425,0,70,C.ink,'Oy (слева)')+arrow(500,495,0,-70,C.ink,'Oy (справа)',[-4,-17,'middle'])+text(340,570,'a=4 м·с⁻²',C.purple,23,'middle')+text(340,615,'T=m(g+a)=14 Н',C.blue,23,'middle');diagrams[id]=wrap(id,'Натяжение нити при подъёме груза',b,660);
}
{
 const id='566D54',p=original(id,0,170,150,355);
 let b=p.body+vertical(p,66,31,'Mg')+normal(p,66,47)+force(p.X(83),p.Y(29),65,0,C.blue,'T')+force(p.X(59),p.Y(47),-80,0,C.orange,'F_тр',[-8,26,'end'])+
 vertical(p,130,89)+force(p.X(130),p.Y(73),0,-78,C.blue,'T')+axes(155,535)+arrow(530,485,0,65,C.purple,'a')+text(340,610,'T−F−μMg=Ma',C.ink,23,'middle');diagrams[id]=wrap(id,'Движение связанной пары с трением',b,660);
}
{
 const id='5D4738',p=original(id,0,100,175,480);
 let b=p.body+vertical(p,101,78,'Mg',90)+normal(p,113,103,'N',-43,-80)+force(p.X(127),p.Y(89),75,-40,C.blue,'T')+force(p.X(113),p.Y(103),72,-37,C.orange,'F_тр',[15,26,'start'])+
 vertical(p,268,98)+force(p.X(268),p.Y(77),0,-85,C.blue,'T')+arrow(160,540,78,-42,C.ink,'Ox')+arrow(160,540,-35,-65,C.ink,'Oy')+text(380,558,'F_тр=μN',C.orange,23)+text(340,620,'Предел сползания вниз',C.ink,22,'middle');diagrams[id]=wrap(id,'Минимальная масса для равновесия',b,670);
}
{
 const id='6F1007',p=original(id,0,110,120,450),x=p.X(185),y=p.Y(114);
 let b=p.body+force(x,y,0,88,C.red,'mg')+arrow(x,y,-54.904,-95.096,C.purple,'a_x',[20,7,'start'])+arrow(x,y,-64.952,37.5,C.orange,'a_y',[-10,25,'end'])+arrow(x,y,-119.856,-57.596,C.green,'a',[-10,-7,'end'])+
 force(x,y,-85,-147.224,C.blue,'T',[-12,-10,'end'])+arrow(x,y,-54.904,-95.096,C.purple,'a_x',[20,7,'start'])+text(340,480,'Ox: к подвесу;  Oy: вдоль скорости',C.ink,20,'middle')+text(340,528,'a_x>0;  a_y<0',C.ink,23,'middle')+text(340,576,'Ускорение направлено внутрь траектории',C.ink,21,'middle');diagrams[id]=wrap(id,'Полное ускорение математического маятника',b,630);
}
for(const id of ['6F7274','AB0C38']){
 const p=original(id,0,160,140,365);
 let b=p.body+vertical(p,52,28,'Mg')+normal(p,52,54)+force(p.X(82),p.Y(26),70,0,C.blue,'T')+force(p.X(46),p.Y(54),-80,0,C.orange,'F_тр',[-10,26,'end'])+
 force(p.X(162),p.Y(71),0,-75,C.blue,'T')+force(p.X(162),p.Y(95),0,45,C.purple,'F_упр',[-15,10,'end'])+vertical(p,162,82,'mg',36)+
 vertical(p,162,155,'mg',68)+force(p.X(162),p.Y(144),0,-32,C.purple,'F_упр',[15,-7,'start'])+
 axes(165,595)+arrow(545,565,0,55,C.ink,'Oy (грузы)',[-20,35,'end'])+text(340,700,'Оба груза имеют одинаковое ускорение',C.ink,20,'middle');diagrams[id]=wrap(id,'Пружина между связанными грузами',b,750);
}
for(const id of ['8D9256','FBCBC5']){
 const p=original(id,0,105,170,475),old=id==='8D9256',lo=old?[107,84]:[64,91],hi=old?[180,53]:[137,53],heavy=old?[246,89]:[227,102],slope=old?.48:.58;
 const normalForce=(point,label)=>normal(p,point[0]+4,point[1]+8,label,-42,-42/slope);
 let b=p.body+vertical(p,...lo,'mg',80)+normalForce(lo,'N₁')+force(p.X(lo[0]+7),p.Y(lo[1]-2),42,-42*slope,C.purple,'F_упр',[3,-16,'middle'])+
 vertical(p,...hi,'mg',82)+normalForce(hi,'N₂')+force(p.X(hi[0]-8),p.Y(hi[1]+4),-42,42*slope,C.purple,'F_упр',[-10,32,'end'])+
 force(p.X(hi[0]+9),p.Y(hi[1]-4),75,-75*slope,C.blue,'T')+vertical(p,...heavy,'Mg',75)+force(p.X(heavy[0]),p.Y(heavy[1]-10),0,-85,C.blue,'T')+
 arrow(180,570,75,-75*slope,C.ink,'Ox')+arrow(180,570,-35,-35/slope,C.ink,'Oy')+arrow(560,545,0,65,C.ink,'Oy (груз)',[-10,28,'end'])+text(340,665,'F_упр=3 Н;  удлинение 3 см',C.ink,23,'middle');diagrams[id]=wrap(id,'Два бруска и пружина на гладком склоне',b,715);
}
for(const id of ['93393A','DB33E7','C6A611']){
 const p=original(id,0,95,185,490),t=id==='C6A611',old=id==='93393A';
 const m=t?[139,42]:old?[178,61]:[175,64],M=t?[166,65]:old?[132,87]:[134,90],contact=t?49:old?71:75,base=t?71:old?102:103;
 let b=p.body+normal(p,m[0],contact,'N₁',0,-100)+force(p.X(m[0]-8),p.Y(m[1]),-70,0,C.blue,'T',[-10,-14,'end'])+
 force(p.X(m[0]),p.Y(contact),t?-90:80,0,C.orange,'F_тр1',[t?-10:12,28,t?'end':'start'])+
 normal(p,M[0],base,'N₂',0,-110)+force(p.X(m[0]),p.Y(contact),0,100,C.green,'N₁',[14,17,'start'])+
 force(p.X(t?130:old?84:77),p.Y(t?59:old?81:86),-58,0,C.blue,'T',[-10,26,'end'])+
 force(p.X(m[0]+3),p.Y(contact),t?80:-90,0,C.orange,'F_тр1',[t?12:-10,-12,t?'start':'end']);
 b+=vertical(p,...m,'mg',55)+vertical(p,...M,'Mg',88);
 if(!t)b+=force(p.X(M[0]-18),p.Y(base),-70,0,C.orange,'F_тр2',[-7,35,'end']);
 b+=axes(115,540)+arrow(335,530,t?-65:65,0,C.purple,'a (доска)',[0,28,'middle'])+arrow(490,465,t?65:-65,0,C.purple,'a (брусок)',[0,-18,'middle'])+
 text(340,640,t?'a_отн=2a;  L=at²':'F=(M+m)(a+μ₂g)+2μ₁mg',C.ink,23,'middle');
 diagrams[id]=wrap(id,t?'Сход бруска с движущейся доски':'Противоположное движение доски и бруска',b,700);
}
{
 const id='7DEBA4',p=original(id,0,90,210,500);
 let b=p.body+vertical(p,53,32,'M₂g',90)+normal(p,53,41,'N₂')+force(p.X(80),p.Y(38),26,0,C.blue,'T',[0,34,'middle'])+vertical(p,137,32,'M₁g',90)+normal(p,137,41,'N₁')+force(p.X(120),p.Y(38),-26,0,C.blue,'T',[0,-14,'middle'])+axes(130,480)+text(330,510,'F=18 Н; T=10 Н',C.ink,23)+text(340,585,'a=4 м·с⁻²; M₂=2,5 кг',C.ink,23,'middle');diagrams[id]=wrap(id,'Нить на пределе прочности',b,640);
}
{
 const id='AB0739',p=original(id,0,90,200,500),x=p.X(169),y=p.Y(37);
 let b=p.body+force(x,y,0,100,C.red,'mg')+force(p.X(174),p.Y(43),-32,-90,C.green,'N')+force(p.X(174),p.Y(43),80,-28,C.orange,'F_тр',[15,22,'start'])+
 axes(130,510)+arrow(440,510,100,0,C.purple,'a')+text(340,590,'a бруска = a клина',C.ink,23,'middle');diagrams[id]=wrap(id,'Равномерное скольжение по ускоряющемуся клину',b,640);
}
for(const id of ['45D010','9F9E6D']){
 const p=original(id,0,110,200,460),old=id==='45D010',x=p.X(old?127:105),y=p.Y(old?35:33);
 let b=p.body+force(x,y,0,85,C.red,'mg')+force(x,y,-27,-100,C.green,'N')+force(x,y,-65,-25,C.orange,'F_тр',[-10,-6,'end'])+
 arrow(155,485,80,0,C.ink,'Ox')+arrow(155,485,50,-62.5,C.ink,'Oy')+arrow(155,485,-29,-108,C.ink,'Oz',[-8,-8,'end'])+
 text(455,425,'В плоскости склона',C.ink,19,'middle')+arrow(455,535,80,0,C.blue,'F')+arrow(455,535,0,65,C.red,'mg sinα',[-6,28,'middle'])+arrow(455,535,-65,-50,C.orange,'F_тр')+
 text(340,663,'F_тр²=F²+(mg sinα)²',C.ink,23,'middle');diagrams[id]=wrap(id,'Порог трения при поперечной тяге',b,710);
}
function block(x,y,w=50,h=35){return `<rect x="${x-w/2}" y="${y-h/2}" width="${w}" height="${h}" rx="3" fill="#eff8ff" stroke="${C.ink}" stroke-width="2"/>`;}
for(const id of ['0DDE03','45157D','AB3A90']){
 let b=text(340,80,'Вид сверху: горизонтальные силы',C.ink,19,'middle')+`<circle cx="300" cy="235" r="125" fill="#f2f4f7" stroke="${C.grid}" stroke-width="2"/>`+dot(300,235)+text(280,261,'O')+block(400,235,36,30)+text(412,265,'m')+line(300,235,400,235,C.grid,1,'4 5');
 if(id==='0DDE03'){
 let spring='M305 235';for(let i=0;i<10;i++)spring+=`l7 ${i%2?16:-16}`;spring+='L382 235';
 b+=`<path d="${spring}" stroke="${C.purple}" stroke-width="2" fill="none"/>`+force(400,235,-88,0,C.purple,'F_упр',[-6,-12,'end'])+force(400,235,95,0,C.orange,'F_тр')+text(340,335,'r_max≈0,299 м',C.ink,22,'middle');
 }else b+=force(400,235,-90,0,C.orange,'F_тр')+text(340,335,id==='AB3A90'?'r=0,25 м;  ω=4 рад·с⁻¹':'r=0,80 м',C.ink,22,'middle');
 b+=arrow(300,110,-70,20,C.purple,'ω')+text(340,390,'Вид сбоку: вертикальные силы',C.ink,19,'middle')+line(230,505,440,505,C.ink,2)+block(335,485,42,40)+force(335,505,0,-88,C.green,'N')+force(335,485,0,98,C.red,'mg')+axes(115,540,-1)+text(470,470,'Oy ↑',C.ink,21)+text(470,510,'N=mg',C.green,21);
 if(id==='45157D')b+=text(340,635,'ω₁²r=3,2;  ω₂²r=1,8 м·с⁻²',C.ink,22,'middle')+text(340,675,'Оба значения меньше μg=4 м·с⁻²',C.ink,21,'middle');
 else b+=text(340,635,id==='0DDE03'?'F_упр−F_тр=mω²r':'На пороге: μmg=mω²r',C.ink,23,'middle');
 diagrams[id]=wrap(id,id==='0DDE03'?'Пружина и трение на вращающемся диске':id==='45157D'?'Два опыта с вращающимся диском':'Начало скольжения на диске',b,id==='45157D'?720:680);
}
{
 const id='582E9A',p=original(id,0,140,150,360),x=p.X(84),y=p.Y(17);
 const b=p.body+force(x,y,0,110,C.red,'mg')+arrow(x,y,-75,65,C.ink,'Ox',[-10,25,'end'])+arrow(x,y,-65,-75,C.ink,'Oy',[-10,-8,'end'])+
 text(340,570,'В точке A: N=0',C.green,23,'middle')+text(340,612,'sinα=(h−R)·R⁻¹',C.ink,23,'middle')+text(340,654,'E₀=0,020 Дж',C.blue,24,'middle');
 diagrams[id]=wrap(id,'Отрыв шайбы от внутренней поверхности',b,700);
}
{
 const id='6E569C',scale=200,ox=80,oy=440,alpha=Math.PI/6,v=2,g=1,points=[];
 for(let i=0;i<=60;i++){const t=2*v*Math.sin(alpha)/g*i/60;points.push(`${ox+75*v*Math.cos(alpha)*t},${oy-75*(v*Math.sin(alpha)*t-g*t*t/2)}`);}
 let b=axes(ox,oy)+`<polyline points="${points.join(' ')}" fill="none" stroke="${C.blue}" stroke-width="3"/>`+line(ox,oy,ox+260,oy-150,C.ink,3)+`<g transform="rotate(-30 ${ox+254.5} ${oy-159.5})">${block(ox+254.5,oy-159.5,30,22)}</g>`+force(ox+254.5,oy-159.5,0,60,C.red,'mg')+force(ox+260,oy-150,-42,-73,C.green,'N')+
 dot(ox+130,oy-37.5,C.blue,5)+force(ox+130,oy-37.5,0,78,C.red,'mg')+arrow(ox+130,oy-37.5,80,0,C.blue,'v_x')+
 arrow(ox,oy,85,-49,C.purple,'v₀')+text(430,185,'На склоне:',C.ink,21)+text(430,220,'h₂=v₀²·(2g)⁻¹',C.ink,20)+text(430,290,'Свободный бросок:',C.blue,20)+text(430,325,'h₁=h₂ sin²α',C.blue,20)+
 text(340,540,'При 0<α<90°: h₂>h₁',C.ink,23,'middle')+text(340,585,'Os — вверх по склону; On — по нормали',C.ink,20,'middle');
 diagrams[id]=wrap(id,'Сравнение высот подъёма',b,635);
}
{
 const id='A0A0B3';let b='';for(const [x,y,angle,name] of [[190,215,Math.PI/4,'α=45°'],[470,215,Math.PI/6,'β=30°']]){
 b+=text(x,90,name,C.ink,23,'middle')+line(x-95,y+25,x+95,y+25,C.ink,2)+block(x,y,62,50)+force(x,y,0,95,C.red,'mg')+force(x,y+25,0,-110,C.green,'N')+force(x+31,y,95*Math.cos(angle),-95*Math.sin(angle),C.blue,'F')+force(x,y+25,-85,0,C.orange,'F_тр',[-8,28,'end']);}
 b+=axes(110,470)+text(340,400,'Первый опыт: a=0',C.ink,22,'middle')+text(340,505,'Второй опыт: a≈0,178 м·с⁻²',C.ink,22,'middle')+text(340,565,'Модуль F одинаков в обоих опытах',C.ink,21,'middle');diagrams[id]=wrap(id,'Изменение угла тяги',b,615);
}
{
 const id='C961A9';let spring='M335 115';for(let i=0;i<12;i++)spring+=`l${i%2?24:-24} 8`;spring+='L335 235';
 const b=line(235,115,435,115,C.ink,5)+`<path d="${spring}" stroke="${C.purple}" stroke-width="2" fill="none"/>`+block(335,260,65,50)+force(335,235,0,-80,C.purple,'F_упр',[20,-15,'start'])+force(335,260,0,120,C.red,'mg')+arrow(490,215,0,110,C.blue,'a')+arrow(145,160,0,200,C.ink,'Oy',[-15,26,'end'])+arrow(145,360,65,0,C.ink,'Ox')+
 text(340,440,'x=1,5 см',C.ink,24,'middle')+text(340,485,'F_упр=1,5 Н; mg=2 Н',C.ink,23,'middle')+text(340,540,'a=2,5 м·с⁻² вниз',C.blue,24,'middle');diagrams[id]=wrap(id,'Груз в ускоряющемся вниз лифте',b,595);
}
module.exports={diagrams};
