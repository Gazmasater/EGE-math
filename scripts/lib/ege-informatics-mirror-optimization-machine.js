'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'../..'),{conditionText}=require(root+'/lib/seo-text');
const {solve}=require('./ege-informatics-mirror-optimization-algorithms'),{parse,verifyWitness}=require('./ege-informatics-mirror-optimization-parser');
const sha=b=>createHash('sha256').update(b).digest('hex');
function conditionModel(raw){
 const t=raw.replace(/[−–]/g,'-');
 assert.ok(t.includes('10 000 000')||t.includes('1 000 000'));
 if(t.includes('S_(i), S_(j), S_(k)')){
  assert.ok(t.includes('i < j < k')&&t.includes('максимальное значение выражения'));
  const peak=t.includes('S_(i) < S_(j), S_(k) < S_(j)');
  assert.ok(peak||t.includes('S_(i) > S_(j), S_(k) > S_(j)'));
  assert.ok(t.includes(peak?'(S_(j) - S_(i)) + (S_(j) - S_(k))':'(S_(i) - S_(j)) + (S_(k) - S_(j))'));
  return {kind:'peak-triple',sign:peak?1:-1};
 }
 if(t.includes('максимальной длины, что сумма её элементов')){
  const positive=t.includes('сумма её элементов положительна и чётна');assert.ok(positive||t.includes('сумма её элементов отрицательна и нечётна'));
  return {kind:'longest-signed-parity',sign:positive?1:-1,parity:positive?0:1};
 }
 if(t.includes('разность суммы элементов подпоследовательности')){
  assert.ok(t.includes('0 < L < M < R - 1')&&t.includes('была максимальна'));
  const left=t.includes('разность суммы элементов подпоследовательности S(L, M) и суммы элементов подпоследовательности S(M + 1, R)');
  assert.ok(left||t.includes('разность суммы элементов подпоследовательности S(M + 1, R) и суммы элементов подпоследовательности S(L, M)'));
  return {kind:'block-difference',direction:left?1:-1};
 }
 if(t.includes('вместимостью не более')){
  const capacity=Number(t.match(/вместимостью не более (\d+) штук/)[1]);assert.ok(capacity>0);
  if(t.includes('Перевозить биоматериалы разрешается на расстояние не более M')){
   assert.ok(t.includes('в одном из имеющихся пунктов')&&t.includes('количество доставляемых туда контейнеров с пробирками было максимальным'));
   return {kind:'radius-containers',capacity};
  }
  assert.ok(t.includes('общая стоимость доставки биоматериалов из всех пунктов минимальна')&&t.includes('в одном из пунктов приёма'));
  return {kind:'linear-cost',capacity};
 }
 if(t.includes('кольцевой трассы с двусторонним движением')){
  assert.ok(t.includes('в одном из пунктов питания')&&t.includes('минимальную суммарную стоимость'));
  return {kind:'circular-cost'};
 }
 if(t.includes('из каждой тройки ровно одно число')){
  assert.ok(t.includes('не делилась на k =')&&t.includes('максимально возможной')&&t.includes('не превышающих 12 000'));
  return {kind:'choose-triples',modulus:Number(t.match(/не делилась на k = (\d+)/)[1])};
 }
 if(t.includes('непрерывные подпоследовательности')&&t.includes('самой короткой')){
  assert.ok(t.includes('максимальной суммой')&&t.includes('определите её длину'));
  return {kind:'max-divisible-subarray',modulus:Number(t.match(/кратна k = (\d+)/)[1])};
 }
 if(t.includes('Определите два таких переданных числа')){
  assert.ok(t.includes('не менее K мин.')&&t.includes('сумма была максимально возможной')&&t.includes('не превышающее 100 000'));
  return {kind:'gap-pair',operation:'max-sum',minimum:0,maximum:100000};
 }
 assert.ok(t.includes('Определите три таких переданных числа')&&t.includes('между моментами передачи любых двух из них прошло не менее K мин.'));
 let operation;if(t.includes('сумма этих трёх чисел была минимально возможной'))operation='min-sum';else if(t.includes('сумма этих трёх чисел была максимально возможной'))operation='max-sum';else {assert.ok(t.includes('произведение этих трёх чисел было максимально возможным'));operation='max-product';}
 const signed=t.includes('одно целое число, по модулю не превышающее 10 000 000');assert.ok(signed||t.includes('одно натуральное число, не превышающее 10 000 000'));
 assert.ok(operation!=='max-product'||!signed);
 return {kind:'gap-triple',operation,minimum:signed?-10000000:1,maximum:10000000};
}
function validate(d,m,exception,memberSha){
 const n=d.N,kind=m.kind;assert.ok(n>=1&&n<=10000000);
 if(['peak-triple','block-difference','longest-signed-parity','circular-cost'].includes(kind))assert.ok(n>=5);
 if(kind.startsWith('gap-'))assert.ok(d.K>=1&&d.K<n&&(kind!=='gap-triple'||2*d.K<n));
 if(kind==='radius-containers')assert.ok(d.M>=1&&d.M<=10000000);
 let min=Infinity,max=-Infinity,over=0;
 if(['linear-cost','radius-containers'].includes(kind)){
  let previous=0;for(let i=0;i<n;i++){assert.ok(d.columns[0][i]>previous);previous=d.columns[0][i];assert.ok(d.columns[1][i]>=1&&d.columns[1][i]<=1000);}
 }else{
  const bounds=kind==='choose-triples'?[1,12000]:kind==='max-divisible-subarray'?[1,10000]:kind==='circular-cost'?[1,1000]:kind.startsWith('gap-')?[m.minimum,m.maximum]:[-1000,1000];
  if(kind==='choose-triples')assert.ok(n<=1000000);
  for(const col of d.columns)for(const v of col){assert.ok(Number.isSafeInteger(v)&&v>=bounds[0]);min=Math.min(min,v);max=Math.max(max,v);if(v>bounds[1])over++;}
  if(over){assert.equal(kind,'gap-pair');assert.ok(exception);assert.equal(exception.sha256,memberSha);assert.equal(exception.declaredMaximum,bounds[1]);assert.equal(min,exception.actualMinimum);assert.equal(max,exception.actualMaximum);assert.equal(over,exception.valuesAboveDeclaredMaximum);}
  else assert.ok(max<=bounds[1]);
 }
 return {minimum:Number.isFinite(min)?min:null,maximum:Number.isFinite(max)?max:null,valuesAboveDeclaredMaximum:over};
}
function unpack(bytes,names){
 assert.equal(names.length,2);let temporary;
 try{
  if(bytes.subarray(0,4).toString()==='Rar!'){
   temporary=fs.mkdtempSync(path.join(process.env.TMPDIR||os.tmpdir(),'ege-optimization-rar-'));const archive=path.join(temporary,'original.rar');fs.writeFileSync(archive,bytes,{mode:0o600});
   return names.map(name=>{const c=spawnSync('unrar',['p','-inul','-p-',archive,name],{maxBuffer:100000000});assert.equal(c.status,0,String(c.stderr));return c.stdout;});
  }
  const code='import sys,io,zipfile,json\nz=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read()))\nnames=json.loads(sys.argv[1]);assert sorted(z.namelist())==sorted(names)\nsys.stdout.buffer.write(z.read(names[int(sys.argv[2])]))';
  return names.map((name,i)=>{const c=spawnSync('python3',['-c',code,JSON.stringify(names),String(i)],{input:bytes,maxBuffer:100000000});assert.equal(c.status,0,String(c.stderr));return c.stdout;});
 }finally{if(temporary)fs.rmSync(temporary,{recursive:true,force:true});}
}
const cache=new Map();
function verifyExtra(d,m,c){
 assert.equal(c.N,d.N);assert.equal(c.kind,m.kind);
 const a=d.columns[0];
 if(['linear-cost','radius-containers'].includes(m.kind)){
  assert.equal(c.capacity,m.capacity);assert.ok(c.row>=1&&c.row<=d.N);assert.equal(c.point,a[c.row-1]);
  const w=Float64Array.from(d.columns[1],v=>Math.ceil(v/m.capacity));let total=0,left=0,right=0,cost=0n;
  for(let i=0;i<d.N;i++){total+=w[i];if(i<c.row-1)left+=w[i];else if(i>c.row-1)right+=w[i];cost+=BigInt(w[i])*BigInt(Math.abs(a[i]-c.point));}
  assert.equal(total,c.totalContainers);
  if(m.kind==='linear-cost'){
   assert.equal(left,c.leftContainers);assert.equal(right,c.rightContainers);assert.equal(w[c.row-1],c.centerContainers);assert.ok(2*left<=total&&2*right<=total);assert.equal(String(cost),String(c.answer));
  }else{
   assert.equal(c.M,d.M);let l=0,r=d.N-1;while(a[l]<c.point-d.M)l++;while(a[r]>c.point+d.M)r--;
   assert.deepEqual([l+1,r+1],c.rangeRows);assert.deepEqual([a[l],a[r]],c.rangePositions);let sum=0;for(let i=l;i<=r;i++)sum+=w[i];assert.equal(sum,c.answer);
  }
 }
 if(m.kind==='circular-cost'){
  assert.ok(c.point>=1&&c.point<=d.N);let cost=0n,initial=0n,total=0;
  for(let i=0;i<d.N;i++){const dist=Math.abs(i-(c.point-1));cost+=BigInt(a[i])*BigInt(Math.min(dist,d.N-dist));initial+=BigInt(a[i])*BigInt(Math.min(i,d.N-i));total+=a[i];}
  assert.equal(String(cost),String(c.answer));assert.equal(String(initial),String(c.initialCost));assert.equal(total,c.totalWeight);
 }
 if(m.kind==='choose-triples'){
  let total=0,loss=Infinity;
  for(let i=0;i<d.N;i++){const high=Math.max(...d.columns.map(col=>col[i]));total+=high;for(const col of d.columns){const diff=high-col[i];if(diff%m.modulus)loss=Math.min(loss,diff);}}
  assert.equal(total,c.maximumSum);assert.equal(total%m.modulus,c.remainder);assert.equal(loss,c.smallestNondivisibleLoss);assert.equal(m.modulus,c.modulus);
  if(c.correction){const q=c.correction;assert.ok(q.row>=1&&q.row<=d.N);const row=d.columns.map(col=>col[q.row-1]);assert.deepEqual(row,q.values);assert.equal(Math.max(...row),q.from);assert.ok(row.includes(q.to));assert.equal(q.from-q.to,q.loss);assert.equal(q.loss,loss);assert.equal(total-q.loss,c.answer);}
  else assert.equal(total,c.answer);
 }
}
function compute(task,data,readFile=fs.readFileSync){
 const text=conditionText(task.fragment);assert.equal(text,data.condition);assert.deepEqual(conditionModel(text),data.model);
 const urls=[...task.fragment.matchAll(/class="fipi-attachment" href="([^"]+)"/g)].map(m=>m[1]);assert.deepEqual(urls,[data.url]);
 const file=path.resolve(root,data.url.slice(1).replace(/^fipi\//,'fipi-assets/'));assert.ok(file.startsWith(root+'/fipi-assets/ege-informatics/'));
 const bytes=readFile(file);assert.equal(sha(bytes),data.fileSha256);
 if(data.reviewedHeaders!==undefined){
  assert.equal(task.id,'EGEINF327EB5','header exception is task-specific');
  assert.equal(data.fileSha256,'e002ef198d3c8e5bcca138bb49a094f3974f83c10c4ae9302c292684e3dbe325');
  assert.deepEqual(data.reviewedHeaders,[[100,113],[1200000,12013]]);
 }
 const key=JSON.stringify([data.fileSha256,data.model,data.members,data.certificates,data.reviewedHeaders]);let result=cache.get(key);
 if(!result){
  const contents=unpack(bytes,data.members.map(m=>m.name)),files=[];
  for(let i=0;i<2;i++){
   const content=contents[i],hash=sha(content);assert.equal(hash,data.members[i].sha256);const d=parse(content,data.model,data.reviewedHeaders?.[i]),certificate=data.certificates[i];
   const range=validate(d,data.model,certificate,hash),answer=solve(d,data.model).answer;verifyWitness(d,data.model,certificate);verifyExtra(d,data.model,certificate);assert.equal(answer,String(certificate.answer),'answer');
   files.push({letter:'AB'[i],N:d.N,answer,sha256:hash,...range});contents[i]=null;
  }
  result={answer:files.map(f=>f.answer).join(' '),files};cache.set(key,result);
 }
 if(data.result)assert.deepEqual(result,data.result);return result;
}
module.exports={conditionModel,parse,validate,solve,verifyWitness,verifyExtra,unpack,compute};
