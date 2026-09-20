const {DatabaseSync}=require('node:sqlite');
const db=new DatabaseSync('storage/solutions.sqlite');
const row=db.prepare('select solution from solutions where task_id=?').get('7018C7');
if(!row) throw new Error('7018C7 not found');
const old='Из геометрии прямоугольного треугольника AB:\nH=√(l²−(2R)²).';
const replacement='Обозначим через C основание перпендикуляра из B на уровень дна. Тогда ABC — прямоугольный треугольник с гипотенузой AB=l, катетом AC=2R и катетом BC=H. Поэтому по теореме Пифагора:\nH=√(l²−(2R)²).';
if(!row.solution.includes(old)) throw new Error('fragment not found');
db.prepare('update solutions set solution=?,updated_at=? where task_id=?').run(row.solution.replace(old,replacement),new Date().toISOString(),'7018C7');
console.log('7018C7 triangle C specified');
