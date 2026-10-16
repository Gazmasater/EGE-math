const assert=require('node:assert/strict');
module.exports=prepared=>{
 const row=id=>prepared.find(r=>r.id==='OGEPHYS'+id),answer=id=>row(id).answer;
 const numeric=id=>Number(answer(id).replace(',','.'));
 const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9);
 // Independent graphical readings: adjacent maxima and minima, in centimetres.
 for(const [id,maxima,minima] of [['EB9A20',[0,14,28,42],[7,21,35]],['28F19A',[9,27,45],[0,18,36,54]]]){
  const wavelength=maxima[1]-maxima[0];assert.equal(numeric(id),wavelength);
  for(let i=1;i<maxima.length;i++)assert.equal(maxima[i]-maxima[i-1],wavelength);
  for(let i=1;i<minima.length;i++)assert.equal(minima[i]-minima[i-1],wavelength);
 }
 // Frequency is common at a stationary boundary. Check pressure amplitude
 // through the acoustic boundary conditions, rather than energy alone.
 const water={rho:1000,v:1500},air={rho:1.2,v:330},f=1000;
 near((air.v/f)/(water.v/f),air.v/water.v);
 assert.equal(answer('F9A24C'),'3'+(air.v/f<water.v/f?'2':'1'));
 const Zw=water.rho*water.v,Za=air.rho*air.v;
 const pressureT=2*Za/(Zw+Za),pressureR=(Za-Zw)/(Za+Zw);
 near(1+pressureR,pressureT);near((1-pressureR)/Zw,pressureT/Za);
 const intensityT=pressureT**2*Zw/Za;
 near(intensityT+pressureR**2,1);assert.ok(pressureT<1&&intensityT<1);
 const displacementT=pressureT*Zw/Za;assert.ok(displacementT>1);
 assert.equal(answer('B17C20'),'32');assert.match(row('B17C20').solution,/амплитуд[ау] звукового давления/);
 // Original sizes, with independent SI conversions and reverse products.
 for(const [id,fKHz,v,dMm,expected] of [['249E22',80,320,1,false],['920444',80,320,10,true],['5D0EDB',100,1500,50,true],['FFA4B3',100,1500,10,false]]){
  const fHz=fKHz*1000,wavelength=v/fHz,d=dMm/1000;
  near(wavelength*fHz,v);assert.equal(d>=wavelength,expected);
  assert.equal(answer(id),expected?'Да.':'Нет.');
 }
 // Refraction away from the normal implies a greater speed in B by Snell's
 // law; the density ordering is explicitly conditional on the task's text.
 const alpha=20*Math.PI/180,beta=35*Math.PI/180;
 assert.ok(Math.sin(beta)/Math.sin(alpha)>1);assert.equal(answer('FACB7B'),'Слой Б.');
 assert.equal(answer('B8982C'),'Волна S.');
 // Word indices transcribed separately from the primary lists.
 const words={'6AB044':{колебательное:5,большее:8,амплитуда:2,громкость:3},'DC91F0':{колебательное:5,продольной:7,частота:1,высота:3},'B1E47B':{колебательное:5,продольной:7,амплитуда:2,громкость:4},'9F7CDE':{амплитуда:2,громкость:5,частота:1,высота:6}};
 for(const [id,w] of Object.entries(words))assert.equal(answer(id),Object.values(w).join(''));
 for(const id of ['95C1B2','66348A'])assert.equal(answer(id),'4');
 for(const id of ['3DB014','3DF9DB']){
  assert.equal(answer(id),'1');for(const v of [330,1500])for(const d of [1,50])near(v*(2*d/v)/2,d);
 }
 assert.equal(answer('A2401D'),'Нет.');assert.equal(answer('B6EDAE'),'Нет, не услышит.');
 for(const [id,t,yes] of [['84453C',90,false],['557580',30,true]]){
  const v=330,c=3e8,dApprox=v*t,dExact=t/(1/v-1/c);
  near(dApprox/v,t);assert.ok(Math.abs(dExact/dApprox-1)<2e-6);
  assert.equal(dApprox<=20000,yes);assert.equal(dExact<=20000,yes);
  assert.equal(answer(id),yes?'Да.':'Нет.');
 }
 for(const u of [0,10,100]){
  const v=330,T0=.002,wavelength=(v+u)*T0,fObserved=v/wavelength;
  near(wavelength*fObserved,v);assert.equal(fObserved<1/T0,u>0);
 }
 assert.equal(answer('19270C'),'Высота тона понижается.');
 assert.equal(answer('64FDAB'),'Увеличивается размах отклонений звуковой дорожки.');
 // Greater amplitude changes groove excursion without changing its period.
 const groove=(amplitude,x)=>amplitude*Math.sin(2*Math.PI*x);
 near(groove(2,.25)/groove(1,.25),2);near(groove(1,0),groove(1,1));near(groove(2,0),groove(2,1));
};
