module.exports = (r, y, escape) => {
  const p = [], marker = `url(#arrow-${r.id})`;
  const text = (value, x, yy, size = 18) => p.push(`<text x="${x}" y="${yy}" font-size="${size}" fill="#17324d">${escape(value)}</text>`);
  const line = (x1, y1, x2, y2, color = '#285fa0', arrow = false) => p.push(`<path d="M ${x1} ${y1} L ${x2} ${y2}" fill="none" stroke="${color}" stroke-width="2.5"${arrow ? ` marker-end="${marker}"` : ''}/>`);
  const lens = x => p.push(`<path d="M ${x} 65 V 285 M ${x-9} 80 L ${x} 65 L ${x+9} 80 M ${x-9} 270 L ${x} 285 L ${x+9} 270" fill="none" stroke="#6484a3" stroke-width="3"/>`);
  const axisY = 185;
  if (r.sketch.type === 'lens-focus-experiment') {
    const x = 315, screen = 535;
    lens(x); line(45, axisY, 625, axisY, '#9ab1ca');
    line(screen, 85, screen, 270, '#8392a5');
    for (const yy of [112, 150]) {
      line(65, yy, x, yy); line(150, yy, 220, yy, '#285fa0', true);
      line(x, yy, screen, axisY);
      line(x + 65, yy + (axisY - yy) * 65 / (screen - x), x + 140, yy + (axisY - yy) * 140 / (screen - x), '#285fa0', true);
    }
    text('От удалённого окна', 46, 39); text('Линза', 287, 39); text('Экран', 512, 39);
    text('F', 544, 208); text('O', 291, 208);
    p.push('<path d="M 315 314 H 535 M 315 307 V 321 M 535 307 V 321" stroke="#8392a5"/>');
    text('L ≈ F', 397, 344);
  } else {
    const {d, F} = r.sketch, b = F * d / (d - F), scale = 455 / (d + b);
    const left = 100, x = left + d * scale, screen = left + (d + b) * scale;
    const h = 72 / Math.max(1, b / d), imageY = axisY + h * b / d;
    lens(x); line(44, axisY, 632, axisY, '#9ab1ca'); line(screen, 85, screen, 285, '#8392a5');
    line(left, axisY, left, axisY - h, '#b05613', true);
    line(screen, axisY, screen, imageY, '#b05613', true);
    line(left, axisY - h, x, axisY - h); line(x, axisY - h, screen, imageY);
    line(left, axisY - h, screen, imageY);
    line(left + (x - left) * .2, axisY - h, left + (x - left) * .65, axisY - h, '#285fa0', true);
    for (const fx of [x - F * scale, x + F * scale]) { p.push(`<circle cx="${fx}" cy="${axisY}" r="3" fill="#17324d"/>`); text('F', fx - 7, axisY + 28); }
    text('O', x - 10, axisY + 28);
    text('Предмет', 55, 70); text('Линза', x - 30, 47); text('Экран', screen - 28, 70);
    text(`Пример при F ≈ ${F} см`, 217, 20);
    p.push(`<path d="M ${left} 320 H ${screen} M ${left} 312 V 328 M ${x} 312 V 328 M ${screen} 312 V 328" stroke="#8392a5"/>`);
    text(`d = ${d} см`, (left + x) / 2 - 34, 352); text('b', (x + screen) / 2, 352);
  }
  return {height: 387, svg: `<g transform="translate(0 ${y})">${p.join('')}</g>`};
};
