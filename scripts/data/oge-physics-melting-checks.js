'use strict';
const assert=require('node:assert/strict');
const sources=require('./oge-physics-melting-sources.json');
module.exports=prepared=>{
 const rows=new Map(prepared.map(r=>[r.id,r]));
 const row=id=>rows.get('OGEPHYS'+id),num=id=>Number(row(id).answer.replace(',','.'));
 const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
 // Direct transcription of primary graph endpoints in joules, independent of models.
 const plateaux={
  '01FB46':[300000,1050000,5],D22349:[200000,800000,3],
  '118304':[100000,400000,.4],'183EC7':[100000,400000,.5],
  '91C45E':[50000,300000,2]
 };
 for(const [id,[a,b,m]]of Object.entries(plateaux))close(num(id)*1000*m,b-a);
 for(const [id,a,b]of [['17F616',100000,400000],['8C34A1',500,3000],['1B44C6',200000,800000]])close(num(id)*1000,b-a);
 close(num('EFA1B6')*5,1050-300);
 const timed={A701F9:[1,3,500,1],'31011F':[5,15,50000,1000],'058ADC':[2,6,1000,1000],D96034:[5,20,1000,1000],F425A6:[10,50,8400,1000]};
 for(const [id,[a,b,p,unit]]of Object.entries(timed))close(num(id)*unit/p,b-a);
 close(num('1C82FB'),(9000/.5)/(3000/.5));close(num('BCE62F'),(6000/.1)/(3000/.1));
 close(num('3DFCF9')*1000*.1,9000);close(num('8853FD')*1000*.1,6000);
 const energy=[0,2.4,4.8,7.2,9.6,12],temperature=[50,150,250,250,250,250];
 const plateauStart=temperature.findIndex((v,i)=>v===temperature[i+1]);
 close(num('D375BC')*.1,energy.at(-1)-energy[plateauStart]);
 close(num('570F1E'),59*2);close(num('EB072B'),25*4);close(num('79AF80')*330000,66000);
 const code=(before,after)=>after>before?'1':after<before?'2':'3';
 for(const [id,heat]of [['2607D1',330],['E8E399',330],['10C466',-330],['E87C85',-330]])assert.equal(row(id).answer,code(273.15,273.15)+code(1000,1000+heat));
 const truthCode=bs=>bs.flatMap((x,i)=>x?[i+1]:[]).join('');
 assert.equal(row('7036F9').answer,truthCode([true,false,true,false,false]));
 // Recover plateaux and slopes from the primary table.
 const time=[0,5,10,15,20,25,30,35,40];
 const curves=[[20,80,140,200,200,200,210,220,230],[20,60,100,100,100,100,100,120,140]];
 const state=curves.map(t=>{
  const first=t.findIndex((x,i)=>x===t[i+1]);let last=first;
  while(last+1<t.length&&t[last+1]===t[first])last++;
  return{melting:t[first],duration:time[last]-time[first],heatCapacity:5/(t[1]-t[0]),melted:t.at(-1)>t[first]};
 });
 const [a,b]=state;
 const claims={
  FCD322:[a.heatCapacity>b.heatCapacity,a.melting===200,a.melted&&b.melted,a.duration>b.duration,40>40],
  '65EA2B':[a.duration===10,false,a.melted&&!b.melted,a.duration<b.duration,40>40],
  '02C7DC':[a.heatCapacity<b.heatCapacity,a.melting===100,!a.melted&&b.melted,a.duration<b.duration,40<40],
  '1559E5':[b.duration===35,b.melting===100,a.melted&&b.melted,a.duration>b.duration,40>40]
 };
 for(const [id,bs]of Object.entries(claims))assert.equal(row(id).answer,truthCode(bs),id);
 const hasPlateau=[true,true,false,true];assert.equal(num('2822AC'),hasPlateau.indexOf(false)+1);
 for(const id of ['118304','183EC7','D375BC'])assert.equal(sources['OGEPHYS'+id].discrepancy.status,'resolved');
 assert.equal(Object.keys(sources).length,32);
 assert.ok(!sources.OGEPHYS0B8B06,'Missing primary graph is not silently reconstructed');
};
