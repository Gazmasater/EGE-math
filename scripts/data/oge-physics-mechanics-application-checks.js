const assert=require('node:assert/strict');
module.exports=prepared=>{
 const row=id=>{const r=prepared.find(r=>r.id==='OGEPHYS'+id);assert.ok(r,id);return r;};
 const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
 const coefficient=id=>Number(row(id).answer.match(/· (\d+,\d+) м/)[1].replace(',','.'));
 // Independent primary dimensions, weights are arbitrary test values, not lab readings.
 const levers=[['A088B4',.16,.08,.16,1],['676419',.06,.12,.06,1],['4C6928',.10,.15,.10,1],['59D421',.12,.06,.12,1],['4B7FAA',.18,.09,.18,-1],['A215C0',.08,.16,.08,1],['88FF93',.10,.05,.10,1]];
 for(const [id,a,b,d,sign] of levers){
  near(coefficient(id),d);assert.equal(row(id).sketch.oneRight,sign<0);
  for(const w of [.4,1.2]){
   const moment=2*w*a+sign*w*b,F=moment/d;near(F*coefficient(id),moment);near(2*w*a+sign*w*b-F*d,0);
  }
  assert.match(row(id).solution,/0,002/);assert.match(row(id).solution,/0,1/);
 }
 const pulleys=[['8E66BE',.10,1],['CA255B',.25,1],['5D426A',.20,1],['5D3F1C',.12,2],['DDEAD8',.10,2],['A272E4',.10,2],['2F873E',.08,2]];
 for(const [id,h,n] of pulleys){
  near(coefficient(id),n*h);
  // Rope length is conserved: n supporting segments shorten by h.
  near(n*(1-h)+(1+n*h),n+1);
  for(const mass of [.2,.7]){
   const blockMass=n===2?.03:0,F=(mass+blockMass)*10/n;
   near(F*coefficient(id),(mass+blockMass)*10*h);
  }
  if(n===2){assert.match(row(id).solution,/0,4 см/);assert.match(row(id).solution,/s = 2h/);}
 }
 const friction=[['6C211E',.20,2,'Б','0,1'],['3CC317',.16,2,'Б','0,1'],['6295C5',.18,1,'А','0,02'],['811764',.15,2,'А','0,02'],['4F473E',.22,1,'А','0,02'],['ABE43B',.20,1,'А','0,02'],['119783',.12,2,'Б','0,1']];
 for(const [id,d,dyn,surface,err] of friction){
  const r=row(id);near(coefficient(id),d);assert.match(r.answer,/−F_тр/);assert.ok(r.solution.includes(`динамометр № ${dyn}`));assert.equal(r.sketch.surface,surface);assert.ok(r.solution.includes(`± ${err}`));
  for(const f of [.3,.9]){const work=-f*d;assert.ok(work<0);near(-work/d,f);near(work+f*d,0);}
 }
 for(const [id,cyl] of [['BDD67B',3],['E68958',4],['DCC884',2]]){
  assert.equal(row(id).sketch.cylinder,cyl);assert.match(row(id).answer,/V₂ − V₁/);
  const mass=.054,v1=30e-6,v2=50e-6,rho=mass/(v2-v1);near(rho,2700);near(rho*(v2-v1),mass);
  assert.match(row(id).solution,/±2 см³ задано для объёма тела целиком/);
 }
 for(const [id,cyl] of [['513676',4],['48A91B',2],['F7B656',3]]){
  assert.equal(row(id).sketch.cylinder,cyl);assert.match(row(id).answer,/P − T/);
  for(const volume of [10e-6,30e-6]){const weight=.9,arch=1000*10*volume,tension=weight-arch;near(weight-tension,arch);near(tension+arch-weight,0);}
  assert.match(row(id).solution,/0,04 Н/);
 }
 for(const [id,spring] of [['0CC0F8',1],['C80D7E',1],['3487DE',2],['8ED1DC',1],['5708CF',2],['6C299B',2]]){
  assert.equal(row(id).sketch.spring,spring);assert.equal(row(id).answer,'k = ⟦P¦x⟧; P и x определяются измерениями');
  for(const k of [15,45]){const f=.6,l0=.08,l=l0+f/k;near(f/(l-l0),k);}
 }
 for(const [id,surface] of [['61F344','А'],['646D49','Б'],['34F958','Б'],['3B6191','А']]){
  assert.equal(row(id).sketch.surface,surface);assert.match(row(id).answer,/⟦F_тяги¦P⟧/);
  for(const mu of [.2,.6]){const totalMass=.25,normal=totalMass*10,force=mu*normal;near(force/normal,mu);near(force-mu*normal,0);}
 }
 // Controlled pair selection transcribed from each original image, not source answers.
 const cylinders={А:[[1,'Al'],[1,'Cu']],Б:[[1,'Al'],[.6,'Al']],В:[[1,'Al'],[.6,'Cu']]};
 const suitable=Object.entries(cylinders).filter(([,a])=>a[0][0]===a[1][0]&&a[0][1]!==a[1][1]).map(([k])=>k);
 assert.deepEqual(suitable,['А']);assert.equal(row('8F4AC3').answer,'1');
 const massChoice=[[['small',1],['small',2]],[['small',1],['large',1]],[['small',2],['large',2]],[['small',2],['large',1]]];
 assert.equal(row('D8A136').answer,String(massChoice.findIndex(([a,b])=>a[0]===b[0]&&a[1]!==b[1])+1));
 const sizeChoice=[[['small',1],['small',2]],[['small',1],['large',1]],[['small',1],['large',3]],[['large',1],['large',3]]];
 assert.equal(row('7D77FF').answer,String(sizeChoice.findIndex(([a,b])=>a[1]===b[1]&&a[0]!==b[0])+1));
 const dFlux=[1,0,-1],current=dFlux.map(x=>-x);near(current[1],0);assert.equal(Math.sign(current[0]),-Math.sign(current[2]));assert.equal(row('AD555F').answer,'24');
 for(const id of ['324191','DFD28E','765ADE']){assert.match(row(id).solution,/отношени/);assert.match(row(id).solution,/равномерн/);assert.match(row(id).solution,/горизонтальн/);}
 for(const id of ['001ABE','97FEAB']){assert.match(row(id).solution,/l₀/);assert.match(row(id).solution,/погрешност/);}
};
