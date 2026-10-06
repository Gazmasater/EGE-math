const assert=require('node:assert/strict');
const cases=require('./physics-measurement-direct-cases.json');
const {records}=require('./physics-measurement-direct');
// Ручной эталон отсчётов: независимо от построения текста и SVG.
const readings=`
474F4B:45:1 4A99FA:0.4:0.1 DD65FF:3.8:0.2 A46BFA:0.46:0.02 9503F7:36:2
1A3704:0.30:0.05 1F660F:19:1 189A00:1.8:0.1 AFA401:3.0:0.2 96260C:3.8:0.1
E4DA0E:0.20:0.05 396F0B:0.20:0.02 725078:4.4:0.2 699675:1.8:0.1 4A91B7:3.0:0.2
70C7B0:2.2:0.1 72C2B7:1.6:0.1 79D8BD:1.1:0.1 5CDAB8:1.4:0.1 AC34BE:3.2:0.1
8E40BE:2.7:0.1 104711:0.28:0.03 DE5D18:1.4:0.2 E00415:274:2 665C1D:194:3
6ED11E:3.2:0.2 67811E:99.8:0.1 32781A:2.6:0.1 F36627:0.60:0.02 B12728:0.14:0.02
DC1F24:0.75:0.05 8B7A2B:2.20:0.15 4474DD:244:2 9BB8D9:1004:3 868BDE:2.0:0.1
44FB55:0.4:0.1 781C5A:1.6:0.2 BC985B:0.4:0.1 A82C5A:36:1 60BB56:0.20:0.02
41B8A9:208:2 D56BAF:2.6:0.2 AF97AC:755:1 35EAA7:744:1 3F9AAB:0.6:0.1
42A6C3:4.7:0.1 001FCD:0.96:0.02 EB5EC2:3.2:0.2 3583C0:3.6:0.2 BCC7EE:36:2
E11CE9:1.6:0.1 EDAAE9:3.8:0.2 F6EA64:3.5:0.1 E1896D:293.0:2.5 ECB765:99.3:0.1
E92765:3.6:0.1 673066:0.18:0.02 88426E:0.80:0.05 BA8438:100.6:0.1 D62330:3.2:0.1
55563B:2.2:0.1 A55E37:138:3 A54335:754:1 85E23D:748:1 0C0F85:4.6:0.2
BBF38A:4.8:0.2 552787:1.6:0.2 A2E38D:0.76:0.02 AAC78C:2.1:0.1 EC538E:3.4:0.2
3EB386:754:3`.trim().split(/\s+/).map(s=>s.split(':'));
const near=(a,b,message)=>assert.ok(Math.abs(a-b)<1e-9,message+`: ${a} ≠ ${b}`);
function verifyPhysics(){
 assert.equal(readings.length,71);assert.equal(cases.length,71);
 assert.deepEqual(readings.map(x=>x[0]).sort(),Object.keys(records).sort());
 for(const[id,value,error]of readings){
  const c=cases.find(c=>c.id===id),r=records[id],v=Number(value),d=Number(error);
  const [a,b,n]=c.scale,step=(b-a)/n;
  near(c.anchor+c.steps*step+(c.kind==='kelvin'?273:0),v,id+' scale reading');
  near((v-(c.kind==='kelvin'?273:0)-c.anchor)/step,c.steps,id+' reverse reading');
  if(c.rule!=='fixed')near(step/(c.rule==='half'?2:1),d,id+' uncertainty rule');
  assert.equal(c.value,value.replace('.',','),id+' precision of value');
  assert.equal(c.error,error.replace('.',','),id+' precision of error');
  assert.equal((value.split('.')[1]||'').length,(error.split('.')[1]||'').length,id+' decimal place');
  assert.ok(r.answer.startsWith(`(${c.value} ± ${c.error}) `),id+' answer');
  const bounds=[v-d,v+d];near((bounds[0]+bounds[1])/2,v,id+' midpoint');near((bounds[1]-bounds[0])/2,d,id+' half-width');
  if(c.kind==='weight')assert.ok(r.solution.includes('третьему закону Ньютона')&&r.solution.includes('P=T=F'),id+' weight and tension');
  if(c.kind==='gravity')assert.ok(r.solution.includes('Fтяж=mg=T=F'),id+' gravity and tension');
 }
 assert.ok(records.EDAAE9.solution.includes('T−Fтр=ma_x=0; N−mg=ma_y=0'),'force balance in two directions');
 assert.ok(records['665C1D'].solution.includes('pизб=pбал−pатм'),'gauge pressure');
 assert.ok(records['0C0F85'].solution.includes('U=U₁'),'correct resistor');
 assert.ok(records['104711'].answer.includes('0,03'),'0.6 A range error');
 assert.ok(records['8B7A2B'].answer.includes('2,20 ± 0,15'),'3 V range error');
 assert.ok(records['9BB8D9'].answer.endsWith('гПа'),'requested pressure unit');
 assert.ok(records.E1896D.solution.includes('273,15'),'Kelvin approximation disclosed');
 for(const [full,half]of [['EB5EC2','D62330'],['BCC7EE','A82C5A']]){
  const x=cases.find(c=>c.id===full),y=cases.find(c=>c.id===half);
  assert.equal(x.value,y.value);near(Number(x.error.replace(',','.')),2*Number(y.error.replace(',','.')),full+' same scale different error');
 }
 return true;
}
module.exports={verifyPhysics};
