const assert=require('node:assert/strict');
const {mathExpression,evaluate,cmp}=require('./audit-oge-math-arithmetic');
const {conditionText}=require('../../lib/seo-text');
// Independently entered from the reviewed primary coordinate-line images.
const aBounds={F1F841:[3,3.5],'7C7947':[5.5,6],'8D164C':[5,5.5],DC38F4:[3,3.5],EFB5F8:[2.5,3],'98CD7C':[3.5,4],'69B952':[4,4.5],'97DD9C':[4.5,5],AEE26C:[4,4.5],'7A5F3E':[4.5,5],'7C3782':[6,6.5],'60DA89':[3.5,4]};
const pointData={'32F618':[100,19,4],DEB12D:[100,21,4],'973F29':[58,7,7],EA4E23:[73,14,5],DF4D5B:[92,9,9],E2C456:[63,11,5],'227CAA':[132,17,6],'1D51CF':[80,11,7],A9D8C0:[116,15,6],E2D291:[107,13,8]};
const half=value=>[BigInt(value*2),2n];
function checkFractionModel(task,record){
 const text=conditionText(task.fragment),body=task.fragment.split('varinats-block')[0];
 const values=Array.from(body.matchAll(/<(?:m:)?mfrac\b[^>]*>[\s\S]*?<\/(?:m:)?mfrac>/gi),m=>evaluate(mathExpression(m[0])));
 let options,kind;
 if(text.includes('Между какими целыми')){
  kind='between';assert.equal(values.length,1);const x=values[0];
  const intervals=Array.from(text.matchAll(/\d\) (\d+) и (\d+)/g),m=>[BigInt(m[1]),BigInt(m[2])]);assert.equal(intervals.length,4);
  options=intervals.flatMap(([lo,hi],i)=>{assert.equal(hi-lo,1n);return cmp([lo,1n],x)<0&&cmp(x,[hi,1n])<0?[i+1]:[];});
 }else if(text.includes('принадлежит отрезку')){
  kind='interval';assert.equal(values.length,4);const bounds=text.match(/отрезку \((\d+);(\d+)\)/);assert.ok(bounds);
  const lo=[BigInt(bounds[1]),1n],hi=[BigInt(bounds[2]),1n];
  options=values.flatMap((x,i)=>cmp(lo,x)<=0&&cmp(x,hi)<=0?[i+1]:[]);
 }else if(aBounds[task.id]){
  kind='fraction-point';assert.equal(values.length,4);const [lo,hi]=aBounds[task.id].map(half);
  options=values.flatMap((x,i)=>cmp(lo,x)<0&&cmp(x,hi)<0?[i+1]:[]);
  assert.ok(record.solution.includes('Точную координату по масштабу картинки не измеряем'));
 }else{
  kind='four-points';const [n,d,first]=pointData[task.id]||[];assert.ok(n&&d);
  const x=[BigInt(n),BigInt(d)];if(values.length){assert.equal(values.length,1);assert.equal(cmp(values[0],x),0);}
  options=[];for(let i=0;i<4;i++){const lo=half(first+i/2),hi=half(first+(i+1)/2);if(cmp(lo,x)<0&&cmp(x,hi)<0)options.push(i+1);}
 }
 assert.equal(options.length,1,task.id+': unique choice');assert.equal(record.answer,String(options[0]),task.id+': exact independent comparison');
 return kind;
}
function auditFractions(task,source,record){
 const kind=checkFractionModel(task,record);assert.equal(source.model.kind,kind);
 assert.ok(source.methodSource?.reviewed && source.methodSource.steps.length>80);
 if(['fraction-point','four-points'].includes(kind))assert.ok(source.visualReview?.reviewed);
}
module.exports={auditFractions,checkFractionModel};
