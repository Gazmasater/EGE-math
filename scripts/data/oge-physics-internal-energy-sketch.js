'use strict';
module.exports=(r,y,escape)=>{
 const p=[],s=r.sketch,marker=`url(#arrow-${r.id})`;
 const label=(t,x,z,size=20,color='#17324d')=>p.push(`<text x="${x}" y="${z}" font-size="${size}" fill="${color}">${escape(t).replace(/_([A-Za-zА-Яа-яЁё]+)/g,'<tspan font-size="13" baseline-shift="sub">$1</tspan>')}</text>`);
 const line=(x1,z1,x2,z2,color='#6484a3',width=3)=>p.push(`<path d="M ${x1} ${z1} L ${x2} ${z2}" stroke="${color}" stroke-width="${width}" fill="none"/>`);
 const arrow=(x1,z1,x2,z2,t,tx,tz,color='#b05613')=>{p.push(`<path d="M ${x1} ${z1} L ${x2} ${z2}" stroke="${color}" stroke-width="3" fill="none" marker-end="${marker}"/>`);label(t,tx,tz,20,color);};
 const rect=(x,z,w,h,fill='#e7f0fb')=>p.push(`<rect x="${x}" y="${z}" width="${w}" height="${h}" rx="5" fill="${fill}" stroke="#6484a3" stroke-width="2"/>`);
 let height=310;
 if(s.kind==='compression'){
  rect(205,80,270,145);rect(205,80,28,145,'#bfcbd6');
  for(const [x,z]of [[270,112],[330,103],[410,127],[300,190],[390,181],[449,210]])p.push(`<circle cx="${x}" cy="${z}" r="5" fill="#426f9c"/>`);
  line(125,150,205,150);arrow(110,58,226,58,'Поршень движется вправо',88,38,'#285fa0');
  label('Объём газа уменьшается',242,258);label('Q ≈ 0; A_внеш > 0; ΔU > 0',175,293);height=320;
 }else if(s.kind==='fixed-volume'){
  label('Жёсткий закрытый сосуд',28,28);rect(205,68,270,150);
  for(const [x,z]of [[255,110],[335,95],[410,118],[295,174],[398,181]])p.push(`<circle cx="${x}" cy="${z}" r="6" fill="#426f9c"/>`);
  label('m = const; V = const',244,253);label('Плотность ρ не меняется',209,285);label(s.heat?'Нагрев → быстрее тепловое движение':'Охлаждение → медленнее тепловое движение',85,323,19);height=348;
 }else if(s.kind==='expansion'){
  label('Быстрый выпуск сжатого газа',28,28);rect(205,82,240,150);rect(434,130,32,40,'#fff');
  arrow(475,149,610,149,'Выход газа',470,115,'#285fa0');label('Газ расходует внутреннюю энергию',102,280);label('После быстрого выпуска температура ниже',68,315,19);height=345;
 }else if(s.kind==='rope'){
  label('Модель спортсмена при скольжении вниз',28,28,19);line(325,55,325,250,'#7a6349',7);rect(298,116,54,74);label('m',316,158);
  arrow(309,116,309,49,'F_тр',243,75,'#426c4c');arrow(340,190,340,288,'mg',363,273);
  arrow(104,95,104,236,'Oy',60,255,'#17324d');arrow(458,114,458,208,'v',480,170,'#285fa0');
  label('mg − F_тр = maᵧ',242,332);label('Трение нагревает руки и канат',150,368);height=397;
 }else if(s.kind==='drag'){
  label('Переход энергии при торможении в атмосфере',28,28,19);
  const stages=['Уменьшение механической энергии движения','Рост внутренней энергии тела и воздуха','Нагревание: исходный источник — работа'];
  stages.forEach((t,i)=>{rect(38,59+i*73,604,53);label(t,56,92+i*73,18);});height=300;
 }else if(s.kind==='cooling-solid'){
  label('Охлаждение стальной детали',28,28);rect(150,90,215,125,'#d4dde7');label('Сталь, 10 кг',196,160);
  arrow(365,145,552,145,'Q_отд',436,117);label('Температура снижается на 200 °C',142,268);label('Уменьшение U равно 1 МДж',168,304);height=332;
 }else if(s.kind==='two-impacts'){
  label('Отделяем энергию системы от энергии шарика',28,28,19);
  const rows=['Потеря механической энергии: D₁ > D₂','Шарики получают доли: α₁D₁ и α₂D₂','При одинаковых долях: ΔU₁ > ΔU₂','Разные доли могут изменить сравнение'];
  rows.forEach((t,i)=>{rect(38,59+i*65,604,48);label(t,56,89+i*65,18);});height=340;
 }else throw Error('Unknown internal-energy sketch '+s.kind);
 return {svg:`<g transform="translate(0 ${y})">${p.join('')}</g>`,height};
};
