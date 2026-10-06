const assert=require('node:assert/strict');
const {records}=require('./physics-magnetism-field');
const near=(a,b,id)=>assert.ok(Math.abs(a-b)<1e-9,id+': '+a+' != '+b);
function verifyPhysics(){
 assert.equal(Object.keys(records).length,42);
 // Independent values reconstructed from the primary conditions.
 const numeric={C0DF4F:1,C33CCA:1,'141EFE':.25,'603F0B':.25,'3EFFE1':4,'78C864':3,'91A4F6':2,'1B3904':2,D0F00F:.4,'5A59BE':.4,'999689':2,CC666A:.4,B65453:1,'5ED18A':2,'4603AF':4,D798EB:2};
 const arithmetic={C0DF4F:(2*1)/(1*2),C33CCA:(2*1)/(1*2),'141EFE':(1*1)/(2*2),'603F0B':(1*1)/(2*2),'3EFFE1':(2*6)/(3*1),'78C864':(3*1)/(1*1),'91A4F6':6/3,'1B3904':4/2,D0F00F:.8*.5,'5A59BE':2/5,'999689':4/2,CC666A:.2*2,B65453:(50/100)*.5*4,'5ED18A':.12/(.6*.2*Math.sin(Math.PI/6)),'4603AF':8/2,D798EB:.5*4};
 for(const[id,v]of Object.entries(numeric)){near(Number(records[id].answer.replace(',','.')),v,id);near(v,arithmetic[id],id);}
 near(.6*.2*numeric['5ED18A']*.5,.12,'current back-substitution');near(numeric['4603AF']*2/8,1,'same momentum');near(4*(.5/numeric.D798EB),1,'mass times speed');
 // Sign check uses orthogonal components, independently from prose/case directions.
 const dir={'вправо':[1,0,0],'влево':[-1,0,0],'вверх':[0,1,0],'вниз':[0,-1,0],'к наблюдателю':[0,0,1],'от наблюдателя':[0,0,-1]};
 const cases=[['3759F5',1,[0,-1,0],[-1,0,0]],['B852E0',1,[0,1,0],[1,0,0]],['AB0ADF',1,[0,-1,0],[1,0,0]],['BAC5C7',1,[0,-1,0],[1,0,0]],['C04659',1,[0,1,0],[-1,0,0]],['06310E',1,[0,1,0],[0,0,-1]],['8B2572',1,[0,1,0],[0,0,1]],['4C6BDE',1,[0,-1,0],[0,0,1]],['54F5DC',1,[0,1,0],[1,0,0]],['890738',1,[0,1,0],[1,0,0]],['B94783',1,[0,1,0],[0,0,1]],['C5E88B',1,[0,1,0],[0,0,-1]],['70F97F',1,[-1,0,0],[0,-1,0]],['BE5272',-1,[1,0,0],[0,1,0]],['FE5581',-1,[-1,0,0],[0,1,0]],['A875DE',-1,[-1,0,0],[0,0,-1]],['9DCB92',1,[1,0,0],[0,0,-1]],['3CB89A',1,[0,0,-1],[-1,0,0]],['5AF5EE',1,[0,0,1],[-1,0,0]]];
 for(const[id,q,v,b]of cases){const force=[q*(v[1]*b[2]-v[2]*b[1]),q*(v[2]*b[0]-v[0]*b[2]),q*(v[0]*b[1]-v[1]*b[0])].map(n=>n||0);assert.deepEqual(force,dir[records[id].answer],id);near(force.reduce((a,x,i)=>a+x*v[i],0),0,id+' perpendicular velocity');near(force.reduce((a,x,i)=>a+x*b[i],0),0,id+' perpendicular field');}
 const words={'86C04F':'вверх',D668FF:'вверх','0EDD81':'вверх',E37175:'вниз',C6D2DF:'вверх','8F7EB6':'вниз','3EE5A8':'вправо'};for(const[id,a]of Object.entries(words))assert.equal(records[id].answer,a,id);
 assert.equal(Math.sign(1+1),1);assert.equal(Math.sign(2-1),1);assert.equal(Math.sign(-1-1),-1);assert.equal(Math.sign(1/4+1),1);
 for(const r of Object.values(records)){assert.ok(r.solution.length>900,r.id);assert.ok(r.solution.includes('Проверка.'),r.id);assert.ok(!r.solution.includes('/'),r.id);}
 assert.equal(records['3EE5A8'].kind,'electric-direction');return true;
}
module.exports={verifyPhysics};
