module.exports=(r,y,escape)=>{
 const txt=(s,x,z,size=19)=>`<text x="${x}" y="${z}" font-size="${size}" fill="#17324d">${escape(s)}</text>`;
 const parts=[txt('Отдельные схемы в разных масштабах',88,24)];
 for(const [x,height,shadow,title]of [[100,'H = ?','L = 60 м','Кран'],[400,'h = 2 м','l = 3 м','Ёлка']]) {
  parts.push(txt(title,x+56,63),`<path d="M ${x-12} 228 H ${x+196} M ${x} 108 V 228" fill="none" stroke="#6484a3" stroke-width="3"/>`,
   `<path d="M ${x} 108 L ${x+180} 228" stroke="#bd681f" stroke-width="3" fill="none"/><path d="M ${x+64} 151 L ${x+111} 182" stroke="#bd681f" stroke-width="3" fill="none" marker-end="url(#arrow-${r.id})"/>`,
   `<path d="M ${x} 211 H ${x+17} V 228" stroke="#6484a3" fill="none"/>`,txt(height,x-77,179),txt(shadow,x+44,264));
 }
 parts.push(txt('Одинаковый угол падения солнечных лучей',67,311));
 return {height:342,svg:`<g transform="translate(0 ${y})">${parts.join('')}</g>`};
};
