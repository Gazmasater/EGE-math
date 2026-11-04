const test=require('node:test'),assert=require('node:assert/strict');
const m=require('./lib/ege-informatics-recovered-2021-machine');
test('temperature includes both date and hour endpoints; truncates instead of rounding',()=>{
 const header=['','PT08H00M00S','PT09H00M00S','PT12H00M00S','PT13H00M00S'];
 const rows=[header,['2018-03-31',0,99,99,0],['2018-04-01',99,1,5,99],['2018-05-31',99,3,8,99],['2018-06-01',0,99,99,0]];
 assert.deepEqual(m.temperature(rows),{answer:'3',count:4,total:17,maximum:8,difference:3.75});
});
test('robot includes both endpoints and agrees with exhaustive paths',()=>{
 function walk(a,i=0,j=0){if(i===a.length-1&&j===a.length-1)return [a[i][j]];let values=[];if(i+1<a.length)values.push(...walk(a,i+1,j));if(j+1<a.length)values.push(...walk(a,i,j+1));return values.map(x=>x+a[i][j]);}
 for(let seed=0;seed<30;seed++){const a=Array.from({length:4},(_,i)=>Array.from({length:4},(_,j)=>1+(i*31+j*17+seed*11)%100)),paths=walk(a);assert.equal(m.robot(a).answer,Math.min(...paths)+' '+Math.max(...paths));}
 assert.equal(m.robot([[1,8,8,4],[10,1,1,3],[1,3,12,2],[2,3,5,6]]).answer,'22 41');
});
test('document rejects inflections, joined words, and wrong case',()=>{
 const r=m.document(['батюшка! Батюшка? батюшке батюшки прабатюшка батюшка-то БАТЮШКА', 'батюшка']);
 assert.equal(r.answer,'3');assert.equal(r.lower,2);assert.equal(r.upper,1);
});
test('forbidden substring handles endpoints and exhaustive short strings',()=>{
 function brute(s){let best=0;for(let i=0;i<s.length;i++)for(let j=i+1;j<=s.length;j++)if(!s.slice(i,j).includes('XZZY'))best=Math.max(best,j-i);return String(best);}
 for(let n=1;n<=7;n++)for(let code=0;code<3**n;code++){let s='',v=code;for(let i=0;i<n;i++){s+='XYZ'[v%3];v=Math.floor(v/3);}assert.equal(m.string(s).answer,brute(s));}
 for(const s of ['XZZY','XZZYXZZY','XXZZY','XZZYY','ZZZZZZ'])assert.equal(m.string(s).answer,brute(s));
});
test('container objectives match every subset, including zero fit and duplicate weights',()=>{
 for(let seed=0;seed<25;seed++){
  const a=Array.from({length:8},(_,i)=>1+(i*i+seed*7)%20);
  for(let cap=1;cap<=70;cap++){
   let count=0,heaviest=0;
   for(let mask=0;mask<256;mask++){const sub=a.filter((x,i)=>mask&(1<<i));if(sub.reduce((s,x)=>s+x,0)>cap)continue;const max=Math.max(0,...sub);if(sub.length>count){count=sub.length;heaviest=max;}else if(sub.length===count)heaviest=Math.max(heaviest,max);}
   assert.equal(m.containers(cap,a).answer,count+' '+heaviest);
  }
 }
});
test('triple loss method matches all choices including nonprime modulus and both alternatives',()=>{
 for(let k=2;k<=12;k++)for(let seed=0;seed<50;seed++){
  const rows=Array.from({length:5},(_,i)=>Array.from({length:3},(_,j)=>1+(seed*17+i*11+j*j*7)%40));
  let sums=[0];for(const row of rows)sums=sums.flatMap(s=>row.map(x=>s+x));
  const valid=sums.filter(x=>x%k);const text='5\n'+rows.map(r=>r.join(' ')).join('\n');
  if(valid.length)assert.equal(m.triples(text,k).answer,String(Math.max(...valid)));else assert.throws(()=>m.triples(text,k));
 }
 assert.equal(m.triples('1\n7630 239 7957').answer,'239');
});
