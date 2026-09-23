const {records} = require('./thermal-solutions');
const escape = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// В исходных условиях этого пакета нет рисунков. Схемы показывают стадии
// теплового процесса, а не пространственное расположение или векторы сил.
function diagram(id, record) {
  const colors = ['#eaf2ff', '#fff3df', '#e6f6ee'];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 680 450" role="img" aria-labelledby="title-${id}" data-thermal-diagram="${id}"><title id="title-${id}">${escape(record.diagramCaption)}</title><defs><marker id="arrow-${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#576d86"/></marker></defs><rect width="680" height="450" rx="18" fill="#f7f9fc"/><g font-family="Arial,sans-serif" fill="#20354e"><text x="32" y="35" font-size="18" font-weight="bold">${id} · Тепловой процесс</text>${record.stages.map((lines,i)=>{
    const y=55+i*130;
    return `<rect x="28" y="${y}" width="624" height="104" rx="12" fill="${colors[i]}" stroke="#c6d3e1"/><text x="48" y="${y+28}" font-size="20" font-weight="bold">${escape(lines[0])}</text><text x="48" y="${y+57}" font-size="18">${escape(lines[1])}</text><text x="48" y="${y+83}" font-size="18">${escape(lines[2])}</text>${i<2?`<path d="M340 ${y+109}v16" stroke="#576d86" stroke-width="2" marker-end="url(#arrow-${id})"/>`:''}`;
  }).join('')}<text x="32" y="441" font-size="13" fill="#566a80">Стрелки связывают этапы рассуждения, а не обозначают силы.</text></g></svg>`;
}
const diagrams = Object.fromEntries(Object.entries(records).map(([id,r])=>[id,diagram(id,r)]));
Object.assign(diagrams,require('./thermal-new-diagrams').diagrams);
module.exports = {diagrams};
