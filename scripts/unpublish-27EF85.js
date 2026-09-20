const {DatabaseSync}=require('node:sqlite');
const db=new DatabaseSync('storage/solutions.sqlite');
const now=new Date().toISOString();
db.prepare("INSERT INTO solutions(task_id,answer,solution,diagram_svg,diagram_caption,published,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(task_id) DO UPDATE SET answer='',solution='',diagram_svg='',diagram_caption='',published=0,updated_at=?").run('27EF85','','','','',0,now,now,now);
console.log('27EF85 unpublished');
