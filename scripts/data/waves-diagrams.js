const fs = require('node:fs');
const path = require('node:path');
const sources = require('./waves-sources.json');
const C = {ink:'#344054',blue:'#175cd3',red:'#b42318',green:'#087f6d',purple:'#6941c6',gray:'#98a2b3'};
const esc = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const label = s => esc(s).replace(/_([А-Яа-яA-Za-z0-9]+)/g, '<tspan baseline-shift="sub" font-size="70%">$1</tspan>');
const text = (x,y,s,c=C.ink,size=20,anchor='start') => `<text x="${x}" y="${y}" fill="${c}" font-size="${size}" text-anchor="${anchor}" paint-order="stroke" stroke="white" stroke-width="4" stroke-linejoin="round">${label(s)}</text>`;
const line = (x,y,X,Y,c=C.ink,w=2,dash='') => `<line x1="${x}" y1="${y}" x2="${X}" y2="${Y}" stroke="${c}" stroke-width="${w}" ${dash?`stroke-dasharray="${dash}"`:''}/>`;
const dot = (x,y,c=C.ink,r=4) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;
function arrow(x,y,dx,dy,c=C.blue,s='',off=[10,-10,'start']) {
  const key=Object.keys(C).find(k=>C[k]===c);
  return `<path d="M${x} ${y}l${dx} ${dy}" fill="none" stroke="white" stroke-width="7"/><path d="M${x} ${y}l${dx} ${dy}" fill="none" stroke="${c}" stroke-width="3" marker-end="url(#wv-${key})"/>`+(s?text(x+dx+off[0],y+dy+off[1],s,c,20,off[2]):'');
}
const force=(...args)=>arrow(...args)+dot(args[0],args[1],args[4]);
function wrap(id,title,body,h=650) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 ${h}" role="img" aria-labelledby="wv-title-${id}" data-waves-diagram="${id}"><title id="wv-title-${id}">${esc(title)}</title><defs>${Object.entries(C).map(([key,c])=>`<marker id="wv-${key}" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="${c}"/></marker>`).join('')}</defs><g font-family="Arial,sans-serif"><rect width="680" height="${h}" rx="12" fill="white"/>${text(24,35,title,C.ink,23)}${body}</g></svg>`;
}
function original(id,x,y,w) {
  const file=sources[id].images[0],bytes=fs.readFileSync(path.join(__dirname,'../../fipi-assets',file));
  const iw=bytes.readUInt32BE(16),ih=bytes.readUInt32BE(20),scale=w/iw,h=ih*scale;
  return {X:v=>x+v*scale,Y:v=>y+v*scale,body:`<image data-fipi-source="${file}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet" href="data:image/png;base64,${bytes.toString('base64')}"/>`};
}
const diagrams={};
for (const id of ['7D75F6','CCDEE7']) {
  const first=id==='7D75F6',p=original(id,150,125,380);
  const [cx,cy,left,right,contact,attach]=first?[99,63,81,115,91,69]:[80,58,64,95,84,54];
  let b=text(340,80,'Показано растяжение пружины: x>0',C.ink,21,'middle')+p.body;
  b+=force(p.X(attach),p.Y(cy),-90,0,C.purple,'F_упр',[-3,-19,'middle']);
  b+=force(p.X(cx),p.Y(cy),0,125,C.red,'mg',[12,15,'start']);
  b+=force(p.X(left),p.Y(contact),0,-145,C.green,'N₁',[-14,-9,'end']);
  b+=force(p.X(right),p.Y(contact),0,-145,C.green,'N₂',[12,-10,'start']);
  b+=arrow(85,425,75,0,C.ink,'Ox',[10,6,'start'])+arrow(85,425,0,-60,C.ink,'Oy',[-10,-10,'middle']);
  b+=text(545,440,'N=N₁+N₂=mg',C.green,22,'middle');
  b+=line(135,505,545,505,C.gray,3)+dot(165,505)+dot(340,505,C.blue)+dot(515,505);
  b+=text(165,541,'−A',C.ink,23,'middle')+text(340,541,'O: x=0',C.blue,23,'middle')+text(515,541,'+A',C.ink,23,'middle');
  b+=text(165,478,'v=0',C.ink,20,'middle')+text(340,478,'v=v_max',C.blue,20,'middle')+text(515,478,'v=0',C.ink,20,'middle');
  b+=text(340,589,first?'F_max=20 Н при |x|=A=0,1 м':'v_max=1 м·с⁻¹; A=0,1 м',C.ink,25,'middle');
  diagrams[id]=wrap(id,first?'Максимальная сила упругости':'Максимальная скорость тележки',b,625);
}

