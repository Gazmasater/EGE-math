// Supplementary force models where the primary condition has no drawing of the body.
module.exports=function(r,y,escape){
 const s=r.sketch,p=[],marker=`url(#arrow-${r.id})`;
 const text=(v,x,yy,size=19)=>p.push(`<text x="${x}" y="${yy}" font-size="${size}" fill="#17324d">${escape(v).replace(/_([A-Za-zА-Яа-яЁё]+)/g,'<tspan font-size="13" baseline-shift="sub">$1</tspan>')}</text>`);
 const arrow=(x,yy,xx,yyy,name,tx,ty,color='#426c4c')=>{p.push(`<path d="M ${x} ${yy} L ${xx} ${yyy}" fill="none" stroke="${color}" stroke-width="3" marker-end="${marker}"/>`);text(name,tx,ty);};
 const rect=(x,yy,w,h,fill='#d6edf6')=>p.push(`<rect x="${x}" y="${yy}" width="${w}" height="${h}" fill="${fill}" stroke="#6484a3" stroke-width="2"/>`);
 text(s.caption||'Пояснительная схема сил',28,25);let height=370;
 if(s.kind==='body'){
  const floating=s.support==='float',bottom=s.support==='N',air=s.air;
  if(!air){rect(173,floating?158:55,337,floating?149:252);text('Вода',410,291);}
  if(bottom)p.push('<path d="M 205 214 H 485" stroke="#6484a3" stroke-width="3"/>');
  if(s.shape==='disk')p.push('<ellipse cx="325" cy="170" rx="61" ry="11" fill="#dadfe8" stroke="#6484a3" stroke-width="2"/>');
  else if(s.shape==='block')rect(282,127,86,86,'#dadfe8');
  else p.push('<circle cx="325" cy="170" r="43" fill="#dadfe8" stroke="#6484a3" stroke-width="2"/>');
  const buoyancy=floating?100:s.support==='push'?130:air?25:45;
  arrow(320,170,320,170-buoyancy,'F_А',257,183-buoyancy);
  arrow(332,170,332,270,'mg',347,269,'#b05613');
  if(s.support==='T'){const top=s.shape==='disk'?159:127;p.push(`<path d="M 348 ${top} V 42" stroke="#8392a5"/>`);arrow(347,top,347,top-55,'T',363,top-41,'#285fa0');}
  if(bottom)arrow(350,210,350,air?135:155,'N',369,air?145:163,'#285fa0');
  if(s.support==='push')arrow(370,127,370,157,'F',389,159,'#285fa0');
  arrow(94,236,94,83,'Oy',47,95,'#17324d');
  text(s.support==='float'?'F_А = mg':s.support==='push'?'F_А = mg + F':`${s.support} + F_А = mg`,210,341);
 }else if(s.kind==='contact'){
  for(const [x,width,label] of [[145,26,'Малая площадь'],[447,114,'Большая площадь']]){
   rect(x-width/2,167,width,18,'#f1d8b5');p.push(`<path d="M ${x-82} 186 H ${x+82}" stroke="#8392a5" stroke-width="3"/>`);
   arrow(x,65,x,164,'F',x+17,95,'#b05613');text(label,x-80,228);
  }
  text('Та же сила F; p = F · S⁻¹',189,285);text('S₂ > S₁ → p₂ < p₁',225,325);height=355;
 }else if(s.kind==='plug'){
  p.push('<path d="M 262 158 V 214 Q 220 234 223 285 H 440 Q 443 234 398 214 V 158" fill="#e6f0ff" stroke="#6484a3" stroke-width="2"/>');rect(260,124,140,35,'#f1d8b5');
  arrow(289,143,289,48,'p_внутр · S',152,65);arrow(368,143,368,228,'p_снаружи · S',393,213,'#b05613');arrow(326,143,326,229,'mg',329,253,'#b05613');arrow(273,145,273,206,'F_тр',198,201,'#285fa0');
  arrow(91,239,91,95,'Oy',46,103,'#17324d');text('При откачке наружное давление падает',118,323);height=357;
 }else if(s.kind==='column'){
  rect(238,80,188,200);arrow(282,83,282,156,'p_верх · S',109,112,'#b05613');arrow(378,278,378,176,'p_низ · S',400,229);arrow(331,174,331,315,'mg',343,309,'#b05613');
  arrow(78,267,78,126,'Oy',34,132,'#17324d');text('p_низ − p_верх = ρgh',184,347);height=380;
 }else if(s.kind==='balls'){
  for(const cx of [210,475]){
   p.push(`<path d="M ${cx} 62 V 158" stroke="#8392a5"/><circle cx="${cx}" cy="190" r="34" fill="#e6f0ff" stroke="#6484a3" stroke-width="2"/>`);
   arrow(cx,156,cx,78,'T',cx+16,95,'#285fa0');arrow(cx,190,cx,295,'mg',cx+16,286,'#b05613');
   const sign=cx<300?1:-1;arrow(cx+34*sign,190,cx+102*sign,190,'F_возд',cx<300?238:350,169);
  }
  arrow(337,73,337,267,'Поток',347,73,'#285fa0');text('Начало сближения: нити ещё вертикальны',109,339);height=370;
 }else if(s.kind==='train'){
  rect(466,75,130,220);text('Поезд',495,113);p.push('<circle cx="279" cy="130" r="22" fill="#e6f0ff"/><path d="M 279 153 V 232 L 246 285 M 279 232 L 313 285 M 251 180 H 314 M 125 286 H 448" stroke="#6484a3" stroke-width="5" fill="none"/>');
  arrow(281,180,401,180,'F_возд',347,162);arrow(276,180,276,287,'mg',291,267,'#b05613');arrow(252,281,252,217,'N',224,228,'#285fa0');arrow(272,282,186,282,'F_тр',179,261,'#b05613');
  arrow(86,268,86,100,'Oy',41,113,'#17324d');arrow(142,325,332,325,'Ox',343,332,'#17324d');height=365;
 }
 return {svg:`<g transform="translate(0 ${y})">${p.join('')}</g>`,height};
};
