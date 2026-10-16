module.exports=function(r,y,escape){
 const s=r.sketch,p=[],marker=`url(#arrow-${r.id})`;
 const label=(v,x,z,size=18,color='#17324d')=>p.push(`<text x="${x}" y="${z}" font-size="${size}" fill="${color}">${escape(v).replace(/_([A-Za-zА-Яа-яЁё]+)/g,'<tspan font-size="12" baseline-shift="sub">$1</tspan>')}</text>`);
 const path=(d,color='#6484a3',width=2,fill='none')=>p.push(`<path d="${d}" stroke="${color}" stroke-width="${width}" fill="${fill}"/>`);
 const rect=(x,z,w,h,fill='#e6f0ff')=>p.push(`<rect x="${x}" y="${z}" width="${w}" height="${h}" rx="3" fill="${fill}" stroke="#6484a3" stroke-width="2"/>`);
 const arrow=(x,z,xx,zz,v,tx,tz,color='#b05613')=>{p.push(`<path d="M ${x} ${z} L ${xx} ${zz}" stroke="${color}" stroke-width="3" marker-end="${marker}"/>`);if(v)label(v,tx,tz,18,color);};
 let height=400;
 if(s.kind==='density'){
  for(const [x,level,name] of [[100,170,'V₁'],[400,120,'V₂']]){
   rect(x,level,140,300-level,'#c6e8f3');path(`M ${x} 70 V 300 H ${x+140} V 70`,undefined,3);path(`M ${x} ${level} H ${x+140}`,'#25819a');label(name,x-35,level+7);
   for(let j=0;j<8;j++)path(`M ${x} ${280-j*23} h 12`);
  }
  rect(438,185,66,102,'#f0c28b');label('№ '+s.cylinder,448,242);label('До погружения',92,38);label('После погружения',394,38);label('V = V₂ − V₁',248,344);label('Массу сухого цилиндра измеряют отдельно',132,380);height=417;
 }
 if(s.kind==='spring'){
  path('M 150 42 H 470 M 235 42 V 72 M 355 42 V 72',undefined,4);
  path('M 235 72 L 220 84 L 250 97 L 220 110 L 250 123 L 220 136 L 250 149 L 235 164',undefined,3);
  path('M 355 72 L 340 92 L 370 112 L 340 132 L 370 152 L 340 172 L 370 192 L 355 215 V 237',undefined,3);
  rect(323,237,64,48);label('m',347,267);label('Без нагрузки',170,22);label('С нагрузкой',346,22);
  path('M 201 164 H 558 M 388 237 H 558','#8c99aa');path('M 548 164 V 237 M 541 164 H 555 M 541 237 H 555','#285fa0');label('x',568,205);
  label('l₀',194,192);label('l',408,267);label(s.spring?'Пружина № '+s.spring:'Пружина',440,102);
  arrow(337,246,337,169,'F_упр',276,190,'#426c4c');arrow(365,263,365,353,'mg',386,336);
  arrow(70,266,70,89,'Oy',29,104,'#17324d');label('F_упр = P; x = l − l₀',222,399);height=431;
 }
 if(s.kind==='friction'){
  path('M 105 204 H 600 M 314 178 H 435',undefined,2);rect(229,151,85,52);rect(243,120,57,31,'#d4dfec');rect(435,159,143,38);
  path('M 444 178 H 457 L 465 166 L 476 189 L 487 166 L 498 189 L 509 166 L 520 189 L 531 166 L 542 178 H 569');
  label('Динамометр',434,140);label('Поверхность '+s.surface,427,238);
  arrow(259,177,259,53,'N',278,66,'#426c4c');arrow(279,177,279,309,'mg',298,296);
  arrow(229,178,115,178,'F_тр',123,155);arrow(314,178,419,178,'F_тяги',333,156);
  arrow(419,59,570,59,'v = const',428,36,'#285fa0');arrow(506,309,620,309,'Ox',598,337,'#17324d');arrow(68,134,68,45,'Oy',27,57,'#17324d');
  label('Вес P бруска с грузами измеряют отдельно',110,373);height=407;
 }
 if(s.kind==='buoyancy'){
  label('В воздухе',134,24);label('В воде',430,24);
  for(const x of [200,466]){
   path(`M ${x-60} 43 H ${x+60} M ${x} 43 V 60`,undefined,3);rect(x-14,60,28,85);path(`M ${x} 67 l -7 10 l 14 14 l -14 14 l 14 14 l -7 14 V 195`);label('№ 1',x+28,107);
  }
  rect(364,174,204,159,'#d5edf5');path('M 364 163 V 333 H 568 V 163',undefined,3);path('M 364 174 H 568','#25819a');
  for(const x of [200,466]){rect(x-28,215,56,67,'#e5c499');label('№ '+s.cylinder,x-21,252,16);}
  arrow(200,215,200,161,'P',160,177,'#285fa0');arrow(200,267,200,362,'mg',220,355);arrow(454,216,454,144,'T',422,156,'#285fa0');arrow(481,250,481,193,'F_А',502,207,'#426c4c');arrow(465,267,465,362,'mg',489,355);
  arrow(65,277,65,133,'Oy',25,145,'#17324d');label('Не касаться стенок и дна',359,399);label('F_А = P − T',138,399);height=430;
 }
 if(s.kind==='lever'){
  const scale=220/Math.max(s.two,s.one,s.right),o=340,x2=o-s.two*scale,x1=o+(s.oneRight?1:-1)*s.one*scale,xf=o+s.right*scale;
  path('M 83 160 H 602 M 340 160 L 321 192 H 359 Z',undefined,3,'#dbe9f5');
  for(const [x,count] of [[x2,2],[x1,1]]){path(`M ${x} 160 V 201`);for(let k=0;k<count;k++)rect(x-18,201+34*k,36,29,'#d4dfec');}
  arrow(x2,160,x2,307,'W₂',x2-20,333);arrow(x1,160,x1,283,'W₁',x1-20,310);
  path(`M ${xf} 160 V 205`);rect(xf-13,205,26,65);path(`M ${xf} 211 l -7 9 l 14 12 l -14 12 l 7 12 V 284`);
  arrow(xf,160,xf,197,'F',xf+24,188);arrow(xf,284,xf,324,'',0,0);label('Динамометр',Math.min(xf-70,506),365,16);
  arrow(o,160,o,79,'R',o-37,100,'#426c4c');arrow(o,160,o,268,'G',o+20,256);label('O',o-30,148);label('G приложена в O',277,297,15);
  for(const [x,z,txt] of [[x2,33,`l₂ = ${s.two} см`],[x1,64,`l₁ = ${s.one} см`],[xf,112,`d = ${s.right} см`]]){
   path(`M ${x} ${z} H ${o} M ${x} ${z-5} V ${z+5} M ${o} ${z-5} V ${z+5}`,'#8795a8');label(txt,Math.min(x,o)+7,z-9,16);
  }
  label('Момент силы: M = Fd',221,405);height=438;
 }
 if(s.kind==='pulley'){
  if(s.moving){
   path('M 170 45 H 280 M 258 45 V 180 A 42 42 0 0 0 342 180 V 127',undefined,3);
   p.push('<circle cx="300" cy="180" r="41" fill="#e6eaf0" stroke="#6484a3" stroke-width="2"/><circle cx="300" cy="180" r="4" fill="#6484a3"/>');path('M 300 180 V 271');
   rect(328,65,28,62);path('M 342 72 l -8 10 l 16 12 l -16 12 l 8 13');rect(274,271,52,55);label('m',293,302);
   arrow(258,180,258,102,'T',226,117,'#426c4c');arrow(342,180,342,137,'T',362,159,'#426c4c');arrow(300,300,300,396,'(m + m_б)g',323,386);
   arrow(342,65,342,18,'F_упр',372,36,'#285fa0');arrow(196,322,196,252,`h = ${s.cm} см`,65,291,'#285fa0');arrow(521,204,521,71,'s = 2h',544,150,'#285fa0');label('Динамометр',402,82,16);label('Грузов: '+s.loads,351,300);arrow(75,402,75,340,'Oy',97,362,'#17324d');
  }else{
   path('M 129 359 H 186 M 155 359 V 32 H 300 V 58',undefined,4);p.push('<circle cx="300" cy="100" r="42" fill="#e6eaf0" stroke="#6484a3" stroke-width="2"/><circle cx="300" cy="100" r="4" fill="#6484a3"/>');
   path('M 258 258 V 100 A 42 42 0 0 1 342 100 V 240',undefined,3);rect(232,258,52,57);rect(328,240,28,70);path('M 342 248 l -8 10 l 16 12 l -16 12 l 8 13 V 326');label('m',252,291);
   arrow(258,258,258,170,'T',218,184,'#426c4c');arrow(258,285,258,389,'mg',277,377);arrow(342,326,342,400,'F_упр',362,385,'#285fa0');
   arrow(205,315,205,242,`h = ${s.cm} см`,45,278,'#285fa0');arrow(491,326,491,400,'s = h',515,374,'#285fa0');label('Динамометр',390,276,16);label('Грузов: '+s.loads,383,183);arrow(573,184,573,78,'Oy',591,91,'#17324d');
  }
  label('Работа: A = F_упр s',238,445);height=477;
 }
 return {svg:`<g transform="translate(0 ${y})">${p.join('')}</g>`,height};
};
