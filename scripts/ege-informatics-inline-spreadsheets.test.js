const test=require('node:test'),assert=require('node:assert/strict');const {shift,value,solve}=require('./lib/ege-informatics-inline-spreadsheets-machine');
test('Mixed and absolute references preserve only their anchored components',()=>{
 assert.equal(shift('=$B3+C$4+$D$5+E6','C3','B1'),'=$B1+B$4+$D$5+D4');
});
test('Moving left or up cannot produce an invalid reference',()=>{
 assert.throws(()=>shift('=A1','B2','A1'));
 assert.equal(shift('=$A$1','B2','A1'),'=$A$1');
});
test('Arithmetic uses multiplication precedence and resolves repeated cells',()=>{
 assert.equal(value('=A1+B2*3-A1',{A1:7,B2:5}),15);
});
test('Union progressions count a common multiple once and include both bounds',()=>{
 const r=solve({kind:'union',lo:6,hi:18,include:[2,3],exclude:[5],extreme:'min'});
 assert.equal(r.answer,'7 6');assert.equal(r.maximum,18);assert.deepEqual(r.first,[6,8,9,12,14]);
});
test('Remainder filter applies every exclusion and picks the requested extreme',()=>{
 const r=solve({kind:'remainder',lo:7,hi:40,divisor:6,remainder:1,exclude:[5,7],extreme:'max'});
 assert.equal(r.answer,'4 37');assert.deepEqual(r.first,[13,19,31,37]);
});
