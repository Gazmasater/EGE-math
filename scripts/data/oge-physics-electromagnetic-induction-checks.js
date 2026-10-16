const assert = require('node:assert/strict');
const models = require('./oge-physics-electromagnetic-induction-models.json');
const near = (a,b) => assert.ok(Math.abs(a-b)<1e-8*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const choices = flags => flags.flatMap((flag,i)=>flag?[i+1]:[]).join('');
module.exports = prepared => {
  const rows = new Map(prepared.map(row=>[row.id,row]));
  for (const [id,m] of Object.entries(models)) {
    const row = rows.get(id); assert.ok(row,id);
    if (m.kind==='recognize') {
      // A varying mutual flux induces current regardless of the source of B.
      for(const source of [0.2,1,3]) {
        const flux = x=>source/(1+x*x)**1.5;
        const x1=m.inside?2:1, x2=m.inside?1:2;
        assert.notEqual(flux(x1),flux(x2));
        near(flux(x1)-flux(x1),0);
      }
      assert.equal(row.answer,'4'); assert.match(row.solution,/поток/);
    } else if(m.kind==='two-coils') {
      // Finite differences of primary current, with positive mutual inductance.
      const current=[0,1,1,0], induced=current.slice(1).map((v,i)=>-(v-current[i]));
      induced.forEach((value,i)=>near(value,m.observations[i]));
      const on=induced[0]!==0, rest=induced[1]===0, off=induced[2]!==0;
      const reversed=induced[0]*induced[2]<0;
      const flags={
        A09148:[false,false,on&&off,reversed,false],
        '3E6EF8':[on&&off,false,false,on&&off,false],
        '07211B':[on&&off,false,rest,false,false],
        '828FC1':[false,false,rest,reversed,false],
      }[m.version];
      assert.ok(flags); assert.equal(row.answer,choices(flags));
      // Equal nonzero flux at both endpoints is a counterexample to I ~ flux.
      for(const flux of [0.01,0.2,4]) near(-(flux-flux)/0.1,0);
    } else if(m.kind==='moving-magnet') {
      // Local flux gradient is held fixed: I = -v (dPhi/dx) / R.
      const speeds=m.version==='speed'?[1,2]:m.version==='direction'?[1,-1]:[1,0,-1];
      const currents=speeds.map(v=>-v);
      currents.forEach((value,i)=>near(value,m.observations[i]));
      const motion=currents.filter(x=>x!==0).length===2;
      const reversed=currents[0]*currents.at(-1)<0;
      const speedTest=speeds.every(v=>v>0)&&speeds[1]>speeds[0]&&Math.abs(currents[1])>Math.abs(currents[0]);
      const flags=m.version==='three-states'?[false,false,currents[1]===0,reversed,false]:[false,motion,speedTest,reversed,false];
      assert.equal(row.answer,choices(flags));
    } else if(m.kind==='ring') {
      assert.equal(m.axis,'vertical'); assert.equal(m.field,'horizontal');
      // Uniform B and a rotating area normal: flux = B S cos(omega t).
      const B=.4,S=.03,omega=5,R=.2,N=2000,dt=2*Math.PI/omega/N;
      let heat=0,positive=false,negative=false;
      for(let k=0;k<N;k++) {
        const a=B*S*Math.cos(omega*k*dt),b=B*S*Math.cos(omega*(k+1)*dt);
        const emf=-(b-a)/dt, I=emf/R;
        positive ||= I>0; negative ||= I<0; heat+=I*I*R*dt;
        near(emf*I,I*I*R);
      }
      assert.ok(positive&&negative&&heat>0);
      assert.ok(Math.abs(heat-(B*S*omega)**2/(2*R)*(N*dt))<1e-6);
      assert.match(row.answer,/Да/); assert.match(row.solution,/механическая работа/);
    } else throw Error(id);
  }
  assert.equal(Object.keys(models).length,13);
};
