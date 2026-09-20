const {DatabaseSync}=require('node:sqlite');
const db=new DatabaseSync('storage/solutions.sqlite');
const row=db.prepare('select diagram_svg from solutions where task_id=?').get('DEAB32');
if(!row) throw new Error('DEAB32 not found');
let svg=row.diagram_svg;
const extra='<line x1="130" y1="175" x2="380" y2="175" stroke="#183153" stroke-width="2"/><line x1="130" y1="168" x2="130" y2="182" stroke="#183153" stroke-width="2"/><line x1="380" y1="168" x2="380" y2="182" stroke="#183153" stroke-width="2"/><text x="250" y="170" text-anchor="middle" fill="#183153">L</text><line x1="130" y1="205" x2="250" y2="205" stroke="#183153" stroke-width="2"/><line x1="130" y1="198" x2="130" y2="212" stroke="#183153" stroke-width="2"/><line x1="250" y1="198" x2="250" y2="212" stroke="#183153" stroke-width="2"/><text x="190" y="200" text-anchor="middle" fill="#183153">L/2</text><line x1="130" y1="235" x2="335" y2="235" stroke="#183153" stroke-width="2"/><line x1="130" y1="228" x2="130" y2="242" stroke="#183153" stroke-width="2"/><line x1="335" y1="228" x2="335" y2="242" stroke="#183153" stroke-width="2"/><text x="232" y="230" text-anchor="middle" fill="#183153">L−d</text>';
svg=svg.replace('</svg>',extra+'</svg>');
db.prepare('update solutions set diagram_svg=?,updated_at=? where task_id=?').run(svg,new Date().toISOString(),'DEAB32');
console.log('DEAB32 lever arms added');
