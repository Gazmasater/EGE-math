const assert=require('node:assert/strict');
const {records}=require('./physics-experiment-equipment');
// Отдельный ручной эталон по исходным перечням оборудования.
const answers={'60DF4D':'12','46D7FD':'25','420AF5':'45','2493F5':'23',F78C75:'35','154E79':'12','9F7170':'12','48DF11':'45','840412':'14','065D26':'15','2C5D23':'12','045EA4':'13','0E00AC':'23','358D98':'34',F68A6A:'23','830760':'34','9AF830':'12'};
const near=(x,y)=>assert.ok(Math.abs(x-y)<1e-9,`${x} != ${y}`);
function verifyPhysics(){
 assert.deepEqual(Object.keys(records).sort(),Object.keys(answers).sort());
 for(const[id,a]of Object.entries(answers))assert.equal(records[id].answer,a,id);
 // Контрольные модельные измерения, не данные задач: проверяют законы и обратные связи.
 const g=10,volume=(180-100)*1e-6,buoyancy=1000*g*volume;near(buoyancy,.8);near(buoyancy/(g*volume),1000);
 const copperVolume=50e-6,copperMass=.445;near(copperMass/copperVolume,8900);near(copperMass*g/g,copperMass);
 const load=.2,extension=.04,k=50;near(k*extension,load*g);
 const normal=5,friction=1.5,mu=.3;near(mu*normal,friction);
 const length=1,period=2,gMeasured=Math.PI**2;near(2*Math.PI*Math.sqrt(length/gMeasured),period);
 const u=6,i=.2;near(u*i,1.2);near(u/(u/i),i);
 const a=.3,b=.6,F=.2;near(1/a+1/b,1/F);assert.ok(F<a&&F<b);
 near((.6/.4)*.4,.6);
 assert.ok(records['840412'].solution.includes('амперметр уже есть'));
 assert.ok(records['9AF830'].solution.includes('геометрический способ'));
 for(const id of ['F68A6A','830760'])assert.ok(records[id].solution.includes('T+F_А−mg=0'));
 return true;
}
module.exports={verifyPhysics};
