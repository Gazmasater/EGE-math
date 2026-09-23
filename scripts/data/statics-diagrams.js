const fs = require('node:fs');
const path = require('node:path');
const sources = require('./statics-sources.json');
const root = path.resolve(__dirname, '../..');
const esc = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const sub = s => esc(s).replace(/_([А-Яа-яA-Za-z0-9]+)/g, '<tspan baseline-shift="sub" font-size="70%">$1</tspan>');
const colors = { weight:'#b42318', support:'#175cd3', tension:'#6941c6', buoyancy:'#087f6d', axis:'#475467' };
function label(x,y,text,color='#344054',anchor='start',size=18) {
  return `<text x="${x}" y="${y}" fill="${color}" text-anchor="${anchor}" font-size="${size}" paint-order="stroke" stroke="white" stroke-width="4" stroke-linejoin="round">${sub(text)}</text>`;
}
function arrow(x,y,dx,dy,name,kind='support',lx=10,ly=-7,anchor='start') {
  const c=colors[kind];
  return `<line data-force="${esc(name)}" x1="${x}" y1="${y}" x2="${x+dx}" y2="${y+dy}" stroke="${c}" stroke-width="3" marker-end="url(#s-${kind})"/>`+
    (name ? label(x+dx+lx,y+dy+ly,name,c,anchor) : '');
}
function axes(x=560,y=440,tilt=0) {
  return `<g transform="rotate(${tilt} ${x} ${y})">${arrow(x,y,55,0,'Ox','axis',7,6)}${arrow(x,y,0,-55,'Oy','axis',8,-3)}</g>`;
}
function wrap(id, body, note, height=540,width=680) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="s-title-${id} s-desc-${id}" data-statics-diagram="${id}">
<title id="s-title-${id}">Схема сил к задаче ${id}</title><desc id="s-desc-${id}">${esc(note)}</desc>
<defs>${Object.entries(colors).map(([k,c])=>`<marker id="s-${k}" markerUnits="userSpaceOnUse" markerWidth="11" markerHeight="10" refX="9" refY="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="${c}"/></marker>`).join('')}</defs>
<g font-family="Arial,sans-serif"><rect width="${width}" height="${height}" rx="12" fill="white"/>
${body}
${label(24,height-30,'Силы: тяжесть',colors.weight,'start',15)}${label(151,height-30,'реакции',colors.support,'start',15)}${label(243,height-30,'натяжение',colors.tension,'start',15)}${label(358,height-30,'Архимедова сила',colors.buoyancy,'start',15)}
</g></svg>`;
}
function picture(id,w,h,draw,opts={}) {
  const width=opts.width||680, height=opts.height||540;
  const scale=Math.min((opts.maxW||420)/w,(opts.maxH||340)/h);
  const iw=w*scale,ih=h*scale, x=(width-iw)/2+(opts.offsetX||0), y=opts.y||75;
  const p=(fx,fy)=>[x+iw*fx,y+ih*fy];
  const f=(fx,fy,dx,dy,name,kind,lx,ly,anchor)=>arrow(...p(fx,fy),dx,dy,name,kind,lx,ly,anchor);
  const t=(fx,fy,text,color,anchor,size)=>label(...p(fx,fy),text,color,anchor,size);
  const file=path.join(root,'fipi-assets',sources[id].image);
  const ext=path.extname(file);const mime=ext==='.gif'?'image/gif':ext==='.jpg'?'image/jpeg':'image/png';
  const src=`data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
  const content=`${label(24,32,'Силы на исходной схеме', '#344054','start',20)}<image data-fipi-source="${esc(sources[id].image)}" x="${x}" y="${y}" width="${iw}" height="${ih}" href="${src}"/>`;
  return wrap(id,content+draw({p,f,t,iw,ih,x,y})+(opts.noAxes?'':axes(width-105,height-103)),sources[id].image,height,width);
}
const diagrams = {};
for(const id of ['0CDBF9','A69E10']) {
  diagrams[id]=picture(id,95,159,({f})=>
    f(.023,.306,85,0,'N₁','support',8,-8)+
    f(.663,.438,-85,-61,'N₂','support',-10,-10,'end')+
    f(.378,.306,0,125,'mg','weight',12,0));
}
for(const id of ['2A7ADB','904771']) {
  diagrams[id]=picture(id,122,136,({f,t})=>
    f(.848,.238,-100,0,'T','tension',0,-13)+
    f(.632,.510,0,104,'mg','weight',12,6)+
    f(.415,.782,100,0,'F_x','support',10,6)+
    f(.415,.782,0,-100,'F_y','support',-12,0,'end'));
}
for(const [id,w,h] of [['29960D',89,124],['A48FB7',88,123]]) {
  diagrams[id]=picture(id,w,h,({f,t})=>
    f(.50,.397,0,138,'mg','weight',15,0)+
    f(.50,.34,0,-83,'F_кер','buoyancy',-12,0,'end')+
    f(.50,.53,0,-42,'F_в','buoyancy',14,0)+
    t(1.04,.28,'керосин','#344054','start',16)+t(1.04,.80,'вода','#344054','start',16));
}
for(const [id,w,h,A,C,B,load] of [
  ['27EF85',234,243,[.182,.291],[.342,.438],[.56,.65],[.878,.947]],
  ['BBC367',276,265,[.178,.291],[.271,.474],[.429,.741],[.881,.947]],
]) {
  diagrams[id]=picture(id,w,h,({f})=>
    f(...A,-65,0,'R_x','support',-8,5,'end')+f(...A,0,-58,'R_y','support',10,-3)+
    f(...C,0,65,'m₁g','weight',-10,0,'end')+f(...B,0,88,'m₂g','weight',10,8)+
    f(...B,id==='27EF85'?23:43,id==='27EF85'?-86:-75,'T','tension',id==='27EF85'?12:-12,-8,id==='27EF85'?'start':'end')+
    f(load[0],load[1]-.047,0,-73,'T','tension',12,-2)+
    f(...load,0,55,'Mg','weight',12,5),{height:570});
}
diagrams['2E71C0']=picture('2E71C0',243,229,({f,t})=>
  f(.273,.399,0,-92,'R','support',-12,0,'end')+
  f(.899,.399,0,-103,'F','tension',13,-2)+
  f(.486,.399,0,50,'T','tension',-12,5,'end')+
  f(.586,.399,0,105,'mg','weight',12,5)+
  f(.486,.768,0,-44,'T','tension',12,0)+
  f(.486,.85,0,66,'Mg','weight',12,4)+t(.245,.435,'O','#344054','end'));

