const assert=require('node:assert/strict');
const models=require('./oge-physics-magnetic-field-models.json');
const equal=(a,b)=>Math.abs(a-b)<1e-10;
// Cartesian components only in this independent audit, not in pupil solutions.
const field=(current,[x,y])=>[-current*y,current*x];
const aligned=(a,b)=>equal(a[0]*b[1]-a[1]*b[0],0)&&a[0]*b[0]+a[1]*b[1]>0;
module.exports=prepared=>{
 const rows=new Map(prepared.map(r=>[r.id,r]));
 for(const [id,m]of Object.entries(models)){
  const row=rows.get(id);assert.ok(row,id);
  if(m.kind==='four-needles'){
   const matches=m.positions.map((p,i)=>aligned(field(m.current,p),m.north[i])?i+1:null).filter(Boolean);
   assert.equal(matches.length,1);assert.equal(row.answer,String(matches[0]));
   assert.notEqual(m.current,0);
  }else if(m.kind==='rotation'){
   const B=field(m.current,m.position),n=m.initialNorth;
   const angle=Math.acos((B[0]*n[0]+B[1]*n[1])/(Math.hypot(...B)*Math.hypot(...n)))*180/Math.PI;
   assert.ok(equal(angle,Number(row.answer)));assert.match(row.solution,/остальных полей/);
  }else if(m.kind==='rheostat'){
   const direction=(a,b)=>a>b?'1':a<b?'2':'3';
   for(const l of [2,5,10])for(const rho of [.4,1.1]){
    const before=rho*l+3,after=rho*l*(m.right?1.5:.5)+3;
    const oldI=6/before,newI=6/after;
    assert.equal(row.answer,direction(after,before)+direction(newI,oldI));
   }
  }else if(m.kind==='spring'){
   const natural=10,k=2,magneticForce=3;
   const energized=natural-magneticForce/k;
   const before=m.on?natural:energized,after=m.on?energized:natural;
   assert.equal(row.answer,after<before?'3':'1');
  }else if(m.kind==='observations'){
   // Derive conclusions from controlled changes and observed responses.
   const events=id==='OGEPHYSCEC9A6'
    ?[{current:0,needle:0},{current:1,needle:1},{current:-1,needle:-1}]
    :id==='OGEPHYS683EE6'
     ?[{current:1,parallel:true,motion:'toward'},{current:1,parallel:false,motion:'apart'}]
     :[{current:1,parallel:true,motion:'toward',bend:1},{current:2,parallel:true,motion:'toward',bend:2}];
   let valid;
   if('needle' in events[0])valid=[1,3];
   else{
    valid=[];
    if(events.some(e=>e.parallel&&e.motion==='toward'))valid.push(1);
    if(events.some(e=>!e.parallel&&e.motion==='apart'))valid.push(2);
    if(events[1].parallel===events[0].parallel&&events[1].current>events[0].current&&events[1].bend>events[0].bend)valid.push(4);
   }
   assert.equal(row.answer,valid.join(''));assert.equal(valid.length,2);
  }else if(m.kind==='turns'){
   assert.equal(m.length,1);assert.equal(m.initialTurns,10);
   for(const n of [12,15,20]){
    const wireR=.2*m.length/.1,current=1.5/(wireR+.5);
    assert.ok(n*current>m.initialTurns*current);
   }
   assert.match(row.answer,/число витков/);assert.match(row.solution,/Полная длина провода остаётся 1 м/);
  }else if(m.kind==='compass')assert.equal(row.answer,'4');
  else throw Error(id+': unrecognized model');
 }
 assert.equal(Object.keys(models).length,12);
};
