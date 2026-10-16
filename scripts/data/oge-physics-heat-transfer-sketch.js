module.exports=(r,y,escape)=>{
 const s=r.sketch,p=[],marker=`url(#arrow-${r.id})`,blue='#285fa0',warm='#b05613',green='#426c4c';
 const text=(v,x,z,size=18,color='#17324d')=>p.push(`<text x="${x}" y="${z}" fill="${color}" font-size="${size}">${escape(v)}</text>`);
 const path=(d,color='#6484a3',width=3,fill='none')=>p.push(`<path d="${d}" stroke="${color}" stroke-width="${width}" fill="${fill}"/>`);
 const arrow=(x,z,u,v,color=warm,width=3)=>p.push(`<path d="M ${x} ${z} L ${u} ${v}" stroke="${color}" stroke-width="${width}" fill="none" marker-end="${marker}"/>`);
 const rect=(x,z,w,h,fill='#e6f0ff',stroke='#6484a3')=>p.push(`<rect x="${x}" y="${z}" width="${w}" height="${h}" rx="5" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`);
 const circle=(x,z,radius,fill='#c6e8f3')=>p.push(`<circle cx="${x}" cy="${z}" r="${radius}" fill="${fill}" stroke="#6484a3" stroke-width="2"/>`);
 const cup=(x,z,color='#d4deeb')=>{path(`M ${x} ${z} L ${x+12} ${z+100} H ${x+112} L ${x+125} ${z}`, '#6484a3',3,color);path(`M ${x+122} ${z+16} C ${x+179} ${z+5} ${x+171} ${z+88} ${x+115} ${z+78}`);};
 const sun=(x,z)=>{circle(x,z,27,'#f4c66a');for(let i=0;i<8;i++){const a=i*Math.PI/4;path(`M ${x+36*Math.cos(a)} ${z+36*Math.sin(a)} L ${x+47*Math.cos(a)} ${z+47*Math.sin(a)}`,'#d2a03c',2);}};
 text('Пояснительная схема по тексту условия',28,23);
 let height=390;
 if(s.kind==='kettles'){
  for(const [x,dark] of [[163,true],[489,false]]){
   text(dark?'Чёрное покрытие':'Белое покрытие',x-79,74);rect(x-65,158,130,103,dark?'#485461':'#ffffff');path(`M ${x-36} 150 Q ${x} 121 ${x+36} 150`);
   path(`M ${x+65} 181 L ${x+101} 163 L ${x+76} 220`, '#6484a3',3,dark?'#485461':'#ffffff');
   for(const dx of [-45,0,45])arrow(x+dx,153,x+dx, dark?92:121,warm,dark?4:2);
  }
  text('Тепловое излучение',246,299);text('В модели при одинаковой температуре:',126,336);text('чёрное покрытие излучает интенсивнее',138,366);
 }else if(s.kind==='snow-sun'){
  sun(340,101);rect(68,250,223,40,'#fff');rect(389,250,223,40,'#a6aaad');
  arrow(292,134,212,238);arrow(388,134,467,238);
  arrow(168,239,100,167,blue,4);arrow(517,239,548,198,blue,2);
  text('Чистый снег',123,324);text('Грязный снег',433,324);text('Больше отражает',86,363);text('Больше поглощает',395,363);
 }else if(s.kind==='insulation'){
  text(s.outside,235,73);
  rect(100,166,142,115,'#c6e8f3');rect(412,137,198,171,'#e8d4b5');rect(440,165,142,115,'#c6e8f3');
  text('Без толстой изоляции',65,338);text('Теплоизоляция',441,338);
  arrow(170,89,170,153,warm,4);arrow(511,90,511,126,warm,2);
  text(s.object,113,232,16);text(s.object,453,231,16);
  text('Теплота поступает быстрее',43,380);text('Приток теплоты медленнее',372,380);height=410;
 }else if(s.kind==='contact'){
  for(const [cy,metal] of [[153,false],[294,true]]){
   circle(129,cy,43,metal?'#c2cbd5':'#d8b88a');text(metal?'Сталь':'Дерево',97,cy+68);
   rect(453,cy-33,145,65,'#edceb6');text('Кожа руки',476,cy+7);
   if(s.cold)arrow(436,cy,metal?185:247,cy,warm,metal?5:2);
   else arrow(186,cy,metal?437:367,cy,warm,metal?5:2);
   text(metal?'Интенсивнее':'Слабее',278,cy-20,18,warm);
  }
  text(s.cold?'Шарики холоднее руки: теплота уходит от кожи':'Шарики при 50 °C: теплота поступает к коже',73,76,18);height=395;
 }else if(s.kind==='sun-thermometers'){
  sun(340,94);
  for(const [x,black] of [[180,true],[503,false]]){
   arrow(black?293:387,133,x,202);rect(x-11,176,22,113,'#fafcff');rect(x-3,black?207:244,6,black?82:45, '#e1a373');circle(x,306,27,black?'#444c55':'#e1a373');
   text(black?'Сажа':'Чистое стекло',x-(black?23:62),356);
  }
  text('1',174,395);text('2',496,395);text('В модели показание первого выше',151,441);height=465;
 }else if(s.kind==='sand'){
  sun(160,111);rect(85,284,523,44,'#ead3a7');text('Поверхность песка',259,314);
  for(let i=0;i<3;i++)arrow(218+i*29,111+i*25,392+i*60,266);
  text('Солнечное излучение',320,125);text('Поглощённая энергия нагревает песок',130,370);
 }else if(s.kind==='cups'){
  cup(124,151,'#e5c9aa');cup(454,151,'#c2cbd5');text('Керамика',138,112);text('Сталь',486,112);
  arrow(153,275,153,322,warm,2);arrow(483,274,483,345,warm,5);text('Теплота в комнату',225,350);
  text('Чашки прогреты; кофе одинаково горячий',104,75);height=382;
 }else if(s.kind==='thermos'){
  path('M 154 89 V 306 Q 154 330 178 330 H 365 Q 390 330 390 306 V 89','#6484a3',3,'#dceff7');
  path('M 197 89 V 284 Q 197 291 204 291 H 341 Q 348 291 348 284 V 89','#6f8296',5);
  text('Жидкость',230,199);text('Зазор',65,268);path('M 118 272 L 170 272');
  text('Блестящие стенки',422,153);path('M 433 167 L 360 193');
  arrow(294,226,334,226);arrow(334,236,294,236,blue);text('Отражение',432,259);path('M 430 264 L 352 241');
  text('Лучистый теплообмен уменьшается',155,375);height=405;
 }else if(s.kind==='conductivity'){
  const rows=[['Газобетон',.12],['Железобетон',1.69],['Кирпич',.70],['Дерево',.09]];
  for(let i=0;i<rows.length;i++){
   const [name,v]=rows[i],z=103+i*59,selected=s.most?i===1:i===3;
   text((i+1)+'. '+name,40,z+25);rect(229,z,Math.max(18,v*206),34,selected?'#e5bd80':'#bfd6eb');text(String(v).replace('.',','),245+Math.max(18,v*206),z+24,17);
  }
  text(s.most?'Максимум потерь через железобетон':'Минимум потерь через дерево',126,368);height=399;
 }else if(s.kind==='clothes'){
  sun(340,104);rect(108,243,148,100,'#fff');rect(424,243,148,100,'#586471');
  arrow(295,140,217,226);arrow(385,140,463,226);arrow(153,226,83,157,blue,4);arrow(529,227,558,194,blue,2);
  text('Светлая ткань',125,382);text('Тёмная ткань',441,382);text('Светлая поверхность отражает больше света',124,425);height=450;
 }else if(s.kind==='breeze'){
  rect(35,282,295,53,'#c6e8f3');rect(330,282,305,53,'#e8d4b5');text('Море',154,316);text('Суша днём',417,316);
  arrow(465,257,465,121,warm,4);text('Тёплый воздух',479,180,17);text('поднимается',479,205,17);
  arrow(441,92,186,92,blue);arrow(163,116,163,231,blue);arrow(185,252,440,252,blue,4);
  text('У поверхности: с моря на берег',196,224,17);text('Циркуляция переносит вещество и энергию',127,378);height=405;
 }else if(s.kind==='cup-contact'){
  text('Одинаково горячие края кружек',147,77);
  for(const [cy,metal] of [[157,false],[279,true]]){
   rect(72,cy-29,173,64,metal?'#c2cbd5':'#e5c9aa');text(metal?'Металл':'Керамика',109,cy+9);rect(471,cy-29,125,64,'#edceb6');text('Губы',510,cy+9);
   arrow(260,cy,metal?453:382,cy,warm,metal?5:2);text(metal?'Быстрее':'Медленнее',296,cy-20);
  }
  text('Сравнивается передача теплоты к коже',139,367);
 }else if(s.kind==='spoon'){
  cup(156,164,'#e3b990');text('Горячий чай',166,303);
  path('M 258 227 L 431 84','#6484a3',11);arrow(308,218,446,108);text('Ручка нагревается',407,67);
  text('Теплота распространяется вдоль металла',132,341);height=368;
 }else if(s.kind==='foam'){
  rect(100,89,474,216,'#e7dbba');
  for(let row=0;row<3;row++)for(let col=0;col<7;col++)circle(137+col*66,128+row*66,22,'#f7fbff');
  text('Ячейки с воздухом',253,350);text('Малая теплопроводность и слабое перемешивание',69,385);height=412;
 }else if(s.kind==='boards'){
  for(const [cy,wet] of [[144,false],[285,true]]){
   rect(61,cy-36,169,73,wet?'#c1c5b3':'#d8b88a');text(wet?'Влажная доска':'Сухая доска',79,cy+7,17);rect(475,cy-31,132,63,'#edceb6');text('Рука',519,cy+8);
   arrow(454,cy,wet?251:314,cy,warm,wet?5:2);text(wet?'Больше теплоты':'Меньше теплоты',277,cy-21,17);
  }
  text('Комнатная температура досок ниже температуры кожи',47,72,17);text('Влажная доска кажется холоднее',174,373);height=401;
 }else if(s.kind==='fire'){
  path('M 93 280 Q 112 223 136 209 Q 126 167 170 123 Q 167 191 197 220 Q 218 254 204 280 Z',warm,2,'#f0b961');
  arrow(157,113,157,88,blue);text('Горячий воздух вверх',38,62,17);
  circle(526,163,23,'#edceb6');path('M 526 187 V 267 M 526 213 L 483 243 M 526 213 L 562 242 M 526 267 L 494 310 M 526 267 L 558 310');
  for(let i=0;i<3;i++)arrow(225,176+i*30,471,190+i*30);
  text('Излучение',299,157);text('Турист сбоку',474,351);height=382;
 }else if(s.kind==='wind'){
  text('Ветер заменяет нагретый воздух холодным',119,75);rect(416,170,112,140,'#edceb6');text('Тело',450,248);
  rect(357,158,31,163,'#f2dcc8');text('Тёплый слой',309,358);
  for(let i=0;i<3;i++)arrow(72,174+i*58,330,174+i*58,blue,3);
  arrow(391,212,350,212);arrow(379,137,453,112,blue);text('Воздух уносит теплоту',52,122);height=390;
 }else if(s.kind==='wet-towel'){
  for(const [x,wet] of [[163,false],[493,true]]){
   rect(x-82,159,164,161,wet?'#b9dbe1':'#e8d4b5');rect(x-41,185,82,114,'#dceff7');rect(x-18,150,36,37,'#dceff7');
   text(wet?'Мокрое полотенце':'Сухое полотенце',x-83,365);
   if(wet){for(let j=0;j<3;j++)arrow(x-50+j*50,140,x-50+j*50,89,blue);text('Испарение воды',x-76,64);}
  }
  text('Испарение требует энергии и охлаждает ткань',114,421);height=446;
 }else if(s.kind==='snow-cover'){
  rect(60,274,557,59,'#bc9a79');text('Почва',296,311);
  rect(60,226,255,47,'#fff');rect(361,158,255,115,'#fff');text('Тонкий снег',124,361);text('Толстый снег',424,361);
  arrow(183,201,183,100,warm,4);arrow(490,128,490,91,warm,2);
  text('Холодный воздух',254,67);text('Больше потери',111,393);text('Меньше потери',414,393);height=422;
 }else if(s.kind==='volcano'){
  path('M 61 320 L 160 189 H 204 L 305 320 Z','#6484a3',3,'#c2b4a2');path('M 157 190 Q 183 208 208 190');
  for(const [x,z,rad] of [[184,143,30],[244,117,39],[315,127,33],[375,98,43],[448,115,35]])circle(x,z,rad,'#e0e5eb');
  sun(584,212);arrow(541,187,465,137);arrow(455,89,487,52,blue,4);
  text('Часть света возвращается в космос',123,57,17);text('Отражающие аэрозоли',284,198,17);text('Извержение',115,353);text('Отражённая доля растёт',358,318);height=387;
 }else throw new Error('Unknown heat-transfer sketch: '+s.kind);
 return {svg:`<g transform="translate(0 ${y})">${p.join('')}</g>`,height};
};
