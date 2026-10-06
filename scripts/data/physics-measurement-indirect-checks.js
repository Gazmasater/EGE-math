const assert=require('node:assert/strict');
const {records}=require('./physics-measurement-indirect');
// Ручной эталон: границы исходного измерения и результата, в мм либо г.
// Проверка интервалов не использует формулы генератора текста.
const expected={
 F13F4D:{N:20,total:[14,16],unit:'мм',value:'0,75',error:'0,05',bounds:[.7,.8]},
 '2EC822':{N:250,total:[34,36],unit:'мм',value:'0,140',error:'0,004',bounds:[.136,.144]},
 '617BD6':{N:40,total:[29,31],unit:'мм',value:'0,750',error:'0,025',bounds:[.725,.775]},
 B044CF:{N:150,total:[72,78],unit:'г',value:'0,50',error:'0,02',bounds:[.48,.52]},
 '6FB53E':{N:200,total:[50,70],unit:'г',value:'0,30',error:'0,05',bounds:[.25,.35]}
};
const near=(a,b,id)=>assert.ok(Math.abs(a-b)<1e-10,`${id}: ${a} != ${b}`);
function verifyPhysics(){
 assert.deepEqual(Object.keys(records).sort(),Object.keys(expected).sort());
 for(const[id,e]of Object.entries(expected)){
  const r=records[id],v=Number(e.value.replace(',','.')),d=Number(e.error.replace(',','.'));
  assert.equal(r.answer,`(${e.value} ± ${e.error}) ${e.unit}`,id);
  near(v-d,e.bounds[0],id+' lower');near(v+d,e.bounds[1],id+' upper');
  for(let j=0;j<2;j++)near(e.N*e.bounds[j],e.total[j],id+' original interval');
  near(d/v,(e.total[1]-e.total[0])/(e.total[0]+e.total[1]),id+' relative uncertainty');
  assert.equal(e.value.split(',')[1].length,e.error.split(',')[1].length,id+' decimal place');
 }
 assert.ok(records['617BD6'].solution.includes('(0,75 ± 0,03) мм'),'conservative rounding explained');
 assert.ok(records['2EC822'].solution.includes('35 мм'),'centimetres converted');
 return true;
}
module.exports={verifyPhysics};
