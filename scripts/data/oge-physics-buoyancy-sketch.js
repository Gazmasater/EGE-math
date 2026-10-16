module.exports=function(r,y,escape){
 const s=r.sketch,p=[],mark=`url(#arrow-${r.id})`;
 const text=(v,x,dy,color='#17324d',size=19)=>p.push(`<text x="${x}" y="${dy}" font-size="${size}" fill="${color}">${escape(v).replace(/_([A-Za-zА-Яа-яЁё]+)/g,'<tspan font-size="13" baseline-shift="sub">$1</tspan>')}</text>`);
 const arrow=(x1,y1,x2,y2,name,tx,ty,color)=>{p.push(`<path d="M ${x1} ${y1} L ${x2} ${y2}" fill="none" stroke="${color}" stroke-width="3" marker-end="${mark}"/>`);if(name)text(name,tx,ty,color);};
 const vessel=(x,w,level,bottom)=>p.push(`<rect x="${x}" y="${level}" width="${w}" height="${bottom-level}" fill="#d5edf7"/><path d="M ${x} 60 V ${bottom} H ${x+w} V 60 M ${x} ${level} H ${x+w}" stroke="#6484a3" stroke-width="2" fill="none"/>`);
 const body=(x,top,w,h,hollow=false)=>{p.push(`<rect x="${x}" y="${top}" width="${w}" height="${h}" fill="#f6d5a9" stroke="#92734a" stroke-width="2"/>`);if(hollow)p.push(`<rect x="${x+13}" y="${top+13}" width="${w-26}" height="${h-26}" fill="#fff" stroke="#92734a"/>`);};
 text('Пояснительная схема по тексту условия',28,25);
 let height=405;
 if(s.kind==='ice-release'){
  vessel(92,190,118,298);vessel(394,190,145,298);
  body(160,229,60,69);body(458,127,60,61);
  text('Лёд связан с дном',104,339,undefined,18);text('Лёд свободно плавает',393,339,undefined,18);
  p.push('<path d="M 282 118 H 584" stroke="#8392a5" stroke-dasharray="5 5"/>');
  arrow(488,153,488,79,'F_А',504,86,'#426c4c');arrow(482,159,482,233,'mg',497,229,'#b05613');
  arrow(326,232,367,232,'',0,0,'#285fa0');text('Отрыв',316,212,undefined,17);
  text('Пунктир — прежний уровень',373,378,undefined,17);height=410;
 }else if(s.kind==='experiment'){
  for(const [i,x,level,label] of [[0,110,217,'Четверть'],[1,325,192,'Половина'],[2,540,132,'Весь объём']]){
   const a=[20,40,68][i];vessel(x-61,122,level,297);body(x-19,142,38,100);
   p.push(`<path d="M ${x} 140 V 57" stroke="#8392a5" stroke-width="2"/><rect x="${x-13}" y="46" width="26" height="25" fill="#eef4fa" stroke="#6484a3"/>`);
   const buoyancyY=(242+Math.max(level,142))/2;
   arrow(x-13,buoyancyY,x-13,buoyancyY-a,'F_А',x-58,buoyancyY-a-8,'#426c4c');
   arrow(x+8,142,x+8,142-(85-a),'T',x+23,140-(85-a),'#285fa0');
   arrow(x+8,202,x+8,287,'mg',x+24,282,'#b05613');text(label,x-43,331,undefined,18);
  }
  text('Измеряем P = T в трёх положениях',171,378);text('На цилиндре: T + F_А = mg',213,409);height=439;
 }else{
  const bottom=s.kind==='bottom',floating=['floating','partial'].includes(s.kind),suspended=s.kind==='suspended';
  const top=bottom?194:floating?110:160,h=80,cy=top+h/2,level=bottom?145:floating?top+h*(1-(s.fraction||0.5)):104;
  vessel(183,324,level,bottom?274:306);body(298,top,85,h,s.hollow);
  if(suspended)p.push(`<path d="M 340 ${top} V 63 M 307 61 H 373" stroke="#6484a3" stroke-width="3"/>`);
  text(s.label||'Тело',222,347);
  const arch=s.archLabel||'F_А';
  if(['submerged','partial'].includes(s.kind)){
   arrow(340,cy,340,cy-101,arch,359,cy-94,'#426c4c');text('Показана сила Архимеда',202,380);
  }else{
   const archLength=suspended?100*(s.ratio||0.4):bottom?45:92;
   arrow(320,cy,320,cy-archLength,arch,263,cy-archLength+5,'#426c4c');
   arrow(355,cy,355,cy+92,'mg',372,cy+88,'#b05613');
   if(suspended)arrow(340,top,340,top-100*(1-(s.ratio||0.4)),s.support||'T',357,top-100*(1-(s.ratio||0.4))+9,'#285fa0');
   if(bottom)arrow(340,274,340,219,'N',356,222,'#285fa0');
  }
  arrow(111,259,111,149,'Oy',72,151,'#17324d');
 }
 return {svg:`<g transform="translate(0 ${y})">${p.join('')}</g>`,height};
};
