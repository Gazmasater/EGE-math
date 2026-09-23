const assert = require('node:assert/strict');
const near = (a,b,id) => assert.ok(Math.abs(a-b)<1e-7*Math.max(1,Math.abs(b)), `${id}: ${a} ≠ ${b}`);
function verifyPhysics() {
  require('./thermal-new-checks').verifyNewPhysics();
  const c=4200, ice=2100, latent=330000;
  // Независимые обратные балансы: численные ответы подставляются в физические законы.
  near(.03*c*(71-20),.17*c*(80-71),'F85410');
  near(400*903.75,.5*c*90+.15*.5*2300000,'06521E');
  near(.25*c*44,.14*latent,'C07219');
  near(.21*latent,1.1*c*15,'438E2E');
  near((14/65)*(latent+c*5),.45*c*40,'5D4F68');
  near(.05*.2*latent,.165*500*40,'EFA43A');
  const laserMass=297/35;
  near(laserMass*c*10+.1*10*3600,(.1*10*3600)/.01,'F17C45');
  const frozen1=21/220, frozen2=28/275;
  assert.ok(frozen1>0&&frozen1<.5&&frozen2>0&&frozen2<.2,'Обе фазы сохраняются');
  near(.5*c*5+frozen1*latent,1*ice*20,'65677A');
  near(.5-frozen1,89/220,'65677A: жидкая масса');
  near(.2*c*10+frozen2*latent,1*ice*20,'104DB0');
  near(1+frozen2,303/275,'104DB0: масса льда');
  near(.3*c*(1198/21-2),.2*latent+.4*c*2,'68CF7C');
  near((1099.008/4560)*380*12,2.4e11*5400*5.3e6*1.6e-19,'B4D4B9');
  near((176/175)*ice*6,.03*(c*20+latent+ice*4),'75CD1B');
  near(3*(50-40),40-10,'655A2B: первый этап');
  near(4*(40-34),34-10,'655A2B: второй этап');
  near(3*(50-34),2*(34-10),'E20CAC: общий баланс');
  near((83/42)*c*90,.05*1.8*8.3e6,'EBA1C7');
  const mass=20/99, extra=370000/11;
  near(.75*mass*latent,50000,'31CB91: первая порция');
  near(50000+extra,mass*(latent+c*20),'31CB91: полный процесс');
}
module.exports = {verifyPhysics};
