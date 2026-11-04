'use strict';
const assert=require('node:assert/strict');
const {conditionText}=require('../../lib/seo-text');
const {ogeSourceSignature}=require('../../lib/oge-classification');
function compute(task,data){
const r=data.calculation,tasks=[task],numeric=r.parameters?{[task.id]:r}:{},other=r.parameters?{}:{[task.id]:r};
const words={один:1,два:2,три:3,четыре:4,пять:5,шесть:6,семь:7};const n=x=>/^\d+$/.test(x)?Number(x):words[x];const sum=p=>p.reduce((a,b)=>a+b,0),key=p=>JSON.stringify(p);let checkedBranches=0,checkedPositions=0;const out={};
function model(c){
 const pair=c.includes('табличка'),old=c.includes('Кто выигрывает'),down=c.includes('убрать из кучи'),two=c.includes('две кучи')||old||pair;
 const threshold=Number(c.match(/не (?:менее|более) (\d+)/)[1]);
 let adds,mult;
 if(old){adds=[Number(c.match(/добавляет (\d+)/)[1])];mult=Number(c.match(/увеличивает в (\d+)/)[1]);}
 else if(!pair){const rule=c.slice(c.indexOf('За один ход игрок может')+24).split('Например')[0].split('Для того')[0].split('У каждого')[0];adds=down?[...rule.matchAll(/убрать из кучи (\d+)/g)].map(m=>-Number(m[1])):[...rule.split('увеличить')[0].matchAll(/\b\d+\b|один|два|три|четыре/g)].map(m=>n(m[0]));mult=n(rule.match(/в (\d+|два|три|пять) раз/)[1]);}
 const terminal=p=>down?sum(p)<=threshold:(old&&c.includes('в одной из куч')?Math.max(...p):sum(p))>=threshold;
 const next=p=>{if(pair)return [[p[0]+p[1],p[1]],[p[0],p[0]+p[1]]];const r=[];p.forEach((v,i)=>{for(const a of adds){let q=p.slice();q[i]+=a;r.push(q);}let q=p.slice();q[i]=down?Math.floor(v/mult):v*mult;r.push(q);});return r;};return{pair,old,down,two,threshold,adds,mult,terminal,next};
}
const rankCaches=new WeakMap();
function retro(start,m){
 const states=new Map(),todo=[start],reused=rankCaches.get(m)||new Map();
 while(todo.length){const p=todo.pop(),k=key(p);if(states.has(k)||reused.has(k))continue;const qs=m.terminal(p)?[]:m.next(p);states.set(k,{p,qs});todo.push(...qs);}
 const order=[...states.values()].sort((a,b)=>m.down?sum(a.p)-sum(b.p):sum(b.p)-sum(a.p));const values=reused;
 for(const {p,qs} of order){let v;if(!qs.length)v=0;else{const vv=qs.map(q=>{assert.ok(values.has(key(q)));return values.get(key(q));});const loses=vv.filter(x=>x<=0);v=loses.length?Math.min(...loses.map(x=>1-x)):-Math.max(...vv);}values.set(key(p),v);}
 checkedPositions+=states.size;rankCaches.set(m,values);return values;
}
function validatePolicy(d,m,values){
 const paths=d.paths;assert.ok(paths.length);const start=paths[0][0];assert.equal(d.rank,values.get(key(start)));const winner=d.rank>0?0:1;assert.equal(d.winner,winner?'Ваня':'Петя');const tree=new Map();
 for(const path of paths){assert.deepEqual(path[0],start);for(let i=0;i<path.length-1;i++){assert.ok(!m.terminal(path[i]));assert.ok(m.next(path[i]).some(q=>key(q)===key(path[i+1])));const prefix=key(path.slice(0,i+1));if(!tree.has(prefix))tree.set(prefix,{turn:i,p:path[i],children:new Set()});tree.get(prefix).children.add(key(path[i+1]));}assert.ok(m.terminal(path.at(-1)));assert.equal((path.length-2)%2,winner);checkedBranches++;}
 for(const {turn,p,children} of tree.values()){
  if(turn%2!==winner)assert.deepEqual([...children].sort(),[...new Set(m.next(p).map(key))].sort());
  else{assert.equal(children.size,1);for(const q of children)assert.ok(values.get(q)<=0);}
 }
}
for(const t of tasks){const c=conditionText(t.fragment);assert.equal(c,data.condition);const r=numeric[t.id]||other[t.id];assert.ok(r);if(r.kind==='words'){
 const sets=[...c.matchAll(/\{([^}]+)\}/g)].map(m=>m[1].match(/[А-ЯЁ]+/g));assert.deepEqual(r.initialWords,sets[1]);assert.deepEqual(r.finalWords,sets.at(-1));
 for(const [ws,policy] of [[sets[1],r.first],['dummy',null],[sets.at(-1),r.final],...r.swaps.map(x=>{let sh=sets[1].reduce((a,b)=>a.length<b.length?a:b),lg=sets[1].reduce((a,b)=>a.length>b.length?a:b),arr=[...sh];const[i,j]=x.indices;[arr[i],arr[j]]=[arr[j],arr[i]];assert.equal(arr.join(''),x.word);return [[lg,x.word],x.strategy];})]){
  if(!policy)continue;const terminal=s=>ws.includes(s),next=s=>[...new Set(ws.filter(w=>w.startsWith(s)).map(w=>w.slice(0,s.length+1)))];const prefixes=[...new Set(ws.flatMap(w=>Array.from({length:w.length+1},(_,i)=>w.slice(0,i))))].sort((a,b)=>b.length-a.length);const vals=new Map();for(const s of prefixes){if(terminal(s))vals.set(key(s),0);else{const vv=next(s).map(q=>vals.get(key(q))),loss=vv.filter(v=>v<=0);vals.set(key(s),loss.length?Math.min(...loss.map(v=>1-v)):-Math.max(...vv));}}validatePolicy(policy,{next,terminal},vals);
 }
 assert.equal(r.first.winner,'Петя');assert.ok(r.swaps.every(x=>x.strategy.winner==='Ваня'));assert.deepEqual(r.longWords,['ТРИ'.repeat(33),'РИТА'.repeat(44)]);assert.equal(r.long.winner,'Петя');assert.equal(r.long.paths.length,1);assert.deepEqual(r.long.paths[0],Array.from({length:100},(_,i)=>r.longWords[0].slice(0,i)));out[t.id]={kind:'words',winner:r.final.winner};continue;
 }
 const m=model(c);let starts,values=new Map();
 if(numeric[t.id]){
  let lo,hi,first=null;if(m.down){lo=Number(c.match(/S ≥ (\d+)/)[1]);hi=m.mult*(m.threshold+1)+Math.max(...m.adds.map(x=>-x));}else{[,lo,hi]=c.match(/(\d+) ≤ S ≤ (\d+)/).map(Number);if(m.two)first=n(c.match(/в первой куче (?:было )?([0-9а-яё]+) кам/)[1]);}
  assert.deepEqual(r.parameters,{id:t.id,sourceHash:ogeSourceSignature(t),two:m.two,down:m.down,adds:m.adds,mul:m.mult,threshold:m.threshold,lo,hi,first,mode:r.parameters.mode});
  const mode=c.includes('неудачного')?'mistake':c.includes('два наименьших')?'win2':'loss1';assert.equal(r.parameters.mode,mode);const valid=[];
  for(let s=lo;s<=hi;s++){const p=m.two?[first,s]:[s],one=m.next(p).some(m.terminal);let ok;
   if(mode==='mistake'){const frontier=m.next(p).filter(q=>!m.terminal(q)).flatMap(m.next);ok=frontier.some(m.terminal);}
   else{const vals=retro(p,m);const rank=vals.get(key(p));ok=rank===(mode==='win2'?2:-1);}
   assert.deepEqual(r.rows[s-lo],{s,win1:one,valid:ok});if(ok)valid.push(s);
  }
  assert.deepEqual(r.valid,valid);assert.equal(r.answer,(mode==='win2'?valid.slice(0,2):valid.slice(0,1)).join(' '));
  for(const [s,paths] of Object.entries(r.strategies)){const start=m.two?[first,Number(s)]:[Number(s)];for(const path of paths){assert.ok(m.next(start).some(q=>key(q)===key(path.petya)));assert.ok(!m.terminal(path.petya));if(path.vanya){assert.ok(m.next(path.petya).some(q=>key(q)===key(path.vanya)));assert.ok(m.terminal(path.vanya));}else{assert.deepEqual(path.branches.map(b=>key(b.vanya)).sort(),m.next(path.petya).map(key).sort());for(const b of path.branches){assert.ok(!m.terminal(b.vanya));assert.ok(m.next(b.vanya).some(q=>key(q)===key(b.petya2)));assert.ok(m.terminal(b.petya2));}}checkedBranches++;}}
  out[t.id]={answer:r.answer,valid};continue;
 }
 assert.equal(r.threshold,m.threshold);
 const policies=r.positions||r.questions?.flat()||Object.values(r.strategies||{})||(r.strategy?[r.strategy]:[]);
 if(r.kind==='pair'){const a=Number(c.match(/пара чисел \((\d+), S\)/)[1]),valid=[];for(let s=0;s<m.threshold-a;s++)if(m.next([a,s]).some(m.terminal))valid.push(s);assert.equal(r.one,c.includes('минимальное значение S')?Math.min(...valid):Math.max(...Array.from({length:m.threshold-a},(_,i)=>i).filter(x=>!valid.includes(x))));const specified=[...c.matchAll(/Для начальной позиции \((\d+), (\d+)\)/g)].map(m=>[Number(m[1]),Number(m[2])]);assert.deepEqual(r.positions.map(p=>p.paths[0][0]),specified);}
 if(r.kind==='multi-variable'){
  const [_,lo,hi]=c.match(/(\d+) ≤ S ≤ (\d+)/).map(Number),a=m.two?n(c.match(/в первой куче было ([0-9а-яё]+) кам/)[1]):null;let ranks={},mistakes=[];for(let s=lo;s<=hi;s++){const p=m.two?[a,s]:[s],v=retro(p,m).get(key(p));ranks[s]=v;if(m.next(p).some(q=>!m.terminal(q)&&m.next(q).some(m.terminal)))mistakes.push(s);}assert.deepEqual(r.ranks,ranks);for(const [k,v] of Object.entries({W1:1,L1:-1,W2:2,L2:-2}))assert.deepEqual(r[k],Object.keys(ranks).filter(s=>ranks[s]===v).map(Number));if(r.mistake!==null)assert.equal(r.mistake,Math.min(...mistakes));
 assert.equal(r.selectedW2.length,c.includes('Укажите четыре таких')?4:c.includes('Укажите два таких')?2:1);
 assert.equal(new Set(r.selectedW2).size,r.selectedW2.length);assert.ok(r.selectedW2.every(s=>r.W2.includes(s)));
 assert.equal(r.selectedL2.length,1);assert.ok(r.selectedL2.every(s=>r.L2.includes(s)));
 for(const s of [...r.selectedW2,...r.selectedL2,...(r.mistake===null?[r.L1[0]]:[])])assert.ok(r.strategies[s]);
 }
 if(r.kind==='multi-fixed'){const chunks=c.split(/Задание [123]\./).slice(1);assert.deepEqual(r.questions.map(ps=>ps.map(p=>p.paths[0][0])),chunks.map(x=>[...x.split('укажите')[0].matchAll(/\((\d+), (\d+)\)/g)].map(m=>[Number(m[1]),Number(m[2])])));}
 if(r.kind==='old-stones'){const p=c.match(/первой из которых (\d+), а во второй – (\d+)/).slice(1).map(Number);assert.deepEqual(r.strategy.paths[0][0],p);policies.push(r.strategy);}
 for(const p of policies){const v=retro(p.paths[0][0],m);validatePolicy(p,m,v);}out[t.id]={kind:r.kind,strategies:policies.length};
}

