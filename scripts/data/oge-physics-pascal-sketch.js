module.exports=function(r,y,escape){
 const p=[],mark=`url(#arrow-${r.id})`;
 const text=(s,x,dy,size=18,color='#17324d')=>p.push(`<text x="${x}" y="${dy}" font-size="${size}" fill="${color}">${escape(s)}</text>`);
 const arrow=(x1,y1,x2,y2,color='#285fa0')=>p.push(`<path d="M ${x1} ${y1} L ${x2} ${y2}" fill="none" stroke="${color}" stroke-width="3" marker-end="${mark}"/>`);
 text('Пояснительная схема по тексту условия',28,25);
 if(r.sketch.kind==='sound'){
  p.push('<rect x="365" y="65" width="24" height="235" fill="#d1edf5" stroke="#6484a3" stroke-width="2"/>');
  text('Улица',104,66);text('Стекло',341,48);text('Комната',470,66);
  arrow(70,118,356,118);text('Падающий звук',112,103);
  arrow(356,180,70,180,'#b05613');text('Отражённый звук',115,211);
  arrow(399,255,600,255,'#426c4c');text('Прошедший звук',412,286);
  arrow(73,333,265,333,'#17324d');text('Ox',279,340);
 }else{
  p.push('<ellipse cx="340" cy="189" rx="104" ry="119" fill="#fff1c9" stroke="#9e8151" stroke-width="4"/>');
  text('Жидкость',296,195);text('Скорлупа',491,108);
  p.push('<path d="M 480 115 L 421 120" stroke="#8392a5" stroke-width="2"/>');
  arrow(55,145,232,145);text('Пуля',80,126);text('Ox',160,170);
  for(const [x1,y1,x2,y2] of [[340,82,340,40],[340,296,340,342],[248,189,207,189],[432,189,478,189],[407,104,439,67],[407,273,442,311],[273,273,238,311]]) arrow(x1,y1,x2,y2,'#b05613');
  text('ΔF',488,195,21,'#b05613');
  text('Стрелки — дополнительные силы жидкости',109,382);
  text('на участки скорлупы при росте давления',125,409);
 }
 return {svg:`<g transform="translate(0 ${y})">${p.join('')}</g>`,height:r.sketch.kind==='sound'?371:440};
};
