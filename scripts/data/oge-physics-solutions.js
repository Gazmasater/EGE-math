const fs = require('node:fs');
const path = require('node:path');
const definitions = [
  {name:'oge-motion',topic:'1.1',data:require('./oge-physics-motion'),sources:require('./oge-physics-motion-sources.json')},
  {name:'oge-speed-graphs',topic:'1.2',data:require('./oge-physics-speed-graphs'),sources:require('./oge-physics-speed-graphs-sources.json')},
  {name:'oge-uniform',topic:'1.3',data:require('./oge-physics-uniform'),sources:require('./oge-physics-uniform-sources.json')},
  {name:'oge-acceleration',topic:'1.4',data:require('./oge-physics-acceleration'),sources:require('./oge-physics-acceleration-sources.json')},
  {name:'oge-freefall',topic:'1.5',data:require('./oge-physics-freefall'),sources:require('./oge-physics-freefall-sources.json')},
  {name:'oge-circular',topic:'1.6',data:require('./oge-physics-circular'),sources:require('./oge-physics-circular-sources.json')},
  {name:'oge-density',topic:'1.7',data:require('./oge-physics-density'),sources:require('./oge-physics-density-sources.json')},
  {name:'oge-forces',topic:'1.8',data:require('./oge-physics-forces'),sources:require('./oge-physics-forces-sources.json')},
  {name:'oge-newton1',topic:'1.9',data:require('./oge-physics-newton1'),sources:require('./oge-physics-newton1-sources.json')},
  {name:'oge-newton2',topic:'1.10',data:require('./oge-physics-newton2'),sources:require('./oge-physics-newton2-sources.json')},
  {name:'oge-newton3',topic:'1.11',data:require('./oge-physics-newton3'),sources:require('./oge-physics-newton3-sources.json')},
  {name:'oge-friction',topic:'1.12',data:require('./oge-physics-friction'),sources:require('./oge-physics-friction-sources.json')},
  {name:'oge-elastic',topic:'1.13',data:require('./oge-physics-elastic'),sources:require('./oge-physics-elastic-sources.json')},
  {name:'oge-gravity',topic:'1.14',data:require('./oge-physics-gravity'),sources:require('./oge-physics-gravity-sources.json')},
  {name:'oge-impulse',topic:'1.15',data:require('./oge-physics-impulse'),sources:require('./oge-physics-impulse-sources.json')},
  {name:'oge-conservation',topic:'1.16',data:require('./oge-physics-conservation'),sources:require('./oge-physics-conservation-sources.json')},
  {name:'oge-work',topic:'1.17',data:require('./oge-physics-work'),sources:require('./oge-physics-work-sources.json')},
  {name:'oge-energy',topic:'1.18',data:require('./oge-physics-energy'),sources:require('./oge-physics-energy-sources.json')},
  {name:'oge-mechanical-conservation',topic:'1.19',data:require('./oge-physics-mechanical-conservation'),sources:require('./oge-physics-mechanical-conservation-sources.json')},
  {name:'oge-equilibrium',topic:'1.20',data:require('./oge-physics-equilibrium'),sources:require('./oge-physics-equilibrium-sources.json')},
  {name:'oge-pressure',topic:'1.21',data:require('./oge-physics-pressure'),sources:require('./oge-physics-pressure-sources.json')},
  {name:'oge-pascal',topic:'1.22',data:require('./oge-physics-pascal'),sources:require('./oge-physics-pascal-sources.json')},
  {name:'oge-buoyancy',topic:'1.23',data:require('./oge-physics-buoyancy'),sources:require('./oge-physics-buoyancy-sources.json')},
  {name:'oge-oscillations',topic:'1.24',data:require('./oge-physics-oscillations'),sources:require('./oge-physics-oscillations-sources.json')},
  {name:'oge-pendulums',topic:'1.25',data:{records:[]},sources:{}},
  {name:'oge-waves',topic:'1.27',data:require('./oge-physics-waves-sound').waves,sources:require('./oge-physics-waves-sound-sources.json')},
  {name:'oge-sound',topic:'1.28',data:require('./oge-physics-waves-sound').sound,sources:require('./oge-physics-waves-sound-sources.json')},
  {name:'oge-mechanics-application',topic:'1.29',data:require('./oge-physics-mechanics-application'),sources:require('./oge-physics-mechanics-application-sources.json')},
  {name:'oge-experiment-analysis',topic:'1.30',data:{records:[]},sources:{}},
  {name:'oge-measurement-practice',topic:'1.31',data:require('./oge-physics-measurement-practice'),sources:require('./oge-physics-measurement-practice-sources.json')},
  {name:'oge-thermal-particles',topic:'2.2',data:require('./oge-physics-thermal-particles'),sources:require('./oge-physics-thermal-particles-sources.json')},
  ...['2.3','2.4','2.5'].map((topic,i)=>({name:['oge-surface-properties','oge-thermal-expansion','oge-thermal-equilibrium'][i],topic,data:{records:require('./oge-physics-thermal-properties').records.filter(r=>r.topic===topic)},sources:require('./oge-physics-thermal-properties-sources.json')})),
  {name:'oge-heat-transfer',topic:'2.7',data:require('./oge-physics-heat-transfer'),sources:require('./oge-physics-heat-transfer-sources.json')},
  {name:'oge-heat-capacity',topic:'2.8',data:require('./oge-physics-heat-capacity'),sources:require('./oge-physics-heat-capacity-sources.json')},
  {name:'oge-heat-balance',topic:'2.9',data:require('./oge-physics-heat-balance'),sources:require('./oge-physics-heat-balance-sources.json')},
  {name:'oge-evaporation',topic:'2.10',data:require('./oge-physics-evaporation'),sources:require('./oge-physics-evaporation-sources.json')},
  {name:'oge-humidity',topic:'2.11',data:require('./oge-physics-humidity'),sources:require('./oge-physics-humidity-sources.json')},
  {name:'oge-fuel',topic:'2.13',data:require('./oge-physics-fuel'),sources:require('./oge-physics-fuel-sources.json')},
  {name:'oge-engines',topic:'2.14',data:{records:[]},sources:{}},
  ...['2.16','2.17'].map((topic,i)=>({name:['oge-thermal-measurement','oge-thermal-experiment'][i],topic,data:{records:require('./oge-physics-thermal-apparatus').records.filter(r=>r.topic===topic)},sources:require('./oge-physics-thermal-apparatus-sources.json')})),
  {name:'oge-electrostatic-charge',topic:'3.1',data:require('./oge-physics-electrostatic-charge'),sources:require('./oge-physics-electrostatic-charge-sources.json')},
  ...['3.2','3.3'].map((topic,i)=>({name:['oge-charge-interaction','oge-charge-conservation'][i],topic,data:{records:require('./oge-physics-charge-calculations').records.filter(r=>r.topic===topic)},sources:require('./oge-physics-charge-calculations-sources.json')})),
  {name:'oge-electric-field',topic:'3.4',data:require('./oge-physics-electric-field'),sources:require('./oge-physics-electric-field-sources.json')},
  {name:'oge-electric-current',topic:'3.5',data:require('./oge-physics-electric-current'),sources:require('./oge-physics-electric-current-sources.json')},
  {name:'oge-current-voltage',topic:'3.6',data:require('./oge-physics-current-voltage'),sources:require('./oge-physics-current-voltage-sources.json')},
  {name:'oge-resistance',topic:'3.7',data:require('./oge-physics-resistance'),sources:require('./oge-physics-resistance-sources.json')},
  {name:'oge-ohm-circuits',topic:'3.8',data:require('./oge-physics-ohm-circuits'),sources:require('./oge-physics-ohm-circuits-sources.json')},
  {name:'oge-electric-work-power',topic:'3.9',data:require('./oge-physics-electric-work-power'),sources:require('./oge-physics-electric-work-power-sources.json')},
  {name:'oge-joule-lenz',topic:'3.10',data:require('./oge-physics-joule-lenz'),sources:require('./oge-physics-joule-lenz-sources.json')},
  {name:'oge-electric-heating',topic:'3.11',data:require('./oge-physics-electric-heating'),sources:require('./oge-physics-electric-heating-sources.json')},
  {name:'oge-magnetic-field',topic:'3.12',data:require('./oge-physics-magnetic-field'),sources:require('./oge-physics-magnetic-field-sources.json')},
  {name:'oge-permanent-magnets',topic:'3.13',data:require('./oge-physics-permanent-magnets'),sources:require('./oge-physics-permanent-magnets-sources.json')},
  {name:'oge-electromagnetic-induction',topic:'3.15',data:require('./oge-physics-electromagnetic-induction'),sources:require('./oge-physics-electromagnetic-induction-sources.json')},
  {name:'oge-electric-experiment',topic:'3.16',data:require('./oge-physics-electric-experiment'),sources:require('./oge-physics-electric-experiment-sources.json')},
  {name:'oge-reflection',topic:'3.21',data:require('./oge-physics-reflection'),sources:require('./oge-physics-reflection-sources.json')},
  {name:'oge-lenses',topic:'3.24',data:require('./oge-physics-lenses'),sources:require('./oge-physics-lenses-sources.json')},
  ...['3.25','3.26','3.28'].map((topic,i)=>({name:['oge-eye','oge-optical-experiment','oge-optical-devices'][i],topic,data:{records:require('./oge-physics-optical-applications').records.filter(r=>r.topic===topic)},sources:require('./oge-physics-optical-applications-sources.json')})),
  ...['4.2','4.3'].map((topic,i)=>({name:['oge-rutherford','oge-isotopes'][i],topic,data:{records:require('./oge-physics-nuclear-composition').records.filter(r=>r.topic===topic)},sources:require('./oge-physics-nuclear-composition-sources.json')})),
  ...['4.1','4.4','4.5','4.6'].map((topic,i)=>({name:['oge-radioactivity','oge-half-life','oge-nuclear-reactions','oge-nuclear-energy'][i],topic,data:{records:require('./oge-physics-nuclear-decay').records.filter(r=>r.topic===topic)},sources:require('./oge-physics-nuclear-decay-sources.json')})),
  ...['3.18','4.7'].map((topic,i)=>({name:['oge-electric-devices','oge-radiation-devices'][i],topic,data:{records:require('./oge-physics-electric-devices').records.filter(r=>r.topic===topic)},sources:require('./oge-physics-electric-devices-sources.json')})),
  {name:'oge-concepts',topic:'methods.concepts',data:require('./oge-physics-concepts'),sources:require('./oge-physics-concepts-sources.json')},
  {name:'oge-measurements',topic:'methods.measurements',data:require('./oge-physics-measurements'),sources:require('./oge-physics-measurements-sources.json')},
  {name:'oge-internal-energy',topic:'2.6',data:require('./oge-physics-internal-energy'),sources:require('./oge-physics-internal-energy-sources.json')},
  ...[['oge-melting','2.12','OGEPHYS0B8B06'],['oge-refraction','3.22','OGEPHYSDDDA91']].map(([name,topic,id])=>({name,topic,data:{records:[...require('./'+name.replace('oge-','oge-physics-')).records,...require('./oge-physics-recovered-final').records.filter(r=>r.id===id)]},sources:{...require('./'+name.replace('oge-','oge-physics-')+'-sources.json'),[id]:require('./oge-physics-recovered-final-sources.json')[id]}})),
  ...['2.1','3.27','methods.text'].map((topic,i)=>({name:['oge-matter-states','oge-colors','oge-reading'][i],topic,data:{records:require('./oge-physics-matter-colors').records.filter(r=>r.topic===topic)},sources:require('./oge-physics-matter-colors-sources.json')})),
  {name:'oge-electromagnetic-waves',topic:'3.19',data:require('./oge-physics-electromagnetic-waves'),sources:require('./oge-physics-electromagnetic-waves-sources.json')},
  ...['3.20','3.23'].map((topic,i)=>({name:['oge-light-rays','oge-dispersion'][i],topic,data:{records:require('./oge-physics-light-dispersion').records.filter(r=>r.topic===topic)},sources:require('./oge-physics-light-dispersion-sources.json')})),
];
const root = path.resolve(__dirname, '../..');
const escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function wrap(s, limit = 57) {
  const lines = [''];
  for (const word of s.split(' ')) {
    if (lines.at(-1).length + word.length + 1 > limit) lines.push(word);
    else lines[lines.length - 1] += (lines.at(-1) ? ' ' : '') + word;
  }
  return lines;
}
function diagram(r, sources) {
  let y = 36, parts = [];
  const text = (s, x, py, size = 19, color = '#17324d') => `<text x="${x}" y="${py}" font-size="${size}" fill="${color}">${escape(s)}</text>`;
  for (const line of wrap(r.title, 48)) { parts.push(text(line, 26, y, 23)); y += 30; }
  y += 8;
  for (const im of sources[r.id].images.filter(im => im.role !== 'inline-formula')) {
    const bytes = fs.readFileSync(path.join(root, im.path));
    const mime = /\.svg$/i.test(im.path) ? 'image/svg+xml' : /\.gif$/i.test(im.path) ? 'image/gif' : /\.png$/i.test(im.path) ? 'image/png' : 'image/jpeg';
    if(im.label) { parts.push(text(im.label,28,y+20)); y+=35; }
    y += im.paddingTop || 0;
    const width = Math.min(560, im.displayWidth || im.width * 1.25), height = im.height * width / im.width;
    parts.push(`<image x="${(680-width)/2}" y="${y}" width="${width}" height="${height}" href="data:${mime};base64,${bytes.toString('base64')}"/>`);
    const scale=width/im.width, left=(680-width)/2;
    for(const a of im.annotations||[]) {
      parts.push(`<path d="M ${left+a.x1*scale} ${y+a.y1*scale} L ${left+a.x2*scale} ${y+a.y2*scale}" stroke="${a.color}" stroke-width="3" marker-end="url(#arrow-${r.id})"/>`,`<text x="${left+a.tx*scale}" y="${y+a.ty*scale}" font-size="19" fill="${a.color}">${escape(a.label)}${a.subscript?`<tspan font-size="13" baseline-shift="sub">${escape(a.subscript)}</tspan>`:''}${escape(a.suffix||'')}</text>`);
    }
    for(const a of im.labels||[]) parts.push(`<text x="${left+a.x*scale}" y="${y+a.y*scale}" font-size="19" fill="${a.color||'#17324d'}">${escape(a.text).replace(/_([A-Za-zА-Яа-яЁё]+)/g,'<tspan font-size="13" baseline-shift="sub">$1</tspan>')}</text>`);
    y += height + 22 + (im.paddingBottom || 0);
  }
  if(r.sketch) { const result=require('./oge-physics-sketch')(r,y,escape);parts.push(result.svg);y+=result.height; }
  const arrow = (x1, x2, py, color) => `<path d="M ${x1} ${py} H ${x2}" stroke="${color}" stroke-width="3" fill="none" marker-end="url(#arrow-${r.id})"/>`;
  if(r.diagram.startsWith('inertia-ball-')) {
    const cy=y+120,accelerating=r.diagram==='inertia-ball-accelerating';
    parts.push(`<rect x="130" y="${cy+30}" width="440" height="18" fill="#d4deeb" stroke="#6484a3"/><circle cx="295" cy="${cy}" r="30" fill="#e6f0ff" stroke="#6484a3" stroke-width="2"/>`);
    for(const [x,start,end,label,tx,ty,color] of [[285,cy+28,cy-70,'N',253,cy-55,'#426c4c'],[305,cy,cy+98,'mg',323,cy+88,'#b05613']])parts.push(`<path d="M ${x} ${start} V ${end}" stroke="${color}" stroke-width="3" marker-end="url(#arrow-${r.id})"/>`,text(label,tx,ty,19,color));
    parts.push(arrow(333,483,cy,'#285fa0'),text('v₀',411,cy-15),text('Скорость мяча относительно Земли',166,y+20));
    parts.push(arrow(130,accelerating?540:230,cy+145,'#285fa0'),text(accelerating?'V > v₀: поезд разгоняется':'V < v₀: поезд тормозит',177,cy+175));
    parts.push(arrow(65,140,cy-60,'#17324d'),text('Ox',106,cy-74),`<path d="M 65 ${cy-60} V ${cy-118}" stroke="#17324d" stroke-width="2" marker-end="url(#arrow-${r.id})"/>`,text('Oy',28,cy-105));y=cy+199;
  }
  if(r.diagram==='density-experiment') {
    const top=y+38,bottom=y+268;
    for(const [x,level,label] of [[110,y+173,'V₁'],[410,y+113,'V₂']]) {
      parts.push(`<rect x="${x}" y="${level}" width="140" height="${bottom-level}" fill="#c6e8f3"/><path d="M ${x} ${top} V ${bottom} H ${x+140} V ${top}" fill="none" stroke="#6484a3" stroke-width="3"/><path d="M ${x} ${level} H ${x+140}" stroke="#25819a" stroke-width="2"/>`,text(label,x-38,level+6));
      for(let k=0;k<9;k++)parts.push(`<path d="M ${x} ${bottom-20-k*22} h 12" stroke="#6484a3"/>`);
    }
    parts.push(text('Вода до погружения',82,y+18),text('Цилиндр полностью в воде',366,y+18));
    parts.push(`<rect x="445" y="${bottom-120}" width="70" height="120" rx="3" fill="#f0c28b" stroke="#9d6c36" stroke-width="2"/>`,text('№ 1',461,bottom-60),text('V = V₂ − V₁',263,bottom+38));
    y=bottom+62;
  }
  if(r.diagram==='sinking-sphere') {
    const cy=y+142;
    parts.push(`<rect x="180" y="${y+20}" width="280" height="282" rx="12" fill="#e0f1f7"/><circle cx="310" cy="${cy}" r="30" fill="#d4deeb" stroke="#6484a3" stroke-width="2"/>`);
    for(const [x,start,end,label,sub,tx,ty,color] of [[310,cy,cy+122,'mg','',326,cy+115,'#b05613'],[298,cy,cy-65,'F','А',253,cy-65,'#426c4c'],[322,cy,cy-105,'F','сопр',339,cy-95,'#426c4c'],[500,cy-20,cy+80,'v','',521,cy+60,'#285fa0'],[115,cy-80,cy+90,'Oy','',78,cy+102,'#17324d']]) {
      parts.push(`<path d="M ${x} ${start} V ${end}" stroke="${color}" stroke-width="3" marker-end="url(#arrow-${r.id})"/><text x="${tx}" y="${ty}" font-size="19" fill="${color}">${label}${sub?`<tspan font-size="13" baseline-shift="sub">${sub}</tspan>`:''}</text>`);
    }
    parts.push(text('Вода',196,y+286)); y+=329;
  }
  if(r.diagram==='buoyancy-balance') {
    const cy=y+170;
    for(const [cx,radius,label,arch,ten] of [[195,40,'Мрамор',90,60],[470,28,'Железо',50,100]]) {
      parts.push(text(label,cx-45,y+22),`<rect x="${cx-107}" y="${y+48}" width="214" height="260" rx="10" fill="#e0f1f7"/><circle cx="${cx}" cy="${cy}" r="${radius}" fill="#d4deeb" stroke="#6484a3" stroke-width="2"/>`);
      for(const [x,start,end,label,sub,tx,ty,color] of [[cx,cy,cy+113,'mg','',cx+12,cy+109,'#b05613'],[cx-10,cy,cy-arch,'F','А',cx-53,cy-arch+5,'#426c4c'],[cx+10,cy-radius+2,cy-radius-ten,'T','',cx+26,cy-radius-ten+14,'#285fa0']])parts.push(`<path d="M ${x} ${start} V ${end}" stroke="${color}" stroke-width="3" marker-end="url(#arrow-${r.id})"/><text x="${tx}" y="${ty}" font-size="19" fill="${color}">${label}${sub?`<tspan font-size="13" baseline-shift="sub">${sub}</tspan>`:''}</text>`);
    }
    parts.push(`<path d="M 42 ${cy+80} V ${cy-55}" stroke="#17324d" stroke-width="2" marker-end="url(#arrow-${r.id})"/>`,text('Oy',26,cy-70));
    y+=335;
  }
  if(r.diagram==='circle-kinematics'||r.diagram==='circle-orbit') {
    const cy=y+150,orbit=r.diagram==='circle-orbit';
    parts.push(`<circle cx="280" cy="${cy}" r="120" fill="none" stroke="#8392a5" stroke-width="2"/><path d="M 280 ${cy} V ${cy+120}" stroke="#8392a5" stroke-width="2" stroke-dasharray="5 4"/><circle cx="400" cy="${cy}" r="7" fill="#285fa0"/>`,text(orbit?'r':'R',297,cy+75));
    if(orbit) parts.push(`<circle cx="280" cy="${cy}" r="28" fill="#dceaff" stroke="#6484a3"/>`,text('Земля',220,cy-45,18));
    else parts.push(`<circle cx="280" cy="${cy}" r="3" fill="#17324d"/>`,text('O',257,cy+20));
    parts.push(arrow(400,320,cy,'#b05613'));
    if(orbit)parts.push(`<text x="336" y="${cy-15}" font-size="19" fill="#b05613">F<tspan font-size="13" baseline-shift="sub">тяг</tspan></text>`);
    else parts.push(text('a',350,cy-15,19,'#b05613'));
    parts.push(`<path d="M 400 ${cy} V ${cy+92}" stroke="#285fa0" stroke-width="3" marker-end="url(#arrow-${r.id})"/>`,text('v',421,cy+70,19,'#285fa0'));
    y=cy+147;
  }
  if(r.diagram==='circle-loop') {
    const cy=y+190,top=cy-140;
    parts.push(`<circle cx="300" cy="${cy}" r="140" fill="none" stroke="#8392a5" stroke-width="2"/><circle cx="300" cy="${top}" r="9" fill="#285fa0"/><circle cx="300" cy="${cy}" r="3" fill="#17324d"/><path d="M 300 ${cy} H 440" stroke="#8392a5" stroke-width="2" stroke-dasharray="5 4"/>`,text('O',275,cy+25),text('R',365,cy-14));
    parts.push(arrow(300,480,top,'#285fa0'),text('v',450,top-15));
    parts.push(`<path d="M 300 ${top} V ${top+100}" stroke="#b05613" stroke-width="3" marker-end="url(#arrow-${r.id})"/>`,text('mg',318,top+75,19,'#b05613'),text('N = 0',490,top+42));
    y=cy+166;
  }
  if(r.diagram.startsWith('gravity-')) {
    const up=r.diagram==='gravity-up',cy=y+100;
    parts.push(`<circle cx="240" cy="${cy}" r="24" fill="#dceaff" stroke="#6484a3" stroke-width="2"/><path d="M 240 ${cy} V ${cy+90}" stroke="#b05613" stroke-width="3" marker-end="url(#arrow-${r.id})"/>`,text('mg',260,cy+75));
    parts.push(`<path d="M 420 ${cy+30} V ${cy+(up?-65:100)}" stroke="#285fa0" stroke-width="3" marker-end="url(#arrow-${r.id})"/>`,text(up?'vᵧ > 0: вверх':'vᵧ > 0: вниз',450,cy+30,18));
    parts.push(`<path d="M 105 ${up?cy+80:cy-70} V ${up?cy-70:cy+80}" stroke="#17324d" stroke-width="2" marker-end="url(#arrow-${r.id})"/>`,text('Oy',65,up?cy-65:cy+90));
    parts.push(text('Единственная сила — тяжесть mg',28,cy+133)); y=cy+157;
  }
  if (r.diagram.startsWith('bus-')) {
    parts.push(`<rect x="80" y="${y+35}" width="420" height="85" rx="15" fill="#e6f0ff" stroke="#6484a3"/>`);
    parts.push(arrow(130, 440, y+18, '#285fa0'), text('V = 10 м·с⁻¹', 230, y+7));
    const forward = r.diagram === 'bus-forward';
    parts.push(arrow(forward?220:350, forward?350:220, y+75, '#b05613'), text(forward?'uₓ = +1 м·с⁻¹':'uₓ = −1 м·с⁻¹', 225, y+108, 18));
    parts.push(arrow(80, 550, y+155, '#17324d'), text('Ox', 565, y+161)); y += 186;
  }
  if (r.diagram === 'wheel') {
    const cy = y+90;
    parts.push(`<circle cx="260" cy="${cy}" r="70" fill="#edf5ff" stroke="#285fa0" stroke-width="3"/><circle cx="260" cy="${cy}" r="4" fill="#17324d"/><path d="M 75 ${cy+70} H 590" stroke="#67778b" stroke-width="2"/>`);
    parts.push(arrow(260, 415, cy, '#285fa0'), text('V', 340, cy-12));
    parts.push(`<circle cx="260" cy="${cy+70}" r="5" fill="#a23a1f"/>`, text('v = 0', 300, cy+59));
    parts.push(arrow(260, 440, cy-70, '#285fa0'), text('2V', 380, cy-82)); y += 195;
  }
  if (r.diagram === 'collision-stopping') {
    parts.push(text('До сцепки: равные массы m = 20 т',28,y+20));
    for(const x of [100,400]) parts.push(`<rect x="${x}" y="${y+75}" width="150" height="55" rx="6" fill="#e6f0ff" stroke="#6484a3"/>`,text('m',x+66,y+110));
    parts.push(arrow(115,240,y+58,'#285fa0'),text('2 м·с⁻¹',135,y+45),arrow(535,410,y+58,'#b05613'),text('1 м·с⁻¹',435,y+45));
    parts.push(text('После сцепки: силы на системе двух вагонов',28,y+170));
    const cy=y+285;
    parts.push(`<path d="M 105 ${cy+45} H 565" stroke="#8392a5" stroke-width="2"/><rect x="250" y="${cy-28}" width="180" height="56" rx="6" fill="#e6f0ff" stroke="#6484a3"/>`,text('2m',325,cy+7));
    parts.push(arrow(250,135,cy,'#b05613'),text('R',166,cy-15));
    for(const [end,label,tx,ty] of [[cy-78,'N',353,cy-70],[cy+95,'2mg',354,cy+91]]) parts.push(`<path d="M 340 ${end<cy?cy-28:cy+28} V ${end}" stroke="#426c4c" stroke-width="3" marker-end="url(#arrow-${r.id})"/>`,text(label,tx,ty));
    parts.push(arrow(450,590,cy-58,'#285fa0'),text('uₓ = 0,5 м·с⁻¹',437,cy-77,18));
    parts.push(arrow(445,590,cy+80,'#17324d'),text('Ox',599,cy+87));
    y=cy+123;
  }
  for (const line of r.lines.flatMap(s => wrap(s))) {
    const rendered=text(line,28,y+22,19);
    parts.push(r.richLabels?rendered.replace(r.richGreek?/_([A-Za-zА-Яа-яЁёα-ωΑ-Ω]+)/g:/_([A-Za-zА-Яа-яЁё]+)/g,'<tspan font-size="13" baseline-shift="sub">$1</tspan>'):rendered);y+=30;
  }
  const height = Math.ceil(y+22);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 ${height}" role="img" aria-label="${escape(r.title)}" data-physics-diagram="${r.id}" font-family="Arial, sans-serif"><title>${escape(r.title)}</title><defs><marker id="arrow-${r.id}" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto" markerUnits="userSpaceOnUse"><path d="M0 0 L7 3 L0 6" fill="none" stroke="context-stroke" stroke-width="2"/></marker></defs><rect width="680" height="${height}" rx="16" fill="#f5f8fc"/>${parts.join('')}</svg>`;
}
module.exports = definitions.map(({name,topic,data,sources}) => ({name,topic,sources,records:data.records.map(r => ({
  ...r, sourceId:sources[r.id].sourceId, diagram_svg:diagram(r,sources),
  diagram_caption:r.diagramCaption || (sources[r.id].images.length ? 'Исходный рисунок ФИПИ и пояснения к решению.' : r.title+'.'),
}))}));
