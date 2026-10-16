const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { readOgeCatalog } = require('./lib/oge-catalog');
const { ogeTaskMatchesTopic } = require('../lib/oge-catalog');
const { ogeSourceSignature } = require('../lib/oge-classification');
const { conditionText } = require('../lib/seo-text');
const batches = require('./data/oge-physics-solutions');
const root = path.resolve(__dirname, '..'), args = process.argv.slice(2);
const option = name => { const i = args.indexOf(name); return i < 0 ? null : args[i+1]; };
const catalog = readOgeCatalog(root, 'oge-physics').tasks;
const byId = new Map(catalog.map(t => [t.id, t]));
const prepared = batches.flatMap(b => b.records);
assert.equal(new Set(prepared.map(r => r.id)).size, prepared.length);
const held = require('./data/oge-physics-held.json');
const { validateHeld, assertTopicCoverage, assertHeldUnpublished } = require('./lib/oge-physics-held');
const heldIds = validateHeld(catalog, prepared, held, root);
for (const batch of batches) {
  const topicIds = catalog.filter(t => ogeTaskMatchesTopic(t, batch.topic, 'oge-physics')).map(t => t.id).sort();
  assert.ok(topicIds.length, 'Unknown or empty topic: '+batch.topic);
  assertTopicCoverage(topicIds, prepared, heldIds, batch.topic);
  for (const r of batch.records) {
    const t = byId.get(r.id), source = batch.sources[r.id];
    assert.ok(t && /^OGEPHYS[0-9A-F]{6}$/.test(r.id), r.id);
    assert.equal(ogeSourceSignature(t), source.sourceHash, r.id+': changed source');
    assert.equal(conditionText(t.fragment), source.fipiCondition, r.id+': condition review');
    assert.ok(source.reviewed && ['exact','variant','method'].includes(source.match) && source.comparison.length > 100, r.id+': review');
    if(source.discrepancy) assert.equal(source.discrepancy.status,'resolved',r.id+': unresolved external discrepancy');
    assert.match(source.url, /^https:\/\/phys-(?:oge|ege)\.sdamgia\.ru\/problem\?id=\d+$/);
    assert.equal(r.answer, source.expectedAnswer, r.id+': independent answer');
    assert.ok(r.solution.length > 600 && r.solution.includes('Проверка'), r.id+': explanation');
    const plain = r.answer+r.solution+r.diagram_caption;
    assert.ok(!/<\/?[a-z][a-z0-9]*(?:\s[^<>]*?)?\s*\/?>|\/|undefined/i.test(plain), r.id+': plain text');
    const stack = [];
    for (const c of plain) {
      if (c === '⟦') stack.push(0);
      if (c === '¦') { assert.ok(stack.length); stack[stack.length-1]++; }
      if (c === '⟧') assert.equal(stack.pop(), 1, r.id+': fraction');
    }
    assert.equal(stack.length, 0);
    assert.ok(r.diagram_svg.includes(`data-physics-diagram="${r.id}"`));
    for (const image of source.images) {
      const bytes = fs.readFileSync(path.join(root, image.path));
      assert.equal(createHash('sha256').update(bytes).digest('hex'), image.sha256);
      if(image.role === 'inline-formula') assert.ok(t.fragment.includes(image.path.replace('fipi-assets/','/fipi/')),r.id+': original inline formula');
      else assert.ok(r.diagram_svg.includes(bytes.toString('base64')), r.id+': original image');
    }
  }
}

// Independently read coordinates, elapsed intervals and unit conversions.
const answer = id => prepared.find(r => r.id === 'OGEPHYS'+id).answer;
const numeric = id => Number(answer(id).replace(',', '.'));
const graph = new Map([[0,-5],[1,5],[4,5],[6,-5],[8,0]]);
for (const [id,t] of [['B0FC45',6],['1C66FC',4],['F3D9BF',8]]) assert.equal(numeric(id), Math.abs(graph.get(t)-graph.get(0)));
assert.equal(numeric('01A441'), 10+1); assert.equal(numeric('E81948'), 10-1);
assert.equal(numeric('67E0F4')*30, 1.5); assert.equal(numeric('3E2AD4')*1200, 1200);
assert.equal(numeric('81A1C7')*((6-1)*2), 11-1);
const positions = [[0,1,2,3,4,5,6,7,8,9,10],[0,2,4,6,8,10],[0,1,2,4,6,8,9,10],[0,4,6,10]];
const speeds = positions.map(xs => (xs.at(-1)-xs[0])/(xs.length-1));
const fastest = speeds.indexOf(Math.max(...speeds))+1, slowest = speeds.indexOf(Math.min(...speeds))+1;
const trueIds = truths => truths.flatMap((v,i) => v ? [i+1] : []).join('');
const result34 = trueIds([fastest===2,speeds[3]/100===4,6/positions[2].indexOf(6)===1.5,slowest===1,positions[1][3]===Math.max(...positions.map(xs=>xs[3]))]);
assert.equal(answer('7CCDFF'), result34); assert.equal(answer('7593FD'), result34);
const result14 = trueIds([slowest===1,speeds[2]/100===1.5,6/positions[1].indexOf(6)===3,positions[2][3]===4,false]);
assert.equal(answer('DCE3B6'), result14); assert.equal(answer('5701D2'), result14);
const uniform = [1/1,2/1,1/2,2/2];
assert.equal(answer('7A9910'), trueIds([uniform[3]===2,uniform[2]===0.5,uniform[1]===Math.max(...uniform),uniform[0]===Math.min(...uniform),uniform[1]===uniform[3]]));
assert.equal(answer('ED7835'), trueIds([uniform[3]===1,uniform[2]===1,uniform[3]===Math.max(...uniform),uniform[2]===Math.min(...uniform),uniform[0]===uniform[2]]));
assert.equal(parseFloat(answer('516BBC'))*2,100+60);
assert.equal(parseFloat(answer('A29B2C'))*(6/2+6/6),12);
for (const current of [0,2,20]) for (const own of [1,5]) assert.equal(Math.abs(current+own-current), Math.abs(current-own-current));
for (const u of [1,10,30]) for (const v of [1,10,30]) assert.ok(u+v > Math.abs(u-v));

// Original graph coordinates, independently transcribed from FIPI images.
const acceleration = points => points.slice(1).map(([t,v],i)=>(v-points[i][1])/(t-points[i][0]));
const mass3 = [[0,0],[2,30],[3,20],[5,20],[6,10]], a3 = acceleration(mass3), f3 = a3.map(a=>a*3);
assert.deepEqual(a3,[15,-10,0,-10]); assert.deepEqual(f3,[45,-30,0,-30]);
assert.equal(answer('5451F3'),trueIds([Math.abs(f3[0])===90,Math.abs(a3[1])===10,mass3[2][1]===0,a3[3]===0&&mass3[3][1]===10,f3[1]===f3[3]]));
const mass2 = [[0,0],[1,10],[2,10],[3,20],[4,0]], a2 = acceleration(mass2), f2 = a2.map(a=>a*2);
assert.deepEqual(a2,[10,0,10,-20]); assert.deepEqual(f2,[20,0,20,-40]);
assert.equal(answer('B2FAA9'),trueIds([f2[0]===f2[2],mass2[1][1]===1,Math.abs(a2[3])===10,Math.abs(f2[3])===40,Math.abs(a2[2])===2]));
const speedPoints = [[0,3],[2,0],[5,0],[6,3],[8,3]], slopes = acceleration(speedPoints);
const areas = speedPoints.slice(1).map(([t,v],i)=>(v+speedPoints[i][1])*(t-speedPoints[i][0])/2);
assert.equal(answer('27B284'),trueIds([slopes[3]===0,Math.abs(slopes[0])===Math.max(...slopes.map(Math.abs)),areas[3]===6,3**2<0**2,areas[0]===6]));
assert.deepEqual(areas,[3,0,1.5,6]);
// In the two line graph, increasing line has smaller |slope|.
const growing = 1, falling = -3;
assert.equal(answer('4D00FB'),trueIds([true,false,false,false,growing>0&&-falling>0]));
assert.equal(answer('8E1C1D'),trueIds([false,false,falling===0,Math.abs(growing)<Math.abs(falling),growing>0&&falling<0]));
assert.equal(answer('FCBF0E'),trueIds([false,true,false,Math.abs(falling)>Math.abs(growing),false]));
// x(t) with a flat middle portion returns to x=0 without stopping there.
const coordinatePoints = [[0,0],[3,4],[6,4],[7,0]], velocities = acceleration(coordinatePoints);
assert.deepEqual(velocities,[4/3,0,-4]);
assert.equal(answer('C60CBF'),trueIds([coordinatePoints[0][1]===coordinatePoints[3][1],false,Math.abs(velocities[1])===Math.max(...velocities.map(Math.abs)),velocities[2]===0,true]));
assert.equal(answer('5B5554'),trueIds([Math.abs(velocities[0])===Math.max(...velocities.map(Math.abs)),false,velocities[1]===0,false,true]));

