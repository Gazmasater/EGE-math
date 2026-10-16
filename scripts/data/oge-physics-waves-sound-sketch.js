module.exports=(r,y,escape)=>{
 const p=[];
 const text=(s,x,dy,size=19)=>p.push(`<text x="${x}" y="${y+dy}" font-size="${size}" fill="#17324d">${escape(s)}</text>`);
 const arrow=(x1,dy1,x2,dy2,color='#285fa0')=>p.push(`<path d="M ${x1} ${y+dy1} L ${x2} ${y+dy2}" stroke="${color}" stroke-width="3" fill="none" marker-end="url(#arrow-${r.id})"/>`);
 const circle=(x,dy,radius=16)=>p.push(`<circle cx="${x}" cy="${y+dy}" r="${radius}" fill="#dceaff" stroke="#6484a3" stroke-width="2"/>`);
 const kind=r.sketch.kind;
 if(kind==='interface'){
  p.push(`<rect x="45" y="${y+126}" width="590" height="150" fill="#d8eef8"/><path d="M 45 ${y+126} H 635" stroke="#6484a3" stroke-width="2"/>`);
  text('Пояснительная схема неподвижной границы',54,24,18);
  text('Воздух',520,88);text('Вода',545,255);text('Граница',521,117,17);
  circle(180,225);text('Динамик',57,257);
  arrow(199,209,300,126);arrow(300,126,326,35);arrow(300,126,420,225,'#b05613');
  text('Падающая волна',53,167,17);text('Прошедшая',365,60,17);text('Отражённая',434,229,17);
  return {svg:p.join(''),height:303};
 }
 if(kind==='echo'){
  circle(110,140,22);text('Источник',49,92);text('и приёмник',39,116);
  p.push(`<rect x="543" y="${y+74}" width="22" height="160" fill="#b3c4d5" stroke="#6484a3"/>`);
  text('Препятствие',470,48);arrow(145,136,528,136);arrow(528,200,145,200,'#b05613');
  text('К цели',280,119);text('Обратно',276,227);text('Время эха включает оба пути',145,282);
  return {svg:p.join(''),height:310};
 }
 if(kind==='vacuum'){
  circle(107,120,32);circle(548,120,34);text('Источник',49,65);text('Земля',514,65);
  text('Вакуумный промежуток',238,88,18);arrow(151,120,252,120);
  p.push(`<path d="M 285 ${y+97} L 326 ${y+142} M 326 ${y+97} L 285 ${y+142}" stroke="#b05613" stroke-width="3"/>`);
  text('Нет непрерывной упругой среды',153,194);text('Это схема передачи звука',189,239,17);
  return {svg:p.join(''),height:266};
 }
 if(kind==='steppe'){
  p.push(`<path d="M 50 ${y+194} H 625" stroke="#839b76" stroke-width="4"/>`);
  circle(120,140);arrow(153,139,560,139);text('Источник',70,92);
  text('Открытое пространство',298,111);text('Нет отражателя, возвращающего сигнал',76,245);
  return {svg:p.join(''),height:272};
 }
 if(kind==='thunder'){
  text('Молния',67,47);text('Наблюдатель',458,47);circle(111,164);circle(541,164);
  arrow(152,108,503,108);text('Свет приходит почти сразу',170,88,18);
  arrow(152,182,503,182,'#b05613');text('Звук приходит позже',194,218,18);
  text('Оба сигнала идут от молнии к наблюдателю',63,274,18);
  return {svg:p.join(''),height:301};
 }
 throw new Error('Unknown wave sketch: '+kind);
};
