// A direct measurement circuit for the equipment list without a rheostat.
module.exports=(r,y,escape)=>{
 const lamp=r.sketch.element==='лампа';
 const text=(s,x,z)=>`<text x="${x}" y="${z}" font-size="19" fill="#17324d">${escape(s)}</text>`;
 const element=lamp?'<circle cx="490" cy="285" r="24" fill="#fff8d8"/><path d="M 474 269 L 506 301 M 474 301 L 506 269"/>':'<rect x="466" y="269" width="48" height="32" fill="#e6f0ff"/>';
 return {height:460,svg:`<g transform="translate(0 ${y})">
 ${text('Измерение тока и напряжения',32,28)}
 <g stroke="#6484a3" stroke-width="2.5" fill="none">
 <path d="M 230 100 H 100 V 285 H 160 M 204 285 H 300 M 344 285 H 466 M 514 285 H 580 V 100 H 250"/>
 <path d="M 230 68 V 132 M 250 82 V 118 M 160 285 L 195 264"/>
 <circle cx="160" cy="285" r="3"/><circle cx="204" cy="285" r="3"/>
 <circle cx="322" cy="285" r="22" fill="white"/>${element}
 <path d="M 444 285 V 385 H 468 M 512 385 H 538 V 285"/>
 <circle cx="444" cy="285" r="3" fill="#6484a3"/><circle cx="538" cy="285" r="3" fill="#6484a3"/>
 <circle cx="490" cy="385" r="22" fill="white"/>
 <path d="M 100 160 V 235" stroke="#285fa0" marker-end="url(#arrow-${r.id})"/>
 </g>
 ${text('+',215,60)}${text('−',249,60)}${text('Источник',288,80)}
 ${text('I',67,203)}${text('Ключ',156,330)}${text('A',315,292)}${text('+',290,247)}
 ${text(r.sketch.element,460,247)}${text('V',483,392)}${text('+',455,354)}
 ${text('Амперметр последовательно, вольтметр параллельно',42,440)}
 </g>`};
};