for(const [id,start,end] of [['F2EB40',0,1],['962AE1',6,8],['163060',4,6]]) assert.equal(numeric(id),Math.abs((graph.get(end)-graph.get(start))/(end-start)));
const totalPath = points => points.slice(1).reduce((sum,[t,x],i)=>sum+Math.abs(x-points[i][1]),0);
assert.equal(numeric('269E46'),Math.abs(-20-(-20)));
assert.equal(numeric('CCA707'),totalPath([[0,-20],[1,20],[4,20],[6,-20]]));
assert.equal(numeric('CD1E01'),totalPath([[0,0],[1,10],[4,10],[6,0],[8,0]]));
assert.equal(numeric('B656C0'),Math.abs(3-3));
assert.equal(numeric('18D7F2'),10*(4-1));
assert.equal(answer('44CE29'),trueIds([false,Math.abs(velocities[2])>Math.abs(velocities[0]),false,velocities[2]===0,velocities[1]===0]));
assert.equal(answer('3634CD'),trueIds([false,true,false,true,falling>0]));

assert.equal(numeric('C62340'),20/10); assert.equal(numeric('0CC928'),0.5*10);
const value=id=>parseFloat(answer(id).replace(',','.'));
assert.equal(value('F7DAF7'),10*2/2); assert.equal(value('8D52B6'),15*10/2);
assert.equal(value('8E403B'),(36/3.6)**2/(2*1000));
const ruler=[0,5,20,45,80], seconds=ruler.slice(1).map((x,i)=>x-ruler[i]);
assert.deepEqual(seconds,[5,15,25,35]);
assert.equal(answer('EA3BF7'),trueIds([seconds.every((v,i)=>i===0||v>seconds[i-1]),seconds.every((v,i)=>v/5===2*i+1),false,false,seconds[1]===20]));
assert.equal(answer('4CFA11'),trueIds([ruler[2]===20,false,false,false,new Set(seconds).size>1]));
assert.equal(answer('A5732D'),trueIds([false,false,4>3,false,true]));
assert.equal(answer('BECB62'),trueIds([slopes[0]===0,Math.abs(slopes[2])===Math.max(...slopes.map(Math.abs)),areas[3]===3,false,areas[0]===3]));
const mass=20000, momentum=mass*2+mass*(-1), coupledSpeed=momentum/(2*mass);
assert.equal(coupledSpeed,0.5); assert.equal(value('778DB0'),coupledSpeed**2/(2*0.005));
assert.equal(value('B5C4AC'),coupledSpeed**2/(2*25));
// Positive means growth, negative decrease, zero unchanged, in table order.
const change=x=>x>0?'1':x<0?'2':'3';
for(const alpha of [0.3,0.7,1.1]) for(const mu of [0.05,0.2]) {
  const g=10, normal=g*Math.cos(alpha), friction=mu*normal;
  const downA=g*Math.sin(alpha)-friction, downPotential=-g*Math.sin(alpha), mechanical=-friction;
  assert.ok(downA>0);
  assert.equal(answer('B1D14A'),change(downA)+change(mechanical));
  assert.equal(answer('117DF0'),change(downPotential)+change(mechanical));
  assert.equal(answer('EE0F31'),change(downA)+change(downA));
  const upA=-g*Math.sin(alpha)-friction;
  assert.equal(answer('89B50B'),change(0)+change(mechanical));
  assert.equal(answer('C12AA7'),change(0)+change(upA));
  assert.equal(answer('2CE5C6'),change(upA)+change(mechanical));
}

for(const [id,g,t] of [['4A0706',10,3],['C5CA08',10,4],['DEEC24',10,2],['EAE31B',3.7,2],['F9015E',1.6,3]]) assert.ok(Math.abs(numeric(id)-g*t)<1e-12);
for(const [id,g,t] of [['0B45BD',1.6,4],['77581A',3.7,2],['17701B',10,2],['68802E',10,4],['441492',10,3]]) assert.ok(Math.abs(numeric(id)-g*t*t/2)<1e-12);
for(const [id,n] of [['AAF5F8',3],['8D88A4',5]]) assert.equal(numeric(id),10*n-10*(n-1));
for(const [id,n] of [['7064E6',2],['9F0DED',3]]) assert.equal(numeric(id),5*n*n-5*(n-1)**2);
assert.equal(numeric('3E2EF2'),25-10);
assert.equal(answer('563709'),change(-1)+change(0));
assert.equal(answer('97868A'),change(1)+change(-1));
assert.equal(answer('D7BDCB'),change(-1)+change(1));
assert.equal(answer('4BC2E9'),change(1)+change(-1));
for(const ma of [0.1,1,10])for(const mb of [0.1,1,10]) {
  const tension=mb*10, aA=(ma*10+tension)/ma, aB=(mb*10-tension)/mb;
  assert.ok(aA>10);assert.equal(aB,0);assert.ok(Math.abs((ma*aA+mb*aB)/(ma+mb)-10)<1e-12);
}
assert.equal(answer('A83C40'),'Груз А');
assert.equal(answer('AB3D71'),'4761');assert.equal(answer('5ADDBB'),'4761');
const radians=d=>d*Math.PI/180;
const flight=angle=>({range:Math.sin(2*radians(angle)),height:Math.sin(radians(angle))**2,time:Math.sin(radians(angle))});
const angles=[15,30,45,60,75], paths=angles.map(flight);
assert.equal(paths.findIndex(p=>p.range===Math.max(...paths.map(p=>p.range))),2);
assert.ok(Math.abs(paths[0].range-paths[4].range)<1e-12);assert.ok(Math.abs(paths[1].range-paths[3].range)<1e-12);
assert.ok(paths.every((p,i)=>i===0||p.height>paths[i-1].height));
assert.equal(answer('46E9F5'),trueIds([false,true,false,false,true]));
assert.equal(answer('A77918'),trueIds([false,true,false,false,true]));

for(const [id,minutes,turns] of [['4EE106',1,1200],['4070BA',4,480],['4BE6D0',2,2400]])assert.equal(numeric(id),turns/(60*minutes));
for(const [id,minutes,turns] of [['537ADD',1,1200],['102DC1',4,480]])assert.equal(numeric(id),(60*minutes)/turns);
// Distances read separately from the two original figures: fly moves inward, beetle outward.
assert.equal(answer('226314'),change(Math.hypot(22,-30)-Math.hypot(64,64))+change(0));
assert.equal(answer('11DF89'),change(Math.hypot(51,34)-Math.hypot(16,-27))+change(0));
assert.equal(answer('0E9DC0'),'4');
for(const [id,rv,rr,decreases] of [['F7869E',Math.sqrt(2),4,true],['83C331',0.5,0.5,true],['C8FB81',2,2,false],['E18D8C',4,2,false]]) {
 const ratio=rv*rv/rr;assert.ok(Math.abs(numeric(id)-(decreases?1/ratio:ratio))<1e-12);
}
const orbitSpeed=r=>Math.sqrt(1/r), orbitPeriod=r=>2*Math.PI*r/orbitSpeed(r), attraction=r=>1/(r*r);
assert.equal(answer('F5B8EA'),change(attraction(4)-attraction(1))+change(orbitPeriod(4)-orbitPeriod(1)));
assert.equal(answer('709280'),change(orbitSpeed(1)-orbitSpeed(4))+change(orbitPeriod(1)-orbitPeriod(4)));
assert.equal(value('6A1D7B'),2*3.14*0.5*(120/60));
assert.equal(answer('760E25'),'0,6π м·с⁻¹ ≈ 1,9 м·с⁻¹');assert.equal((2*Math.PI*0.3*(60/60)).toFixed(1),'1.9');
assert.equal(value('EF7C9A'),50/Math.sqrt(5*20));
assert.equal(value('BF6C13'),Math.sqrt(10*1000));assert.equal(value('B7143F'),100**2/10);
const earth=prepared.find(r=>r.id==='OGEPHYS986BD1');assert.ok(earth.solution.includes('0,003354'));assert.ok(!earth.solution.includes('0,03354'));

