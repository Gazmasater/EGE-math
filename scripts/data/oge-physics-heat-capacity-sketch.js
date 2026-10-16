module.exports=(r,y,escape)=>{
 const s=r.sketch,p=[],marker=`url(#arrow-${r.id})`;
 const text=(v,x,z,size=18,color='#17324d')=>p.push(`<text x="${x}" y="${z}" font-size="${size}" fill="${color}">${escape(v).replace(/_([A-Za-zА-Яа-яЁё]+)/g,'<tspan font-size="13" baseline-shift="sub">$1</tspan>')}</text>`);
 const line=(x,z,u,v,color='#6c86a0',width=2)=>p.push(`<path d="M ${x} ${z} L ${u} ${v}" stroke="${color}" stroke-width="${width}" fill="none"/>`);
 const arrow=(x,z,u,v,color='#ad5515')=>p.push(`<path d="M ${x} ${z} L ${u} ${v}" stroke="${color}" stroke-width="3" marker-end="${marker}" fill="none"/>`);
 const rect=(x,z,w,h,fill='#e7f0f8')=>p.push(`<rect x="${x}" y="${z}" width="${w}" height="${h}" rx="7" fill="${fill}" stroke="#829bb2" stroke-width="2"/>`);
 text('Пояснительная схема по данным условия',28,24);
 let height=350;
 if(s.kind==='shot'){
  text('Падение дроби',115,72);text('Торможение при ударе',370,72);
  for(const x of [201,470]){line(x-62,100,x-62,298);line(x+62,100,x+62,298);line(x-62,298,x+62,298,'#6c86a0',5);}
  p.push('<circle cx="201" cy="151" r="16" fill="#bec9d3"/><circle cx="470" cy="280" r="16" fill="#bec9d3"/>');
  arrow(201,167,201,249);text('mg',220,230,20,'#ad5515');arrow(470,264,470,155,'#426c4c');text('N',492,177,20,'#426c4c');arrow(470,280,470,358);text('mg',491,349,20,'#ad5515');
  arrow(60,112,60,263,'#17324d');text('Oy',28,289);text('ma_y = mg',120,343);text('ma_y = mg − N',368,400);text('Механическая энергия → внутренняя',121,444);height=475;
 }else if(s.kind==='cooling'){
  const values=[72,62,55,50,46],pl=[72,65,60.5,56.7,53.3],X=t=>88+t*23,Y=t=>321-(t-40)*7;
  arrow(88,321,592,321,'#17324d');arrow(88,321,88,62,'#17324d');text('τ, мин',550,364);text('t, °C',28,63);
  for(const tau of [0,5,10,15,20]){line(X(tau),321,X(tau),328);text(String(tau),X(tau)-7,350,16);}
  for(const t of [40,50,60,70]){line(88,Y(t),553,Y(t),'#d1dce6',1);text(String(t),55,Y(t)+5,16);}
  for(const [a,color] of [[values,'#275f9b'],...(s.plastic?[[pl,'#bb681d']]:[])]){
   for(let j=0;j<4;j++)line(X(j*5),Y(a[j]),X((j+1)*5),Y(a[j+1]),color,3);
   for(let j=0;j<5;j++)p.push(`<circle cx="${X(j*5)}" cy="${Y(a[j])}" r="4" fill="${color}"/>`);
  }
  text('Алюминий: 72 → 46 °C',105,407,19,'#275f9b');
  if(s.plastic)text('Пластик: 72 → 53,3 °C',105,439,19,'#bb681d');
  text('Спад за равное время постепенно уменьшается',95,482,18);height=512;
 }else if(s.kind==='cylinders'){
  text('Нагрев воды одинаковой массы 100 г',105,69);
  const ds=[10,10,24,13];
  ds.forEach((v,j)=>{let z=104+j*66;text('Опыт '+(j+1),43,z+24);rect(154,z,v*15,36,j===2?'#f2d3a4':'#cbdff0');text(v+' °C',168+v*15,z+25);});
  text('Q_в = c_в · m_в · Δt_в',230,415);text('Опыты 1 и 2: одинаковая переданная энергия',83,456);height=488;
 }else{
  text('Данные и энергетический баланс',131,74,21);
  let z=103;
  for(const value of s.stages||[]){
   const words=value.split(' '),ls=[''];for(const w of words){if((ls.at(-1)+' '+w).length>46)ls.push(w);else ls[ls.length-1]+=(ls.at(-1)?' ':'')+w;}
   const h=36+ls.length*25;rect(55,z,570,h);ls.forEach((a,j)=>text(a,77,z+34+j*25,19));z+=h+18;
  }
  text('Проверяем закон сохранения энергии',119,z+24,19);height=z+57;
 }
 return {svg:`<g transform="translate(0 ${y})">${p.join('')}</g>`,height};
};