for(const [id,w,h,A,B,C,ball] of [
  ['36135B',152,146,[.110,.139],[.879,.891],[.314,.338],[.314,.494]],
  ['F9BE3E',122,167,[.065,.179],[.891,.788],[.633,.597],[.633,.735]],
]) {
  diagrams[id]=picture(id,w,h,({f,t})=>
    f(...A,82,0,'N_л','support',10,-12)+
    f(...B,-80,0,'N_пр','support',-10,25,'end')+
    f(...B,0,-95,'N_д','support',12,-6)+
    f(...C,0,33,'T','tension',12,-3)+
    f(ball[0],ball[1]-.035,0,-22,'T','tension',-10,0,'end')+
    f(...ball,0,66,'mg','weight',10,3)+
    t(A[0]-.04,A[1]+.075,'A','#344054','end')+t(B[0]+.05,B[1]+.02,'B')+
    t(C[0]-.05,C[1]-.005,'C','#344054','end'));
}
diagrams['418761']=picture('418761',353,234,({f,t,p})=> {
  const [ox,oy]=p(.769,.302),[leftx,lefty]=p(.686,.302),[rightx,righty]=p(.906,.302);
  return f(.153,.741,0,-88,'N','support',-10,0,'end')+
    f(.420,.721,0,98,'Mg','weight',12,5)+f(.688,.741,0,-67,'T₁','tension',-12,0,'end')+
    f(.686,.302,0,58,'T₁','tension',-13,-8,'end')+
    f(.906,.302,0,58,'T₂','tension',12,-8)+
    f(.769,.302,0,-92,'Q','support',14,0)+
    f(.906,.650,0,-32,'T₂','tension',12,-5)+f(.906,.711,0,100,'mg','weight',-12,0,'end')+
    `<path d="M${leftx} ${lefty}H${ox}H${rightx}" stroke="#98a2b3" fill="none" stroke-dasharray="4 4"/>`+
    t(.420,.83,'C','#344054','middle')+t(.72,.35,'r','#344054','middle',15)+t(.83,.27,'R','#344054','middle',15);
},{y:108,maxW:490,maxH:340});