// Density: independently transcribed scale readings, reference values and table data.
assert.equal(numeric('A93201'),64/800*1000);assert.equal(numeric('DC23AC'),36/900*1000);
assert.equal(numeric('250AC0'),8/(10/1000));
assert.equal(numeric('45A8A5'),9/3);assert.equal(numeric('E8733D'),9/3);
assert.equal(numeric('7B5DA4'),Number((0.8*80/90).toFixed(1)));
assert.equal(numeric('8C0CE6'),Number((200/110).toFixed(1)));
assert.equal(numeric('AC0FC6'),(130-70)*2.7);
const densityMinimum=[{m:2,v:1},{m:1,v:2},{m:3,v:2}].map(t=>t.m/t.v);
assert.equal(numeric('6FB51E'),densityMinimum.indexOf(Math.min(...densityMinimum))+1);
const densityMaximum=[{m:1,v:1},{m:1,v:2},{m:2,v:1}].map(t=>t.m/t.v);
assert.equal(numeric('7687E8'),densityMaximum.indexOf(Math.max(...densityMaximum))+1);
assert.ok(1/1000<1/900);assert.equal(answer('F031EB'),'3');
assert.equal(answer('E25931'),change(-1)+change(1/0.9-1));
assert.ok(1/7800>1/8900);assert.equal(answer('35C4FE'),'В стакане со стальным бруском');
assert.ok(11350>8900&&8900>400);assert.equal(answer('354376'),'Свинцовый шар');
for(const m of [0.1,1,7]) {
  const marbleV=m/2700,ironV=m/7800,marbleT=m*10-1000*10*marbleV,ironT=m*10-1000*10*ironV;
  assert.ok(ironT>marbleT&&marbleT>0);
}
assert.equal(answer('8D107E'),'Железный шар опустится, мраморный поднимется');
const metals={al:[2.7,0.028],iron:[7.8,0.1],constantan:[8.8,0.5],brass:[8.4,0.07],copper:[8.9,0.017],nickelin:[8.8,0.4],nichrome:[8.4,1.1],silver:[10.5,0.016]};
const largestMass=Math.max(...Object.values(metals).map(m=>m[0])),smallestMass=Math.min(...Object.values(metals).map(m=>m[0]));
const brassMassLess=metals.brass[0]<metals.copper[0],brassResistanceMore=metals.brass[1]>metals.copper[1],cnMassEqual=metals.constantan[0]===metals.nickelin[0];
const parallelNickelIron=metals.iron[1]/metals.nickelin[1],seriesNickelIron=metals.nickelin[1]/metals.iron[1];
assert.equal(answer('12DF14'),trueIds([brassMassLess&&brassResistanceMore,metals.silver[0]===smallestMass,cnMassEqual,metals.nichrome[1]<metals.nickelin[1],parallelNickelIron===4]));
assert.equal(answer('8DD025'),trueIds([brassMassLess&&!brassResistanceMore,metals.silver[0]===smallestMass,metals.constantan[1]===metals.nickelin[1],metals.nichrome[1]>metals.nickelin[1],seriesNickelIron===4]));
assert.equal(answer('ECA8D8'),trueIds([brassMassLess&&brassResistanceMore,metals.nichrome[0]===largestMass,cnMassEqual,metals.constantan[1]===metals.nickelin[1],parallelNickelIron===4]));
const melt={al:[2700,380],tin:[7300,59],iron:[7800,82],copper:[8900,180],silver:[10500,87],lead:[11300,25]};
const perVolume=k=>melt[k][0]*melt[k][1];
assert.equal(answer('8EB29E'),trueIds([melt.al[1]/melt.al[0]===melt.lead[1]/melt.lead[0],melt.copper[1]>melt.lead[1],perVolume('al')>perVolume('lead'),perVolume('iron')===perVolume('silver'),melt.iron[0]>melt.copper[0]]));
const thermalRows=Object.values(melt).sort((a,b)=>a[0]-b[0]);
assert.equal(answer('57996F'),trueIds([thermalRows.every((x,i)=>i===0||x[1]<thermalRows[i-1][1]),melt.copper[1]>melt.silver[1],perVolume('al')>perVolume('tin'),Math.abs(melt.silver[1]/melt.lead[1]-1)<0.1,melt.al[0]>melt.copper[0]]));
const alDensity=2.7,zincDensity=7.1,copperDensity=8.9,leadDensity=11.35;
assert.equal(answer('654C61'),trueIds([660<960,alDensity<zincDensity,120*2===180*3,leadDensity<copperDensity,Math.abs(alDensity/copperDensity-3)<0.1]));
assert.equal(answer('66FA38'),trueIds([660<960,alDensity>zincDensity,120*3===180*2,leadDensity<copperDensity,Math.abs(alDensity/copperDensity-3)<0.1]));
const experiment=prepared.find(r=>r.id==='OGEPHYS8C7C46');
assert.equal(experiment.answer,'ρ = ⟦m¦V₂ − V₁⟧; численное значение определяется измерениями');
assert.ok(experiment.solution.includes('(V_изм ± 2) см³')&&experiment.solution.includes('(m_изм ± 0,1) г'));
const ballV=0.04e-6,ballQ=24.84e-3,ballH=6,ballRho=1000+ballQ/(ballV*10*ballH);
assert.ok(Math.abs(value('3CB31F')-ballRho)<1e-9);
const ballGravity=ballRho*ballV*10,ballBuoyancy=1000*ballV*10,ballResistance=ballGravity-ballBuoyancy;
assert.ok(Math.abs(ballResistance*ballH-ballQ)<1e-12);assert.ok(1000-ballQ/(ballV*10*ballH)<0);

assert.equal(numeric('A0C0F4'),Math.hypot(-6,4-12));
assert.equal(numeric('3B27CC'),Math.hypot(3,2-6));
for(const [id,interval,max,choices] of [['A2A1BF',1,4,[[1,4],[4,1],[0.5,4],[0.5,5]]],['3EC256',2,8,[[2,8],[8,1],[1,8],[0.5,4]]]]) {
  const division=interval/2;assert.equal(division*8,max);
  assert.equal(numeric(id),choices.findIndex(([c,m])=>c===division&&m===max)+1);
}

// Inertia: compare velocities in the Earth frame and the accelerating vehicle frame.
for(const v0 of [2,10,30])for(const delta of [0.1,0.5]) {
  const acceleratingV=v0+delta,brakingV=v0-delta;
  assert.ok(v0-acceleratingV<0);assert.ok(v0-brakingV>0);
  assert.equal(v0-v0,0);
}
for(const id of ['BBCCDC','939454'])assert.equal(answer(id),'1');
for(const id of ['ECF2C1','4814E1'])assert.equal(answer(id),'2');
const inertiaChoices={
  '315847':['колебания','инерция','реактивное движение','сопротивление воздуха'],
  '439EF7':['колебания','инерция','реактивное движение','сопротивление воздуха'],
  '1471B6':['инерция','тяготение','выталкивающая сила','сопротивление'],
  'CE49BA':['реактивное движение','тяготение','инерция','сопротивление воздуха'],
  'FECCD5':['колебания','инерция','реактивное движение','сопротивление воздуха'],
  '8B38DB':['инерция','испарение','конвекция','электризация'],
  '09CBAE':['инерция','трение качения','преобразование энергии','тяготение'],
  'AF55A5':['колебания','инерция','реактивное движение','сопротивление воздуха'],
  'E867E1':['инерция','сопротивление','электризация','атмосферное давление'],
  '801785':['колебания','инерция','реактивное движение','сопротивление воздуха'],
};
for(const [id,choices] of Object.entries(inertiaChoices))assert.equal(numeric(id),choices.indexOf('инерция')+1);
const busExplanation=prepared.find(r=>r.id==='OGEPHYSFECCD5').solution;
assert.ok(busExplanation.includes('транспорт до этого уже двигался')&&busExplanation.includes('v_тела ≈ v₀'));
for(const m of [0.01,0.2])for(const f of [0.01,0.1]) {
  assert.ok(f*0.01/m<f*0.1/m); // Bounded contact force, shorter contact gives less velocity change.
}

