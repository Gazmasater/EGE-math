'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {solve,model}=require('./lib/ege-informatics-databases-machine');
function fixture(rows){return {'Товар':[['Артикул','Отдел','Наименование','Ед_изм','Количество в упаковке','Цена'],[8,'Конфеты','Карамель A','грамм',250,60],[9,'Конфеты','Карамель B','грамм',800,100]],'Магазин':[['ID магазина','Район','Адрес'],['M2','Промышленный','Металлургов, 1'],['M3','Центральный','Другая, 2']],'Движение_товаров':[['ID операции','Дата','ID магазина','Артикул','Количество упаковок','Тип операции'],...rows]};}
const config={start:5,end:15,operation:'Продажа',product:'Карамель',district:'Промышленный',measure:'rubles'};
test('database joins retain both boundary dates and apply every predicate',()=>{
 const result=solve(fixture([[1,'2025-06-05','M2',8,2,'Продажа'],[2,'2025-06-15','M2',9,3,'Продажа'],[3,'2025-06-04','M2',8,7,'Продажа'],[4,'2025-06-16','M2',8,11,'Продажа'],[5,'2025-06-05','M3',8,13,'Продажа'],[6,'2025-06-05','M2',8,17,'Поступление']]),config);
 assert.equal(result.answer,'420');assert.deepEqual(result.matches.map(r=>r.operationId),[1,2]);assert.equal(result.packages,5);
});
test('mass is converted per product and floored only after summation',()=>{
 const result=solve(fixture([[1,'2025-06-05','M2',8,3,'Продажа'],[2,'2025-06-15','M2',9,1,'Продажа']]),{...config,measure:'kg-floor'});
 assert.equal(result.exactAmount,'31/20');assert.equal(result.answer,'1');assert.deepEqual(result.byArticle.map(r=>r.amount),['3/4','4/5']);
});
test('equal quantities in different operations are counted separately',()=>{
 const rows=[1,2,3,4].map(id=>[id,'2025-06-05','M2',8,5,'Продажа']);const r=solve(fixture(rows),{...config,measure:'packages'});assert.equal(r.answer,'20');assert.equal(r.matched,4);
 const invalid=fixture(rows);invalid['Товар'].push(invalid['Товар'][1]);assert.throws(()=>solve(invalid,config));
});
test('model is derived from the actual FIPI question, not the task identifier',()=>{
 const sources=require('./data/ege-informatics-databases-sources.json');const a=model(sources.EGEINF09F19A.fipiCondition),b=model(sources.EGEINF53043D.fipiCondition);assert.equal(a.district,'Промышленный');assert.equal(b.district,'Центральный');assert.equal(a.measure,'rubles');assert.equal(model(sources.EGEINF614BFD.fipiCondition).operation,'Поступление');
});
