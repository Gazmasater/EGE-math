module.exports=(r,y,escape)=>{
 const parts=[],s=r.sketch;
 const text=(v,x,z,size=18)=>parts.push(`<text x="${x}" y="${z}" fill="#17324d" font-size="${size}">${escape(v).replace(/_([A-Za-zА-Яа-яЁё]+)/g,'<tspan font-size="12" baseline-shift="sub">$1</tspan>')}</text>`);
 const wrap=(v,max=53)=>{const lines=[''];for(const w of v.split(' ')){if((lines.at(-1)+' '+w).length>max)lines.push(w);else lines[lines.length-1]+=(lines.at(-1)?' ':'')+w;}return lines;};
 for(let i=0;i<s.cards.length;i++){
  const d=s.cards[i],top=20+i*220;
  parts.push(`<rect x="28" y="${top}" width="624" height="195" rx="8" fill="#e6f0ff" stroke="#6484a3"/>`);
  text((i?'Б. ':'А. ')+d.name,45,top+32,20);
  parts.push(`<path d="M 62 ${top+51} V ${top+98}" stroke="#285fa0" stroke-width="3" marker-end="url(#arrow-${r.id})"/>`);
  text(d.principle,84,top+83,19);
  for(const [j,line] of wrap(d.law).entries())text(line,45,top+135+j*29,18);
 }
 return {svg:`<g transform="translate(0 ${y})">${parts.join('')}</g>`,height:475};
};