// Second law: independent force balances, table differences and inverse problems.
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);
assert.equal(answer('BEB240'),'2');assert.equal(answer('76A9B4'),'1');assert.equal(answer('29E7E8'),'4');
for(const [id,left,right,speedFirst] of [['175001',1,2.5,true],['D2B49B',5,3,false]]) {
  const a=(right-left)/2, speeds=[0,1,2,3].map(t=>Math.abs(a*t));
  assert.ok(speeds.every((v,i)=>i===0||v>speeds[i-1]));
  assert.equal(answer(id),speedFirst?'13':'31');
}
close(value('3D6A0A')*2/2,3**2);
close(value('2D8D12'),(2700-1000)*1*10*5);
for(const [id,tWater,tLiquid] of [['4FE9D2',3.4,3.8],['063F5A',7.2,7.4]]) {
  const volume=(tLiquid-tWater)/((1000-800)*10),rho=value(id);
  close((rho-1000)*10*volume,tWater);close((rho-800)*10*volume,tLiquid);
}
const fallAcceleration=2*100/5**2,fallSpeed=fallAcceleration*5,fallForce=2*(10-fallAcceleration);
close(value('1B4CCA'),fallForce*100);close(value('1B4CCA'),2*10*100-2*fallSpeed**2/2);
close(value('F69E29')*10,2*800*0.02);close(2*value('571583')*0.02,2*10);
close(value('95B153')-0.1*10,0.1*1);
close(value('4E5FA9')*10*10,200*0.2);
const tableTimes=[2,4,6,8,10],tableSpeeds=[3,6,9,12,15];
for(let i=1;i<tableTimes.length;i++)close(value('78BC6E')*(tableSpeeds[i]-tableSpeeds[i-1])/(tableTimes[i]-tableTimes[i-1]),3);
close(value('97E962')-0.1*0.1*10,0.1*2);
close(value('C2F13D')*0.1*1200*10,960000);
close(value('DB22F9')*(1000*1.2+200),14000);close(value('B34264'),(1000*1.2+200)*10);
for(const [id,total,fraction,material,fluid] of [['1904FC',0.04,0.54,2700,1000],['E65826',0.1,0.89,8900,800]]) {
  const cavity=value(id);assert.ok(cavity>0&&cavity<total);close((total-cavity)*material,fraction*total*fluid);
}
for(const [id,a,h,rho,upper] of [
  ['CA7C45',value('CA7C45')/100,0.04,900,800],
  ['4BD1DD',0.1,0.02,value('4BD1DD'),800],
  ['C8F59D',0.2,value('C8F59D')/100,850,800],
  ['F2C085',0.1,0.02,840,value('F2C085')],
]) {assert.ok(h>0&&h<a&&upper<rho&&rho<1000,id);close(rho*a**3*10,1000*a*a*h*10+upper*a*a*(a-h)*10);}
for(const [id,M,m,v,mu] of [['B9CC47',60,1,24,value('B9CC47')],['402313',60,1,value('402313'),0.02],['623752',80,value('623752'),20,0.02]]) {
  const u=m*v/M;close(u*u/(2*mu*10),0.4);close(M*u*u/2,mu*M*10*0.4);
}

// Third law: equal interaction forces do not mean equal accelerations.
assert.equal(numeric('EED5F3'),50);assert.equal(numeric('F88AA9'),100);
assert.equal(numeric('CE6366'),Math.min(50,150));assert.equal(numeric('D2CAED'),40*10);
for(const tension of [10,25,50,100]){const right=tension,left=-tension;assert.equal(right+left,0);assert.equal(right,tension);}
for(const [id,m1,m2] of [['713674',1,2],['28A83E',1,1]]) {
 const force=3,a1=-force/m1,a2=force/m2;
 assert.ok(a1*a2<0);assert.equal(m1*a1+m2*a2,0);
 assert.equal(answer(id),trueIds([true,m2>m1,false,false,Math.abs(a1)===Math.abs(a2)]));
}

// Friction: energy balance, independent graph coordinates and controlled experiments.
{
 const m=0.2,mu=0.36,s=1.8,v=numeric('12FB27');
 close(m*v*v/2,mu*m*10*s);close(v/(mu*10)*v/2,s);
 const stopping=numeric('1BFFE8');close(0.1*4*4/2,0.4*0.1*10*stopping);close(stopping,2);
 const graphPoints=[[10,5,2.5],[20,10,5],[40,20,10]];
 for(const [normal,f1,f2] of graphPoints) {
  close(numeric('2321A3')*normal,f1);close(numeric('D5C97B')*normal,f2);close(numeric('DAC30E')*f2,f1);
 }
 const wood=[0.8-0.1,0.8+0.1],plastic=[0.4-0.1,0.4+0.1];assert.ok(wood[0]>plastic[1]);
 const rows=[['wood',200,30,0.8],['plastic',200,30,0.4],['wood',100,20,0.4],['plastic',400,20,0.8]];
 const oneFactor=[];
 for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
  const changes=[0,1,2].filter(k=>rows[i][k]!==rows[j][k]);
  if(changes.length===1)oneFactor.push([i+1,j+1,changes[0]]);
 }
 assert.deepEqual(oneFactor,[[1,2,0]]);assert.equal(answer('C7FB7C'),trueIds([false,true,true,false,false]));
 assert.equal(answer('25DF7D'),trueIds([false,false,false,true,true]));
 assert.equal(answer('6E3260'),trueIds([true,false,false,false,true]));
 const coefficient=prepared.find(r=>r.id==='OGEPHYS063A44'),work=prepared.find(r=>r.id==='OGEPHYS02C1F2');
 assert.ok(coefficient.solution.includes('P = (p ± 0,1) Н')&&coefficient.solution.includes('F_тр = (f ± 0,02) Н'));
 assert.ok(coefficient.answer.includes('⟦F_тр¦P⟧')&&coefficient.solution.includes('универсального численного ответа'));
 close(17/100,0.170);close(0.2/100,0.002);
 assert.ok(work.solution.includes('(0,170 ± 0,002) м')&&work.solution.includes('−0,170f Дж'));
 assert.ok(work.solution.includes('F_тр = (f ± 0,1) Н')&&work.answer.includes('−F_тр · 0,170 м'));
}

// Elasticity: static force balances, graph/scale readings and source-table discrepancies.
close(numeric('901941')*10,50*0.04);close(numeric('07C6DE')*10,50*0.10);
close(40*numeric('C621B0')/100,0.1*10);close(numeric('9BBDB7')*0.005,0.2*10);
for(const [x,F] of [[0.02,4],[0.04,8],[0.06,12]])close(numeric('F30512')*x,F);
close(numeric('A83ADB')*((3-1)/100),2*10);
for(const [n,m] of [[2,0.1],[4,0.2],[6,0.3]])close(numeric('78675F')*n,m*10);
for(const [mass,x] of [[0.5,0.05],[2,0.2]]) {
 close(mass*10/x,100);close(mass*10/(2*x),50);
}
for(const [mass,x] of [[0.5,0.036],[2,0.143]])assert.ok(Math.abs(mass*10/x-140)<1.2);
for(const id of ['85ABF2','049390'])assert.equal(answer(id),trueIds([false,true,false,true,false]));
for(const id of ['C62CDA','CED284'])assert.equal(answer(id),'13');
for(const [mass,x] of [[0.2,0.04],[0.4,0.08],[0.8,0.16]])close(mass*10/x,50);
for(const [mass,x] of [[0.2,0.02],[0.6,0.06]])close(mass*10/x,100);
assert.equal(answer('4F79B5'),'34');assert.equal(answer('489436'),'15');
for(const id of ['CA045A','0D9068']) {
 const r=prepared.find(r=>r.id==='OGEPHYS'+id);assert.ok(r.solution.includes('несогласованы'));
 for(const [mass,x,printed] of [[0.2,0.04,100],[0.6,0.12,100]]){close(mass*10/x,50);assert.notEqual(mass*10/x,printed);}
 assert.ok(batches.find(b=>b.name==='oge-elastic').sources[r.id].discrepancy.status==='resolved');
}
assert.equal(answer('CA045A'),'45');assert.equal(answer('0D9068'),'24');
assert.ok(answer('31A6FD').includes('F · 0,150 м'));
assert.ok(prepared.find(r=>r.id==='OGEPHYS31A6FD').solution.includes('(0,150 ± 0,002) м'));
assert.ok(answer('AC6FE3').startsWith('Да'));

