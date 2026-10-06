const assert=require('node:assert/strict');const {records}=require('./physics-electro-analysis-graphs');
const expected={FC855A:'13','0CDA83':'24','415C45':'14',F72547:'14','209C4E':'12','675443':'14',C584F9:'24',C9D8FE:'13','22830F':'135',E51107:'23','2B1C7A':'45',C8E57E:'15','698775':'35',FE341D:'24','67371F':'35','86F713':'35',F4BE25:'25','2AD122':'25','9CFC20':'35',D86ED7:'25',D624D6:'245','5D79D1':'25','5171D2':'23',B7CA51:'13','18FD53':'34','5C7F5B':'12','76BB93':'34',B0F0EB:'12','62A5E0':'34',C0BD6C:'45',C22D32:'45'};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
function verifyPhysics(){
 assert.deepEqual(Object.keys(records).sort(),Object.keys(expected).sort());
 for(const r of Object.values(records)){assert.equal(r.answer,expected[r.id],r.id);assert.ok(r.solution.length>1000);assert.ok(!/undefined|NaN|\//.test(r.solution));for(let j=1;j<=5;j++)assert.ok(r.solution.includes(j+') '),r.id);}
 // Independent numerical checks use original values rather than generated fact labels.
 near(1/(8e-6),125000);near(1/(32e-6),31250);near(.5*.3*.006**2,5.4e-6);
 for(let j=0;j<=40;j++){const q=Math.cos(j*.1),i=Math.sin(j*.1);near(q*q+i*i,1);}
 near(.003*2/.001,6);near(.003*1/.001,3);near(.006*3/.001,18);near(.006*4/.002,12);
 near(.005*4/.003,20/3);near(.005*3/.002,7.5);
 near(.02*.5,.01);near(.5*.02*16,.16);near(.006*1.5,.009);near(.5*.004*16,.032);
 near((.8-.2)/20,.03);near((.2-.8)/10,-.06);near((5-1)/2,2);near((3-5)/2,-1);
 // The imprecise middle ordinate of 62A5E0 cannot affect the slope comparison.
 for(const middle of [.6,.65,.7])assert.ok((middle-.2)/10>(.8-middle)/20);
 near((4-(-4))/2,4);near((0-4)/2,-2);near((2-0)/1,2);near((-2-2)/2,-2);
 near(60*.3,18);near(18-60*.28,1.2);near(100/2,50);assert.ok(120*2.2>210&&100*2>160);
 assert.ok(Math.abs(Math.sin(70*Math.PI/180)/Math.sin(40*Math.PI/180)-1.47)<.01);
 // Fixed charge leaves the field invariant; fixed voltage does not.
 const epsS=2,q=3,U=4;for(const d of[1,2,4]){const C=epsS/d;near((q/C)/d,q/epsS);near((C*U)/U,C);}
 return true;
}
module.exports={verifyPhysics};