function values(xs){return xs.length>2&&xs.every((x,i)=>x===xs[0]+i)?`${xs[0]}–${xs.at(-1)}`:xs.join(', ');}
let answer;
if(r.parameters)answer=r.answer;
else if(r.kind==='words')answer=`1а) ${r.first.winner}; 1б) ${r.long.winner}; 2) ${r.swaps[0].strategy.winner}; 3) ${r.final.winner}`;
else if(r.kind==='pair')answer=`1) ${r.one}; 2) ${r.positions[0].winner}; 3) ${r.positions[1].winner}`;
else if(r.kind==='old-stones')answer=r.strategy.winner;
else if(r.kind==='multi-fixed')answer=r.questions.map((ps,i)=>`${i+1}) ${ps.map(s=>s.winner).join(', ')}`).join('; ');
else answer=`1а) ${values(r.W1)}; 1б) ${r.mistake===null?r.L1[0]:r.mistake}; 2) ${values(r.selectedW2)}; 3) ${values(r.selectedL2)}`;
return {answer,kind:r.kind||r.parameters.mode,checkedBranches,checkedPositions,result:out[task.id]};
}
function validateTables(solution,r){
const expected=r.parameters?[]:r.kind==='words'?[r.final]:r.kind==='pair'?r.positions:r.kind==='old-stones'?[r.strategy]:r.kind==='multi-fixed'?r.questions.flat():[...(r.mistake===null?[r.strategies[r.L1[0]]]:[]),...r.selectedW2.map(s=>r.strategies[s]),...r.selectedL2.map(s=>r.strategies[s])];
const tables=[...solution.matchAll(/^```table\n([\s\S]*?)\n```/gm)].map(m=>m[1].split('\n').map(row=>row.split('|').map(s=>s.trim())));
assert.equal(tables.length,expected.length,'missing strategy table');
const position=p=>typeof p==='string'?p||'∅':p.length===1?String(p[0]):`(${p.join('; ')})`;
for(let k=0;k<tables.length;k++){
 const paths=expected[k].paths,depth=Math.max(...paths.map(p=>p.length))-1;
 const head=['№','Начало',...Array.from({length:depth},(_,i)=>`${i%2?'Ваня':'Петя'} ${Math.floor(i/2)+1}`)];
 assert.deepEqual(tables[k][0],head);
 const rows=paths.map((p,i)=>[String(i+1),...p.map(position),...Array(depth+1-p.length).fill('—')]);
 assert.deepEqual(tables[k].slice(1),rows,'changed strategy branch');
}
return tables.reduce((n,t)=>n+t.length-1,0);
}
module.exports={compute,validateTables};
