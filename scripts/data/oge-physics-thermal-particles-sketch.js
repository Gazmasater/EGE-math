module.exports=(r,y,escape)=>{
 const s=r.sketch,p=[],marker=`url(#arrow-${r.id})`;
 const text=(value,x,z,size=18)=>p.push(`<text x="${x}" y="${z}" fill="#17324d" font-size="${size}">${escape(value)}</text>`);
 const dot=(x,z,color,radius=9)=>p.push(`<circle cx="${x}" cy="${z}" r="${radius}" fill="${color}"/>`);
 const box=(x,z,w,h)=>p.push(`<rect x="${x}" y="${z}" width="${w}" height="${h}" rx="8" fill="#f7fafc" stroke="#6484a3" stroke-width="2"/>`);
 text('Пояснительная модель: размеры условные',28,24);
 if(s.kind==='diffusion'){
  for(const x of [45,375])box(x,64,255,210);
  text('Сначала',121,53);text('Позднее',453,53);
  const points=[[83,100],[123,132],[82,178],[126,220],[173,112],[210,149],[260,111],[255,210],[205,238],[165,192],[268,168],[115,254]];
  points.forEach(([x,z],i)=>dot(x,z,i<4||i===11?'#285fa0':'#b05613'));
  points.forEach(([x,z],i)=>dot(x+330,z,[1,3,6,8,10].includes(i)?'#285fa0':'#b05613'));
  p.push(`<path d="M 308 168 H 362" stroke="#6484a3" stroke-width="3" marker-end="${marker}"/>`);
  text('Частицы двух веществ перемешиваются',143,313);
  text('Перенос связан с их тепловым движением',130,345);
 }else if(s.kind==='brownian'){
  box(55,55,570,229);
  for(const [x,z] of [[89,90],[156,256],[206,89],[268,230],[387,83],[461,205],[578,125],[579,249],[103,183],[495,77]])dot(x,z,'#8392a5',5);
  p.push('<path d="M 131 133 L 202 177 L 174 217 L 294 168 L 252 118 L 362 139 L 345 217 L 422 174" fill="none" stroke="#285fa0" stroke-width="3" stroke-dasharray="6 4"/>');
  dot(422,174,'#b05613',18);
  text('Мелкие точки: молекулы среды',147,320);
  text('Крупная точка: взвешенная частица',129,349);
  text('Ломаная показывает её случайную траекторию',79,378);
  return {svg:`<g transform="translate(0 ${y})">${p.join('')}</g>`,height:408};
 }else if(s.kind==='thermal'){
  const scales=s.heating?[40,56]:[56,40];
  scales.forEach((d,k)=>{
   const cx=k?490:170;
   text(k?'После':'До',cx-23,57);box(cx-d-25,91,2*d+50,2*d+50);
   for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)dot(cx+i*d,116+d+j*d,'#285fa0',9);
   text('9 условных частиц',cx-75,286);
  });
  p.push(`<path d="M 293 167 H 368" stroke="#6484a3" stroke-width="3" marker-end="${marker}"/>`);
  text(s.heating?'Температура растёт: тепловое движение усиливается':'Температура падает: тепловое движение ослабевает',49,327,18);
  text('Размер частиц прежний; меняются расстояния',103,359);
  return {svg:`<g transform="translate(0 ${y})">${p.join('')}</g>`,height:390};
 }
 return {svg:`<g transform="translate(0 ${y})">${p.join('')}</g>`,height:370};
};
