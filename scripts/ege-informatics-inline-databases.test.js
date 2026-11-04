const test=require('node:test'),assert=require('node:assert/strict');
const {solve,tables}=require('./lib/ege-informatics-inline-databases-machine');
test('Two matching grandparents count one grandchild and two grandparents',()=>{
 const people=[{id:1,city:'A'},{id:2,city:'A'},{id:3,city:'B'},{id:4,city:'A'}],edges=[[1,3],[2,3],[3,4]];
 assert.equal(solve({kind:'grand-city',people,edges,countSide:'grandchild'}).answer,'1');assert.equal(solve({kind:'grand-city',people,edges,countSide:'grandparent'}).answer,'2');
});
test('Shared one parent suffices; brother condition applies to a sister too',()=>{
 const people=[{id:1,sex:'М',year:1970},{id:2,sex:'Ж',year:2000},{id:3,sex:'М',year:2004},{id:4,sex:'М',year:2005}],edges=[[1,2],[1,3],[1,4]];
 const r=solve({kind:'sibling-count',sex:'М',op:'abs-le',limit:4,people,edges});assert.deepEqual(r.selected,[2,3,4]);
});
test('Younger sister is a directed relation including exactly four years',()=>{
 const people=[{id:1,sex:'М',year:1970},{id:2,sex:'Ж',year:2000},{id:3,sex:'Ж',year:2004},{id:4,sex:'М',year:2005}],edges=[[1,2],[1,3],[1,4]];
 assert.deepEqual(solve({kind:'sibling-count',sex:'Ж',op:'younger-ge',limit:4,people,edges}).selected,[2]);
});
test('Age boundary and number of children differ from number of mothers',()=>{
 const people=[{id:1,sex:'Ж',year:1970},{id:2,sex:'Ж',year:1994},{id:3,sex:'М',year:1995},{id:4,sex:'Ж',year:1996}],edges=[[1,2],[1,3],[1,4]];
 const base={kind:'parent-age-count',sex:'Ж',limit:24,people,edges};assert.equal(solve({...base,op:'gt'}).answer,'2');assert.equal(solve({...base,op:'le'}).answer,'1');assert.equal(solve({...base,op:'lt'}).answer,'0');
});
test('First and last child have opposite extrema; tie uses smallest ID',()=>{
 const people=[{id:10,sex:'Ж',year:1970},{id:20,sex:'Ж',year:1970},{id:30,sex:'Ж',year:1970},{id:100,sex:'М',year:1990},{id:101,sex:'М',year:2010},{id:102,sex:'М',year:1990},{id:103,sex:'М',year:2015}],edges=[[20,100],[20,101],[10,102],[30,103]];
 assert.equal(solve({kind:'mother-extreme',extreme:'min',people,edges}).answer,'10');assert.equal(solve({kind:'mother-extreme',extreme:'max',people,edges}).answer,'30');
});
test('Inline HTML spans do not split a number into separate tokens',()=>{
 const rows=tables('<table><tr><td><span>1</span><span>5</span><span>0</span></td><td><b>19</b><span>67</span></td></tr></table>');assert.deepEqual(rows,[[['150','1967']]]);
});
