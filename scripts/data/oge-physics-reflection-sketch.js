module.exports = (r, y, escape) => {
  const parts = [], marker = `url(#arrow-${r.id})`;
  const text = (s, x, yy, size = 19) => parts.push(`<text x="${x}" y="${yy}" font-size="${size}" fill="#17324d">${escape(s)}</text>`);
  const line = (x1, y1, x2, y2, extra = '') => parts.push(`<path d="M ${x1} ${y1} L ${x2} ${y2}" fill="none" stroke="#285fa0" stroke-width="3" ${extra}/>`);
  if (r.sketch.type === 'reflection-rays') {
    const a = r.sketch.angle * Math.PI / 180, x = 340, yy = 248;
    const dx = 250 * Math.sin(a), dy = 250 * Math.cos(a);
    parts.push('<path d="M 48 248 H 632" stroke="#6484a3" stroke-width="5"/><path d="M 340 56 V 248" stroke="#8392a5" stroke-width="2" stroke-dasharray="6 5"/>');
    for (let xx = 55; xx < 632; xx += 20) line(xx, 253, xx - 9, 266);
    line(x - dx, yy - dy, x, yy);
    line(x - dx * .7, yy - dy * .7, x - dx * .45, yy - dy * .45, `marker-end="${marker}"`);
    line(x, yy, x + dx, yy - dy, `marker-end="${marker}"`);
    for (const side of [-1, 1]) {
      const endX = x + side * 70 * Math.sin(a), endY = yy - 70 * Math.cos(a);
      parts.push(`<path d="M ${x} ${yy - 70} A 70 70 0 0 ${side > 0 ? 1 : 0} ${endX} ${endY}" fill="none" stroke="#b05613" stroke-width="2"/>`);
    }
    text('Нормаль', 356, 72); text('Падающий луч', 50, 39); text('Отражённый луч', 428, 39);
    text('α', 305, 163); text('β', 365, 163); text('O', 346, 288);
    text(`α = β = ${r.sketch.angle}°`, 263, 332);
    return {height: 365, svg: `<g transform="translate(0 ${y})">${parts.join('')}</g>`};
  }
  parts.push('<path d="M 340 65 V 260" stroke="#6484a3" stroke-width="5"/>');
  line(180, 226, 180, 115, `marker-end="${marker}"`);
  line(500, 226, 500, 115, `stroke-dasharray="7 5" marker-end="${marker}"`);
  parts.push('<path d="M 180 226 H 500 M 180 115 H 500" stroke="#9ab1ca" stroke-width="1.5" stroke-dasharray="4 5"/><path d="M 180 275 H 500 M 180 267 V 283 M 340 267 V 283 M 500 267 V 283" stroke="#8392a5" fill="none"/>');
  text('Предмет', 136, 82); text('Изображение', 434, 82); text('Зеркало', 303, 45);
  text('d', 253, 306); text('d', 415, 306); text('L = 2d', 305, 345);
  return {height: 378, svg: `<g transform="translate(0 ${y})">${parts.join('')}</g>`};
};
