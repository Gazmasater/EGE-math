module.exports=function(r,y,escape){
 const p=[],s=r.sketch,marker=`url(#arrow-${r.id})`;
 const text=(v,x,py,size=19)=>p.push(`<text x="${x}" y="${py}" font-size="${size}" fill="#17324d">${escape(v).replace(/_([А-Яа-яA-Za-z]+)/g,'<tspan font-size="13" baseline-shift="sub">$1</tspan>')}</text>`);
 const line=(x1,y1,x2,y2,color='#6484a3',arrow=false)=>p.push(`<path d="M ${x1} ${y1} L ${x2} ${y2}" stroke="${color}" stroke-width="${arrow?3:2}" fill="none"${arrow?` marker-end="${marker}"`:''}/>`);
 if(s.kind==='half'){
  text('Пояснительная схема одного перехода',110,25);
  const ox=330,oy=65,L=165,ang=.6;
  for(const a of [-ang,0,ang]){
   const x=ox+L*Math.sin(a),cy=oy+L*Math.cos(a);
   line(ox,oy,x,cy);p.push(`<circle cx="${x}" cy="${cy}" r="11" fill="#dceaff" stroke="#6484a3"/>`);
  }
  const bx=ox+L*Math.sin(ang),by=oy+L*Math.cos(ang);
  line(bx,by,bx,by+88,'#b05613',true);text('mg',bx+16,by+79);
  line(bx,by,bx-40,by-58,'#426c4c',true);text('F_н',bx-6,by-50);
  text('Левое',176,262);text('Равновесие',276,262);text('Правое',468,232);
  line(415,316,235,316,'#285fa0',true);text('Δt = '+s.duration+' с',260,348);
  text('Назад требуется такое же время: T = 2Δt',112,391);
  return {svg:`<g transform="translate(0 ${y})">${p.join('')}</g>`,height:420};
 }
 text('Пояснительная последовательность положений',62,25);
 const points=[[125,140,'Нижнее'],[330,140,'Равновесие'],[535,140,'Верхнее']];
 for(const [x,cy,label] of points){p.push(`<circle cx="${x}" cy="${cy}" r="12" fill="#dceaff" stroke="#6484a3"/>`);text(label,x-50,cy-30);}
 line(150,140,298,140,'#285fa0',true);line(355,140,503,140,'#8392a5',true);
 text('Δt = '+s.duration+' с',170,191);text('ещё Δt',392,191);
 text('Два таких участка до верхнего положения.',101,257);
 text('Ещё два участка — обратно: полный цикл T = 4Δt.',58,293);
 return {svg:`<g transform="translate(0 ${y})">${p.join('')}</g>`,height:320};
};