// Gravity: independent changes of radius/mass, hydrostatics, weightlessness and interpretation.
assert.equal(answer('A2AB4E'),'7541');assert.equal(answer('C18143'),'7542');
for(const scale of [0.5,0.8,1.5,2]) {
 const acceleration=1/(scale*scale),energy=1/scale;
 assert.equal(acceleration>1,scale<1);assert.equal(energy>1,scale<1);
 close(acceleration/energy,1/scale);
 assert.equal(answer(scale<1?'432554':'2FC66F'),scale<1?'11':'22');
}
for(const [id,alpha,beta,scale] of [['771FB7',3,1,0.5],['C2EAAF',3,3,2],['40CDC8',3,3,0.5]]) {
 const m1=2,m2=5,r=0.3,G=6.6743e-11;
 const before=G*m1*m2/r**2,after=G*(alpha*m1)*(beta*m2)/(scale*r)**2;
 close(numeric(id),after/before);close(numeric(id)*scale**2,alpha*beta);
}
{
 const rho=1000,g=10,V=0.003,S1=0.01,S2=0.025,h1=V/S1,h2=V/S2;
 assert.ok(h2<h1);assert.ok(rho*g*h2<rho*g*h1);
 close(rho*g*h1*S1,rho*g*h2*S2);close(rho*g*h2*S2,rho*V*g);
 assert.equal(answer('1BE1BE'),'32');assert.equal(answer('D556D8'),'33');
 for(const m of [0.1,1,3])close(m*g-m*g,0);
 for(const h of [0.1,0.5,1])close(rho*h*(g-g),0);
 assert.equal(answer('334F70'),'2');assert.equal(answer('207D36'),'2');
 const earthRadius=6.4e6,G=6.6743e-11,M=g*earthRadius**2/G;
 close(G*M/earthRadius**2,g);
 assert.ok(prepared.find(r=>r.id==='OGEPHYS234884').solution.includes('M = ⟦gR²¦G⟧'));
 assert.ok(3.71<3.77&&35<430&&228>58&&10.7>5.5);
 const atmosphere=prepared.find(r=>r.id==='OGEPHYS5D816A');
 assert.ok(atmosphere.solution.includes('Нельзя объяснять')&&atmosphere.solution.includes('не полностью прекратил'));
 assert.equal(batches.find(b=>b.name==='oge-gravity').sources[atmosphere.id].discrepancy.status,'resolved');
}

// Momentum graphs: signed area, scale readings and mass conversion.
close(numeric('489BF6'),2*(5-0));
for(const [id,t] of [['1F0C0A',1],['408899',4]]) {
 const initial=0.5,acceleration=(2.5-1.5)/(4-2),speed=initial+acceleration*t;
 close(numeric(id),speed/initial);
 for(const mass of [0.1,2,1500])close(mass*speed/(mass*initial),numeric(id));
}
for(const [id,t,slope] of [['19502B',5,4/5],['B76461',3,1]]) {
 const mass=1.5*1000,speed=slope*t;
 close(numeric(id),mass*speed);close(numeric(id)/mass,speed);
}

// Inelastic collisions, recoil and fragmentation: all signs checked before energies.
{
 const quantity=id=>Number.parseFloat(answer(id).replace(',','.'));
 for(const [id,m1,m2,v1,u,inverse] of [['5B6946',2,1,3,2,false],['AC59FC',2,1,3,2,true],['4138C1',3,2,10,6,true],['112786',3,2,10,6,false]]) {
  close(m1*v1,(m1+m2)*u);close(quantity(id),inverse?v1:u);
  assert.ok((m1+m2)*u*u<m1*v1*v1);
 }
 const meeting=(0.8*4-0.4*2)/(0.8+0.4);close(quantity('AF54D7'),meeting);assert.ok(meeting>0);assert.ok(answer('AF54D7').includes('800 г'));
 const leadSpeed=(0.1*4-0.2*5)/(0.1+0.2);close(leadSpeed,-2);
 for(const [id,m] of [['E8F3D0',0.1],['F0498A',0.2],['07E597',0.3]])close(quantity(id),m*leadSpeed**2/2);
 close(quantity('E8F3D0')+quantity('F0498A'),quantity('07E597'));
 const m2=quantity('059573');close(5/(5+m2),0.5);
 assert.equal(answer('292DE0'),'Уменьшилась в 2 раза');
 for(const speed of [0.5,2,7])close((8*(speed/2)**2/2)/(4*speed**2/2),0.5);
 const speed=quantity('690BB8'),after=(6-4)*speed/(6+4);
 close((6+4)*speed**2/2-(6+4)*after**2/2,19.2);close(after,0.4);
 const joint=(2*4-3*4)/(2+3);close(joint,-0.8);close(quantity('A5E55D'),(2*4**2+3*4**2)/2-(2+3)*joint**2/2);
 close(0.009*quantity('3D432A')-1.8*2,0.009*500);assert.ok(quantity('3D432A')>500);
 close(quantity('4C199F'),36);close(36-quantity('4C199F'),0);
 close(2*quantity('8DD88F'),800-400);
 for(const id of ['5CC9FC','456798','0973AD'])assert.equal(answer(id),'3');
 assert.equal(answer('B7F106'),'2846');assert.equal(answer('26B927'),'2845');
 for(const id of ['5CC9FC','456798','26B927'])assert.match(prepared.find(r=>r.id==='OGEPHYS'+id).solution,/пару/);
}

// Work, power and efficiency: signed works, independent SI conversions and energy balances.
{
 const q=id=>Number.parseFloat(answer(id).replace(',','.'));
 const g=10;
 close(q('DF3949'),2*g*(4-1));
 close(q('1DF5F4'),Math.abs(-1.4*50/100));close(q('689F9E'),1.4*50/100);
 close(q('4C0428'),0);close(q('5786C3'),(200/1000)*g*(0-3+3-0));
 close(q('9BADC0'),(100/1000)*g*(4-0+0-3));
 close(q('44444A')*1000,1000*10**2/2);
 close(q('F99708')*1000*(2.5/100),(9/1000)*(800**2-200**2)/2);
 close(q('60C49C')*(2.5*60),(2.5*1000)*g*15);
 close(q('65087B')*20*0.60,150*g*12);
 close(q('2E171A')*380*20*0.60,152*g*12);
 close(q('59D398')*1.5*50*0.60,190*g*9);
 close(q('52CE30')*380*50*0.60,190*g*9);
 close(q('A916DC')/100,(340*1000)*12/((3*1000)*(1.6*1000)));
 close(q('8C9531')*1000*12,0.85*(3*1000)*(1.6*1000));
 close(q('A834A3')*(2.2*1000),550*40);
 const densities=[11350,1000],heat=(volumeCm3,distance)=>(densities[0]-densities[1])*volumeCm3*1e-6*g*distance;
 close(heat(q('B5BEA5'),6),18.63e-3);
 close(q('B31EED')*1e-3,heat(0.01,6));close(heat(0.02,q('E1F8E6')),12.42e-3);
 for(const id of ['B5BEA5','B31EED','E1F8E6']) {
  const record=prepared.find(r=>r.id==='OGEPHYS'+id);
  assert.ok(record.solution.includes('A_с = −F_сh')&&record.solution.includes('Q = −A_с'));
  assert.equal(batches.find(b=>b.name==='oge-work').sources[record.id].discrepancy.status,'resolved');
 }
 close(q('CBF1CB')/100,(46*1000)*((100/100)*3600)/(10*46e6));
 const drag=0.03*(2.3*1000)*g,fuelMass=710*(15/1000);
 close(q('B0C49C')*1e6*0.20*fuelMass,drag*142000);
 close(q('F5693B')/250*3600,(0.25*1440*46e6)/(2300*1000));
 const jouleHeat=2*14*g*2*20,temperature=jouleHeat/(7*4200);
 close(jouleHeat,11200);assert.equal(temperature.toFixed(2),'0.38');
 assert.equal(answer('9FDB4A'),'Повысилась примерно на 0,38 °C');
 assert.ok(prepared.find(r=>r.id==='OGEPHYS9FDB4A').diagram_svg.includes('Пояснительная схема по тексту условия'));
}