diagrams['62CDEC']=picture('62CDEC',121,222,({f})=>
  f(.338,.565,0,-76,'T₁','tension',-12,0,'end')+
  f(.338,.635,0,85,'mg','weight',-12,8,'end')+
  f(.338,.635,0,-38,'F_А','buoyancy',12,0)+
  f(.646,.685,0,-61,'T₁','tension',12,0)+
  f(.646,.871,0,66,'F_креп','support',12,5));

diagrams['652146']=picture('652146',312,97,({f,t})=>
  f(.084,.380,0,100,'m₁g','weight',12,0)+f(.916,.373,0,100,'m₂g','weight',12,0)+
  f(.322,.572,0,-71,'N_C','support',10,-4)+f(.790,.572,0,-100,'N_D','support',12,-4)+
  t(.12,1.55,'AC=0,20 м','#344054','start',18)+t(.50,1.55,'CD=0,60 м','#344054','start',18),{y:190,maxW:500,maxH:260});

diagrams['6AB9E6']=picture('6AB9E6',87,143,({f})=>
  f(.026,.638,94,0,'N','support',12,-10)+
  f(.209,.436,-34,-93,'T','tension',-12,-4,'end')+
  f(.432,.638,0,113,'mg','weight',12,0)+
  f(.432,.638,0,-97,'F_А','buoyancy',12,-5));

for(const id of ['7018C7','7823C1']) {
  diagrams[id]=picture(id,113,128,({f,t})=>
    f(.258,.977,95,0,'N_л','support',12,6)+f(.258,.977,0,-87,'N_д','support',-12,0,'end')+
    f(.981,.103,-88,0,'N','support',-10,-11,'end')+
    f(.620,.540,0,105,'mg','weight',12,0)+
    f(.499,.686,0,-92,'F_А','buoyancy',-10,-4,'end')+
    t(.18,1.075,'A','#344054','end')+t(1.03,.10,'B'),{height:560});
}
diagrams['A1B57A']=picture('A1B57A',212,158,({p,t})=>{
  const [x1,y]=p(.34,.461),[x2]=p(.68,.461);
  return `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#087f6d" stroke-dasharray="6 4" stroke-width="3"/>`+
    t(.5,1.16,'p_лев = p_прав','#087f6d','middle',20)+
    t(.5,1.31,'ρ₁ = 800 кг·м⁻³; ρ₂ = 1000 кг·м⁻³','#344054','middle',17);
},{y:85,maxW:430,maxH:310});

diagrams['B468EB']=picture('B468EB',527,377,({f,t})=>
  f(.475,.663,-67,-67,'F','tension',-10,-8,'end')+
  f(.612,.663,0,34,'T','tension',12,-1)+
  f(.712,.663,0,96,'Mg','weight',12,0)+
  f(.881,.663,65,0,'R_x','support',10,6)+f(.881,.663,0,-83,'R_y','support',12,0)+
  f(.612,.801,0,-29,'T','tension',-13,4,'end')+
  f(.612,.883,0,80,'mg','weight',12,5)+t(.72,.63,'D','#344054','start',16),
  {width:780,height:620,maxW:570,maxH:410,y:80});

diagrams['B938AE']=picture('B938AE',255,115,({f,t})=>
  f(.760,.476,0,-90,'N','support',12,0)+
  f(.608,.462,0,100,'Mg','weight',-10,0,'end')+
  f(.942,.420,0,90,'mg','weight',12,0)+t(.775,.95,'O','#344054','start'),{y:170,maxW:480});

