const {test}=require('node:test'),assert=require('node:assert/strict'),m=require('./lib/ege-informatics-mirror-library-machine');
test('word boundaries preserve explicit hyphens and distinguish editor search',()=>{
 const s='куда куда-то откуда Куда КУДА';for(const hyphens of ['join','boundary']){
  const whole=m.count(s,{terms:['куда','Куда'],mode:'whole',hyphens});assert.equal(whole.answer,hyphens==='join'?2:3);
  const embed=m.count(s,{terms:['куда','Куда'],mode:'embedded',hyphens});assert.equal(embed.answer,hyphens==='join'?2:1);
 }
});
test('exact lowercase word forms remain distinct when one is a prefix',()=>{
 const r=m.count('час часа часами Час Часа',{terms:['час','часа'],mode:'whole'});assert.equal(r.answer,2);assert.deepEqual(r.wholeCountsByTerm,{'час':1,'часа':1});
});
test('substring occurrences and words containing them are different quantities',()=>{
 const s='во ВО во-первых водоворот Во';const base={terms:['во','Во'],hyphens:'join'};
 assert.equal(m.count(s,{...base,mode:'embedded'}).answer,3);assert.equal(m.count(s,{...base,mode:'embedded-words'}).answer,2);
});
test('chapter scope respects repeated headings in different parts and Cyrillic X',()=>{
 const p=['ЧАСТЬ ПЕРВАЯ','I','не','ХI','нет','XII','конец','ЧАСТЬ ВТОРАЯ','I','не не','II','нет'];
 assert.equal(m.solve(p,{part:1,chapters:['XI'],terms:['не'],mode:'all'}).answer,1);assert.equal(m.solve(p,{part:2,chapters:['I'],terms:['не'],mode:'whole'}).answer,2);assert.throws(()=>m.scope(p,{part:3,chapters:['I']}));
});
test('counting agrees with exhaustive token oracle including punctuation and hyphens',()=>{
 const atoms=['а','ба','а-а','А','а!а'];
 for(const hyphens of ['join','boundary'])for(const a of atoms)for(const b of atoms)for(const c of atoms){
  const text=[a,b,c].join(' '),words=text.match(hyphens==='join'?/[А-Яа-я]+(?:-[А-Яа-я]+)*/gu:/[А-Яа-я]+/gu)||[],terms=['а','А'];
  const whole=words.filter(w=>terms.includes(w)).length,all=terms.reduce((s,t)=>s+text.split(t).length-1,0),emb=words.filter(w=>!terms.includes(w)&&terms.some(t=>w.includes(t))).length;
  for(const [mode,answer]of Object.entries({whole,all,embedded:all-whole,'embedded-words':emb}))assert.equal(m.count(text,{terms,hyphens,mode}).answer,answer,text+mode);
 }
});
