const assert=require('node:assert/strict');
module.exports=function checkOscillations(records){
 const answer=id=>records.find(r=>r.id==='OGEPHYS'+id).answer;
 const num=id=>Number(answer(id).replace(',','.'));
 const labels=['А','Б','В','Г'];
 // Independent transcriptions: [mass, stiffness] or [mass, length]. For the
 // unnumbered thread drawings, length values mark distinct groups only;
 // their ratios are never interpreted as measured lengths.
 const experiments=[
  ['F02544',[[1,1],[2,1],[1,2],[2,3]],0,['АГ','БВ','БГ','АБ']],
  ['0401F3',[[1,1],[4,1],[2,.25],[4,.25]],1,['ВГ','БВ','БГ','АГ']],
  ['1DD6F4',[[1,1],[2,1],[3,.5],[2,.5]],1,['АГ','БВ','БГ','ВГ']],
  ['5D6702',[[4,1],[4,.5],[1,.25],[1,1]],1,['АВ','АГ','БВ','ВГ']],
  ['A3830F',[[4,1],[4,.25],[1,.5],[1,1]],0,['АГ','БГ','БВ','ВГ']],
  ['EC2E0E',[[1,1],[2,1],[1,2],[2,3]],1,['АБ','АВ','АГ','БВ']],
  ['1DC8B5',[[1,1],[2,3],[1,2],[2,2]],0,['ВГ','БВ','АВ','АГ']],
  ['0F5326',[[1,1],[2,1],[1,.5],[2,.4]],0,['БГ','БВ','АГ','АБ']],
  ['62F954',[[1,1],[2,1],[1,.5],[3,.5]],1,['АБ','АВ','БВ','ВГ']],
  ['5ECAC3',[[1,1],[2,1],[1,3],[2,2]],1,['БГ','ВГ','АБ','АГ']],
  ['3FC18D',[[4,1],[4,.5],[1,.25],[1,1]],0,['АБ','АГ','БВ','ВГ']],
 ];
 for(const [id,data,varied,options] of experiments){
  const valid=options.flatMap((pair,i)=>{const [a,b]=[...pair].map(c=>data[labels.indexOf(c)]);return a[varied]!==b[varied]&&a[1-varied]===b[1-varied]?[i+1]:[];});
  assert.equal(valid.length,1,id+': ambiguous offered pair');assert.equal(answer(id),valid.join(''));
 }
 for(const [id,oppositeExtremeTime,frequency] of [['AB8CD8',.8,true],['BC06E9',.7,false],['8D7286',.4,true]]){
  const T=frequency?1/num(id):num(id);assert.ok(Math.abs(T/2-oppositeExtremeTime)<1e-12,id);
 }
 assert.equal(num('6199E2')/4,.5);
 // Read equal-sign extrema independently, including different phases and units.
 for(const [id,minima] of [['2A280D',[2,6]],['37F4D7',[.5,2.5,4.5]],['C8D96A',[2,6,10]]])
  for(let i=1;i<minima.length;i++)assert.equal(num(id)*(minima[i]-minima[i-1]),1,id);
 assert.equal(num('6FD3E7'),Math.abs(-2));assert.equal(num('72B468'),(6-(-6))/2);
 const change=(a,b)=>b>a?'1':b<a?'2':'3';
 const spring=x=>({potential:x*x,kinetic:1-x*x,speed:Math.sqrt(1-x*x),total:1});
 const start=spring(0),left=spring(-1),right=spring(1);
 assert.equal(answer('5A0F7E'),change(start.speed,left.speed)+change(start.potential,left.potential));
 assert.equal(answer('9829B9'),change(right.speed,start.speed)+change(right.potential,start.potential));
 assert.equal(answer('F7CF90'),change(right.kinetic,start.kinetic)+change(right.total,start.total));
 const hA=1-Math.cos(.3),hB=1-Math.cos(.6),E=2;
 assert.equal(answer('0CB4BB'),change(E-hA,E-hB)+change(hA,hB));
 assert.equal(answer('7843A5'),change(E,E)+change(hA,hB));
 assert.equal(answer('2BC0CE'),change(E-hB,E-hA)+change(hB,hA));
 const truth=a=>a.flatMap((x,i)=>x?[i+1]:[]).join('');
 const period1=4,period2=8,amplitude1=2,amplitude2=1,lengthRatio=(period2/period1)**2;
 assert.equal(answer('052807'),truth([amplitude1===2*amplitude2,period1===period2,lengthRatio<1,period2===2*period1,false]));
 assert.equal(answer('301A7A'),truth([period1===period2,period2<period1,1/period2===1/period1/2,4/1===4,lengthRatio<1]));
 assert.equal(answer('7E65EE'),truth([1/period1===2/period2,amplitude1===amplitude2,period1===2*period2,lengthRatio>1,false]));
 assert.equal(answer('0B8A6A'),truth([period2===2*period1,amplitude1===amplitude2,false,1/period2===2/period1,lengthRatio>1]));
 assert.equal(answer('A7BB62'),truth([amplitude1===2*amplitude2,period1===period2,lengthRatio>1,period2===period1/2,1/period2===4/period1]));
 const omega=2*Math.PI/4,x1=t=>Math.sin(omega*t),v1=t=>omega*Math.cos(omega*t),x2=t=>4*Math.cos(omega*t/2);
 assert.ok(Math.abs(x1(3)+1)<1e-12&&Math.abs(v1(3))<1e-12); // Д.
 assert.ok(Math.abs(x1(2))<1e-12&&Math.abs(x2(2))<1e-12); // Б.
 assert.ok(x2(1)**2>x2(2)**2); // Potential falls from А to Б.
 assert.equal(answer('007804'),'12');for(const id of ['59F45A','EEFCA9'])assert.equal(answer(id),'24');
 const amp=.05,T=2,f=1/T;
 assert.equal(answer('B01D17'),truth([false,f===.5,true,amp===.1,false]));
 assert.equal(answer('CDBE2A'),truth([false,f===2,false,amp===.05,true]));
 assert.equal(1/.25,4);assert.equal(2/1,Math.sqrt(1/.25));
 assert.equal(answer('549150'),'12');assert.equal(answer('6B455A'),'15');
};