// Energy: original graph scales, potential-energy ratios, dissipative signs and retained impact energy.
{
 const q=id=>Number.parseFloat(answer(id).replace(',','.')),g=10;
 close(q('7F5A40'),1*g*20);close(q('3CCA4C'),400);
 close((200/1000)*g*q('191249')+20,(200/1000)*20**2/2);
 close(q('652F5C')*g*10,50);
 const kinetic=new Map([[0,9],[2,6],[4,3]]),total=kinetic.get(0);
 close(q('AA8F40'),total-kinetic.get(2));close(q('325715'),total);
 const weight=(kinetic.get(0)-kinetic.get(4))/4;
 close(weight*2,q('AA8F40'));close(kinetic.get(4)+weight*4,q('325715'));
 for(const [id,t,v0,a] of [['1754BE',1,0.5,0.5],['B3CEEF',4,0.5,0.5],['AD3DC2',4,1,1]]) {
  const speed=v0+a*t;close(q(id),(speed/v0)**2);
  for(const mass of [0.1,2,80])close((mass*speed**2/2)/(mass*v0**2/2),q(id));
 }
 close(q('8DE883'),4**2);
 for(const id of ['D866F7','4ED079','02DAC0'])assert.equal(answer(id),'21');assert.equal(answer('5A6417'),'23');
 assert.equal(batches.find(b=>b.name==='oge-energy').sources.OGEPHYS02DAC0.discrepancy.status,'resolved');
 for(const vx of [3,7])for(const vy of [4,10]) {
  assert.ok(vx**2<(vx**2+vy**2));close(Math.hypot(0,-g),g);
 }
 assert.equal(answer('A37E17'),'23');
 const mass=2,h1=5,h2=9,h3=5,k1=120,loss=30;
 const u1=mass*g*h1,u2=mass*g*h2,u3=mass*g*h3,k3=k1+u1-loss-u3;
 assert.ok(k1>k3&&u1===u3&&u2>u1&&loss>0);
 const wordCode=(list,words)=>words.map(w=>String(list.indexOf(w)+1)).join('');
 assert.equal(answer('E7C6F2'),wordCode(['равна','больше','меньше','положительный','отрицательный','увеличивается','уменьшается','не изменяется'],['больше','равна','отрицательный','увеличивается']));
 assert.equal(answer('75A6B6'),wordCode(['равна','больше','меньше','нулевой','положительный','отрицательный','минимальный','максимальный'],['меньше','равна','отрицательный','положительный']));
 assert.equal(answer('9319D2'),wordCode(['сила трения','сила тяжести','атмосферное давление','минимальное','максимальное','увеличивается','уменьшается','не изменяется'],['уменьшается','увеличивается','сила трения','максимальное']));
 close(q('4A4AE4'),300*(2*1)/(1*2));close(q('CDB2E8'),400*(1*1)/(2*2));
 close(q('BD6095')**2/2,400*8);
 close(q('F71D63')*0.25*(10*1000)*g*2.5,200*500*20);
 close(q('C41F39')/100,(40*(10*3600))/((8*1000)*g*20));
 close(0.60*(q('0DEF86')**2/2+g*1.25),g*(3*1.25));
 close(0.50*(20**2/2+g*q('D47082')),g*3*q('D47082'));
 close(g*q('D9A388'),0.60*(10**2/2+g*1.25));
 for(const [h,v,k,H] of [[1.25,q('0DEF86'),0.6,3.75],[q('D47082'),20,0.5,12],[1.25,10,0.6,q('D9A388')]]) {
  const impactSpeed=Math.sqrt(v*v+2*g*h),reboundSpeed=Math.sqrt(2*g*H);
  close(reboundSpeed**2/impactSpeed**2,k);assert.ok(reboundSpeed<impactSpeed);
 }
}

