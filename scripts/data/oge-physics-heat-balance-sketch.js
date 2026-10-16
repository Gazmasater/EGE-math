module.exports=(r,y,escape)=>{
 if(r.sketch.kind!=='shot')return require('./oge-physics-heat-capacity-sketch')(r,y,escape);
 const p=[],marker=`url(#arrow-${r.id})`;
 const text=(s,x,z,size=19)=>p.push(`<text x="${x}" y="${z}" font-size="${size}" fill="#17324d">${escape(s).replace(/_([A-Za-zА-Яа-яЁё]+)/g,'<tspan font-size="13" baseline-shift="sub">$1</tspan>')}</text>`);
 const arrow=(x,z,v,color)=>p.push(`<path d="M ${x} ${z} V ${v}" stroke="${color}" stroke-width="3" marker-end="${marker}"/>`);
 text('Пояснительная схема: любое из двух тел',65,28);
 text('До удара',163,76,22);text('При торможении',383,76,22);
 for(const x of [201,470])p.push(`<path d="M ${x-80} 300 H ${x+80}" stroke="#6c86a0" stroke-width="5"/>`);
 p.push('<circle cx="201" cy="151" r="18" fill="#bec9d3"/><circle cx="470" cy="282" r="18" fill="#bec9d3"/>');
 arrow(201,151,248,'#ad5515');text('mg',225,232);
 arrow(462,282,162,'#426c4c');text('N',482,178);
 arrow(478,282,356,'#ad5515');text('mg',500,349);
 arrow(63,116,260,'#17324d');text('Oy',43,289);
 text('ma_y = mg',135,344);text('ma_y = mg − N',397,397);
 text('Для каждого тела: mgh = cmΔt',170,450);
 text('При одинаковых m и h свинец нагреется сильнее',92,488,18);
 return {svg:`<g transform="translate(0 ${y})">${p.join('')}</g>`,height:520};
};
