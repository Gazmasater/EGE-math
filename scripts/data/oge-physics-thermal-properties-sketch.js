module.exports=(r,y,escape)=>{
 const s=r.sketch,p=[],marker=`url(#arrow-${r.id})`;
 const text=(v,x,z,size=18,color='#17324d')=>p.push(`<text x="${x}" y="${z}" fill="${color}" font-size="${size}">${escape(v).replace(/_([A-Za-zА-Яа-яЁё]+)/g,'<tspan font-size="12" baseline-shift="sub">$1</tspan>')}</text>`);
 const line=(x,z,u,v,color='#6484a3',width=3)=>p.push(`<path d="M ${x} ${z} L ${u} ${v}" stroke="${color}" stroke-width="${width}" fill="none"/>`);
 const arrow=(x,z,u,v,label,tx,tz,color='#285fa0')=>{p.push(`<path d="M ${x} ${z} L ${u} ${v}" stroke="${color}" stroke-width="3" fill="none" marker-end="${marker}"/>`);if(label)text(label,tx,tz,18,color);};
 const rect=(x,z,w,h,fill='#e6f0ff')=>p.push(`<rect x="${x}" y="${z}" width="${w}" height="${h}" rx="4" fill="${fill}" stroke="#6484a3" stroke-width="2"/>`);
 text('Пояснительная схема по тексту условия',28,23);
 let height=365;
 if(s.kind==='rail'){
  text('Прохладно: зазор больше',28,64);rect(60,88,238,30);rect(350,88,238,30);line(298,137,350,137);text('Зазор',297,167);
  text('Тепло: рельсы удлиняются',28,217);rect(60,239,259,30);rect(329,239,259,30);arrow(272,299,316,299,'',0,0);arrow(376,299,332,299,'',0,0);
  text('Зазор допускает изменение длины',132,343);
 }else if(s.kind==='wire'){
  line(105,75,105,275);line(575,75,575,275);
  p.push('<path d="M 105 92 Q 340 150 575 92" stroke="#285fa0" fill="none" stroke-width="3"/><path d="M 105 92 Q 340 315 575 92" stroke="#b05613" fill="none" stroke-width="3"/>');
  text('Холоднее',295,85);text('Жарче',307,249);text('Опоры остаются на прежних местах',123,313);
 }else if(s.kind==='tank'){
  rect(82,150,255,132,'#dceff7');text('Система с водой',129,229);rect(464,70,144,181,'#f7fafc');rect(466,161,140,87,'#dceff7');
  line(337,243,410,243);line(410,243,410,227);line(410,227,464,227);arrow(373,207,449,207,'',0,0);text('Бак',515,52);text('Свободный объём',456,117,16);text('При нагреве часть воды поступает в бак',112,329);
 }else if(s.kind==='string'){
  rect(75,119,30,81);rect(566,119,30,81);line(105,159,566,159,'#b05613',3);
  text('Закреплённая струна',231,113);arrow(185,212,485,212,'Охлаждение меняет натяжение',181,255);text('Естественная длина струны уменьшается',118,309);
 }else if(s.kind==='thermometer'){
  p.push('<circle cx="115" cy="128" r="35" fill="#f4c66a"/>');text('Солнце',80,72);
  for(let i=0;i<3;i++)arrow(167,99+i*30,289,119+i*30,'',0,0,'#b05613');
  rect(353,66,32,191,'#f7fafc');rect(365,101,8,133,'#e1a373');p.push('<circle cx="369" cy="260" r="26" fill="#e1a373" stroke="#6484a3"/>');
  arrow(424,240,424,115,'Столбик растёт',442,164);text('Спирт получает энергию и расширяется',112,329);
 }else if(s.kind==='spoon'){
  p.push('<path d="M 115 95 L 145 264 H 393 L 424 95" stroke="#6484a3" fill="#dceff7" stroke-width="3"/><ellipse cx="305" cy="210" rx="22" ry="32" fill="#d4deeb" stroke="#6484a3"/><path d="M 309 182 L 383 56" stroke="#6484a3" stroke-width="10"/>');
  text('Горячая вода',168,149);arrow(276,203,350,85,'Теплота',447,108,'#b05613');line(442,112,362,101);
  text('Металлическая ложка принимает часть энергии',65,316);text('Уменьшается резкость нагрева стекла',126,348);height=381;
 }else if(s.kind==='equilibrium'){
  rect(47,59,578,264,'#f7fafc');text('Лаборатория: '+s.room+' °C',222,89);
  rect(194,138,264,57,'#e8c7a3');rect(239,195,174,50,'#d4deeb');text('5 кг; сначала '+s.t1+' °C',225,174);text('2 кг; '+s.t2+' °C',271,225);
  arrow(187,170,89,170,'Теплота',66,140,'#b05613');arrow(466,219,582,219,'Теплота',483,253,'#b05613');text('После остывания оба бруска: '+s.room+' °C',153,298);height=350;
 }else if(s.kind==='two-thermometers'){
  for(const [x,big] of [[160,true],[490,false]]){
   text(big?'Большой прибор':'Маленький прибор',x-77,67);rect(x-85,150,170,145,'#dceff7');
   const w=big?30:14;rect(x-w/2,91,w,160,'#f7fafc');rect(x-3,130,6,117,'#e1a373');p.push(`<circle cx="${x}" cy="257" r="${big?22:12}" fill="#e1a373" stroke="#6484a3"/>`);
   text(big?'Вода отдаёт больше':'Вода отдаёт меньше',x-83,329,17);text('теплоты прибору',x-69,354,17);
  }
  text('Итог: t большого < t маленького',196,404);height=434;
 }else if(s.kind==='drop'){
  rect(224,65,200,30,'#d4deeb');rect(301,95,43,51,'#d4deeb');
  p.push('<path d="M 309 146 C 309 174 275 198 276 231 C 276 290 368 290 368 231 C 368 198 336 174 336 146 Z" fill="#c6e8f3" stroke="#6484a3" stroke-width="2"/>');
  arrow(307,149,307,51,'F_пн',248,57,'#426c4c');arrow(323,233,323,344,'mg',341,327,'#b05613');arrow(113,276,113,124,'Oy',68,138,'#17324d');
  text('Суммарная удерживающая сила',362,154,17);text('на шейке направлена вверх',382,182,17);text('На пороге отрыва: F_пн = mg',181,391);height=423;
 }else if(s.kind==='sphere'){
  p.push('<circle cx="340" cy="167" r="89" fill="#c6e8f3" stroke="#6484a3" stroke-width="3"/><ellipse cx="314" cy="129" rx="25" ry="17" fill="#eff8fc"/>');
  text('Свободная капля',261,293);text('Минимум площади поверхности при данном объёме',59,329);
 }
 return {svg:`<g transform="translate(0 ${y})">${p.join('')}</g>`,height};
};