for(const [id,w,h,left,right,center,attach,top,middle] of [
  ['DEAB32',216,190,[.112,.606],[.857,.606],[.484,.606],[.645,.606],[.645,.732],[.645,.794]],
  ['EB0004',91,70,[.131,.665],[.895,.665],[.512,.665],[.714,.665],[.714,.826],[.714,.916]],
]) {
  diagrams[id]=picture(id,w,h,({f})=>
    f(...left,0,-93,'F_л','support',-12,0,'end')+f(...right,0,-118,'F_пр','support',12,0)+
    f(...center,0,85,'Mg','weight',-12,7,'end')+
    f(...attach,0,38,'T','tension',12,3)+f(...top,0,-25,'T','tension',-12,4,'end')+
    f(...middle,0,86,'mg','weight',12,5),{y:90,height:560,maxW:420});
}
diagrams['E9B775']=picture('E9B775',112,91,({f})=>
  f(.505,.507,0,-107,'T','tension',12,-4)+
  f(.505,.593,0,116,'mg','weight',12,0)+
  f(.505,.593,0,-47,'F_А','buoyancy',-12,0,'end'),{y:110,maxW:390,maxH:300});

diagrams['CFC86C']=picture('CFC86C',149,126,({f,p})=>{
  // Направление плоскости берём с оригинала, а не по найденному предельному углу.
  const dx=83,dy=-43.5;
  const [cx,cy]=p(.456,.522),[ax,ay]=p(.520,.664);
  return f(.392,.376,dx,dy,'T','tension',9,-8)+
    f(.520,.664,dx,dy,'F_тр','support',12,16)+
    f(.520,.664,-43,-80,'N','support',-12,-5,'end')+
    f(.456,.522,0,108,'mg','weight',12,0)+
    `<line x1="${cx}" y1="${cy}" x2="${ax}" y2="${ay}" stroke="#98a2b3" stroke-dasharray="4 4"/>`+
    axes(565,440,-28);
},{noAxes:true,y:90,maxW:390});

diagrams['D59EAC']=picture('D59EAC',266,115,({f,t})=>
  f(.780,.179,0,-83,'R_y','support',12,0)+f(.780,.179,68,0,'R_x','support',10,6)+
  f(.536,.431,0,65,'mg','weight',13,5)+
  f(.288,.697,0,-81,'N','support',12,0)+f(.288,.697,-72,0,'F_тр','support',-10,-10,'end')+
  f(.288,.697,74,0,'F_тр','support',12,20)+
  f(.134,.778,-65,0,'F','tension',-10,7,'end')+
  f(.288,.697,0,68,'N','support',-12,6,'end')+
  f(.432,.778,0,99,'M_д·g','weight',12,5)+f(.55,.852,0,-59,'N_оп','support',13,-2)+
  t(.83,.26,'A')+t(.27,.64,'B','#344054','end'),{y:190,maxW:440});

function vessel(x,y,w,h,level) {
  return `<rect x="${x}" y="${level}" width="${w}" height="${y+h-level}" fill="#e0f2fe"/><path d="M${x} ${y}v${h}h${w}v-${h}" fill="none" stroke="#667085" stroke-width="3"/><path d="M${x} ${level}h${w}" stroke="#0e7490" stroke-width="2"/>`;
}
const ball=(x,y,r=45)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#fff9e6" stroke="#344054" stroke-width="2"/>`;
diagrams['1F1FD6']=wrap('1F1FD6',label(24,32,'Цилиндр наполовину в воде','#344054','start',20)+
  vessel(150,90,330,310,255)+`<rect x="267" y="165" width="96" height="180" fill="#f2f4f7" stroke="#344054" stroke-width="2"/><path d="M315 80V165" stroke="#344054" stroke-width="2"/><path d="M150 255H480" stroke="#0e7490" stroke-dasharray="5 4"/>`+
  arrow(315,165,0,-95,'F','tension',12,-4)+arrow(315,300,0,-66,'F_А','buoyancy',12,-4)+
  arrow(315,255,0,115,'mg','weight',12,0)+label(390,325,'½V')+axes(), 'На цилиндре F вверх, F_А вверх, mg вниз; погружена половина объёма.');
