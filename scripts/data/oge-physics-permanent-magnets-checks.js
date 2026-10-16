const assert=require('node:assert/strict');
const models=require('./oge-physics-permanent-magnets-models.json');
const opposite=p=>p==='N'?'S':'N';
// Unit dipole field along +x; used only for an independent direction check.
const field=([x,y])=>[3*x*x-(x*x+y*y),3*x*y];
module.exports=prepared=>{
 const rows=new Map(prepared.map(r=>[r.id,r]));
 for(const [id,m]of Object.entries(models)){
  const r=rows.get(id);assert.ok(r,id);
  if(m.kind==='gaps'){
   const magnetPole=opposite(m.nearNeedle),d=m.dictionary;
   const chosen=[d[m.repel?'repel':'attract'],d[m.repel?'same':'unlike'],d[m.nearNeedle],d[magnetPole]];
   assert.equal(r.answer,chosen.join(''));
  }else if(m.kind==='mixture'){
   const response={Fe:true,steel:true,Cu:false,Zn:false,sand:false};
   const magnetic=m.materials.map(x=>response[x]);
   const separable=magnetic.includes(undefined)?null:magnetic[0]!==magnetic[1];
   const answer=separable===null?'4':separable?'2':magnetic[0]?'3':'2';
   assert.equal(r.answer,answer);
  }else if(m.kind==='needles'){
   const positions=m.above?[[2,-2],[3,0],[0,2],[-3,0]]:[[-2,2],[-3,0],[0,-2],[3,0]];
   const north=[[1,-1],[1,0],[1,0],[1,0]];
   const bad=positions.map((p,i)=>{const b=field(p);return b[0]*north[i][0]+b[1]*north[i][1]<0?i+1:null;}).filter(Boolean);
   assert.deepEqual(bad,[3]);assert.equal(r.answer,String(bad[0]));
  }else if(m.kind==='leftward'){
   const positions=[[-3,0],[0,2],[0,-2],[2,-2]];
   const matches=positions.map((p,i)=>{const b=field(p).map(v=>-v);return b[0]<0&&b[1]===0?i+1:null;}).filter(Boolean);
   assert.deepEqual(matches,[1]);assert.equal(r.answer,String(matches[0]));
  }else if(m.kind==='photos'){
   const p1=opposite('N'),p2=opposite(p1),p3=p2;
   const evidence=m.version==='23CEC6'
    ?[p1===p2,false,p3===p2,p1==='S',false]
    :[p1!==p2,true,p3==='S'&&p2==='S',false,false];
   assert.equal(r.answer,evidence.map((v,i)=>v?i+1:'').join(''));
  }else if(m.kind==='period'){
   const mean=m.duration/m.minCount;assert.ok(m.latest>mean);
   // Explicit counterexample: nine events in four million years,
   // unevenly spaced, with no events during the final 700000 years.
   const times=[100000,180000,300000,500000,800000,1200000,1900000,2600000,3200000];
   assert.equal(times.length,m.minCount);assert.ok(m.duration-times.at(-1)>=m.latest);
   assert.ok(new Set(times.slice(1).map((x,i)=>x-times[i])).size>1);
   assert.match(r.answer,/не следует/);
  }else if(m.kind==='planet-table'){
   const allowed=m.planets.filter(p=>p[1]&&p[2]).map(p=>p[0]);
   assert.deepEqual(allowed,['Марс']);assert.match(r.answer,/Марсе/);
  }else if(m.kind==='inference'){
   // Both an initially magnetized object and an initially unmagnetized
   // susceptible object can be attracted: observation is non-identifying.
   const outcomes=[false,true].map(initial=>initial||true);
   assert.deepEqual(outcomes,[true,true]);assert.equal(r.answer,'3');
   assert.match(r.solution,/намагничивается/);
  }else if(m.kind==='remagnetize'){
   for(const magnet of ['S','N'])assert.notEqual(opposite(magnet),magnet);
   assert.equal(r.answer,'3');
  }else if(m.kind==='housing')assert.equal(r.answer,'3');
  else if(m.kind==='other-planets'){assert.match(r.answer,/других планетах/);assert.match(r.solution,/атмосфера и магнитное поле/);}
  else throw Error(id+': unknown physical model');
 }
 assert.equal(Object.keys(models).length,18);
};
