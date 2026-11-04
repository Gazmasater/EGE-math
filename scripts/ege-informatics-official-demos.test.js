const test=require('node:test'),assert=require('node:assert/strict'),m=require('./lib/ege-informatics-official-demos-machine');
test('six-number rows require exactly one triple and strict squared-sum comparison',()=>{
 assert.equal(m.spreadsheet([[5,5,5,1,2,3],[2,2,2,1,3,4],[3,3,3,1,2,6],[4,4,4,2,2,1],[4,4,4,5,5,5]],2025).answer,'1');
});
test('seven-number rows require two pairs and strict comparison of weighted averages',()=>{
 const r=m.spreadsheet([[1,1,2,2,3,4,5],[2,2,4,4,1,3,5],[1,1,2,2,3,3,3]],2024);assert.deepEqual(r.hitRows,[1]);
});
test('last suitable row determines sum; equality is allowed and maximum sum is irrelevant',()=>{
 assert.equal(m.spreadsheet([[9,9,9,1,2,3,4],[5,5,5,1,2,3,4],[100,100,100,100,100,100,100]],2026).answer,'25');assert.equal(m.spreadsheet([[5,5,5,2,4,6,8]],2026).answer,'35');
});
test('adjacent pairs use global minimum and inclusive two-digit endpoints',()=>{
 assert.equal(m.sequence([8,24,40],2025).answer,'2 64');
 assert.equal(m.sequence([1,10,90,100,99,1],2026).answer,'2 190');
});
test('document chapter selection excludes XIII and counts hyphenated words',()=>{
 const r=m.document(['Том 2','ЧАСТЬ ТРЕТЬЯ','XII','по По поход по-гречески','XIII','поход','XIV','Поход','XV','поход','ЧАСТЬ ЧЕТВЁРТАЯ'],2025);assert.equal(r.answer,'3');assert.equal(r.whole,2);assert.equal(r.all,5);assert.equal(r.upper,1);
});
test('three consecutive document chapters and exact case variants',()=>{
 const r=m.document(['XIII','рук рука Рука','XIV','руки','XV','рукав РУК','XVI','рука'],2026);assert.equal(r.answer,'4');assert.equal(r.whole,1);assert.equal(r.upper,1);
});
function bruteString(s,letter,k,need){let best=0;for(let a=0;a<s.length;a++)for(let b=a+1;b<=s.length;b++){const t=s.slice(a,b);if([...t].filter(x=>x===letter).length===k&&(t.match(/2025/g)||[]).length>=need)best=Math.max(best,t.length);}return String(best);}
test('exact letter-count window agrees with exhaustive substring enumeration including edges',()=>{
 for(let n=0;n<=9;n++)for(let mask=0;mask<2**n;mask++){let s='';for(let i=0;i<n;i++)s+=(mask>>i)&1?'T':'X';for(let k=1;k<=3;k++)assert.equal(m.string(s,'T',k).answer,bruteString(s,'T',k,0));}
});
test('pattern-count window includes left segment and handles pattern endpoints',()=>{
 assert.equal(m.string('2025'.repeat(90)+'Y'.repeat(80),'Y',80,90).answer,'440');
 const atoms=['2025','Y','202','5','X'];for(let i=0;i<625;i++){let x=i,s='';for(let j=0;j<4;j++){s+=atoms[x%5];x=Math.floor(x/5);}for(let k=1;k<=2;k++)for(let need=0;need<=2;need++)assert.equal(m.string(s,'Y',k,need).answer,bruteString(s,'Y',k,need));}
});
test('box dynamic programming optimizes count then smallest side, verified by all subsets',()=>{
 let seed=123;for(let t=0;t<200;t++){const a=Array.from({length:8},()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return 1+seed%20;});for(const gap of [1,3,5]){let count=0,last=0;for(let mask=1;mask<256;mask++){const b=a.filter((_,i)=>(mask>>i)&1).sort((x,y)=>y-x);if(b.some((x,i)=>i&&b[i-1]-x<gap))continue;if(b.length>count||(b.length===count&&b.at(-1)>last)){count=b.length;last=b.at(-1);}}assert.equal(m.boxes(a,gap).answer,count+' '+last);}}
});
