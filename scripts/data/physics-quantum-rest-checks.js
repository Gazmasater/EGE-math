const assert=require('node:assert/strict');
const {records}=require('./physics-quantum-rest');
const expected={B2864C:'2','5F1E18':'2',EEC920:'0,25',A0EAD1:'0,5','6BC6EA':'1,5','11546A':'2','4EF902':'2',E36955:'2',AF193C:'2','4C28C0':'0,5','84503D':'2',A1AF4F:'2,5',C0769E:'2','05D648':'1,5','5DD5B2':'360 нм',BFC0DC:'90','8A543D':'0,3 мг',C0A74E:'0,6 мкм','15E77F':'7,7 с',A32077:'90',E74B94:'450 нм','199FBE':'3,3 %','4C0353':'100 Вт','1C96FF':'0,5',F2E90B:'9 эВ','703B07':'4 эВ','45855A':'2','6138C2':'3',A7B3E5:'2,5',E78BBB:'2,7 эВ','0B312D':'0,54 мкм','40A8A6':'0,8 В','8A9F85':'1 В'};
const value=id=>Number(records[id].answer.match(/[\d,]+/)[0].replace(',','.'));
const near=(a,b,tol=1e-10)=>assert.ok(Math.abs(a-b)<=tol*Math.max(Math.abs(a),Math.abs(b),1e-40),`${a} != ${b}`);
function verifyPhysics(){
 const ids=require('./physics-completion-catalog.json').filter(t=>t.part===1&&['quantum.photons','quantum.atom'].includes(t.type)).map(t=>t.id).sort();
 assert.deepEqual(Object.keys(records).sort(),ids);assert.equal(ids.length,33);
 for(const id of ids)assert.equal(records[id].answer,expected[id],id);
 const h=6.6e-34,c=3e8,e=1.6e-19;
 // Обратные проверки ответа в законах, без вызова генератора решения.
 for(const id of ['B2864C','E36955','AF193C','84503D'])near(value(id)*.5,1);
 for(const id of ['5F1E18','4EF902','11546A','C0769E'])near(value(id),2);
 near(value('EEC920')*4,1);near(value('A0EAD1')*2,1);near(value('4C28C0')*2,1);
 near(value('6BC6EA')*5e14,7.5e14);near(value('A1AF4F')*.4,1);
 near(value('05D648'),1.5);near(value('5DD5B2')*1.5,540);
 assert.equal(value('BFC0DC'),90);near(value('8A543D')*8,2.4);
 near(1e19*h*c/(value('C0A74E')*1e-6),1100*.003);
 near(value('15E77F')*3e-14,5e5*h*7e14);
 near(value('A32077')*h*c/(.45e-6),1.98e-17*2);
 near(135*h*c/(value('E74B94')*1e-9),1.98e-17*3);
 near(value('199FBE')/100*100,1e19*h*c/(600e-9));
 near(value('4C0353')*.001,3e17*h*c/(594e-9));
 near(1+value('1C96FF'),600/400);
 near(value('F2E90B'),6+value('F2E90B')/3);
 near(value('703B07')+2,value('703B07')*1.5);
 near((3-1)/value('45855A'),3/1.5-1);near((2-1)/value('6138C2'),2/1.5-1);
 near((2*value('A7B3E5')-1)/(2-1),4);
 near((value('E78BBB')+.6)*e,h*8e14);
 assert.equal(Number((h*c/(h*7e14-e*.6)*1e6).toFixed(2)),value('0B312D'));
 assert.equal(Number((h*c/e*(1/400e-9-1/540e-9)).toFixed(1)),value('40A8A6'));
 near(1.6e-19+e*value('8A9F85'),(1.6e-19+e*3)/2);
 return {tasks:33,checks:'independent energy, photon count, power, photoelectric threshold, ratios, units and rounding'};
}
module.exports={expected,verifyPhysics};
