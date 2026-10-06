// Parameters and answers transcribed from the unchanged FIPI conditions.
const cases={};
const add=(id,kind,expected,ref,data)=>{if(cases[id])throw Error(id);cases[id]={kind,expected:String(expected),ref:String(ref),...data};};
// Average translational energy: the same ratio as absolute temperature.
for(const [id,t1,t2,ask,ref] of [
 ['2A4D4B',200,400,1,9308],['C306FD',200,600,2,9308],['575105',200,500,1,9308],
 ['8CBF1A',300,600,1,9308],['D2BF5C',250,500,2,9308],['4BADC2',600,200,2,29143],
 ['EBBFEA',150,450,1,9308],['0A2D3E',150,450,2,9308],['9BE634',500,250,1,29445]
])add(id,'temperature',ask===1?t1:t2,ref,{t1,t2,ask});
for(const [id,t1,t2,ref,celsius] of [
 ['A15641',140,280,50732,false],['A6655C',150,600,50732,false],
 ['4C6FA1',300,450,50732,true]
])add(id,'energy-ratio',String(t2>t1?t2/t1:t1/t2).replace('.',','),ref,{t1,t2,celsius});
add('A71656','energy-ratio',4,38047,{factor:4});
for(const[id,t1,t2,ask,ref]of[['DC7C46',800,200,2,20018],['1B362C',200,800,1,26719],['85478A',900,300,1,20018]])add(id,'temperature-difference',ask===1?t1:t2,ref,{t1,t2,ask});
for(const[id,factor,ask,expected]of[['54C671',5,'temperature',25],['918F36',3,'temperature',9],['02219A',4,'speed',2]])add(id,'speed',expected,35167,{factor,ask});
// n = concentration, e = average molecular energy (also proportional to T).
for(const[id,n,e,expected,p0,ref,thermal]of[
 ['9D4F49',1/3,2,120,180,38189,false],['9B7E46',5,1/2,'2,5',null,35324,true],
 ['767F05',2,1/3,200,300,38189,false],['625778',1,1/16,16,null,38189,false],
 ['497121',3,1/2,'1,5',null,8672,true],['7D6DA1',2,2,4,null,8672,true],
 ['D4E1A5',1,1.4,'1,4',null,38733,false],['F0E1C0',1/5,1/2,10,null,35324,true],
 ['87FFC6',2,1/4,2,null,35324,true],['6F45EE',1/3,1.5,30,60,38189,true],
 ['B1BE6D',4.5,1/1.5,3,null,8672,true],['3C0734',1/3,6,2,null,38733,false],
 ['302781',2,1/4,80,160,38189,false],['7ABC47',2,1/3,100,150,38189,false]
])add(id,'pressure',expected,ref,{n,e,p0,thermal});
for(const[id,p,e,expected]of[['3AB2B2',1/5,1/2,'2,5'],['66BE55',4,1/2,8],['CCB480',6,2,3]])add(id,'concentration',expected,id==='3AB2B2'?11931:32248,{p,e});
for(const[id,p,n,expected]of[['63F2AD',1/2,1/6,3],['4D0A9D',2,6,3]])add(id,'molecular-energy',expected,43110,{p,n});
add('772AAE','gas-temperature',900,39250,{p:3,n:1/2,t1:150});
for(const[id,p0,factor,expected]of[['480A51',40,3,100],['82225A',40,4,100],['8C933B',60,3,100],['890891',20,4,80]])add(id,'steam',expected,11553,{p0,factor});
for(const[id,nu1,nu2,tf,expected,ask,ref]of[
 ['AD774B',1,4,1/2,4,'amount-up',16849],['0F98F4',4,1,2,4,'amount-down',17653],
 ['CA98BA',1,4,1/2,2,'pressure',10466],['8BADC9',3,1,1/2,6,'pressure',10466],
 ['199792',3,2,1/2,3,'pressure',10466],['A1DD9C',3,2.4,1,240,'absolute-pressure',10466]
])add(id,'closed-volume',expected,ref,{nu1,nu2,tf,ask});
for(const[id,nu1,v1,v2,pf,tf,expected]of[
 ['03BD78',3,6,1,2,2,'0,5'],['38447B',1,1,2,1,2,1],
 ['A0FBDF',3,2,1,2,3,1],['4B93E3',1.5,3,6,1/2,1/2,3]
])add(id,'amount',expected,35193,{nu1,v1,v2,pf,tf});
add('8E16FE','volume',120,820,{nu1:1,nu2:3,v1:20,tf:2});
add('3845F2','isobaric',3,5221,{factor:3});
add('A11EAF','isothermal-volume',5,902,{factor:5});
add('C7526A','isothermal-pressure',3,9285,{factor:3});
add('AB117F','isothermal-difference',300,902,{factor:2,delta:300});
add('530821','isochoric-temperature',819,11790,{t1:273,t2:819,ask:2});
add('473250','isochoric-temperature',1890,32285,{t1:1890,t2:630,ask:1});
add('7F8167','isochoric-pressure',150,25024,{p1:100,t1:300,t2:450});
add('349197','isochoric-pressure-ratio','0,8',25024,{t1:400,t2:500});
add('5B8A38','isochoric-factor',4,11790,{factor:4});
add('67AF6A','isochoric-difference',75,32285,{factor:2,delta:75,ask:'pressure'});
add('0BFF12','isochoric-difference',300,32285,{factor:2,delta:300,ask:'temperature'});
for(const[id,p1,v1,t1,p2,v2,t2,ask,expected]of[
 ['B5155F',.5,6,1200,1,2,800,'p', '0,5'],['6F15E5',1,4,300,4,2,600,'p',1],
 ['6AB76B',1,4,300,.5,16,600,'v',16]
])add(id,'table',expected,835,{p1,v1,t1,p2,v2,t2,ask});
add('0A3E4F','piston-energy',3,29733,{gas1:'неона',gas2:'аргона',n1:1,n2:3,s1:'н',s2:'а'});
add('2B4653','piston-energy',1,29981,{gas1:'аргона',gas2:'неона',n1:1,n2:1,s1:'а',s2:'н'});
add('51DB62','piston-concentration',1,29981,{});
add('95F351','partition',1,29981,{});
add('192F48','melting','0,1',3525,{q:33000,lambda:330000});
add('FB590C','vaporization',200,10468,{mass:6,q1:400000,q2:1600000});
add('7DA290','vaporization',300,10468,{mass:.5,q1:50000,q2:200000});
// Coordinates below were read manually from all the original raster graphs.
add('5311FD','pv-ratio',2,43812,{p1:2,v1:4,p2:4,v2:1});
add('7EA666','pv-ratio',4,43812,{p1:3,v1:1,p2:4,v2:3});
add('5F4252','pv-temperature',500,36753,{p1:20,v1:3,p2:40,v2:3,t1:250,labels:'p₁ = 20 кПа; p₂ = 40 кПа; V₁ = V₂ = 3 м³.'});
add('B0ADE8','pv-temperature',250,43812,{p1:2,v1:2,p2:1,v2:1,t1:1000,labels:'p₁ = 2p₀; V₁ = 2V₀; p₂ = p₀; V₂ = V₀.'});
add('B86966','vt-pressure',25,50734,{p1:100,v1:1,v2:4,t:273});
add('8E6063','graph-section',1,7696,{axis:'V',process:'сжатие'});
add('6D9B38','graph-section',1,915,{axis:'p',process:'расширение'});
add('CFC43F','pt-temperature',405,8002,{t1:270,p1:.2,p2:.3});
add('79B504','graph-amount',2,5481,{v:.25,t:300,p:20000});
add('7C8A5D','adiabatic-graph',420,43812,{p1:4000,v1:1.5,p2:12000,v2:.7,t1:300});
add('0771EE','cycle-amount','0,24',4571,{p:6000,v:.1,t:300});
module.exports={cases};