diagrams['DB692A']=wrap('DB692A',label(24,32,'Шар наполовину в воде','#344054','start',20)+
  vessel(150,90,340,290,290)+ball(320,290,90)+arrow(320,380,0,-57,'N','support',-12,-2,'end')+
  arrow(320,324,0,-109,'F_А','buoyancy',12,-3)+arrow(320,290,0,125,'mg','weight',12,0)+axes(),
  'Шар касается дна; N и F_А вверх, mg вниз.');
diagrams['7733A6']=wrap('7733A6',label(24,32,'Плавающая льдина','#344054','start',20)+
  `<rect x="100" y="165" width="440" height="245" fill="#e0f2fe"/><rect x="180" y="145" width="270" height="200" fill="#f0faff" stroke="#344054" stroke-width="2"/><path d="M100 165H540" stroke="#0e7490" stroke-width="2" stroke-dasharray="5 4"/>`+
  arrow(315,255,0,-118,'F_А','buoyancy',12,-2)+arrow(315,245,0,135,'mg','weight',12,0)+
  `<path d="M150 145V345M143 145H157M143 345H157M482 145V165M476 145H488M476 165H488" stroke="#475467" fill="none" stroke-width="2"/>`+
  label(129,252,'H')+label(498,156,'h')+axes(), 'Толщина H, надводная часть h; сила Архимеда уравновешивает mg.');
diagrams['328102']=wrap('328102',label(24,32,'До и после перерезания нити','#344054','start',20)+
  vessel(60,85,220,320,140)+vessel(380,85,220,320,230)+ball(170,248)+ball(490,225)+
  `<path d="M170 293V405" stroke="#344054" stroke-width="2"/><path d="M380 140H620" stroke="#667085" stroke-dasharray="5 4"/>`+
  arrow(170,248,0,-94,'F_А1','buoyancy',12,-4)+arrow(170,248,0,81,'mg','weight',12,0)+
  arrow(170,293,0,84,'T','tension',-12,0,'end')+
  arrow(490,244,0,-99,'F_А2','buoyancy',12,0)+arrow(490,225,0,102,'mg','weight',12,0)+
  `<path d="M630 140V230M625 140H635M625 230H635" stroke="#475467" stroke-width="2"/>`+label(641,194,'h')+
  label(170,445,'Нить натянута','#344054','middle')+label(490,445,'Шар плавает','#344054','middle'),
  'Уровень воды после всплытия ниже на h; натяжение до разрезания направлено вниз.');

diagrams['F5E61D']=wrap('F5E61D',label(24,32,'Рычаг в воздухе и в воде','#344054','start',20)+
  [0,330].map((off,i)=>{
    const left=off+45,right=off+290,pivot=left+(right-left)*(i?.1:.2), yy=140;
    return label(off+30,70,i?'В воде':'В воздухе','#344054','start',18)+
      `<path d="M${left} ${yy}H${right}" stroke="#344054" stroke-width="7"/><path d="M${pivot} ${yy}l-14 24h28z" fill="#98a2b3"/>`+
      arrow(left,yy,0,72,i?'T′₁':'T₁','tension',11,0)+arrow(right,yy,0,72,i?'T′₂':'T₂','tension',-12,0,'end')+
      arrow(pivot,yy,0,-44,i?'N′':'N','support',10,0)+
      label(off+150,255,i?'y = 0,10L':'x = 0,20L','#344054','middle',17);
  }).join('')+
  label(24,300,'Погружённые грузы: одинаковые объёмы','#344054','start',18)+
  `<rect x="40" y="340" width="590" height="200" fill="#e0f2fe"/>`+
  [195,485].map((x,i)=>ball(x,430)+arrow(x,385,0,-58,`T′${i?'₂':'₁'}`,'tension',12,-2)+
    arrow(x,430,0,-58,'F_А','buoyancy',-12,-1,'end')+arrow(x,430,0,85,`m${i?'₂':'₁'}g`,'weight',12,0)).join(''),
  'Два положения опоры и силы на двух равных по объёму погружённых грузах.',610);

module.exports = { diagrams };
