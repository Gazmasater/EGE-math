const {DatabaseSync}=require('node:sqlite');
const db=new DatabaseSync('storage/solutions.sqlite');
const row=db.prepare('select diagram_svg from solutions where task_id=?').get('7018C7');
if(!row) throw new Error('7018C7 not found');
let svg=row.diagram_svg;
svg=svg.replace(/font-size="23"/g,'font-size="32"').replace(/font-size="21"/g,'font-size="30"').replace(/font-size="20" font-weight="700"/g,'font-size="30" font-weight="700"');
// Move the lower reaction labels away from the source image edge.
svg=svg.replace('x="158" y="386"','x="165" y="382"').replace('x="183" y="438"','x="185" y="430"');
db.prepare('update solutions set diagram_svg=?,updated_at=? where task_id=?').run(svg,new Date().toISOString(),'7018C7');
console.log('7018C7 vector labels enlarged and repositioned');