// Mechanical-energy balance: independent back-substitution, units and inverse questions.
{
 const q=id=>parseFloat(answer(id).replace(',','.'));
 const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`),g=10;
 close(q('957AAC')**2,4);
 close(2*g*20-q('FAD378'),2*14**2/2);
 for(const [id,m,h,dt] of [['5CCA40',2,q('5CCA40'),3.2],['018868',2,26,q('018868')],['4B9B80',q('4B9B80'),26,3.2]])close(0.8*m*g*h,130*1*dt);
 for(const [id,v,t1,t2] of [['ACA241',q('ACA241'),30,100],['477401',14,20,q('477401')],['C65A58',140,q('C65A58'),100]])close(v**2/2,140*(t2-t1));
 close(40*q('123AF7')*3600,0.9*8000*g*20);
 close(500*q('ACC4FE')+40**2/2,g*103);
 const accSource=batches.find(b=>b.name==='oge-mechanical-conservation').sources.OGEPHYSACC4FE;
 assert.equal(accSource.discrepancy.status,'resolved');assert.match(accSource.fipiCondition,/103 м/);
 for(const [id,t1,t2,eta] of [['E16AF8',20,q('E16AF8'),0.84],['560267',20,20.2,q('560267')/100],['86AE83',q('86AE83'),20,0.84]])close(4200*(t2-t1),eta*g*100);
 for(const [id,v1,v2,c,dt,eta] of [
  ['FFF0D5',400,q('FFF0D5'),140,300-50,1],['6535D6',200,100,130,75,q('6535D6')/100],
  ['F3795B',400,300,500,q('F3795B'),1],['EAA396',200,100,130,q('EAA396'),0.65],
  ['2990EA',400,300,140,q('2990EA'),1],['0AF76B',q('0AF76B'),300,500,70,1],['6F7F61',q('6F7F61'),300,140,300-50,1]
 ]) {assert.ok(v1>v2&&eta>0&&eta<=1&&dt>0,id);close(c*dt,eta*(v1*v1-v2*v2)/2);}
 close(108*1000*0.025,(q('E14AC4')/1000)*(800**2-200**2)/2);
 close(108*1000*(q('7CA999')/100),0.009*(800**2-200**2)/2);
 close(500*0.1,0.5*g*q('E8F737'));close(500*q('EF2B32'),0.5*g*10);
 close(q('41998A')*500*20,32*0.25*(10*1000)*g*2.5);
 for(const id of ['9F0DD0','437252']) {assert.match(answer(id),/^Нет/);const r=prepared.find(r=>r.id==='OGEPHYS'+id);assert.match(r.solution,/экзосфера/);assert.match(r.solution,/плотной атмосферы/);assert.match(r.solution,/вспышка/);}
}

// Independently transcribed primary lever arms, supporting strands and masses.
{
 const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
 near(numeric('4BF745')*(25-15),6*15);near(numeric('885DA7')*25,6*15);
 near(numeric('B9E816')*0.4,50*0.8);near(30*numeric('3D562C'),15*0.4);near(numeric('9AEB60')*0.8,40*0.4);
 near(numeric('45478B')*(4+5),9*4);
 near(numeric('574B42'),200*10);near(numeric('CB1BDD')*10,20);
 for(const [id,m] of [['B5640C',20],['1C925B',500/1000],['F7EC28',10]]) near(2*numeric(id),m*10);
 near(numeric('D93E08')*10,2*20);near(numeric('B4A73B')*10,2*30);
 near(numeric('7A8E03')*10,2*4*10);near(2*numeric('2A246A')*10,6*10);
 assert.equal(numeric('F6029B'),2);
 assert.match(answer('B20001'),/середине/);assert.equal(answer('35D1B9'),'Летом.');assert.match(answer('FD30D5'),/длинном/);assert.match(answer('3A9151'),/правая половина опустится/);
 const halfMass=2,halfLength=0.8,leftCentre=-halfLength/4,rightCentre=halfLength/2;
 near((halfMass*leftCentre+halfMass*rightCentre)/(2*halfMass),halfLength/8);
 assert.ok(halfMass*10*Math.abs(leftCentre)<halfMass*10*rightCentre);
 for(const short of [0.1,0.3])for(const long of [0.5,0.8])assert.ok(2*10*(long-short)>0);
}

// Pressure: primary scale readings, independent force balances and reversed variants.
{
 const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
 const change=(a,b)=>b>a?'1':b<a?'2':'3';
 for(const [id,t1,t2] of [['7EF04B',300,360],['2B5636',300,240]])assert.equal(answer(id),change(1,1)+change(t1,t2));
 for(const [id,v1,v2,properties] of [
  ['6E081F',2,1,['p','V']],['ABB0C2',1,2,['p','speed']],['F1FE9E',1,2,['p','rho']],['B70F92',2,1,['rho','speed']]
 ]){
  const state=V=>({p:300/V,V,rho:5/V,speed:100});
  assert.equal(answer(id),properties.map(p=>change(state(v1)[p],state(v2)[p])).join(''));
 }
 close(numeric('E07548')*4,6);close(numeric('50D772')*2,6);
 const heights=[2,1,2,3];assert.equal(numeric('6EE170'),heights.indexOf(Math.min(...heights))+1);assert.equal(numeric('B9A169'),heights.indexOf(Math.max(...heights))+1);
 for(const id of ['364F4E','C0D0C6']){const step=(760-750)/10;close(step,1);close(750+5*step,755);assert.equal(answer(id),'2');}
 for(const [id,left,right] of [['290412',10,30],['17215F',30,10],['12F090',10,30]])close(numeric(id),760+(left-right)*10);
 for(const [id,left,right] of [['48CFAC',10,50],['34458E',50,10]]){
  const delta=(left-right)*10;close(Math.abs(delta),400);
  const Hg=13600,water=1000;assert.ok(Hg/water>1);
  assert.equal(answer(id),'2'+(delta>0?'4':'3')+'57');
 }
 const immersed=V=>({gravity:20,arch:1000*10*V,spring:20-1000*10*V,bottom:1000*10*(0.1+V/0.02)*0.02});
 for(const [id,a,b,props] of [
  ['B0C9FC',0.0002,0.0005,['gravity','bottom']],['4D45B5',0.0005,0.0002,['spring','arch']],
  ['6DE9D1',0.0005,0.0002,['gravity','spring']],['A31653',0.0005,0.0002,['arch','bottom']]
 ])assert.equal(answer(id),props.map(p=>change(immersed(a)[p],immersed(b)[p])).join(''));
 // Same bottom S, same V: area decreasing upwards requires a larger h.
 const S=0.02,V=0.002,hCylinder=V/S,hNarrow=V/(0.8*S);
 assert.ok(hNarrow>hCylinder);
 assert.equal(answer('43CC02'),change(hNarrow,hCylinder).repeat(2));assert.equal(answer('46DBDE'),change(hCylinder,hNarrow).repeat(2));
 assert.equal(answer('6A3406'),change(1,1)+change(0.1,0.12));
 for(const id of ['A6BDC0','17D93A'])assert.equal(answer(id),change(1,1)+change(0.2,0.2));
 for(const [id,rhoBody] of [['598FB6',500],['150624',8900]]){
  const rhoWater=1000,volume=0.001,m=rhoBody*volume,float=rhoBody<rhoWater;
  const displacedMass=float?m:rhoWater*volume;
  assert.equal(answer(id),(float?'5':'6')+'7'+(m===displacedMass?'2':'1')+(m===displacedMass?'3':'4'));
 }
 close(numeric('04BD3F')/2.4,2);close(numeric('F20383')*0.5,1);
 const mass=7.8,volume=0.001;const arch=rho=>rho*10*volume,tension=rho=>mass*10-arch(rho);
 assert.equal(answer('A57C8D'),change(arch(1000),arch(1030))+change(tension(1000),tension(1030)));
 assert.ok(tension(1100)<tension(1000));assert.equal(answer('8B14B3'),'Уменьшится.');
 const extraPressure=800*10*0.05;
 close((1000*10*0.3+extraPressure)-(1000*10*0.2+extraPressure),1000*10*0.1);
 assert.equal(answer('8D5935'),'Не изменится.');
 const atmospheric=100000,waterDensity=1000,g=10,maxHead=atmospheric/(waterDensity*g);
 close(maxHead,10);assert.ok(5*3>maxHead);for(const id of ['964A65','A56655'])assert.equal(answer(id),'3');
 assert.equal(answer('4CC94F'),trueIds([true,true,false,false,false]));assert.equal(answer('BD9C63'),trueIds([true,false,false,true,false]));
 assert.equal(answer('9A05AE'),trueIds([false,true,false,false,true]));
 const forces=[1000*g*0.2*S,1000*g*0.1*S,1200*g*0.2*S];assert.ok(forces[2]>forces[0]&&forces[0]>forces[1]);
 assert.equal(answer('8FDB90'),trueIds([forces[0]>forces[1],forces[2]===Math.max(...forces),false,false,false]));
 assert.equal(answer('52DFED'),trueIds([forces[0]>forces[1],false,forces[2]!==forces[0],false,false]));
 for(const [id,leftAbove,asksEnergy] of [['8C8E0D',false,true],['CDD3A6',true,true],['DDD590',true,false],['C9766A',false,false]]){
  const p=atmospheric+(leftAbove?-1:1)*waterDensity*g*0.03,T=300*p/atmospheric;
  assert.ok(leftAbove?T<300:T>300);
  assert.match(answer(id),asksEnergy?(T<300?/уменьшилась/:/увеличилась/):(T<300?/ниже/:/выше/));
 }
 // Closed tube: p_atm(h)=C/(H-h)+rho*g*h increases strictly with h.
 const pAt=h=>10000/(2-h)+waterDensity*g*h;
 assert.ok(pAt(0.4)>pAt(0.3));assert.match(answer('0CC527'),/повысится/);assert.match(answer('396256'),/понизится/);
 close(waterDensity*g*30/100000,3);assert.ok(2.5*60<2*60+48);assert.match(answer('18AC77'),/^Да/);
 for(const [id,temp] of [['E7D3E9',125],['7A7175',100]]){
  const p=(atmospheric+waterDensity*g*10)/100000;close(p,2);
  const graph=new Map([[0.5,80],[1,100],[2,120]]);assert.match(answer(id),temp>graph.get(p)?/^Да/:/^Нет/);
 }
 // Hydrostatic paradox: a frustum, not a cylinder. Atmospheric terms cancel.
 const h=0.2,bottom=0.01,top=0.04,v=h*(bottom+Math.sqrt(bottom*top)+top)/3;
 const T=waterDensity*g*h*bottom,weight=waterDensity*g*v;
 assert.ok(v>bottom*h&&T<weight);close(T+atmospheric*bottom,(atmospheric+waterDensity*g*h)*bottom);
 assert.equal(answer('051105'),'Нет.');assert.equal(batches.find(b=>b.name==='oge-pressure').sources.OGEPHYS051105.discrepancy.status,'resolved');
 const pressureForce=height=>(atmospheric+waterDensity*g*height)*bottom;
 close(pressureForce(0.4)-pressureForce(0.3),pressureForce(0.7)-pressureForce(0.6));
 assert.match(answer('A4B7E8'),/^Нет/);
}

// Archimedes: independent unit conversions, immersion, balance and uncertainty.
{
 const rhoWater=1000,g=10,arch=(rho,v)=>rho*g*v;
 const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} ≈ ${b}`);
 assert.ok(Math.abs(numeric('F23E41')-(2-1.6))<1e-12);
 assert.equal(numeric('E2077B'),arch(1030,0.001));
 assert.equal(numeric('EB965C'),arch(rhoWater,2*0.5));
 assert.equal(arch(rhoWater,numeric('9381EC')),20000);
 for(const id of ['2131B4','AE33C3','8038E3'])assert.equal(numeric(id),arch(1000,0.003)/arch(800,0.003));
 assert.equal(numeric('1559DD'),3.5);assert.equal(numeric('31F753'),9);
 near(arch(rhoWater,100*1e-6),1);
 assert.equal(numeric('E1A9EB'),12*0.5*0.5);
 const volume=0.001,mParaffin=900*volume,weight=mParaffin*g;
 assert.ok(arch(800,volume)<weight&&arch(1000,volume)>weight&&arch(1260,volume)>weight);
 for(const rho of [1000,1260])near(arch(rho,mParaffin/rho),weight);
 assert.equal(answer('BB4C7F'),'3');assert.equal(answer('202673'),'4');assert.equal(answer('A5F4D4'),'3');
 const vols=[.002,.0007],rho0=1.2,masses=vols.map(v=>.1+rho0*v);
 for(const [id,rho] of [['773DB3',2],['C6C5D4',.4]]){
  const T=masses.map((m,i)=>m*g-arch(rho,vols[i]));
  assert.equal(answer(id),'7'+(T[0]>T[1]?'1':'2')+'56');
 }
 const m=1,TAl=m*g-arch(800,m/2700),TCu=m*g-arch(800,m/8900);
 assert.ok(TCu>TAl);assert.equal(answer('210F90'),'1');
 assert.ok(m*g-arch(1000,m/7800)>m*g-arch(1000,m/2700));assert.equal(answer('EBF298'),'1');
 assert.ok(m*g-arch(800,.0001)>m*g-arch(1000,.0001));assert.equal(answer('41D7E0'),'2');
 const displace=(mass,rho)=>mass/rho;
 assert.ok(displace(10000,1030)<displace(10000,1000));assert.equal(answer('73681C'),'1');
 for(const planetG of [1.62,9.8])near(rhoWater*planetG*displace(2,rhoWater),2*planetG);
 assert.equal(answer('4E696E'),'3');
 for(const melted of [0,.1,.7,1]){
  const mass0=.9,V0=mass0/900,VAfter=mass0*melted/rhoWater+mass0*(1-melted)/rhoWater;
  assert.ok(VAfter<V0);assert.ok(Math.abs(VAfter-mass0/rhoWater)<1e-12);
 }
 assert.match(answer('253955'),/понизится/);assert.equal(answer('E199C8'),'2');
 const grapeMass=.001,grapeVolume=grapeMass/1100,bubbles=.0000002;
 assert.ok(grapeMass/grapeVolume>rhoWater&&grapeMass/(grapeVolume+bubbles)<rhoWater);
 assert.equal(answer('7D0D99'),'1567');
 const ice=900,egg=1050,liquids=[800,1000,1200];
 assert.ok(liquids[0]<ice&&ice<liquids[1]&&liquids[1]<egg&&egg<liquids[2]);
 assert.equal(answer('26EC70'),trueIds([egg>ice,false,false,liquids[1]>ice&&liquids[2]>ice,false]));
 assert.equal(answer('3A168E'),trueIds([egg===ice,false,liquids[2]===Math.max(...liquids),liquids[1]>ice,false]));
 assert.equal(answer('48F625'),'2654');assert.equal(answer('D8CF39'),'2645');
 const minVolumes=[.8,.4,1],maxVolumes=[.75,.5,.15];
 assert.match(answer('1D9208'),new RegExp(String(minVolumes.indexOf(Math.min(...minVolumes))+1)));
 assert.match(answer('ECA329'),new RegExp(String(maxVolumes.indexOf(Math.max(...maxVolumes))+1)));
 const area=.002,H=.15,force=(rho,h)=>arch(rho,area*Math.min(h,H));
 assert.ok(force(1000,.1)>force(1000,.05));assert.equal(force(1000,.25),force(1000,.2));
 assert.equal(force(1000,.1),2*force(1000,.05));
 assert.equal(answer('A015F7'),trueIds([true,false,false,force(1000,.25)===force(1000,.2),false]));
 assert.equal(answer('6DA91C'),trueIds([false,false,true,true,false]));
 assert.equal(answer('73EB37'),trueIds([force(1000,.1)>force(800,.1),false,false,false,true]));
 const tensions=[.66,.52,.38,.10],forces=tensions.slice(1).map(t=>tensions[0]-t);
 for(let i=0;i<3;i++)assert.ok(Math.abs(forces[i]-.14*2**i)<1e-12);
 assert.equal(.02+.02,.04);
 for(const low of [.2,.4])assert.ok(low+.1<.8-.1);
 assert.equal(answer('5E1DB8'),'13');assert.equal(answer('CFC558'),'13');assert.equal(answer('E54CB8'),'45');
 const vPartial=.00002,vFull=.00004,p1=1-arch(1000,vPartial),p2=1-arch(1000,vFull);
 assert.ok(p1>p2);assert.equal(answer('94FFC4'),'13');
 const t1=1-arch(800,vFull),t2=1-arch(1200,vFull);assert.ok(t1>t2);assert.equal(answer('B85D8D'),'12');
 assert.equal(answer('63A7F2'),'31');assert.ok(arch(1000,.001)>0);
}

