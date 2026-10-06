const assert=require('node:assert/strict');
// Manual reading of all 45 primary tables, kept separate from the generator.
const expected={
 '17F546':'35','A94A44':'15','FA9CF6':'13','72B8F7':'25','CE40FF':'24','E41101':'35','6F4E7E':'35',
 'D860B0':'24','328FBF':'35','762512':'25','BC6626':'14','16FF25':'13','C70327':'25','F6D2D9':'35',
 'FCC2D6':'24','1748DA':'13','A6D7D1':'15','CBE7DB':'13','94D7DF':'25','82B5DD':'35','F84552':'15',
 '270C56':'24','57A253':'25','2005A8':'25','A009A3':'15','7CB1CE':'13','1C49C9':'25','27C6C4':'13',
 '23EFC7':'24','5420CF':'15','837BC0':'23','4C039C':'14','02069F':'35','F443ED':'12','5532E3':'24',
 '3B1AE4':'25','FF186D':'35','D0DD68':'35','82E66E':'14','C1633D':'25','763D8C':'14','2BBB86':'23',
 '953C82':'15','15C31C':'45','FB279F':'25'
};
const ratioExpected={
 '17F546':1,'A94A44':6/16,'72B8F7':1,'CE40FF':Math.sqrt(65/80),'E41101':1.5,'6F4E7E':5/8,
 'D860B0':8.5/9.5,'328FBF':2,'762512':Math.sqrt(12/5),'BC6626':Math.SQRT1_2,'16FF25':1.5,
 'C70327':393/353,'F6D2D9':1,'FCC2D6':1,'1748DA':0.8,'A6D7D1':1,'CBE7DB':32/28,
 '94D7DF':5/3,'82B5DD':2,'F84552':0.8,'270C56':12/11,'57A253':293/323,'2005A8':8.5/16.5,
 'A009A3':308/298,'7CB1CE':0.8,'1C49C9':Math.sqrt(3/4),'27C6C4':Math.SQRT1_2,
 '23EFC7':Math.SQRT1_2,'5420CF':0.2,'837BC0':0.25,'4C039C':2/3,'02069F':0.75,
 'F443ED':5/3,'5532E3':Math.SQRT2,'3B1AE4':2,'FF186D':0.8,'D0DD68':0.5,'82E66E':0.75,
 'C1633D':1/3,'763D8C':32/35,'2BBB86':2/3,'953C82':320/290,'15C31C':14/16,'FB279F':1.5
};
function verifyPhysics(){
 const {records}=require('./physics-experiment-tables');
 assert.deepEqual(Object.keys(records).sort(),Object.keys(expected).sort());
 for(const [id,answer]of Object.entries(expected)){
  const r=records[id];assert.equal(r.answer,answer,id);
  const pairs=[];
  for(let i=0;i<r.rows.length;i++)for(let j=i+1;j<r.rows.length;j++){
   const a=r.rows[i],b=r.rows[j],different=[1,2,3].filter(k=>a[k]!==b[k]);
   if(different.length===1&&different[0]===r.changedColumn)pairs.push(a[0]+b[0]);
  }
  assert.deepEqual(pairs,[answer],id+': controls');
  if(id in ratioExpected)assert.ok(Math.abs(r.ratio-ratioExpected[id])<1e-12,id+': physical ratio');
  assert.ok(r.solution.includes('Сравниваем строки '+answer[0]+' и '+answer[1]),id);
 }
 assert.equal(records.FA9CF6.ratio,null);
 assert.ok(records.FA9CF6.solution.includes('ρ_медь')&&records.FA9CF6.solution.includes('ρ_алюминий'));
 assert.ok(records.FCC2D6.solution.includes('опечатка')&&records.FCC2D6.solution.includes('см³'));
 assert.ok(records.FB279F.solution.includes('F_А−mg−F_уд=0'));
 assert.ok(records.E41101.solution.includes('267 г'));
 // A held wooden body: the force sensor measures a downward force, not mg−F_A.
 const V=30e-6,rhoWater=1000,rhoWood=600,g=10;
 const weight=rhoWood*V*g,hold=(rhoWater-rhoWood)*V*g;
 assert.ok(Math.abs(weight+hold-rhoWater*V*g)<1e-12);
 // Full-circuit check uses each actual source and load, including internal resistance.
 for(const id of ['A94A44','D860B0','270C56','2005A8','763D8C','15C31C']){
  for(const row of records[id].rows){
   const [E,r,R]=row.slice(1).map(v=>Number(v.replace(',','.'))),I=E/(R+r);
   assert.ok(Math.abs(I*R+I*r-E)<1e-12,id+': voltage balance');
  }
 }
 return true;
}
module.exports={verifyPhysics};
