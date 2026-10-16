// Optional vector sketches for tasks without a FIPI figure. Existing diagrams stay byte-identical.
module.exports=function sketch(r,y,escape) {
  if(r.sketch.type==='internal-energy') return require('./oge-physics-internal-energy-sketch')(r,y,escape);
  if(['lens-focus-experiment','lens-image-experiment'].includes(r.sketch.type)) return require('./oge-physics-lenses-sketch')(r,y,escape);
  if(['reflection-rays','mirror-distance'].includes(r.sketch.type)) return require('./oge-physics-reflection-sketch')(r,y,escape);
  if(r.sketch.type==='shadow-triangles') return require('./oge-physics-shadow-sketch')(r,y,escape);
  if(r.sketch.type==='locomotive-power') return require('./oge-physics-locomotive-power-sketch')(r,y,escape);
  if(r.sketch.type==='resistance-circuit') return require('./oge-physics-resistance-sketch')(r,y,escape);
  if(r.sketch.type==='electric-experiment-circuit') return require('./oge-physics-electric-experiment-sketch')(r,y,escape);
  if(r.sketch.type==='thermal-particles') return require('./oge-physics-thermal-particles-sketch')(r,y,escape);
  if(r.sketch.type==='thermal-properties') return require('./oge-physics-thermal-properties-sketch')(r,y,escape);
  if(r.sketch.type==='heat-capacity') return require('./oge-physics-heat-capacity-sketch')(r,y,escape);
  if(r.sketch.type==='heat-balance') return require('./oge-physics-heat-balance-sketch')(r,y,escape);
  if(r.sketch.type==='evaporation') return require('./oge-physics-evaporation-sketch')(r,y,escape);
  if(r.sketch.type==='thermal-apparatus') return require('./oge-physics-thermal-apparatus-sketch')(r,y,escape);
  if(r.sketch.type==='heat-transfer') return require('./oge-physics-heat-transfer-sketch')(r,y,escape);
  if(r.sketch.type==='measurement-practice') return require('./oge-physics-measurement-practice-sketch')(r,y,escape);
  if(r.sketch.type==='mechanics-application') return require('./oge-physics-mechanics-application-sketch')(r,y,escape);
  if(r.sketch.type==='oscillations') return require('./oge-physics-oscillations-sketch')(r,y,escape);
  if(r.sketch.type==='waves-sound') return require('./oge-physics-waves-sound-sketch')(r,y,escape);
 if(r.sketch.type==='buoyancy') return require('./oge-physics-buoyancy-sketch')(r,y,escape);
 if(r.sketch.type==='pascal') return require('./oge-physics-pascal-sketch')(r,y,escape);
 if(r.sketch.type==='pressure') return require('./oge-physics-pressure-sketch')(r,y,escape);
 const s=r.sketch,p=[],marker=`url(#arrow-${r.id})`;
 const label=(value,x,dy,color='#17324d',size=19)=>p.push(`<text x="${x}" y="${dy}" font-size="${size}" fill="${color}">${escape(value).replace(/_([A-Za-zА-Яа-яЁё]+)/g,'<tspan font-size="13" baseline-shift="sub">$1</tspan>')}</text>`);
 const arrow=(x1,y1,x2,y2,name,tx,ty,color='#b05613')=>{p.push(`<path d="M ${x1} ${y1} L ${x2} ${y2}" stroke="${color}" stroke-width="3" fill="none" marker-end="${marker}"/>`);label(name,tx,ty,color);};
 const rect=(x,dy,w,h,fill='#e6f0ff')=>p.push(`<rect x="${x}" y="${dy}" width="${w}" height="${h}" rx="4" fill="${fill}" stroke="#6484a3" stroke-width="2"/>`);
 let height=360;
 if(s.type==='equilibrium-lever') {
  label('Пояснительная схема для данных таблицы',28,25);
  p.push('<path d="M 145 170 H 565 M 285 170 L 266 197 H 304 Z" stroke="#6484a3" stroke-width="3" fill="#e6f0ff"/>');
  arrow(145,170,145,285,'F₁',105,272);arrow(565,170,565,228,'F₂',584,223);
  arrow(285,170,285,66,'R',305,81,'#426c4c');label('O',254,155);
  p.push('<path d="M 145 315 H 285 M 285 315 H 565 M 145 307 V 323 M 285 307 V 323 M 565 307 V 323" stroke="#8392a5"/>');
  label('l₁',205,344);label('l₂ = 2l₁',390,344);arrow(69,204,69,93,'Oy',28,102,'#17324d');height=376;
 }
 if(s.type==='scissors-lever') {
  label('Модель одного лезвия: моменты относительно O',28,25,undefined,18);
  p.push('<path d="M 110 173 H 571" stroke="#6484a3" stroke-width="7"/><circle cx="270" cy="173" r="9" fill="#17324d"/>');
  arrow(110,173,110,260,'F_руки',47,290);arrow(390,173,390,289,'F_к',412,286);
  arrow(270,173,270,65,'R',291,81,'#426c4c');
  label('O',239,157);label('Рукоятка',76,140);label('Лезвие',458,140);
  p.push('<path d="M 110 320 H 270 M 270 320 H 390 M 110 312 V 328 M 270 312 V 328 M 390 312 V 328" stroke="#8392a5"/>');
  label('l_руки',158,351);label('l_к',318,351);label('Картон ближе к O → меньше l_к',172,396);height=430;
 }
 if(s.type==='unequal-scale') {
  label('Условно длинное плечо показано справа',28,25);
  p.push('<path d="M 142 150 H 566 M 282 150 L 263 178 H 301 Z M 142 150 V 203 M 566 150 V 203" fill="#e6f0ff" stroke="#6484a3" stroke-width="3"/>');
  rect(108,205,68,40);rect(532,205,68,40);label('m',135,231);label('m',559,231);
  arrow(142,246,142,317,'mg',159,311);arrow(566,246,566,317,'mg',585,311);
  label('l_к',199,129);label('l_д',413,129);label('O',250,188);
  label('Показаны только добавленные гирьки',123,371);
  label('Старые моменты уже уравновешены',135,403);
  label('mg · l_д > mg · l_к',246,441);height=473;
 }
 if(s.type==='wind-tree') {
  label('Силы и момент ветра относительно основания',28,25,undefined,18);
  p.push('<path d="M 335 350 V 124 M 335 207 L 276 151 M 335 194 L 388 141 M 190 352 H 503" fill="none" stroke="#7a6349" stroke-width="8"/><ellipse cx="333" cy="124" rx="107" ry="83" fill="#d3e7cd" fill-opacity="0.7" stroke="#729165" stroke-width="2"/>');
  arrow(336,124,568,124,'F_в',479,103,'#285fa0');arrow(335,238,335,322,'mg',352,301);
  arrow(335,350,218,350,'R_x',231,333,'#426c4c');
  arrow(323,350,323,277,'R_y',278,290,'#426c4c');
  label('O',351,373);p.push('<path d="M 601 124 V 350 M 594 124 H 608 M 594 350 H 608" stroke="#8392a5"/>');label('h',617,253);
  arrow(93,326,93,80,'Oy',40,98,'#17324d');arrow(80,422,192,422,'Ox',174,449,'#17324d');
  label('Листья увеличивают площадь действия ветра',113,487,undefined,18);height=521;
 }
 if(s.type==='impact-heat') {
  label('Силы на теле во время удара',28,25);
  p.push('<path d="M 130 236 H 550" stroke="#8392a5" stroke-width="2"/>');rect(275,166,70,70,'#c8d0dc');
  label('m',304,205);arrow(310,166,310,56,'N',333,76,'#426c4c');arrow(310,236,310,319,'mg',330,307);
  arrow(82,86,82,223,'Oy',33,241,'#17324d');
  arrow(440, 85,440,154,'v до удара',465,119,'#285fa0');
  label('Кинетическая энергия → деформация и нагрев',83,371);height=409;
 }
 if(s.type==='plate-heat') {
  label('Свободное падение шара на пластину',28,25);
  p.push('<circle cx="340" cy="117" r="27" fill="#e6eaf0" stroke="#6484a3" stroke-width="2"/>');
  label('m₁',328,123);arrow(340,145,340,259,'m₁g',362,247);
  rect(233,325,214,34,'#c8d0dc');label('Свинцовая пластина m₂',231,395);
  p.push('<path d="M 205 360 H 475 M 165 117 V 325 M 157 117 H 173 M 157 325 H 173" fill="none" stroke="#8392a5" stroke-width="2"/>');
  label('h',135,235);arrow(80,80,80,220,'Oy',34,238,'#17324d');
  label('Энергия шара: m₁gh',239,445);label('Пластина получает 80% этой энергии',161,478);height=512;
 }
 if(s.type==='waterfall-heat') {
  rect(70,60,220,90);rect(390,260,220,90);
  label('Вода на вершине',90,94);label('Температура θ₁',107,128);
  label('Вода у основания',406,294);label('Температура θ₂',430,328);
  arrow(306,119,381,277,'',0,0,'#285fa0');
  label('h = 100 м',405,153);label('Энергия: mgh',357,192);
  label('Часть энергии нагревает воду: cm(θ₂ − θ₁)',89,416);height=451;
 }
 if(s.type==='bullet-energy') {
  label('Сопротивление тормозит и нагревает пулю',28,25);
  rect(310,82,52,212,'#eee3cf');label('Мишень',293,60);
  p.push('<circle cx="155" cy="159" r="7" fill="#6484a3"/><circle cx="457" cy="159" r="7" fill="#6484a3"/><circle cx="336" cy="229" r="7" fill="#6484a3"/>');
  arrow(168,159,284,159,'v₁',221,136,'#285fa0');
  arrow(470,159,470+116*(s.speedRatio??0.5),159,'v₂ < v₁',462,136,'#285fa0');
  arrow(336,229,199,229,'F_с',238,210);
  arrow(473,312,610,312,'Ox',596,337,'#17324d');
  label('Кинетическая энергия убывает',103,371);
  label('Часть энергии идёт на нагрев пули',103,402);height=435;
 }
 if(s.type==='projectile-energy') {
  p.push('<path d="M 140 270 Q 350 -90 560 270" fill="none" stroke="#8392a5" stroke-width="2" stroke-dasharray="5 5"/><circle cx="230" cy="149" r="12" fill="#dceaff" stroke="#6484a3"/><circle cx="350" cy="90" r="12" fill="#dceaff" stroke="#6484a3"/>');
  arrow(230,149,230,270,'mg',248,258);arrow(350,90,350,211,'mg',369,197);
  arrow(245,134,297,80,'v',295,62,'#285fa0');arrow(366,90,418,90,'v_x',391,60,'#285fa0');
  arrow(80,330,80,43,'Oy',37,58,'#17324d');arrow(80,330,600,330,'Ox',587,356,'#17324d');
  label('На вершине v_y = 0, но v_x ≠ 0',191,389);height=420;
 }
 if(s.type==='heating-or-motion') {
  label('Одинаковая энергия передана равным массам',28,26);
  for(const [x,title] of [[184,'Нагрев'],[479,'Разгон']]) {
   p.push(`<circle cx="${x}" cy="160" r="40" fill="#edc8a2" stroke="#986c42" stroke-width="2"/>`);
   label(title,x-40,84);label('m',x-8,167);arrow(x,246,x,209,'E',x+17,242,'#426c4c');
  }
  label('Δθ = 8 °C',133,302);label('v = 80 м·с⁻¹',415,302);label('cmΔθ = mv² · 2⁻¹',219,354);height=388;
 }
 if(s.type==='hammer-energy') {
  label('Свободное падение перед ударом',28,25);
  rect(287,90,106,80,'#c8d0dc');label('10 т',317,137);arrow(340,170,340,296,'Mg',361,280);
  rect(269,350,160,50,'#c8d0dc');label('Деталь: 200 кг',260,435);
  p.push('<path d="M 185 170 V 350 M 178 170 H 192 M 178 350 H 192" fill="none" stroke="#8392a5" stroke-width="2"/>');
  label('h = 2,5 м',90,275);arrow(82,80,82,210,'Oy',34,224,'#17324d');height=466;
 }
 if(s.type==='hydro-energy') {
  rect(50,60,150,80);rect(285,60,120,80);rect(470,60,170,80);
  label('Вода',100,88);label('mgh',104,119);label('ГЭС',324,108);
  label('Энергия лампы',483,88,undefined,18);label('Pt',543,119);
  arrow(207,102,276,102,'',0,0,'#285fa0');arrow(412,102,461,102,'',0,0,'#285fa0');
  arrow(345,148,345,240,'Потери',366,225);
  label('90% энергии воды преобразовано',148,291);label('в полезную электрическую энергию',148,322);height=354;
 }
 if(s.type==='rebound-energy') {
  p.push('<path d="M 70 390 H 608" stroke="#8392a5" stroke-width="2"/><circle cx="210" cy="290" r="15" fill="#dceaff" stroke="#6484a3"/><circle cx="470" cy="90" r="15" fill="#dceaff" stroke="#6484a3"/><circle cx="345" cy="375" r="15" fill="#dceaff" stroke="#6484a3"/>');
  label('Бросок вниз',138,252);label('Верхняя точка',411,50);
  arrow(210,290,210,353,'mg',165,340);arrow(255,289,255,351,'v₀',269,337,'#285fa0');
  arrow(470,90,470,153,'mg',489,140);arrow(345,375,345,262,'N',365,280,'#426c4c');arrow(345,375,345,438,'mg',365,431);
  p.push('<path d="M 113 290 V 390 M 108 290 H 118 M 108 390 H 118 M 565 90 V 390 M 560 90 H 570 M 560 390 H 570" stroke="#8392a5" fill="none" stroke-width="2"/>');
  label('h',90,345);label('H',582,248);arrow(69,219,69,50,'Oy',28,65,'#17324d');
  label('h = '+s.h,102,479);label('H = '+s.H,452,479);label('Удар: E_после = '+s.k+'E_до',213,529);height=563;
 }
 if(s.type==='gravity-horizontal') {
  label('Сила тяжести и горизонтальное перемещение',28,26);
  p.push('<path d="M 125 174 H 535" stroke="#8392a5" stroke-width="2"/>');rect(269,112,82,60);
  arrow(310,142,310,294,'mg',329,282);
  arrow(362,112,535,112,'s',449,92,'#285fa0');
  arrow(90,240,90, 60,'Oy',44,70,'#17324d');
  arrow(465,298,607,298,'Ox',599,323,'#17324d');height=354;
 }
 if(s.type==='gravity-roundtrip') {
  label('Тяжесть на подъёме и на спуске',28,24);
  for(const [x,up,title] of [[204,s.upFirst,'Первый участок'],[464,!s.upFirst,'Второй участок']]) {
   label(title,x- 80,69);
   p.push(`<circle cx="${x}" cy="162" r="27" fill="#e6eaf0" stroke="#6484a3" stroke-width="2"/>`);
   arrow(x,162,x,287,'mg',x+18,275);
   arrow(x- 50,up?240:102,x-50,up?102:240,'v',x-73,up?118:225,'#285fa0');
  }
  arrow(70,289,70,103,'Oy',28,106,'#17324d');height=325;
 }
 if(s.type==='braking-work') {
  if(s.body==='ball')p.push('<circle cx="310" cy="180" r="30" fill="#e6eaf0" stroke="#6484a3" stroke-width="2"/>');
  else rect(273,148,74,62);
  p.push('<path d="M 115 211 H 560" stroke="#8392a5" stroke-width="2"/>');
  arrow(310,180,310,64,'N',328, 70,'#426c4c');
  arrow(310,180,310,299,'mg',328,292);
  arrow(273,180,140,180,'F_тр',162,161);
  arrow(356,121,515,121,'v',423,99,'#285fa0');
  arrow(476,310,610,310,'Ox',599,337,'#17324d');
  arrow(87,141,87,42,'Oy',40, 50,'#17324d');height=358;
 }
 if(s.type==='bullet-work') {
  label('Схема прохождения доски',28,25);
  rect(310,82,52,212,'#eee3cf');label('Доска',301, 60);
  p.push('<circle cx="189" cy="159" r="7" fill="#6484a3"/><circle cx="464" cy="159" r="7" fill="#6484a3"/>');
  arrow(199,159,279,159,'800 м·с⁻¹',154,129,'#285fa0');
  arrow(475,159,495,159,'200 м·с⁻¹',442,129,'#285fa0');
  p.push('<circle cx="336" cy="229" r="7" fill="#6484a3"/>');
  arrow(336,229,199,229,'F_с',238,210);
  p.push('<path d="M 310 312 H 362 M 310 306 V 318 M 362 306 V 318" stroke="#8392a5"/>');label('d = 0,025 м',281,343);
  arrow(479,312,610,312,'Ox',596,337,'#17324d');height=376;
 }
 if(s.type==='traction-work') {
  label('Энергия, передаваемая двигателю',28,25);
  rect(85,72,171,64);label('Входная энергия',96,111,undefined,18);
  arrow(263,105,365,105,'',0,0,'#285fa0');rect(373,72,187,64);label('Двигатель',411,111);
  arrow(467,143,467,231,'',0,0,'#426c4c');
  rect(349,239,235, 70);label('Полезная работа',382,266);label('A_пол = F_тяги·s',372,292);
  arrow(389,143,270,230,'Потери',188,207);
  label('КПД: η = A_пол · E_вход⁻¹',187,361);height=395;
 }
 if(s.type==='settling-work') {
  rect(165,75,345,442,'#e0f1f7');label('Вода',182,102);
  p.push('<circle cx="310" cy="265" r="36" fill="#c9d2df" stroke="#6484a3" stroke-width="2"/>');
  arrow(310,265,310,492,'mg',329,481);
  arrow(288,265,288,245,'F_А',231,237,'#426c4c');
  arrow(333,265,333,58,'F_с',352,51,'#426c4c');
  arrow(556,159,556,320,'v',574,306,'#285fa0');
  arrow(88,188,88,423,'Oy',44,447,'#17324d');
  label('Силы уравновешены: mg = F_А + F_с',118,556);height=590;
 }
 if(s.type==='flight-work') {
  label('Установившийся горизонтальный полёт',28,25);
  p.push('<path d="M 226 208 L 320 186 L 394 211 L 320 221 Z" fill="#e6f0ff" stroke="#6484a3" stroke-width="2"/>');
  arrow(320,204,320, 70,'F_под',341,87,'#426c4c');
  arrow(320,204,320,338,'mg',341,322);
  arrow(394,211,547,211,'F_тяги',462,191);arrow(226,208,73,208,'F_с',120,187);
  arrow(459,340,604,340,'Ox',593,366,'#17324d');arrow(85,120,85,43,'Oy',39, 50,'#17324d');height=394;
 }
 if(s.type==='joule-work') {
  label('Пояснительная схема по тексту условия',28,25);
  label('Взаимное расположение механизма условное',28,54,undefined,18);
  rect(252,192,174,161,'#e0f1f7');label('Вода: 7 кг',279,328);
  p.push('<path d="M 339 130 V 292 M 305 278 L 370 301 M 307 301 L 371 278 M 339 137 H 161 V 260 M 339 137 H 531 V 260" stroke="#6484a3" stroke-width="3" fill="none"/>');
  rect(127,260,68,66);rect(497,260,68,66);label('14 кг',139,300);label('14 кг',509,300);
  for(const x of [161,531]){arrow(x,260,x,178,'T',x+16,193,'#426c4c');arrow(x,326,x,408,'mg',x+16,397);}
  arrow( 80,285,80,420,'Oy',35,444,'#17324d');
  label('Оба груза опускаются на h = 2 м',168,469);
  label('Один опыт: 2mgh → нагрев воды',159,504);height=538;
 }
 if(s.type==='vertical') {
  if(s.liquid) {rect(170,15,330,325,'#e0f1f7');label('Жидкость',184,40);}
  if(s.body==='ball')p.push('<circle cx="310" cy="162" r="28" fill="#e6eaf0" stroke="#6484a3" stroke-width="2"/>');
  else if(s.body==='plate')rect(251,145,118,35,'#e6eaf0');
  else if(s.body==='cylinder') {rect(277,125,66,75,'#e6eaf0');p.push('<ellipse cx="310" cy="125" rx="33" ry="9" fill="#f7f9fc" stroke="#6484a3" stroke-width="2"/>');}
  else rect(277,135,66,55,'#e6eaf0');
  for(const [name,dx,length] of s.arrows) {
   const x=310+dx,start=162,end=start+length;
   arrow(x,start,x,end,name,dx<0?x-63:x+18,end+(length<0?8:-7),length>0?'#b05613':'#426c4c');
  }
  arrow(90,s.down?50:285,90,s.down?285:50,'Oy',45,s.down?303:52,'#17324d');
 }
 if(s.type==='horizontal') {
  p.push('<path d="M 100 211 H 555" stroke="#8392a5" stroke-width="2"/>');rect(273,148,74,62);
  arrow(310,180,310,60,'N',326,65,'#426c4c');arrow(310,180,310,300,'mg',326,289);
  const back=160/s.ratio;
  arrow(347,180,507,180,s.forward,448,163);arrow(273,180,273-back,180,s.back,220-back,163);
  arrow(470,310,605,310,'Ox',602,336,'#17324d');arrow(90,125,90,30,'Oy',43,44,'#17324d');
 }
 if(s.type==='circle') {
  const cy=155;
  p.push(`<circle cx="270" cy="${cy}" r="118" fill="none" stroke="#8392a5" stroke-width="2"/><circle cx="388" cy="${cy}" r="7" fill="#285fa0"/><circle cx="270" cy="${cy}" r="3" fill="#17324d"/>`);
  label('O',246,181);p.push('<path d="M 270 155 V 273" stroke="#8392a5" stroke-dasharray="4 4"/>');label('r',282,232);
  arrow(388,155,285,155,'R',317,140);arrow(388,155,388,252,'v',403,232,'#285fa0');
  label('On: к центру',420,100);label('Oτ: по касательной',420,129);height=305;
 }
 if(s.type==='floating') {
  const cx=320,cy=165,R=58;
  let lo=0,hi=2*R;
  for(let i=0;i<50;i++){const h=(lo+hi)/2;if(h*h*(3*R-h)/(4*R**3)<s.fraction)lo=h;else hi=h;}
  const level=cy+R-(lo+hi)/2;
  p.push(`<rect x="150" y="${level}" width="350" height="${315-level}" fill="#d6edf6"/><path d="M 150 50 V 315 H 500 V 50 M 150 ${level} H 500" fill="none" stroke="#6484a3" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="${R}" fill="#d6dce5" stroke="#6484a3" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="39" fill="white" stroke="#8392a5" stroke-dasharray="4 3"/>`);
  arrow(cx,cy,cx,40,'F_А',338,58,'#426c4c');arrow(cx,cy,cx,290,'mg',338,278);
  arrow(83,250,83,65,'Oy',41,74,'#17324d');label('Полость',410,185);p.push('<path d="M 405 179 L 348 168" stroke="#8392a5"/>');label('Равновесие: F_А = mg',205,345);height=375;
 }
 if(s.type==='skater') {
  label('Сразу после короткого броска',28,25);
  p.push('<circle cx="190" cy="73" r="17" fill="#dceaff" stroke="#6484a3"/>');rect(170,94,40,67);rect(426,115,32,32);
  arrow(165,125,62,125,'u',95,106,'#285fa0');arrow(465,132,604,132,'v',540,111,'#285fa0');label('M',180,190);label('m',433,183);
  arrow(470,211,605,211,'Ox',593,235,'#17324d');
  label('Откат: силы на конькобежце',28,268);
  rect(255,365,70,50);p.push('<path d="M 125 417 H 550" stroke="#8392a5"/>');
  arrow(290,390,290,300,'N',307,311,'#426c4c');arrow(290,390,290,480,'Mg',307,473);
  arrow(325,390,405,390,'F_тр',349,371);arrow(241,335,132,335,'u',175,318,'#285fa0');
  arrow(92,390,92,287,'Oy',43,300,'#17324d');height=512;
 }
 if(s.type==='tension') {
  label('Силы на приборе или верёвке',28,25);
  p.push('<path d="M 180 110 H 490" stroke="#6484a3" stroke-width="3"/>');
  if(r.id==='OGEPHYSF88AA9') {
   rect(235,86,195,48);
   p.push('<path d="M 245 110 H 260 L 270 96 L 282 124 L 294 96 L 306 124 L 318 96 L 330 124 L 342 96 L 354 124 L 366 96 L 378 124 L 390 110 H 418" fill="none" stroke="#6484a3" stroke-width="2"/>');
  }
  arrow(180,110,62,110,'F = '+s.force+' Н',64,87);arrow(490,110,608,110,'F = '+s.force+' Н',488,87);
  arrow(468,175,605,175,'Ox',590,200,'#17324d');
  label('Равнодействующая равна нулю',165,223);label('Натяжение T = '+s.force+' Н',200,256);height=282;
 }
 if(s.type==='gravity-pair') {
  p.push('<circle cx="340" cy="260" r="72" fill="#dbeafa" stroke="#6484a3" stroke-width="2"/><circle cx="340" cy="54" r="15" fill="#e6eaf0" stroke="#6484a3" stroke-width="2"/>');
  label('Земля',310,358);label('Ученик',383,59);
  arrow(340,260,340,172,'F_З = 400 Н',440,215);arrow(340,54,340,142,'F_у = 400 Н',365,120);
  arrow(90,300,90,68,'Oy',47,79,'#17324d');label('Равные силы на разных телах',155,395);height=425;
 }
 if(s.type==='braking') {
  p.push('<path d="M 100 212 H 580" stroke="#8392a5" stroke-width="2"/>');rect(270,150,80,62);
  arrow(310,180,310,55,'N',326,62,'#426c4c');arrow(310,180,310,305,'mg',326,294);
  arrow(270,180,135,180,'F_тр',132,160);arrow(385,90,540,90,'v',453, 70,'#285fa0');
  arrow(480,295,610,295,'Ox',592,320,'#17324d');arrow(80,125,80,40,'Oy',30,52,'#17324d');
  label('Шероховатая поверхность',185,350);height=380;
 }
 if(s.type==='friction-experiment') {
  p.push('<path d="M 90 194 H 620 M 300 170 H 435" stroke="#8392a5" stroke-width="2"/>');
  rect(220,145,80,48);for(const x of [222,247,272])rect(x,118,23,27,'#d4dfec');
  rect(435,146,145,47);p.push('<path d="M 446 170 H 460 L 468 156 L 478 183 L 488 156 L 498 183 L 508 156 L 518 183 L 528 156 L 538 183 L 548 170 H 568" fill="none" stroke="#6484a3" stroke-width="2"/>');
  label('Динамометр '+s.instrument,418,126);label('Поверхность '+s.surface,421,224);
  arrow(260,170,260,40,'N',278,54,'#426c4c');arrow(260,170,260,285,'mg',278,279);
  arrow(220,170,110,170,'F_тр',106,151);arrow(300,170,408,170,'F',352,151);
  arrow(395,60,555,60,'v = const',409,39,'#285fa0');
  arrow(500,275,620,275,'Ox',602,301,'#17324d');arrow(80,110,80,30,'Oy',36,42,'#17324d');
  if(s.distance){p.push('<path d="M 220 313 V 339 M 510 313 V 339" stroke="#8392a5"/>');arrow(220,326,510,326,'s = 17 см',313,354,'#285fa0');height=382;}
  else {label('Вес P измеряют отдельно прибором № 2',115,340);height=373;}
 }
 if(s.type==='spring-load') {
  p.push('<path d="M 205 24 H 405" stroke="#6484a3" stroke-width="5"/>');
  if(s.cord)p.push('<path d="M 305 24 V 186" stroke="#6484a3" stroke-width="6"/>');
  else p.push('<path d="M 305 24 V 42 L 289 53 L 321 67 L 289 81 L 321 95 L 289 109 L 321 123 L 289 137 L 321 151 L 305 164 V 186" fill="none" stroke="#6484a3" stroke-width="3"/>');
  rect(274,186,62,58);label(s.cord?'Шнур':'Пружина',385,105);label('m',346,224);
  arrow(305,207,305, 90,'F_упр',217,107,'#426c4c');arrow(305,207,305,324,'mg',323,313);
  arrow( 90,285,90,60,'Oy',45, 70,'#17324d');label('Равновесие: F_упр = mg',189,364);height=394;
 }
 if(s.type==='fixed-pulley-lab') {
  p.push('<path d="M 165 365 H 225 M 190 365 V 30 H 350 V 38" fill="none" stroke="#6484a3" stroke-width="5"/><circle cx="350" cy="80" r="42" fill="#e6eaf0" stroke="#6484a3" stroke-width="2"/><circle cx="350" cy="80" r="4" fill="#6484a3"/><path d="M 308 230 V 80 A 42 42 0 0 1 392 80 V 205 M 308 270 V 278 M 392 280 V 303" fill="none" stroke="#8392a5" stroke-width="3"/>');
  rect(282,230,52,40);rect(282,278,52,40);rect(379,205,26,75);
  p.push('<path d="M 392 211 L 384 221 L 400 231 L 384 241 L 400 251 L 384 261 L 392 273" stroke="#6484a3" fill="none"/>');
  label('Динамометр',422,242);label('Два груза',68,330);
  arrow(308,230,308,137,'T',277,149,'#426c4c');arrow(308,278,308,385,'Mg',327,377);
  arrow(392,303,392,380,'F',410,359);arrow(240,310,240,224,'h = 15 см',105,282,'#285fa0');
  arrow(560,180,560, 60,'Oy',578, 70,'#17324d');arrow(497,303,497,380,'s = h',520,349,'#285fa0');
  label('При равномерном подъёме F = T = Mg',133,428);height=460;
 }
 if(s.type==='orbit-gravity') {
  p.push('<circle cx="300" cy="165" r="120" fill="none" stroke="#8392a5" stroke-width="2"/><circle cx="300" cy="165" r="55" fill="#dbeafa" stroke="#6484a3" stroke-width="2"/><circle cx="420" cy="165" r="8" fill="#285fa0"/><path d="M 300 165 V 285" stroke="#8392a5" stroke-dasharray="4 4"/>');
  label('Земля',271,158);label('r',311,252);
  arrow(420,165,341,165,'F',371,143);arrow(420,165,420,269,'v',438,251,'#285fa0');
  label('On: к центру',60,48);label('Сила создаёт центростремительное ускорение',87,330);height=360;
 }
 if(s.type==='two-gravitating-balls') {
  for(const x of [190,470])p.push(`<circle cx="${x}" cy="155" r="38" fill="#d4dfec" stroke="#6484a3" stroke-width="2"/>`);
  p.push('<path d="M 190 155 H 470" stroke="#8392a5" stroke-dasharray="4 4"/><path d="M 190 215 V 241 M 470 215 V 241 M 190 228 H 470" stroke="#8392a5"/>');
  arrow(190,155,290,155,'F',242,133);arrow(470,155,370,155,'F',393,133);
  label('m₁',178,205);label('m₂',458,205);label('r',323,254);
  arrow(475,291,611,291,'Ox',589,319,'#17324d');label('Расстояние между центрами',155,349);height=379;
 }
 if(s.type==='falling-water') {
  rect(200,70,300,160,'#dceff7');p.push('<path d="M 200 185 H 500" stroke="#6484a3" stroke-dasharray="5 5"/><circle cx="500" cy="185" r="5" fill="white"/>');
  label('Вода и пакет',266,107);label('Отверстие',452,259);p.push('<path d="M 490 242 L 500 193" stroke="#8392a5"/>');
  arrow(350,148,350,286,'mg',367,280);arrow(560,90,560,224,'a = g',576,169,'#285fa0');arrow(105,65,105,245,'Oy',66,262,'#17324d');
  label('При свободном падении Δp = 0',167,340);height=373;
 }
 if(s.type==='planet-atmospheres') {
  label('Условная схема удержания газа',165,26);
  for(const [x,radius,name,temp] of [[170,45,'Меркурий','до +430 °C'],[480,65,'Марс','до +35 °C']]) {
   p.push(`<circle cx="${x}" cy="255" r="${radius}" fill="#d4dfec" stroke="#6484a3" stroke-width="2"/><circle cx="${x}" cy="140" r="6" fill="#285fa0"/>`);
   arrow(x,140,x,188,'F',x+18,180);arrow(x,133,x, 70,'v',x+18,92,'#285fa0');label(name,x-40,350);label(temp,x-45,380);
  }
  label('Газ движется; притяжение направлено к планете',91,425);height=453;
 }
 if(s.type==='inelastic-collision') {
  const ball=(x,cy)=>p.push(`<circle cx="${x}" cy="${cy}" r="27" fill="#d4dfec" stroke="#6484a3" stroke-width="2"/>`);
  const speed=value=>Number.parseFloat(value.replace(',','.'));
  const maxSpeed=Math.max(speed(s.v1),speed(s.v2));
  const firstLength=Number.isFinite(maxSpeed)?110*speed(s.v1)/maxSpeed:110;
  const secondLength=s.v2==='0'?0:110*speed(s.v2)/maxSpeed;
  const afterLength=Number.isFinite(maxSpeed)?110*speed(s.u)/maxSpeed:55;
  label('До столкновения',28,24);ball(180,95);ball(470,95);
  label('m₁ = '+s.m1,115,153);label('m₂ = '+s.m2,417,153);
  arrow(208,95,208+firstLength,95,'v₁ = '+s.v1,218,70,'#285fa0');
  if(s.v2==='0')label('v₂ = 0',447,54,'#285fa0');
  else arrow(442,95,442-secondLength,95,'v₂ = '+s.v2,393,54,'#285fa0');
  label('Силы взаимодействия при ударе',28,202);ball(303,267);ball(357,267);
  arrow(303,267,190,267,'F₂₁',221,245);arrow(357,267,470,267,'F₁₂',399,245);
  label('После: общая скорость',28,340);ball(303,402);ball(357,402);
  if(s.direction<0)arrow(276,402,276-afterLength,402,'u = '+s.u,144,378,'#285fa0');
  else arrow(385,402,385+afterLength,402,'u = '+s.u,400,378,'#285fa0');
  arrow(489,466,617,466,'Ox',592,492,'#17324d');height=521;
 }
 if(s.type==='through-bullet') {
  label('До пробивания',28,24);rect(383,60,80,75);p.push('<circle cx="195" cy="97" r="7" fill="#6484a3"/>');
  arrow(210,97,345,97,'v = 900 м·с⁻¹',204,60,'#285fa0');arrow(383,125,301,125,'V = 2 м·с⁻¹',317,160,'#285fa0');
  label('m = 0,009 кг',128,199);label('M = 1,8 кг',384,199);
  label('После пробивания',28,250);rect(260,286,80,75);p.push('<circle cx="455" cy="323" r="7" fill="#6484a3"/>');
  arrow(471,323,546,323,'u = 500 м·с⁻¹',420,285,'#285fa0');label('Брусок стоит',239,391);
  label('Горизонтальные силы при пробивании',103,435);rect(280,462,100,60);p.push('<circle cx="300" cy="490" r="5" fill="#6484a3"/>');
  arrow(300,490,186,490,'−F_x',198,472);arrow(365,508,479,508,'F_x',417,536);
  arrow(488,591,613,591,'Ox',591,617,'#17324d');height=645;
 }
 if(s.type==='boat-recoil') {
  label('Горизонтальные импульсы после прыжка',83,25);
  p.push('<path d="M 116 180 H 297 L 260 233 H 152 Z" fill="#dbeafa" stroke="#6484a3" stroke-width="2"/><path d="M 75 240 H 340" stroke="#6484a3"/><circle cx="459" cy="100" r="17" fill="#d4dfec" stroke="#6484a3"/><path d="M 459 117 V 182 M 433 148 L 487 136 M 459 182 L 436 209 M 459 182 L 483 203" fill="none" stroke="#6484a3" stroke-width="5"/>');
  arrow(160,156,40,156,'p_лx = −36',62,128,'#285fa0');arrow(487,108,607,108,'p_мx = +36',481,80,'#285fa0');
  label('Лодка: M = 4m',118,281);label('Мальчик: m',422,254);label('Импульсы в кг·м·с⁻¹',222,331);
  arrow(491,380,613,380,'Ox',591,406,'#17324d');height=435;
 }
 if(s.type==='fragmentation') {
  label('До разрыва',28,24);rect(230,65,90,48);arrow(334,89,374,89,'v = 200 м·с⁻¹',332,60,'#285fa0');label('M = 2 кг',232,154);
  label('После разрыва',28,219);rect(201,266,39,36);rect(408,266,39,36);
  arrow(197,284,117,284,'400 м·с⁻¹',66,255,'#285fa0');arrow(451,284,611,284,'800 м·с⁻¹',467,255,'#285fa0');
  label('m = 1 кг',180,339);label('m = 1 кг',391,339);arrow(484,391,612,391,'Ox',590,417,'#17324d');height=445;
 }
 if(s.type==='jet-reaction') {
  label('Пояснение: реакция одной струи',156,25);label('Направление струи здесь выбрано условно',117,56);
  rect(267,100,63,55);p.push('<path d="M 330 120 H 367 V 135 H 330" fill="#dbeafa" stroke="#6484a3" stroke-width="2"/>');
  arrow(368,128,548,128,'Струя',431,105,'#285fa0');arrow(330,153,159,153,'F_р',204,179);
  arrow(489,220,615,220,'Ox',593,248,'#17324d');height=281;
 }
 return {svg:`<g transform="translate(0 ${y})">${p.join('')}</g>`,height};
};