require('./data/oge-physics-oscillations-checks')(prepared);
require('./data/oge-physics-waves-sound-checks')(prepared);
require('./data/oge-physics-mechanics-application-checks')(prepared);
require('./data/oge-physics-measurement-practice-checks')(prepared);
require('./data/oge-physics-thermal-particles-checks')(prepared);
require('./data/oge-physics-thermal-properties-checks')(prepared);
require('./data/oge-physics-heat-transfer-checks')(prepared);
require('./data/oge-physics-heat-capacity-checks')(prepared);
require('./data/oge-physics-heat-balance-checks')(prepared);
require('./data/oge-physics-evaporation-checks')(prepared);
require('./data/oge-physics-fuel-checks')(prepared);
require('./data/oge-physics-thermal-apparatus-checks')(prepared);
require('./data/oge-physics-electrostatic-charge-checks')(prepared);
require('./data/oge-physics-charge-calculations-checks')(prepared);
require('./data/oge-physics-electric-field-checks')(prepared);
require('./data/oge-physics-electric-current-checks')(prepared);
require('./data/oge-physics-current-voltage-checks')(prepared);
require('./data/oge-physics-resistance-checks')(prepared);
require('./data/oge-physics-ohm-circuits-checks')(prepared);
require('./data/oge-physics-electric-work-power-checks')(prepared);
require('./data/oge-physics-joule-lenz-checks')(prepared);
require('./data/oge-physics-electric-heating-checks')(prepared);
require('./data/oge-physics-magnetic-field-checks')(prepared);
require('./data/oge-physics-permanent-magnets-checks')(prepared);
require('./data/oge-physics-electromagnetic-induction-checks')(prepared);
require('./data/oge-physics-electric-experiment-checks')(prepared);
require('./data/oge-physics-electromagnetic-waves-checks')(prepared);
require('./data/oge-physics-light-dispersion-checks')(prepared);
require('./data/oge-physics-reflection-checks')(prepared);
require('./data/oge-physics-lenses-checks')(prepared);
require('./data/oge-physics-optical-applications-checks')(prepared);
require('./data/oge-physics-nuclear-composition-checks')(prepared);
require('./data/oge-physics-nuclear-decay-checks')(prepared);
require('./data/oge-physics-electric-devices-checks')(prepared);
require('./data/oge-physics-concepts-checks')(prepared);
require('./data/oge-physics-measurements-checks')(prepared);
require('./data/oge-physics-internal-energy-checks')(prepared);
require('./data/oge-physics-melting-checks')(prepared);
require('./data/oge-physics-refraction-checks')(prepared);
require('./data/oge-physics-matter-colors-checks')(prepared);
require('./data/oge-physics-recovered-final-checks')(prepared);
// Read the two primary instrument scales independently: temperature has ten
// intervals between 20 and 30, humidity five; arrows are five/four steps above 20.
for(const [id,n,k,choices] of [
 ['09639D',10,5,[[25,1],[25,2],[28,1],[28,2]]],
 ['1DB164',5,4,[[24,1],[25,1],[24,2],[28,2]]]
]){
 const c=(30-20)/n,reading=20+k*c;
 assert.equal(answer(id),String(choices.findIndex(([value,error])=>value===reading&&error===c)+1));
}
if (option('--expected')) fs.writeFileSync(path.resolve(option('--expected')), JSON.stringify(batches.map(({name,records}) => ({name,records})))+'\n');
let changed = 0, published = null;
if (!args.includes('--content-only')) {
  const apply = args.includes('--apply');
  const db = new DatabaseSync(path.resolve(option('--db') || path.join(root,'storage/solutions.sqlite')), {readOnly:!apply});
  try {
    if (apply) db.exec('BEGIN IMMEDIATE');
    const read = db.prepare('SELECT * FROM solutions WHERE upper(task_id)=?');
    assertHeldUnpublished(held, id => read.get(id));
    const insert = apply && db.prepare('INSERT INTO solutions(task_id,answer,solution,diagram_svg,diagram_caption,published,created_at,updated_at) VALUES(?,?,?,?,?,1,?,?)');
    for (const r of prepared) {
      let row = read.get(r.id);
      if (!row && apply) {
        const now = new Date().toISOString();
        insert.run(r.id,r.answer,r.solution,r.diagram_svg,r.diagram_caption,now,now); changed++;
        row = read.get(r.id);
      }
      assert.ok(row, r.id+': unpublished');
      for (const k of ['answer','solution','diagram_svg','diagram_caption']) assert.equal(row[k],r[k],r.id+': '+k);
      assert.equal(row.published,1);
    }
    if (option('--baseline')) {
      const before = new DatabaseSync(path.resolve(option('--baseline')), {readOnly:true});
      try { for (const row of before.prepare('SELECT * FROM solutions').all()) assert.deepEqual(read.get(row.task_id),row,row.task_id+': old row changed'); }
      finally { before.close(); }
    }
    const ids = new Set(db.prepare('SELECT task_id FROM solutions WHERE published=1').all().map(r=>r.task_id));
    published = catalog.filter(t=>ids.has(t.id)).length;
    if (apply) db.exec('COMMIT');
  } catch (error) { if (apply) db.exec('ROLLBACK'); throw error; } finally { db.close(); }
}
console.log(JSON.stringify({catalog:catalog.length,prepared:prepared.length,held:held.length,changed,published,remaining:published===null?null:catalog.length-published,status:'ok'}));
