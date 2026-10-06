const assert=require('node:assert/strict');
const expected={BA974A:.25,'498B07':.25,'18E7BF':.5,'932D10':.125,'328611':16,'412F2F':.5,'265725':14,BE34D6:150,AF275D:.5,'7682C8':.12,'318091':.4,'4B4E62':.25,EAAA61:.2,'905C3A':3,FEBC8E:.25,'5A62DB':.5,DB9550:1.5,C4469D:12};
const close=(a,b,id)=>assert.ok(Math.abs(a-b)<1e-9,id+': '+a+' != '+b);
function verifyPhysics(){
 const {records}=require('./physics-friction');assert.deepEqual(Object.keys(records).sort(),Object.keys(expected).sort());
 for(const [id,answer]of Object.entries(expected))close(Number(records[id].answer.replace(',','.')),answer,id);
 // Независимые первичные отсчёты: сверяются все точки, а не одна выбранная пара.
 const readings={'498B07':[[40,10],[60,15],[80,20],[100,25]],'318091':[[2,.8],[4,1.6],[6,2.4],[8,3.2]],'18E7BF':[[2,1],[4,2],[6,3],[8,4],[10,5]],'932D10':[[4,.5],[8,1],[12,1.5]],'412F2F':[[4,2],[8,4],[10,5]],AF275D:[[2,1],[4,2],[5,2.5]],'4B4E62':[[2,.5],[4,1]]};
 for(const[id,rows]of Object.entries(readings)){
  assert.deepEqual(records[id].N,rows.map(r=>r[0]));assert.deepEqual(records[id].F,rows.map(r=>r[1]));
  for(const[N,F]of rows)close(expected[id]*N,F,id+' inverse all readings');
 }
 close(.25*10*10,25,'uniform pull');close(.25*14*10,35,'uniform mass');
 close(.12*5*10,6,'sled 5kg');close(.2*8*10,16,'sled 8kg');close(.25*40,10,'pressure');
 close(100/(50*10)*(1.5*50)*10,150,'mass ratio');
 for(const mu of [.12,.25,.7])for(const m of [1,3,20])close((mu*(3*m)*10)/(mu*m*10),3,'area ratio');
 close(800*.02,16,'spring');close(400*.04,16,'spring other side');
 // Оба тела проверяются отдельно с их собственными направлениями движения.
 const T_up=.5*(10+2);close((10-T_up-.2*10)/1,2,'table left');close((T_up-.5*10)/.5,2,'hanging up');
 const T_down=.75*(10-2);close((T_down-1.5-.25*10)/1,2,'table right');close((.75*10-T_down)/.75,2,'hanging down');
 assert.ok(T_up>0&&T_down>0);
 const N=2*10-12*Math.sin(Math.PI/6);assert.ok(N>0);close(.2*N,2.8,'inclined contact');
 return true;
}
module.exports={verifyPhysics};
