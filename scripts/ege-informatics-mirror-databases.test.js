const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{execFileSync}=require('node:child_process'),{solve,conditionModel}=require('./lib/ege-informatics-mirror-databases-machine');
const headers=['ID операции','Дата','ID магазина','Артикул','Количество упаковок','Тип операции'];
function sample(){return {goods:[['Артикул','Отдел','Наименование','Единица','Количество','Цена'],[3,'A','Товар A','грамм',600,50],[8,'A','Товар B','грамм',600,70]],stores:[['ID магазина','Район','Адрес'],['M2','Район A','улица A, 1'],['M7','Район B','улица B, 2']],operations:[headers,[1,'2024-06-01','M2',3,1,'Поступление'],[2,'2024-06-02','M2',8,1,'Поступление']]};}
const base={start:'2024-06-01',end:'2024-06-02',goods:{prefix:'Товар '},store:{field:'district',value:'Район A'},operation:'Поступление',measure:'kilograms',truncate:true};
test('inclusive dates, three-table joins, shuffled keys and either column order agree with exhaustive joins',()=>{
 let count=0;for(const flip of [false,true])for(const start of [1,2,3])for(const end of [3,4,5])for(const district of ['Район A','Район B'])for(const operation of ['both','Продажа','Поступление'])for(const single of [false,true]){
  const d=sample(),m={...base,start:`2024-06-0${start}`,end:`2024-06-0${end}`,store:{field:'district',value:district},goods:single?{names:['Товар A']}:{prefix:'Товар '},operation,measure:'netPackages',truncate:false};d.operations=[headers];let id=1;
  for(let day=1;day<=5;day++)for(const sid of ['M2','M7'])for(const art of [3,8])for(const kind of ['Поступление','Продажа'])d.operations.push([id++,`2024-06-0${day}`,sid,art,art+day+(kind==='Продажа'?0:4),kind]);
  let expected=0,ids=[];for(const row of d.operations.slice(1))for(const store of d.stores.slice(1))for(const good of d.goods.slice(1))if(row[2]===store[0]&&row[3]===good[0]&&store[1]===district&&(!single||good[2]==='Товар A')&&row[1]>=m.start&&row[1]<=m.end&&(operation==='both'||row[5]===operation)){expected+=row[4]*(row[5]==='Продажа'?-1:1);ids.push(row[0]);}
  if(flip)d.operations=d.operations.map(r=>[...r.slice(0,4),r[5],r[4]]);d.goods=[d.goods[0],...d.goods.slice(1).reverse()];d.stores=[d.stores[0],...d.stores.slice(1).reverse()];const got=solve(d,m);assert.equal(got.answer,String(expected));assert.deepEqual(got.matches.map(r=>r[0]),ids);count++;
 }assert.equal(count,216);
});
test('truncate after summing, distinguish packages, units and price, and require exact manufacturer',()=>{
 const d=sample();assert.equal(solve(d,base).answer,'1');assert.equal(solve(d,base).exactTotal,'6/5');
 for(const r of d.goods.slice(1))r[3]='мл';assert.equal(solve(d,{...base,measure:'litres'}).answer,'1');
 for(const r of d.goods.slice(1)){r[3]='кг';r[4]=0.6;}assert.equal(solve(d,base).exactTotal,'6/5');
 assert.equal(solve(d,{...base,measure:'revenue',truncate:false}).answer,'120');assert.equal(solve(d,{...base,measure:'netPackages',truncate:false}).answer,'2');
 for(const r of d.goods.slice(1)){r[3]='шт';r[4]=10;}assert.equal(solve(d,{...base,measure:'netUnits',truncate:false}).answer,'20');
 d.goods[1][5]='Фабрика A';d.goods[2][5]='Фабрика B';assert.equal(solve(d,{...base,goods:{prefix:'Товар ',manufacturer:'Фабрика A'},measure:'netPackages',truncate:false}).answer,'1');
});
test('duplicate keys, dangling foreign keys, invalid dates, wrong units and negative counts are rejected',()=>{
 for(const mutate of [d=>d.goods.push(d.goods[1]),d=>d.stores.push(d.stores[1]),d=>d.operations.push(d.operations[1]),d=>d.operations[1][2]='M404',d=>d.operations[1][3]=404,d=>d.operations[1][1]='2024-02-30',d=>d.operations[1][4]=-1,d=>d.operations[1][5]='Возврат',d=>d.goods[1][3]='литр']){const d=sample();mutate(d);assert.throws(()=>solve(d,base));}
 const models=require('./data/ege-informatics-mirror-databases-models.json'),texts=require('./data/ege-informatics-mirror-databases-condition-texts.json');for(const[id,m]of Object.entries(models))assert.deepEqual(conditionModel(texts[id]),m);
});
test('ODS explicit spaces, tabs and line breaks survive parsing, and unreviewed formulas are rejected',()=>{
 const code=String.raw`import importlib.util,sys,xml.etree.ElementTree as E,io,zipfile
s=importlib.util.spec_from_file_location('r',sys.argv[1]);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
e=E.fromstring('<text:p xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0">Ряженка<text:s text:c="2"/>детская<text:tab/>3,2%<text:line-break/>клубника</text:p>')
assert m.text_content(e)=='Ряженка  детская\t3,2%\nклубника'
x='<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"><table:table table:name="Data"><table:table-row><table:table-cell table:formula="of:=1+1" office:value-type="float" office:value="2"/></table:table-row></table:table></office:document-content>'
b=io.BytesIO()
with zipfile.ZipFile(b,'w') as z:z.writestr('content.xml',x)
try:m.read_ods(io.BytesIO(b.getvalue()))
except AssertionError:pass
else:raise AssertionError('formula accepted')
print('ok')`;
 assert.equal(execFileSync('python3',['-c',code,path.join(__dirname,'lib/read-ege-informatics-mirror-databases.py')],{encoding:'utf8'}).trim(),'ok');
});
