const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync('storage/solutions.sqlite');const now=new Date().toISOString();
const fixes={
DEAB32:['F_л:F_пр','F_пр+F_л','F_пр=⟦3¦4⟧','F_прL','F_пр=','F_л'],
F5e61D:['ρ_воды'],
DB692A:['F_А','ρ_воды'],
'62CDEC':['F_А','ρ_ж','T_жидк','T_возд']
};
for(const[id,repls]of Object.entries(fixes)){let row=db.prepare('select solution from solutions where task_id=?').get(id);let s=row.solution;for(const r of repls){if(r.includes('_')){const plain=r.replace('_','');s=s.split(plain).join(r)}}db.prepare('update solutions set solution=?,updated_at=? where task_id=?').run(s,now,id)}console.log('Исправлены индексы:',Object.keys(fixes).join(', '));
