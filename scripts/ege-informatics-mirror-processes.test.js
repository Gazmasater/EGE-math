const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {solve,conditionModel}=require('./lib/ege-informatics-mirror-processes-machine'),models=require('./data/ege-informatics-mirror-processes-models.json'),certificates=require('./data/ege-informatics-mirror-processes-interval-certificates.json');
test('all 5184 small acyclic timing graphs agree with independent clock simulation',()=>{
 const edges=[];for(let a=1;a<=4;a++)for(let b=a+1;b<=4;b++)edges.push([a,b]);let checked=0;
 for(let mask=0;mask<64;mask++)for(let code=0;code<81;code++){
  let c=code;const ps=[];for(let i=1;i<=4;i++){ps.push({id:i,duration:c%3+1,depends:edges.filter(([a,b],k)=>b===i&&(mask>>k&1)).map(([a])=>a)});c=Math.floor(c/3);}
  const starts={},ends={},finished=new Set(),running=new Map(),waiting=new Set([1,2,3,4]);let t=0;
  while(finished.size<4){for(const[id,left]of running)if(left===0){finished.add(id);running.delete(id);ends[id]=t;}for(const p of ps)if(waiting.has(p.id)&&p.depends.every(i=>finished.has(i))){waiting.delete(p.id);running.set(p.id,p.duration);starts[p.id]=t;}if(finished.size===4)break;for(const[id,left]of running)running.set(id,left-1);t++;}
  const got=solve([...ps].reverse(),{type:'makespan'});assert.deepEqual(got.starts,starts);assert.deepEqual(got.finishes,ends);assert.equal(got.answer,String(t));checked++;
 }
 assert.equal(checked,5184);assert.throws(()=>solve([{id:1,duration:1,depends:[2]},{id:2,duration:1,depends:[1]}],{type:'makespan'}));
});
test('numbered millisecond endpoints, completed threshold and simultaneous finishes',()=>{
 const ps=[{id:9,duration:2,depends:[]},{id:17,duration:2,depends:[]},{id:28,duration:3,depends:[9,17]}];
 assert.equal(solve(ps,{type:'active-at',parameter:2}).answer,'2');assert.equal(solve(ps,{type:'active-at',parameter:3}).answer,'1');
 assert.equal(solve(ps,{type:'completed-by',parameter:1}).answer,'0');assert.equal(solve(ps,{type:'completed-by',parameter:2}).answer,'2');
 assert.equal(solve(ps,{type:'finish-count',parameter:2}).answer,'2');assert.equal(solve(ps,{type:'finish-count',parameter:3}).answer,'5');
 assert.deepEqual(conditionModel('могут быть завершены за первые 17 мс. Например, за первые 7 мс.'),{type:'completed-by',parameter:17,minimalMakespanRequired:false});
 assert.equal(conditionModel('параллельно выполняются на 16-й мс. Например, на 6-й мс.').parameter,16);
 assert.equal(conditionModel('за которое завершатся 22 процесса. Например, завершатся 3 процесса.').parameter,22);
});
test('seven optimal interval certificates reject breaks, overlap and missed deadlines',()=>{
 for(const[id,cert]of Object.entries(certificates)){
  const m=models[id],got=solve(m.processes,m,cert);assert.equal(got.answer,String(cert.answer));
  const wrongInterval=structuredClone(cert);wrongInterval.interval[1]++;assert.throws(()=>solve(m.processes,m,wrongInterval));
  const bad=structuredClone(cert),dependent=m.processes.find(p=>p.depends.length);bad.starts[dependent.id]=0;assert.throws(()=>solve(m.processes,m,bad));
  if(m.minimalMakespanRequired){const shifted=structuredClone(cert);for(const id in shifted.starts)shifted.starts[id]++;assert.throws(()=>solve(m.processes,m,shifted),/deadline/);}
 }
});
test('ODS duration formulas are evaluated and inconsistent cached values are rejected',()=>{
 const reader=path.join(__dirname,'lib/read-ege-informatics-mirror-processes.py');
 const code=String.raw`import importlib.util,io,zipfile
import sys
s=importlib.util.spec_from_file_location('m',sys.argv[1]);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
def data(formula='of:=[.A2]+17',value='18',cached='18'):
 x='<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"><table:table><table:table-row>'+''.join('<table:table-cell><text:p>'+v+'</text:p></table:table-cell>' for v in ['ID','d','deps'])+'</table:table-row><table:table-row><table:table-cell><text:p>1</text:p></table:table-cell><table:table-cell table:formula="'+formula+'" office:value="'+cached+'"><text:p>'+value+'</text:p></table:table-cell><table:table-cell><text:p>0</text:p></table:table-cell></table:table-row></table:table></office:document-content>'
 b=io.BytesIO()
 with zipfile.ZipFile(b,'w') as z:z.writestr('content.xml',x)
 return b.getvalue()
assert m.read(data())==[{'id':1,'duration':18,'depends':[]}]
for kwargs in [{'value':'19'},{'cached':'19'},{'formula':'of:=[.A2]+18'},{'formula':'of:=[.A3]+17'}]:
 try:m.read(data(**kwargs))
 except (AssertionError,ValueError):pass
 else:raise AssertionError(kwargs)
print('ok')`;
 assert.equal(execFileSync('python3',['-c',code,reader],{encoding:'utf8'}).trim(),'ok');
});
