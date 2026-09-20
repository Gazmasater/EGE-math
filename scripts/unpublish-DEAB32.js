const {DatabaseSync}=require('node:sqlite');
const db=new DatabaseSync('storage/solutions.sqlite');
const result=db.prepare('delete from solutions where task_id=?').run('DEAB32');
console.log(`DEAB32 removed: ${result.changes}`);
