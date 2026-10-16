// Explanatory force diagram; these primary tasks contain no mechanical figure.
module.exports = (r, y, escape) => {
 const text=(s,x,dy,size=20)=>`<text x="${x}" y="${dy}" font-size="${size}" fill="#17324d">${escape(s).replace(/_([А-Яа-я]+)/g,'<tspan font-size="13" baseline-shift="sub">$1</tspan>')}</text>`;
 const arrow=(x1,y1,x2,y2,label,tx,ty,color='#285fa0')=>`<path d="M ${x1} ${y1} L ${x2} ${y2}" fill="none" stroke="${color}" stroke-width="3" marker-end="url(#arrow-${r.id})"/>${text(label,tx,ty)}`;
 return {height:445,svg:`<g transform="translate(0 ${y})">
 ${text('Пояснительная модель движения по горизонтальному пути',25,28,19)}
 <path d="M 90 320 H 600" stroke="#6484a3" stroke-width="3"/>
 <rect x="245" y="193" width="180" height="92" rx="5" fill="#e6f0ff" stroke="#6484a3" stroke-width="2"/>
 <circle cx="276" cy="302" r="17" fill="#fff" stroke="#6484a3" stroke-width="2"/>
 <circle cx="392" cy="302" r="17" fill="#fff" stroke="#6484a3" stroke-width="2"/>
 ${text('Поезд',255,225)}
 ${arrow(335,251,554,251,'F_тяги',476,233)}
 ${arrow(335,251,126,251,'F_сопр',133,230,'#b05613')}
 ${arrow(335,251,335,116,'N',352,130,'#426c4c')}
 ${arrow(335,251,335,389,'mg',355,387,'#b05613')}
 ${arrow(488,122,590,122,'v',539,105)}
 ${arrow(102,164,174,164,'Ox',158,188,'#17324d')}
 ${arrow(102,164,102,85,'Oy',69,82,'#17324d')}
 ${text('F_тяги − F_сопр = maₓ;  N − mg = 0',112,428)}
 </g>`};
};
