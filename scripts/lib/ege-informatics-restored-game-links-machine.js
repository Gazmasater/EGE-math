'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const trustedLinks=require('../../lib/ege-informatics-restored-game-links.json');
const {conditionText}=require(root+'/lib/seo-text');
const words={один:1,два:2,три:3,четыре:4,пять:5,шесть:6,семь:7};const number=s=>/^\d+$/.test(s)?Number(s):words[s];const sum=p=>p.reduce((a,b)=>a+b,0),key=JSON.stringify;
let catalog;
function compute(task,data,readFile=fs.readFileSync){
let positions=0,branches=0;const groupProof=[];
const entry=trustedLinks[task.id];assert.ok(entry,'Unknown restored game');
assert.equal(data.result.id,task.id);assert.equal(data.result.base,entry.base);assert.equal(task.file,entry.sourceFile);
assert.equal(createHash('sha256').update(readFile(path.join(root,entry.sourceFile))).digest('hex'),entry.rawSha256);
assert.equal(createHash('sha256').update(readFile(path.join(root,entry.parentFile))).digest('hex'),entry.parentRawSha256);
assert.equal(task.fragment.match(/data-restored-game="([^"]+)"/)[1],entry.base);
const shared=task.fragment.match(/<section class="oge-shared-condition"[^>]*>([\s\S]*?)<\/section>/)[1];assert.equal(shared,'<h2>Правила игры</h2>'+entry.rules);
for(const r of [data.result]){const c=conditionText(task.fragment);assert.equal(c,data.condition);groupProof.push({id:task.id,base:entry.base,sourceFile:entry.sourceFile,parentFile:entry.parentFile,linkOrigin:entry.origin,ruleSha256:createHash('sha256').update(entry.rules).digest('hex')});
const two=c.includes('две кучи'),down=c.includes('убрать из кучи'),threshold=Number(c.match(/не (?:менее|более) (\d+)/)[1]);const rule=c.slice(c.indexOf('За один ход игрок может')+24).split('Например')[0].split('Для того')[0].split('У каждого')[0];const adds=down?[...rule.matchAll(/убрать из кучи (\d+)/g)].map(x=>-Number(x[1])):[...rule.split('увеличить')[0].matchAll(/\b\d+\b|один|два|три|четыре/g)].map(x=>number(x[0])),mul=number(rule.match(/в (\d+|два|три|четыре|пять) раз/)[1]);const bounds=down?[Number(c.match(/S ≥ (\d+)/)[1]),null]:c.match(/(\d+) ≤ S ≤ (\d+)/).slice(1).map(Number),first=two?number(c.match(/в первой куче (?:было )?([0-9а-яё]+) кам/)[1]):null;assert.deepEqual(r.model,{two,down,adds,mul,threshold,lo:bounds[0],hi:bounds[1],first});const mode=c.includes('Петя может выиграть своим вторым ходом')?'W2':'L2';assert.equal(mode,r.mode);
const terminal=p=>down?sum(p)<=threshold:sum(p)>=threshold,next=p=>{const out=[];p.forEach((v,i)=>{for(const add of adds){const q=p.slice();q[i]+=add;out.push(q);}const q=p.slice();q[i]=down?Math.floor(v/mul):v*mul;out.push(q);});return [...new Map(out.map(x=>[key(x),x])).values()];};const cache=new Map();function label(p){const k=key(p);if(cache.has(k))return cache.get(k);let value;if(terminal(p))value='T';else{const qs=next(p);if(qs.some(terminal))value='W1';else{const labels=qs.map(label);if(labels.every(x=>x==='W1'))value='L1';else if(labels.some(x=>x==='L1'))value='W2';else if(labels.every(x=>x==='W1'||x==='W2'))value='L2';else value='other';}}cache.set(k,value);return value;}
assert.deepEqual(r.checkedRange,[bounds[0],down?Math.max(...r.answer.split(' ').map(Number)):bounds[1]]);const own=[];for(let s=r.checkedRange[0];s<=r.checkedRange[1];s++){const tag=label(two?[first,s]:[s]);own.push({s,W1:tag==='W1',L1:tag==='L1',W2:tag==='W2',L2:tag==='L2'});}assert.deepEqual(own,r.rows);assert.deepEqual(own.filter(x=>x[mode]).map(x=>x.s),r.validInCheckedRange);assert.equal(own.filter(x=>x[mode]).slice(0,mode==='W2'?2:1).map(x=>x.s).join(' '),r.answer);positions+=cache.size;
for(const [s,paths] of Object.entries(r.strategies)){const initial=two?[first,Number(s)]:[Number(s)],winner=mode==='W2'?0:1,tree=new Map();for(const path of paths){assert.deepEqual(path[0],initial);assert.ok(terminal(path.at(-1)));assert.equal((path.length-2)%2,winner);assert.ok(path.length<=(mode==='W2'?4:5));for(let i=0;i<path.length-1;i++){assert.ok(!terminal(path[i]));assert.ok(next(path[i]).some(q=>key(q)===key(path[i+1])));const k=key(path.slice(0,i+1));if(!tree.has(k))tree.set(k,{turn:i,p:path[i],children:new Set()});tree.get(k).children.add(key(path[i+1]));}branches++;}for(const {turn,p,children}of tree.values()){if(turn%2!==winner)assert.deepEqual([...children].sort(),next(p).map(key).sort());else assert.equal(children.size,1);}}
}
return {answer:data.result.answer,positions,branches,groupProof};
}
module.exports={compute};
