const assert=require('node:assert/strict');
const {cases}=require('./physics-astronomy-cases');
const {records}=require('./physics-astronomy');
const catalog=require('./physics-completion-catalog.json');
function verifyPhysics(){
 const v1=v=>v/Math.SQRT2,v2=v=>v*Math.SQRT2;
 const g1=(v,d)=>2*v*v*1000/d,g2=(v,d)=>v*v*1000/d,V=(a,b)=>(a/b)**3;
 const near=(a,b,tol=.025)=>Math.abs(a/b-1)<=tol;
 const yrJ=11*365+315,yrS=29*365+168,marsDay=24+37/60,earthDay=23+56/60;
 const mass={O:20,B:5,A:2,F:1.3,G:1,K:.7,M:.3};
 const L=s=>mass[s]**3.5,life=s=>mass[s]/L(s),temp={O:30000,B:14000,A:9000,F:6500,G:5800,K:4100,M:3300};
 const rhoWD=.6/.01**3,rhoGiant=10/100**3,rhoMS=1;
 const truth={
  CE0949:[near(v1(35.49),50.2),near(g2(5.02,6794),3.7),1/(84*365+5)>1/687,near(v1(10.36),7.33),near(V(12756,6794),4)],
  C0910B:[42.1<25.1,true,near(9.58*150,1437),near(g1(3.01,4879),3.7),near(v2(15.1),10)],
  '5BBAD8':[near(g1(15.1,51118),15.1),true,near(v2(3.55),5.02),142984<120536,near(5.2*150,280)],
  '46E052':[near(v1(5.02),7.1),near(yrJ*24/(9+53.8/60),300),1/(10+38/60)>1/(58.6*24),near(g2(23.71,49528),23.7),near(g2(59.54,142800),24.8)],
  '457453':[false,near(g1(16.8,49528),11.4),near(V(12104,6794),3),near(v2(3.01),1.25),near(.72*150,108)],
  F99253:[near(9.58*150,1437),near(g2(5.02,6794),3.7),near(v1(10.36),14.54),near(yrS/yrJ,4.5),near(V(49528,4879),10)],
  B77F53:[near(v2(3.01),4.26),1/(84*365+5)>1/yrS,false,near(V(49528,6794),7),near(yrS/224.7,48)],
  D53659:[near(v1(2.445),1.7),near(2025**2/(2*1561e3),20.25),421.6<1883,near(v1(1.438),2),near(V(2575,1737),1.5)],
  A9E1C3:[true,near(g1(25.1,120536),25.1),near(.39*150,150),near(v2(42.1),59.5),near(V(142984,49528),3)],
  B45CE1:[near(v2(3.55),5.02),1/(84*365+5)<1/(164*365+290),false,near(V(120660,51118),2.5),near(687*24/marsDay,670)],
  A4E268:[near(V(51118,49528),10),near(v1(35.49),25.1),near(g2(59.54,142800),59.54),near(earthDay/marsDay,2),near(687*24/marsDay,670)],
  E62662:[near(v2(16.8),23.8),near(g1(25.1,120536),25.1),true,30.02**-1.5>19.19**-1.5,near(.72*150,108)],
  // FIPI says approximately 1.6; its rounded input yields 1.658, documented in the solution.
  '31FE3F':[near(v1(.725),11),near(2400**2/(2*1737e3),1.6,.04),near(V(2575,1354),2),1883>421.6,2575<1737],
  FBEB89:[near((yrS/yrJ)**(1/3),1/3),near(V(142800,51118),3),near(v1(10.36),7.33),near(yrJ/224.7,19),near(g2(23.71,49528),23.71)],
  '961A7C':[near(g1(15.1,51118),15.1),near(g1(16.8,49528),11.4),true,near(V(142984,49528),3),near(5.2*150,300)],
  A9AF26:[near(2640**2/(2*2575e3),26.4),near(V(1821,761),3),near(v1(2.445),1.7),2575>1737,421.6>670.9],
  '4019C0':[false,near(g1(25.1,120536),10.5),near(v2(42.1),25),near(1.52/.72,3),true],
  '5E99CA':[near(earthDay/marsDay,2),near(687*24/marsDay,670),near(g2(59.54,142800),59.54),near(V(51118,49528),10),near(v1(10.36),7.3)],
  CAFF9A:[near(.72*150,108),near(g2(4.25,4879),3.7),near(v1(23.71),11.86),near(yrJ/yrS,2.5),near(V(12104,6794),2)],
  '0178B8':[.238>.079,2.77*(1-.230)>1.67&&2.77*(1+.230)<4.95,.185===.256,near(3*3e20/(4*Math.PI*265e3**3),300),Math.sqrt(6.67e-11*1.4e19/1e5)>8000],
  '18745E':[1.1e18>3e20,near(2.42,1),.230>.089,2.68*(1-.256)>1.67&&2.68*(1+.256)<4.95,Math.sqrt(2*6.67e-11*8.7e20/466e3)>11000],
  '78136E':[Math.sqrt(2*6.67e-11*3e20/265e3)>11000,near(2.65*150,397.5),.256>.077,2.42*(1-.202)>1.67&&2.42*(1+.202)<4.95,near(3*1.1e18/(4*Math.PI*54e3**3),700)],
  '48B3FB':[life('K')>life('B'),L('B')<L('K'),rhoGiant<rhoWD,false,L('B')>L('M')],
  F6D4F5:[temp.G>temp.B,false,3300>7500,rhoWD>rhoMS,life('K')>life('O')],
  '7445B5':[near(temp.G/temp.A,2),true,rhoWD<rhoGiant,3300>7500,life('K')>life('B')],
  E5D5EA:[life('B')>life('G'),temp.F<temp.A,4100>10000,true,rhoGiant>rhoWD],
  F49E67:[rhoGiant>rhoWD,life('G')>life('B'),rhoGiant<rhoWD,false,L('G')<L('B')],
  '258565':[rhoWD>rhoMS,life('O')>life('M'),temp.G>temp.O,false,true],
  E470FE:[-2.5*Math.log10(10)<0,life('F')>life('O'),false,false,rhoMS<rhoGiant],
  D7CA77:[true,rhoGiant<rhoWD,false,life('A')>life('K'),false],
  AA7C14:[11200<4000,life('K')>life('A'),false,rhoMS<rhoWD,false],
  '9FBD16':[life('G')>life('B'),-2.5*Math.log10(10)>0,L('O')<L('G'),rhoGiant>rhoWD,true],
  '60B3E4':[temp.G>temp.A,true,rhoWD<rhoGiant,3300>7500,life('K')>life('B')],
  '90B567':[false,false,rhoGiant<rhoWD,true,life('B')>life('G')],
  // Stellar-region decisions manually read against FIPI temperatures/radii and the school HR diagram.
  E64716:[true,3.3e-6>1.4,true,8200===6000,5100>30000],
  '5847E4':[11000<6000,true,true,25000===6000,false],
  D12964:[3500===14000,true,near(6000/9350,1.5),3100<3500,false],
  FB7489:[false,near(6500/6000,2),true,false,true],
  B9F988:[false,true,3600===6000,3400===30700,true],
  AD928E:[11200>=10000&&11200<30000,false,4e-4>1.4,false,true],
  '0DE7B3':[5730>=30000,true,false,1.75e6>1.4,false],
  D18C15:[3400===30700,false,true,3100>6000,true],
  C44BE8:[3.3e-6>1.4,true,false,true,11200<6000],
  '060061':[false,11200===6000,true,3400===30700,true]
 };
 const ids=catalog.filter(t=>t.type?.startsWith('astronomy.')||t.type==='quantum-change.analysis').map(t=>t.id).sort();
 assert.equal(ids.length,44);assert.deepEqual(Object.keys(cases).sort(),ids);assert.deepEqual(Object.keys(truth).sort(),ids);
 for(const id of ids){const c=cases[id],calculated=truth[id].flatMap((x,i)=>x?[String(i+1)]:[]).join('');assert.equal(calculated,c.expected,id);assert.equal(c.steps.length,5);assert.equal(records[id].answer,calculated);}
 assert.ok(records.FBEB89.solution.includes('∛T'));
 assert.ok(records['31FE3F'].solution.includes('1,66'));
 assert.ok(records.C44BE8.solution.includes('именно этой таблицы'));
 return true;
}
module.exports={verifyPhysics};
