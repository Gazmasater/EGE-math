const assert=require('node:assert/strict');
const {records}=require('./physics-thermodynamics-engines');
const value=id=>Number(records[id].answer.replace(',','.'));
const near=(a,b,label)=>assert.ok(Math.abs(a-b)<1e-9*Math.max(1,Math.abs(b)),`${label}: ${a} != ${b}`);
function verifyPhysics(){
 const expected={'4EF342':60,'48EC42':40,'437C4A':25,C2BD49:36,'6BF448':30,'016604':1,
  '0D600A':40,'69C276':30,EDD8BA:40,'81C4BA':100,'9C4910':4,'3B7C1D':100,D1C429:260,
  '80CCD9':60,'191151':4,'5B0C50':2,ADCC5E:25,EE1659:2.4,'32625A':60,B44BA2:2000,
  '5FF1AE':30,EC33AF:64,'7DA9C4':2,CBEDE7:80,DF5F69:20,'1FCC34':20,'6C193A':40,
  '8EA430':250,E85980:40,'50A21C':1.6,E9E397:341};
 assert.deepEqual(Object.keys(records).sort(),Object.keys(expected).sort());
 for(const[id,result]of Object.entries(expected))near(value(id),result,id);
 // Back-substitute efficiencies into independent (hot heat, useful work) pairs.
 for(const[id,Q,A]of[['4EF342',100,60],['48EC42',50,20],['437C4A',64,16],['6BF448',50,15],['EDD8BA',100,40],['DF5F69',80,16]])near(Q*value(id)/100,A,id);
 // Work and reservoir heats: all figures are explicitly per cycle unless stated.
 for(const[id,Q,eta]of[['C2BD49',120,.3],['016604',10,.1],['69C276',100,.3],['5B0C50',8,.25],['EE1659',6,.4],['CBEDE7',200,.4]])near(value(id)/Q,eta,id+': recovered efficiency');
 near(value('81C4BA')-value('81C4BA')*.3,70,'cold heat at 30%');
 near(value('3B7C1D')*.5,50,'cold heat at 50%');
 near(value('D1C429')-2*100,2*30,'two full cycles');
 near(value('80CCD9')+15,75,'heat rejected, kJ');
 near(value('ADCC5E')/100*(50+150),50,'denominator is hot reservoir');
 near(value('32625A')/100*50,50-20,'both heats');
 near(value('B44BA2')*.2,400,'hot heat from work');
 near(value('5FF1AE')+50*.4,50,'cold heat at 40%');
 near(value('6C193A')/100*100,100-60,'ideal engine energy balance');
 near(value('8EA430')*.08,20,'8 percent, not 8');
 // Carnot inverse temperature checks and Celsius-to-Kelvin conversion.
 near((1-value('0D600A')/100)*(227+273),27+273,'Celsius conversion');
 near((1-value('1FCC34')/100)*600,480,'temperature ratio');
 near((1-value('E85980')/100)*500,300,'absolute temperatures');
 near((1-300/400)*value('EC33AF'),16,'heat from Carnot work');
 const steamMass=1e6/(1-273/373)/2.3e6;
 assert.equal(Math.round(steamMass*10)/10,value('50A21C'));
 near(2.3e6*steamMass,1e6+2.73e6,'hot and cold reservoirs differ');
 near(2.73/3.73,273/373,'Carnot heat-temperature ratios');
 const iceHeat=12.1*330000,hotTemperature=273*(iceHeat+1e6)/iceHeat;
 assert.equal(Math.round(hotTemperature),value('E9E397'));
 near((1-273/hotTemperature)*(iceHeat+1e6),1e6,'unrounded ice engine energy');
 assert.ok(hotTemperature>273&&hotTemperature<373);
 // Qualitative consistency: on VT isotherms are vertical, on pT isochores are rays.
 assert.ok(records['9C4910'].solution.includes('Участок 4 вертикален вверх'));
 assert.ok(records['191151'].solution.includes('Участок 4 направлен вверх'));
 assert.ok(records['7DA9C4'].solution.includes('продолжение которой проходит через начало координат'));
 assert.ok(records['50A21C'].solution.includes('Q_н = Lm'));
 assert.ok(records.E9E397.solution.includes('Q_х = λm'));
}
module.exports={verifyPhysics};
