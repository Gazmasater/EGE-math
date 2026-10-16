// Own experimental circuit; the primary task supplies an equipment list, no figure.
module.exports = (r, y, escape) => {
  const element = r.sketch.element;
  const text = (s,x,dy,size=19) => `<text x="${x}" y="${dy}" font-size="${size}" fill="#17324d">${escape(s)}</text>`;
  const measured = element === 'лампа'
    ? '<path d="M 453 300 H 467 M 513 300 H 527"/><circle cx="490" cy="300" r="23" fill="#fff8d8"/><path d="M 474 284 L 506 316 M 474 316 L 506 284"/>'
    : '<rect x="453" y="283" width="74" height="34" fill="#e6f0ff"/>';
  const svg = `<g transform="translate(0 ${y})">
    ${text('Схема экспериментальной установки',28,28)}
    <g stroke="#6484a3" stroke-width="2.5" fill="none">
      <path d="M 230 100 H 100 V 300 H 145 M 190 300 H 240 M 330 300 H 369 M 411 300 H 453 M 527 300 H 580 V 100 H 250"/>
      <path d="M 230 69 V 131 M 250 84 V 116 M 145 300 L 181 280"/>
      <circle cx="145" cy="300" r="3" fill="#6484a3"/><circle cx="190" cy="300" r="3" fill="#6484a3"/>
      <rect x="240" y="285" width="90" height="30" fill="#e6f0ff"/>
      <path d="M 342 260 L 295 308" marker-end="url(#arrow-${r.id})"/>
      <circle cx="390" cy="300" r="21" fill="#fff"/>
      ${measured}
      <path d="M 440 300 V 405 H 469 M 511 405 H 540 V 300"/>
      <circle cx="490" cy="405" r="21" fill="#fff"/>
      <circle cx="440" cy="300" r="3" fill="#6484a3"/><circle cx="540" cy="300" r="3" fill="#6484a3"/>
      <path d="M 100 174 V 245" stroke="#285fa0" marker-end="url(#arrow-${r.id})"/>
    </g>
    ${text('+',214,60)}${text('−',250,60)}${text('Источник',286,76)}
    ${text('I',70,220)}${text('Ключ',137,342)}${text('Реостат',245,342)}
    ${text('A',383,307)}${text('+',359,269)}${text(element,467,262)}
    ${text('V',483,412)}${text('+',454,380)}
    ${text('V измеряет напряжение только на исследуемом элементе',40,464,18)}
  </g>`;
  return {svg,height:490};
};