{
  const id='23085B';
  let spring='M120 72v12';for(let i=0;i<7;i++)spring+=`l-9 6l18 8l-9 6`;spring+='v12';
  let b=line(75,70,165,70,C.ink,4)+`<path d="${spring}" fill="none" stroke="${C.ink}" stroke-width="2"/>`;
  b+='<rect x="103" y="236" width="34" height="38" rx="4" fill="#eff8ff" stroke="#344054" stroke-width="2"/>';
  b+=force(120,236,0,-95,C.blue,'F_упр',[12,-8,'start'])+force(120,255,0,105,C.red,'mg',[12,5,'start']);
  b+=arrow(230,80,0,310,C.ink,'Ox',[10,-4,'start'])+line(72,310,235,310,C.gray,2,'6 5')+text(244,315,'O',C.ink,20);
  b+=text(155,283,'x<0',C.purple,19)+text(50,405,'t=0,6 с: груз выше O',C.ink,19);
  const X=t=>305+t*168,Y=x=>204-x*4.9;
  b+=arrow(292,204,345,0,C.ink,'t, с',[-4,-13,'end'])+arrow(305,325,0,-237,C.ink,'x, см',[-9,-13,'start']);
  for(const v of [-20,20])b+=line(300,Y(v),610,Y(v),C.gray,1,'4 5')+text(295,Y(v)+6,String(v),C.ink,17,'end');
  let d='';for(let n=0;n<=180;n++){const t=n/100;d+=(n?'L':'M')+X(t).toFixed(2)+' '+Y(20*Math.cos(2*Math.PI*t/1.6)).toFixed(2);}
  b+=`<path data-wave-coordinate-graph="cosine" d="${d}" fill="none" stroke="${C.blue}" stroke-width="3"/>`;
  for(const t of [.4,.8,1.2,1.6])b+=line(X(t),200,X(t),209)+text(X(t),231,String(t).replace('.',','),C.ink,16,'middle');
  const tx=X(.6),ty=Y(-20/Math.sqrt(2));b+=line(tx,204,tx,ty,C.purple,2,'5 4')+dot(tx,ty,C.purple,5);
  b+=text(465,359,'x(0,6 с)≈−14,2 см',C.purple,20,'middle')+text(465,394,'A=20 см; T=1,6 с',C.ink,21,'middle');
  b+=text(340,454,'Энергия колебаний E=4 Дж',C.ink,23,'middle');
  b+='<rect x="90" y="482" width="250" height="38" fill="#175cd3"/><rect x="340" y="482" width="250" height="38" fill="#087f6d"/>';
  b+=text(210,557,'K≈2 Дж',C.blue,23,'middle')+text(465,557,'U−U(O)≈2 Дж',C.green,22,'middle');
  b+=text(340,602,'Учитываются и пружина, и сила тяжести',C.ink,20,'middle');
  diagrams[id]=wrap(id,'Энергия вертикальных колебаний',b,635);
}

{
  const id='F717A0',p=original(id,165,75,360);
  let b=p.body+text(440,320,'p₁<p₀',C.blue,24,'middle');
  b+=force(p.X(86),p.Y(85),-95,0,C.purple,'F_упр',[-5,-15,'middle']);
  b+=force(p.X(86),p.Y(63),90,0,C.blue,'p₀S',[-18,-14,'middle']);
  b+=force(p.X(100),p.Y(103),-90,0,C.red,'p₁S',[-8,25,'middle']);
  b+=text(340,390,'До открытия: p₀S−p₁S−kx₀=0',C.ink,23,'middle');
  b+=text(340,357,'Воздух входит через отверстие справа',C.blue,20,'middle');
  b+=arrow(125,438,445,0,C.ink,'Ox',[10,6,'start']);
  b+=line(310,420,310,465,C.gray,2,'5 4')+line(455,420,455,465,C.gray,2,'5 4');
  b+=text(310,495,'O: x=0',C.ink,22,'middle')+text(455,495,'x₀>0',C.ink,22,'middle');
  b+=arrow(455,548,-145,0,C.purple,'первое движение — влево',[-5,34,'start']);
  b+=text(340,620,'Колебания около O; пружина в O не деформирована',C.ink,20,'middle');
  diagrams[id]=wrap(id,'Поршень после открытия сосуда',b,660);
}

{
  const id='963FCF',p=original(id,110,115,440);
  let b=p.body+arrow(p.X(139),p.Y(18),0,65,C.blue,'I',[14,-12,'start']);
  b+=force(p.X(139),p.Y(65),-70,0,C.red,'F_А',[-3,-16,'middle']);
  b+=force(p.X(139),p.Y(92),95,0,C.green,'F_внеш',[-4,27,'middle']);
  b+=arrow(110,435,100,0,C.ink,'Ox',[10,5,'start'])+arrow(110,435,0,-60,C.ink,'Oy',[-12,-8,'middle']);
  b+=text(445,422,'F_внеш=F_А; N=mg',C.ink,22,'middle');
  b+=text(340,485,'W постоянно → I постоянно → ЭДС самоиндукции 0',C.ink,20,'middle');
  b+=text(340,537,'W=8 мкДж; I=0,040 А',C.blue,25,'middle');
  b+=text(340,585,'ε=Blv=IR; v=0,4 м·с⁻¹',C.ink,25,'middle');
  diagrams[id]=wrap(id,'Энергия катушки и скорость стержня',b,625);
}

module.exports={diagrams};
